'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { BOT_MENU_ACTION, type BotMenuOptionDto } from '../../lib/api/omnichannel';
import { MenuOptionCard } from './MenuOptionCard';
import { addInfo, addSubmenu, canRemove, level, move, remove } from './menuTree';

interface Props {
  options: BotMenuOptionDto[];
  setOptions: Dispatch<SetStateAction<BotMenuOptionDto[]>>;
}

// Menü ağacı düzenleyicisi: seçenek kartları, alt menüler, ekleme düğmeleri. Hesap geneli menü (MenuTab) ve
// kanala özel menü (ChannelBotMenuSection) AYNI düzenleyiciyi kullanır; hangisini yazdığı kaydetme tarafındadır.
export function MenuTreeEditor({ options, setOptions }: Props) {
  const update = (id: string, patch: Partial<BotMenuOptionDto>) =>
    setOptions((current) => current.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const renderCard = (option: BotMenuOptionDto) => {
    const id = option.id ?? '';
    const children = option.action === BOT_MENU_ACTION.Submenu ? level(options, id) : [];
    return (
      <MenuOptionCard
        key={id}
        option={option}
        onChange={(patch) => update(id, patch)}
        onMove={(direction) => setOptions((current) => move(current, id, direction))}
        onRemove={() => setOptions((current) => remove(current, id))}
        removable={canRemove(options, id)}
      >
        {option.action === BOT_MENU_ACTION.Submenu && (
          <div className="flex flex-col gap-2 border-l-2 border-[var(--border)] pl-3">
            {children.map(renderCard)}
            <AddButton onClick={() => setOptions((current) => addInfo(current, id))} label="Alt seçenek ekle (sabit cevap)" />
          </div>
        )}
      </MenuOptionCard>
    );
  };

  return (
    <>
      {level(options, null).map(renderCard)}
      <div className="flex flex-wrap gap-2">
        <AddButton onClick={() => setOptions((current) => addInfo(current, null))} label="Sabit cevap ekle" />
        <AddButton onClick={() => setOptions(addSubmenu)} label="Alt menü ekle" icon={<FolderTree size={13} />} />
      </div>
    </>
  );
}

function AddButton({ onClick, label, icon }: { onClick: () => void; label: string; icon?: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 self-start rounded-[4px] border border-dashed border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer"
    >
      {icon ?? <Plus size={13} />} {label}
    </button>
  );
}
