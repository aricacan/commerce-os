import {
  LEXICON_KIND, LEXICON_SCOPE, LEXICON_SOURCE,
  type LexiconCandidateDto, type LexiconKind, type LexiconScope, type LexiconSource, type LexiconTermDto, type LexiconTermFields,
} from '../../lib/api/omnichannel-lexicon';

// Kalite Merkezi › Sözlük'ün (FAZ 6.4) saf kuralları: alt sekmeler, etiketler, form doğrulaması ve taslak ↔ gövde dönüşümü.
// Sınırlar backend'deki LexiconLimits ile birebir (sunucu yine doğrular).

export const LEXICON_TERM_MAX_WORDS = 4;
export const LEXICON_TERM_MAX_LENGTH = 64;
export const LEXICON_MEANING_MAX_LENGTH = 128;
export const LEXICON_MAKE_MAX_LENGTH = 64;

export const LEXICON_TABS = [
  { key: 'candidates', label: 'Adaylar' },
  { key: 'terms', label: 'Sözlük' },
] as const;

export type LexiconTabKey = (typeof LEXICON_TABS)[number]['key'];

export const KIND_OPTIONS: readonly { value: LexiconKind; label: string }[] = [
  { value: LEXICON_KIND.VehicleMake, label: 'Araç markası' },
  { value: LEXICON_KIND.VehicleModel, label: 'Araç modeli' },
  { value: LEXICON_KIND.Part, label: 'Parça' },
  { value: LEXICON_KIND.BodyType, label: 'Gövde tipi' },
  { value: LEXICON_KIND.Word, label: 'Kelime yazımı' },
];

export const SOURCE_OPTIONS: readonly { value: LexiconSource; label: string }[] = [
  { value: LEXICON_SOURCE.Seed, label: 'Hazır' },
  { value: LEXICON_SOURCE.Learned, label: 'Öğrenilmiş' },
  { value: LEXICON_SOURCE.Manual, label: 'Elle eklenen' },
];

export const SCOPE_OPTIONS: readonly { value: LexiconScope; label: string }[] = [
  { value: LEXICON_SCOPE.All, label: 'Ortak + hesabım' },
  { value: LEXICON_SCOPE.Global, label: 'Yalnız ortak' },
  { value: LEXICON_SCOPE.Tenant, label: 'Yalnız hesabım' },
];

export const LANGUAGE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Belirsiz' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'sq', label: 'Arnavutça' },
  { value: 'en', label: 'İngilizce' },
];

export const kindLabel = (kind: LexiconKind): string => KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Kelime yazımı';

export const sourceLabel = (source: LexiconSource): string => SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? 'Elle eklenen';

/** Tür seçimine bağlı alan: marka yalnız araç modelinde sorulur. */
export const needsMake = (kind: LexiconKind): boolean => kind === LEXICON_KIND.VehicleModel;

/** Ortak (tüm hesaplara açık) satırı yalnız platform yöneticisi değiştirir; hesap satırını her yönetici. */
export const canEditTerm = (term: Pick<LexiconTermDto, 'isGlobal'>, isSuperAdmin: boolean): boolean =>
  !term.isGlobal || isSuperAdmin;

/** "3 görülme · 2 düşük güven" — düşük güven yoksa yalnız görülme sayısı. */
export function candidateStats(candidate: Pick<LexiconCandidateDto, 'count' | 'lowConfidenceCount'>): string {
  const seen = `${candidate.count} görülme`;
  return candidate.lowConfidenceCount > 0 ? `${seen} · ${candidate.lowConfidenceCount} düşük güven` : seen;
}

// ── Form taslağı ───────────────────────────────────────────────────────────────

/** Form alanları metin tutar (boş = yok); gövdeye `toFields` ile çevrilir. */
export interface TermDraft {
  term: string;
  meaning: string;
  kind: LexiconKind;
  make: string;
  language: string;
}

export const EMPTY_DRAFT: TermDraft = { term: '', meaning: '', kind: LEXICON_KIND.Word, make: '', language: '' };

/** Onay formu önerilen anlamla önceden dolar; öneri yoksa boş başlar. */
export function draftFromCandidate(candidate: LexiconCandidateDto): TermDraft {
  return {
    term: candidate.token,
    meaning: candidate.suggestedMeaning ?? '',
    kind: candidate.suggestedKind ?? LEXICON_KIND.Word,
    make: candidate.suggestedMake ?? '',
    language: '',
  };
}

export function draftFromTerm(term: LexiconTermDto): TermDraft {
  return { term: term.term, meaning: term.meaning, kind: term.kind, make: term.make ?? '', language: term.language ?? '' };
}

/** Gövde: kırpılmış metinler, boşlar null; marka yalnız araç modelinde gider. */
export function toFields(draft: TermDraft): LexiconTermFields {
  const make = draft.make.trim();
  return {
    meaning: draft.meaning.trim(),
    kind: draft.kind,
    make: needsMake(draft.kind) && make ? make : null,
    language: draft.language || null,
  };
}

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Anlam, tür ve marka kuralları; terim de doğrulanacaksa `checkTerm` açılır (yeni terim formu). */
export function draftError(draft: TermDraft, checkTerm: boolean): string | null {
  if (checkTerm) {
    if (wordCount(draft.term) === 0) return 'Terimi yazın.';
    if (wordCount(draft.term) > LEXICON_TERM_MAX_WORDS) return `Terim en çok ${LEXICON_TERM_MAX_WORDS} kelime olabilir.`;
    if (draft.term.trim().length > LEXICON_TERM_MAX_LENGTH) return `Terim en çok ${LEXICON_TERM_MAX_LENGTH} karakter olabilir.`;
  }
  const meaning = draft.meaning.trim();
  if (!meaning) return 'Anlamı yazın.';
  if (meaning.length > LEXICON_MEANING_MAX_LENGTH) return `Anlam en çok ${LEXICON_MEANING_MAX_LENGTH} karakter olabilir.`;
  if (needsMake(draft.kind) && draft.make.trim().length > LEXICON_MAKE_MAX_LENGTH) {
    return `Marka en çok ${LEXICON_MAKE_MAX_LENGTH} karakter olabilir.`;
  }
  return null;
}
