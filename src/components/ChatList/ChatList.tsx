import type { Chat } from '@/features/chat/chatModel';
import { formatMessageTime } from '@/utils/format';
import styles from './ChatList.module.css';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
}

export function ChatList({ chats, activeChatId, onSelect }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <p className={styles.empty} aria-live="polite">
        Чатов пока нет. Откройте новый чат или дождитесь входящего сообщения.
      </p>
    );
  }

  return (
    <nav className={styles.list} aria-label="Список чатов">
      <ul className={styles.items}>
        {chats.map((chat) => {
          const lastMessage = chat.messages.at(-1);
          return (
            <li key={chat.id}>
              <button
                type="button"
                className={`${styles.item} ${chat.id === activeChatId ? styles.active : ''}`}
                onClick={() => onSelect(chat.id)}
                aria-current={chat.id === activeChatId ? 'true' : undefined}
              >
                <span className={styles.title}>{chat.title ?? chat.id}</span>
                <span className={styles.meta}>
                  {chat.id !== (chat.title ?? chat.id) && (
                    <span className={styles.id}>{chat.id}</span>
                  )}
                  {lastMessage !== undefined && (
                    <time dateTime={new Date(lastMessage.timestampMs).toISOString()}>
                      {formatMessageTime(lastMessage.timestampMs)}
                    </time>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
