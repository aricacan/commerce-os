'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AuditLogEntryDto } from '../../../lib/api';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { useSecurityLog } from '../../../hooks/monitoring/useMonitoring';
import { formatStamp } from '../format';
import { Pager, Panel, Pill, QueryStatus, TD_CLASS, TH_CLASS, type PillTone } from '../ui';

const PAGE_SIZE = 50;

// Sunucu `action` süzgecini ÖNEK olarak uygular: "LoginSucceeded" 2FA'lı girişi,
// "PermissionDenied" hem gerçek reddi hem gölge (yalnız kayıt) reddini de getirir.
const FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'LoginFailed', label: 'Başarısız giriş' },
  { value: 'LoginSucceeded', label: 'Giriş' },
  { value: 'Logout', label: 'Çıkış' },
  { value: 'PermissionDenied', label: 'İzin reddi' },
];

// Denetim eylem adları → Türkçe. Listede olmayan eylem ham adıyla görünür.
const ACTION_LABELS: Record<string, string> = {
  LoginFailed: 'Başarısız giriş',
  LoginSucceeded: 'Giriş',
  LoginSucceeded_TwoFactor: 'Giriş (2FA)',
  LoginTwoFactorRequired: '2FA kodu istendi',
  LoginRejected_PartnerRole: 'Giriş reddedildi (iş ortağı rolü)',
  Logout: 'Çıkış',
  PermissionDenied: 'İzin reddi',
  PermissionDenied_Shadow: 'İzin reddi (yalnız kayıt)',
  ChangePassword: 'Şifre değiştirildi',
  ChangeMyPassword: 'Kendi şifresini değiştirdi',
  PasswordResetSucceeded: 'Şifre sıfırlandı',
  ForgotPasswordEmailSent: 'Şifre sıfırlama e-postası',
  ForgotPasswordUnknownEmail: 'Bilinmeyen e-postayla şifre sıfırlama',
  CreateUser: 'Kullanıcı eklendi',
  UpdateUser: 'Kullanıcı güncellendi',
  DeleteUser: 'Kullanıcı silindi',
  ToggleActive: 'Kullanıcı aç/kapa',
  AssignRole: 'Rol atandı',
  RemoveRole: 'Rol kaldırıldı',
  RoleCreated: 'Rol oluşturuldu',
  RoleUpdated: 'Rol güncellendi',
  RoleDeleted: 'Rol silindi',
  RolePermissionsChanged: 'Rol izinleri değişti',
  UpdatePagePermission: 'Sayfa izni değişti',
  SetModuleAccess: 'Modül erişimi değişti',
};

const SEVERITY: Record<AuditLogEntryDto['severity'], { tone: PillTone; label: string }> = {
  Info: { tone: 'muted', label: 'Bilgi' },
  Warning: { tone: 'warning', label: 'Uyarı' },
  Critical: { tone: 'danger', label: 'Kritik' },
};

// Eylem ikinci sütunda: dar ekranda kaydırmadan görünen kısım "ne zaman, ne oldu" olsun.
const COLUMNS = ['Zaman', 'Eylem', 'Kullanıcı', 'IP', 'Önem'];

// Güvenlik izi: giriş/çıkış, başarısız deneme, izin reddi, rol ve kullanıcı değişimi.
// Ham EF_* satır değişiklikleri sunucuda dışlanır — bu ekran "kim sisteme dokundu"yu anlatır.
export function SecurityTab() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const log = useSecurityLog({ action: action || undefined, page, pageSize: PAGE_SIZE });
  const items = log.data?.items ?? [];

  const changeAction = (next: string) => { setAction(next); setPage(1); };

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl size="sm" value={action} options={FILTERS} onChange={changeAction} />
      </div>

      <Panel>
        <QueryStatus
          isLoading={log.isLoading}
          isError={log.isError}
          isEmpty={items.length === 0}
          onRetry={() => log.refetch()}
          emptyIcon={ShieldCheck}
          emptyTitle="Kayıt yok"
          emptyDescription={action ? 'Bu türde güvenlik olayı kaydedilmemiş.' : 'Henüz güvenlik olayı kaydedilmemiş.'}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  {COLUMNS.map((column) => <th key={column} className={TH_CLASS}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => <SecurityRow key={entry.id} entry={entry} />)}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} totalCount={log.data?.totalCount ?? 0} onChange={setPage} />
        </QueryStatus>
      </Panel>
    </div>
  );
}

function SecurityRow({ entry }: { entry: AuditLogEntryDto }) {
  const severity: { tone: PillTone; label: string } = SEVERITY[entry.severity] ?? { tone: 'muted', label: entry.severity };
  return (
    <tr className="hover:bg-[var(--bg-subtle)]">
      <td className={`${TD_CLASS} text-[var(--fg-muted)]`}>{formatStamp(entry.createdAt)}</td>
      <td className={`${TD_CLASS} font-semibold`} title={entry.action}>{ACTION_LABELS[entry.action] ?? entry.action}</td>
      <td className={TD_CLASS}>{entry.userEmail ?? '—'}</td>
      <td className={`${TD_CLASS} font-mono text-[var(--fg-muted)]`}>{entry.ipAddress ?? '—'}</td>
      <td className={TD_CLASS}>
        <Pill tone={severity.tone}>{severity.label}</Pill>
      </td>
    </tr>
  );
}
