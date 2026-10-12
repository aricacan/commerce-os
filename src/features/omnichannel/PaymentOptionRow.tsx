'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { PaymentOptionDto } from '../../lib/api/omnichannel';
import { maskIban, PAYMENT_METHOD_LABELS } from './paymentOptionDraft';

interface Props {
  option: PaymentOptionDto;
  // Satırın kapsamı (ör. "Tüm markalar", marka adı, kanal adı).
  scopeLabel: string;
  // Satırın yanındaki kısa uyarı (ör. "Sunulmaz: IBAN geçersiz").
  note?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const iconButtonClass =
  'flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]';

// Tek ödeme yöntemi satırı: kapsam, yöntem, (havalede) banka + gizli IBAN, (yönlendirmede) adres, aktif anahtarı.
export function PaymentOptionRow({ option, scopeLabel, note, onToggle, onEdit, onDelete }: Props) {
  const bankDetails = [option.bankName, option.accountHolder].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-bold text-[var(--fg)]">
          {PAYMENT_METHOD_LABELS[option.method]}
          <span className="font-normal text-[var(--fg-muted)]">{` · ${scopeLabel} · gösterilme sırası ${option.sortOrder}`}</span>
        </span>
        {note && <span className="text-[10.5px] text-amber-600">{note}</span>}
        {option.websiteUrl && (
          <span className="truncate text-[10.5px] text-[var(--fg-muted)]">{option.websiteUrl}</span>
        )}
        {option.iban && (
          <span className="text-[10.5px] text-[var(--fg-muted)]">
            <span className="font-mono">{maskIban(option.iban)}</span>
            {bankDetails && ` · ${bankDetails}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onToggle} title={option.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          className={`cursor-pointer rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
            option.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
          }`}>
          {option.isActive ? 'Aktif' : 'Pasif'}
        </button>
        <button type="button" title="Düzenle" onClick={onEdit} className={`${iconButtonClass} hover:text-[var(--fg)]`}>
          <Pencil size={12} />
        </button>
        <button type="button" title="Sil" onClick={onDelete} className={`${iconButtonClass} hover:text-rose-500`}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
