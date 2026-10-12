'use client';

import { CheckCircle2 } from 'lucide-react';
import { ConsultationCard } from './ConsultationCard';
import { useAgentConsultation } from './useAgentConsultation';

interface Props {
  conversationId: number;
  // Değişince kart sunucudan tazelenir (yeni mesaj, canlı güncelleme, yeniden bağlanma).
  refreshKey: string | number;
  // Cevap müşteriye gitti: üst bileşen konuşmayı/mesajları tazeler.
  onAnswered: () => void;
}

// Sohbet ve Test Alanı için ortak: bekleyen danışma kartı ya da cevabın ardından kısa "gitti" onayı.
// Çağıran `key={conversationId}` verir: konuşma değişince durum sıfırlanır.
export function ConsultationPanel({ conversationId, refreshKey, onAnswered }: Props) {
  const { consultation, sentText, busy, failure, answer } = useAgentConsultation(conversationId, refreshKey, onAnswered);

  if (consultation) {
    return <ConsultationCard consultation={consultation} busy={busy} failure={failure} onAnswer={(body) => void answer(body)} />;
  }
  if (sentText) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-success-soft px-3 py-2 text-ui-sm text-fg">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" aria-hidden />
        <span className="min-w-0 break-words">
          <span className="font-semibold">Müşteriye gönderildi:</span> {sentText}
        </span>
      </p>
    );
  }
  return null;
}
