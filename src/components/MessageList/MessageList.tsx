import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/features/chat/chatModel';
import { MessageItem } from '@/components/MessageItem/MessageItem';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: ChatMessage[];
  onRetry: (messageId: string) => Promise<void>;
}

const NEAR_BOTTOM_THRESHOLD_PX = 80;

export function MessageList({ messages, onRetry }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const element = containerRef.current;
    if (element === null) return;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    isNearBottomRef.current = distanceToBottom < NEAR_BOTTOM_THRESHOLD_PX;
  };

  useEffect(() => {
    const element = containerRef.current;
    if (element !== null && isNearBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={styles.list}
      onScroll={handleScroll}
      role="log"
      aria-label="Сообщения"
    >
      {messages.length === 0 ? (
        <p className={styles.empty}>Пока нет сообщений. Напишите первым.</p>
      ) : (
        messages.map((message) => (
          <MessageItem key={message.id} message={message} onRetry={onRetry} />
        ))
      )}
    </div>
  );
}
