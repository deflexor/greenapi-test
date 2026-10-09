import { describe, expect, it } from 'vitest';
import { isValidChatId, parseChatInput } from '@/utils/chatId';

describe('parseChatInput', () => {
  it.each([
    ['10000000', { kind: 'id', value: '10000000' }],
    ['  10000000  ', { kind: 'id', value: '10000000' }],
    ['-10000000000000', { kind: 'group', value: '-10000000000000' }],
    ['@durov', { kind: 'username', value: '@durov' }],
    ['durov', { kind: 'username', value: '@durov' }],
    ['+79991234567', { kind: 'phone', value: '79991234567' }],
    ['79991234567@c.us', { kind: 'phone', value: '79991234567' }],
  ])('разбирает %s', (input, expected) => {
    expect(parseChatInput(input)).toEqual(expected);
  });

  it.each(['', '   ', 'abc', '@a', '12345', '+7999abc', '@bad name!'])(
    'отклоняет недопустимый ввод %s',
    (input) => {
      expect(parseChatInput(input)).toBeNull();
    },
  );

  it('считает чистые цифры chatId: телефон требует префикса "+"', () => {
    expect(parseChatInput('79991234567')).toEqual({ kind: 'id', value: '79991234567' });
  });
});

describe('isValidChatId', () => {
  it('принимает числовые chatId пользователя и группы', () => {
    expect(isValidChatId('10000000')).toBe(true);
    expect(isValidChatId('-10000000000000')).toBe(true);
  });

  it('отклоняет username, телефон с суффиксом и мусор', () => {
    expect(isValidChatId('@durov')).toBe(false);
    expect(isValidChatId('79991234567@c.us')).toBe(false);
    expect(isValidChatId('abc')).toBe(false);
    expect(isValidChatId('')).toBe(false);
  });
});
