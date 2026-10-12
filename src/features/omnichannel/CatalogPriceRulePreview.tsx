'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { omnichannelCatalogApi, type CatalogPriceRulePreviewDto } from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';

const PREVIEW_NAME_MAX_LENGTH = 300;

// "Bu ürüne hangi kural uygulanır?" — botla aynı eşleştirici sunucuda çalışır (tek uygulama).
// Yalnız kaydedilmiş, aktif kurallar dikkate alınır.
export function CatalogPriceRulePreview({ profileId }: { profileId: number }) {
  const [name, setName] = useState('');
  const [result, setResult] = useState<CatalogPriceRulePreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await omnichannelCatalogApi.previewPriceRule(profileId, name.trim()));
    } catch (e) {
      setResult(null);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 sm:w-2/3">
        <input
          value={name}
          maxLength={PREVIEW_NAME_MAX_LENGTH}
          onChange={(e) => { setName(e.target.value); setResult(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
          placeholder="Ürün adı yazın, ör. Audi A3 Bonnet Deflector 3mm"
          aria-label="Önizlenecek ürün adı"
          className="h-7.5 min-w-0 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
        <button type="button" onClick={() => void run()} disabled={loading || !name.trim()}
          className="inline-flex h-7.5 shrink-0 items-center gap-1.5 rounded-[3px] border border-[var(--border)] px-2.5 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50">
          <Search size={12} /> {loading ? 'Bakılıyor…' : 'Önizle'}
        </button>
      </div>
      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {result && (
        <div className="text-[11px] text-[var(--fg)]">
          {result.matched
            ? <>Uygulanan kural: <strong>{result.keywords}</strong> → <span className="font-mono">{result.price?.toFixed(2)}</span></>
            : 'Hiçbir kural tutmadı — "Listede olmayan ürünlerde" seçimi uygulanır.'}
        </div>
      )}
    </div>
  );
}
