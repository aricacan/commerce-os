'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';

// Reset linkindeki ?token=... sorgu parametresini okuyup yeni şifreyi backend'e gönderir.
// Stil/markup login sayfasının aynısı (bkz. app/login/page.tsx ve app/forgot-password/page.tsx)
// — bu üç sayfa küçük ve yakından ilişkili olduğundan ayrı bir paylaşımlı katman çıkarmak
// bu aşamada gereksiz olurdu.
//
// useSearchParams() Next.js'te Suspense sınırı ZORUNLU kılar (statik prerender'da
// build-time'da çözülemeyen bir client hook) — dışa sarmalayıcı bunun için var.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('reset_password_mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="login-bg-overlay" />

      <div className="login-card-container" style={{ zIndex: 10 }}>
        <div className="login-card" style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: '20px',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
              {t('reset_password_title')}
            </h2>
            <p style={{ fontSize: 13, opacity: 0.8, lineHeight: '1.5', margin: 0 }}>
              {t('reset_password_subtitle')}
            </p>
          </div>

          {done ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--accent-soft)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={22} color="var(--accent)" />
              </div>
              <p style={{ fontSize: 13, lineHeight: '1.6', margin: 0 }}>
                {t('reset_password_success')}
              </p>
              <Link
                href="/login"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', padding: '14px', background: 'var(--accent)',
                  borderRadius: '8px', color: '#fff', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {t('reset_password_go_to_login')}
              </Link>
            </div>
          ) : !token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: 13, lineHeight: '1.6', margin: 0, color: 'var(--accent)' }}>
                {t('reset_password_missing_token')}
              </p>
              <Link
                href="/forgot-password"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
              >
                {t('forgot_password_title')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('reset_password_new')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--fg)',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('reset_password_confirm')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--fg)',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
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
              >
                {submitting ? t('reset_password_saving') : t('reset_password_submit')}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .login-page-wrapper {
          background: var(--bg);
        }

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
            align-items: center;
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
      `}</style>
    </div>
  );
}
