import { useCallback, useRef, useState } from 'react';
import { getStateInstance } from '@/services/greenApi/telegram';
import { toUserMessage } from '@/services/greenApi/errors';
import type { CredentialsDto } from '@/services/greenApi/types';
import { NOT_AUTHORIZED_MESSAGES, type ConnectionStatus } from './connectionModel';

export interface UseConnectionResult {
  status: ConnectionStatus;
  error: string | null;
  /** Доступны только при status === 'connected'. */
  credentials: CredentialsDto | null;
  connect: (credentials: CredentialsDto) => Promise<void>;
  disconnect: () => void;
}

/**
 * Проверка подключения реальным запросом getStateInstance.
 * Защита от гонок: устаревший ответ (после disconnect/повторного connect)
 * не применяется. Учетные данные хранятся только в состоянии React.
 */
export function useConnection(): UseConnectionResult {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialsDto | null>(null);
  const requestSeqRef = useRef(0);
  // Предохранитель двойного нажатия до перерисовки кнопки.
  const connectingRef = useRef(false);

  const connect = useCallback(async (next: CredentialsDto) => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    const seq = ++requestSeqRef.current;
    setStatus('connecting');
    setError(null);
    try {
      const state = await getStateInstance(next);
      if (seq !== requestSeqRef.current) return;
      if (state === 'authorized') {
        setCredentials(next);
        setStatus('connected');
      } else {
        setStatus('error');
        setError(NOT_AUTHORIZED_MESSAGES[state]);
      }
    } catch (requestError) {
      if (seq !== requestSeqRef.current) return;
      setStatus('error');
      setError(toUserMessage(requestError));
    } finally {
      connectingRef.current = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    requestSeqRef.current += 1;
    connectingRef.current = false;
    setCredentials(null);
    setError(null);
    setStatus('disconnected');
  }, []);

  return { status, error, credentials, connect, disconnect };
}
