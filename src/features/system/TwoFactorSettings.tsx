'use client';

import { useState } from 'react';
import { ShieldCheck, Copy, Check, KeyRound, Smartphone, AlertTriangle } from 'lucide-react';
import { twoFactorApi, type TwoFactorSetup } from '@/lib/api/two-factor';
import { describeError } from '@/lib/errors';
import { toast } from '@/lib/toast';

// ─── Saf yardımcılar (vitest bunları test eder) ───────────────────────────────

/**
 * Sırrı ELLE girilebilir hâle getirir: 4'lü gruplar.
 *
 * QR okutamayan kullanıcı (masaüstü kimlik doğrulayıcı, kamerası olmayan cihaz) anahtarı
 * elle yazmak zorunda; 32 karakterlik kesintisiz bir dizide gözle takip imkânsızdır.
 */
export function formatSecretForManualEntry(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * Kurtarma kodunu okunur hâle getirir. Kodlar Base32 — büyük harf ve rakam.
 */
export function formatRecoveryCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join('-');
}

/**
 * Kod alanı için girdi temizliği: yalnızca rakam, en fazla 6 hane.
 *
 * Kullanıcı "123 456" yapıştırabilir. Sunucu da boşluğu temizliyor ama ekranın kabul
 * etmemesi, doğru kodu giren kullanıcıya "yanlış" demek olurdu.
 */
export function sanitizeTotpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

/** Kod gönderilmeye hazır mı. */
export function isCodeComplete(code: string): boolean {
  return sanitizeTotpInput(code).length === 6;
}

// ─── Ekran ────────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'scanning' | 'enabled';

export function TwoFactorSettings() {
  const [stage, setStage] = useState<Stage>('idle');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      setSetup(await twoFactorApi.setup());
      setStage('scanning');
      setError(null);
    } catch (cause) {
      // Sunucunun mesajı GÖSTERİLİR: "2FA zaten açık, önce kapatın" gibi eyleme dönük
      // bir yanıt, sabit "Kurulum başlatılamadı" metninin altında kayboluyordu.
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (!isCodeComplete(code)) { setError('6 haneli kodu girin.'); return; }

    setBusy(true);
    try {
      const result = await twoFactorApi.enable(sanitizeTotpInput(code));
      setRecoveryCodes(result.recoveryCodes);
      setStage('enabled');
      setCode('');
      setError(null);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    if (!setup?.secretBase32) return;
    navigator.clipboard.writeText(setup.secretBase32);
    setCopiedKey(true);
    toast.success('Anahtar kopyalandı.');
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function copyAllRecoveryCodes() {
    if (recoveryCodes.length === 0) return;
    navigator.clipboard.writeText(recoveryCodes.map(formatRecoveryCode).join('\n'));
    toast.success('Tüm kurtarma kodları kopyalandı.');
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6 gap-4 bg-transparent max-w-2xl">
      {/* Header */}
      <div data-tour="two-factor-header">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--fg)]" />
          <h1 className="text-sm font-bold text-[var(--fg)]">İki Adımlı Doğrulama (2FA)</h1>
        </div>
        <p className="text-xs text-[var(--fg-muted)] mt-1">
          Giriş yaparken şifrenizin yanı sıra authenticator uygulamanızdaki 6 haneli doğrulama kodu istenir.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[4px] bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div data-tour="two-factor-card" className="flex flex-col gap-4">
      {stage === 'idle' && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--fg)] shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--fg)]">Authenticator ile Doğrulama</h3>
              <p className="text-[11.5px] text-[var(--fg-muted)] leading-relaxed mt-0.5">
                Google Authenticator, Microsoft Authenticator, Authy veya 1Password uygulamalarını kullanabilirsiniz.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => void begin()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3.5 text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer disabled:opacity-40"
            >
              {busy ? 'Hazırlanıyor…' : 'Kurulumu Başlat'}
            </button>
          </div>
        </div>
      )}

      {stage === 'scanning' && setup && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs flex flex-col gap-4">
          {/* Step 1 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
              <KeyRound size={14} className="text-[var(--fg-muted)]" />
              <span>1. Gizli Anahtarı Uygulamanıza Ekleyin</span>
            </div>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Authenticator uygulamanızda yeni hesap ekleyip manuel giriş seçeneğiyle bu anahtarı yazın:
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 select-all rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs font-bold tracking-wider text-[var(--fg)]">
                {formatSecretForManualEntry(setup.secretBase32)}
              </code>
              <button
                type="button"
                onClick={copySecret}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer shrink-0"
              >
                {copiedKey ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedKey ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-soft)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
              <Smartphone size={14} className="text-[var(--fg-muted)]" />
              <span>2. Uygulamadaki 6 Haneli Kodu Girin</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(sanitizeTotpInput(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="h-8.5 w-36 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-center font-mono text-sm font-bold tracking-widest text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
              <button
                type="button"
                onClick={() => void enable()}
                disabled={busy || !isCodeComplete(code)}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3.5 text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer disabled:opacity-40"
              >
                {busy ? 'Doğrulanıyor…' : 'Doğrula ve Etkinleştir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'enabled' && (
        <div className="flex flex-col gap-3.5 rounded-[4px] border border-emerald-500/30 bg-[var(--card)] p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-[var(--fg)]">İki adımlı doğrulama başarıyla açıldı</h3>
          </div>

          <p className="text-[11.5px] text-[var(--fg-muted)] leading-relaxed">
            Telefonunuzu kaybetmeniz durumunda hesabınıza erişebilmek için aşağıdaki tek kullanımlık kurtarma kodlarını güvenli bir yere kaydedin:
          </p>

          <div className="grid grid-cols-2 gap-2 font-mono sm:grid-cols-3">
            {recoveryCodes.map((recoveryCode) => (
              <div
                key={recoveryCode}
                className="select-all rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-center text-xs font-bold text-[var(--fg)]"
              >
                {formatRecoveryCode(recoveryCode)}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
            <span className="text-[11px] text-[var(--fg-muted)]">Her kod yalnızca 1 kez geçerlidir.</span>
            <button
              type="button"
              onClick={copyAllRecoveryCodes}
              className="inline-flex h-7.5 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Copy size={12} />
              <span>Tümünü Kopyala</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
