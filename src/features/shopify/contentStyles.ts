// Koleksiyon ve menü ekranlarının ortak sınıfları (styles.ts'i tamamlar; tema değişkenleriyle, inline stil yok).

// Çok satırlı alan: fieldClass sabit yükseklikli (h-8) olduğu için ayrı sınıf.
export const textAreaClass =
  'w-full min-w-0 rounded-md border border-border bg-bg px-2 py-1.5 text-ui-xs text-fg outline-none focus:border-fg';

export const listRowClass = 'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2';

export const iconButtonClass =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-fg hover:bg-bg-subtle disabled:opacity-30';
