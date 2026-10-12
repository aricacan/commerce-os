// Sistem İzleme ekranlarının saf biçimlendiricileri (DOM/ağ yok, test edilebilir).
// `now` dışarıdan alınır ki testler deterministik olsun.

const SECOND_MS = 1_000;
const MINUTE_S = 60;
const HOUR_S = 3_600;
const DAY_MS = 86_400_000;
const RELATIVE_DAY_LIMIT = 7;

/** Aktif süre: 8040 sn → "2 sa 14 dk". Bir dakikanın altı saniye olarak yazılır. */
export function formatActiveSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';
  const seconds = Math.round(totalSeconds);
  if (seconds < MINUTE_S) return `${seconds} sn`;

  const hours = Math.floor(seconds / HOUR_S);
  const minutes = Math.floor((seconds % HOUR_S) / MINUTE_S);
  if (hours === 0) return `${minutes} dk`;
  return minutes === 0 ? `${hours} sa` : `${hours} sa ${minutes} dk`;
}

/** Sayfada kalma süresi: 80000 ms → "1 dk 20 sn". */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < SECOND_MS) return '<1 sn';

  const seconds = Math.round(ms / SECOND_MS);
  if (seconds < MINUTE_S) return `${seconds} sn`;
  if (seconds >= HOUR_S) return formatActiveSeconds(seconds);

  const minutes = Math.floor(seconds / MINUTE_S);
  const rest = seconds % MINUTE_S;
  return rest === 0 ? `${minutes} dk` : `${minutes} dk ${rest} sn`;
}

/** "az önce", "5 dk önce", "3 sa önce", "2 gün önce"; bir haftadan eskiyse tarih. */
export function formatRelative(iso: string | null, now: number): string {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';

  const diffS = Math.max(0, Math.floor((now - time) / SECOND_MS));
  if (diffS < MINUTE_S) return 'az önce';
  if (diffS < HOUR_S) return `${Math.floor(diffS / MINUTE_S)} dk önce`;
  if (diffS * SECOND_MS < DAY_MS) return `${Math.floor(diffS / HOUR_S)} sa önce`;

  const days = Math.floor((diffS * SECOND_MS) / DAY_MS);
  if (days < RELATIVE_DAY_LIMIT) return `${days} gün önce`;
  return new Date(time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Son N günün başlangıcı, ISO — aktivite `from` süzgecine verilir. */
export function daysAgoIso(days: number, now: number): string {
  return new Date(now - days * DAY_MS).toISOString();
}

/** Yerel takvim günü anahtarı (YYYY-MM-DD) — akışı güne göre gruplamak için. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Gün başlığı: "Bugün", "Dün" ya da "16 Eylül 2026 Çarşamba". */
export function dayHeading(iso: string, now: number): string {
  const key = localDayKey(iso);
  if (key === localDayKey(new Date(now).toISOString())) return 'Bugün';
  if (key === localDayKey(new Date(now - DAY_MS).toISOString())) return 'Dün';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
  });
}

/** Saat: "14:32" (yerel saat). */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Tarih + saat: "16.09.2026 14:32". */
export function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
