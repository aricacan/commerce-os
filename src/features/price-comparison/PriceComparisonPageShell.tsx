'use client';

// Fiyat Analizi sayfaları için birleşik master kart kapsayıcısı
export function PriceComparisonPageShell({
  toolbar,
  children,
}: {
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        {toolbar && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
            {toolbar}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
