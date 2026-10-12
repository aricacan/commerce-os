import { Award, Check } from 'lucide-react';

interface Props {
  added: boolean;
  onAdd: () => void;
}

// Temsilci balonunun altındaki küçük "Senaryoya ekle" düğmesi (P35, Kalite Merkezi): bu cevap doğru sayılır ve deploy
// öncesi botun cevabıyla kıyaslanır. Sessiz kalır (soluk, küçük); eklenince tekrar tıklanamaz.
export function AddToGoldButton({ added, onAdd }: Props) {
  if (added) {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 text-ui-xs text-[var(--fg-muted)]">
        <Check size={12} aria-hidden /> Senaryoda
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      title="Bu cevap doğru — Kalite Merkezi senaryolarına ekle (kişisel veri maskelenir)"
      className="inline-flex min-h-7 cursor-pointer items-center gap-1 text-ui-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
    >
      <Award size={12} aria-hidden /> Senaryoya ekle
    </button>
  );
}
