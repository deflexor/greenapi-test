/**
 * Разбор идентификатора получателя по правилам Telegram-интеграции GREEN-API:
 *  - chatId приватного чата — положительная числовая строка ("10000000");
 *  - группа — строка с минусом ("-10000000000000");
 *  - username ("@name") и телефон разрешаются в chatId отдельно, через checkAccount.
 */
export type ChatIdKind = 'id' | 'group' | 'username' | 'phone';

export interface ParsedChatInput {
  kind: ChatIdKind;
  value: string;
}

const NUMERIC_ID = /^-?\d{6,}$/;
const PHONE = /^\+(\d{7,15})$/;
const USERNAME = /^@?([a-zA-Z][a-zA-Z0-9_]{4,31})$/;
const LEGACY_PHONE_CUS = /^(\d{7,15})@c\.us$/;

/** Возвращает null для ввода, который не является допустимым идентификатором. */
export function parseChatInput(raw: string): ParsedChatInput | null {
  const input = raw.trim();
  if (input === '') return null;

  if (NUMERIC_ID.test(input)) {
    return { kind: input.startsWith('-') ? 'group' : 'id', value: input };
  }

  const legacyPhone = LEGACY_PHONE_CUS.exec(input);
  if (legacyPhone) {
    const value = legacyPhone[1];
    if (value !== undefined) return { kind: 'phone', value };
    return null;
  }

  const phone = PHONE.exec(input);
  if (phone) {
    const value = phone[1];
    if (value !== undefined) return { kind: 'phone', value };
    return null;
  }

  const username = USERNAME.exec(input);
  if (username) {
    const value = username[1];
    if (value !== undefined) return { kind: 'username', value: `@${value}` };
  }

  return null;
}

/** chatId валиден как идентификатор чата (числовая строка, для групп — с минусом). */
export function isValidChatId(chatId: string): boolean {
  return /^-?\d{1,20}$/.test(chatId);
}
