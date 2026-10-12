// Hangfire paneli için saf biçimlendirme yardımcıları (test: format.test.ts).

// Hangfire cron ifadeleri UTC'dir; Türkiye 2016'dan beri yaz saati uygulamadan UTC+3.
const TURKEY_UTC_OFFSET_HOURS = 3;
const HOURS_PER_DAY = 24;
const CRON_FIELD_COUNT = 5;
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;

const INTEGER = /^\d+$/;
const STEP = /^\*\/(\d+)$/;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function toTurkeyTime(hourUtc: number, minute: number): string {
  return `${pad((hourUtc + TURKEY_UTC_OFFSET_HOURS) % HOURS_PER_DAY)}:${pad(minute)}`;
}

/**
 * Cron ifadesini Türkçe cümleye çevirir; saatler Türkiye saatiyle (TSİ) gösterilir.
 * Tanımadığı kalıpta ifadenin kendisini döner — yanlış bir cümle göstermektense ham
 * ifade daha dürüst (eski sürüm "20 * * * *"ü de "Her saat başı" diye gösteriyordu).
 */
export function describeCron(cron: string): string {
  const fields = cron.trim().split(/\s+/);
  if (!cron.trim()) return 'Zamanlanmamış';
  if (fields.length !== CRON_FIELD_COUNT) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  const everyDay = dayOfMonth === '*' && month === '*' && dayOfWeek === '*';

  if (everyDay && minute === '*' && hour === '*') return 'Her dakika';

  const minuteStep = STEP.exec(minute);
  if (everyDay && minuteStep && hour === '*') return `${minuteStep[1]} dakikada bir`;

  if (!INTEGER.test(minute)) return cron;
  const minuteValue = Number(minute);

  if (everyDay && hour === '*') {
    return minuteValue === 0 ? 'Her saat başı' : `Saatte bir (:${pad(minuteValue)})`;
  }

  const hourStep = STEP.exec(hour);
  if (everyDay && hourStep) return `${hourStep[1]} saatte bir (:${pad(minuteValue)})`;

  const hours = hour.split(',');
  if (!hours.every((h) => INTEGER.test(h))) return cron;
  const times = hours.map((h) => toTurkeyTime(Number(h), minuteValue)).join(', ');

  if (everyDay) {
    return hours.length === 1 ? `Her gün ${times} TSİ` : `Günde ${hours.length} kez (${times} TSİ)`;
  }

  if (dayOfMonth === '*' && month === '*' && INTEGER.test(dayOfWeek)) {
    const dayName = WEEKDAYS[Number(dayOfWeek) % WEEKDAYS.length];
    return `Her ${dayName} ${times} TSİ`;
  }

  if (INTEGER.test(dayOfMonth) && INTEGER.test(month) && dayOfWeek === '*') {
    return 'Yılda bir (elle tetiklemek için)';
  }

  return cron;
}

/** Süreyi kısa Türkçe biçimde yazar: "850 ms", "12 sn", "3 dk 5 sn", "2 sa 10 dk". */
export function formatDuration(ms: number): string {
  if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`;
  return formatSeconds(Math.round(ms / MS_PER_SECOND));
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < SECONDS_PER_MINUTE) return `${totalSeconds} sn`;
  if (totalSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return seconds === 0 ? `${minutes} dk` : `${minutes} dk ${seconds} sn`;
  }
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return minutes === 0 ? `${hours} sa` : `${hours} sa ${minutes} dk`;
}
