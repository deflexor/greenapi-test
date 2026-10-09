import { isValidChatId } from '@/utils/chatId';
import type { MessageDirection } from './chatModel';

/**
 * Уведомление, приведённое к доменной модели. Возвращается только для
 * текстовых сообщений (incomingMessageReceived / outgoingMessageReceived);
 * остальные типы вебхуков (статусы, правки, реакции) игнорируются.
 */
export interface NormalizedNotification {
  kind: MessageDirection;
  idMessage: string;
  chatId: string;
  chatName: string | null;
  text: string;
  timestampMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

function readObject(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key];
  return isRecord(value) ? value : null;
}

/** GREEN-API отдаёт timestamp в секундах; защита от значений в миллисекундах. */
function toTimestampMs(seconds: unknown): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds > 1e12 ? seconds : seconds * 1000;
}

/**
 * Валидирует недоверенное тело вебхука. Возвращает null для уведомлений,
 * которые не являются текстовым сообщением (их нужно только подтвердить
 * через deleteNotification).
 */
export function normalizeNotification(body: unknown): NormalizedNotification | null {
  if (!isRecord(body)) return null;

  const type = readString(body, 'typeWebhook');
  if (type !== 'incomingMessageReceived' && type !== 'outgoingMessageReceived') return null;

  const idMessage = readString(body, 'idMessage');
  const timestampMs = toTimestampMs(body['timestamp']);
  if (idMessage === null || timestampMs === null) return null;

  const senderData = readObject(body, 'senderData');
  if (senderData === null) return null;
  const chatId = readString(senderData, 'chatId');
  if (chatId === null || !isValidChatId(chatId)) return null;

  const messageData = readObject(body, 'messageData');
  const textMessageData = messageData !== null ? readObject(messageData, 'textMessageData') : null;
  const text = textMessageData !== null ? readString(textMessageData, 'textMessage') : null;
  if (text === null) return null;

  const chatName =
    readString(senderData, 'chatName') ??
    readString(senderData, 'senderName') ??
    readString(senderData, 'sender');

  return {
    kind: type === 'incomingMessageReceived' ? 'incoming' : 'outgoing',
    idMessage,
    chatId,
    chatName,
    text,
    timestampMs,
  };
}
