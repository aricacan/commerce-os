'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, ListFilter } from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { useRadarSicCodes } from '../../../hooks/radar/useRadarSicCodes';
import type { RadarSicCode } from '../../../types/api';
import { useFeedback } from '../../shared/Feedback';
import { CountrySelect } from '../CountrySelect';

interface FormState {
  code: string;
  label: string;
  isActive: boolean;
  country: string;
}

const EMPTY_FORM: FormState = { code: '', label: '', isActive: true, country: 'GB' };

export function SettingsTab() {
  const qc = useQueryClient();
  const { data: codes, isLoading, isError } = useRadarSicCodes();
  const { notify, confirm } = useFeedback();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RadarSicCode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['radar-sic-codes'] });
  }

  const createMut = useMutation({
    mutationFn: () => radarApi.sicCodes.create({ code: form.code, label: form.label || undefined, country: form.country }),
    onSuccess: () => { invalidate(); setShowForm(false); notify.success('SIC kodu eklendi.'); },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () => radarApi.sicCodes.update(editing!.id, { label: form.label || undefined, isActive: form.isActive, country: form.country }),
    onSuccess: () => { invalidate(); setShowForm(false); notify.success('SIC kodu güncellendi.'); },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => radarApi.sicCodes.delete(id),
    onSuccess: () => { invalidate(); notify.success('SIC kodu silindi.'); },
    onError: (err: Error) => notify.error(err.message),
  });

  function openCreateForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(c: RadarSicCode) {
    setEditing(c);
    setForm({ code: c.code, label: c.label ?? '', isActive: c.isActive, country: c.country });
    setFormError(null);
    setShowForm(true);
  }

  async function handleDelete(c: RadarSicCode) {
    const ok = await confirm({
      title: `"${c.code}" SIC kodu silinsin mi?`,
      body: 'Feeder bu kodla artık şirket taramayacaktır.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (ok) deleteMut.mutate(c.id);
  }

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Add Action */}
      <div data-tour="radar-settings-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <ListFilter size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">SIC Sektör Kodları & Tarama Ayarları</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Otomatik pazar tarayıcısının (Feeder) hangi sektörlerde ve hangi ülkelerde şirket arayacağını yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>Yeni SIC Kodu Ekle</span>
        </button>
      </div>

      {/* SIC Codes Grid */}
      <div data-tour="radar-settings-table" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && <div className="col-span-full py-8 text-center text-xs text-[var(--fg-muted)]">SIC kodları yükleniyor...</div>}
        {isError && <div className="col-span-full py-8 text-center text-xs text-rose-500">SIC kodları yüklenemedi.</div>}
        {!isLoading && !isError && (!codes || codes.length === 0) && (
          <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
            Henüz tanımlanmış bir SIC kodu bulunmuyor.
          </div>
        )}

        {codes?.map((c) => (
          <div
            key={c.id}
            className={`rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col justify-between gap-3 ${
              c.isActive ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--fg)] font-mono">{c.code}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--fg-muted)]">
                      {c.country}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  </div>
                  <div className="text-[11px] text-[var(--fg-muted)] mt-1 font-semibold">
                    {c.label || 'Sektör etiketi yok'}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditForm(c)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                    title="Düzenle"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
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
            className="w-full max-w-md rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)] text-xs"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
              <span className="font-bold text-sm text-[var(--fg)]">
                {editing ? 'SIC Kodunu Düzenle' : 'Yeni SIC Kodu Ekle'}
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
                    SIC Kodu *
                  </label>
                  <input
                    value={form.code}
                    disabled={editing !== null}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="45310"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    Ülke
                  </label>
                  <CountrySelect
                    value={form.country}
                    onChange={(v) => setForm((p) => ({ ...p, country: v }))}
                    variant="form"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Sektör / Açıklama Etiketi
                </label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Wholesale of motor vehicle parts"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              {editing && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded-[3px]"
                  />
                  <span>Kod Aktif (Taramalara dahil et)</span>
                </label>
              )}

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
                disabled={!form.code.trim() || createMut.isPending || updateMut.isPending}
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
