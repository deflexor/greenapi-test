/**
 * Типизированная ошибка транспортного слоя GREEN-API.
 * Сообщения безопасны для показа пользователю: никогда не содержат
 * apiTokenInstance, idInstance или исходный URL запроса.
 */
export type ApiErrorKind =
  | 'auth' // неверные idInstance / apiTokenInstance
  | 'network' // сеть недоступна, тайм-аут, DNS
  | 'rateLimit' // 429 / 466: лимиты частоты запросов
  | 'validation' // 400: некорректный запрос
  | 'server' // 5xx на стороне GREEN-API
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

/** Короткое сообщение для показа пользователю без технических деталей. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') return 'Запрос отменён';
  return 'Неизвестная ошибка';
}
