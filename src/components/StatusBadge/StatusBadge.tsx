import type { ConnectionStatus } from '@/features/connection/connectionModel';
import styles from './StatusBadge.module.css';

const LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Не подключено',
  connecting: 'Подключение…',
  connected: 'Подключено',
  error: 'Ошибка подключения',
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
