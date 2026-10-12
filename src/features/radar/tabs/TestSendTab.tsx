'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FlaskConical, Send, CheckCircle2, XCircle } from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { sanitizeEmailHtml } from '../../../lib/sanitize';
import { useRadarEmailTemplates } from '../../../hooks/radar/useRadarEmailTemplates';
import { FilterSelect } from '../../../components/ui/FilterSelect';

interface FormState {
  emailAccountId: string;
  templateId: string;
  testEmail: string;
  companyName: string;
  city: string;
  district: string;
  website: string;
}

const EMPTY_FORM: FormState = {
  emailAccountId: '', templateId: '', testEmail: '',
  companyName: 'Örnek Otomotiv Ltd.', city: 'Londra', district: '', website: 'https://ornek.co.uk',
};

export function TestSendTab() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<{ renderedSubject: string; renderedBody: string; sent: boolean; error?: string | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ['radar-email-accounts'],
    queryFn: () => radarApi.emailAccounts.list(),
    staleTime: 30_000,
  });
  const { data: templates } = useRadarEmailTemplates();

  const sendMut = useMutation({
    mutationFn: () => radarApi.testSend({
      emailAccountId: Number(form.emailAccountId),
      templateId: Number(form.templateId),
      testEmail: form.testEmail,
      companyName: form.companyName,
      city: form.city || undefined,
      district: form.district || undefined,
      website: form.website || undefined,
    }),
    onSuccess: (res) => setResult(res),
    onError: (err: Error) => setFormError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResult(null);

    if (!form.emailAccountId || !form.templateId || !form.testEmail || !form.companyName) {
      setFormError('Gönderici hesap, şablon, test e-postası ve şirket adı zorunludur.');
      return;
    }

    sendMut.mutate();
  }

  const accountOptions = [
    { value: '', label: 'Gönderici Hesap Seçin' },
    ...(accounts ?? []).map((a) => ({ value: String(a.id), label: a.emailAddress })),
  ];

  const templateOptions = [
    { value: '', label: 'Test Edilecek Şablon' },
    ...(templates ?? []).map((t) => ({ value: String(t.id), label: `${t.name || t.subject || 'Şablon'} (${t.templateType})` })),
  ];

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="radar-testsend-header">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Test / Sandbox E-posta Gönderimi</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Şablonları gerçek şirketlere dokunmadan, simüle edilen değişkenlerle kendi test adresinize göndererek doğrulayın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Test Form (6 Cols) */}
        <form data-tour="radar-testsend-form" onSubmit={handleSubmit} className="lg:col-span-6 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="border-b border-[var(--border-soft)] pb-2 font-bold text-xs text-[var(--fg)]">
            Test Parametreleri
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Gönderici E-posta *
              </label>
              <FilterSelect
                value={form.emailAccountId}
                onChange={(v) => setForm((p) => ({ ...p, emailAccountId: v }))}
                placeholder="Hesap Seç"
                height="h-8"
                options={accountOptions}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Şablon *
              </label>
              <FilterSelect
                value={form.templateId}
                onChange={(v) => setForm((p) => ({ ...p, templateId: v }))}
                placeholder="Şablon Seç"
                height="h-8"
                options={templateOptions}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Hedef Test E-posta Adresi *
            </label>
            <input
              type="email"
              value={form.testEmail}
              onChange={(e) => setForm((p) => ({ ...p, testEmail: e.target.value }))}
              placeholder="kendi-epostaniz@example.com"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-soft)]">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Örnek Şirket Adı ({'{{CompanyName}}'})
              </label>
              <input
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="Örnek Otomotiv Ltd."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                Örnek Şehir ({'{{City}}'})
              </label>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Londra"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>

          {formError && (
            <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">
              {formError}
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border-soft)] flex justify-end">
            <button
              type="submit"
              disabled={sendMut.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              <Send size={12} />
              <span>{sendMut.isPending ? 'Gönderiliyor...' : 'Test E-postasını Gönder'}</span>
            </button>
          </div>
        </form>

        {/* Test Result / Preview (6 Cols) */}
        <div className="lg:col-span-6 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="border-b border-[var(--border-soft)] pb-2 font-bold text-xs text-[var(--fg)]">
            Önizleme & Gönderim Durumu
          </div>

          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {result.sent ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <XCircle size={16} className="text-rose-500" />
                )}
                <span className="font-bold text-xs text-[var(--fg)]">
                  {result.sent ? 'Test e-postası başarıyla ulaştı.' : `Gönderim başarısız: ${result.error}`}
                </span>
              </div>

              <div className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] font-semibold text-xs text-[var(--fg)]">
                Konu: {result.renderedSubject}
              </div>

              <div
                className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] text-xs text-[var(--fg)] whitespace-pre-wrap leading-relaxed font-mono max-h-60 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(result.renderedBody) }}
              />
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
              Formu doldurup gönderdikten sonra derlenmiş e-posta metni ve teslim durumu burada görüntülenecektir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
