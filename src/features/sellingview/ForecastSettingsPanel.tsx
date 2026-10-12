'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, ChevronDown, X } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';
import type { ForecastSettings } from '../../types/forecast';

/**
 * Faz D — motora gömülü varsayımların (mevsim uzunluğu, saat dilimi, para birimi,
 * tatil ülkesi, eşikler) kiracı ayarı. Kayıt yoksa backend Defaults() döner — bu
 * form açılmadan hiçbir kiracının davranışı değişmez (bkz. ForecastSettingsService).
 */
// Sayı alanları taslakta BOŞ olabilir (null). Eskiden `Number('')` 0 veriyordu: saat dilimi
// kutusu silinince değer sessizce 0 (= UTC) oluyor ve öyle kaydediliyordu.
type NumericKey = {
  [K in keyof ForecastSettings]: ForecastSettings[K] extends number ? K : never;
}[keyof ForecastSettings];
type SettingsDraft = Omit<ForecastSettings, NumericKey> & { [K in NumericKey]: number | null };

const parseNumber = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw));

// Boş sayı alanı varsa kaydedilecek geçerli bir ayar YOK (null) — kaydet düğmesi kapanır.
function toSettings(draft: SettingsDraft): ForecastSettings | null {
  const {
    seasonLengthDay, timezoneOffsetHours, sparseOrdersPerBucket,
    dormantHorizonMultiple, winsorizeSigma, paretoTopFraction,
  } = draft;
  if (
    seasonLengthDay === null || timezoneOffsetHours === null || sparseOrdersPerBucket === null
    || dormantHorizonMultiple === null || winsorizeSigma === null || paretoTopFraction === null
  ) {
    return null;
  }
  return {
    ...draft,
    seasonLengthDay, timezoneOffsetHours, sparseOrdersPerBucket,
    dormantHorizonMultiple, winsorizeSigma, paretoTopFraction,
  };
}

export function ForecastSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SettingsDraft | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['sellingview-forecast-settings'],
    queryFn: () => forecastApi.settings.get(),
    enabled: open,
  });

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const update = useMutation({
    mutationFn: forecastApi.settings.update,
    onSuccess: (saved) => {
      qc.setQueryData(['sellingview-forecast-settings'], saved);
      setForm(saved);
    },
  });

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const complete = form ? toSettings(form) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { if (open) setForm(null); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[4px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
      >
        <Settings2 size={12} />
        <span>Tahmin Ayarları</span>
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-30 w-[320px] rounded-[6px] border border-border-soft bg-card shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-border-soft">
            <span className="text-ui-xs font-bold text-fg">Tahmin Motoru Ayarları</span>
            {/* Panel kapatılınca taslak ATILIR — aksi halde tekrar açıldığında
                başka bir yerden değişmiş sunucu verisi yerine eski taslak görünürdü. */}
            <button type="button" onClick={() => { setOpen(false); setForm(null); }} className="text-fg-subtle hover:text-fg cursor-pointer">
              <X size={13} />
            </button>
          </div>

          {!form && <div className="p-3 text-ui-xs text-fg-subtle">Yükleniyor…</div>}

          {form && (
            <div className="p-2.5 flex flex-col gap-2 text-ui-xs">
              <Field label="Mevsim uzunluğu (gün)" hint="DEMO haftalık döngüde satar (7); moda işi 52, gıda 7 olabilir.">
                <input type="number" min={1} max={366} value={form.seasonLengthDay ?? ''}
                  onChange={(e) => set('seasonLengthDay', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Saat dilimi (UTC farkı)" hint="Türkiye +3. Gün sınırı bu değere göre kesilir.">
                <input type="number" min={-12} max={14} step={0.5} value={form.timezoneOffsetHours ?? ''}
                  onChange={(e) => set('timezoneOffsetHours', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Para birimi" hint="ISO 4217, 3 harf.">
                <input value={form.currency} maxLength={3}
                  onChange={(e) => set('currency', e.target.value.toUpperCase())} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Tatil takvimi ülkesi" hint="ISO 3166, 2 harf.">
                <input value={form.holidayCountry} maxLength={2}
                  onChange={(e) => set('holidayCountry', e.target.value.toUpperCase())} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <div className="pt-1.5 mt-1 border-t border-border-soft text-ui-2xs font-semibold text-fg-subtle uppercase tracking-wide">
                İleri düzey eşikler
              </div>
              <Field label="Aralıklı talep eşiği" hint="Kova başına ortalama sipariş bu sayının altındaysa seri seyrek sayılır.">
                <input type="number" min={0.01} step={0.1} value={form.sparseOrdersPerBucket ?? ''}
                  onChange={(e) => set('sparseOrdersPerBucket', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Durma çarpanı" hint="Ufkun kaç katı boşluktan sonra seri durdu sayılır.">
                <input type="number" min={1} value={form.dormantHorizonMultiple ?? ''}
                  onChange={(e) => set('dormantHorizonMultiple', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Winsorize eşiği (σ)" hint="Büyük tek siparişi kırpar.">
                <input type="number" min={0.1} step={0.1} value={form.winsorizeSigma ?? ''}
                  onChange={(e) => set('winsorizeSigma', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>
              <Field label="Pareto payı" hint="İlk %X SKU'nun ciro payı göstergesi (0-1).">
                <input type="number" min={0.01} max={1} step={0.01} value={form.paretoTopFraction ?? ''}
                  onChange={(e) => set('paretoTopFraction', parseNumber(e.target.value))} className="w-16 text-right text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg" />
              </Field>

              {update.isError && (
                <div className="text-ui-xs text-danger">
                  {(update.error as Error)?.message ?? 'Kaydedilemedi.'}
                </div>
              )}

              {!complete && (
                <div className="text-ui-xs text-danger">Boş alan bırakılamaz — değer girin.</div>
              )}

              <button
                type="button"
                disabled={update.isPending || !complete}
                onClick={() => complete && update.mutate(complete)}
                className="mt-1 self-end px-3 py-1.5 rounded-[4px] bg-fg text-bg text-ui-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {update.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2" title={hint}>
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}
