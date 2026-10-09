import { ApiError } from './errors';
import type { CredentialsDto } from './types';

/**
 * Универсальный хост GREEN-API — работает для любых инстансов (см. документацию
 * «Использование хостов GREEN-API»). Персональный apiUrl из личного кабинета
 * быстрее, но для него нужно отдельное поле в форме.
 */
const API_HOST = 'https://api.green-api.com';

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/** Достаёт reason/message из тела ошибки, отбрасывая всё остальное (в т.ч. URL). */
async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      for (const key of ['reason', 'message', 'error']) {
        const value = record[key];
        if (typeof value === 'string' && value.trim() !== '') {
          return value.length > 200 ? `${value.slice(0, 200)}…` : value;
        }
      }
    }
  } catch {
    // тело не JSON — детали нет
  }
  return null;
}

async function toApiError(response: Response): Promise<ApiError> {
  const detail = await readErrorDetail(response);
  switch (true) {
    case response.status === 401 || response.status === 403:
      return new ApiError('auth', 'Неверный idInstance или apiTokenInstance');
    case response.status === 400:
      return new ApiError('validation', `Некорректный запрос${detail ? `: ${detail}` : ''}`);
    case response.status === 429 || response.status === 466:
      return new ApiError(
        'rateLimit',
        detail ?? 'Превышен лимит частоты запросов к GREEN-API, попробуйте позже',
      );
    case response.status >= 500:
      return new ApiError('server', `Сервер GREEN-API временно недоступен (${response.status})`);
    default:
      return new ApiError('unknown', `Ошибка запроса к GREEN-API (${response.status})`);
  }
}

export interface RequestOptionsInternal {
  method: 'GET' | 'POST' | 'DELETE';
  /** Имя метода API и необязательный путь после токена, например "deleteNotification/123". */
  apiMethod: string;
  body?: unknown;
  /** Дополнительные query-параметры (добавляются в конец URL). */
  query?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Выполняет запрос к GREEN-API. Возвращает распарсенный JSON;
 * undefined — если сервер вернул пустое тело (например, в receiveNotification,
 * когда уведомлений нет).
 *
 * Токен передаётся только в пути запроса и никогда не попадает в сообщения
 * об ошибках: сетевые и HTTP-ошибки заворачиваются в ApiError с безопасным текстом.
 */
export async function request<TResponse>(
  credentials: CredentialsDto,
  options: RequestOptionsInternal,
): Promise<TResponse | undefined> {
  const base = `${API_HOST}/waInstance${credentials.idInstance}/${options.apiMethod}/${credentials.apiTokenInstance}`;
  const url = options.query ? `${base}?${new URLSearchParams(options.query)}` : base;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    // Отмена пользователем проходит как есть; сетевой тайм-аут и сбой
    // превращаются в безопасную сетевую ошибку.
    if (isAbort(error) && options.signal?.aborted) throw error;
    if (isAbort(error)) {
      throw new ApiError('network', 'Превышено время ожидания ответа GREEN-API');
    }
    throw new ApiError('network', 'Нет соединения с сервером GREEN-API');
  }

  if (!response.ok) throw await toApiError(response);

  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new ApiError('unknown', 'Сервер GREEN-API вернул некорректный ответ');
  }
}
