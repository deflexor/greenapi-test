export interface TimeoutSignal {
  signal: AbortSignal;
  /** Снимает таймер и подписку; вызывать после завершения запроса. */
  dispose: () => void;
}

/**
 * Совмещает внешний сигнал с сетевым тайм-аутом без AbortSignal.any/timeout
 * (недоступны в части сред выполнения).
 */
export function withTimeout(external: AbortSignal | undefined, timeoutMs: number): TimeoutSignal {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(external?.reason);
  if (external !== undefined) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(
    () => controller.abort(new DOMException('Превышено время ожидания ответа', 'TimeoutError')),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}
