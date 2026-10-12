'use client';

import { formatDateTime } from '@/lib/format';
import { ArrowRight, Undo2 } from 'lucide-react';
import { learningApi, type AliasLearningDto } from '../../lib/api/omnichannel-learning';
import { useFeedback } from '../shared/Feedback';
import { EvidenceCount, LearningButton } from './LearningParts';
import { useLearningAction } from './useLearningAction';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

// Botun yüksek güvenle KENDİSİ eklediği sözlük eşlemesi. "Geri al" eşlemeyi siler ve reddi
// hatırlar — bot aynı kelimeyi bir daha kendiliğinden eşlemez.
export function AutoLearnedItem({ item, onChanged }: { item: AliasLearningDto; onChanged: () => void }) {
  const { busy, run } = useLearningAction(onChanged);
  const { confirm } = useFeedback();

  const revert = async () => {
    const ok = await confirm({
      title: `"${item.wrongTerm}" eşlemesi geri alınsın mı?`,
      body: 'Eşleme Ürün Sözlüğü\'nden silinir ve bot bu kelimeyi bir daha kendiliğinden eşlemez.',
      confirmLabel: 'Geri al',
      danger: true,
    });
    if (ok) await run(() => learningApi.revertAlias(item.id), 'Eşleme geri alındı.');
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-2 last:border-b-0">
      <span className="inline-flex flex-wrap items-center gap-2">
        <strong className="font-mono text-[var(--fg)]">{item.wrongTerm}</strong>
        <ArrowRight size={12} className="text-[var(--fg-muted)]" />
        <strong className="font-mono text-[var(--fg)]">{item.correctTerm}</strong>
        <EvidenceCount count={item.evidenceCount} />
        {item.autoAppliedAt && (
          <span className="text-[11px] text-[var(--fg-muted)]">
            {formatDateTime(item.autoAppliedAt, 'tr', DATE_FORMAT)}
          </span>
        )}
      </span>
      <LearningButton tone="danger" disabled={busy} onClick={() => void revert()}>
        <Undo2 size={12} /> Geri al
      </LearningButton>
    </div>
  );
}
