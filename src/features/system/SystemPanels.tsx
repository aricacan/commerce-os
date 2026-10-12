'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi, settingsApi, permissionsApi, userApi, aiSettingsApi, moduleAccessApi } from '../../lib/api';
import { SecureAccessBarrier } from '../../components/layout/SecureAccessBarrier';
import { ErpSettingsView } from '../../components/settings/ErpSettingsView';
import { BaseChannelMappingView } from '../../components/settings/BaseChannelMappingView';
import { useAuthStore } from '../../stores/auth';
import {
  Plug, Check, AlertCircle, Eye, EyeOff, Save, Shield, Users, Key, UserX, UserCheck,
  Lock, Mail, User, Plus, X, Pencil, Search,
} from 'lucide-react';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { useI18n } from '../../lib/i18n';
import { queryKeys } from '../../lib/query-keys';
import { QUERY_STALE_TIME } from '../../lib/query-policy';
import {
  getDynamicPageList, getPlatformFields, permissionKeyFromHref, roleBadgeClass, userInitials,
} from './system-panel-config';
import { SystemPanelStyles } from './SystemPanelStyles';

export type SystemSection = 'integration' | 'erp' | 'base-mapping' | 'ai' | 'permissions' | 'users';

export function SystemPanels({ section }: { section: SystemSection }) {
  // Modül kavramının TEK kaynağı — hem aç/kapa listesi hem kullanıcı bazlı yetki listesi
  // buradan gelir (bkz. useModuleCatalog).
  const moduleCatalog = useModuleCatalog();
  const grantableKeys = new Set(moduleCatalog.grantable.map((m) => m.key.toLowerCase()));

  const { lang, t } = useI18n();
  const platformFields = getPlatformFields(t);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') ?? false;
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [selectedPlatform, setSelectedPlatform] = useState<Awaited<ReturnType<typeof integrationsApi.list>>[number] | null>(null);

  // Form states
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState('Production');
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── User management state ────────────────────────────────────────────────
  const [pwModal, setPwModal] = useState<{ userId: number; email: string } | null>(null);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserErr, setAddUserErr] = useState('');
  const [editUserModal, setEditUserModal] = useState<{ id: number; email: string; firstName: string; lastName: string; companyEmail: string } | null>(null);
  const [editUserErr, setEditUserErr] = useState('');
  const [moduleSearch, setModuleSearch] = useState<Record<string, string>>({});
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: number; email: string } | null>(null);
  const [editingCompanyEmail, setEditingCompanyEmail] = useState<Record<number, string>>({});
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newRoleIds, setNewRoleIds] = useState<number[]>([]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: queryKeys.system.integrations,
    queryFn: ({ signal }) => integrationsApi.listWithSignal(signal),
    enabled: section === 'integration',
    staleTime: 10_000,
  });

  const { data: usageSummary } = useQuery({
    queryKey: queryKeys.system.aiUsageSummary,
    queryFn: () => aiSettingsApi.usageSummary(),
    enabled: section === 'ai' && (isSuperAdmin || isAdmin),
    staleTime: 30_000,
  });

  // Base (BaseLinker/StoreB UK) GBP -> TRY kuru — bkz. hooks/useBaseCurrency.ts
  // ('base-fx-rate' query key'i orada da aynı, kaydedince ikisi de tazelenir).
  // Kur Ayarları kartı kaldırıldı — GBP/TRY artık tamamen otomatik (CurrencyRates/
  // TCMB), Ayarlar'da ayrıca gösterecek bir şey kalmadı. useBaseCurrency.ts hook'u
  // hâlâ /system-settings/base-fx endpoint'ini kullanıyor, o kalıyor.
  // Modül aç/kapa (Radar / Intelligent) — runtime, redeploy gerektirmez.
  useQuery({
    queryKey: queryKeys.system.moduleFlags,
    queryFn: () => settingsApi.getModuleFlags(),
    enabled: section === 'ai' && (isSuperAdmin || isAdmin),
    staleTime: 30_000,
  });
  const moduleFlagMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => settingsApi.setModuleFlag(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.moduleFlags });
      setSuccessMsg(lang === 'tr' ? 'Modül durumu güncellendi.' : 'Module status updated.');
    },
    onError: (err: Error) => setErrorMsg((lang === 'tr' ? 'Güncellenemedi: ' : 'Failed: ') + err.message),
  });

  const { data: permsDataRaw = [], isLoading: permsLoading } = useQuery({
    queryKey: queryKeys.system.permissions,
    queryFn: ({ signal }) => permissionsApi.listWithSignal(signal),
    enabled: section === 'permissions' && isSuperAdmin,
    staleTime: 30_000,
  });

  // connect/nexus/radar/intelligent artık burada değil — rol yerine üye bazlı "Modül
  // Erişimi" bölümünde yönetiliyor (bkz. moduleAccessQuery aşağıda).
  const permsData = permsDataRaw;

  const { data: usersList = [], isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.system.users,
    queryFn: ({ signal }) => userApi.listWithSignal(signal),
    enabled: (section === 'users' || section === 'permissions') && (isSuperAdmin || isAdmin),
    staleTime: QUERY_STALE_TIME.live,
  });

  const { data: moduleAccessData = [], isLoading: moduleAccessLoading } = useQuery({
    queryKey: queryKeys.system.moduleAccess,
    queryFn: () => moduleAccessApi.list(),
    enabled: section === 'permissions' && isSuperAdmin,
    staleTime: 15_000,
  });

  const [moduleAccessEdits, setModuleAccessEdits] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (moduleAccessData.length > 0) {
      const init: Record<string, number[]> = {};
      moduleAccessData.forEach((m) => { init[m.moduleKey] = m.userIds; });
      setModuleAccessEdits(init);
    }
  }, [moduleAccessData]);

  const moduleAccessMutation = useMutation({
    mutationFn: ({ moduleKey, userIds }: { moduleKey: string; userIds: number[] }) =>
      moduleAccessApi.setAccess(moduleKey, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.moduleAccess });
      setSuccessMsg(lang === 'tr' ? 'Modül erişimi güncellendi.' : 'Module access updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  function toggleModuleAccessUser(moduleKey: string, userId: number) {
    setModuleAccessEdits((prev) => {
      const current = prev[moduleKey] ?? [];
      const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      return { ...prev, [moduleKey]: next };
    });
  }

  const { data: rolesList = [] } = useQuery({
    queryKey: queryKeys.system.roles,
    queryFn: ({ signal }) => userApi.rolesWithSignal(signal),
    enabled: section === 'users' && (isSuperAdmin || isAdmin),
    staleTime: QUERY_STALE_TIME.reference,
  });

  // ── Local state for permission edits ────────────────────────────────────────
  const [permEdits, setPermEdits] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (permsData.length > 0) {
      const init: Record<string, string[]> = {};
      permsData.forEach((p) => { init[p.pageKey] = p.allowedRoles.split(',').map(r => r.trim()); });
      setPermEdits(init);
    }
  }, [permsData]);

  const ALL_ROLES = ['SuperAdmin', 'Admin', 'Moderator', 'User'] as const;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (variables: { platformId: number; apiKey: string; environment: string; secretValues: Record<string, string> }) =>
      integrationsApi.save(variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.integrations });
      setSuccessMsg(t('settings_integration_save_success'));
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: unknown) => {
      setErrorMsg(t('settings_save_error_prefix') + ': ' + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  // Load platform credentials into form when selected platform changes
  useEffect(() => {
    if (selectedPlatform) {
      setApiKey(selectedPlatform.apiKey || '');
      setEnvironment(selectedPlatform.environment || 'Production');
      setSecrets(selectedPlatform.secretValues || {});
      setVisibleSecrets({});
    }
  }, [selectedPlatform]);

  // Set initial selected platform
  useEffect(() => {
    if (integrations.length > 0 && !selectedPlatform) {
      // Prefer first platform
      setSelectedPlatform(integrations[0]);
    } else if (selectedPlatform) {
      // Keep reference updated
      const updated = integrations.find((integration) => integration.platformId === selectedPlatform.platformId);
      if (updated) setSelectedPlatform(updated);
    }
  }, [integrations, selectedPlatform]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;

    if (!apiKey && platformFields[selectedPlatform.platformName]?.some(f => f.key === 'ApiKey' && f.required)) {
      setErrorMsg(t('settings_primary_api_key_required'));
      return;
    }

    saveMutation.mutate({
      platformId: selectedPlatform.platformId,
      apiKey,
      environment,
      secretValues: secrets
    });
  };

  const createUserMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (values: Parameters<typeof userApi.create>[0]) => userApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      setSuccessMsg(t('settings_user_created'));
      setShowAddUser(false);
      setNewEmail(''); setNewPass(''); setNewFirst(''); setNewLast(''); setNewRoleIds([]);
      setAddUserErr('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: unknown) => { setAddUserErr(error instanceof Error ? error.message : 'Hata oluştu'); },
  });

  const deleteUserMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      setSuccessMsg(t('settings_user_deleted'));
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: unknown) => { setErrorMsg(error instanceof Error ? error.message : String(error)); setTimeout(() => setErrorMsg(''), 5000); },
  });

  const changePasswordMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: ({ id, pw, currentPw }: { id: number; pw: string; currentPw?: string }) => {
      const isMe = id === user?.id;
      if (isMe && currentPw) {
        return userApi.changeMyPassword(currentPw, pw);
      }
      return userApi.changePassword(id, pw);
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message);
      setPwModal(null); setNewPw(''); setOldPw(''); setConfirmPw(''); setPwErr('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: unknown) => { setPwErr(error instanceof Error ? error.message : t('settings_password_change_failed')); },
  });

  const setCompanyEmailMutation = useMutation({
    meta: { successMessage: 'Şirket e-postası kaydedildi' } as const,
    mutationFn: ({ id, companyEmail }: { id: number; companyEmail: string | null }) =>
      userApi.setCompanyEmail(id, companyEmail),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.users }),
  });

  const toggleActiveMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (id: number) => userApi.toggleActive(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: unknown) => { setErrorMsg(error instanceof Error ? error.message : String(error)); setTimeout(() => setErrorMsg(''), 5000); },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, firstName, lastName, companyEmail }: { id: number; firstName: string; lastName: string; companyEmail?: string | null }) =>
      userApi.update(id, { firstName, lastName, companyEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      setSuccessMsg(lang === 'tr' ? 'Kullanıcı bilgileri güncellendi.' : 'User updated successfully.');
      setEditUserModal(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: unknown) => {
      setEditUserErr(error instanceof Error ? error.message : 'Hata oluştu');
    },
  });

  const assignRoleMutation = useMutation({
    meta: { successMessage: 'Rol atandı' } as const,
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) => userApi.assignRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.users }),
  });

  const removeRoleMutation = useMutation({
    meta: { successMessage: 'Rol kaldırıldı' } as const,
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) => userApi.removeRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.users }),
  });

  const permMutation = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: ({ pageKey, roles, pageLabel }: { pageKey: string; roles: string[]; pageLabel?: string }) =>
      permissionsApi.update(pageKey, roles.join(','), pageLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.permissions });
      setSuccessMsg(t('settings_permission_updated'));
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: unknown) => {
      setErrorMsg(t('settings_update_failed') + ': ' + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const handleCreateUser = () => {
    setAddUserErr('');
    const emailTrim = newEmail.trim();
    const passTrim = newPass;

    if (!emailTrim || !emailTrim.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setAddUserErr(lang === 'tr' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.');
      return;
    }
    if (!passTrim || passTrim.length < 8) {
      setAddUserErr(lang === 'tr' ? 'Şifre en az 8 karakter olmalıdır.' : 'Password must be at least 8 characters.');
      return;
    }
    if (!newFirst.trim() || !newLast.trim()) {
      setAddUserErr(lang === 'tr' ? 'Ad ve soyad alanları boş bırakılamaz.' : 'First and last name cannot be empty.');
      return;
    }
    if (newRoleIds.length === 0) {
      setAddUserErr(lang === 'tr' ? 'Lütfen en az bir rol seçin.' : 'Please select at least one role.');
      return;
    }

    createUserMutation.mutate({
      email: emailTrim,
      password: passTrim,
      firstName: newFirst.trim(),
      lastName: newLast.trim(),
      roleIds: newRoleIds
    });
  };

  const handleSecretChange = (key: string, val: string) => {
    setSecrets(prev => ({ ...prev, [key]: val }));
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePermRole = (pageKey: string, role: string, fallbackRoles: string[] = []) => {
    if (role === 'SuperAdmin') return; // SuperAdmin always included
    const current = permEdits[pageKey] ?? fallbackRoles;
    const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
    if (!next.includes('SuperAdmin')) next.push('SuperAdmin');
    setPermEdits(prev => ({ ...prev, [pageKey]: next }));
  };

  const fields = selectedPlatform ? (platformFields[selectedPlatform.platformName] || []) : [];

  // Şifre kapısı (SecureAccessBarrier) SADECE Kullanıcılar ve Yetkiler panellerinde — diğerleri
  // (entegrasyon/erp/eşleştirme/AI) doğrudan açılır (kullanıcı talebi).
  const needsBarrier = section === 'users' || section === 'permissions';

  const inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <SystemPanelStyles />

        {/* Content */}
        {section === 'integration' && <div className="settings-layout">
          {/* Left: Platform List */}
          <div className="platform-list">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', fontWeight: 700, fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {lang === 'tr' ? 'Pazaryerleri' : 'Marketplaces'}
            </div>
            {isLoading ? (
              <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center' }}>{t('loading')}</div>
            ) : integrations.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center' }}>{t('settings_no_platforms_found')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                {integrations.map((platform) => {
                  const isCurrent = selectedPlatform?.platformId === platform.platformId;
                  return (
                    <button
                      key={platform.platformId}
                      className={`platform-item ${isCurrent ? 'active' : ''}`}
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      <span className="platform-icon"><Plug size={15} /></span>
                      <span className="platform-item-name">{platform.platformName}</span>
                      {/* Kayıtlı şifre çözülemiyorsa "Bağlı değil" demek yanıltıcı: kayıt var
                          ama okunamıyor — kullanıcı bilgileri yeniden girmeli. */}
                      {platform.credentialError ? (
                        <span className="badge warning" title={platform.credentialError}>
                          {lang === 'tr' ? 'Şifre çözülemedi' : 'Decrypt failed'}
                        </span>
                      ) : (
                        <span className={`badge ${platform.isActive ? 'active' : 'inactive'}`}>
                          {platform.isActive ? t('settings_connected') : t('settings_not_connected')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Form Editor */}
          {selectedPlatform ? (
            <form className="form-card" onSubmit={handleSave}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)', paddingBottom: 16, marginBottom: 4 }}>
                <span className="platform-icon" style={{ width: 38, height: 38 }}><Plug size={17} /></span>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
                    {selectedPlatform.platformName} {lang === 'tr' ? 'API Yapılandırması' : 'API Configuration'}
                  </h2>
                  <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', margin: '3px 0 0 0' }}>
                    {t('settings_api_config_hint')}
                  </p>
                </div>
              </div>

              {selectedPlatform.credentialError && (
                <div className="toast-alert error">
                  <AlertCircle size={16} />
                  {lang === 'tr'
                    ? 'Kayıtlı şifre çözülemedi — bilgileri yeniden girin.'
                    : 'Stored credentials could not be decrypted — please re-enter them.'}
                </div>
              )}
              {successMsg && (
                <div className="toast-alert success">
                  <Check size={16} /> {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="toast-alert error">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              {/* Environment Selection — segmented control, same `environment` state/setter as before */}
              <div className="form-field">
                <span className="field-label">{t('settings_environment_label')}</span>
                <div className="env-toggle">
                  <button
                    type="button"
                    className={`env-toggle-btn ${environment === 'Production' ? 'active' : ''}`}
                    onClick={() => setEnvironment('Production')}
                  >
                    {t('settings_env_production')}
                  </button>
                  <button
                    type="button"
                    className={`env-toggle-btn ${environment === 'Test' ? 'active' : ''}`}
                    onClick={() => setEnvironment('Test')}
                  >
                    {t('settings_env_test')}
                  </button>
                </div>
              </div>

              {/* Dynamic Fields */}
              {fields.map((field) => {
                const isSecret = field.secret;
                const value = field.key === 'ApiKey' ? apiKey : (secrets[field.key] || '');
                const isVisible = visibleSecrets[field.key] || false;

                return (
                  <div className="form-field" key={field.key}>
                    <label className="field-label">
                      {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>

                    <div className="field-input-wrap">
                      <span className="field-icon">{isSecret ? <Lock size={14} /> : <Key size={14} />}</span>
                      <input
                        type={isSecret && !isVisible ? 'password' : 'text'}
                        className={`field-input ${isSecret ? 'field-input-secret' : ''}`}
                        value={value}
                        onChange={(e) => {
                          if (field.key === 'ApiKey') setApiKey(e.target.value);
                          else handleSecretChange(field.key, e.target.value);
                        }}
                        placeholder={lang === 'tr' ? `${field.label} girin...` : `Enter ${field.label}...`}
                      />
                      {isSecret && (
                        <button
                          type="button"
                          className="input-eye-btn"
                          onClick={() => toggleSecretVisibility(field.key)}
                        >
                          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: 8, borderTop: '1px solid var(--border-soft)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveMutation.isPending}
                >
                  <Save size={15} />
                  {saveMutation.isPending ? t('settings_saving') : t('settings_save_integration')}
                </button>
              </div>
            </form>
          ) : (
            <div className="form-card" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--fg-muted)' }}>
              {t('settings_select_platform_hint')}
            </div>
          )}
        </div>}

        {/* ── ERP Bağlantıları ─────────────────────────────────────────────────── */}
        {section === 'erp' && <ErpSettingsView />}

        {/* ── Base Kanal Eşleştirme ────────────────────────────────────────────── */}
        {section === 'base-mapping' && <BaseChannelMappingView />}

        {/* ── AI Model ─────────────────────────────────────────────────────────── */}
        {section === 'ai' && (
          <div style={{ padding: 24, flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {successMsg && (
              <div className="toast-alert success" style={{ marginBottom: 0 }}>
                <Check size={16} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="toast-alert error" style={{ marginBottom: 0 }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            {/* Token kullanım özeti — bugün/bu ay */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {lang === 'tr' ? 'Bugün Harcanan Token' : 'Tokens Spent Today'}
                </p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--fg)' }}>
                  {usageSummary ? usageSummary.todayTokens.toLocaleString('tr-TR') : t('loading')}
                </p>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {lang === 'tr' ? 'Bu Ay Harcanan Token' : 'Tokens Spent This Month'}
                </p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--fg)' }}>
                  {usageSummary ? usageSummary.monthTokens.toLocaleString('tr-TR') : t('loading')}
                </p>
              </div>
            </div>
            {usageSummary?.byModel?.length ? (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {lang === 'tr' ? 'Model Bazlı Kullanım' : 'Usage by Model'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  {usageSummary.byModel.map((row) => (
                    <div key={`${row.provider}-${row.model}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)' }}>
                      <span className="font-mono" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{row.model}</span>
                      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{row.totalTokens.toLocaleString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Modüller — Çalışma zamanı dinamik aç/kapa (Tüm Sistem Modülleri) */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Plug size={16} style={{ color: '#e52521' }} />
                  {lang === 'tr' ? 'Sistem Modülleri — Canlı Aç / Kapat' : 'System Modules — Live Enable / Disable'}
                </h2>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', letterSpacing: '0.3px' }}>
                  {lang === 'tr' ? 'DİNAMİK YÖNETİM' : 'DYNAMIC MANAGEMENT'}
                </span>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                {lang === 'tr'
                  ? 'Kapatılan bir modül çalışma zamanında tamamen durur: menüde gizlenir, API istekleri 403 engellenir ve otomatik arka plan işleri pasife alınır. Yeniden başlatma gerektirmez.'
                  : 'A disabled module stops at runtime: hidden from navigation, API returns 403, and background jobs pause. Takes effect immediately.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {(() => {
                  // LİSTE BACKEND KATALOĞUNDAN (bkz. useModuleCatalog). Önceden burada elle
                  // yazılmış bir açıklama sözlüğü ve APP_MODULE_KEYS vardı; ikisi de backend'in
                  // kataloğuyla aynı değildi. Sonuçları: Sonar hiç görünmüyordu (yani
                  // kapatılamıyordu), fitment'ın açıklaması yazılmış ama hiç render edilmiyordu,
                  // connect/nexus/ai ise kapatınca hiçbir şey olmayan sahte anahtarlardı.
                  return moduleCatalog.togglable.map((entry) => {
                    const key = entry.key;
                    const info = { label: entry.displayName, desc: entry.description };
                    const enabled = entry.enabled;
                    // Sunucuda yüklü olmayan modül buradan açılamaz (backend de 409 döner);
                    // anahtarı aktif göstermek "açtım ama hiçbir şey olmadı" demekti.
                    const available = entry.availableOnServer;
                    const statusLabel = !available
                      ? (lang === 'tr' ? 'Bu sunucuda kapalı' : 'Off on this server')
                      : enabled ? (lang === 'tr' ? 'Açık' : 'On') : (lang === 'tr' ? 'Kapalı' : 'Off');

                    return (
                      <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        background: enabled ? 'var(--card)' : 'var(--bg-subtle)',
                        borderRadius: 12,
                        border: `1px solid ${enabled ? 'var(--border)' : 'var(--border-soft)'}`,
                        opacity: enabled ? 1 : 0.7,
                        transition: 'all 0.15s ease',
                      }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {info.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {info.desc}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: enabled ? 'var(--success)' : 'var(--fg-muted)' }}>
                            {statusLabel}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={`${info.label}: ${statusLabel}`}
                            title={available ? undefined : (lang === 'tr'
                              ? 'Modül bu sunucuda yüklenmemiş (Modules__…__Enabled ortam anahtarı). Açmak için sunucu yapılandırması değişmeli.'
                              : 'Module is not loaded on this server (Modules__…__Enabled environment switch).')}
                            disabled={moduleFlagMutation.isPending || !available}
                            onClick={() => moduleFlagMutation.mutate({ key, enabled: !enabled })}
                            style={{
                              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: available ? 'pointer' : 'not-allowed', flexShrink: 0,
                              background: enabled ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border)', position: 'relative', transition: 'background 0.15s',
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 2, left: enabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%',
                              background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>


            {/* Fartai (Ollama) — kategori eşleme, salt-okunur bilgi */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>
                {lang === 'tr' ? 'Fartai (Ollama) — Kategori Eşleme' : 'Fartai (Ollama) — Category Mapping'}
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                {lang === 'tr'
                  ? 'Ürün-kategori eşleme motorunda kullanılır (product-costs moderasyon akışı). Ayrı bir sistem — Aivar ile karıştırılmamalı, yerelde çalışır.'
                  : 'Used by the product-category matching engine (product-costs moderation flow). A separate, locally-run system — not to be confused with Aivar.'}
              </p>
              <div style={{ display: 'flex', gap: 20, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: 'var(--fg-muted)' }}>Endpoint: </span>
                  <span className="font-mono" style={{ color: 'var(--fg)' }}>localhost:11434</span>
                </div>
                <div>
                  <span style={{ color: 'var(--fg-muted)' }}>Model: </span>
                  <span className="font-mono" style={{ color: 'var(--fg)' }}>llama3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Permissions ───────────────────────────────────────────────────────── */}
        {section === 'permissions' && (
          <div style={{ padding: 24, width: '100%', boxSizing: 'border-box', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {successMsg && (
              <div className="toast-alert success" style={{ marginBottom: 20 }}>
                <Check size={16} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="toast-alert error" style={{ marginBottom: 20 }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Shield size={16} /> {t('settings_page_access_permissions')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>
                  {t('settings_superadmin_always_included')}
                </p>
              </div>
              {permsLoading ? (
                <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 13 }}>{t('loading')}</div>
              ) : (
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>{t('settings_col_page')}</th>
                      {ALL_ROLES.map(role => (
                        <th key={role} style={{ textAlign: 'center', width: 110 }}>{role}</th>
                      ))}
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dynamicPages = getDynamicPageList(t);
                      // Merge DB perms with dynamic navigation items
                      const allPages = dynamicPages.map(dp => {
                        const editKey = permissionKeyFromHref(dp.href);
                        const dbMatch = permsData.find(p => p.pageKey === editKey || p.pageKey === dp.href || p.pageKey === dp.pageKey);
                        return {
                          pageKey: editKey,
                          pageLabel: dp.pageLabel,
                          storedPageLabel: dbMatch?.pageLabel || dp.pageLabel,
                          href: dp.href,
                          allowedRoles: dbMatch?.allowedRoles || 'SuperAdmin,Admin',
                        };
                      });

                      return allPages.map((perm) => {
                        const current = permEdits[perm.pageKey] ?? perm.allowedRoles.split(',').map(r => r.trim());
                        const isDirty = JSON.stringify([...current].sort()) !== JSON.stringify(perm.allowedRoles.split(',').map(r => r.trim()).sort());
                        return (
                          <tr key={perm.href} style={isDirty ? { background: 'rgba(229,37,33,0.05)' } : undefined}>
                            <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span>{perm.pageLabel}</span>
                                <span style={{ fontSize: 10.5, fontWeight: 650, color: 'var(--fg-muted)' }}>{perm.href} · {perm.pageKey}</span>
                              </div>
                            </td>
                            {ALL_ROLES.map(role => {
                              const isLocked = role === 'SuperAdmin';
                              const isOn = current.includes(role);
                              return (
                                <td key={role} style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isOn}
                                    disabled={isLocked}
                                    onClick={() => togglePermRole(perm.pageKey, role, current)}
                                    className={`role-chip ${isOn ? 'on' : ''} ${isLocked ? 'locked' : ''}`}
                                    title={isLocked ? t('settings_superadmin_always_included') : undefined}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 10,
                                      border: isOn ? 'none' : '1px solid var(--border)',
                                      background: isLocked ? 'rgba(229,37,33,0.12)' : isOn ? 'linear-gradient(135deg, #e52521, #c01f1b)' : 'var(--bg-subtle)',
                                      color: isLocked ? '#e52521' : isOn ? '#fff' : 'var(--fg-muted)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: isLocked ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {isLocked ? <Lock size={13} /> : isOn ? <Check size={14} /> : <Plus size={12} style={{ opacity: 0.3 }} />}
                                  </button>
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center' }}>
                              {isDirty && (
                                <button
                                  onClick={() => permMutation.mutate({ pageKey: perm.pageKey, roles: current, pageLabel: perm.storedPageLabel })}
                                  disabled={permMutation.isPending}
                                  className="row-save-btn"
                                >
                                  <Save size={11} /> {t('save')}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Modül Erişimi — rol yerine üye (kullanıcı) bazlı (Modern Redesign) ─────────────────── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginTop: 20 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Users size={16} /> {lang === 'tr' ? 'Modül Erişimi (Kullanıcı Bazlı)' : 'Module Access (User Based)'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>
                  {lang === 'tr'
                    ? 'Workspaces ve modüller için belirli üyelere (kullanıcılara) doğrudan özel erişim izni tanımlayın.'
                    : 'Grant direct module access permissions to specific users.'}
                </p>
              </div>

              {moduleAccessLoading || usersLoading ? (
                <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 13 }}>{t('loading')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: 20 }}>
                  {moduleAccessData.filter((m) => grantableKeys.has(m.moduleKey.toLowerCase())).map((m) => {
                    const moduleKey = m.moduleKey;
                    const label = moduleCatalog.find(moduleKey)?.displayName
                      ?? (moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1));
                    const selected = moduleAccessEdits[moduleKey] ?? [];
                    const original = m.userIds ?? [];
                    const isDirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...original].sort());
                    const searchTerm = (moduleSearch[moduleKey] || '').toLowerCase();

                    const filteredUsers = usersList.filter((u) => {
                      if (!searchTerm) return true;
                      const full = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase();
                      return full.includes(searchTerm);
                    });

                    return (
                      <div key={moduleKey} style={{
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        background: 'var(--card)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Shield size={14} style={{ color: '#e52521' }} />
                            {label}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: selected.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-subtle)',
                            color: selected.length > 0 ? 'var(--success)' : 'var(--fg-muted)',
                          }}>
                            {selected.length} {lang === 'tr' ? 'üye yetkili' : 'members'}
                          </span>
                        </div>

                        {usersList.length > 4 && (
                          <div style={{ position: 'relative' }}>
                            <Search size={12} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--fg-muted)' }} />
                            <input
                              type="text"
                              placeholder={lang === 'tr' ? 'Kullanıcı ara...' : 'Search user...'}
                              value={moduleSearch[moduleKey] || ''}
                              onChange={(e) => setModuleSearch(p => ({ ...p, [moduleKey]: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '5px 8px 5px 26px',
                                fontSize: 11.5,
                                borderRadius: 8,
                                border: '1px solid var(--border-soft)',
                                background: 'var(--bg-subtle)',
                                color: 'var(--fg)',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}

                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
                          {filteredUsers.map((u) => {
                            const checked = selected.includes(u.id);
                            return (
                              <div
                                key={u.id}
                                onClick={() => toggleModuleAccessUser(moduleKey, u.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '7px 10px',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                  background: checked ? 'rgba(229,37,33,0.06)' : 'var(--bg-subtle)',
                                  border: `1px solid ${checked ? 'rgba(229,37,33,0.2)' : 'transparent'}`,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                  <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                                    {userInitials(u)}
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                                  </span>
                                </div>
                                <div style={{
                                  width: 32,
                                  height: 18,
                                  borderRadius: 99,
                                  background: checked ? 'linear-gradient(135deg, #e52521, #c01f1b)' : 'var(--border)',
                                  position: 'relative',
                                  transition: 'all 0.2s ease',
                                  flexShrink: 0,
                                }}>
                                  <div style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: 2,
                                    left: checked ? 16 : 2,
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {isDirty && (
                          <button
                            onClick={() => moduleAccessMutation.mutate({ moduleKey, userIds: selected })}
                            disabled={moduleAccessMutation.isPending}
                            className="row-save-btn"
                            style={{ alignSelf: 'flex-end', marginTop: 4 }}
                          >
                            <Save size={11} /> {t('save')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Users ─────────────────────────────────────────────────────────────── */}
        {section === 'users' && (isSuperAdmin || isAdmin) && (
          <div style={{ padding: 24, width: '100%', boxSizing: 'border-box', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {successMsg && <div className="toast-alert success" style={{ marginBottom: 16 }}><Check size={16} /> {successMsg}</div>}
            {errorMsg   && <div className="toast-alert error"   style={{ marginBottom: 16 }}><AlertCircle size={16} /> {errorMsg}</div>}

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Users size={16} /> {t('settings_system_users')}
                </h2>
                <button onClick={() => { setShowAddUser(true); setAddUserErr(''); setNewEmail(''); setNewPass(''); setNewFirst(''); setNewLast(''); setNewRoleIds([]); }} className="btn-primary" style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}>
                  <Plus size={14} /> {t('settings_new_user')}
                </button>
              </div>

              {usersLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>{t('loading')}</div>
              ) : (
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>{t('settings_col_user')}</th>
                      <th>{t('settings_col_roles')}</th>
                      <th>{t('settings_col_assign_remove_role')}</th>
                      <th>{t('settings_col_company_email')}</th>
                      <th style={{ textAlign: 'center', width: 160 }}>{t('settings_col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} style={{ opacity: u.isActive === false ? 0.55 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar">{userInitials(u)}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : t('settings_unnamed')}</div>
                              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{u.email}{u.isActive === false && <span style={{ color: 'var(--danger)', marginLeft: 6, fontWeight: 700 }}>· {t('settings_inactive')}</span>}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {u.roles.map((r) => (
                              <span key={r.id} className={roleBadgeClass(r.name)}>{r.name}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {rolesList.map((role) => {
                              const has = u.roles.some((userRole) => userRole.id === role.id);
                              return (
                                <button key={role.id} onClick={() => has ? removeRoleMutation.mutate({ userId: u.id, roleId: role.id }) : assignRoleMutation.mutate({ userId: u.id, roleId: role.id })}
                                  style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, cursor: 'pointer', border: '1px solid', background: has ? 'var(--accent-soft)' : 'var(--bg-subtle)', color: has ? 'var(--accent)' : 'var(--fg-muted)', borderColor: has ? 'var(--accent)' : 'var(--border)' }}>
                                  {has ? '✓ ' : '+ '}{role.name}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {
                              // Inline edit for company email
                              editingCompanyEmail[u.id] !== undefined ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <input
                                    value={editingCompanyEmail[u.id]}
                                    onChange={e => setEditingCompanyEmail(p => ({ ...p, [u.id]: e.target.value }))}
                                    onKeyDown={async e => {
                                      if (e.key === 'Enter') {
                                        await setCompanyEmailMutation.mutateAsync({ id: u.id, companyEmail: editingCompanyEmail[u.id] || null });
                                        setEditingCompanyEmail(p => { const n = { ...p }; delete n[u.id]; return n; });
                                      }
                                      if (e.key === 'Escape') setEditingCompanyEmail(p => { const n = { ...p }; delete n[u.id]; return n; });
                                    }}
                                    placeholder={t('settings_email_placeholder_example')}
                                    autoFocus
                                    style={{ fontSize: 12, padding: '5px 9px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--card-hover)', color: 'var(--fg)', outline: 'none', width: 180 }}
                                  />
                                  <button
                                    onClick={async () => {
                                      await setCompanyEmailMutation.mutateAsync({ id: u.id, companyEmail: editingCompanyEmail[u.id] || null });
                                      setEditingCompanyEmail(p => { const n = { ...p }; delete n[u.id]; return n; });
                                    }}
                                    style={{ padding: '5px 9px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                                  >✓</button>
                                  <button
                                    onClick={() => setEditingCompanyEmail(p => { const n = { ...p }; delete n[u.id]; return n; })}
                                    style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 11 }}
                                  >✕</button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => setEditingCompanyEmail(p => ({ ...p, [u.id]: u.companyEmail ?? '' }))}
                                  title={t('settings_click_to_edit')}
                                  style={{ fontSize: 12, color: u.companyEmail ? 'var(--accent)' : 'var(--fg-muted)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: '1px dashed var(--border-soft)', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'background 0.12s', width: 'fit-content' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {u.companyEmail ? u.companyEmail : <span style={{ fontStyle: 'italic' }}>+ {t('settings_inline_add')}</span>}
                                </div>
                              )
                            }
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button onClick={() => { setEditUserModal({ id: u.id, email: u.email, firstName: u.firstName ?? '', lastName: u.lastName ?? '', companyEmail: u.companyEmail ?? '' }); setEditUserErr(''); }}
                              className="btn-secondary" style={{ height: 'auto', padding: '5px 10px', fontSize: 11.5, gap: 5 }}>
                              <Pencil size={12} /> {lang === 'tr' ? 'Düzenle' : 'Edit'}
                            </button>
                            <button onClick={() => { setPwModal({ userId: u.id, email: u.email }); setNewPw(''); setOldPw(''); setConfirmPw(''); setPwErr(''); }}
                              className="btn-secondary" style={{ height: 'auto', padding: '5px 10px', fontSize: 11.5, gap: 5 }}>
                              <Key size={12} /> {t('settings_password_button')}
                            </button>
                            {u.id !== user?.id && (
                              <button onClick={() => toggleActiveMutation.mutate(u.id)} disabled={toggleActiveMutation.isPending}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 10px', border: '1px solid', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, background: u.isActive === false ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: u.isActive === false ? 'var(--success)' : 'var(--danger)', borderColor: u.isActive === false ? 'var(--success)' : 'var(--danger)' }}>
                                {u.isActive === false ? <><UserCheck size={12}/> {t('settings_active')}</> : <><UserX size={12}/> {t('settings_inactive')}</>}
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button onClick={() => setDeleteConfirmUser({ id: u.id, email: u.email })}
                                style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', color: 'var(--danger)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>
                                {t('delete')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add user modal */}
            {showAddUser && (
              <div className="modal-overlay">
                <div className="modal-card" style={{ width: 420 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('settings_new_user')}</h3>
                    <button onClick={() => setShowAddUser(false)} style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                      <X size={18} />
                    </button>
                  </div>
                  {addUserErr && (
                    <div className="toast-alert error" style={{ padding: '8px 12px', fontSize: 12.5, marginBottom: 8 }}>
                      <AlertCircle size={14} /> {addUserErr}
                    </div>
                  )}
                  {[
                    { label: t('settings_field_email'), value: newEmail, set: setNewEmail, type: 'email', Icon: Mail },
                    { label: t('settings_field_password'),   value: newPass,  set: setNewPass,  type: 'password', Icon: Lock },
                    { label: t('settings_field_first_name'),        value: newFirst, set: setNewFirst, type: 'text', Icon: User },
                    { label: t('settings_field_last_name'),     value: newLast,  set: setNewLast,  type: 'text', Icon: User },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label className="field-label">{f.label}</label>
                      <div className="field-input-wrap">
                        <span className="field-icon"><f.Icon size={14} /></span>
                        <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className="field-input" placeholder={f.label} />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {rolesList.map((r) => {
                      const sel = newRoleIds.includes(r.id);
                      return (
                        <button key={r.id} type="button" onClick={() => setNewRoleIds(prev => sel ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                          style={{ padding: '4px 11px', fontSize: 11, fontWeight: 600, borderRadius: 999, cursor: 'pointer', border: '1px solid', background: sel ? 'var(--accent-soft)' : 'var(--bg-subtle)', color: sel ? 'var(--accent)' : 'var(--fg-muted)', borderColor: sel ? 'var(--accent)' : 'var(--border)' }}>
                          {sel ? '✓ ' : '+ '}{r.name}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => setShowAddUser(false)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
                    <button disabled={createUserMutation.isPending} onClick={handleCreateUser}
                      className="btn-primary" style={{ flex: 1 }}>
                      {createUserMutation.isPending ? t('settings_adding') : t('settings_create')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit User modal */}
            {editUserModal && (
              <div className="modal-overlay">
                <div className="modal-card" style={{ width: 420 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
                      {lang === 'tr' ? 'Kullanıcı Bilgilerini Düzenle' : 'Edit User Information'}
                    </h3>
                    <button onClick={() => setEditUserModal(null)} style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                      <X size={18} />
                    </button>
                  </div>

                  {editUserErr && (
                    <div className="toast-alert error" style={{ padding: '8px 12px', fontSize: 12.5, marginBottom: 8 }}>
                      <AlertCircle size={14} /> {editUserErr}
                    </div>
                  )}

                  {/* E-posta (Giriş e-postası - Değiştirilemez) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('settings_field_email')}</span>
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400 }}>({lang === 'tr' ? 'Giriş e-postası değiştirilemez' : 'Login email is read-only'})</span>
                    </label>
                    <div className="field-input-wrap" style={{ opacity: 0.75, background: 'var(--bg-subtle)' }}>
                      <span className="field-icon"><Mail size={14} /></span>
                      <input type="email" value={editUserModal.email} disabled readOnly className="field-input" style={{ cursor: 'not-allowed' }} />
                    </div>
                  </div>

                  {/* Ad */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="field-label">{t('settings_field_first_name')}</label>
                    <div className="field-input-wrap">
                      <span className="field-icon"><User size={14} /></span>
                      <input
                        type="text"
                        value={editUserModal.firstName}
                        onChange={e => setEditUserModal(p => p ? { ...p, firstName: e.target.value } : null)}
                        className="field-input"
                        placeholder={t('settings_field_first_name')}
                      />
                    </div>
                  </div>

                  {/* Soyad */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="field-label">{t('settings_field_last_name')}</label>
                    <div className="field-input-wrap">
                      <span className="field-icon"><User size={14} /></span>
                      <input
                        type="text"
                        value={editUserModal.lastName}
                        onChange={e => setEditUserModal(p => p ? { ...p, lastName: e.target.value } : null)}
                        className="field-input"
                        placeholder={t('settings_field_last_name')}
                      />
                    </div>
                  </div>

                  {/* Şirket E-postası */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="field-label">{t('settings_col_company_email')}</label>
                    <div className="field-input-wrap">
                      <span className="field-icon"><Mail size={14} /></span>
                      <input
                        type="email"
                        value={editUserModal.companyEmail}
                        onChange={e => setEditUserModal(p => p ? { ...p, companyEmail: e.target.value } : null)}
                        className="field-input"
                        placeholder="ornek@example.com"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button onClick={() => setEditUserModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
                    <button
                      disabled={updateUserMutation.isPending}
                      onClick={() => {
                        if (!editUserModal) return;
                        updateUserMutation.mutate({
                          id: editUserModal.id,
                          firstName: editUserModal.firstName,
                          lastName: editUserModal.lastName,
                          companyEmail: editUserModal.companyEmail || null
                        });
                      }}
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      {updateUserMutation.isPending ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : t('save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password change modal */}
            {pwModal && (() => {
              const isOwnAccount = pwModal.userId === user?.id;
              return (
                <div className="modal-overlay">
                  <div className="modal-card" style={{ width: 400 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('settings_change_password_title')}</h3>
                      <button onClick={() => { setPwModal(null); setNewPw(''); setOldPw(''); setConfirmPw(''); setPwErr(''); }} style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                        <X size={18} />
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
                      {lang === 'tr'
                        ? <><strong>{pwModal.email}</strong> için şifre güncelleme</>
                        : <>Update password for <strong>{pwModal.email}</strong></>}
                    </p>

                    {pwErr && (
                      <div className="toast-alert error" style={{ padding: '8px 12px', fontSize: 12.5, marginBottom: 4 }}>
                        <AlertCircle size={14} /> {pwErr}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {isOwnAccount && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <label className="field-label">{lang === 'tr' ? 'Mevcut Şifre' : 'Current Password'}</label>
                          <div className="field-input-wrap">
                            <span className="field-icon"><Lock size={14} /></span>
                            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} className="field-input" placeholder="••••••••" />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label className="field-label">{lang === 'tr' ? 'Yeni Şifre' : 'New Password'}</label>
                        <div className="field-input-wrap">
                          <span className="field-icon"><Lock size={14} /></span>
                          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="field-input" placeholder="••••••••" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label className="field-label">{lang === 'tr' ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}</label>
                        <div className="field-input-wrap">
                          <span className="field-icon"><Lock size={14} /></span>
                          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="field-input" placeholder="••••••••" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button onClick={() => { setPwModal(null); setNewPw(''); setOldPw(''); setConfirmPw(''); setPwErr(''); }} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
                      <button
                        onClick={() => {
                          setPwErr('');
                          if (isOwnAccount && !oldPw) {
                            setPwErr(lang === 'tr' ? 'Mevcut şifrenizi girin.' : 'Enter your current password.');
                            return;
                          }
                          if (newPw.length < 8) {
                            setPwErr(t('settings_min_8_chars'));
                            return;
                          }
                          if (newPw !== confirmPw) {
                            setPwErr(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.');
                            return;
                          }
                          changePasswordMutation.mutate({
                            id: pwModal.userId,
                            pw: newPw,
                            currentPw: isOwnAccount ? oldPw : undefined
                          });
                        }}
                        disabled={changePasswordMutation.isPending}
                        className="btn-primary"
                        style={{ flex: 1 }}
                      >
                        {changePasswordMutation.isPending ? t('settings_changing') : t('settings_change')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Delete user confirmation modal */}
            {deleteConfirmUser && (
              <div className="modal-overlay">
                <div className="modal-card" style={{ maxWidth: 400, textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
                    {lang === 'tr' ? 'Kullanıcıyı Sil' : 'Delete User'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '10px 0 20px', lineHeight: 1.5 }}>
                    {lang === 'tr'
                      ? <>{<strong>{deleteConfirmUser.email}</strong>} kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</>
                      : <>Are you sure you want to delete {<strong>{deleteConfirmUser.email}</strong>}? This action cannot be undone.</>}
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={() => setDeleteConfirmUser(null)} style={{ height: 36, padding: '0 16px' }}>
                      {t('cancel')}
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        deleteUserMutation.mutate(deleteConfirmUser.id);
                        setDeleteConfirmUser(null);
                      }}
                      style={{ height: 36, padding: '0 16px', background: 'var(--danger)', boxShadow: 'none' }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );

  // Bariyer GERCEKTEN uygulanir. Onceden `needsBarrier` hesaplaniyor, SecureAccessBarrier
  // import ediliyor ama `return inner;` ikisini de atliyordu: Kullanicilar ve Yetkiler
  // panelleri sifre sorulmadan aciliyordu.
  return needsBarrier ? <SecureAccessBarrier>{inner}</SecureAccessBarrier> : inner;
}
