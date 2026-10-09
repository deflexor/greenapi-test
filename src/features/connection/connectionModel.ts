import type { StateInstanceDto } from '@/services/greenApi/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const NOT_AUTHORIZED_MESSAGES: Record<StateInstanceDto, string> = {
  authorized: 'Подключено',
  notAuthorized:
    'Инстанс не авторизован. Откройте личный кабинет GREEN-API и привяжите аккаунт Telegram к инстансу.',
  blocked: 'Инстанс заблокирован. Обратитесь в поддержку GREEN-API.',
  suspended:
    'Отправка временно ограничена GREEN-API. Подробности — в поле suspendedUntil личного кабинета.',
  starting: 'Инстанс запускается. Подождите пару минут и повторите подключение.',
  pendingPassword:
    'Инстанс ожидает пароль двухфакторной аутентификации. Завершите вход в личном кабинете GREEN-API.',
};
