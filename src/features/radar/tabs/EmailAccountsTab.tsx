'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Pencil, Trash2, X } from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import type { RadarEmailAccount } from '../../../types/api';
import { ADMIN_ROLES } from '../shared';
import { useFeedback } from '../../shared/Feedback';

interface FormState {
  emailAddress: string;
  password: string;
  smtpServer: string;
  smtpPort: string;
  imapServer: string;
  imapPort: string;
  dailyLimit: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  emailAddress: '', password: '', smtpServer: '', smtpPort: '587',
  imapServer: '', imapPort: '993', dailyLimit: '50', isActive: true,
};

export function EmailAccountsTab() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = ADMIN_ROLES.some((r) => user?.roles?.includes(r));
  const { notify, confirm } = useFeedback();

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RadarEmailAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ['radar-email-accounts'],
    queryFn: () => radarApi.emailAccounts.list(),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: () => radarApi.emailAccounts.create({
      emailAddress: form.emailAddress,
      password: form.password,
      smtpServer: form.smtpServer,
      smtpPort: Number(form.smtpPort),
      imapServer: form.imapServer,
      imapPort: Number(form.imapPort),
      dailyLimit: Number(form.dailyLimit) || 50,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radar-email-accounts'] });
      setShowForm(false);
      notify.success('Hesap oluşturuldu.');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () => radarApi.emailAccounts.update(editingAccount!.id, {
      password: form.password || null,
      smtpServer: form.smtpServer,
      smtpPort: Number(form.smtpPort),
      imapServer: form.imapServer,
      imapPort: Number(form.imapPort),
      dailyLimit: Number(form.dailyLimit) || 50,
      isActive: form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radar-email-accounts'] });
      setShowForm(false);
      notify.success('Hesap güncellendi.');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => radarApi.emailAccounts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radar-email-accounts'] });
      notify.success('Hesap silindi.');
    },
    onError: (err: Error) => notify.error(err.message),
  });

  function openCreateForm() {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(acc: RadarEmailAccount) {
    setEditingAccount(acc);
    setForm({
      emailAddress: acc.emailAddress,
      password: '',
      smtpServer: acc.smtpServer,
      smtpPort: String(acc.smtpPort),
      imapServer: acc.imapServer,
      imapPort: String(acc.imapPort),
      dailyLimit: String(acc.dailyLimit),
      isActive: acc.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleDelete(acc: RadarEmailAccount) {
    const ok = await confirm({
      title: `"${acc.emailAddress}" hesabı silinsin mi?`,
      body: 'Bu e-posta hesabı kaldırılacaktır.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (ok) deleteMut.mutate(acc.id);
  }

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Add Action */}
      <div data-tour="radar-emailaccounts-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">E-posta & SMTP Gönderim Hesapları</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Otomatik outreach e-postalarının gönderildiği ve yanıtların toplandığı posta kutuları.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Yeni Hesap Ekle</span>
          </button>
        )}
      </div>

      {/* Accounts Grid */}
      <div data-tour="radar-emailaccounts-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && <div className="col-span-full py-8 text-center text-xs text-[var(--fg-muted)]">Hesaplar yükleniyor...</div>}
        {isError && <div className="col-span-full py-8 text-center text-xs text-rose-500">Hesaplar yüklenemedi.</div>}
        {!isLoading && !isError && (!accounts || accounts.length === 0) && (
          <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
            Henüz eklenmiş bir e-posta hesabı bulunmuyor.
          </div>
        )}

        {accounts?.map((acc) => (
          <div
            key={acc.id}
            className={`rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col justify-between gap-3 ${
              acc.isActive ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--fg)]">{acc.emailAddress}</span>
                    <span className={`h-2 w-2 rounded-full ${acc.isActive ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  </div>
                  <div className="text-[10.5px] text-[var(--fg-muted)] font-mono mt-0.5">
                    Günlük Limit: {acc.dailyLimit} e-posta
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditForm(acc)}
                      className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(acc)}
                      className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1 text-[10.5px] text-[var(--fg-muted)] font-mono border-t border-[var(--border-soft)] pt-2">
                <div>SMTP: {acc.smtpServer}:{acc.smtpPort}</div>
                <div>IMAP: {acc.imapServer}:{acc.imapPort}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
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
                {editingAccount ? 'E-posta Hesabını Düzenle' : 'Yeni E-posta Hesabı'}
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
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  E-posta Adresi *
                </label>
                <input
                  value={form.emailAddress}
                  disabled={editingAccount !== null}
                  onChange={(e) => setForm((p) => ({ ...p, emailAddress: e.target.value }))}
                  placeholder="outreach@demooto.com"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Şifre / Uygulama Şifresi {editingAccount && <span className="text-[var(--fg-muted)] font-normal">(Boş bırakılırsa korunur)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••••••"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    SMTP Sunucu *
                  </label>
                  <input
                    value={form.smtpServer}
                    onChange={(e) => setForm((p) => ({ ...p, smtpServer: e.target.value }))}
                    placeholder="smtp.zoho.eu"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    Port
                  </label>
                  <input
                    value={form.smtpPort}
                    onChange={(e) => setForm((p) => ({ ...p, smtpPort: e.target.value }))}
                    placeholder="587"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    IMAP Sunucu *
                  </label>
                  <input
                    value={form.imapServer}
                    onChange={(e) => setForm((p) => ({ ...p, imapServer: e.target.value }))}
                    placeholder="imap.zoho.eu"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    Port
                  </label>
                  <input
                    value={form.imapPort}
                    onChange={(e) => setForm((p) => ({ ...p, imapPort: e.target.value }))}
                    placeholder="993"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Günlük Gönderim Limiti
                </label>
                <input
                  type="number"
                  value={form.dailyLimit}
                  onChange={(e) => setForm((p) => ({ ...p, dailyLimit: e.target.value }))}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              {editingAccount && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded-[3px]"
                  />
                  <span>Hesap Aktif (Outreach gönderimlerine dahil et)</span>
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
                onClick={() => (editingAccount ? updateMut.mutate() : createMut.mutate())}
                disabled={createMut.isPending || updateMut.isPending}
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
