import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import styles from './MessageComposer.module.css';

interface MessageComposerProps {
  /** Отправляет текст; отклонение Promise означает ошибку отправки. */
  onSend: (text: string) => Promise<void>;
}

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);

  const trimmedDraft = draft.trim();
  const canSend = trimmedDraft !== '' && !isSending;

  const handleSubmit = async () => {
    // sendingRef закрывает окно между событиями до перерисовки (двойной клик/Enter).
    if (trimmedDraft === '' || sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    setError(null);
    try {
      await onSend(trimmedDraft);
      setDraft('');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось отправить сообщение',
      );
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  return (
    <form className={styles.composer} onSubmit={handleFormSubmit}>
      <textarea
        className={styles.input}
        aria-label="Текст сообщения"
        placeholder="Сообщение (Enter — отправить, Shift+Enter — перенос строки)"
        rows={1}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className={styles.send}
        disabled={!canSend}
        aria-label="Отправить сообщение"
        aria-busy={isSending}
      >
        {isSending ? '…' : '➤'}
      </button>
    </form>
  );
}
