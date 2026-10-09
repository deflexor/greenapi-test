const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function formatMessageTime(timestampMs: number): string {
  return timeFormatter.format(timestampMs);
}
