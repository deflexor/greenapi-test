import { request } from './client';
import { ApiError } from './errors';
import { withTimeout } from '@/utils/abort';
import type {
  CheckAccountRequestDto,
  CheckAccountResponseDto,
  CredentialsDto,
  DeleteNotificationResponseDto,
  ReceiveNotificationResponseDto,
  RequestOptions,
  SendMessageRequestDto,
  SendMessageResponseDto,
  StateInstanceDto,
} from './types';

const STATE_INSTANCES: readonly StateInstanceDto[] = [
  'notAuthorized',
  'authorized',
  'blocked',
  'suspended',
  'starting',
  'pendingPassword',
];

const DEFAULT_RECEIVE_TIMEOUT_SECONDS = 20;
const RECEIVE_NETWORK_GRACE_SECONDS = 15;

/** GET getStateInstance — состояние инстанса (лимит 1 rps). */
export async function getStateInstance(
  credentials: CredentialsDto,
  options: RequestOptions = {},
): Promise<StateInstanceDto> {
  const data = await request<{ stateInstance?: unknown }>(credentials, {
    method: 'GET',
    apiMethod: 'getStateInstance',
    signal: options.signal,
  });
  const state = data?.stateInstance;
  if (typeof state === 'string' && (STATE_INSTANCES as readonly string[]).includes(state)) {
    return state as StateInstanceDto;
  }
  throw new ApiError('unknown', 'Не удалось определить состояние инстанса');
}

/** POST sendMessage — возвращает idMessage принятого сервером сообщения. */
export async function sendMessage(
  credentials: CredentialsDto,
  payload: SendMessageRequestDto,
  options: RequestOptions = {},
): Promise<string> {
  const data = await request<SendMessageResponseDto>(credentials, {
    method: 'POST',
    apiMethod: 'sendMessage',
    body: payload,
    signal: options.signal,
  });
  if (typeof data?.idMessage !== 'string') {
    throw new ApiError('unknown', 'GREEN-API не подтвердил приём сообщения');
  }
  return data.idMessage;
}

/** POST checkAccount — проверка существования получателя по телефону или username. */
export async function checkAccount(
  credentials: CredentialsDto,
  payload: CheckAccountRequestDto,
  options: RequestOptions = {},
): Promise<CheckAccountResponseDto> {
  const data = await request<CheckAccountResponseDto>(credentials, {
    method: 'POST',
    apiMethod: 'checkAccount',
    body: payload,
    signal: options.signal,
  });
  if (!data || typeof data.exist !== 'boolean' || typeof data.chatId !== 'string') {
    throw new ApiError('unknown', 'Не удалось проверить получателя');
  }
  return data;
}

/**
 * GET receiveNotification — long-poll одного уведомления.
 * Возвращает null, если за receiveTimeout уведомлений не пришло.
 * Дополнительно страхует сетевой тайм-аутом: застрявший запрос не блокирует
 * цикл получения навсегда.
 */
export async function receiveNotification(
  credentials: CredentialsDto,
  options: RequestOptions & { receiveTimeoutSeconds?: number } = {},
): Promise<ReceiveNotificationResponseDto | null> {
  const timeout = Math.min(
    Math.max(options.receiveTimeoutSeconds ?? DEFAULT_RECEIVE_TIMEOUT_SECONDS, 5),
    60,
  );
  const { signal, dispose } = withTimeout(
    options.signal,
    (timeout + RECEIVE_NETWORK_GRACE_SECONDS) * 1000,
  );

  try {
    const data = await request<ReceiveNotificationResponseDto>(credentials, {
      method: 'GET',
      apiMethod: 'receiveNotification',
      query: { receiveTimeout: String(timeout) },
      signal,
    });

    if (!data) return null;
    if (typeof data.receiptId !== 'number' || typeof data.body !== 'object' || data.body === null) {
      throw new ApiError('unknown', 'GREEN-API вернул некорректное уведомление');
    }
    return data;
  } finally {
    dispose();
  }
}

/**
 * DELETE deleteNotification — подтверждает обработку уведомления,
 * иначе оно будет доставлено повторно. Возвращает факт удаления.
 */
export async function deleteNotification(
  credentials: CredentialsDto,
  receiptId: number,
  options: RequestOptions = {},
): Promise<boolean> {
  const data = await request<DeleteNotificationResponseDto>(credentials, {
    method: 'DELETE',
    apiMethod: `deleteNotification/${receiptId}`,
    signal: options.signal,
  });
  return data?.result === true;
}
