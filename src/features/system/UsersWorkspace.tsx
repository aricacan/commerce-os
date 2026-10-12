'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Users,
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  Trash2,
  Check,
  X,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Lock,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { userApi, type ManagedUser } from '../../lib/api/users';
import { useAuthStore } from '../../stores/auth';
import { queryKeys } from '../../lib/query-keys';
import { toast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';
import { Select, type SelectOption } from '../../components/ui/Select';
import { UserNotificationPreferencesModal } from './UserNotificationPreferencesModal';



function userInitials(u: ManagedUser): string {
  const f = u.firstName?.trim().charAt(0).toUpperCase() || '';
  const l = u.lastName?.trim().charAt(0).toUpperCase() || '';
  if (f || l) return `${f}${l}`;
  return u.email?.slice(0, 2).toUpperCase() || '??';
}

export function UsersWorkspace() {
  const { lang, t } = useI18n();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const isSuperAdmin = currentUser?.roles?.some((r) => r.toLowerCase() === 'superadmin');
  const isAdmin = currentUser?.roles?.some((r) => r.toLowerCase() === 'admin');

  // Arama & Filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal State'leri
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [pwTargetUser, setPwTargetUser] = useState<ManagedUser | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<ManagedUser | null>(null);
  const [rolesModalUser, setRolesModalUser] = useState<ManagedUser | null>(null);
  // Kim hangi bildirimi, hangi kanaldan alacak (bkz. UserNotificationPreferencesModal).
  const [notificationModalUser, setNotificationModalUser] = useState<ManagedUser | null>(null);

  // Form State'leri - Yeni Kullanıcı
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRoleIds, setNewRoleIds] = useState<number[]>([]);

  // Form State'leri - Şifre Değiştir
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Inline Düzenleme - Şirket E-postası
  const [editingCompanyEmailId, setEditingCompanyEmailId] = useState<number | null>(null);
  const [companyEmailValue, setCompanyEmailValue] = useState('');
  const companyEmailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCompanyEmailId !== null && companyEmailInputRef.current) {
      companyEmailInputRef.current.focus();
    }
  }, [editingCompanyEmailId]);

  // ── Queries (Dinamik ve Gerçek Zamanlı) ────────────────────────────────────
  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: queryKeys.system.users,
    queryFn: ({ signal }) => userApi.listWithSignal(signal),
    enabled: Boolean(isSuperAdmin || isAdmin),
    staleTime: 0,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: queryKeys.system.roles,
    queryFn: ({ signal }) => userApi.rolesWithSignal(signal),
    enabled: Boolean(isSuperAdmin || isAdmin),
    staleTime: 0,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: (data: Parameters<typeof userApi.create>[0]) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Kullanıcı oluşturuldu.' : 'User created.');
      setShowAddModal(false);
      resetNewUserForm();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { firstName?: string; lastName?: string; companyEmail?: string | null };
    }) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Kullanıcı güncellendi.' : 'User updated.');
      setEditUser(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız.');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Kullanıcı silindi.' : 'User deleted.');
      setDeleteTargetUser(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Kullanıcı silinemedi.');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => userApi.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(res.message);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Durum değiştirilemedi.');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      userApi.assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Rol atandı.' : 'Role assigned.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Rol atanamadı.');
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      userApi.removeRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Rol kaldırıldı.' : 'Role removed.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Rol kaldırılamadı.');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({
      userId,
      newPw,
      currentPw,
    }: {
      userId: number;
      newPw: string;
      currentPw?: string;
    }) => {
      if (userId === currentUser?.id && currentPw) {
        return userApi.changeMyPassword(currentPw, newPw);
      }
      return userApi.changePassword(userId, newPw);
    },
    onSuccess: (res) => {
      toast.success(res.message || (lang === 'tr' ? 'Şifre güncellendi.' : 'Password updated.'));
      setPwTargetUser(null);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Şifre değiştirilemedi.');
    },
  });

  const setCompanyEmailMutation = useMutation({
    mutationFn: ({ id, email }: { id: number; email: string | null }) =>
      userApi.setCompanyEmail(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.users });
      toast.success(lang === 'tr' ? 'Şirket e-postası kaydedildi.' : 'Company email saved.');
      setEditingCompanyEmailId(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi.');
    },
  });

  function resetNewUserForm() {
    setNewEmail('');
    setNewPassword('');
    setNewFirstName('');
    setNewLastName('');
    setNewRoleIds([]);
  }

  // ── Filtreleme ─────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === 'active' && u.isActive === false) return false;
      if (statusFilter === 'inactive' && u.isActive !== false) return false;

      if (
        selectedRoleFilter !== 'all' &&
        !u.roles.some((r) => r.name.toLowerCase() === selectedRoleFilter.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = u.email.toLowerCase();
        const compEmail = (u.companyEmail || '').toLowerCase();
        const roleNames = u.roles.map((r) => r.name.toLowerCase()).join(' ');

        return (
          fullName.includes(query) ||
          email.includes(query) ||
          compEmail.includes(query) ||
          roleNames.includes(query)
        );
      }

      return true;
    });
  }, [users, statusFilter, selectedRoleFilter, searchQuery]);

  const roleOptions: SelectOption<string>[] = useMemo(() => [
    { value: 'all', label: lang === 'tr' ? 'Tüm Roller' : 'All Roles' },
    ...roles.map((r) => ({ value: r.name, label: r.name })),
  ], [roles, lang]);

  // Yetkisiz Durumu
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-8 shadow-xs">
          <Shield className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {lang === 'tr' ? 'Erişim Kısıtlı' : 'Access Restricted'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {lang === 'tr'
              ? 'Bu sayfayı yalnızca yöneticiler görüntüleyebilir.'
              : 'Only administrators have permission to view this page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-transparent">
      {/* ── Kompakt Üst Kontrol Barı ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Sol: Arama ve Filtreler */}
          <div data-tour="users-search-filters" className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Arama Input */}
            <div className="relative w-64 max-w-full">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'tr' ? 'Kullanıcı ara...' : 'Search users...'}
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

            {/* Durum Segmented Control */}
            <div className="flex items-center rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-0.5">
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`h-6.5 px-2.5 text-[11px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                    statusFilter === s
                      ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {s === 'all'
                    ? lang === 'tr'
                      ? 'Tümü'
                      : 'All'
                    : s === 'active'
                    ? lang === 'tr'
                      ? 'Aktif'
                      : 'Active'
                    : lang === 'tr'
                    ? 'Pasif'
                    : 'Inactive'}
                </button>
              ))}
            </div>

            {/* Tarih Dropdown Stili Rol Filtresi */}
            <Select
              size="sm"
              value={selectedRoleFilter}
              options={roleOptions}
              onChange={(val) => setSelectedRoleFilter(val)}
            />
          </div>

          {/* Sağ: İstatistik & Eylemler */}
          <div data-tour="users-actions" className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400 px-1">
              {filteredUsers.length} {lang === 'tr' ? 'kullanıcı' : 'users'}
            </span>

            <button
              onClick={() => refetchUsers()}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title={lang === 'tr' ? 'Yenile' : 'Refresh'}
            >
              <RotateCcw size={13} className={isFetchingUsers ? 'animate-spin' : ''} />
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  resetNewUserForm();
                  setShowAddModal(true);
                }}
                className="flex h-8 items-center gap-1.5 rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={13} />
                <span>{lang === 'tr' ? 'Yeni Kullanıcı' : 'New User'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tablo Alanı ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div data-tour="users-table" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
          {usersLoading || rolesLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-zinc-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
              <span>{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-1.5" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {lang === 'tr' ? 'Kayıt bulunamadı' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-3.5 py-2.5 min-w-[200px]">
                      {lang === 'tr' ? 'Kullanıcı' : 'User'}
                    </th>
                    <th className="px-3.5 py-2.5 min-w-[160px]">
                      {lang === 'tr' ? 'Roller' : 'Roles'}
                    </th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">
                      {lang === 'tr' ? 'Şirket E-Postası' : 'Company Email'}
                    </th>
                    <th className="px-3.5 py-2.5 text-right min-w-[120px]">
                      {lang === 'tr' ? 'İşlemler' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isInactive = u.isActive === false;

                    return (
                      <tr
                        key={u.id}
                        className={`group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 ${
                          isInactive ? 'opacity-50 bg-zinc-50/50 dark:bg-zinc-900/30' : ''
                        }`}
                      >
                        {/* 1. Kullanıcı */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-[10.5px] font-bold text-zinc-700 dark:text-zinc-300">
                              {userInitials(u)}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                                  isInactive ? 'bg-zinc-400' : 'bg-emerald-500'
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                                  {u.firstName || u.lastName
                                    ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                                    : t('settings_unnamed')}
                                </span>
                                {isSelf && (
                                  <span className="rounded-[2px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.2 text-[9.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                                    {lang === 'tr' ? 'Siz' : 'You'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Roller */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center px-1.5 py-0.5 text-[10.5px] font-medium rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300"
                              >
                                {r.name}
                              </span>
                            ))}

                            {isSuperAdmin && (
                              <button
                                onClick={() => setRolesModalUser(u)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10.5px] font-medium rounded-[2px] border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 transition-colors cursor-pointer"
                                title={lang === 'tr' ? 'Rolleri Yönet' : 'Manage Roles'}
                              >
                                <Plus size={10} />
                                <span>{u.roles.length === 0 ? (lang === 'tr' ? 'Rol Ata' : 'Assign') : ''}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Şirket E-postası */}
                        <td className="px-3.5 py-2.5">
                          {editingCompanyEmailId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                ref={companyEmailInputRef}
                                type="email"
                                value={companyEmailValue}
                                onChange={(e) => setCompanyEmailValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setCompanyEmailMutation.mutate({
                                      id: u.id,
                                      email: companyEmailValue.trim() || null,
                                    });
                                  } else if (e.key === 'Escape') {
                                    setEditingCompanyEmailId(null);
                                  }
                                }}
                                placeholder="ornek@example.com"
                                className="h-6.5 w-36 rounded-[3px] border border-zinc-400 dark:border-zinc-500 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                              />
                              <button
                                onClick={() =>
                                  setCompanyEmailMutation.mutate({
                                    id: u.id,
                                    email: companyEmailValue.trim() || null,
                                  })
                                }
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 cursor-pointer"
                                title="Kaydet"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={() => setEditingCompanyEmailId(null)}
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 cursor-pointer"
                                title="İptal"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCompanyEmailId(u.id);
                                setCompanyEmailValue(u.companyEmail || '');
                              }}
                              className="group/email inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                              title={lang === 'tr' ? 'Düzenlemek için tıkla' : 'Click to edit'}
                            >
                              <Mail size={11} className="text-zinc-400" />
                              <span className={u.companyEmail ? 'font-mono text-[11.5px]' : 'italic text-[11px] text-zinc-400 hover:underline'}>
                                {u.companyEmail || (lang === 'tr' ? '+ E-posta Ekle' : '+ Add Email')}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 4. İşlemler */}
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Düzenle */}
                            <button
                              onClick={() => setEditUser(u)}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                              title={lang === 'tr' ? 'Düzenle' : 'Edit'}
                            >
                              <Pencil size={11} />
                            </button>

                            {/* Şifre */}
                            <button
                              onClick={() => {
                                setPwTargetUser(u);
                                setCurrentPw('');
                                setNewPw('');
                                setConfirmPw('');
                              }}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                              title={lang === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
                            >
                              <KeyRound size={11} />
                            </button>

                            {/* Bildirim tercihleri */}
                            <button
                              onClick={() => setNotificationModalUser(u)}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                              title={lang === 'tr' ? 'Bildirim Tercihleri' : 'Notification Preferences'}
                            >
                              <Bell size={11} />
                            </button>

                            {/* Aktif / Pasif */}
                            {isSuperAdmin && !isSelf && (
                              <button
                                onClick={() => toggleActiveMutation.mutate(u.id)}
                                disabled={toggleActiveMutation.isPending}
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                title={
                                  isInactive
                                    ? lang === 'tr'
                                      ? 'Hesabı Aktif Et'
                                      : 'Activate'
                                    : lang === 'tr'
                                    ? 'Hesabı Devre Dışı Bırak'
                                    : 'Deactivate'
                                }
                              >
                                {isInactive ? <UserCheck size={11} /> : <UserX size={11} />}
                              </button>
                            )}

                            {/* Sil */}
                            {isSuperAdmin && !isSelf && (
                              <button
                                onClick={() => setDeleteTargetUser(u)}
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-500 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title={lang === 'tr' ? 'Kullanıcıyı Sil' : 'Delete'}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Bildirim Tercihleri ─────────────────────────────────────── */}
      {notificationModalUser && (
        <UserNotificationPreferencesModal
          userId={notificationModalUser.id}
          email={notificationModalUser.email}
          lang={lang === 'tr' ? 'tr' : 'en'}
          onClose={() => setNotificationModalUser(null)}
        />
      )}

      {/* ── MODAL: Rol Yönetimi ────────────────────────────────────────────── */}
      {rolesModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div>
                <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {lang === 'tr' ? 'Rolleri Yönet' : 'Manage Roles'}
                </h2>
                <p className="text-[11px] text-zinc-500 truncate max-w-[240px]">
                  {rolesModalUser.email}
                </p>
              </div>
              <button
                onClick={() => setRolesModalUser(null)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <div className="space-y-1.5 py-1">
              {roles.map((role) => {
                const hasRole = rolesModalUser.roles.some((ur) => ur.id === role.id);
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      if (hasRole) {
                        removeRoleMutation.mutate({
                          userId: rolesModalUser.id,
                          roleId: role.id,
                        });
                        setRolesModalUser((prev) =>
                          prev
                            ? { ...prev, roles: prev.roles.filter((r) => r.id !== role.id) }
                            : null
                        );
                      } else {
                        assignRoleMutation.mutate({
                          userId: rolesModalUser.id,
                          roleId: role.id,
                        });
                        setRolesModalUser((prev) =>
                          prev ? { ...prev, roles: [...prev.roles, role] } : null
                        );
                      }
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-[3px] border cursor-pointer transition-colors ${
                      hasRole
                        ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <span className="text-xs">{role.name}</span>
                    <div
                      className={`h-4 w-4 rounded-[2px] border flex items-center justify-center text-[10px] ${
                        hasRole
                          ? 'border-zinc-700 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600'
                          : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      {hasRole && <Check size={10} strokeWidth={2.5} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setRolesModalUser(null)}
                className="h-7.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {lang === 'tr' ? 'Tamam' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Yeni Kullanıcı Ekle ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <UserPlus size={13} />
                </span>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {lang === 'tr' ? 'Yeni Kullanıcı Ekle' : 'Add New User'}
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEmail || !newPassword) {
                  toast.error(lang === 'tr' ? 'E-posta ve şifre zorunludur.' : 'Email and password required.');
                  return;
                }
                if (newPassword.length < 8) {
                  toast.error(lang === 'tr' ? 'Şifre en az 8 karakter olmalıdır.' : 'Password min 8 chars.');
                  return;
                }
                createUserMutation.mutate({
                  email: newEmail.trim(),
                  password: newPassword,
                  firstName: newFirstName.trim() || undefined,
                  lastName: newLastName.trim() || undefined,
                  roleIds: newRoleIds.length > 0 ? newRoleIds : undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'E-posta Adresi *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="kullanici@example.com"
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 pl-8 pr-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Şifre * (Min. 8 Karakter)' : 'Password * (Min. 8 Chars)'}
                </label>
                <div className="relative">
                  <Lock
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 pl-8 pr-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                    {lang === 'tr' ? 'Ad' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ahmet"
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                    {lang === 'tr' ? 'Soyad' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Yılmaz"
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1.5">
                  {lang === 'tr' ? 'Roller' : 'Roles'}
                </label>
                <div className="flex flex-wrap gap-1">
                  {roles.map((r) => {
                    const isSelected = newRoleIds.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() =>
                          setNewRoleIds((prev) =>
                            isSelected ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-zinc-400 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✓' : '+'} {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="h-8 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-zinc-800 dark:bg-zinc-700 px-4 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors cursor-pointer shadow-xs"
                >
                  {createUserMutation.isPending
                    ? lang === 'tr'
                      ? 'Oluşturuluyor...'
                      : 'Creating...'
                    : lang === 'tr'
                    ? 'Kullanıcı Oluştur'
                    : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Kullanıcı Düzenle ───────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <Pencil size={13} />
                </span>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {lang === 'tr' ? 'Kullanıcı Bilgilerini Düzenle' : 'Edit User Info'}
                </h2>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  id: editUser.id,
                  data: {
                    firstName: editUser.firstName?.trim() || '',
                    lastName: editUser.lastName?.trim() || '',
                    companyEmail: editUser.companyEmail?.trim() || null,
                  },
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Giriş E-postası (Salt Okunur)' : 'Login Email (Read-only)'}
                </label>
                <input
                  type="email"
                  disabled
                  value={editUser.email}
                  className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3 text-xs text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                    {lang === 'tr' ? 'Ad' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={editUser.firstName || ''}
                    onChange={(e) =>
                      setEditUser((prev) => (prev ? { ...prev, firstName: e.target.value } : null))
                    }
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                    {lang === 'tr' ? 'Soyad' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={editUser.lastName || ''}
                    onChange={(e) =>
                      setEditUser((prev) => (prev ? { ...prev, lastName: e.target.value } : null))
                    }
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Şirket E-postası' : 'Company Email'}
                </label>
                <input
                  type="email"
                  value={editUser.companyEmail || ''}
                  onChange={(e) =>
                    setEditUser((prev) =>
                      prev ? { ...prev, companyEmail: e.target.value } : null
                    )
                  }
                  placeholder="ornek@example.com"
                  className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="h-8 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="h-8 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-zinc-800 dark:bg-zinc-700 px-4 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors cursor-pointer shadow-xs"
                >
                  {updateUserMutation.isPending
                    ? lang === 'tr'
                      ? 'Kaydediliyor...'
                      : 'Saving...'
                    : lang === 'tr'
                    ? 'Kaydet'
                    : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Şifre Değiştir ───────────────────────────────────────────── */}
      {pwTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <KeyRound size={13} />
                </span>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {lang === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
                </h2>
              </div>
              <button
                onClick={() => setPwTargetUser(null)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-800 dark:text-zinc-200">{pwTargetUser.email}</strong>{' '}
              {lang === 'tr'
                ? 'için yeni şifre belirleyin.'
                : 'set a new password.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pwTargetUser.id === currentUser?.id && !currentPw) {
                  toast.error(lang === 'tr' ? 'Mevcut şifrenizi girmelisiniz.' : 'Current password required.');
                  return;
                }
                if (newPw.length < 8) {
                  toast.error(lang === 'tr' ? 'Yeni şifre en az 8 karakter olmalıdır.' : 'Min 8 chars.');
                  return;
                }
                if (newPw !== confirmPw) {
                  toast.error(lang === 'tr' ? 'Şifreler birbiriyle eşleşmiyor.' : 'Passwords do not match.');
                  return;
                }

                changePasswordMutation.mutate({
                  userId: pwTargetUser.id,
                  newPw,
                  currentPw: pwTargetUser.id === currentUser?.id ? currentPw : undefined,
                });
              }}
              className="space-y-3"
            >
              {pwTargetUser.id === currentUser?.id && (
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                    {lang === 'tr' ? 'Mevcut Şifreniz *' : 'Current Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Yeni Şifre * (En az 8 Karakter)' : 'New Password * (Min 8 Chars)'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Yeni Şifre Tekrar *' : 'Confirm Password *'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className="h-8 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPwTargetUser(null)}
                  className="h-8 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="h-8 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-zinc-800 dark:bg-zinc-700 px-4 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors cursor-pointer shadow-xs"
                >
                  {changePasswordMutation.isPending
                    ? lang === 'tr'
                      ? 'Güncelleniyor...'
                      : 'Updating...'
                    : lang === 'tr'
                    ? 'Şifreyi Güncelle'
                    : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Kullanıcı Sil Onayı ─────────────────────────────────────── */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-3.5">
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {lang === 'tr' ? 'Kullanıcıyı Sil' : 'Delete User'}
            </h2>

            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-800 dark:text-zinc-200">{deleteTargetUser.email}</strong>{' '}
              {lang === 'tr'
                ? 'kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz?'
                : 'are you sure you want to permanently delete this user?'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="h-7.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(deleteTargetUser.id)}
                className="h-7.5 rounded-[3px] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
              >
                {deleteUserMutation.isPending
                  ? lang === 'tr'
                    ? 'Siliniyor...'
                    : 'Deleting...'
                  : lang === 'tr'
                  ? 'Sil'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
