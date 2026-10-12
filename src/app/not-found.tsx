import Link from 'next/link';
import { Compass } from 'lucide-react';

// Kök 404. Root layout dışında bir sarmalayıcı yok, o yüzden kendi başına ortalanır
// ve kullanıcıyı bilinen tek güvenli yere — kontrol paneline — geri gönderir.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-subtle)]">
        <Compass size={26} className="text-[var(--fg-muted)]" />
      </span>

      <div className="flex max-w-sm flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-[var(--fg)]">Sayfa bulunamadı</h1>
        <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
          Aradığın sayfa taşınmış veya adres yanlış yazılmış olabilir.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-h)]"
      >
        Kontrol Paneline Dön
      </Link>
    </div>
  );
}
