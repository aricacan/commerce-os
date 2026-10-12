'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  Search,
  Check,
  X,
  RotateCcw,
  Lock,
  LayoutGrid,
  Power,
  UserPlus,
} from 'lucide-react';
import { permissionsApi, moduleAccessApi } from '../../lib/api/permissions';
import { settingsApi } from '../../lib/api/settings';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { userApi, type ManagedUser } from '../../lib/api/users';
import { useAuthStore } from '../../stores/auth';
import { queryKeys } from '../../lib/query-keys';
import { toast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';
import {
  getDynamicPageList,
  permissionKeyFromHref,
} from './system-panel-config';

const ALL_ROLES = [
  'SuperAdmin',
  'Admin',
  'Accountant',
  'ForeignTrade',
  'EcommerceSpecialist',
  'Warehouse',
  'CatalogSpecialist',
  'SupportAgent',
  'Moderator',
  'User',
] as const;

function userInitials(u: ManagedUser): string {
  const f = u.firstName?.trim().charAt(0).toUpperCase() || '';
  const l = u.lastName?.trim().charAt(0).toUpperCase() || '';
  if (f || l) return `${f}${l}`;
  return u.email?.slice(0, 2).toUpperCase() || '??';
}

export function PermissionsWorkspace() {
  const { lang, t } = useI18n();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const isSuperAdmin = currentUser?.roles?.some((r) => r.toLowerCase() === 'superadmin');

  // İzin uygulamasının gerçek durumu — varsayılan `log` modunda hiçbir izin isteği
  // ENGELLEMEZ, yalnızca gölge kaydı yazar. Bu ekranda izin kapatan kullanıcı bunu bilmeli.
  // Modül listesi ve etiketleri BACKEND KATALOĞUNDAN. Elle yazılmış APP_MODULE_KEYS altı
  // modülü (Sonar, AdsHub, Erpis, Fiziksel Depo, SellingView, PartnerHub) atlıyordu ve o
  // altısı hiç kısıtlanamıyordu.
  const { grantable: grantableModules } = useModuleCatalog();
  const moduleLabel = (key: string) =>
    grantableModules.find((m) => m.key.toLowerCase() === key.toLowerCase())?.displayName
    ?? (key.charAt(0).toUpperCase() + key.slice(1));

  const { data: enforcement } = useQuery({
    queryKey: ['permissions-enforcement'],
    queryFn: settingsApi.getPermissionEnforcement,
    staleTime: 60_000,
  });

  // Sekme Seçimi: 'pages' (Sayfa Yetkileri) | 'modules' (Modül Erişimi & Yönetimi)
  const [activeTab, setActiveTab] = useState<'pages' | 'modules'>('modules');
  const [searchQuery, setSearchQuery] = useState('');
  const [extraMembersModalModule, setExtraMembersModalModule] = useState<string | null>(null);
  const [extraMemberSearch, setExtraMemberSearch] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: permsData = [],
    isLoading: permsLoading,
    refetch: refetchPerms,
    isFetching: isFetchingPerms,
  } = useQuery({
    queryKey: queryKeys.system.permissions,
    queryFn: ({ signal }) => permissionsApi.listWithSignal(signal),
    enabled: Boolean(isSuperAdmin),
    staleTime: 0,
  });

  const {
    data: moduleAccessData = [],
    refetch: refetchModuleAccess,
  } = useQuery({
    queryKey: queryKeys.system.moduleAccess,
    queryFn: () => moduleAccessApi.list(),
    enabled: Boolean(isSuperAdmin),
    staleTime: 0,
  });

  const {
    data: moduleFlags = {},
    refetch: refetchModuleFlags,
  } = useQuery({
    queryKey: queryKeys.system.moduleFlags,
    queryFn: () => settingsApi.getModuleFlags(),
    enabled: Boolean(isSuperAdmin),
    staleTime: 0,
  });

  // Kullanıcı listesi - her zaman güncel ve dinamik
  const {
    data: usersList = [],
    refetch: refetchUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: queryKeys.system.users,
    queryFn: ({ signal }) => userApi.listWithSignal(signal),
    enabled: Boolean(isSuperAdmin),
    staleTime: 0,
  });

  // ── Yerel Değişiklik State'leri ───────────────────────────────────────────
  const [permEdits, setPermEdits] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (permsData.length > 0) {
      const init: Record<string, string[]> = {};
      permsData.forEach((p) => {
        init[p.pageKey] = p.allowedRoles.split(',').map((r) => r.trim());
      });
      setPermEdits(init);
    }
  }, [permsData]);

  const [moduleAccessEdits, setModuleAccessEdits] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (moduleAccessData.length > 0) {
      const init: Record<string, number[]> = {};
      moduleAccessData.forEach((m) => {
        init[m.moduleKey.toLowerCase()] = m.userIds;
      });
      setModuleAccessEdits(init);
    }
  }, [moduleAccessData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const permMutation = useMutation({
    mutationFn: ({
      pageKey,
      roles,
      pageLabel,
    }: {
      pageKey: string;
      roles: string[];
      pageLabel?: string;
    }) => permissionsApi.update(pageKey, roles.join(','), pageLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.permissions });
      toast.success(lang === 'tr' ? 'Yetki güncellendi.' : 'Permission updated.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Yetki kaydedilemedi.');
    },
  });

  const moduleAccessMutation = useMutation({
    mutationFn: ({ moduleKey, userIds }: { moduleKey: string; userIds: number[] }) =>
      moduleAccessApi.setAccess(moduleKey, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.moduleAccess });
      toast.success(lang === 'tr' ? 'Modül erişim listesi güncellendi.' : 'Module access list updated.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi.');
    },
  });

  const moduleFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      settingsApi.setModuleFlag(key, enabled),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.moduleFlags });
      toast.success(
        res.enabled
          ? lang === 'tr'
            ? `"${res.module}" modülü aktif edildi.`
            : `"${res.module}" enabled.`
          : lang === 'tr'
          ? `"${res.module}" modülü kapatıldı.`
          : `"${res.module}" disabled.`
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Modül durumu değiştirilemedi.');
    },
  });

  function togglePermRole(pageKey: string, role: string, currentRoles: string[], storedLabel?: string) {
    if (role === 'SuperAdmin') return; // SuperAdmin her zaman dahildir
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    setPermEdits((prev) => ({ ...prev, [pageKey]: nextRoles }));
    permMutation.mutate({ pageKey, roles: nextRoles, pageLabel: storedLabel });
  }

  function toggleModuleAccessUser(moduleKey: string, userId: number) {
    const key = moduleKey.toLowerCase();
    const current = moduleAccessEdits[key] ?? [];
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];

    setModuleAccessEdits((prev) => ({ ...prev, [key]: next }));
    moduleAccessMutation.mutate({ moduleKey: key, userIds: next });
  }

  // ── Sayfa Listesi & Filtreleme ─────────────────────────────────────────────
  const dynamicPages = useMemo(() => getDynamicPageList(t), [t]);

  const allPagePermissions = useMemo(() => {
    return dynamicPages.map((dp) => {
      const editKey = permissionKeyFromHref(dp.href);
      const dbMatch = permsData.find(
        (p) => p.pageKey === editKey || p.pageKey === dp.href || p.pageKey === dp.pageKey
      );
      return {
        pageKey: editKey,
        pageLabel: dp.pageLabel,
        storedPageLabel: dbMatch?.pageLabel || dp.pageLabel,
        href: dp.href,
        allowedRoles: dbMatch?.allowedRoles || 'SuperAdmin,Admin',
      };
    });
  }, [dynamicPages, permsData]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPagePermissions;
    const q = searchQuery.toLowerCase().trim();
    return allPagePermissions.filter(
      (p) =>
        p.pageLabel.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q) ||
        p.pageKey.toLowerCase().includes(q)
    );
  }, [allPagePermissions, searchQuery]);

  // Etiket moduleLabel ile AYNI kuralla hesaplanıyor ama o yardımcı her render'da yeniden
  // tanımlandığı için bağımlılık olarak verilemiyordu; eskiden bağımlılıktan düşürülmüştü ve
  // modül kataloğu yüklendiğinde liste bayat kalıyordu.
  const filteredModules = useMemo(() => {
    const keys = grantableModules.map((m) => m.key);
    const q = searchQuery.toLowerCase().trim();
    if (!q) return keys;
    return grantableModules
      .filter((m) => {
        const label = m.displayName ?? (m.key.charAt(0).toUpperCase() + m.key.slice(1));
        return label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q);
      })
      .map((m) => m.key);
  }, [grantableModules, searchQuery]);

  // Yetkisiz Durumu
  if (!isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-8 shadow-xs">
          <Shield className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {lang === 'tr' ? 'Erişim Kısıtlı' : 'Access Restricted'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {lang === 'tr'
              ? 'Yetki yönetimi sayfasına yalnızca SuperAdmin yetkisine sahip kullanıcılar erişebilir.'
              : 'Only SuperAdmin users have permission to access the permissions page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-transparent">
      {/* ── Uygulama Modu Uyarısı ────────────────────────────────────────────────
          Varsayılan mod `log`: aşağıdaki izinlerin HİÇBİRİ isteği engellemez, yalnızca
          gölge denetim kaydı yazılır. Bu bilinçli bir geçiş modu ama panelden
          görünmüyordu — kullanıcı burada izin kapatıp "kapattım" sanıyordu. */}
      {enforcement && (
        <div
          data-tour="permissions-enforcement"
          className={`shrink-0 border-b px-4 py-2 text-[11px] leading-relaxed ${
            enforcement.blocking
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
          }`}
        >
          <strong className="font-bold">
            {enforcement.blocking
              ? (lang === 'tr' ? 'İzinler uygulanıyor' : 'Permissions enforced')
              : (lang === 'tr' ? 'İzinler yalnızca kaydediliyor' : 'Permissions logged only')}
          </strong>
          {' — '}
          {enforcement.notice}
        </div>
      )}

      {/* ── Kompakt Üst Kontrol Barı ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Sol: Sekme ve Arama */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Sekme Butonları */}
            <div data-tour="permissions-tabs" className="flex items-center rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-0.5">
              <button
                onClick={() => setActiveTab('modules')}
                className={`flex items-center gap-1.5 h-6.5 px-3 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  activeTab === 'modules'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <ShieldCheck size={12} />
                <span>{lang === 'tr' ? 'Modül Yönetimi & Erişim' : 'Module Access & Controls'}</span>
              </button>

              <button
                onClick={() => setActiveTab('pages')}
                className={`flex items-center gap-1.5 h-6.5 px-3 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                  activeTab === 'pages'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <LayoutGrid size={12} />
                <span>{lang === 'tr' ? 'Sayfa Bazlı Yetkiler' : 'Page Permissions'}</span>
              </button>
            </div>

            {/* Arama Input */}
            <div data-tour="permissions-search" className="relative w-64 max-w-full">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'modules'
                    ? lang === 'tr'
                      ? 'Modül veya yetki ara...'
                      : 'Search module or role...'
                    : lang === 'tr'
                    ? 'Sayfa veya rota ara...'
                    : 'Search page or route...'
                }
                className="h-8 w-full rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 pl-8 pr-7 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Sağ: İstatistik & Yenile */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400 px-1">
              {activeTab === 'modules'
                ? `${filteredModules.length} ${lang === 'tr' ? 'modül' : 'modules'}`
                : `${filteredPages.length} ${lang === 'tr' ? 'sayfa' : 'pages'}`}
            </span>

            <button
              onClick={() => {
                refetchPerms();
                refetchModuleAccess();
                refetchModuleFlags();
                refetchUsers();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title={lang === 'tr' ? 'Yenile' : 'Refresh'}
            >
              <RotateCcw
                size={13}
                className={isFetchingPerms || isFetchingUsers ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tablo / Kart Alanı ──────────────────────────────────────────────── */}
      <div data-tour="permissions-content" className="flex-1 min-h-0 overflow-y-auto p-4">
        {activeTab === 'modules' ? (
          /* SEKME 1: MODÜL YÖNETİMİ & ERİŞİM (Rütbe Bazlı + Ekstra Üyeler + Canlı Aç/Kapa) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredModules.map((moduleKey) => {
              const label =
                moduleLabel(moduleKey) ||
                moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
              const isModuleEnabled = moduleFlags[moduleKey] !== false;
              const directUserIds = moduleAccessEdits[moduleKey] ?? [];

              // Modülün ilişkili sayfa yetki kaydı
              const pageKeyMatch = allPagePermissions.find(
                (p) =>
                  p.pageKey.toLowerCase() === moduleKey.toLowerCase() ||
                  p.href.toLowerCase().includes(moduleKey.toLowerCase())
              );
              const currentRoles = pageKeyMatch
                ? permEdits[pageKeyMatch.pageKey] ??
                  pageKeyMatch.allowedRoles.split(',').map((r) => r.trim())
                : ['SuperAdmin', 'Admin'];

              const extraUsers = usersList.filter((u) => directUserIds.includes(u.id));

              return (
                <div
                  key={moduleKey}
                  className={`flex flex-col rounded-[4px] border transition-all p-3.5 shadow-xs ${
                    isModuleEnabled
                      ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e]'
                      : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-75'
                  }`}
                >
                  {/* Kart Üst: Modül Başlığı + Canlı Aç/Kapa Switch */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800 mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        size={15}
                        className={isModuleEnabled ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}
                      />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {label}
                      </span>
                    </div>

                    {/* Canlı Aç/Kapat Butonu */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isModuleEnabled}
                      disabled={moduleFlagMutation.isPending}
                      onClick={() =>
                        moduleFlagMutation.mutate({
                          key: moduleKey,
                          enabled: !isModuleEnabled,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        isModuleEnabled
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                      title={isModuleEnabled ? 'Modülü kapat' : 'Modülü aç'}
                    >
                      <Power size={11} />
                      <span>{isModuleEnabled ? (lang === 'tr' ? 'Açık' : 'Active') : (lang === 'tr' ? 'Kapalı' : 'Disabled')}</span>
                    </button>
                  </div>

                  {/* 1. Rütbe / Rol Yetkileri */}
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {lang === 'tr' ? '1. Yetkili Rütbeler / Roller' : '1. Allowed Roles'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ALL_ROLES.map((role) => {
                        const isLocked = role === 'SuperAdmin';
                        const hasRole = currentRoles.includes(role);

                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={isLocked || !pageKeyMatch}
                            onClick={() => {
                              if (pageKeyMatch) {
                                togglePermRole(
                                  pageKeyMatch.pageKey,
                                  role,
                                  currentRoles,
                                  pageKeyMatch.storedPageLabel
                                );
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border text-[10.5px] font-medium transition-colors ${
                              isLocked
                                ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : hasRole
                                ? 'border-zinc-700 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600 font-semibold cursor-pointer'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer'
                            }`}
                          >
                            {isLocked ? <Lock size={10} /> : hasRole ? <Check size={10} /> : <span>+</span>}
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Ekstra Bireysel Üye İzinleri */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-end pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {lang === 'tr' ? '2. Ekstra Üyeler (İstisnalar)' : '2. Extra User Grants'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExtraMembersModalModule(moduleKey);
                          setExtraMemberSearch('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:underline cursor-pointer"
                      >
                        <UserPlus size={11} />
                        <span>{lang === 'tr' ? 'Üye Seç' : 'Select'}</span>
                      </button>
                    </div>

                    {extraUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {extraUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-[10.5px] text-zinc-700 dark:text-zinc-300 font-medium"
                          >
                            <span className="truncate max-w-[120px]">
                              {u.firstName || u.lastName
                                ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                                : u.email}
                            </span>
                            <button
                              onClick={() => toggleModuleAccessUser(moduleKey, u.id)}
                              className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                              title="Kaldır"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] italic text-zinc-400 py-0.5">
                        {lang === 'tr' ? 'Yalnızca rütbe yetkilileri erişebilir.' : 'Only role-granted users have access.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* SEKME 2: SAYFA BAZLI YETKİLER */
          <div className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
            {permsLoading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-zinc-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                <span>{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
                <Shield className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-1.5" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {lang === 'tr' ? 'Eşleşen sayfa bulunamadı' : 'No matching pages'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 min-w-[240px]">
                        {lang === 'tr' ? 'Sayfa & Rota' : 'Page & Route'}
                      </th>
                      {ALL_ROLES.map((role) => (
                        <th
                          key={role}
                          className="px-4 py-2.5 text-center w-28 min-w-[100px]"
                        >
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                    {filteredPages.map((perm) => {
                      const current =
                        permEdits[perm.pageKey] ??
                        perm.allowedRoles.split(',').map((r) => r.trim());

                      return (
                        <tr
                          key={perm.href}
                          className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                        >
                          {/* Sayfa Başlığı ve Yolu */}
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                                {perm.pageLabel}
                              </span>
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                {perm.href}
                              </span>
                            </div>
                          </td>

                          {/* Rol Yetki Kutucukları */}
                          {ALL_ROLES.map((role) => {
                            const isLocked = role === 'SuperAdmin';
                            const isOn = current.includes(role);

                            return (
                              <td key={role} className="px-4 py-2.5 text-center">
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isOn}
                                  disabled={isLocked}
                                  onClick={() =>
                                    togglePermRole(
                                      perm.pageKey,
                                      role,
                                      current,
                                      perm.storedPageLabel
                                    )
                                  }
                                  className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border text-xs transition-colors cursor-pointer ${
                                    isLocked
                                      ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                                      : isOn
                                      ? 'border-zinc-700 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600 shadow-xs'
                                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-transparent hover:border-zinc-400 dark:hover:border-zinc-500'
                                  }`}
                                  title={
                                    isLocked
                                      ? t('settings_superadmin_always_included')
                                      : `${role} yetkisini aç/kapat`
                                  }
                                >
                                  {isLocked ? (
                                    <Lock size={11} />
                                  ) : isOn ? (
                                    <Check size={12} strokeWidth={2.5} />
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Ekstra Bireysel Üye Seçimi ───────────────────────────────── */}
      {extraMembersModalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div>
                <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {moduleLabel(extraMembersModalModule)} — {lang === 'tr' ? 'Ekstra Üyeler' : 'Extra Members'}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  {lang === 'tr'
                    ? 'Rütbesine bakılmaksızın bu modüle doğrudan erişim verilecek üyeler.'
                    : 'Users with direct module access regardless of their role.'}
                </p>
              </div>
              <button
                onClick={() => setExtraMembersModalModule(null)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Arama Input */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Kullanıcı ara...' : 'Search user...'}
                value={extraMemberSearch}
                onChange={(e) => setExtraMemberSearch(e.target.value)}
                className="h-7.5 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 pl-7.5 pr-2 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            {/* Üye Seçim Listesi */}
            <div className="space-y-1 max-h-64 overflow-y-auto py-1 pr-1">
              {usersList
                .filter((u) => {
                  if (!extraMemberSearch.trim()) return true;
                  const full = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase();
                  return full.includes(extraMemberSearch.toLowerCase().trim());
                })
                .map((u) => {
                  const moduleKey = extraMembersModalModule.toLowerCase();
                  const selectedIds = moduleAccessEdits[moduleKey] ?? [];
                  const isChecked = selectedIds.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleModuleAccessUser(moduleKey, u.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 shrink-0 rounded-[2px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[9.5px] font-bold text-zinc-700 dark:text-zinc-300">
                          {userInitials(u)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs truncate font-medium">
                            {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{u.email}</div>
                        </div>
                      </div>

                      <div
                        className={`h-4 w-4 rounded-[2px] border flex items-center justify-center text-[10px] ${
                          isChecked
                            ? 'border-zinc-700 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={2.5} />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setExtraMembersModalModule(null)}
                className="h-7.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {lang === 'tr' ? 'Tamam' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
