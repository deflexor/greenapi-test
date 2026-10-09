/** Тайминги цикла получения; вынесены для переиспользования в тестах. */

/** Long-poll receiveNotification (документированный диапазон 5..60 секунд). */
export const RECEIVE_TIMEOUT_SECONDS = 20;
/** Пауза после пустого long-poll ответа (сервер уже прождал receiveTimeout). */
export const POLL_IDLE_MS = 500;
/** Пауза перед повтором после сетевой ошибки получения. */
export const POLL_ERROR_BACKOFF_MS = 3000;
