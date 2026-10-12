// "Ayrıntılar" panelindeki bölümlerin ortak yüzeyi: aynı köşe, kenar ve iç boşluk (8px sistemi).
const SECTION_LAYOUT = 'flex min-w-0 flex-col rounded-xl border text-ui-sm';

// Kendi iç boşluğunu yöneten bölümler (ör. katlanır başlıklı Takipler) için yalnız yüzey.
export const INFO_SECTION_SURFACE_CLASS = `${SECTION_LAYOUT} border-border-soft bg-card`;

export const INFO_SECTION_CLASS = `${INFO_SECTION_SURFACE_CLASS} gap-2 p-3`;

// Acil durumdaki bölüm (ör. acil devir): aynı düzen, tehlike tonu.
export const INFO_SECTION_URGENT_CLASS = `${SECTION_LAYOUT} gap-2 p-3 border-danger/30 bg-danger-soft`;

// Bölüm başlığı satırı: simge + kalın başlık + sağda isteğe bağlı eylem.
export const INFO_SECTION_HEADING_CLASS = 'flex min-w-0 flex-wrap items-center gap-2';
