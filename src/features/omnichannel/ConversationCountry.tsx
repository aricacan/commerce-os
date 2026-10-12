import { CountryFlag } from '../../components/ui/CountryFlag';

const FLAG_SIZE = 14;

// Küçük ülke etiketi: bayrak (biliniyorsa) + kod. Windows'ta bayrak emojisi harf göründüğü için SVG bayrak kullanılır.
// Kod yoksa (eski backend / kanalda ülke yok) hiçbir şey çizilmez.
export function ConversationCountry({ code }: { code: string | null | undefined }) {
  if (!code) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-ui-2xs font-semibold uppercase text-fg-muted" title={`Ülke: ${code}`}>
      <CountryFlag code={code} size={FLAG_SIZE} />
      {code}
    </span>
  );
}
