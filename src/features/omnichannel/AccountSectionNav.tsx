'use client';

import type { SettingsSubPage } from './workspace-tabs';

interface Props {
  sections: readonly SettingsSubPage[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel: string;
}

const groupsOf = (sections: readonly SettingsSubPage[]) => {
  const groups = new Map<string, SettingsSubPage[]>();
  for (const section of sections) {
    const key = section.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), section]);
  }
  return [...groups.entries()];
};

// Hesap geneli yan menüsü: geniş ekranda başlıklı dikey liste, dar ekranda yatay kayan düğmeler.
export function AccountSectionNav({ sections, active, onChange, ariaLabel }: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex min-w-0 shrink-0 gap-4 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2 md:w-60 md:flex-col md:gap-5 md:overflow-x-visible md:border-b-0 md:border-r md:px-3 md:py-4"
    >
      {groupsOf(sections).map(([group, items]) => (
        <div key={group} className="flex shrink-0 flex-col gap-1 md:shrink">
          {group && (
            <span className="hidden px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)] md:block">{group}</span>
          )}
          <ul className="m-0 flex list-none gap-1 p-0 md:flex-col">
            {items.map((item) => {
              const selected = item.key === active;
              return (
                <li key={item.key} className="shrink-0">
                  <button
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => onChange(item.key)}
                    className={`w-full cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      selected
                        ? 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                        : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
