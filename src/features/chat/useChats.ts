import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  checkAccount,
  deleteNotification,
  receiveNotification,
  sendMessage as sendMessageApi,
} from '@/services/greenApi/telegram';
import { toUserMessage } from '@/services/greenApi/errors';
import type { CheckAccountResponseDto, CredentialsDto } from '@/services/greenApi/types';
import { isValidChatId, parseChatInput } from '@/utils/chatId';
import { createLocalId } from '@/utils/random';
import {
  addMessage,
  ensureChat,
  markMessageFailed,
  markMessagePending,
  markMessageSent,
  toSortedChatList,
  type Chat,
  type ChatMap,
  type ChatMessage,
} from './chatModel';
import { normalizeNotification } from './notification';
import { POLL_ERROR_BACKOFF_MS, POLL_IDLE_MS, RECEIVE_TIMEOUT_SECONDS } from './timing';

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export interface UseChatsResult {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  /** Текст последней ошибки получения; null, когда получение работает. */
  receiveIssue: string | null;
  openChat: (input: string) => Promise<void>;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
}

/**
 * Состояние чатов, отправка и цикл получения уведомлений.
 * Цикл получения единственный, последовательный и отменяется при размонтировании
 * (устойчив к double-mount React StrictMode): генерационный счётчик прерывает
 * устаревшие итерации, AbortController отменяет запросы.
 */
export function useChats(credentials: CredentialsDto): UseChatsResult {
  const [chats, setChats] = useState<ChatMap>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [receiveIssue, setReceiveIssue] = useState<string | null>(null);

  const generationRef = useRef(0);
  const seenServerIdsRef = useRef<Set<string>>(new Set());
  const resolveSeqRef = useRef(0);

  const applyNotification = useCallback((body: unknown) => {
    const notification = normalizeNotification(body);
    if (notification === null) return;
    const seen = seenServerIdsRef.current;
    if (seen.has(notification.idMessage)) return;
    seen.add(notification.idMessage);

    setChats((prev) => {
      const next = ensureChat(
        prev,
        notification.chatId,
        notification.chatName,
        notification.timestampMs,
      );
      const message: ChatMessage = {
        id: createLocalId(),
        serverId: notification.idMessage,
        direction: notification.kind,
        text: notification.text,
        timestampMs: notification.timestampMs,
        status: 'sent',
        error: null,
      };
      return addMessage(next, notification.chatId, message);
    });
    // Первое входящее сообщение от нового собеседника открывает чат;
    // если пользователь уже читает другой чат — не переключаем.
    setActiveChatId((current) => current ?? notification.chatId);
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    let stopped = false;

    const poll = async () => {
      while (!stopped && generation === generationRef.current) {
        try {
          const notification = await receiveNotification(credentials, {
            signal: controller.signal,
            receiveTimeoutSeconds: RECEIVE_TIMEOUT_SECONDS,
          });
          if (stopped || generation !== generationRef.current) return;

          if (notification) {
            applyNotification(notification.body);
            // Подтверждаем обработку, иначе уведомление будет доставлено повторно.
            await deleteNotification(credentials, notification.receiptId, {
              signal: controller.signal,
            });
          } else {
            await sleep(POLL_IDLE_MS, controller.signal);
          }
          setReceiveIssue((prev) => (prev === null ? prev : null));
        } catch (error) {
          if (stopped || controller.signal.aborted) return;
          setReceiveIssue(toUserMessage(error));
          await sleep(POLL_ERROR_BACKOFF_MS, controller.signal);
        }
      }
    };

    void poll();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [credentials, applyNotification]);

  const activateChat = useCallback((chatId: string, title: string | null) => {
    // Инвалидация незавершённой проверки получателя: её ответ устарел.
    resolveSeqRef.current += 1;
    setChats((prev) => ensureChat(prev, chatId, title, Date.now()));
    setActiveChatId(chatId);
  }, []);

  const openChat = useCallback(
    async (rawInput: string): Promise<void> => {
      const parsed = parseChatInput(rawInput);
      if (parsed === null) {
        throw new Error(
          'Введите chatId (например, 10000000), идентификатор группы (-100…), @username или +79991234567',
        );
      }
      if (parsed.kind === 'id' || parsed.kind === 'group') {
        activateChat(parsed.value, null);
        return;
      }

      const seq = ++resolveSeqRef.current;
      const request =
        parsed.kind === 'username'
          ? { username: parsed.value }
          : { phoneNumber: Number(parsed.value) };

      let account: CheckAccountResponseDto;
      try {
        account = await checkAccount(credentials, request);
      } catch (error) {
        if (seq !== resolveSeqRef.current) return; // пользователь уже выбрал другой чат
        throw new Error(toUserMessage(error));
      }
      if (seq !== resolveSeqRef.current) return;
      if (!account.exist || !isValidChatId(account.chatId)) {
        throw new Error(
          'Аккаунт не найден или скрыт настройками приватности Telegram. Попросите собеседника написать первым — чат откроется автоматически.',
        );
      }
      activateChat(account.chatId, parsed.kind === 'username' ? parsed.value : `+${parsed.value}`);
    },
    [credentials, activateChat],
  );

  const closeChat = useCallback(() => setActiveChatId(null), []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (activeChatId === null) return;
      const chatId = activeChatId;
      const localId = createLocalId();
      setChats((prev) =>
        addMessage(prev, chatId, {
          id: localId,
          serverId: null,
          direction: 'outgoing',
          text,
          timestampMs: Date.now(),
          status: 'pending',
          error: null,
        }),
      );
      try {
        const idMessage = await sendMessageApi(credentials, { chatId, message: text });
        seenServerIdsRef.current.add(idMessage);
        setChats((prev) => markMessageSent(prev, chatId, localId, idMessage));
      } catch (error) {
        const userMessage = toUserMessage(error);
        setChats((prev) => markMessageFailed(prev, chatId, localId, userMessage));
        throw new Error(userMessage);
      }
    },
    [credentials, activeChatId],
  );

  const retryMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (activeChatId === null) return;
      const chatId = activeChatId;
      const chat = chats[chatId];
      const message = chat?.messages.find((m) => m.id === messageId);
      if (!message || message.direction !== 'outgoing' || message.status !== 'failed') return;

      setChats((prev) => markMessagePending(prev, chatId, messageId));
      try {
        const idMessage = await sendMessageApi(credentials, { chatId, message: message.text });
        seenServerIdsRef.current.add(idMessage);
        setChats((prev) => markMessageSent(prev, chatId, messageId, idMessage));
      } catch (error) {
        const userMessage = toUserMessage(error);
        setChats((prev) => markMessageFailed(prev, chatId, messageId, userMessage));
        throw new Error(userMessage);
      }
    },
    [credentials, activeChatId, chats],
  );

  const activeChat = activeChatId === null ? null : (chats[activeChatId] ?? null);
  const sortedChats = useMemo(() => toSortedChatList(chats), [chats]);

  return {
    chats: sortedChats,
    activeChatId,
    activeChat,
    receiveIssue,
    openChat,
    closeChat,
    sendMessage,
    retryMessage,
  };
}
