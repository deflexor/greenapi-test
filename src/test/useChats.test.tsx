import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChats } from '@/features/chat/useChats';
import { checkAccount } from '@/services/greenApi/telegram';
import type { CheckAccountResponseDto, CredentialsDto } from '@/services/greenApi/types';

vi.mock('@/services/greenApi/telegram', () => ({
  getStateInstance: vi.fn(),
  sendMessage: vi.fn(),
  checkAccount: vi.fn(),
  receiveNotification: vi.fn().mockReturnValue(new Promise(() => {})),
  deleteNotification: vi.fn().mockResolvedValue(true),
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

beforeEach(() => {
  vi.mocked(checkAccount).mockClear();
});

describe('useChats', () => {
  it('игнорирует устаревший ответ проверки получателя при смене чата', async () => {
    const checkDeferred = createDeferred<CheckAccountResponseDto>();
    vi.mocked(checkAccount).mockReturnValueOnce(checkDeferred.promise);

    const { result } = renderHook(() => useChats(credentials));

    let pendingOpen: Promise<void> | undefined;
    act(() => {
      pendingOpen = result.current.openChat('@slowpoke');
    });
    act(() => {
      void result.current.openChat('10000000');
    });
    expect(result.current.activeChatId).toBe('10000000');

    await act(async () => {
      checkDeferred.resolve({ exist: true, chatId: '999', username: '@slowpoke' });
      await pendingOpen;
    });

    expect(result.current.activeChatId).toBe('10000000');
    expect(result.current.chats.map((chat) => chat.id)).toEqual(['10000000']);
  });
});
