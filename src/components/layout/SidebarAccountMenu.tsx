'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChevronUp, LogOut, UserCog } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../lib/i18n';
import { text } from '../../features/shared/design';

const AccountModal = dynamic(() => import('./AccountModal').then((m) => m.AccountModal), { ssr: false });

// Hesap bölümü Topbar'ın sağ üstünden buraya, kenar çubuğunun en altına taşındı:
// masaüstünde tek bir "kimlik" köşesi olsun diye. Mobilde Topbar menüsü aynen duruyor —
// orada uygulamalar/bildirim/tema gibi mobile özel satırlar da aynı menüde yaşıyor.

const AVATAR_SIZE = 26;
const ROW_HEIGHT = 34;

interface Props {
  /** Kapalı kenar çubuğunda yalnızca avatar gösterilir. */
  expanded: boolean;
}

export function SidebarAccountMenu({ expanded }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  const avatarUrl = avatarOverride === undefined ? user?.profilePhotoUrl ?? null : avatarOverride;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const displayName = fullName || user?.email.split('@')[0] || '';
  const initial = (displayName[0] || 'E').toUpperCase();

  const handleSaveAvatar = async (url: string | null) => {
    await authApi.updateProfilePhoto(url);
    setAvatarOverride(url);
  };

  async function handleLogout() {
    // Backend refresh token'ı sunucuda iptal eder ve HttpOnly cookie'yi siler (JS silemez).
    await authApi.logout().catch(() => {});
    logout();
    router.replace('/login');
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        title={expanded ? undefined : displayName}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: ROW_HEIGHT,
          width: '100%',
          padding: expanded ? '0 8px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 6,
          border: 'none',
          background: menuOpen ? 'var(--card-hover)' : 'transparent',
          fontSize: text.sm,
          fontWeight: 500,
          color: 'var(--sidebar-fg-muted)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = menuOpen ? 'var(--card-hover)' : 'transparent'; }}
      >
        <Avatar url={avatarUrl} initial={initial} />
        {expanded && (
          <>
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <ChevronUp size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
          </>
        )}
      </button>

      {menuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              left: 0,
              bottom: 'calc(100% + 6px)',
              minWidth: 210,
              background: 'var(--card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 6,
              boxShadow: 'var(--shadow-md)',
              zIndex: 20,
              padding: 4,
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-soft)', marginBottom: 4 }}>
              <p style={{ fontSize: text.md, fontWeight: 600, color: 'var(--fg)' }}>{displayName}</p>
              <p style={{ fontSize: text.xs, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email ?? ''}
              </p>
              <span
                style={{
                  display: 'inline-block', marginTop: 6,
                  padding: '2px 8px',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  borderRadius: 99, fontSize: text['2xs'], fontWeight: 600,
                }}
              >
                {user?.roles?.[0] || t('topbar_user_role')}
              </span>
            </div>

            <MenuRow
              Icon={UserCog}
              label={t('nav_system_account')}
              onClick={() => { setMenuOpen(false); setAccountModalOpen(true); }}
            />
            <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
            <MenuRow Icon={LogOut} label={t('logout')} tone="accent" onClick={handleLogout} />
          </div>
        </>
      )}

      {accountModalOpen && (
        <AccountModal
          isOpen
          onClose={() => setAccountModalOpen(false)}
          avatarUrl={avatarUrl}
          onSaveAvatar={handleSaveAvatar}
        />
      )}
    </div>
  );
}

function Avatar({ url, initial }: { url: string | null; initial: string }) {
  const base = {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: text.xs, fontWeight: 700, color: '#fff', flexShrink: 0,
  } as const;

  // next/image BU VAKAYI karşılamıyor: avatar ya data: URI ya da önceden bilinmeyen bir
  // dış alan adı olabiliyor; yapılandırılmamış uzak alan adında hata fırlatırdı.
  if (url && (url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/'))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={initial} style={{ ...base, objectFit: 'cover', boxShadow: 'var(--shadow-xs)' }} />;
  }

  return <div style={{ ...base, background: url ?? '#2563eb' }}>{initial}</div>;
}

function MenuRow({
  Icon,
  label,
  onClick,
  tone = 'default',
}: {
  Icon: typeof UserCog;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
}) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--fg)';
  const hoverBg = tone === 'accent' ? 'var(--accent-soft)' : 'var(--bg-subtle)';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px',
        background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', color, fontSize: text.md, fontWeight: 500, textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
