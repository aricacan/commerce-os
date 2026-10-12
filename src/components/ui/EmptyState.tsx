import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

// Boş durum kuralı: ASLA sadece "Veri yok" yazma. Kullanıcı buraya bir şey bulmayı
// umarak geldi; ona sıradaki adımı göster. Bu yüzden `action` güçlü biçimde teşvik edilir.
//
// İki farklı boşluk vardır, ikisini karıştırma:
//   • Hiç veri yok  → "Henüz sipariş yok"  + "ERP'yi senkronla"
//   • Filtre eledi  → "Eşleşen kayıt yok"  + "Filtreleri temizle"

type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  /** Neden boş olduğunu ve ne yapılacağını bir cümlede anlat. */
  description?: string;
  /** Birincil çıkış yolu. Vermezsen kullanıcı çıkmaza girer — güçlü sebebin yoksa ver. */
  action?: EmptyStateAction;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-subtle)]">
        <Icon size={22} className="text-[var(--fg-muted)]" />
      </span>

      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--fg)]">{title}</p>
        {description && (
          <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{description}</p>
        )}
      </div>

      {action && <EmptyStateButton action={action} />}
    </div>
  );
}

function EmptyStateButton({ action }: { action: EmptyStateAction }) {
  // Link gerçek bir <a> olmalı (yeni sekmede aç, tarayıcı geçmişi) — Button'a sarılamaz,
  // o yüzden bu tek durumda stil sınıfları elle eşleniyor.
  if (action.href) {
    return (
      <Link
        href={action.href}
        className="mt-1 inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-h)]"
      >
        {action.label}
      </Link>
    );
  }
  return (
    <Button onClick={action.onClick} size="sm" className="mt-1">
      {action.label}
    </Button>
  );
}
