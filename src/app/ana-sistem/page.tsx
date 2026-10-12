'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { systemTenantsApi, type CreatedTenantAdmin, type TenantSummary } from '../../lib/api/system-tenants';
import { useAuthStore } from '../../stores/auth';
import { CategoryTemplatePicker } from '../../components/system/CategoryTemplatePicker';

// ANA SİSTEM paneli — kiracı üstü tek sayfa.
//
// Bilinçli olarak (app) rota grubunun DIŞINDA: kenar çubuğu, üst bar, mağaza seçici ve
// modül navigasyonu YOK. Sistem hesabının bir kiracı bağlamı yoktur; normal kabuğu
// göstermek yanlış bir zihinsel model kurardı.
//
// Kapsam sınırı: yalnızca kiracı listesi, sayaçlar ve kiracı açma. Kiracıların iş verisine
// erişim yoktur — backend tarafında da mümkün değildir (sistem hesabı "Ana Sistem"
// kiracısına bağlı ve global query filter ona iş tablolarında sıfır satır gösterir).
const SYSTEM_ADMIN_ROLE = 'SystemAdmin';

export default function SystemPage() {
  const router = useRouter();
  const { user, isLoading, initFromStorage, logout } = useAuthStore();

  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Yonetici acma: hangi kiraci icin form acik, ve tek seferlik uretilen sifre.
  const [adminForTenant, setAdminForTenant] = useState<TenantSummary | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [createdAdmin, setCreatedAdmin] = useState<CreatedTenantAdmin | null>(null);

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  // İstemci tarafı yönlendirme TEK BAŞINA güvenlik değildir — asıl kapı backend'deki
  // [Authorize(Roles=SystemAdmin)]. Buradaki kontrol yalnızca yanlış hesapla gelen birine
  // boş bir sayfa yerine doğru yeri göstermek için.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.roles?.includes(SYSTEM_ADMIN_ROLE)) router.replace('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    try {
      setError('');
      setTenants(await systemTenantsApi.list());
    } catch {
      setError('Kiracı listesi alınamadı.');
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user?.roles?.includes(SYSTEM_ADMIN_ROLE)) void load();
  }, [isLoading, user, load]);

  async function handleCreateAdmin(event: FormEvent) {
    event.preventDefault();
    if (!adminForTenant) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await systemTenantsApi.createAdmin(
        adminForTenant.id, adminEmail.trim(), adminFirstName.trim(), adminLastName.trim());
      // Sifre YALNIZCA burada gorunur; sunucuda hash'i saklaniyor, bir daha alinamaz.
      setCreatedAdmin(created);
      setAdminForTenant(null);
      setAdminEmail(''); setAdminFirstName(''); setAdminLastName('');
      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Yonetici olusturulamadi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await systemTenantsApi.create(code.trim(), name.trim(), templateKey);
      setCode('');
      setName('');
      setTemplateKey('');
      await load();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Kiracı oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !user?.roles?.includes(SYSTEM_ADMIN_ROLE)) {
    return <main className="min-h-screen grid place-items-center text-sm text-neutral-500">Yükleniyor…</main>;
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">

        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Ana Sistem
            </span>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Kiracılar
            </h1>
            <p className="text-sm text-neutral-500">
              {user.email} · kiracı verisine erişim yok, yalnızca sayaçlar
            </p>
          </div>
          <button
            type="button"
            onClick={() => { logout(); router.replace('/login'); }}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Çıkış
          </button>
        </header>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Yeni kiracı
          </h2>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Kod</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="bmw-group"
                required
                className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Ad</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="BMW Group"
                required
                className="w-72 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Kategori şablonu</span>
              <CategoryTemplatePicker value={templateKey} onChange={setTemplateKey} />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {submitting ? 'Açılıyor…' : 'Kiracı aç'}
            </button>
          </form>
          <p className="text-xs text-neutral-500">
            Kod yalnızca küçük harf, rakam ve tire içerebilir. Sonradan değiştirilemez. Şablon
            seçilirse kiracı açılır açılmaz kategori/kural ağacı otomatik kurulur.
          </p>
        </section>

        {createdAdmin && (
          <section className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Yönetici açıldı — şifre yalnızca bir kez gösterilir
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Bu şifre sunucuda saklanmıyor (yalnızca hash&apos;i tutuluyor). Şimdi parola
              yöneticinize kaydedin; kapatınca bir daha görüntülenemez.
            </p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-amber-800 dark:text-amber-300">E-posta</dt>
              <dd className="font-mono">{createdAdmin.email}</dd>
              <dt className="text-amber-800 dark:text-amber-300">Şifre</dt>
              <dd className="font-mono break-all select-all">{createdAdmin.password}</dd>
            </dl>
            <div>
              <button
                type="button"
                onClick={() => setCreatedAdmin(null)}
                className="mt-1 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-200 dark:text-amber-950"
              >
                Kaydettim, kapat
              </button>
            </div>
          </section>
        )}

        {adminForTenant && (
          <section className="flex flex-col gap-3 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {adminForTenant.name} · yönetici aç
            </h2>
            <form onSubmit={handleCreateAdmin} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500">E-posta</span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="yonetici@bmw-group.com"
                  required
                  className="w-72 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500">Ad</span>
                <input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500">Soyad</span>
                <input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {submitting ? 'Açılıyor…' : 'Yönetici aç'}
              </button>
              <button
                type="button"
                onClick={() => setAdminForTenant(null)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
              >
                Vazgeç
              </button>
            </form>
            <p className="text-xs text-neutral-500">
              Şifre otomatik üretilir ve yalnızca bir kez gösterilir. Hesap bu kiracının
              yöneticisi olur; ana sistem paneline erişemez.
            </p>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Mevcut kiracılar {tenants && `(${tenants.length})`}
          </h2>

          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium text-right">Mağaza</th>
                  <th className="px-4 py-3 font-medium text-right">ERP</th>
                  <th className="px-4 py-3 font-medium text-right">Pazaryeri</th>
                  <th className="px-4 py-3 font-medium text-right">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">Şablon</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {tenants === null && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-neutral-500">Yükleniyor…</td></tr>
                )}
                {tenants?.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-neutral-500">Henüz kiracı yok.</td></tr>
                )}
                {tenants?.map((tenant) => (
                  <tr key={tenant.id} className="bg-white dark:bg-neutral-950">
                    <td className="px-4 py-3 font-mono text-xs">{tenant.code}</td>
                    <td className="px-4 py-3">{tenant.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tenant.storeCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tenant.erpConnectionCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tenant.marketplaceConnectionCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tenant.userCount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {tenant.categoryTemplateKey ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={tenant.isActive ? 'text-emerald-600' : 'text-neutral-400'}>
                        {tenant.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => { setCreatedAdmin(null); setAdminForTenant(tenant); }}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      >
                        Yonetici ac
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
