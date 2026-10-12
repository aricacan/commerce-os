'use client';

import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { EmptyState, ErrorState, SectionCard, formatNumber } from './shared';
import {
  useCreateErpisCompany, useDeleteErpisCompany, useErpisCompanies, useUpdateErpisCompany,
} from '@/hooks/erpis/useErpis';
import { trLower } from './erpisFilterUtils';

export function CompaniesTab() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const companies = useErpisCompanies();
  const createCompany = useCreateErpisCompany();
  const updateCompany = useUpdateErpisCompany();
  const deleteCompany = useDeleteErpisCompany();

  const [defaultId, setDefaultId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('erpis_default_company_id');
    return saved ? Number(saved) : null;
  });

  const activeDefaultId = defaultId ?? (companies.data?.find((c) => c.isActive && trLower(c.name).includes('levha'))?.id ?? null);

  function handleSetDefault(id: number) {
    setDefaultId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('erpis_default_company_id', String(id));
    }
  }

  async function handleCreate() {
    if (!name.trim() || !code.trim()) return;
    setError(null);
    try {
      await createCompany.mutateAsync({ name: name.trim(), code: code.trim() });
      setName('');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firma eklenemedi.');
    }
  }

  // Ad ya da kod değişikliğini kaydeder. Boş bırakılırsa ESKİSİ korunuyor: yanlışlıkla
  // temizlenen bir alan yüzünden firmanın adını kaybetmek, düzeltmesi en zor hatalardan.
  function rename(
    company: { id: number; name: string; code: string; billingEntityId: number | null; isActive: boolean; sortOrder: number },
    patch: { name?: string; code?: string },
  ) {
    const name = (patch.name ?? company.name).trim() || company.name;
    const code = (patch.code ?? company.code).trim() || company.code;

    if (name === company.name && code === company.code) return;

    updateCompany.mutate({
      id: company.id,
      body: {
        name,
        code,
        billingEntityId: company.billingEntityId,
        isActive: company.isActive,
        sortOrder: company.sortOrder,
      },
    });
  }

  async function handleDelete(id: number, companyName: string) {
    if (!window.confirm(`«${companyName}» silinecek. Devam edilsin mi?`)) return;
    setError(null);
    try {
      await deleteCompany.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firma silinemedi.');
    }
  }

  if (companies.error) {
    return <div className="p-4"><ErrorState text={companies.error instanceof Error ? companies.error.message : undefined} /></div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {error && <ErrorState text={error} />}

      <div data-tour="erpis-companies-form">
        <SectionCard title="Yeni Firma">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">Firma adı</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Demo Oto"
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              />
            </label>
            <label className="flex w-40 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">Kod</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DEMO"
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || !code.trim() || createCompany.isPending}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={1.8} />
              Ekle
            </button>
          </div>
        </SectionCard>
      </div>

      {(companies.data?.length ?? 0) === 0 && !companies.isLoading ? (
        <EmptyState title="Firma tanımlı değil" hint="Yükleme yapabilmek için en az bir firma gerekir." />
      ) : (
        <div data-tour="erpis-companies-list">
          <SectionCard title="Tanımlı Firmalar">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--fg)]">
                  <th className="px-2 py-1.5 text-left font-bold">Firma</th>
                  <th className="px-2 py-1.5 text-left font-bold">Kod</th>
                  <th className="px-2 py-1.5 text-center font-bold">Varsayılan</th>
                  <th className="px-2 py-1.5 text-right font-bold">Yükleme</th>
                  <th className="px-2 py-1.5 text-left font-bold">Durum</th>
                  <th className="px-2 py-1.5 text-right font-bold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {(companies.data ?? []).map((company) => (
                  <tr key={company.id} className="border-t border-[var(--border-soft)]">
                    {/* Ad ve kod YERİNDE düzenleniyor.
                        Firma bir kez kurulup unutulan bir kayıt değil: "Demo Oto"
                        adı "DEMO Merkez" olacak, kod da bizim için bir etiket. Ayrı bir
                        düzenleme ekranı, iki kelimelik bir değişiklik için fazla.
                        Odak çıkınca kaydediliyor; değişmediyse istek atılmıyor. */}
                    <td className="px-2 py-1.5">
                      <input
                        defaultValue={company.name}
                        aria-label="Firma adı"
                        onBlur={(e) => rename(company, { name: e.target.value })}
                        className="w-full min-w-[140px] rounded-[4px] border border-transparent bg-transparent px-1.5 py-1 font-semibold text-[var(--fg)] outline-none hover:border-[var(--border-soft)] focus:border-[var(--border)] focus:bg-[var(--bg)]"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        defaultValue={company.code}
                        aria-label="Firma kodu"
                        onBlur={(e) => rename(company, { code: e.target.value })}
                        className="w-[90px] rounded-[4px] border border-transparent bg-transparent px-1.5 py-1 font-mono text-[var(--fg-muted)] outline-none hover:border-[var(--border-soft)] focus:border-[var(--border)] focus:bg-[var(--bg)]"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleSetDefault(company.id)}
                        disabled={!company.isActive}
                        title={company.id === activeDefaultId ? 'Varsayılan firma' : 'Varsayılan yap'}
                        className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                          company.id === activeDefaultId
                            ? 'bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                            : 'border border-[var(--border-soft)] text-[var(--fg-muted)] hover:border-[var(--border)] hover:text-[var(--fg)]'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Star size={11} className={company.id === activeDefaultId ? 'fill-current' : ''} />
                        {company.id === activeDefaultId ? 'Varsayılan' : 'Varsayılan Yap'}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[var(--fg-muted)]">
                      {formatNumber(company.uploadCount)}
                    </td>
                    {/* DURUM BİR ROZET DEĞİL, ANAHTAR.
                        Önceden "Aktif" yazan bir düğme vardı ve tıklayınca pasife
                        düşürüyordu: etiket gibi görünen bir şeye tıklayan kullanıcı,
                        firmayı panolardan kaldırdığını fark etmiyordu (gerçekten oldu —
                        DEMO Levha bir gün kartlardan kayboldu). Artık onay soruyor ve ne
                        yapacağını yazıyor. */}
                    <td className="px-2 py-1.5">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={company.isActive}
                          onChange={(e) => {
                            const next = e.target.checked;

                            if (!next && !window.confirm(
                              `«${company.name}» pasife alınacak. Pasif firmalar panolarda ve `
                              + 'firma seçicilerinde görünmez. Devam edilsin mi?')) return;

                            updateCompany.mutate({
                              id: company.id,
                              body: {
                                name: company.name,
                                code: company.code,
                                billingEntityId: company.billingEntityId,
                                isActive: next,
                                sortOrder: company.sortOrder,
                              },
                            });
                          }}
                          className="h-3.5 w-3.5 accent-[var(--fg)]"
                        />
                        <span className="text-[11px] font-semibold text-[var(--fg-muted)]">
                          {company.isActive ? 'Aktif' : 'Pasif — panolarda görünmez'}
                        </span>
                      </label>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        aria-label="Firmayı sil"
                        onClick={() => void handleDelete(company.id, company.name)}
                        className="rounded-[4px] border border-[var(--border-soft)] p-1 text-[var(--fg-muted)]"
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        </div>
      )}
    </div>
  );
}
