import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { ApiError } from '@/services/greenApi/errors';
import { getStateInstance } from '@/services/greenApi/telegram';

vi.mock('@/services/greenApi/telegram', () => ({
  getStateInstance: vi.fn(),
  sendMessage: vi.fn(),
  checkAccount: vi.fn(),
  receiveNotification: vi.fn().mockReturnValue(new Promise(() => {})),
  deleteNotification: vi.fn().mockResolvedValue({ result: true }),
}));

vi.mocked(getStateInstance).mockResolvedValue('authorized');

const ID_INPUT_LABEL = /idInstance/i;
const TOKEN_INPUT_LABEL = /apiTokenInstance/i;

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  id = '4100000000',
  token = 'token',
) {
  await user.type(screen.getByLabelText(ID_INPUT_LABEL), id);
  await user.type(screen.getByLabelText(TOKEN_INPUT_LABEL), token);
  await user.click(screen.getByRole('button', { name: 'Подключить' }));
}

describe('Подключение к GREEN-API', () => {
  beforeEach(() => {
    vi.mocked(getStateInstance).mockClear();
    vi.mocked(getStateInstance).mockResolvedValue('authorized');
  });

  it('требует обязательные поля перед запросом', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Подключить' }));

    expect(screen.getByText('Укажите idInstance')).toBeInTheDocument();
    expect(screen.getByText('Укажите apiTokenInstance')).toBeInTheDocument();
    expect(getStateInstance).not.toHaveBeenCalled();
  });

  it('проверяет формат idInstance', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillAndSubmit(user, 'not-a-number');

    expect(screen.getByText('idInstance — только цифры')).toBeInTheDocument();
    expect(getStateInstance).not.toHaveBeenCalled();
  });

  it('показывает ошибку авторизации при отказе API', async () => {
    vi.mocked(getStateInstance).mockRejectedValue(
      new ApiError('auth', 'Неверный idInstance или apiTokenInstance'),
    );
    const user = userEvent.setup();
    render(<App />);

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Неверный idInstance или apiTokenInstance',
    );
    expect(screen.getByText('Ошибка подключения')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Подключить' })).toBeEnabled();
  });

  it('игнорирует двойное нажатие кнопки подключения', async () => {
    vi.mocked(getStateInstance).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(ID_INPUT_LABEL), '4100000000');
    await user.type(screen.getByLabelText(TOKEN_INPUT_LABEL), 'token');
    await user.dblClick(screen.getByRole('button', { name: 'Подключить' }));

    expect(getStateInstance).toHaveBeenCalledTimes(1);
  });

  it('показывает понятную ошибку, когда инстанс не авторизован', async () => {
    vi.mocked(getStateInstance).mockResolvedValue('notAuthorized');
    const user = userEvent.setup();
    render(<App />);

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Инстанс не авторизован/);
  });

  it('после успешной проверки открывает экран чата', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(getStateInstance).toHaveBeenCalledWith({
        idInstance: '4100000000',
        apiTokenInstance: 'token',
      });
    });
    expect(await screen.findByText('Новый чат')).toBeInTheDocument();
    expect(screen.queryByLabelText(ID_INPUT_LABEL)).not.toBeInTheDocument();
  });
});
