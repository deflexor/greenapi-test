import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from '@/components/MessageComposer/MessageComposer';

const SEND_BUTTON_NAME = 'Отправить сообщение';

describe('MessageComposer', () => {
  it('запрещает отправку пустого сообщения и сообщения из одних пробелов', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} />);

    const sendButton = screen.getByRole('button', { name: SEND_BUTTON_NAME });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Текст сообщения' }), '   ');
    await user.keyboard('{Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(sendButton).toBeDisabled();
  });

  it('отправляет текст по Enter и очищает поле после успеха', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} />);

    const input = screen.getByRole('textbox', { name: 'Текст сообщения' });
    await user.type(input, 'Привет{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('Привет');
    expect(await screen.findByRole('textbox', { name: 'Текст сообщения' })).toHaveValue('');
  });

  it('Shift+Enter добавляет перенос строки вместо отправки', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} />);

    await user.type(
      screen.getByRole('textbox', { name: 'Текст сообщения' }),
      'строка{Shift>}{Enter}{/Shift}',
    );
    expect(onSend).not.toHaveBeenCalled();
  });

  it('при ошибке отправки показывает сообщение и сохраняет текст', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('Нет соединения с сервером GREEN-API'));
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} />);

    const input = screen.getByRole('textbox', { name: 'Текст сообщения' });
    await user.type(input, 'Важное сообщение');
    await user.click(screen.getByRole('button', { name: SEND_BUTTON_NAME }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Нет соединения с сервером GREEN-API',
    );
    expect(input).toHaveValue('Важное сообщение');
  });

  it('игнорирует двойное нажатие: запрос отправки выполняется один раз', async () => {
    const onSend = vi.fn().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} />);

    await user.type(screen.getByRole('textbox', { name: 'Текст сообщения' }), 'раз');
    await user.dblClick(screen.getByRole('button', { name: SEND_BUTTON_NAME }));

    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
