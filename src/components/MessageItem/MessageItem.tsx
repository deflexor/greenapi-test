import type { ChatMessage } from '@/features/chat/chatModel';
import { formatMessageTime } from '@/utils/format';
import styles from './MessageItem.module.css';

interface MessageItemProps {
  message: ChatMessage;
  onRetry: (messageId: string) => Promise<void>;
}

const STATUS_LABELS = {
  pending: 'Отправляется…',
  sent: 'Отправлено (принято GREEN-API)',
  failed: 'Ошибка отправки',
} as const;

export function MessageItem({ message, onRetry }: MessageItemProps) {
  const isOutgoing = message.direction === 'outgoing';
  const direction = isOutgoing ? styles.outgoing : styles.incoming;

  return (
    <article className={`${styles.message} ${direction}`}>
      <div className={styles.text}>{message.text}</div>
      <footer className={styles.meta}>
        <time dateTime={new Date(message.timestampMs).toISOString()}>
          {formatMessageTime(message.timestampMs)}
        </time>
        {isOutgoing && (
          <span
            className={styles[message.status]}
            title={STATUS_LABELS[message.status]}
            aria-label={STATUS_LABELS[message.status]}
          >
            {message.status === 'pending' ? '⏳' : message.status === 'sent' ? '✓' : '⚠'}
          </span>
        )}
      </footer>
      {message.status === 'failed' && message.error !== null && (
        <div className={styles.failure}>
          <span role="alert">{message.error}</span>
          <button type="button" className={styles.retry} onClick={() => void onRetry(message.id)}>
            Повторить
          </button>
        </div>
      )}
    </article>
  );
}
