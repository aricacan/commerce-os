'use client';

// ── CRUD geri bildirimi: toast + onay diyaloğu ────────────────────────────────
//
// Neden var: modüller şimdiye kadar silme onayı için `window.confirm`, başarı/hata
// için satır arası metin kullanıyordu. İkisinin de sorunu var — `window.confirm`
// tarayıcının kendi penceresi, uygulamanın diline/temasına uymuyor ve neyin
// silineceğini vurgulayamıyor; satır arası hata mesajı ise sayfanın altında
// kalınca hiç görülmüyor.
//
// Kullanım tek hook üzerinden:
//   const { notify, confirm, feedback } = useFeedback();
//   ...
//   if (await confirm({ title: '...', danger: true })) { ... notify.success('Silindi'); }
//   return (<>{feedback}  ...</>)
//
// FeedbackProvider (ModuleWorkspace bunu sarar): içindeki her useFeedback() TEK,
// kalıcı katmana bağlanır ve `feedback` null döner. Neden: sekmeler `{feedback}`'i
// render etmeyi unutunca confirm() hiç çözülmüyordu (Sil düğmeleri ölüydü), kısa
// ömürlü bileşenlerin (kapanan dialog) toast'ı da onlarla birlikte yok oluyordu.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { palette, btnPrimary, btnGhost, icon, text } from './design';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  /** Gövde metni — ne olacağını açıkça yaz, "emin misiniz?" tek başına yetmez. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Geri alınamaz işlemler (silme) kırmızı onay düğmesi alır. */
  danger?: boolean;
}

const TOAST_MS = 3200;

const KIND_META: Record<ToastKind, { color: string; Icon: typeof CheckCircle2 }> = {
  success: { color: palette.success, Icon: CheckCircle2 },
  error: { color: palette.danger, Icon: AlertTriangle },
  info: { color: palette.accent, Icon: Info },
};

interface FeedbackApi {
  notify: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { notify, confirm, feedback } = useLocalFeedback();
  const api = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {feedback}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const shared = useContext(FeedbackContext);
  const local = useLocalFeedback();
  return shared ? { ...shared, feedback: null } : local;
}

function useLocalFeedback() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<
    { options: ConfirmOptions; resolve: (ok: boolean) => void } | null
  >(null);

  const push = useCallback((kind: ToastKind, message: string) => {
    // Date.now() tek başına çakışabiliyor (aynı ms içinde iki bildirim) —
    // rastgele ek parça React key'inin benzersizliğini garantiliyor.
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const notify = useMemo(() => ({
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }), [push]);

  const confirm = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => setPending({ options, resolve }))
  ), []);

  const close = useCallback((ok: boolean) => {
    setPending((p) => { p?.resolve(ok); return null; });
  }, []);

  const feedback = (
    <>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      {pending && <ConfirmDialog options={pending.options} onClose={close} />}
    </>
  );

  return { notify, confirm, feedback };
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      // aria-live: ekran okuyucu bildirimi odak çalmadan seslendirsin.
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 30000,
      }}
    >
      {toasts.map((t) => {
        const meta = KIND_META[t.kind];
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 10,
              background: palette.card, border: `1px solid ${palette.border}`,
              borderLeft: `3px solid ${meta.color}`,
              boxShadow: '0 8px 24px oklch(21% 0.006 260 / 0.1)',
              fontSize: text.md, fontWeight: 600, color: palette.text,
              minWidth: 260, maxWidth: 420,
            }}
          >
            <meta.Icon size={icon.md} color={meta.color} strokeWidth={icon.stroke} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Kapat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: palette.textFaint, display: 'flex', padding: 0 }}
            >
              <X size={icon.sm} strokeWidth={icon.stroke} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Dolu düğme: btnPrimary metni var(--fg); zemini de var(--fg) olan vurguyla birleşince metin siyah üstüne
// siyah kalıyordu ("Botlar yeniden açılsın mı?" onay düğmesi). Metin dolgu üstü token'ı alır, kenar zeminle aynı.
function filledButton(fill: string) {
  return { background: fill, borderColor: fill, color: palette.textOnFill };
}

function ConfirmDialog({ options, onClose }: {
  options: ConfirmOptions;
  onClose: (ok: boolean) => void;
}) {
  const { title, body, confirmLabel = 'Onayla', cancelLabel = 'İptal', danger } = options;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => onClose(false)}
      style={{
        position: 'fixed', inset: 0, background: 'oklch(21% 0.006 260 / 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 30001, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)', background: palette.card,
          border: `1px solid ${palette.border}`, borderRadius: 12, padding: 22,
          boxShadow: '0 16px 40px oklch(21% 0.006 260 / 0.16)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle
            size={icon.xl}
            strokeWidth={icon.stroke}
            color={danger ? palette.danger : palette.warning}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: text.lg, fontWeight: 700, margin: 0, color: palette.textStrong }}>
              {title}
            </h3>
            {body && (
              <p style={{ fontSize: text.md, color: palette.textMuted, margin: '7px 0 0', lineHeight: 1.5 }}>
                {body}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={() => onClose(false)} style={btnGhost}>{cancelLabel}</button>
          <button
            onClick={() => onClose(true)}
            autoFocus
            style={{ ...btnPrimary, ...filledButton(danger ? palette.danger : palette.accent) }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
