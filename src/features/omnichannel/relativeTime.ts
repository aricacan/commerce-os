// "2dk", "3sa", "Dün", "14 Tem" — mutlak zaman damgası liste/pano taramasını yavaşlatır.
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';

  const date = new Date(iso);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return 'şimdi';
  if (diffMinutes < 60) return `${diffMinutes}dk`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}sa`;
  if (diffHours < 48) return 'Dün';

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
