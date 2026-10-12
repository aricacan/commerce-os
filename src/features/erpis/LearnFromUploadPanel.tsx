'use client';

import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import {
  ERPIS_DICTIONARY_KIND_LABELS, erpisCatalogApi,
  type ErpisDictionaryKind,
} from '@/lib/api';
import { useErpisDictionaryCandidates } from '@/hooks/erpis/useErpisCatalog';
import { formatNumber } from './shared';

// Sistemin ÖĞRENDİĞİ yer.
//
// Ayrıştırıcı bir değeri tanımadığında kart eksik kalıyor; aynı değer onlarca kartta
// geçiyorsa bu bir sözlük eksiğidir. Öneriler zaten üretiliyordu (bkz.
// SuggestDictionaryCandidatesAsync) ama ayrı bir sekmenin içinde, tek tek onaylanıyordu —
// on iki değer için on iki tıklama. Kimse yapmıyordu.
//
// Panel YÜKLEMENİN HEMEN ARDINDAN çıkıyor: eksikliğin farkına varıldığı an ile düzeltme
// arasındaki mesafe ne kadar kısaysa düzeltme o kadar oluyor. Hepsi seçili geliyor, tek
// düğme onaylıyor ve arkasından kartlar yeniden ayrıştırılıyor.

// Hangi türler öneriliyor. Renk/malzeme/desen gibi türlerde öneri gürültülü oluyor —
// ürün adlarındaki her sıfat aday görünüyor. Marka, model ve kategori ise ayrıştırmanın
// omurgası; eksikleri doğrudan rakamları bozuyor.
const KINDS: ErpisDictionaryKind[] = ['Brand', 'Model', 'ProductType'];

const SUGGESTION_LIMIT = 12;

export function LearnFromUploadPanel() {
  const [kind, setKind] = useState<ErpisDictionaryKind>('ProductType');
  const [rejected, setRejected] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; improved: number } | null>(null);
  // Onay hatası eskiden yutuluyordu: düğme eski hâline dönüyor, hiçbir şey olmamış gibi
  // görünüyordu (uç her istekte 400 dönerken kimse fark etmedi).
  const [error, setError] = useState<string | null>(null);

  // Hook bir SAYI değil, etkinlik bayrağı alıyor; sunucu varsayılan 20 öneri döndürüyor
  // ve panel ilk SUGGESTION_LIMIT tanesini gösteriyor — bir yükleme sonrası on ikiden
  // fazla karar vermek zaten yorucu.
  const candidates = useErpisDictionaryCandidates(kind);
  const rows = (candidates.data ?? [])
    .filter((c) => !rejected.includes(c.value))
    .slice(0, SUGGESTION_LIMIT);

  async function approve() {
    if (rows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await erpisCatalogApi.approveCandidates(kind, rows.map((r) => r.value));
      setResult({
        added: response.added,
        improved: (response.reparse?.brandedAfter ?? 0) - (response.reparse?.brandedBefore ?? 0),
      });
      await candidates.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sözlüğe eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="flex items-center gap-2 rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
        <Check size={14} strokeWidth={2.2} className="shrink-0 text-[var(--fg-subtle)]" />
        <span className="text-[11.5px] text-[var(--fg)]">
          <strong className="font-bold">{formatNumber(result.added)}</strong> değer sözlüğe eklendi
          {result.improved > 0 && (
            <> · <strong className="font-bold">{formatNumber(result.improved)}</strong> kartın markası artık çözülüyor</>
          )}
        </span>
      </div>
    );
  }

  if (candidates.isLoading || rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--fg)]">
          <Sparkles size={13} strokeWidth={2.2} className="text-[var(--fg-subtle)]" />
          Ayrıştırılamayan adlarda sık geçen değerler
        </span>

        <div className="flex rounded-[4px] border border-[var(--border-soft)] p-0.5">
          {KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setKind(option); setRejected([]); }}
              aria-pressed={kind === option}
              className={`rounded-[3px] px-2 py-0.5 text-[11px] font-bold ${
                kind === option ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--fg-muted)]'
              }`}
            >
              {ERPIS_DICTIONARY_KIND_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Her değer TEK TIKLA çıkarılabiliyor: onay toplu ama karar tek tek. Yanlış bir
          değeri sözlüğe almak, hiç almamaktan daha pahalı — sonraki her ayrıştırmayı
          bozar. */}
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <button
            key={row.value}
            type="button"
            onClick={() => setRejected((current) => [...current, row.value])}
            title={`Listeden çıkar · örnek: ${row.samples[0] ?? ''}`}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--card)] py-1 pl-2.5 pr-2 text-[11px] font-semibold text-[var(--fg)] hover:border-[var(--border)]"
          >
            {row.value}
            <span className="text-[9.5px] font-bold tabular-nums text-[var(--fg-muted)]">
              {formatNumber(row.occurrences)}
            </span>
            <span className="text-[11px] leading-none text-[var(--fg-subtle)]">×</span>
          </button>
        ))}
      </div>

      {error && <p className="text-[11px] text-rose-500">{error}</p>}

      <button
        type="button"
        onClick={() => void approve()}
        disabled={busy}
        className="flex w-fit items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.2} />}
        {formatNumber(rows.length)} değeri sözlüğe ekle ve yeniden ayrıştır
      </button>
    </div>
  );
}
