'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { radarApi } from '../../../lib/api';
import { useRadarEmailTemplates } from '../../../hooks/radar/useRadarEmailTemplates';
import { useRadarSicCodes } from '../../../hooks/radar/useRadarSicCodes';
import type { RadarEmailTemplate } from '../../../types/api';
import { useFeedback } from '../../shared/Feedback';
import { FilterSelect } from '../../../components/ui/FilterSelect';

const PLACEHOLDER_LEGEND = ['{{CompanyName}}', '{{City}}', '{{District}}', '{{Website}}'];

interface FormState {
  templateType: 'Sequence' | 'Reply';
  stepNumber: string;
  sicCode: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  templateType: 'Sequence', stepNumber: '0', sicCode: '', name: '', subject: '', body: '', isActive: true,
};

export function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates, isLoading, isError } = useRadarEmailTemplates();
  const { data: sicCodes } = useRadarSicCodes();
  const { notify, confirm } = useFeedback();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RadarEmailTemplate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['radar-email-templates'] });
  }

  const createMut = useMutation({
    mutationFn: () => radarApi.emailTemplates.create({
      templateType: form.templateType,
      stepNumber: form.templateType === 'Sequence' ? Number(form.stepNumber) : null,
      sicCode: form.sicCode || null,
      name: form.name || null,
      subject: form.subject,
      body: form.body,
    }),
    onSuccess: () => { invalidate(); setShowForm(false); notify.success('Şablon eklendi.'); },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () => radarApi.emailTemplates.update(editing!.id, {
      sicCode: form.sicCode || null,
      name: form.name || null,
      subject: form.subject,
      body: form.body,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); setShowForm(false); notify.success('Şablon güncellendi.'); },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => radarApi.emailTemplates.delete(id),
    onSuccess: () => { invalidate(); notify.success('Şablon silindi.'); },
    onError: (err: Error) => notify.error(err.message),
  });

  function openCreateForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(t: RadarEmailTemplate) {
    setEditing(t);
    setForm({
      templateType: t.templateType,
      stepNumber: String(t.stepNumber ?? 0),
      sicCode: t.sicCode ?? '',
      name: t.name ?? '',
      subject: t.subject,
      body: t.body,
      isActive: t.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleDelete(t: RadarEmailTemplate) {
    const ok = await confirm({
      title: `"${t.name || t.subject}" şablonu silinsin mi?`,
      body: 'Bu e-posta şablonu kalıcı olarak silinecektir.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (ok) deleteMut.mutate(t.id);
  }

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Add Action */}
      <div data-tour="radar-templates-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">E-posta Şablonları</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Otomatik outreach sekansları ve manuel yanıtlar için hazır e-posta şablonları.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>Yeni Şablon</span>
        </button>
      </div>

      {/* Placeholders Legend */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--fg-muted)] font-mono">
        <span>Kullanılabilir Değişkenler:</span>
        {PLACEHOLDER_LEGEND.map((p) => (
          <span key={p} className="p-1 px-1.5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] text-[var(--fg)]">
            {p}
          </span>
        ))}
      </div>

      {/* Templates Grid */}
      <div data-tour="radar-templates-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && <div className="col-span-full py-8 text-center text-xs text-[var(--fg-muted)]">Şablonlar yükleniyor...</div>}
        {isError && <div className="col-span-full py-8 text-center text-xs text-rose-500">Şablonlar yüklenemedi.</div>}
        {!isLoading && !isError && (!templates || templates.length === 0) && (
          <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
            Henüz tanımlanmış bir e-posta şablonu bulunmuyor.
          </div>
        )}

        {templates?.map((t) => (
          <div
            key={t.id}
            className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--fg)]">{t.name || t.subject}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--fg-muted)]">
                      {t.templateType === 'Sequence' ? `Sekans Adım ${t.stepNumber ?? 0}` : 'Yanıt Şablonu'}
                    </span>
                  </div>
                  {t.sicCode && (
                    <div className="text-[10.5px] text-[var(--fg-muted)] font-mono mt-0.5">
                      SIC: {t.sicCode}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditForm(t)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                    title="Düzenle"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(t)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs font-semibold text-[var(--fg)]">
                Konu: {t.subject}
              </div>

              <div className="mt-1 text-[11px] text-[var(--fg-muted)] line-clamp-4 font-mono bg-[var(--bg-subtle)]/30 p-2 rounded-[3px] border border-[var(--border-soft)]">
                {t.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)] text-xs"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
              <span className="font-bold text-sm text-[var(--fg)]">
                {editing ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    Şablon Tipi
                  </label>
                  <FilterSelect
                    value={form.templateType}
                    onChange={(v) => setForm((p) => ({ ...p, templateType: v as 'Sequence' | 'Reply' }))}
                    placeholder="Tip Seç"
                    height="h-8"
                    options={[
                      { value: 'Sequence', label: 'Otomatik Sekans' },
                      { value: 'Reply', label: 'Manuel Yanıt' },
                    ]}
                  />
                </div>

                {form.templateType === 'Sequence' && (
                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                      Sekans Adımı
                    </label>
                    <FilterSelect
                      value={form.stepNumber}
                      onChange={(v) => setForm((p) => ({ ...p, stepNumber: v }))}
                      placeholder="Adım Seç"
                      height="h-8"
                      options={[
                        { value: '0', label: 'Adım 1 (İlk Mail)' },
                        { value: '1', label: 'Adım 2 (Takip Maili)' },
                        { value: '2', label: 'Adım 3 (Son Mail)' },
                      ]}
                    />
                  </div>
                )}

                {/* SIC kodu: form durumunda VAR, kayitta gonderiliyor, listede gosteriliyor
                    ama onu SECEBILECEK bir kontrol yoktu - sablon hicbir zaman bir sektore
                    baglanamiyordu. */}
                {sicCodes && sicCodes.length > 0 && (
                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                      SIC Kodu (opsiyonel)
                    </label>
                    <FilterSelect
                      value={form.sicCode}
                      onChange={(v) => setForm((p) => ({ ...p, sicCode: v }))}
                      placeholder="Tüm Sektörler"
                      height="h-8"
                      options={[
                        { value: '', label: 'Tüm Sektörler' },
                        ...sicCodes.map((c) => ({
                          value: c.code,
                          label: c.label ? `${c.code} — ${c.label}` : c.code,
                        })),
                      ]}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Şablon Başlığı / İsim *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Örn: UK Toptancı İlk Tanıtım E-postası"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  E-posta Konu Başlığı (Subject) *
                </label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="DEMO Auto Accessories / B2B Partnership for {{CompanyName}}"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  E-posta Metni (Body) *
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Hello {{CompanyName}} team, we are manufacturer of automotive accessories..."
                  rows={8}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)] leading-relaxed"
                />
              </div>

              {formError && (
                <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => (editing ? updateMut.mutate() : createMut.mutate())}
                disabled={!form.subject.trim() || !form.body.trim() || createMut.isPending || updateMut.isPending}
                className="h-8 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
              >
                {createMut.isPending || updateMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
