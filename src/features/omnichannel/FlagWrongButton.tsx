import { Check, Flag } from 'lucide-react';

interface Props {
  flagged: boolean;
  onFlag: () => void;
}

// Bot balonunun altındaki küçük "Yanlış" düğmesi (P36): temsilci botun yanlış cevabını tek dokunuşla
// işaretler. Sessiz kalır (soluk, küçük); işaretlenince tekrar tıklanamaz.
export function FlagWrongButton({ flagged, onFlag }: Props) {
  if (flagged) {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 text-ui-xs text-[var(--fg-muted)]">
        <Check size={12} aria-hidden /> İşaretlendi
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onFlag}
      title="Bu bot cevabı yanlış — haftalık düzeltme raporuna ekle"
      className="inline-flex min-h-7 cursor-pointer items-center gap-1 text-ui-xs text-[var(--fg-muted)] hover:text-[var(--danger)]"
    >
      <Flag size={12} aria-hidden /> Yanlış
    </button>
  );
}
