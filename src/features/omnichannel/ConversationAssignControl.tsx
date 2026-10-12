'use client';

import { useState } from 'react';
import { Hand, UserCheck } from 'lucide-react';
import { omnichannelApi, type AssigneeDto, type ConversationSummaryDto } from '../../lib/api/omnichannel';
import { useAuthStore } from '../../stores/auth';
import { focusRing, motionFast } from '../shared/design';
import { describeError } from '../../lib/errors';

// Sohbet başlığındaki sorumluluk kontrolü (Faz 9):
//   Üstlen  → konuşma bana atanır, bot susar.
//   Devret  → kanala yazabilen başka birine atanır (liste ilk açılışta yüklenir).
// Bota geri vermek mevcut bot düğmesiyle yapılır.
// Telefon sayfasında başparmakla dokunulabilir kontrol yüksekliği (40px).
const LARGE_CONTROL_CLASS = 'h-10 text-ui-sm';
const DEFAULT_CONTROL_CLASS = 'h-8 text-ui-sm';
// Masaüstü üst çubuğunda tek satıra sığsın diye küçük.
const COMPACT_CONTROL_CLASS = 'h-7 text-ui-xs';

export function ConversationAssignControl({ conversation, onChanged, onError, large = false, compact = false }: {
  conversation: ConversationSummaryDto;
  onChanged: (conversation: ConversationSummaryDto) => void;
  onError: (message: string) => void;
  large?: boolean;
  compact?: boolean;
}) {
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [assignees, setAssignees] = useState<AssigneeDto[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<ConversationSummaryDto>) => {
    setBusy(true);
    try { onChanged(await action()); }
    catch (e) { onError(describeError(e)); }
    finally { setBusy(false); }
  };

  const loadAssignees = async () => {
    if (assignees !== null) return;
    try { setAssignees(await omnichannelApi.getAssignees(conversation.id)); }
    catch (e) { onError(describeError(e)); }
  };

  const isMine = myId !== null && conversation.assignedUserId === myId;
  const controlClass = large ? LARGE_CONTROL_CLASS : compact ? COMPACT_CONTROL_CLASS : DEFAULT_CONTROL_CLASS;
  const iconSize = compact ? 12 : 14;

  return (
    <div className={`flex shrink-0 items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {!isMine && (
        <button
          onClick={() => void run(() => omnichannelApi.takeOver(conversation.id))}
          disabled={busy}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card ${compact ? 'px-2' : 'px-3'} font-semibold text-fg hover:bg-bg-subtle ${motionFast} ${focusRing} ${controlClass}`}
          title="Konuşmayı üstlen: size atanır ve bot susar"
        >
          <Hand size={iconSize} /> Üstlen
        </button>
      )}
      <label className={`flex items-center gap-1.5 text-[var(--fg-muted)] ${compact ? 'text-ui-xs' : 'text-ui-sm'}`} title="Devret">
        <UserCheck size={iconSize} />
        <select
          value={conversation.assignedUserId ?? ''}
          onFocus={() => void loadAssignees()}
          onMouseDown={() => void loadAssignees()}
          disabled={busy}
          onChange={(e) => {
            const userId = e.target.value === '' ? null : Number(e.target.value);
            void run(() => omnichannelApi.assign(conversation.id, userId));
          }}
          className={`max-w-[160px] cursor-pointer rounded-lg border border-border-soft bg-bg-subtle px-2 text-fg ${focusRing} ${controlClass}`}
          aria-label="Konuşmayı devret"
        >
          <option value="">Atanmamış</option>
          {/* Liste yüklenmeden de mevcut atanan görünür kalsın. */}
          {assignees === null && conversation.assignedUserId !== null && (
            <option value={conversation.assignedUserId}>{isMine ? 'Ben' : 'Atanmış kişi'}</option>
          )}
          {(assignees ?? []).map((a) => (
            <option key={a.userId} value={a.userId}>{a.userId === myId ? `${a.displayName} (ben)` : a.displayName}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
