'use client';

import { Bot } from 'lucide-react';
import { formatCountdown, type ConsultAutoReply } from './consultationRules';
import { useConsultCountdown } from './useConsultCountdown';

// Danışma kartında: "temsilci seçmezse bot önerdiği cevabı kendisi gönderecek" geri sayımı. Yalnız zamanlayıcı
// kurulu kartta gösterilir (devir sonrası açılan kartta bot seçmez, bu satır çıkmaz).
export function ConsultationAutoReplyNotice({ autoReply }: { autoReply: ConsultAutoReply }) {
  const remainingMs = useConsultCountdown(autoReply.at);

  return (
    <p role="status" className="flex items-start gap-1.5 text-ui-xs text-fg-muted">
      <Bot size={12} className="mt-0.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        {remainingMs === 0 ? (
          <>Bot önerdiği <span className="font-semibold text-fg">«{autoReply.labelTr}»</span> cevabını gönderiyor…</>
        ) : (
          <>
            <span className="font-semibold tabular-nums">{formatCountdown(remainingMs)}</span> içinde seçmezseniz bot{' '}
            <span className="font-semibold text-fg">«{autoReply.labelTr}»</span> cevabını gönderecek.
          </>
        )}
      </span>
    </p>
  );
}
