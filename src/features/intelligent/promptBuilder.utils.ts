// Prompt Builder — form state'i backend'e (LLM'e) gönderilecek "etiket -> değer" alan
// haritasına çevirir. Gerçek prompt metni artık burada ham string-concat ile
// ÜRETİLMİYOR — backend (IntelligentPromptBuilderService) bu alanları bir dil modeline
// verip profesyonel, tek parça bir prompt üretiyor (bkz. intelligentApi.buildPrompt).

export type PromptType = 'image' | 'text';

export type ImageTool = 'Genel' | 'Midjourney' | 'DALL·E' | 'Stable Diffusion';
export type PromptLanguage = 'Türkçe' | 'English';

export interface PromptFormState {
  shortDescription: string;
  type: PromptType;

  // Görsel alanları
  style: string;
  subjectDetail: string;
  composition: string;
  lighting: string;
  colorMood: string;
  technicalDetails: string;
  referenceArtist: string;
  negativePrompt: string;
  aspectRatio: string;
  targetTool: ImageTool;

  // Metin alanları
  task: string;
  tone: string;
  audience: string;
  length: string;
  format: string;
  keyPoints: string;
  avoid: string;
  referenceStyle: string;
  extraInstructions: string;

  language: PromptLanguage;
}

export function createEmptyPromptForm(): PromptFormState {
  return {
    shortDescription: '',
    type: 'image',
    style: '',
    subjectDetail: '',
    composition: '',
    lighting: '',
    colorMood: '',
    technicalDetails: '',
    referenceArtist: '',
    negativePrompt: '',
    aspectRatio: '1:1',
    targetTool: 'Genel',
    task: '',
    tone: '',
    audience: '',
    length: '',
    format: '',
    keyPoints: '',
    avoid: '',
    referenceStyle: '',
    extraInstructions: '',
    language: 'Türkçe',
  };
}

const IMAGE_FIELD_LABELS: Array<[keyof PromptFormState, string]> = [
  ['subjectDetail', 'Konu detayı'],
  ['style', 'Stil'],
  ['composition', 'Kompozisyon/kadraj'],
  ['lighting', 'Işık'],
  ['colorMood', 'Renk paleti / ruh hali'],
  ['technicalDetails', 'Teknik detaylar'],
  ['referenceArtist', 'Referans sanatçı/stil'],
  ['negativePrompt', 'İstenmeyenler (negative prompt)'],
  ['aspectRatio', 'En-boy oranı'],
  ['targetTool', 'Hedef araç'],
];

const TEXT_FIELD_LABELS: Array<[keyof PromptFormState, string]> = [
  ['task', 'Görev'],
  ['tone', 'Ton'],
  ['audience', 'Hedef kitle'],
  ['length', 'Uzunluk'],
  ['format', 'Format/yapı'],
  ['keyPoints', 'Dahil edilmesi gereken noktalar'],
  ['avoid', 'Kaçınılması gerekenler'],
  ['referenceStyle', 'Referans stil'],
  ['extraInstructions', 'Ek talimatlar'],
];

export interface PromptBuilderFields {
  type: PromptType;
  shortDescription: string;
  fields: Record<string, string>;
}

// Boş olmayan alanları backend'e gönderilecek şekle çevirir — dil her zaman dahil edilir
// (backend'in prompt'u hangi dilde yazacağını bilmesi gerekir).
export function toPromptBuilderFields(form: PromptFormState): PromptBuilderFields {
  const labels = form.type === 'image' ? IMAGE_FIELD_LABELS : TEXT_FIELD_LABELS;
  const fields: Record<string, string> = {};

  for (const [key, label] of labels) {
    const value = String(form[key] ?? '').trim();
    if (value) fields[label] = value;
  }
  fields['Dil'] = form.language;

  return { type: form.type, shortDescription: form.shortDescription.trim(), fields };
}
