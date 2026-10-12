import { Package } from 'lucide-react';
import type { CustomerInterestDto, InterestStatus } from '../../lib/api/customer-crm';
import { formatRelativeTime } from './relativeTime';
import { ToneBadge, tagClass } from './CustomerPanelParts';
import {
  INTEREST_STATUS_LABELS, INTEREST_STATUS_OPTIONS, formatInterestPrice, interestStatusLabel, interestStatusTone,
} from './customerInterestRules';

interface Props {
  interest: CustomerInterestDto;
  readOnly: boolean;
  onStatusChange: (status: InterestStatus) => void;
  onOpenConversation?: (conversationId: number) => void;
}

// Ürün adı (konuşmaya bağlıysa tıklanır), araç/SKU, son fiyat, kaç kez sorulduğu ve durum.
// Durum rozeti aynı zamanda seçicidir: temsilci tek tıkla "Kayıp"/"Sipariş verdi" işaretler.
export function CustomerInterestRow({ interest, readOnly, onStatusChange, onOpenConversation }: Props) {
  const price = formatInterestPrice(interest);
  const conversationId = interest.conversationId;
  const detail = [interest.vehicleText, interest.sku, interest.categoryName].filter(Boolean).join(' · ');

  return (
    <li className="flex items-start gap-2 text-xs">
      <Package size={13} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button type="button" disabled={conversationId === null || !onOpenConversation}
          onClick={() => conversationId !== null && onOpenConversation?.(conversationId)}
          className="truncate text-left font-semibold text-[var(--fg)] enabled:hover:underline" title={interest.productName}>
          {interest.productName}
        </button>
        {detail && <span className="truncate text-[10.5px] text-[var(--fg-muted)]">{detail}</span>}
        <span className="text-[10.5px] text-[var(--fg-muted)]">
          {interest.askCount > 1 ? `${interest.askCount} kez sordu` : 'Bir kez sordu'}
          {' · '}{formatRelativeTime(interest.lastAskedAt)}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusPicker status={interest.status} readOnly={readOnly} onChange={onStatusChange} />
        {price && <span className="font-mono text-[11px] text-[var(--fg)]">{price}</span>}
      </div>
    </li>
  );
}

function StatusPicker({ status, readOnly, onChange }: {
  status: InterestStatus;
  readOnly: boolean;
  onChange: (status: InterestStatus) => void;
}) {
  const tone = interestStatusTone(status);
  if (readOnly) return <ToneBadge tone={tone}>{interestStatusLabel(status)}</ToneBadge>;

  return (
    <select value={status} aria-label="İlgi durumu" title="Durumu değiştir"
      onChange={(e) => onChange(Number(e.target.value) as InterestStatus)}
      className={`h-5 cursor-pointer rounded-[3px] border-0 px-1 text-[10px] font-semibold outline-none ${tagClass(tone)}`}>
      {INTEREST_STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>{INTEREST_STATUS_LABELS[option]}</option>
      ))}
    </select>
  );
}
