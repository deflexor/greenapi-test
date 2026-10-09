import type { Chat } from '@/features/chat/chatModel';
import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
  chat: Chat;
  /** Возврат к списку чатов (используется на мобильных экранах). */
  onBack: () => void;
}

export function ChatHeader({ chat, onBack }: ChatHeaderProps) {
  const title = chat.title ?? chat.id;
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.back}
        onClick={onBack}
        aria-label="Назад к списку чатов"
      >
        ←
      </button>
      <div className={styles.info}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>chatId: {chat.id}</p>
      </div>
    </header>
  );
}
