'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, RotateCcw, Info, Bot } from 'lucide-react';
import { omnichannelApi, type BotSettingsDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { AiUsageCard } from './AiUsageCard';
import { BotPipelineDefaultsCard } from './BotPipelineDefaultsCard';
import { saveEditedSettings } from './botSettingsSave';

// Sunucudaki BotSettingsLimits ile aynı sınırlar (mesaj bekleme süresi, saniye).
const DEBOUNCE_LIMITS = { minQuiet: 3, maxQuiet: 30, maxTotal: 40 } as const;

const DEFAULTS: BotSettingsDto = {
  autoAnswerThreshold: 0.7,
  ambiguityThreshold: 0.4,
  ambiguityGap: 0.05,
  workingHoursStart: 7,
  workingHoursEnd: 17,
  maxConsecutiveReplies: 15,
  sessionGapDays: 7,
  debounceQuietSeconds: 10,
  debounceMaxSeconds: 20,
  sendProductPhoto: true,
  escalateWhenOutOfStock: true,
  showMenuOnFirstContact: true,
  enableAi: true,
  enableStock: true,
  enablePrice: true,
  enableShipping: true,
  enableFitment: true,
  enableOrders: false,
  enableBotReturn: true,
  enableFollowUps: false,
  followUpAutoSend: false,
  enableCrossSell: false,
  enableBankMatch: false,
  enableMediaUnderstanding: false,
  enableAgentConsult: false,
  photoMatchThreshold: 0.85,
  pilotMode: false,
};

export function BotSettingsTab() {
  const [settings, setSettings] = useState<BotSettingsDto | null>(null);
  // Sunucudan son okunan hâl: Kaydet yalnız bundan farklı alanları yazar (bkz. saveEditedSettings).
  const [original, setOriginal] = useState<BotSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await omnichannelApi.getBotSettings();
      setSettings(loaded);
      setOriginal(loaded);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!settings || !original) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveEditedSettings(original, settings);
      setSettings(saved);
      setOriginal(saved);
      notify.success('Ayarlar kaydedildi — değişiklik anında geçerli.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof BotSettingsDto>(key: K, value: BotSettingsDto[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  if (loading) {
    return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Ayarlar yükleniyor…</div>;
  }

  if (!settings) {
    return <div className="p-6 text-xs text-rose-500">{error ?? 'Ayarlar okunamadı.'}</div>;
  }

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Save Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Chatbot ve Otomasyon Ayarları</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Botun ne zaman doğrudan cevaplayacağını, ne zaman temsilciye devredeceğini belirleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettings(DEFAULTS)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Varsayılana dön</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            <Save size={13} />
            <span>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</span>
          </button>
        </div>
      </div>

      <BotPipelineDefaultsCard />
      <AiUsageCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Güven Eşikleri */}
        <div className="min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div>
            <h3 className="font-bold text-xs text-[var(--fg)]">AI Güven ve Doğruluk Eşikleri</h3>
            <p className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
              Yüksek değer = temkinli bot (daha çok temsilciye devir). Düşük değer = daha çok otomatik cevap.
              Tüm kanalların varsayılanıdır; Kanal Merkezi › Bot’ta “Bu kanala özel” yapılmış eşikler bu değişiklikten etkilenmez.
            </p>
          </div>

          <Slider
            label="Doğrudan cevaplama eşiği"
            hint="Bu skorun üstündeki eşleşmeleri bot kendi cevaplar."
            value={settings.autoAnswerThreshold}
            min={0.1} max={1} step={0.05}
            onChange={(v) => set('autoAnswerThreshold', v)}
          />

          <Slider
            label="Temsilciye devretme eşiği"
            hint="Bu skorun altındaki mesajlarda bot susar, temsilciye devreder."
            value={settings.ambiguityThreshold}
            min={0.1} max={0.9} step={0.05}
            onChange={(v) => set('ambiguityThreshold', v)}
          />

          <Slider
            label="Belirsizlik aralığı"
            hint='İki ürün bu kadar yakın skorluysa "Hangisi?" diye sorar.'
            value={settings.ambiguityGap}
            min={0.01} max={0.3} step={0.01}
            onChange={(v) => set('ambiguityGap', v)}
          />

          <div className="flex items-start gap-2 p-2 rounded-[3px] bg-[var(--bg-subtle)]/40 text-[10.5px] text-[var(--fg-muted)] border border-[var(--border-soft)]">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              3,285 gerçek ürün testinde doğru eşleşmeler <strong>0.83+</strong>, belirsizler ise <strong>0.30 altı</strong> olarak ölçülmüştür.
            </span>
          </div>
        </div>

        {/* Özellik Anahtarları */}
        <div className="min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div>
            <h3 className="font-bold text-xs text-[var(--fg)]">Özellik ve Niyet Anahtarları</h3>
            <p className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
              Botun hangi yeteneklerinin aktif olacağını tek tıkla belirleyin.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Toggle label="Yapay zekâ yönlendirmesi" hint="Kapalıysa AI gerektiren konuşmalar doğrudan temsilciye gider." checked={settings.enableAi} onChange={(v) => set('enableAi', v)} />
            <Toggle label="Stok sorguları" hint="Ürün stok aramasını ve adet bilgisini otomatik cevaplar." checked={settings.enableStock} onChange={(v) => set('enableStock', v)} />
            <Toggle label="Fiyat sorguları" hint="Güncel liste fiyatı ve KDV bilgisini verir." checked={settings.enablePrice} onChange={(v) => set('enablePrice', v)} />
            <Toggle label="Sipariş ve kargo takibi" hint="Takip veya sipariş numarasıyla canlı kargo durumunu söyler." checked={settings.enableShipping} onChange={(v) => set('enableShipping', v)} />
            <Toggle label="Araç uyumluluğu" hint="Marka, model, yıl ve kasa uyumluluk akışını yönetir." checked={settings.enableFitment} onChange={(v) => set('enableFitment', v)} />
            <Toggle label="Sohbetten sipariş" hint="Bot sipariş bilgisi toplar, onay alır; havale için Ödeme Yöntemleri'nde IBAN gerekir." checked={settings.enableOrders ?? false} onChange={(v) => set('enableOrders', v)} />
            <Toggle label="Devirden sonra bot geri dönsün" hint="Devredilmiş konuşmada müşteri sipariş/fiyat/stok/kargo gibi bir iş isterse ve temsilci 30 dk'dır yazmadıysa bot cevaplar. Temsilci botu elle kapattıysa dönmez; şikâyet ve iade/hasar/fatura konularında dönmez." checked={settings.enableBotReturn ?? true} onChange={(v) => set('enableBotReturn', v)} />
            <Toggle label="Takip ajanları" hint="Yarım kalan sipariş, onaysız sipariş, ödeme ve cevapsız devirler için takip görevleri açılır; ekip uyarıları çalışır. Müşteriye mesaj göndermez." checked={settings.enableFollowUps ?? false} onChange={(v) => set('enableFollowUps', v)} />
            <Toggle label="Takip mesajlarını otomatik gönder" hint="Açıkken bot müşteriye hatırlatma mesajını kendisi yollar (WhatsApp/Meta 24 saat penceresi içinde, gece 22:00–09:00 hariç, günde en fazla 1). Kapalıyken ya da pencere kapalıyken mesaj 'temsilci onayı bekliyor' olarak ekibe düşer." checked={settings.followUpAutoSend ?? false} disabled={!(settings.enableFollowUps ?? false)} onChange={(v) => set('followUpAutoSend', v)} />
            <Toggle label="Çapraz satış önerisi" hint="Sipariş özeti gösterilmeden önce, Çapraz Satış sayfasındaki kurallara göre aynı araç için tamamlayıcı ürün bir kez önerilir (hayır denirse tekrar sorulmaz)." checked={settings.enableCrossSell ?? false} onChange={(v) => set('enableCrossSell', v)} />
            <Toggle label="Havale otomatik eşleşme" hint="Banka Hareketleri sayfasına yüklenen dökümde açıklamasında sipariş numarası olan ve tutarı tam tutan havale, siparişi kendiliğinden ödendi yapar (geçmişe 'Sistem' olarak yazılır). Tutar farklıysa ödendi yapılmaz, temsilciye görev açılır. Kapalıyken eşleşmeler yalnız öneridir; ödendi işaretini temsilci onaylar." checked={settings.enableBankMatch ?? false} onChange={(v) => set('enableBankMatch', v)} />
            <Toggle label="Fotoğraftan ürün bulma" hint="Fotoğraf + 'a keni?' gibi mesajlarda görselle ürün bulur: eşleşme güvenliyse 'Bu ürün mü?' diye fiyat ve linkle sorar, değilse araç ve parça adını ister; görsel arama çalışmazsa konuşma temsilciye düşer. Sesli mesaj henüz desteklenmiyor." checked={settings.enableMediaUnderstanding ?? false} onChange={(v) => set('enableMediaUnderstanding', v)} />
            <div className="flex flex-col gap-1 pl-6">
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Fotoğraf eşleşme eşiği (0.50–0.99)</label>
              <input
                type="number" min={0.5} max={0.99} step={0.01}
                value={settings.photoMatchThreshold ?? DEFAULTS.photoMatchThreshold}
                onChange={(e) => set('photoMatchThreshold', Number(e.target.value))}
                className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
              <div className="text-[10px] text-[var(--fg-muted)]">
                Bu skor ve üstü güvenli eşleşme sayılır. Canlıda BotInteractionLog 'PhotoLookup' satırlarındaki Confidence değerlerine bakarak ayarlayın.
              </div>
            </div>
            <Toggle label="Pilot modu (onay taslağı)" hint="Bot cevapları müşteriye gitmeden önce panelde onay taslağı olarak bekler." checked={settings.pilotMode} onChange={(v) => set('pilotMode', v)} />
          </div>
        </div>

        {/* Mesai Saatleri */}
        <div className="min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div>
            <h3 className="font-bold text-xs text-[var(--fg)]">Mesai Saatleri</h3>
            <p className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
              Bot 7/24 çalışır; bu saatler yalnızca devir mesajının tonunu ayarlar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Başlangıç Saati (0-23)
              </label>
              <input
                type="number" min={0} max={23}
                value={settings.workingHoursStart}
                onChange={(e) => set('workingHoursStart', Number(e.target.value))}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Bitiş Saati (0-23)
              </label>
              <input
                type="number" min={0} max={23}
                value={settings.workingHoursEnd}
                onChange={(e) => set('workingHoursEnd', Number(e.target.value))}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>
        </div>

        {/* Davranış & Akış */}
        <div className="min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div>
            <h3 className="font-bold text-xs text-[var(--fg)]">Davranış Kuralları</h3>
            <p className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
              Botun görsel ve mesaj sıklığı davranışları.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Art arda azami bot mesajı
            </label>
            <input
              type="number" min={1} max={40}
              value={settings.maxConsecutiveReplies}
              onChange={(e) => set('maxConsecutiveReplies', Number(e.target.value))}
              className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
            <div className="text-[10px] text-[var(--fg-muted)] mt-1">
              Bu limit aşıldığında bot konuşmayı doğrudan insan temsilciye devreder.
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Yeni Oturum Aralığı (gün)
            </label>
            <input
              type="number" min={1} max={60}
              value={settings.sessionGapDays ?? DEFAULTS.sessionGapDays}
              onChange={(e) => set('sessionGapDays', Number(e.target.value))}
              className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
            <div className="text-[10px] text-[var(--fg-muted)] mt-1">
              Müşteri bu kadar gün yazmadıysa yeni konu sayılır: karşılama menüsü yeniden gelir. Daha kısa
              aralıkta bot kaldığı yerden devam eder, menüyü tekrar göstermez.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Mesaj bekleme (sn)
              </label>
              <input
                type="number" min={DEBOUNCE_LIMITS.minQuiet} max={DEBOUNCE_LIMITS.maxQuiet}
                value={settings.debounceQuietSeconds ?? DEFAULTS.debounceQuietSeconds}
                onChange={(e) => set('debounceQuietSeconds', Number(e.target.value))}
                className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                En fazla bekleme (sn)
              </label>
              <input
                type="number" min={DEBOUNCE_LIMITS.minQuiet} max={DEBOUNCE_LIMITS.maxTotal}
                value={settings.debounceMaxSeconds ?? DEFAULTS.debounceMaxSeconds}
                onChange={(e) => set('debounceMaxSeconds', Number(e.target.value))}
                className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
            <div className="col-span-2 text-[10px] text-[var(--fg-muted)]">
              Müşteri parça parça yazarken bot son mesajdan sonra bu kadar sessizlik bekler; ilk mesajdan itibaren
              en fazla ikinci süre kadar bekleyip hepsine tek cevap verir.
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
            <Toggle label="Stok cevabına ürün fotoğrafı ekle" hint="Müşteriye stok onaylanırken görsel de gönderilir." checked={settings.sendProductPhoto} onChange={(v) => set('sendProductPhoto', v)} />
            <Toggle label="Stok yoksa temsilciye devret" hint="Alternatif ürün önerisi için temsilciyi bilgilendirir." checked={settings.escalateWhenOutOfStock} onChange={(v) => set('escalateWhenOutOfStock', v)} />
            <Toggle label="İlk mesajda karşılama menüsü göster" hint="Müşterinin niyetini hızlı seçmesi için buton menü gönderir." checked={settings.showMenuOnFirstContact} onChange={(v) => set('showMenuOnFirstContact', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, hint, value, min, max, step, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--fg)]">{label}</span>
        <span className="font-mono font-bold text-[var(--fg)]">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--fg)] h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer"
      />
      <div className="text-[10.5px] text-[var(--fg-muted)]">{hint}</div>
    </div>
  );
}

function Toggle({
  label, hint, checked, onChange, disabled = false,
}: {
  label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex min-w-0 items-start gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded-[3px] mt-0.5"
      />
      <div className="min-w-0 break-words">
        <div className="font-semibold text-xs text-[var(--fg)] leading-tight">{label}</div>
        <div className="text-[10.5px] text-[var(--fg-muted)] leading-snug mt-0.5">{hint}</div>
      </div>
    </label>
  );
}
