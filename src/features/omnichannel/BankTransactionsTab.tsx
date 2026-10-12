'use client';

import { useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { BANK_TRANSACTION_STATUS, bankApi, type BankImportResultDto } from '../../lib/api/omnichannel-bank';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { BANK_DAYS_OPTIONS, BANK_DEFAULT_DAYS, bankMatchSummary } from './bankMatchRules';
import { BankImportPanel } from './BankImportPanel';
import { BankMailboxCard } from './BankMailboxCard';
import { BankImportResultCard } from './BankImportResultCard';
import { BankTransactionSection } from './BankTransactionSection';
import { secondaryButtonClass } from './formClasses';

// Banka hareketleri (P34): döküm yükle → sipariş numaralı havaleler eşleşir, diğerleri öneri olur.
// Kendiliğinden "ödendi" yalnız kanalın Bot sekmesinde "Havale otomatik eşleşme" açıkken çalışır.
export function BankTransactionsTab() {
  const { notify } = useFeedback();
  const [days, setDays] = useState(BANK_DEFAULT_DAYS);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<BankImportResultDto | null>(null);
  const [rematching, setRematching] = useState(false);

  const refresh = () => setVersion((v) => v + 1);

  const handleImported = (imported: BankImportResultDto) => {
    setResult(imported);
    refresh();
  };

  const handleRematch = async () => {
    setRematching(true);
    try {
      notify.success(bankMatchSummary(await bankApi.rematch()));
      refresh();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setRematching(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Banka Hareketleri</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Bankadan indirdiğin hesap dökümünü yükle. Açıklamasında sipariş numarası (KS-000123) olan ve tutarı tam tutan
            havaleler siparişle eşleşir; diğerleri tutar, gönderen adı ve tarihe göre öneri olarak burada onayını bekler.
            Siparişi kendiliğinden ödendi yapmak için kanalın Bot sekmesindeki &quot;Havale otomatik eşleşme&quot; açık olmalı.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect value={String(days)} options={BANK_DAYS_OPTIONS} placeholder="Süre" showAllOption={false}
            minWidth={120} onChange={(v) => setDays(Number(v))} />
          <button type="button" disabled={rematching} onClick={() => void handleRematch()} className={secondaryButtonClass}>
            <RefreshCw size={13} className={rematching ? 'animate-spin' : ''} /> Yeniden eşleştir
          </button>
        </div>
      </div>

      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3.5 py-3 shadow-xs">
        <h3 className="mb-2 text-xs font-bold text-[var(--fg)]">Döküm yükle</h3>
        <BankImportPanel onImported={handleImported} />
      </section>

      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3.5 py-3 shadow-xs">
        <h3 className="mb-2 text-xs font-bold text-[var(--fg)]">Posta kutusundan otomatik al</h3>
        <BankMailboxCard />
      </section>

      {result && <BankImportResultCard result={result} />}

      <BankTransactionSection title="Eşleşenler" hint="Sipariş ödendi olarak işaretlendi" status={BANK_TRANSACTION_STATUS.Matched}
        emptyText="Henüz eşleşen havale yok." days={days} version={version} onChanged={refresh} />
      <BankTransactionSection title="Öneriler" hint="Onayını bekleyen adaylar" status={BANK_TRANSACTION_STATUS.Suggested}
        emptyText="Onay bekleyen öneri yok." days={days} version={version} onChanged={refresh} />
      <BankTransactionSection title="Eşleşmeyenler" hint="Aday sipariş bulunamadı" status={BANK_TRANSACTION_STATUS.Unmatched}
        emptyText="Eşleşmeyen havale yok." days={days} version={version} onChanged={refresh} />
    </div>
  );
}
