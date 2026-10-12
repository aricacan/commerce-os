'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

interface SecureAccessBarrierProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

// Bu bariyer birden fazla sayfada (Moderasyon, Kategori Uyuşmazlığı, ...) ayrı ayrı kullanılıyor.
// Kilit durumu eskiden sadece bileşen state'indeydi — her sayfa geçişinde Next.js bileşeni
// yeniden mount ettiği için kullanıcı aynı oturumda sayfa değiştirdikçe şifreyi tekrar tekrar
// giriyordu. sessionStorage'a taşındı: bir kez açılınca aynı sekme/oturum boyunca (tarayıcı
// kapanana kadar) tekrar sorulmaz, ama tab kapatılıp yeniden açılınca (ya da logout'ta, bkz.
// auth store'un sessionStorage'ı temizlemesi gerekebilir) yeniden kilitlenir.
const UNLOCK_STORAGE_KEY = 'secure-access-unlocked';

function readUnlockedFromSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(UNLOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SecureAccessBarrier({
  children,
  title = "Güvenli Bölge Girişi",
  description = "Bu bölüme erişmek için lütfen hesabınızın şifresini girerek doğrulama yapın."
}: SecureAccessBarrierProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(readUnlockedFromSession);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t('settings_barrier_error_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.verifySecureAction(password);
      if (res && res.success) {
        setIsUnlocked(true);
        try { window.sessionStorage.setItem(UNLOCK_STORAGE_KEY, '1'); } catch { /* privacy mode vb. — sorun değil, sadece bir sonraki sayfada tekrar sorar */ }
      } else {
        setError(t('settings_barrier_error_wrong_password'));
      }
    } catch {
      setError(t('settings_barrier_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      background: 'var(--bg)',
      padding: '20px',
    }}>
      <style>{`
        .lock-container {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: lockFadeIn 0.3s ease-out;
        }
        @keyframes lockFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .lock-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 99px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .lock-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--fg);
          margin: 0 0 8px 0;
        }
        .lock-desc {
          font-size: 13px;
          color: var(--fg-muted);
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        .lock-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-group {
          position: relative;
          width: 100%;
        }
        .lock-input {
          width: 100%;
          padding: 10px 40px 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-subtle);
          color: var(--fg);
          font-size: 13.5px;
          outline: none;
          transition: all 0.2s;
        }
        .lock-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--fg-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .eye-btn:hover {
          color: var(--fg);
        }
        .lock-btn {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: var(--accent);
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lock-btn:hover {
          opacity: 0.9;
        }
        .lock-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .lock-error {
          width: 100%;
          font-size: 12px;
          color: #ef4444;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          padding: 8px 12px;
          border-radius: 8px;
          text-align: left;
          animation: errorShake 0.3s ease-in-out;
        }
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
      
      <div className="lock-container">
        <div className="lock-icon-wrapper">
          <Lock size={26} />
        </div>
        <h2 className="lock-title">{title}</h2>
        <p className="lock-desc">{description}</p>
        
        <form className="lock-form" onSubmit={handleSubmit}>
          {error && <div className="lock-error">{error}</div>}
          
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              className="lock-input"
              placeholder={t('settings_barrier_password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <button className="lock-btn" type="submit" disabled={loading}>
            {loading ? t('settings_barrier_verifying') : t('settings_barrier_verify_button')}
          </button>
        </form>
      </div>
    </div>
  );
}
