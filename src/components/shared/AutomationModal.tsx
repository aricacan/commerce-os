'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface AutomationTab<TId extends string> {
  id: TId;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface AutomationModalProps<TId extends string> {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tabs: AutomationTab<TId>[];
  activeTab: TId;
  onTabChange: (id: TId) => void;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}

/**
 * Mail ve Slack otomasyon modallerinin ORTAK kabuğu — başlık, sekme çubuğu, gövde.
 *
 * Neden ortak: iki panel aynı işi yapıyor (hesap/kanal → kural → önizleme → geçmiş) ama
 * ayrı yazıldıklarında farklı köşe yarıçapı, farklı sekme yüksekliği ve farklı dropdown'la
 * bitmişlerdi. Kabuk tek yerde durunca üçüncü bir otomasyon paneli de aynı görünür.
 */
export function AutomationModal<TId extends string>({
  icon,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  closeLabel,
  children,
}: AutomationModalProps<TId>) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-[95vw] max-w-[900px] flex-col overflow-hidden rounded-[2px] border border-[#64748b] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#cbd5e1] dark:border-[#334155] bg-[var(--card)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400">
              {icon}
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[var(--fg)]">{title}</h2>
              <p className="text-[11px] text-[var(--fg-muted)]">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] text-[var(--fg-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--fg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-[#cbd5e1] px-5 pt-2 dark:border-[#334155] bg-[var(--bg-muted)]/40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-[2px] border-b-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'border-sky-600 border-t border-x border-[#cbd5e1] bg-[var(--card)] text-sky-700 dark:border-[#334155] dark:text-sky-400 -mb-[1px]'
                  : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 rounded-[2px] bg-sky-100 px-1.5 font-mono text-[10px] text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-[var(--fg)]">{children}</div>
      </div>
    </div>
  );
}
