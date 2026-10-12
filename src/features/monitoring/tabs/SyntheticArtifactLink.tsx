import { Image as ImageIcon } from 'lucide-react';

// Tarayıcı turunun ekran görüntüleri GitHub Actions artifact'ında (7 gün saklanır). Adres
// sunucuda doğrulanır (yalnız https://github.com/…); burada yalnız yeni sekmede açılır.
export function SyntheticArtifactLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-fit items-center gap-1 text-ui-2xs font-semibold text-[var(--fg-muted)] underline-offset-2 hover:text-[var(--fg)] hover:underline"
    >
      <ImageIcon size={11} />
      Ekran görüntüsü ve rapor (GitHub)
    </a>
  );
}
