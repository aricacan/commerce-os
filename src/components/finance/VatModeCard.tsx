'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { financeApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { VatMode } from '../../types/api';

// SİSTEM GENELİ KDV ANAHTARI.
//
// "Kapalı" seçildiğinde KDV hiçbir hesaba katılmaz: tüm oranlar 0 kabul edilir, çıkış ve
// girdi KDV'si hesaplanmaz, KDV satırı her yerde 0 döner. Bu GEÇİCİ bir görünümdür —
// KDV verisi netleşene kadar yönetimin KDV'siz bir tabloya bakabilmesi için var.
//
// Ayar SystemSettings'te tutulur ve kâr hesabının tek merkezi (OrderProfitContext) onu
// bağlamı kurarken okur; dolayısıyla P&L, sipariş kârlılığı, terminal ve reklam kârlılığı
// AYNI ANDA aynı moda geçer. Ekran ekran bir "KDV'siz göster" seçeneği eklemek, bir
// ekranın unutulup diğerinden farklı sayı göstermesi demekti.
export function VatModeCard() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['finance-vat-mode'],
    queryFn: () => financeApi.vatMode.get(),
  });

  const mode: VatMode = data?.mode ?? 'Standard';

  const save = useMutation({
    mutationFn: (next: VatMode) => financeApi.vatMode.set(next),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finance-vat-mode'] });
      // KDV modu KÂR RAKAMLARINI değiştirir: kâr gösteren her sorgu tazelenmeli, aksi
      // halde kullanıcı eski moddaki sayıları görmeye devam ederdi.
      queryClient.invalidateQueries({ queryKey: ['finance-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['finance-data'] });
      toast.success(
        result.mode === 'Ignored'
          ? isTr
            ? 'KDV kapatıldı — tüm kâr hesapları KDV’siz.'
            : 'VAT disabled — all profit calculations exclude VAT.'
          : isTr
          ? 'KDV normal hesaplanıyor.'
          : 'VAT is calculated normally.'
      );
    },
    onError: () => toast.error(isTr ? 'KDV modu değiştirilemedi.' : 'Failed to change VAT mode.'),
  });

  const isIgnored = mode === 'Ignored';

  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">
            {isTr ? 'KDV Hesaplama Modu' : 'VAT Calculation Mode'}
          </h3>
          <p className="m-0 mt-1 max-w-[520px] text-[11px] leading-relaxed text-[var(--fg-muted)]">
            {isTr
              ? 'Sistem genelinde geçerlidir: P&L, sipariş kârlılığı, terminal ve reklam kârlılığı aynı anda bu moda geçer.'
              : 'Applies system-wide: P&L, order profitability, terminal and ad profitability all follow this mode.'}
          </p>
        </div>

        {isLoading ? (
          <Loader2 className="animate-spin text-[var(--fg-muted)]" size={16} />
        ) : (
          <SegmentedControl<VatMode>
            value={mode}
            onChange={(next) => save.mutate(next)}
            size="sm"
            options={[
              { value: 'Standard', label: isTr ? 'Normal' : 'Standard' },
              { value: 'Ignored', label: isTr ? 'KDV Kapalı' : 'VAT Off' },
            ]}
          />
        )}
      </div>

      {isIgnored && (
        <div className="flex items-start gap-2 rounded-[5px] border border-amber-500/25 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span>
            {isTr
              ? 'KDV kapalı. Net KDV artık gider yazılmadığı için BRÜT KÂR OLDUĞUNDAN YÜKSEK görünür — iki mod arasındaki fark tam olarak net KDV kadardır. Muhasebe/beyanname için "Normal" moda dönün.'
              : 'VAT is off. Net VAT is no longer expensed, so GROSS PROFIT READS HIGHER — the difference between the two modes is exactly the net VAT. Switch back to Standard for accounting.'}
          </span>
        </div>
      )}
    </div>
  );
}
