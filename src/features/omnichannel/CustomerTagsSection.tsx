'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import {
  crmApi, customersApi, TAG_COLORS, type CustomerProfileDto, type CustomerTagDto, type TagColor,
} from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { PanelSection, ghostButtonClass, inputClass, primaryButtonClass, tagClass } from './CustomerPanelParts';
import { SYSTEM_TAG_HINT, attachableTags, isSystemTag } from './customerTagRules';

interface Props {
  profile: CustomerProfileDto;
  readOnly: boolean;
  onChanged: () => Promise<void>;
}

// Segment etiketleri ("VIP", "Toptancı"). Katalogda olmayan ad yazılırsa etiket oluşturulup eklenir.
// Sistem etiketleri (P23) kurallarla yönetilir: "oto" işaretiyle gösterilir, elle eklenmez/kaldırılmaz.
export function CustomerTagsSection({ profile, readOnly, onChanged }: Props) {
  const [catalog, setCatalog] = useState<CustomerTagDto[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<TagColor>('blue');
  const { notify } = useFeedback();

  useEffect(() => {
    if (!adding) return;
    crmApi.tags().then(setCatalog).catch((e) => notify.error(describeError(e)));
  }, [adding, notify]);

  const attachedIds = useMemo(() => new Set(profile.tags.map((t) => t.id)), [profile.tags]);
  const available = attachableTags(catalog, attachedIds);
  const trimmed = name.trim();
  const existing = catalog.find((t) => t.name.toLocaleLowerCase('tr-TR') === trimmed.toLocaleLowerCase('tr-TR'));
  // Yazılan ad bir sistem etiketiyse elle eklenemez.
  const existingIsSystem = existing !== undefined && isSystemTag(existing);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const attach = (tagId: number) => run(async () => {
    await customersApi.attachTag(profile.id, tagId);
    setName('');
  });

  const createAndAttach = () => run(async () => {
    const tag = existing ?? await crmApi.createTag(trimmed, color);
    await customersApi.attachTag(profile.id, tag.id);
    setName('');
    setAdding(false);
  });

  return (
    <PanelSection title="Etiketler" count={profile.tags.length}
      action={!readOnly && !adding && (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          <Plus size={12} /> Ekle
        </button>
      )}>
      <div className="flex flex-wrap gap-1.5">
        {profile.tags.length === 0 && !adding && <span className="text-[11px] text-[var(--fg-muted)]">Etiket yok.</span>}
        {profile.tags.map((t) => (
          <span key={t.id} className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${tagClass(t.color)}`}>
            {t.name}
            {isSystemTag(t) && (
              <span title={SYSTEM_TAG_HINT} className="inline-flex cursor-help items-center gap-0.5 text-[9.5px] opacity-70">
                <Sparkles size={9} aria-hidden /> oto
              </span>
            )}
            {!readOnly && !isSystemTag(t) && (
              <button type="button" title="Kaldır" className="opacity-60 hover:opacity-100"
                onClick={() => void run(() => customersApi.detachTag(profile.id, t.id))}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>

      {adding && (
        <div className="flex flex-col gap-1.5">
          {available.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {available.map((t) => (
                <button key={t.id} type="button" onClick={() => void attach(t.id)}
                  className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold opacity-70 hover:opacity-100 ${tagClass(t.color)}`}>
                  + {t.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Yeni etiket adı" maxLength={48} />
            {!existing && (
              <div className="flex shrink-0 gap-0.5">
                {TAG_COLORS.map((c) => (
                  <button key={c} type="button" title={c} onClick={() => setColor(c)}
                    className={`h-4 w-4 rounded-full ${tagClass(c)} ${color === c ? 'ring-2 ring-[var(--fg)]' : ''}`} />
                ))}
              </div>
            )}
          </div>
          {existingIsSystem && <span className="text-[10.5px] text-[var(--fg-muted)]">{SYSTEM_TAG_HINT}; elle eklenemez.</span>}
          <div className="flex justify-end gap-1.5">
            <button type="button" className={ghostButtonClass} onClick={() => { setAdding(false); setName(''); }}>Kapat</button>
            <button type="button" className={primaryButtonClass} disabled={!trimmed || existingIsSystem} onClick={() => void createAndAttach()}>
              {existing ? 'Ekle' : 'Oluştur ve ekle'}
            </button>
          </div>
        </div>
      )}
    </PanelSection>
  );
}
