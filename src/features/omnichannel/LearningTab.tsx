'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Check } from 'lucide-react';
import { omnichannelApi, HANDOFF_REASON_LABELS, type BotLearningReportDto } from '../../lib/api/omnichannel';
import { learningApi, type CorrectionReportDto, type LearningSuggestionsDto } from '../../lib/api/omnichannel-learning';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { LearningCard, LearningEmpty } from './LearningParts';
import { LearningQueue } from './LearningQueue';
import { CorrectionReportCard } from './CorrectionReportCard';
import { CORRECTION_REPORT_DAYS } from './correctionRules';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';
import { textareaClass } from './formClasses';

const REPORT_DAYS = 7;
// SSS başlığı sunucuda en fazla 128 karakter.
const FAQ_TITLE_MAX = 128;

// Öğrenme sekmesi.
//   • Öğrenme v2 (üstte): arka plan işinin önerileri — SSS taslakları ve sözlük önerileri onay
//     bekler; yüksek güvenli sözlük eşlemesini bot kendisi uygular ("Geri al" ile kaldırılır).
//   • Düzeltme raporu (P36): temsilcinin botu düzelttiği anlar ve haftalık hata kalıpları (salt okunur).
//   • Faz 12 raporu (altta): devir sebepleri, çözülemeyen sorular, tanınmayan kelimeler.
export function LearningTab() {
  const [report, setReport] = useState<BotLearningReportDto | null>(null);
  const [suggestions, setSuggestions] = useState<LearningSuggestionsDto | null>(null);
  const [corrections, setCorrections] = useState<CorrectionReportDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    // Biri başarısız olsa diğeri yine gösterilsin.
    const [reportResult, suggestionsResult, correctionsResult] = await Promise.allSettled([
      omnichannelApi.getLearningReport(REPORT_DAYS), learningApi.getSuggestions(),
      learningApi.getCorrections(CORRECTION_REPORT_DAYS),
    ]);
    if (reportResult.status === 'fulfilled') setReport(reportResult.value);
    if (suggestionsResult.status === 'fulfilled') setSuggestions(suggestionsResult.value);
    if (correctionsResult.status === 'fulfilled') setCorrections(correctionsResult.value);
    const failure = [reportResult, suggestionsResult, correctionsResult].find((r) => r.status === 'rejected');
    if (failure?.status === 'rejected') setError(describeError(failure.reason));
  }, []);

  const reload = useCallback(() => { void load(); }, [load]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-[var(--fg-muted)]" />
        <h2 className="text-sm font-bold text-[var(--fg)]">Bot öğrenme raporu — son {REPORT_DAYS} gün</h2>
      </div>
      {error && <div className="rounded-[4px] border border-[var(--border)] p-3 text-rose-500">{error}</div>}
      {suggestions && <LearningQueue data={suggestions} onChanged={reload} />}
      {corrections && <CorrectionReportCard report={corrections} />}
      {report && (
        <>
          <LearningCard title={`Neden devretti? (${report.handoffCount} devir)`}>
            {report.handoffReasons.length === 0 && <LearningEmpty text="Bu dönemde devir yok." />}
            {report.handoffReasons.map((r) => (
              <div key={r.reason} className="flex justify-between py-0.5">
                <span>{HANDOFF_REASON_LABELS[r.reason] ?? `Sebep ${r.reason}`}</span>
                <span className="font-mono">{r.count}</span>
              </div>
            ))}
          </LearningCard>

          <LearningCard title="Botun çözemediği sorular">
            {report.unansweredQuestions.length === 0 && <LearningEmpty text="Çözülemeyen soru yok." />}
            {report.unansweredQuestions.map((q) => (
              <UnansweredRow key={q.example} question={q.example} count={q.count} />
            ))}
          </LearningCard>

          <LearningCard title="Botun tanımadığı kelimeler">
            {report.unknownTerms.length === 0 && <LearningEmpty text="Tanınmayan kelime yok." />}
            {report.unknownTerms.map((t) => (
              <div key={t.term} className="flex justify-between gap-2 py-0.5">
                <span><strong>{t.term}</strong>{t.suggestedCorrections.length > 0 ? ` → ${t.suggestedCorrections.slice(0, 3).join(', ')}` : ''}</span>
                <span className="font-mono">{t.occurrences}</span>
              </div>
            ))}
            {report.unknownTerms.length > 0 && (
              <p className="mt-2 text-[11px] text-[var(--fg-muted)]">Eşlemek için Hesap geneli › Ürün sözlüğü bölümünü açın.</p>
            )}
          </LearningCard>
        </>
      )}
    </div>
  );
}

function UnansweredRow({ question, count }: { question: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answerSq, setAnswerSq] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();
  // SSS kaydı yalnız yönetici rollerinde (backend OmnichannelFaqController).
  const canAnswer = useIsOmnichannelAdmin();

  const save = async () => {
    // Çift tıklama iki SSS kaydı açmasın.
    if (saving) return;
    setSaving(true);
    try {
      await omnichannelApi.createFaqEntry({
        title: question.slice(0, FAQ_TITLE_MAX), triggers: question, answerTr: answer.trim(), answerEn: null,
        answerSq: answerSq.trim() || null,
      });
      setSaved(true);
      setOpen(false);
      notify.success('SSS eklendi; bot bu soruya artık bu cevabı verebilir.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-[var(--border-soft)] py-2 last:border-b-0 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[var(--fg)]">&ldquo;{question}&rdquo; <span className="text-[var(--fg-muted)]">× {count}</span></span>
        {saved && <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={12} /> Eklendi</span>}
        {!saved && canAnswer && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-[4px] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer">
            SSS olarak cevapla
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-1.5">
          <textarea
            rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Botun vereceği cevap"
            className={textareaClass}
          />
          <textarea
            rows={2} value={answerSq} onChange={(e) => setAnswerSq(e.target.value)}
            placeholder="Arnavutça cevap (Kosova) — isteğe bağlı" aria-label="Arnavutça cevap (Kosova)"
            className={textareaClass}
          />
          <button
            type="button" disabled={saving || answer.trim().length < 2} onClick={() => void save()}
            className="self-start inline-flex h-7 items-center rounded-[4px] bg-[var(--fg)] px-3 text-[11px] font-bold text-[var(--bg)] cursor-pointer disabled:opacity-40"
          >
            {saving ? 'Ekleniyor…' : 'Onayla ve ekle'}
          </button>
        </div>
      )}
    </div>
  );
}
