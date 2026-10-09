/** DTO GREEN-API (Telegram). Формы зафиксированы по документации Telegram-интеграции. */

export interface CredentialsDto {
  idInstance: string;
  apiTokenInstance: string;
}

export type StateInstanceDto =
  'notAuthorized' | 'authorized' | 'blocked' | 'suspended' | 'starting' | 'pendingPassword';

/** POST sendMessage */
export interface SendMessageRequestDto {
  chatId: string;
  message: string;
}

export interface SendMessageResponseDto {
  idMessage: string;
}

/** POST checkAccount — ровно одно из полей phoneNumber | username */
export interface CheckAccountRequestDto {
  phoneNumber?: number;
  username?: string;
}

export interface CheckAccountResponseDto {
  exist: boolean;
  chatId: string;
  username?: string;
  phoneNumber?: number;
  fromCache?: boolean;
}

/** GET receiveNotification — одно уведомление из очереди */
export interface ReceiveNotificationResponseDto {
  receiptId: number;
  /** Тело уведомления валидируется отдельно (normalizeNotification). */
  body: unknown;
}

/** DELETE deleteNotification/{receiptId} */
export interface DeleteNotificationResponseDto {
  result: boolean;
  reason?: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
}
