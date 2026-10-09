import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '@/components/ChatScreen/ChatScreen';
import { ApiError } from '@/services/greenApi/errors';
import {
  checkAccount,
  deleteNotification,
  receiveNotification,
  sendMessage,
} from '@/services/greenApi/telegram';
import type { CredentialsDto, ReceiveNotificationResponseDto } from '@/services/greenApi/types';

vi.mock('@/services/greenApi/telegram', () => ({
  getStateInstance: vi.fn(),
  sendMessage: vi.fn(),
  checkAccount: vi.fn(),
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn().mockResolvedValue({ result: true }),
}));

vi.mock('@/features/chat/timing', () => ({
  RECEIVE_TIMEOUT_SECONDS: 20,
  POLL_IDLE_MS: 0,
  POLL_ERROR_BACKOFF_MS: 1,
}));

const credentials: CredentialsDto = { idInstance: '4100000000', apiTokenInstance: 'token' };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Управляемый источник long-poll ответов: очередной вызов ждёт release. */
function gateReceiveNotifications() {
  let current = createDeferred<ReceiveNotificationResponseDto | null>();
  vi.mocked(receiveNotification).mockImplementation(() => current.promise);
  return {
    release(value: ReceiveNotificationResponseDto | null | Error) {
      const previous = current;
      current = createDeferred();
      if (value instanceof Error) previous.reject(value);
      else previous.resolve(value);
    },
  };
}

function notification(
  overrides: Partial<{
    typeWebhook: string;
    idMessage: string;
    chatId: string;
    chatName: string | null;
    text: string;
    messageData: unknown;
  }> = {},
  receiptId = 42,
): ReceiveNotificationResponseDto {
  const options = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'msg-1',
    chatId: '10000000',
    chatName: 'Иван',
    text: 'Привет',
    ...overrides,
  };
  return {
    receiptId,
    body: {
      typeWebhook: options.typeWebhook,
      instanceData: { idInstance: 4100000000, typeInstance: 'telegram' },
      timestamp: 1763115112,
      idMessage: options.idMessage,
      senderData: {
        chatId: options.chatId,
        chatName: options.chatName,
        sender: options.chatId,
        senderName: options.chatName,
      },
      messageData: options.messageData ?? {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: options.text },
      },
    },
  };
}

function renderChatScreen() {
  const gate = gateReceiveNotifications();
  const view = render(
    <StrictMode>
      <ChatScreen credentials={credentials} onDisconnect={() => {}} />
    </StrictMode>,
  );
  return { gate, unmount: view.unmount };
}

async function sendText(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole('textbox', { name: 'Текст сообщения' }), text);
  await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
}

beforeEach(() => {
  vi.mocked(deleteNotification).mockClear().mockResolvedValue(true);
  vi.mocked(sendMessage).mockClear().mockResolvedValue('srv-out');
  vi.mocked(checkAccount).mockClear();
});

describe('Получение сообщений', () => {
  it('отображает входящее сообщение и подтверждает уведомление', async () => {
    const { gate } = renderChatScreen();

    gate.release(notification({ text: 'Привет' }));

    expect(await screen.findByText('Привет')).toBeInTheDocument();
    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith(credentials, 42, expect.anything());
    });
    expect(screen.getByRole('button', { name: /Иван/ })).toBeInTheDocument();
  });

  it('не дублирует сообщение при повторном получении того же уведомления', async () => {
    const { gate } = renderChatScreen();

    gate.release(notification({}, 42));
    await screen.findByText('Привет');
    gate.release(notification({}, 43));

    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith(credentials, 43, expect.anything());
    });
    expect(screen.getAllByText('Привет')).toHaveLength(1);
  });

  it('подтверждает нетекстовое уведомление без отображения', async () => {
    const { gate } = renderChatScreen();

    gate.release(
      notification({ messageData: { typeMessage: 'imageMessage', fileMessageData: { id: 1 } } }, 7),
    );

    expect(await screen.findByText(/Выберите чат слева или откройте новый/)).toBeInTheDocument();
    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith(credentials, 7, expect.anything());
    });
  });

  it('после сетевой ошибки показывает баннер и продолжает получать', async () => {
    const { gate } = renderChatScreen();

    gate.release(new ApiError('network', 'Нет соединения с сервером GREEN-API'));
    expect(await screen.findByText(/Проблема с получением сообщений/)).toBeInTheDocument();

    gate.release(notification({ idMessage: 'msg-2', text: 'Ответ' }));
    expect(await screen.findByText('Ответ')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Проблема с получением сообщений/)).not.toBeInTheDocument();
    });
  });

  it('останавливает цикл получения после размонтирования', async () => {
    const { unmount } = renderChatScreen();
    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalled();
    });
    const callsBeforeUnmount = vi.mocked(receiveNotification).mock.calls.length;

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(vi.mocked(receiveNotification).mock.calls.length).toBe(callsBeforeUnmount);
  });
});

describe('Отправка сообщений', () => {
  it('отправляет сообщение и не дублирует его при приходе собственного вебхука', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce('srv-9');
    const user = userEvent.setup();
    const { gate } = renderChatScreen();

    gate.release(notification({ chatName: 'Иван' }));
    await screen.findByText('Привет');

    await sendText(user, 'Исходящее');
    expect(await screen.findByText('Исходящее')).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledWith(credentials, {
      chatId: '10000000',
      message: 'Исходящее',
    });

    gate.release(
      notification(
        {
          typeWebhook: 'outgoingMessageReceived',
          idMessage: 'srv-9',
          text: 'Исходящее',
        },
        50,
      ),
    );
    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith(credentials, 50, expect.anything());
    });
    expect(screen.getAllByText('Исходящее')).toHaveLength(1);
  });

  it('не блокирует отправку, пока получение ожидает уведомлений', async () => {
    const user = userEvent.setup();
    const { gate } = renderChatScreen();

    gate.release(notification({ chatName: 'Иван' }));
    await screen.findByText('Привет');

    // Цикл получения висит на long-poll — отправка при этом работает.
    await sendText(user, 'Параллельная отправка');
    expect(await screen.findByText('Параллельная отправка')).toBeInTheDocument();
    expect(await screen.findByLabelText('Отправлено (принято GREEN-API)')).toBeInTheDocument();
  });

  it('помечает сообщение как ошибочное при отказе API', async () => {
    vi.mocked(sendMessage).mockRejectedValueOnce(
      new ApiError('network', 'Нет соединения с сервером GREEN-API'),
    );
    const user = userEvent.setup();
    const { gate } = renderChatScreen();

    gate.release(notification({ chatName: 'Иван' }));
    await screen.findByText('Привет');

    await sendText(user, 'Не отправилось');
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((alert) => alert.textContent)).toContain(
      'Нет соединения с сервером GREEN-API',
    );
    expect(await screen.findByLabelText('Ошибка отправки')).toBeInTheDocument();
  });
});

describe('Открытие чата', () => {
  it('разрешает @username в chatId через checkAccount', async () => {
    vi.mocked(checkAccount).mockResolvedValueOnce({
      exist: true,
      chatId: '555000',
      username: '@durov',
    });
    const user = userEvent.setup();
    renderChatScreen();

    await user.type(screen.getByLabelText('Новый чат'), '@durov');
    await user.click(screen.getByRole('button', { name: 'Открыть' }));

    expect(checkAccount).toHaveBeenCalledWith(credentials, { username: '@durov' });
    expect(await screen.findByText('chatId: 555000')).toBeInTheDocument();
  });

  it('показывает ошибку, когда аккаунт не найден', async () => {
    vi.mocked(checkAccount).mockResolvedValueOnce({ exist: false, chatId: '' });
    const user = userEvent.setup();
    renderChatScreen();

    await user.type(screen.getByLabelText('Новый чат'), '@unknown');
    await user.click(screen.getByRole('button', { name: 'Открыть' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Аккаунт не найден/);
  });

  it('отклоняет недопустимый идентификатор без запроса к API', async () => {
    const user = userEvent.setup();
    renderChatScreen();

    await user.type(screen.getByLabelText('Новый чат'), 'привет как дела');
    await user.click(screen.getByRole('button', { name: 'Открыть' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Введите chatId/);
    expect(checkAccount).not.toHaveBeenCalled();
  });
});
