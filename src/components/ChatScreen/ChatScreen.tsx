import type { CredentialsDto } from '@/services/greenApi/types';
import { useChats } from '@/features/chat/useChats';
import { ChatList } from '@/components/ChatList/ChatList';
import { ChatHeader } from '@/components/ChatHeader/ChatHeader';
import { MessageComposer } from '@/components/MessageComposer/MessageComposer';
import { MessageList } from '@/components/MessageList/MessageList';
import { NewChatForm } from '@/components/NewChatForm/NewChatForm';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import styles from './ChatScreen.module.css';

interface ChatScreenProps {
  credentials: CredentialsDto;
  onDisconnect: () => void;
}

export function ChatScreen({ credentials, onDisconnect }: ChatScreenProps) {
  const {
    chats,
    activeChatId,
    activeChat,
    receiveIssue,
    openChat,
    closeChat,
    sendMessage,
    retryMessage,
  } = useChats(credentials);

  return (
    <div className={`${styles.layout} ${activeChatId !== null ? styles.chatOpened : ''}`}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <StatusBadge status="connected" />
          <button type="button" className={styles.disconnect} onClick={onDisconnect}>
            Отключиться
          </button>
        </header>
        <NewChatForm onOpen={openChat} />
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          onSelect={(chatId) => void openChat(chatId)}
        />
      </aside>

      <section className={styles.chatArea} aria-label="Переписка">
        {receiveIssue !== null && (
          <p className={styles.receiveIssue} role="status">
            Проблема с получением сообщений: {receiveIssue} Пробуем продолжить автоматически.
          </p>
        )}
        {activeChat === null ? (
          <div className={styles.noChat}>
            <p>Выберите чат слева или откройте новый по идентификатору получателя.</p>
          </div>
        ) : (
          // key сбрасывает локальное состояние (черновик, ошибка) при смене чата
          <div key={activeChat.id} className={styles.conversation}>
            <ChatHeader chat={activeChat} onBack={closeChat} />
            <MessageList messages={activeChat.messages} onRetry={retryMessage} />
            <MessageComposer onSend={sendMessage} />
          </div>
        )}
      </section>
    </div>
  );
}
