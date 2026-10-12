'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, Globe, Mail, Plus, Pencil, Trash2, Building2, MapPin, Sparkles,
} from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { useRadarCompanies, useRadarCompanyDetail, useRadarCities, useRadarTags } from '../../../hooks/radar/useRadarCompanies';
import { useRadarSicCodes } from '../../../hooks/radar/useRadarSicCodes';
import { CountrySelect } from '../CountrySelect';
import type { RadarCompanyListItem, PaginatedResult } from '../../../types/api';
import { ADMIN_ROLES, fmt, UnsubscribedBadge, UNSUBSCRIBED_STATUS, STATUS_STYLES } from '../shared';
import { useFeedback } from '../../shared/Feedback';
import { FilterSelect } from '../../../components/ui/FilterSelect';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'Pending', label: 'Bekliyor' },
  { value: 'Replied', label: 'Cevap Aldı' },
  { value: 'Bounced', label: 'Başarısız' },
  { value: 'Completed', label: 'Tamamlandı' },
  { value: UNSUBSCRIBED_STATUS, label: STATUS_STYLES[UNSUBSCRIBED_STATUS].label },
];

const PAGE_SIZE = 30;

interface CompanyFormState {
  companyNumber: string;
  companyName: string;
  category: string;
  country: string;
  email: string;
  website: string;
  city: string;
  district: string;
  companySizeLabel: string;
  tags: string;
  isActive: boolean;
}

const EMPTY_COMPANY_FORM: CompanyFormState = {
  companyNumber: '', companyName: '', category: '', country: 'GB', email: '', website: '', city: '', district: '',
  companySizeLabel: '', tags: '', isActive: true,
};

export function CompaniesTab() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = ADMIN_ROLES.some((r) => user?.roles?.includes(r));
  const { notify, confirm } = useFeedback();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<RadarCompanyListItem | null>(null);
  const [form, setForm] = useState<CompanyFormState>(EMPTY_COMPANY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useRadarCompanies({
    page, pageSize: PAGE_SIZE,
    search: search || undefined, status: status || undefined,
    category: category || undefined, country: country || undefined, city: city || undefined,
    tag: tag || undefined,
  });
  const { data: detail } = useRadarCompanyDetail(selectedId);
  const { data: cities } = useRadarCities();
  const { data: tags } = useRadarTags();
  const { data: sicCodes } = useRadarSicCodes();

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  function invalidateCompanies() {
    qc.invalidateQueries({ queryKey: ['radar-companies'] });
    qc.invalidateQueries({ queryKey: ['radar-cities'] });
    qc.invalidateQueries({ queryKey: ['radar-tags'] });
  }

  const createMut = useMutation({
    mutationFn: () => radarApi.companies.create({
      companyNumber: form.companyNumber || undefined,
      companyName: form.companyName,
      category: form.category,
      country: form.country,
      email: form.email || null,
      website: form.website || null,
      city: form.city || null,
      district: form.district || null,
      companySizeLabel: form.companySizeLabel || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      invalidateCompanies();
      setShowForm(false);
      notify.success('Şirket eklendi.');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () => radarApi.companies.update(editingCompany!.id, {
      companyName: form.companyName,
      category: form.category,
      email: form.email || null,
      website: form.website || null,
      city: form.city || null,
      district: form.district || null,
      isActive: form.isActive,
      companySizeLabel: form.companySizeLabel || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      invalidateCompanies();
      setShowForm(false);
      notify.success('Şirket güncellendi.');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => radarApi.companies.delete(id),
    onSuccess: () => {
      invalidateCompanies();
      if (selectedId) setSelectedId(null);
      notify.success('Şirket silindi.');
    },
    onError: (err: Error) => notify.error(err.message),
  });

  const scoreLeadMut = useMutation({
    mutationFn: (id: number) => radarApi.companies.scoreLead(id),
    onSuccess: (result) => {
      qc.setQueriesData<PaginatedResult<RadarCompanyListItem>>(
        { queryKey: ['radar-companies'] },
        (old) => old && {
          ...old,
          items: old.items.map((c) =>
            c.id === result.companyId
              ? { ...c, leadScore: result.leadScore, leadCompanyType: result.leadCompanyType }
              : c
          ),
        }
      );
      notify.success('Lead skorlandı.');
    },
    onError: (err: Error) => notify.error(err.message || 'AI skorlama başarısız oldu.'),
  });

  function openCreateForm() {
    setEditingCompany(null);
    setForm(EMPTY_COMPANY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(c: RadarCompanyListItem) {
    setEditingCompany(c);
    setForm({
      companyNumber: c.companyNumber || '',
      companyName: c.companyName,
      category: c.category,
      country: c.country,
      email: c.email || '',
      website: c.website || '',
      city: c.city || '',
      district: c.district || '',
      companySizeLabel: c.companySizeLabel || '',
      tags: c.tags.join(', '),
      isActive: c.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleDelete(c: RadarCompanyListItem) {
    const ok = await confirm({
      title: `"${c.companyName}" silinsin mi?`,
      body: 'Bu şirket ve varsa iletişim geçmişi silinecektir.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (ok) deleteMut.mutate(c.id);
  }

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden text-xs">
      {/* Main Companies List (Left) */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[var(--border-soft)]">
        {/* Filters Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 flex flex-col gap-3 shrink-0">
          <div data-tour="radar-companies-header" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[var(--fg-muted)]" />
              <h2 className="text-sm font-bold text-[var(--fg)]">B2B Şirketler & Potansiyel Müşteriler</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--fg-muted)]">
                Toplam {data?.totalCount ? fmt(data.totalCount) : '0'} şirket
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex h-7.5 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-2.5 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Şirket Ekle</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Select Filters */}
          <div data-tour="radar-companies-filters" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Şirket adı veya e-posta ara..."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div className="w-36">
              <FilterSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                placeholder="Durum Filtresi"
                height="h-8"
                options={STATUS_OPTIONS}
              />
            </div>

            <div className="w-36">
              <CountrySelect
                value={country}
                onChange={(v) => { setCountry(v); setPage(1); }}
                className="w-full"
              />
            </div>

            {cities && cities.length > 0 && (
              <div className="w-36">
                <FilterSelect
                  value={city}
                  onChange={(v) => { setCity(v); setPage(1); }}
                  placeholder="Tüm Şehirler"
                  height="h-8"
                  options={[
                    { value: '', label: 'Tüm Şehirler' },
                    ...cities.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            )}

            {/* Kategori (SIC) ve etiket filtreleri: sorgu bu iki degeri ZATEN okuyordu ama
                onlari degistirecek hicbir kontrol yoktu - yani iki filtre kalici olarak
                bostu ve kullanici asla kullanamiyordu. */}
            {sicCodes && sicCodes.length > 0 && (
              <div className="w-40">
                <FilterSelect
                  value={category}
                  onChange={(v) => { setCategory(v); setPage(1); }}
                  placeholder="Tüm Kategoriler"
                  height="h-8"
                  options={[
                    { value: '', label: 'Tüm Kategoriler' },
                    ...sicCodes.map((s) => ({
                      value: s.code,
                      label: s.label ? `${s.code} — ${s.label}` : s.code,
                    })),
                  ]}
                />
              </div>
            )}

            {tags && tags.length > 0 && (
              <div className="w-36">
                <FilterSelect
                  value={tag}
                  onChange={(v) => { setTag(v); setPage(1); }}
                  placeholder="Tüm Etiketler"
                  height="h-8"
                  options={[
                    { value: '', label: 'Tüm Etiketler' },
                    ...tags.map((t) => ({ value: t, label: t })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div data-tour="radar-companies-list" className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {isLoading && <div className="py-12 text-center text-xs text-[var(--fg-muted)]">Şirketler yükleniyor...</div>}
          {isError && <div className="py-12 text-center text-xs text-rose-500">Şirket listesi yüklenemedi.</div>}
          {!isLoading && !isError && (!data?.items || data.items.length === 0) && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
              Filtrelere uygun şirket bulunamadı.
            </div>
          )}

          {data?.items.map((company) => {
            const active = company.id === selectedId;
            return (
              <div
                key={company.id}
                onClick={() => setSelectedId(company.id)}
                className={`p-3 rounded-[4px] border cursor-pointer transition flex flex-col gap-1.5 ${
                  active
                    ? 'border-[var(--fg)] bg-[var(--bg-subtle)] shadow-xs'
                    : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--fg)]">{company.companyName}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]">
                      {company.country}
                    </span>
                    {company.leadScore != null && (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {company.leadScore}/100
                      </span>
                    )}
                    <UnsubscribedBadge status={company.status} />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEditForm(company); }}
                          className="h-6 w-6 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          title="Düzenle"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(company); }}
                          className="h-6 w-6 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10.5px] text-[var(--fg-muted)] font-mono flex-wrap">
                  {company.category && <span>SIC: {company.category}</span>}
                  {company.city && <span>{company.city}</span>}
                  {company.email && (
                    <span className="text-[var(--fg)] flex items-center gap-1">
                      <Mail size={11} /> {company.email}
                    </span>
                  )}
                  {company.website && (
                    <span className="flex items-center gap-1">
                      <Globe size={11} /> {company.website.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 px-5 border-t border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[var(--fg-muted)] font-mono">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Company Detail Drawer (Right) */}
      {selectedId !== null && (
        <aside className="w-96 shrink-0 flex flex-col h-full bg-[var(--card)] border-l border-[var(--border-soft)] text-xs">
          <div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 shrink-0">
            <span className="font-bold text-xs text-[var(--fg)]">Şirket Detayları</span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {detail ? (
              <>
                <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--fg)]">{detail.companyName}</span>
                    <div className="flex items-center gap-1">
                      <UnsubscribedBadge status={detail.status} />
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg)] border border-[var(--border)]">
                        {detail.country}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-[var(--fg-muted)] font-mono">
                    {detail.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="shrink-0" />
                        <span className="text-[var(--fg)]">{detail.email}</span>
                      </div>
                    )}
                    {detail.website && (
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} className="shrink-0" />
                        <a href={detail.website.startsWith('http') ? detail.website : `https://${detail.website}`} target="_blank" rel="noreferrer" className="text-[var(--fg)] hover:underline">
                          {detail.website}
                        </a>
                      </div>
                    )}
                    {detail.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="shrink-0" />
                        <span>{detail.city}{detail.district ? `, ${detail.district}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Lead Scoring Action */}
                <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--fg)]">AI Lead Skoru</span>
                    {detail.leadScore != null && (
                      <span className="font-mono font-bold text-emerald-500">{detail.leadScore}/100</span>
                    )}
                  </div>

                  {detail.leadCompanyType && (
                    <p className="text-[11px] text-[var(--fg-muted)]">Tip: {detail.leadCompanyType}</p>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => scoreLeadMut.mutate(detail.id)}
                      disabled={scoreLeadMut.isPending}
                      className="w-full inline-flex h-7.5 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles size={12} className={scoreLeadMut.isPending ? 'animate-spin' : ''} />
                      <span>{scoreLeadMut.isPending ? 'Skorlanıyor...' : 'AI ile Skorla'}</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor...</div>
            )}
          </div>
        </aside>
      )}

      {/* Create / Edit Company Modal */}
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
                {editingCompany ? 'Şirketi Düzenle' : 'Yeni Şirket Ekle'}
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
                  Şirket Adı *
                </label>
                <input
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Örn: Auto Parts London Ltd"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                    Kategori / SIC
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="45310"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
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
                  E-posta
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="info@autoparts.co.uk"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Web Sitesi
                </label>
                <input
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="www.autoparts.co.uk"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
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
                onClick={() => (editingCompany ? updateMut.mutate() : createMut.mutate())}
                disabled={!form.companyName.trim() || createMut.isPending || updateMut.isPending}
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
