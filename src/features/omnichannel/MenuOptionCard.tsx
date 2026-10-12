'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { BOT_MENU_ACTION, type BotMenuOptionDto } from '../../lib/api/omnichannel';
import { ACTION_TITLES, isCustomAction } from './menuTree';
import { CHANNEL_LIMITS } from './menuChannelLimits';
import { compactInputClass, textareaClass } from './formClasses';
import { AutoTextarea } from './AutoTextarea';
import { TriggerListEditor } from './TriggerListEditor';

// Başlık bu uzunluğu aşarsa en az bir kanalda kesilir (WhatsApp buton / Meta hızlı cevap).
const SAFE_TITLE_LENGTH = CHANNEL_LIMITS.whatsapp.buttonTitle;

interface Props {
  option: BotMenuOptionDto;
  onChange: (patch: Partial<BotMenuOptionDto>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  // false: alt menünün son seçeneği — silinirse alt menü boş kalır.
  removable?: boolean;
  children?: ReactNode;
}

export function MenuOptionCard({ option, onChange, onMove, onRemove, removable = true, children }: Props) {
  const isInfo = option.action === BOT_MENU_ACTION.Info;

  return (
    <div className={`flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs transition ${option.isActive ? 'opacity-100' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
        <span className="min-w-0 break-words text-xs font-bold text-[var(--fg)]">
          {option.order}. {ACTION_TITLES[option.action] ?? 'Akış'}
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Yukarı taşı" onClick={() => onMove(-1)}><ArrowUp size={13} /></IconButton>
          <IconButton label="Aşağı taşı" onClick={() => onMove(1)}><ArrowDown size={13} /></IconButton>
          {isCustomAction(option.action) && (
            <IconButton
              label={removable ? 'Sil' : 'Alt menünün son seçeneği silinemez — alt menüyü silin'}
              onClick={onRemove} disabled={!removable}
            >
              <Trash2 size={13} className="text-rose-500" />
            </IconButton>
          )}
          <label className="ml-2 flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
            <input
              type="checkbox" checked={option.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              className="h-4 w-4 rounded-[3px]"
            />
            <span>Aktif</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TitleField label="Türkçe başlık" value={option.labelTr} onChange={(v) => onChange({ labelTr: v })} />
        <TitleField label="İngilizce başlık" value={option.labelEn} onChange={(v) => onChange({ labelEn: v })} />
        <TitleField
          label="Arnavutça başlık (Kosova)" value={option.labelSq ?? ''}
          placeholder="Boşsa varsayılan / İngilizce" onChange={(v) => onChange({ labelSq: v })}
        />
      </div>

      {isInfo && (
        <div className="flex flex-col gap-3">
          <ReplyField label="Türkçe cevap" value={option.replyTr ?? ''} onChange={(v) => onChange({ replyTr: v })} />
          <ReplyField label="İngilizce cevap" value={option.replyEn ?? ''} onChange={(v) => onChange({ replyEn: v })} />
          <ReplyField
            label="Arnavutça cevap" value={option.replySq ?? ''} placeholder="Boşsa İngilizce gider"
            onChange={(v) => onChange({ replySq: v })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TriggerListEditor
          id={`triggers-tr-${option.id ?? option.order}`} label="Türkçe tetikleyiciler"
          value={option.triggersTr} onChange={(v) => onChange({ triggersTr: v })}
        />
        <TriggerListEditor
          id={`triggers-en-${option.id ?? option.order}`} label="İngilizce tetikleyiciler"
          value={option.triggersEn} onChange={(v) => onChange({ triggersEn: v })}
        />
      </div>

      {children}
    </div>
  );
}

function IconButton({ label, onClick, disabled = false, children }: {
  label: string; onClick: () => void; disabled?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">{children}</label>;
}

function TitleField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (value: string) => void;
}) {
  const tooLong = value.length > SAFE_TITLE_LENGTH;
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={compactInputClass} />
      <span className={`mt-0.5 block text-[10px] ${tooLong ? 'text-amber-500' : 'text-[var(--fg-muted)]'}`}>
        {value.length}/{SAFE_TITLE_LENGTH}{tooLong ? ' — bazı kanallarda kesilir' : ''}
      </span>
    </div>
  );
}

function ReplyField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <AutoTextarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={textareaClass} />
    </div>
  );
}
