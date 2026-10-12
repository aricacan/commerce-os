'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authApi } from '../../lib/api';
import { isTwoFactorChallenge, type LoginSuccess } from '../../lib/api/auth';
import { twoFactorApi } from '../../lib/api/two-factor';
import { useAuthStore } from '../../stores/auth';
import { landingPathFor } from '../../lib/system-admin';
import { useI18n } from '../../lib/i18n';
import { subscribeToPush } from '../../lib/push';
import { useWelcomeToast } from '../../stores/welcome-toast';
import { loginErrorKey } from '../../lib/login-error';
import { IS_DEMO, DEMO_USER } from '../../lib/demo/config';
import { DemoLoginScreen } from '../../components/demo/DemoLoginScreen';

export default function LoginPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user, isLoading, login, initFromStorage } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  useEffect(() => { initFromStorage(); }, [initFromStorage]);
  useEffect(() => { if (!isLoading && user) router.replace(landingPathFor(user.roles)); }, [user, isLoading, router]);

  // Girisin ikinci adimi. challengeToken doluysa parola dogrulandi ama 2FA bekleniyor.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  /** Token alindiktan sonraki ortak akis — iki giris yolu da buradan geciyor. */
  function completeSignIn(data: LoginSuccess) {
    login(data.user, data.accessToken);
      // Her login'de büyük sağ-alt karşılama toast'ı (bkz. WelcomeToast). Redirect'te bu sayfa
      // unmount olacağından global store üzerinden işaretlenir. Ad yoksa e-postaya düşer.
      useWelcomeToast.getState().show(data.user.firstName || data.user.email);
      // Girişte otomatik push izni istenir (kullanıcı talebi: "herkeste oto açık olsun,
      // isterlerse kapasınlar") — tarayıcı zaten daha önce izin verildiyse/reddedildiyse
      // sessizce hiçbir UI göstermeden karar tekrarlanır, spam riski yok. Redirect'i
      // bekletmemek için sonucunu beklemiyoruz (fire-and-forget).
      subscribeToPush().catch(() => {});
      router.replace(landingPathFor(data.user.roles));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await authApi.login(email, password);

      // Yanit IKI SEKILDEN biri: token ya da 2FA meydan okumasi. Tek sekil varsaymak,
      // 2FA acan kullanicinin BIR DAHA GIREMEMESI demekti.
      if (isTwoFactorChallenge(result)) {
        setChallengeToken(result.challengeToken);
        setTwoFactorCode('');
        return;
      }

      completeSignIn(result);
    } catch (err) {
      setError(t(loginErrorKey(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoStart() {
    setSubmitting(true);
    try {
      completeSignIn(await authApi.login(DEMO_USER.email, 'demo') as LoginSuccess);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;

    setError('');
    setSubmitting(true);
    try {
      // Kurtarma kodu da kabul edilir; bu yuzden yalnizca rakama INDIRGEMIYORUZ.
      completeSignIn(await twoFactorApi.completeLogin(challengeToken, twoFactorCode.trim()));
    } catch {
      // Meydan okuma 5 dk sonra duser; kullanici bastan giris yapmali.
      setError(t('login_2fa_error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (IS_DEMO) return <DemoLoginScreen submitting={submitting} onStart={handleDemoStart} />;

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      padding: '24px 16px',
    }}>
      {/* Background Image & Scrim Overlay */}
      <div className="login-bg-overlay" />

      {/* Main Content Area: Centered Login Card */}
      <div className="login-card-container" style={{ zIndex: 10 }}>
        <div className="login-card" style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: '20px',
          transition: 'all 0.3s ease',
        }}>
          {/* Header Typography */}
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
              {t('login_submit')}
            </h2>
            <p style={{ fontSize: 13, opacity: 0.8, lineHeight: '1.5', margin: 0 }}>
              {t('login_subtitle')}
            </p>
          </div>

          {/* 2FA adimi: parola dogrulandi, token HENUZ verilmedi. Bu ekran olmadan 2FA acan
              kullanici bir daha giris YAPAMAZDI. */}
          {challengeToken ? (
            <form onSubmit={handleTwoFactorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('login_2fa_title')}
                </label>
                <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 10px' }}>{t('login_2fa_hint')}</p>
                <input
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--fg)',
                    fontSize: 16,
                    outline: 'none',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {error && <p style={{ color: '#e11d48', fontSize: 12, margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting || !twoFactorCode.trim()}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !twoFactorCode.trim() ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? t('login_loading') : t('login_2fa_submit')}
              </button>

              <button
                type="button"
                onClick={() => { setChallengeToken(null); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: 12, opacity: 0.7, cursor: 'pointer' }}
              >
                {t('login_submit')}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {t('login_email')}
              </label>
              <input
                type="email"
                value={email}
                required
                autoComplete="email"
                placeholder="ornek@sirket.com"
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-subtle)',
                  border: `1px solid ${focused === 'email' ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  color: 'var(--fg)',
                  fontSize: 14,
                  outline: 'none',
                  boxShadow: focused === 'email' ? '0 0 0 3px var(--accent-soft)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {t('login_password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '64px',
                    background: 'var(--bg-subtle)',
                    border: `1px solid ${focused === 'password' ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    color: 'var(--fg)',
                    fontSize: 14,
                    outline: 'none',
                    boxShadow: focused === 'password' ? '0 0 0 3px var(--accent-soft)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--fg-muted)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
                >
                  {showPw ? (lang === 'tr' ? 'GİZLE' : 'HIDE') : (lang === 'tr' ? 'GÖSTER' : 'SHOW')}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {t('login_forgot_password')}
                </Link>
              </div>
            </div>

            {error && (
              <div className="animate-fade-in" style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--accent-soft)', border: '1px solid var(--accent-dim)' }}>
                <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '14px',
                marginTop: 8,
                background: submitting ? 'var(--fg-muted)' : 'var(--accent)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-h)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {submitting ? t('login_loading') : t('login_submit')}
            </button>
          </form>
          )}
        </div>
      </div>

      {/* Brand Bar */}
      <div className="brand-bar">
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Image className="brand-logo-img" src="/storea-siyah-logo.png" alt="StoreA" width={140} height={28} style={{ maxHeight: '28px', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
        <div className="brand-divider" style={{ width: '1px', height: '20px' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Image className="brand-logo-img" src="/storeb-siyah-logo.png" alt="StoreB" width={140} height={26} style={{ maxHeight: '26px', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
        <div className="brand-divider" style={{ width: '1px', height: '20px' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Image className="brand-logo-img" src="/storec-siyah-text-logo.png" alt="StoreC" width={140} height={16} style={{ maxHeight: '16px', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      </div>

      <style>{`
        .login-page-wrapper {
          background: var(--bg);
        }
        
        /* Desktop background and scrim */
        @media (min-width: 769px) {
          .login-page-wrapper {
            background-image: url(/arkaplan.jpg);
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
          .login-bg-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1;
          }
        }
        
        .login-card-container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }
        
        @media (min-width: 769px) {
          .login-card-container {
            align-items: flex-end;
            padding-bottom: 16px;
          }
        }

        .login-card {
          z-index: 10;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
          color: #000000;
          padding: 32px 40px;
        }
        
        .dark .login-card {
          background: rgba(15, 15, 20, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
          color: #ffffff;
        }
        
        @media (max-width: 768px) {
          .login-card {
            background: var(--card) !important;
            backdrop-filter: none !important;
            border: 1px solid var(--border) !important;
            box-shadow: var(--shadow-md) !important;
            color: var(--fg) !important;
            padding: 32px 24px !important;
          }
          .login-bg-overlay {
            display: none;
          }
        }

        @media (min-width: 769px) {
          .login-card input {
            background: rgba(255, 255, 255, 0.3) !important;
            border-color: rgba(0, 0, 0, 0.12) !important;
            color: #000000 !important;
          }
          .dark .login-card input {
            background: rgba(0, 0, 0, 0.18) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
          }
          .login-card input::placeholder {
            color: rgba(9, 9, 11, 0.6) !important;
          }
          .dark .login-card input::placeholder {
            color: rgba(245, 245, 245, 0.5) !important;
          }
          .login-card label {
            color: #000000 !important;
            opacity: 0.85 !important;
          }
          .dark .login-card label {
            color: #ffffff !important;
            opacity: 0.85 !important;
          }
          .login-card h2 {
            color: #000000 !important;
          }
          .dark .login-card h2 {
            color: #ffffff !important;
          }
          .login-card p {
            color: rgba(0, 0, 0, 0.8) !important;
          }
          .dark .login-card p {
            color: rgba(255, 255, 255, 0.7) !important;
          }
        }
        
        .brand-bar {
          width: 100%;
          max-width: 500px;
          margin-top: auto;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 16px 32px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 20px;
          z-index: 10;
          transition: all 0.3s ease;
        }
        
        .dark .brand-bar {
          background: rgba(20, 20, 25, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }
        
        @media (max-width: 768px) {
          .brand-bar {
            margin-top: 24px;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            padding: 12px;
            width: 100%;
            max-width: 280px;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .brand-divider {
            display: none !important;
          }
          .brand-logo-img {
            max-height: 20px !important;
          }
        }
        
        .brand-logo-img {
          transition: opacity 0.2s, transform 0.2s;
        }
        
        .brand-logo-img:hover {
          transform: scale(1.05);
        }
        
        .dark .brand-logo-img {
          filter: invert(1);
        }
        
        .brand-divider {
          background: rgba(0, 0, 0, 0.1);
        }
        
        .dark .brand-divider {
          background: rgba(255, 255, 255, 0.1);
        }
        
        @media (max-width: 768px) {
          .brand-divider {
            background: var(--border) !important;
          }
        }
      `}</style>
    </div>
  );
}
