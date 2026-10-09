import { describe, expect, it } from 'vitest';
import { normalizeNotification } from '@/features/chat/notification';

function incomingBody(overrides: Record<string, unknown> = {}) {
  return {
    typeWebhook: 'incomingMessageReceived',
    instanceData: { idInstance: 4100000000, wid: '79990000000@c.us', typeInstance: 'telegram' },
    timestamp: 1763115112,
    idMessage: 'msg-1',
    senderData: {
      chatId: '10000000',
      chatName: 'Иван',
      sender: '10000000',
      senderName: 'Иван',
    },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    ...overrides,
  };
}

describe('normalizeNotification', () => {
  it('нормализует входящее текстовое сообщение и переводит timestamp в миллисекунды', () => {
    expect(normalizeNotification(incomingBody())).toEqual({
      kind: 'incoming',
      idMessage: 'msg-1',
      chatId: '10000000',
      chatName: 'Иван',
      text: 'Привет',
      timestampMs: 1763115112000,
    });
  });

  it('нормализует исходящее сообщение', () => {
    const notification = normalizeNotification(
      incomingBody({ typeWebhook: 'outgoingMessageReceived' }),
    );
    expect(notification?.kind).toBe('outgoing');
  });

  it('игнорирует нетекстовые и служебные вебхуки', () => {
    expect(normalizeNotification(incomingBody({ typeWebhook: 'stateInstanceChanged' }))).toBeNull();
    expect(
      normalizeNotification(
        incomingBody({ messageData: { typeMessage: 'imageMessage', fileMessageData: {} } }),
      ),
    ).toBeNull();
  });

  it('отклоняет уведомления с некорректным chatId или без текста', () => {
    expect(normalizeNotification(incomingBody({ senderData: { chatId: '@durov' } }))).toBeNull();
    expect(
      normalizeNotification(
        incomingBody({ messageData: { typeMessage: 'textMessage', textMessageData: {} } }),
      ),
    ).toBeNull();
    expect(normalizeNotification(incomingBody({ timestamp: 'not-a-number' }))).toBeNull();
  });

  it('принимает timestamp уже в миллисекундах без повторного умножения', () => {
    const notification = normalizeNotification(incomingBody({ timestamp: 1763115112000 }));
    expect(notification?.timestampMs).toBe(1763115112000);
  });
});
