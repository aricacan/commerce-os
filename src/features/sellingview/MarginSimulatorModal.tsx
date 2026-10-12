'use client';

import { useState } from 'react';
import { X, Calculator, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { TRY } from '../../components/analytics/terminal/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Trendyol %10', discount: 10 },
  { label: 'Sepette %15', discount: 15 },
  { label: 'Kuponlu %20', discount: 20 },
  { label: 'Stok Eritme %30', discount: 30 },
];

export function MarginSimulatorModal({ open, onClose }: Props) {
  const [price, setPrice] = useState<number>(500);
  const [margin, setMargin] = useState<number>(35);
  const [discount, setDiscount] = useState<number>(10);

  if (!open) return null;

  const validPrice = Math.max(1, price || 0);
  const validMargin = Math.min(99, Math.max(1, margin || 1));
  const validDiscount = Math.min(99, Math.max(0, discount || 0));

  const cost = validPrice * (1 - validMargin / 100);
  const currentProfit = validPrice - cost;

  const discountedPrice = validPrice * (1 - validDiscount / 100);
  const newProfit = discountedPrice - cost;
  const isLoss = newProfit <= 0;

  const requiredVolumeIncrease = !isLoss && validMargin > validDiscount
    ? (validDiscount / (validMargin - validDiscount)) * 100
    : 0;

  const profitDrop = currentProfit > 0
    ? ((currentProfit - Math.max(0, newProfit)) / currentProfit) * 100
    : 100;

  function getRiskLevel() {
    if (isLoss) {
      return {
        tone: 'bad',
        title: 'Zararına Satış!',
        desc: 'Planlanan indirim brüt marjı aşıyor. Satılan her birimde doğrudan zarar edersiniz.',
        icon: AlertCircle,
        class: 'bg-danger-soft text-danger border-danger/30',
      };
    }
    if (requiredVolumeIncrease > 50) {
      return {
        tone: 'bad',
        title: 'Yüksek Risk / Tehlikeli',
        desc: `Aynı brüt kârı yakalamak için sipariş hacminin %${requiredVolumeIncrease.toFixed(0)} artması gerekir. Talep elastikiyeti bu artışı karşılamazsa kârınız ciddi şekilde erir.`,
        icon: AlertTriangle,
        class: 'bg-danger-soft text-danger border-danger/30',
      };
    }
    if (requiredVolumeIncrease >= 20) {
      return {
        tone: 'warn',
        title: 'Orta Risk / Reklam Desteği Şart',
        desc: `Kârı korumak için sipariş adedinin %${requiredVolumeIncrease.toFixed(0)} artması gerekir. Kampanyanın pazaryeri algoritmasında üst sıralara çıkması elzemdir.`,
        icon: AlertTriangle,
        class: 'bg-warning-soft text-warning border-warning/30',
      };
    }
    return {
      tone: 'ok',
      title: 'Fizibl / Makul Kampanya',
      desc: `Satış hacminde %${requiredVolumeIncrease.toFixed(0)} oranında ılımlı bir artış mevcut kârı korumak için yeterlidir.`,
      icon: CheckCircle2,
      class: 'bg-success-soft text-success border-success/30',
    };
  }

  const risk = getRiskLevel();
  const RiskIcon = risk.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div
        className="w-full max-w-[560px] rounded-[8px] border border-border-soft bg-card shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft bg-bg-subtle">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-fg" />
            <div>
              <h3 className="text-ui-md font-bold text-fg leading-none">Marj & İndirim Başa-Baş Simülatörü</h3>
              <span className="text-ui-2xs text-fg-subtle">Kârınızı eritmeden kampanya kurgulayın</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-subtle hover:text-fg p-1 rounded cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Hızlı Kampanya Seçiciler */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-soft bg-bg-subtle/40">
          <span className="text-ui-2xs font-semibold text-fg-subtle">Hazır Şablonlar:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDiscount(p.discount)}
              className={`px-2 py-0.5 text-ui-2xs font-semibold rounded-[4px] border transition-colors cursor-pointer ${
                discount === p.discount
                  ? 'border-fg text-fg bg-bg-subtle'
                  : 'border-border-soft text-fg-muted hover:bg-bg-subtle'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Form Alanları */}
        <div className="p-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-3">
            {/* Satış Fiyatı */}
            <div className="flex flex-col gap-1">
              <label className="text-ui-xs font-semibold text-fg-subtle">Mevcut Fiyat (₺)</label>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="h-8 px-2 text-ui-sm font-bold rounded-[5px] border border-border-soft bg-bg-subtle text-fg outline-none focus:border-fg"
              />
            </div>

            {/* Brüt Marj */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-ui-xs font-semibold text-fg-subtle">Mevcut Marj</label>
                <span className="text-ui-xs font-bold tabular-nums text-fg">%{validMargin}</span>
              </div>
              <input
                type="range"
                min={5}
                max={80}
                value={validMargin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="accent-fg h-8 cursor-pointer"
              />
            </div>

            {/* İndirim Oranı */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-ui-xs font-semibold text-fg-subtle">Hedef İndirim</label>
                <span className="text-ui-xs font-bold tabular-nums text-danger">%{validDiscount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={validDiscount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="accent-danger h-8 cursor-pointer"
              />
            </div>
          </div>

          {/* Sonuç Kartları */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="flex flex-col p-2.5 rounded-[6px] border border-border-soft bg-bg-subtle">
              <span className="text-ui-2xs font-semibold text-fg-subtle uppercase">Yeni Fiyat</span>
              <span className="text-base font-extrabold text-fg tabular-nums pt-0.5">
                {TRY.format(discountedPrice)}
              </span>
              <span className="text-ui-2xs text-fg-muted">
                Birim maliyet: {TRY.format(cost)}
              </span>
            </div>

            <div className="flex flex-col p-2.5 rounded-[6px] border border-border-soft bg-bg-subtle">
              <span className="text-ui-2xs font-semibold text-fg-subtle uppercase">Yeni Birim Kâr</span>
              <span className={`text-base font-extrabold tabular-nums pt-0.5 ${isLoss ? 'text-danger' : 'text-fg'}`}>
                {TRY.format(Math.max(0, newProfit))}
              </span>
              <span className="text-ui-2xs text-danger">
                Kâr erimesi: -%{profitDrop.toFixed(0)}
              </span>
            </div>

            <div className="flex flex-col p-2.5 rounded-[6px] border border-border-soft bg-bg-subtle">
              <span className="text-ui-2xs font-semibold text-fg-subtle uppercase">Başa-Baş Hacim</span>
              <span className={`text-base font-extrabold tabular-nums pt-0.5 ${isLoss ? 'text-danger' : 'text-warning'}`}>
                {isLoss ? 'İmkânsız' : `+${requiredVolumeIncrease.toFixed(0)}%`}
              </span>
              <span className="text-ui-2xs text-fg-muted">
                Kârı korumak için gereken artış
              </span>
            </div>
          </div>

          {/* Risk Değerlendirme Banner'ı */}
          <div className={`flex items-start gap-2.5 p-3 rounded-[6px] border ${risk.class}`}>
            <RiskIcon size={16} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-ui-xs font-bold leading-none">{risk.title}</span>
              <span className="text-ui-xs leading-relaxed opacity-90">{risk.desc}</span>
            </div>
          </div>

          {/* Eğitim / Prensip Notu */}
          <div className="text-ui-2xs text-fg-subtle leading-relaxed border-t border-border-soft pt-2.5">
            <strong>E-Ticaret Başa-Baş Kuralı:</strong> Cironun artması toplam kârın arttığı anlamına gelmez.
            İndirim birim kâr marjını daralttığı için, aynı toplam kârı üretmek için gereken sipariş adedi katlanarak artar.
          </div>
        </div>

        {/* Kapat Butonu */}
        <div className="flex justify-end px-4 py-2.5 border-t border-border-soft bg-bg-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-ui-xs font-semibold rounded-[5px] bg-fg text-bg hover:opacity-90 cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
