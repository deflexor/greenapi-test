import { useRef, useState, type FormEvent } from 'react';
import styles from './NewChatForm.module.css';

interface NewChatFormProps {
  /** Открывает чат; отклонение Promise означает ошибку валидации или проверки. */
  onOpen: (input: string) => Promise<void>;
}

export function NewChatForm({ onOpen }: NewChatFormProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const resolvingRef = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resolvingRef.current) return;
    const input = value.trim();
    if (input === '') {
      setError('Укажите идентификатор получателя');
      return;
    }
    setError(null);
    resolvingRef.current = true;
    setIsResolving(true);
    try {
      await onOpen(input);
      setValue('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось открыть чат');
    } finally {
      resolvingRef.current = false;
      setIsResolving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label className={styles.label} htmlFor="new-chat-input">
        Новый чат
      </label>
      <div className={styles.row}>
        <input
          id="new-chat-input"
          className={styles.input}
          type="text"
          autoComplete="off"
          placeholder="10000000, @username или +79991234567"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? 'new-chat-error' : undefined}
          disabled={isResolving}
        />
        <button type="submit" className={styles.open} disabled={isResolving}>
          {isResolving ? 'Проверка…' : 'Открыть'}
        </button>
      </div>
      {error !== null && (
        <p id="new-chat-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
