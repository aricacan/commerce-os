'use client';

import { Copy } from 'lucide-react';
import { useFeedback } from '../shared/Feedback';
import { ghostButtonClass } from './styles';

interface Props {
  code: string;
  onDismiss: () => void;
}

// Kart kodu yalnız oluşturma anında görünür (Shopify sonradan son 4 karakteri verir); kopyalanabilir ve kapatılana dek durur.
export function GiftCardCodeNotice({ code, onDismiss }: Props) {
  const { notify } = useFeedback();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      notify.success('Kart kodu kopyalandı.');
    } catch {
      notify.error('Kopyalanamadı; kodu elle seçip kopyalayın.');
    }
  };

  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-subtle px-3 py-2">
      <span className="text-ui-xs text-fg-muted">Kart kodu (bir daha gösterilmez):</span>
      <code className="break-all text-ui-sm font-bold text-fg">{code}</code>
      <button type="button" className={ghostButtonClass} onClick={() => void copy()}><Copy size={14} aria-hidden /> Kopyala</button>
      <button type="button" className={ghostButtonClass} onClick={onDismiss}>Kapat</button>
    </div>
  );
}
