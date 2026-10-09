import { useState, type FormEvent } from 'react';
import type { ConnectionStatus } from '@/features/connection/connectionModel';
import type { CredentialsDto } from '@/services/greenApi/types';
import styles from './ConnectionForm.module.css';

interface ConnectionFormProps {
  status: ConnectionStatus;
  /** Ошибка подключения от API (авторизация, сеть); уже безопасна для показа. */
  error: string | null;
  onConnect: (credentials: CredentialsDto) => Promise<void>;
}

interface FieldErrors {
  idInstance?: string;
  apiTokenInstance?: string;
}

const ID_INSTANCE_PATTERN = /^\d+$/;

function validate(idInstance: string, apiTokenInstance: string): FieldErrors {
  const errors: FieldErrors = {};
  if (idInstance === '') {
    errors.idInstance = 'Укажите idInstance';
  } else if (!ID_INSTANCE_PATTERN.test(idInstance)) {
    errors.idInstance = 'idInstance — только цифры';
  }
  if (apiTokenInstance === '') {
    errors.apiTokenInstance = 'Укажите apiTokenInstance';
  }
  return errors;
}

export function ConnectionForm({ status, error, onConnect }: ConnectionFormProps) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isConnecting = status === 'connecting';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isConnecting) return;
    const trimmedId = idInstance.trim();
    const trimmedToken = apiTokenInstance.trim();
    const errors = validate(trimmedId, trimmedToken);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void onConnect({ idInstance: trimmedId, apiTokenInstance: trimmedToken });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="id-instance">idInstance</label>
        <input
          id="id-instance"
          name="idInstance"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="4100000000"
          value={idInstance}
          onChange={(event) => setIdInstance(event.target.value)}
          aria-invalid={fieldErrors.idInstance !== undefined}
          aria-describedby={fieldErrors.idInstance !== undefined ? 'id-instance-error' : undefined}
          disabled={isConnecting}
        />
        {fieldErrors.idInstance !== undefined && (
          <p id="id-instance-error" className={styles.error}>
            {fieldErrors.idInstance}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="api-token-instance">apiTokenInstance</label>
        <input
          id="api-token-instance"
          name="apiTokenInstance"
          type="password"
          autoComplete="off"
          placeholder="Ключ доступа из личного кабинета"
          value={apiTokenInstance}
          onChange={(event) => setApiTokenInstance(event.target.value)}
          aria-invalid={fieldErrors.apiTokenInstance !== undefined}
          aria-describedby={
            fieldErrors.apiTokenInstance !== undefined ? 'api-token-error' : undefined
          }
          disabled={isConnecting}
        />
        {fieldErrors.apiTokenInstance !== undefined && (
          <p id="api-token-error" className={styles.error}>
            {fieldErrors.apiTokenInstance}
          </p>
        )}
      </div>

      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isConnecting}>
        {isConnecting ? 'Подключение…' : 'Подключить'}
      </button>
    </form>
  );
}
