// Menü ve koleksiyon ağaçlarının ortak görünümü. Konnektörler saf CSS (sözde öğeler, currentColor yerine tema border rengi):
// dikey çizgi kardeşler boyunca iner, "dirsek" (alt+sol kenarlık, yuvarlak köşe) satırın ortasına döner.
// Satır başlığı h-10 (40px) olduğu için dirsek 20px (h-5) ile tam ortaya denk gelir; ölçüleri birlikte değiştirin.

export const TREE_ROW_CLASS = 'h-10';

// Alt öğeler listesi: ebeveynin simge sütununun altından başlar.
export const TREE_CHILDREN_CLASS = 'm-0 ml-4 flex list-none flex-col p-0 pl-5 pt-1.5';

const ELBOW_CLASS =
  'relative pb-1.5 after:absolute after:-left-5 after:top-0 after:h-5 after:w-5 after:rounded-bl-lg after:border-b after:border-l after:border-border';
const TRUNK_CLASS = 'before:absolute before:-left-5 before:top-0 before:h-full before:w-px before:bg-border';

// Son kardeşte gövde çizgisi yok (dirsekte biter); diğerlerinde aşağı devam eder.
export const treeConnectorClass = (isLast: boolean): string => (isLast ? ELBOW_CLASS : `${ELBOW_CLASS} ${TRUNK_CLASS}`);

// Satır kartı: durum vurgusu menü fark renkleriyle uyumlu (yeşil eklenen, amber taşınan/düzenlenen, kırmızı silinen).
export const TREE_CARD_CLASS = 'flex min-w-0 rounded-lg border bg-card px-2 transition-colors duration-200';
