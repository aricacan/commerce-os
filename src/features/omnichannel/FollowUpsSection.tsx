'use client';

import { useMemo, useState } from 'react';
import { BellRing, ChevronDown, ChevronUp } from 'lucide-react';
import { followUpsApi, FOLLOW_UP_STATUS, type FollowUpTaskDto } from '../../lib/api/omnichannel-follow-ups';
import { focusRing, motionFast } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { FollowUpRow } from './FollowUpRow';
import { followUpsHeadline } from './followUpRules';
import { useChatOrderAction } from './useChatOrderAction';
import { INFO_SECTION_SURFACE_CLASS } from './infoSectionStyle';

interface Props {
  // Konuşmanın takip görevleri; üst bileşen yükler ki başlık sayacı da görsün.
  tasks: FollowUpTaskDto[];
  reload: () => Promise<void>;
  canWrite: boolean;
}

// "Ayrıntılar" panelindeki "Takipler" bölümü (P26-P27). Takip yoksa hiç çizilmez. Başlık tek
// satır özet verir ("Takipler 2 · Müşteri sessiz · ≈ 3 sa sonra"); panel zaten isteğe bağlı
// açıldığından liste açık başlar. Onay bekleyen varsa başlıktaki amber nokta dikkat çeker.
export function FollowUpsSection({ tasks, reload, canWrite }: Props) {
  const needsAgent = tasks.some((t) => t.status === FOLLOW_UP_STATUS.NeedsAgent);
  const [open, setOpen] = useState(true);
  const { busy, error, run } = useChatOrderAction(reload);
  const { confirm } = useFeedback();
  // "3 sa sonra" gibi göreli etiketler görev listesi her yenilendiğinde yeniden hesaplanır.
  // eslint-disable-next-line react-hooks/purity, react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [tasks]);

  if (tasks.length === 0) return null;

  const cancel = async (id: number, pending: boolean) => {
    if (pending) {
      const ok = await confirm({
        title: 'Takip iptal edilsin mi?',
        body: 'Bu takip görevi artık çalışmaz.',
        confirmLabel: 'İptal et',
      });
      if (!ok) return;
    }
    await run(() => followUpsApi.cancel(id));
  };

  return (
    <section aria-label="Takipler" className={INFO_SECTION_SURFACE_CLASS}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left hover:bg-bg-subtle ${motionFast} ${focusRing} focus-visible:ring-inset`}
      >
        <BellRing size={13} className="shrink-0 text-fg-muted" aria-hidden />
        <span className="shrink-0 font-bold text-fg">Takipler</span>
        <span className="shrink-0 text-ui-xs tabular-nums text-fg-muted">{tasks.length}</span>
        {needsAgent && <span className="size-1.5 shrink-0 rounded-full bg-warning" role="img" aria-label="Onay bekleyen var" />}
        <span className="min-w-0 flex-1 truncate text-ui-xs text-fg-muted">{followUpsHeadline(tasks, now)}</span>
        {open ? <ChevronUp size={14} className="shrink-0 text-fg-muted" aria-hidden /> : <ChevronDown size={14} className="shrink-0 text-fg-muted" aria-hidden />}
      </button>

      {open && (
        <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 px-3 pb-3">
          {tasks.map((task) => (
            <FollowUpRow
              key={task.id}
              task={task}
              now={now}
              canWrite={canWrite}
              busy={busy}
              onComplete={() => void run(() => followUpsApi.complete(task.id))}
              onCancel={() => void cancel(task.id, task.status === FOLLOW_UP_STATUS.Pending)}
            />
          ))}
        </ul>
      )}
      {open && error && <p role="alert" className="m-0 break-words px-3 pb-3 text-ui-xs text-danger">{error}</p>}
    </section>
  );
}
