import { translationLanguageLabel } from './translationLanguages';

interface Props {
  text: string;
  language: string;
  align: 'start' | 'end';
}

// "Tüm sohbeti çevir" sonucu: balonun ALTINDA soluk, küçük çeviri kutusu ("Çeviri (Türkçe)").
export function TranscriptMessageTranslation({ text, language, align }: Props) {
  return (
    <div
      className={`flex max-w-full flex-col gap-0.5 rounded-md border border-border-soft bg-bg-subtle px-2.5 py-1.5 ${
        align === 'end' ? 'self-end text-right' : 'self-start'
      }`}
    >
      <span className="text-ui-2xs font-semibold text-fg-muted">{`Çeviri (${translationLanguageLabel(language)})`}</span>
      <p className="m-0 whitespace-pre-wrap break-words text-ui-sm italic text-fg-muted">{text}</p>
    </div>
  );
}
