'use client';

import { useState } from 'react';
import { Wand2, Image as ImageIcon, Type, ArrowRight, ArrowLeft, Copy, Check, RotateCcw, Loader2 } from 'lucide-react';
import { intelligentApi } from '../../lib/api';
import { createEmptyPromptForm, toPromptBuilderFields, type PromptFormState, type PromptType } from './promptBuilder.utils';
import {
  palette, icon, btnPrimary, btnGhost, input as inputStyle, select as selectStyle,
  label as labelStyle, errorText,
} from '../shared/design';

type Step = 'intro' | 'details' | 'result';

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:2'];
const IMAGE_TOOLS = ['Genel', 'Midjourney', 'DALL·E', 'Stable Diffusion'] as const;
const LANGUAGES = ['Türkçe', 'English'] as const;

// Prompt Builder — 3 adımlı sihirbaz: (1) kısa açıklama + tür seçimi, (2) türe göre
// 10-12 detay parametresi, (3) oluşan prompt'u göster + kopyala. Backend'e (LLM) form
// parametreleri gönderilip AI-üretilmiş bir prompt geri alınır — bkz.
// promptBuilder.utils.ts (form -> alan haritası) ve intelligentApi.buildPrompt.
export function PromptBuilderPanel() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<PromptFormState>(createEmptyPromptForm());
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const set = <K extends keyof PromptFormState>(key: K, value: PromptFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectType = (type: PromptType) => {
    set('type', type);
    setStep('details');
  };

  const generate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await intelligentApi.buildPrompt(toPromptBuilderFields(form));
      setResult(res.prompt);
      setStep('result');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Prompt oluşturulamadı.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startOver = () => {
    setForm(createEmptyPromptForm());
    setResult('');
    setCopied(false);
    setStep('intro');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: palette.card }}>
      {/* Sihirbazın kaçıncı adımında olunduğu — modül/sekme adı kabukta zaten var. */}
      <div style={{
        padding: '12px 20px', borderBottom: `1px solid ${palette.borderFaint}`,
        display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
      }}>
        <Wand2 size={icon.lg} strokeWidth={icon.stroke} color={palette.accent} />
        <span style={{ fontSize: 12.5, color: palette.textMuted, fontWeight: 500 }}>
          {step === 'intro' ? 'Adım 1/3 — Ne için bir prompt?' : step === 'details' ? 'Adım 2/3 — Detaylar' : 'Adım 3/3 — Sonuç'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 60px', background: palette.bg }}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 'intro' && (
            <IntroStep form={form} set={set} onSelectType={selectType} />
          )}
          {step === 'details' && (
            <DetailsStep
              form={form}
              set={set}
              onBack={() => setStep('intro')}
              onGenerate={generate}
              generating={generating}
              generateError={generateError}
            />
          )}
          {step === 'result' && (
            <ResultStep result={result} copied={copied} onCopy={copy} onBack={() => setStep('details')} onStartOver={startOver} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes intelligent-sidebar-spin { to { transform: rotate(360deg); } }
        .pb-detail-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 560px) { .pb-detail-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function IntroStep({ form, set, onSelectType }: {
  form: PromptFormState;
  set: <K extends keyof PromptFormState>(key: K, value: PromptFormState[K]) => void;
  onSelectType: (type: PromptType) => void;
}) {
  return (
    <>
      <div>
        <div style={labelStyle}>Ne için bir prompt oluşturmak istiyorsun? (kısaca yaz)</div>
        <textarea
          value={form.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          placeholder="Ör: Yeni jant ürünümüz için sosyal medya görseli / Ör: Ürün açıklaması yazısı"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div>
        <div style={labelStyle}>Prompt türü</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TypeCard
            active={form.type === 'image'}
            Icon={ImageIcon}
            title="Görsel"
            subtitle="Midjourney, DALL·E, Stable Diffusion vb."
            onClick={() => onSelectType('image')}
          />
          <TypeCard
            active={form.type === 'text'}
            Icon={Type}
            title="Metin"
            subtitle="Makale, açıklama, e-posta, kod vb."
            onClick={() => onSelectType('text')}
          />
        </div>
      </div>
    </>
  );
}

function TypeCard({ active, Icon, title, subtitle, onClick }: {
  active: boolean; Icon: typeof ImageIcon; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
        padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        background: active ? palette.accentSoft : palette.card,
        border: `1px solid ${active ? palette.accentBorder : palette.border}`,
        transition: 'all 0.12s',
      }}
    >
      <Icon size={icon.xl} strokeWidth={icon.stroke} color={active ? palette.accent : palette.textMuted} />
      <div style={{ fontSize: 13, fontWeight: 700, color: palette.textStrong }}>{title}</div>
      <div style={{ fontSize: 11.5, color: palette.textMuted, lineHeight: 1.4 }}>{subtitle}</div>
    </button>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DetailsStep({ form, set, onBack, onGenerate, generating, generateError }: {
  form: PromptFormState;
  set: <K extends keyof PromptFormState>(key: K, value: PromptFormState[K]) => void;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
}) {
  return (
    <>
      {form.type === 'image' ? (
        <>
          <Field label="Konu detayı" value={form.subjectDetail} onChange={(v) => set('subjectDetail', v)} placeholder="Görselde tam olarak ne olsun, ne yapıyor olsun" textarea />
          <Field label="Stil" value={form.style} onChange={(v) => set('style', v)} placeholder="Fotogerçekçi, dijital illüstrasyon, anime, 3D render…" />
          <Field label="Kompozisyon / kadraj" value={form.composition} onChange={(v) => set('composition', v)} placeholder="Yakın çekim, geniş açı, üstten görünüm…" />
          <Field label="Işık" value={form.lighting} onChange={(v) => set('lighting', v)} placeholder="Doğal ışık, altın saat, stüdyo ışığı, dramatik…" />
          <Field label="Renk paleti / ruh hali" value={form.colorMood} onChange={(v) => set('colorMood', v)} placeholder="Canlı, pastel, karanlık, sıcak tonlar…" />
          <Field label="Teknik detaylar (opsiyonel)" value={form.technicalDetails} onChange={(v) => set('technicalDetails', v)} placeholder="35mm, bokeh, ultra detaylı, 8K…" />
          <Field label="Referans sanatçı/stil (opsiyonel)" value={form.referenceArtist} onChange={(v) => set('referenceArtist', v)} />
          <Field label="İstenmeyenler / negatif prompt (opsiyonel)" value={form.negativePrompt} onChange={(v) => set('negativePrompt', v)} textarea />
          <div className="pb-detail-grid" style={{ display: 'grid', gap: 12 }}>
            <SelectField label="En-boy oranı" value={form.aspectRatio} options={ASPECT_RATIOS} onChange={(v) => set('aspectRatio', v)} />
            <SelectField label="Hedef araç" value={form.targetTool} options={IMAGE_TOOLS} onChange={(v) => set('targetTool', v as PromptFormState['targetTool'])} />
          </div>
          <SelectField label="Dil" value={form.language} options={LANGUAGES} onChange={(v) => set('language', v as PromptFormState['language'])} />
        </>
      ) : (
        <>
          <Field label="Hedef görev" value={form.task} onChange={(v) => set('task', v)} placeholder="Makale, blog yazısı, ürün açıklaması, e-posta, kod, özet…" />
          <Field label="Ton" value={form.tone} onChange={(v) => set('tone', v)} placeholder="Resmi, samimi, esprili, ikna edici, teknik…" />
          <Field label="Hedef kitle" value={form.audience} onChange={(v) => set('audience', v)} placeholder="Ör: e-ticaret müşterileri, teknik ekip…" />
          <div className="pb-detail-grid" style={{ display: 'grid', gap: 12 }}>
            <Field label="Uzunluk" value={form.length} onChange={(v) => set('length', v)} placeholder="Kısa, orta, uzun, ~300 kelime…" />
            <Field label="Format / yapı" value={form.format} onChange={(v) => set('format', v)} placeholder="Madde madde, paragraf, tablo…" />
          </div>
          <Field label="Dahil edilmesi gereken anahtar noktalar" value={form.keyPoints} onChange={(v) => set('keyPoints', v)} textarea placeholder="Her satıra bir nokta yazabilirsin" />
          <Field label="Kaçınılması gerekenler (opsiyonel)" value={form.avoid} onChange={(v) => set('avoid', v)} />
          <Field label="Örnek/referans stil (opsiyonel)" value={form.referenceStyle} onChange={(v) => set('referenceStyle', v)} placeholder="Ör: Apple'ın pazarlama diline benzer" />
          <Field label="Ek talimatlar (opsiyonel)" value={form.extraInstructions} onChange={(v) => set('extraInstructions', v)} textarea />
          <SelectField label="Dil" value={form.language} options={LANGUAGES} onChange={(v) => set('language', v as PromptFormState['language'])} />
        </>
      )}

      {generateError && <div style={errorText}>{generateError}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button onClick={onBack} disabled={generating} style={btnGhost}>
          <ArrowLeft size={icon.md} strokeWidth={icon.stroke} /> Geri
        </button>
        <button onClick={onGenerate} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1 }}>
          {generating && <Loader2 size={icon.md} strokeWidth={icon.stroke} style={{ animation: 'intelligent-sidebar-spin 1s linear infinite' }} />}
          {generating ? 'Oluşturuluyor… (10-30 sn)' : 'Prompt Oluştur'}
          {!generating && <ArrowRight size={icon.md} strokeWidth={icon.stroke} />}
        </button>
      </div>
    </>
  );
}

function ResultStep({ result, copied, onCopy, onBack, onStartOver }: {
  result: string; copied: boolean; onCopy: () => void; onBack: () => void; onStartOver: () => void;
}) {
  return (
    <>
      <div>
        <div style={labelStyle}>Oluşan prompt</div>
        <textarea
          readOnly
          value={result}
          rows={14}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={btnGhost}>
          <ArrowLeft size={icon.md} strokeWidth={icon.stroke} /> Detayları Düzenle
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onStartOver} style={btnGhost}>
            <RotateCcw size={icon.md} strokeWidth={icon.stroke} /> Yeni Prompt
          </button>
          <button onClick={onCopy} style={btnPrimary}>
            {copied
              ? <Check size={icon.md} strokeWidth={icon.stroke} />
              : <Copy size={icon.md} strokeWidth={icon.stroke} />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      </div>
    </>
  );
}
