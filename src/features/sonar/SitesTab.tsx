'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from 'react';
import { KeyRound, Plus, RefreshCcw, RefreshCw, Radar, Trash2 } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarSites,
  sonarSync,
  type CatalogSyncResult,
  type CreateSupplierSiteBody,
  type LoginTestResult,
  type SiteHealthState,
  type SupplierSiteDto,
} from '../../lib/api/sonar';
import {
  Badge, Button, Card, Empty, ErrorNote, Page, PageHeader,
  SITE_HEALTH, formatRelative,
} from './shared';
import { DiscoveryPanel } from './DiscoveryPanel';

export function SitesTab() {
  const [sites, setSites] = useState<SupplierSiteDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSites(await sonarSites.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Siteler yüklenemedi.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (site: SupplierSiteDto) => {
    if (!confirm(`'${site.displayName}' silinsin mi? Çekilmiş katalog da silinir.`)) return;
    try {
      await sonarSites.remove(site.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site silinemedi.');
    }
  };

  return (
    <Page>
      <PageHeader
        dataTour="sonar-sites-header"
        title="Tedarikçi Siteleri"
        description="Her site bir kayıttır; davranışı keşifle öğrenilir. Yeni site eklemek kod değişikliği gerektirmez."
        actions={
          <div data-tour="sonar-sites-actions" className="flex items-center gap-2">
            <Button onClick={() => void load()}>
              <RefreshCw size={13} /> Yenile
            </Button>
            <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={13} /> Site ekle
            </Button>
          </div>
        }
      />

      {error && <ErrorNote message={error} />}

      <AttentionBanner sites={sites ?? []} />

      {showForm && (
        <NewSiteForm
          onCancel={() => setShowForm(false)}
          onCreated={async () => { setShowForm(false); await load(); }}
        />
      )}

      {sites === null && (
        <div className="py-8 text-center text-sm" style={{ color: palette.textMuted }}>
          Yükleniyor…
        </div>
      )}

      {sites?.length === 0 && (
        <Empty
          title="Henüz tedarikçi sitesi yok"
          hint="Bir B2B site adresi ve bayi giriş bilgilerinizi ekleyin. Sistem siteyi kendi öğrenecek."
        />
      )}

      {sites && sites.length > 0 && (
        <div className="flex flex-col gap-2" data-tour="sonar-sites-list">
          {sites.map((site) => (
            <SiteRow
              key={site.id}
              site={site}
              onRemove={() => void remove(site)}
              onDiscovered={() => void load()}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

/** İnsan müdahalesi bekleyen durumlar. Sırası önem sırasıdır. */
const NEEDS_ATTENTION: readonly SiteHealthState[] = ['NeedsHuman', 'Quarantined', 'Suspect'];

/**
 * Dikkat isteyen siteleri EN ÜSTE taşır.
 *
 * Sapma metrikleri (seçici sıçraması, boş alan oranı) hesaplanıyordu ama
 * hiçbir yere yazılmıyordu; yani kimse göremiyordu. Görünmeyen uyarı, uyarı
 * değildir: site sessizce bozulur, gece boyunca güvenilmez veri toplanır ve
 * bu ancak birileri fiyatın yanlış olduğunu fark edince anlaşılır.
 */
function AttentionBanner({ sites }: { sites: SupplierSiteDto[] }) {
  const needy = sites
    .filter((site) => NEEDS_ATTENTION.includes(site.healthState))
    .sort((a, b) =>
      NEEDS_ATTENTION.indexOf(a.healthState) - NEEDS_ATTENTION.indexOf(b.healthState));

  if (needy.length === 0) return null;

  return (
    <div
      data-tour="sonar-sites-attention"
      className="flex flex-col gap-2 rounded-lg p-3"
      style={{ background: palette.warningSoft, border: `1px solid ${palette.warning}` }}
    >
      <span className="text-sm font-medium" style={{ color: palette.textStrong }}>
        {needy.length} site inceleme bekliyor
      </span>

      {needy.map((site) => (
        <div key={site.id} className="flex flex-wrap items-baseline gap-2 text-xs">
          <Badge tone={SITE_HEALTH[site.healthState].tone}>
            {SITE_HEALTH[site.healthState].label}
          </Badge>
          <span style={{ color: palette.textStrong }}>{site.displayName}</span>
          <span style={{ color: palette.textMuted }}>
            {site.healthReason ?? 'Sebep kaydedilmemiş; yeniden keşif gerekiyor.'}
          </span>
          {site.healthChangedAt && (
            <span style={{ color: palette.textFaint }}>
              ({formatRelative(site.healthChangedAt)})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SiteRow({ site, onRemove, onDiscovered }: {
  site: SupplierSiteDto;
  onRemove: () => void;
  onDiscovered: () => void;
}) {
  const health = SITE_HEALTH[site.healthState];
  const inCooldown = site.cooldownUntil !== null && new Date(site.cooldownUntil) > new Date();
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<CatalogSyncResult | null>(null);
  const [loginTesting, setLoginTesting] = useState(false);
  const [loginTest, setLoginTest] = useState<LoginTestResult | string | null>(null);

  /**
   * Yalnız girişi dener.
   *
   * Keşif 5-15 dakika sürer ve ilk adımı olan giriş en sık başarısız olandır.
   * Kimlik bilgisi yanlışsa kullanıcının bunu o kadar bekleyerek öğrenmesi,
   * her denemeyi bir cezaya çevirir.
   */
  const runLoginTest = async () => {
    setLoginTesting(true);
    setLoginTest(null);
    try {
      setLoginTest(await sonarSites.testLogin(site.id));
    } catch (err) {
      setLoginTest(err instanceof Error ? err.message : 'Giriş testi başarısız.');
    } finally {
      setLoginTesting(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      setSyncResult(await sonarSync.run(site.id));
    } catch (err) {
      setSyncResult({
        siteId: site.id,
        siteName: site.displayName,
        checked: 0,
        priceChanged: 0,
        wentOutOfStock: 0,
        backInStock: 0,
        unverifiable: 0,
        changes: [],
        stoppedReason: err instanceof Error ? err.message : 'Tazeleme başarısız.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium" style={{ color: palette.textStrong }}>
              {site.displayName}
            </span>
            <Badge tone={health.tone}>{health.label}</Badge>
            {!site.isEnabled && <Badge tone="neutral">Devre dışı</Badge>}
            {inCooldown && <Badge tone="warn">Soğumada</Badge>}
            {!site.hasCredentials && <Badge tone="danger">Kimlik bilgisi yok</Badge>}
          </div>

          <div className="mt-1 truncate text-xs" style={{ color: palette.textMuted }}>
            {site.baseUrl}
          </div>

          <div
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
            style={{ color: palette.textFaint }}
          >
            <span>
              Profil:{' '}
              {site.activeProfileRevision !== null
                ? `sürüm ${site.activeProfileRevision}`
                : 'yok'}
            </span>
            <span>Son doğrulama: {formatRelative(site.lastVerifiedAt)}</span>
            <span>Hız: saatte {site.requestsPerHour} istek</span>
            <span>
              Gecikme: {site.delayMinMs}–{site.delayMaxMs} ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={runLoginTest}
            disabled={!site.hasCredentials || loginTesting}
            title="Sadece giriş yapmayı dener; keşif başlatmaz."
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            style={{ border: `1px solid ${palette.border}`, color: palette.text }}
          >
            <KeyRound size={14} />
            {loginTesting ? 'Deneniyor…' : 'Giriş testi'}
          </button>
          <button
            type="button"
            onClick={() => setShowDiscovery((v) => !v)}
            disabled={!site.hasCredentials}
            title={site.hasCredentials ? undefined : 'Önce bayi giriş bilgilerini ekleyin.'}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            style={{ border: `1px solid ${palette.border}`, color: palette.text }}
          >
            <Radar size={14} />
            {site.activeProfileRevision !== null ? 'Yeniden keşfet' : 'Keşfet'}
          </button>

          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing || site.activeProfileRevision === null}
            title={site.activeProfileRevision === null
              ? 'Önce keşif yapın; doğrulanmış profil olmadan tazeleme yapılmaz.'
              : 'En bayat numaraları yeniden ara'}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            style={{ border: `1px solid ${palette.border}`, color: palette.text }}
          >
            <RefreshCcw size={14} /> {syncing ? 'Tazeleniyor…' : 'Tazele'}
          </button>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`${site.displayName} sitesini sil`}
            className="rounded-lg p-2"
            style={{ color: palette.textMuted }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {loginTest !== null && <LoginTestReport result={loginTest} />}

      {syncResult && <SyncReport result={syncResult} />}

      {showDiscovery && (
        <DiscoveryPanel
          site={site}
          onValidated={() => { setShowDiscovery(false); onDiscovered(); }}
        />
      )}
    </Card>
  );
}

function NewSiteForm({ onCancel, onCreated }: {
  onCancel: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<CreateSupplierSiteBody>({
    siteKey: '', displayName: '', baseUrl: '', username: '', password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CreateSupplierSiteBody) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sonarSites.create(form);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Görünen ad" value={form.displayName} onChange={set('displayName')}
            placeholder="Başbuğ Otomotiv" required />
          <Field label="Site anahtarı" value={form.siteKey} onChange={set('siteKey')}
            placeholder="basbug" required
            hint="Kısa, boşluksuz. Profil eşlemesinde kullanılır." />
        </div>

        <Field label="Site adresi" value={form.baseUrl} onChange={set('baseUrl')}
          placeholder="https://b2b.tedarikci.com" required
          hint="http veya https olmalı." />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bayi kullanıcı adı" value={form.username} onChange={set('username')}
            required autoComplete="off" />
          <Field label="Bayi şifresi" value={form.password} onChange={set('password')}
            type="password" required autoComplete="new-password"
            hint={
              // Kopyala-yapıştırdan gelen baştaki/sondaki boşluk, "elle
              // giriyorum ama robot giremiyor" hatasının en sık sebebidir.
              // Sessizce kırpmıyoruz -- şifre AYNEN saklanmalı -- ama
              // görünmeyen bir karakteri kullanıcıya SÖYLÜYORUZ.
              form.password !== form.password.trim()
                ? 'DİKKAT: başında veya sonunda boşluk var. Site bunu şifrenin '
                  + 'parçası sayar ve giriş reddedilir.'
                : 'Şifrelenerek saklanır ve panele bir daha DÖNMEZ.'
            } />
        </div>

        <p className="text-xs" style={{ color: palette.textMuted }}>
          Şifresiz site eklenemez: anonim oturumda bayi fiyatları görünmez ve
          çekilen katalog değersiz olur.
        </p>

        {error && <ErrorNote message={error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: `1px solid ${palette.border}`, color: palette.text }}>
            Vazgeç
          </button>
          <button type="submit" disabled={saving}
            className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: palette.accent, color: palette.textOnFill }}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, hint, ...input }: {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: palette.textLabel }}>{label}</span>
      <input
        {...input}
        className="rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: palette.inputBg,
          border: `1px solid ${palette.border}`,
          color: palette.text,
        }}
      />
      {hint && <span className="text-xs" style={{ color: palette.textFaint }}>{hint}</span>}
    </label>
  );
}

/**
 * Giriş testi raporu.
 *
 * Sitenin KENDİ cümlesi öne çıkar; bizim yorumumuz değil. "Şifre Hatalı!" ile
 * "profil bozuk" tamamen farklı iki iştir ve kullanıcı bunu ancak sitenin
 * kendi sözlerini görerek ayırt edebilir.
 */
function LoginTestReport({ result }: { result: LoginTestResult | string }) {
  if (typeof result === 'string') {
    return (
      <p className="mt-2 text-xs" style={{ color: palette.danger }}>
        {result}
      </p>
    );
  }

  if (result.ok) {
    return (
      <p className="mt-2 text-xs" style={{ color: palette.success }}>
        Giriş başarılı. Keşfi başlatabilirsiniz.
      </p>
    );
  }

  return (
    <div className="mt-2 text-xs" style={{ color: palette.danger }}>
      <p>Giriş yapılamadı — {result.detail || result.outcome}</p>
      {result.login_url && (
        <p className="mt-1" style={{ color: palette.textFaint }}>
          Denenen giriş sayfası: {result.login_url}
        </p>
      )}
    </div>
  );
}

/**
 * Tazeleme raporu.
 *
 * "Değişiklik yok" ile "tazeleyemedim" AYRI gösterilir: ikisini karıştırmak,
 * kullanıcının çalışmayan bir tazelemeyi çalışıyor sanmasına yol açar.
 */
function SyncReport({ result }: { result: CatalogSyncResult }) {
  if (result.stoppedReason) {
    return (
      <p className="mt-2 text-xs" style={{ color: palette.warningText }}>
        Tazeleme yapılmadı: {result.stoppedReason}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
      style={{ color: palette.textMuted }}>
      <span>{result.checked} sorgu</span>
      <span>{result.priceChanged} fiyat değişti</span>
      <span>{result.wentOutOfStock} stok bitti</span>
      <span>{result.backInStock} stoğa girdi</span>
      {result.unverifiable > 0 && (
        <span style={{ color: palette.warningText }}>
          {result.unverifiable} doğrulanamadı — bu sonuçlar yazılmadı
        </span>
      )}
    </div>
  );
}
