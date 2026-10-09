import type { ConnectionStatus } from '@/features/connection/connectionModel';
import type { CredentialsDto } from '@/services/greenApi/types';
import { ConnectionForm } from '@/components/ConnectionForm/ConnectionForm';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import styles from './ConnectionScreen.module.css';

interface ConnectionScreenProps {
  status: ConnectionStatus;
  error: string | null;
  onConnect: (credentials: CredentialsDto) => Promise<void>;
}

export function ConnectionScreen({ status, error, onConnect }: ConnectionScreenProps) {
  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="connection-title">
        <h1 id="connection-title" className={styles.title}>
          Telegram Chat
        </h1>
        <p className={styles.subtitle}>Минималистичный веб-чат на GREEN-API</p>
        <StatusBadge status={status} />
        <ConnectionForm status={status} error={error} onConnect={onConnect} />
      </section>
    </main>
  );
}
