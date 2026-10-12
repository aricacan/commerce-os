'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Clock, FileText } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { SERVICE_WINDOW_CLOSING_SOON_MS } from './conversationInfoRules';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

// 24 saat penceresinin durumu (yalnız WhatsApp). Kapalıysa neden serbest mesaj
// gönderilemediğini söyler ve şablon seçiciyi açtırır.
export function useServiceWindow(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  const remainingMs = endMs === null ? 0 : endMs - now;
  return { isOpen: remainingMs > 0, remainingMs, neverOpened: endMs === null };
}

function formatRemaining(ms: number): string {
  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
}

// Pencere bildirimlerinin ortak kabuğu: sakin uyarı tonu, tek satır metin, isteğe bağlı eylem.
function NoticeShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-ui-sm text-fg"
    >
      <Clock size={14} className="shrink-0 text-warning" aria-hidden />
      <p className="m-0 min-w-0 flex-1 basis-56 leading-relaxed">{children}</p>
      {action}
    </div>
  );
}

function TemplateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-ui-sm font-semibold text-fg hover:bg-bg-subtle ${motionFast} ${focusRing}`}
    >
      <FileText size={12} aria-hidden />
      Şablon gönder
    </button>
  );
}

export function ServiceWindowNotice({
  isOpen, remainingMs, neverOpened, onPickTemplate,
}: {
  isOpen: boolean; remainingMs: number; neverOpened: boolean; onPickTemplate: () => void;
}) {
  if (isOpen && remainingMs > SERVICE_WINDOW_CLOSING_SOON_MS) return null;

  if (isOpen) {
    return (
      <NoticeShell>
        Serbest mesaj için <strong>{formatRemaining(remainingMs)}</strong> kaldı. Sonrasında müşteri yeniden yazana
        kadar yalnız onaylı şablon gönderilebilir.
      </NoticeShell>
    );
  }

  return (
    <NoticeShell action={<TemplateButton onClick={onPickTemplate} />}>
      <strong>Serbest mesaj gönderilemez.</strong>{' '}
      {neverOpened
        ? "Bu müşteri size henüz WhatsApp'tan yazmadı."
        : 'Müşterinin son mesajının üzerinden 24 saatten fazla geçti.'}{' '}
      <span className="text-fg-muted">Yalnız Meta onaylı şablon gönderilebilir; müşteri yazınca sohbet normale döner.</span>
    </NoticeShell>
  );
}

// Messenger/Instagram penceresi. 24 saat geçtiyse temsilci mesajı Meta'nın "insan temsilci"
// etiketiyle gider (7 güne kadar, bot yazamaz); 7 gün geçtiyse Meta hiçbir mesaja izin vermez.
export function MetaWindowNotice({ agentWindowOpen, agentRemainingMs }: {
  agentWindowOpen: boolean; agentRemainingMs: number;
}) {
  if (agentWindowOpen) {
    return (
      <NoticeShell>
        Müşterinin son mesajından 24 saat geçti; bot artık yazamaz. Mesajınız Meta&apos;nın &quot;insan
        temsilci&quot; etiketiyle gider — <strong>{formatRemaining(agentRemainingMs)}</strong> kaldı.
      </NoticeShell>
    );
  }

  return (
    <NoticeShell>
      <strong>Mesaj gönderilemez.</strong> Müşterinin son mesajının üzerinden 7 günden fazla geçti.{' '}
      <span className="text-fg-muted">Meta bu durumda hiçbir mesaja izin vermez; müşteri yazınca cevap verebilirsiniz.</span>
    </NoticeShell>
  );
}
