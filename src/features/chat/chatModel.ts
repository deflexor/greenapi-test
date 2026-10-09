/** Доменные типы чата и сообщений и чистые переходы состояния (без React и API). */

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface ChatMessage {
  /** Локальный стабильный id (React key); serverId хранится отдельно. */
  id: string;
  /** idMessage из API; по нему выполняется дедупликация уведомлений. */
  serverId: string | null;
  direction: MessageDirection;
  text: string;
  timestampMs: number;
  status: MessageStatus;
  error: string | null;
}

export interface Chat {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  lastActivityAtMs: number;
}

export type ChatMap = Record<string, Chat>;

/** Список чатов, отсортированный по последней активности. */
export function toSortedChatList(chats: ChatMap): Chat[] {
  return Object.values(chats).sort((a, b) => b.lastActivityAtMs - a.lastActivityAtMs);
}

/** Создаёт чат при отсутствии; не затирает существующий заголовок и активность. */
export function ensureChat(
  chats: ChatMap,
  chatId: string,
  title: string | null,
  activityMs: number,
): ChatMap {
  const existing = chats[chatId];
  if (existing) {
    return {
      ...chats,
      [chatId]: {
        ...existing,
        title: existing.title ?? title,
        lastActivityAtMs: Math.max(existing.lastActivityAtMs, activityMs),
      },
    };
  }
  return {
    ...chats,
    [chatId]: { id: chatId, title, messages: [], lastActivityAtMs: activityMs },
  };
}

export function addMessage(chats: ChatMap, chatId: string, message: ChatMessage): ChatMap {
  const chat = chats[chatId];
  if (!chat) return ensureChat({ ...chats }, chatId, null, message.timestampMs);
  return {
    ...chats,
    [chatId]: {
      ...chat,
      title: chat.title,
      messages: [...chat.messages, message],
      lastActivityAtMs: Math.max(chat.lastActivityAtMs, message.timestampMs),
    },
  };
}

/**
 * Отмечает сообщение отправленным. Если уведомление о собственном сообщении
 * пришло раньше ответа sendMessage (дубль по serverId), локальная копия удаляется.
 */
export function markMessageSent(
  chats: ChatMap,
  chatId: string,
  localId: string,
  serverId: string,
): ChatMap {
  const chat = chats[chatId];
  if (!chat) return chats;
  const isDuplicate = chat.messages.some((m) => m.serverId === serverId && m.id !== localId);
  const messages = isDuplicate
    ? chat.messages.filter((m) => m.id !== localId)
    : chat.messages.map((m) =>
        m.id === localId ? { ...m, serverId, status: 'sent' as const, error: null } : m,
      );
  return { ...chats, [chatId]: { ...chat, messages } };
}

export function markMessageFailed(
  chats: ChatMap,
  chatId: string,
  localId: string,
  error: string,
): ChatMap {
  const chat = chats[chatId];
  if (!chat) return chats;
  return {
    ...chats,
    [chatId]: {
      ...chat,
      messages: chat.messages.map((m) =>
        m.id === localId ? { ...m, status: 'failed' as const, error } : m,
      ),
    },
  };
}

export function markMessagePending(chats: ChatMap, chatId: string, localId: string): ChatMap {
  const chat = chats[chatId];
  if (!chat) return chats;
  return {
    ...chats,
    [chatId]: {
      ...chat,
      messages: chat.messages.map((m) =>
        m.id === localId ? { ...m, status: 'pending' as const, error: null } : m,
      ),
    },
  };
}
