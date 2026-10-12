// Yükleme iskeletleri. Shimmer animasyonu globals.css'teki `.skeleton` sınıfından gelir —
// burada sadece boyut/dizilim var, böylece açık/koyu tema tek yerden yönetilir.
//
// Boyutlar `style` ile veriliyor: genişlik/yükseklik çağrı yerine göre değişen dinamik
// değerler, Tailwind sınıfına derlenemezler. Renk/köşe/boşluk her zaman sınıflarla.

type SkeletonProps = {
  /** Sayı verilirse px, string verilirse olduğu gibi ('60%', '12rem'). */
  width?: number | string;
  height?: number | string;
  className?: string;
};

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

type SkeletonListProps = {
  /** Kaç satır çizilecek. */
  count?: number;
  /** Her satırın yüksekliği (px). */
  rowHeight?: number;
  className?: string;
};

/**
 * Tablo/liste beklerken kullanılan dikey satır yığını.
 * Tek tek `.skeleton` div'i kopyalamak yerine bunu çağır.
 */
export function SkeletonList({ count = 8, rowHeight = 64, className = '' }: SkeletonListProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`} role="status" aria-label="Yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={rowHeight} className="rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Rota geçişlerinde gösterilen genel sayfa iskeleti (bkz. app/(app)/loading.tsx).
 * Hangi sayfaya gidildiği bilinmediği için başlık + filtre çubuğu + liste varsayar;
 * uygulamadaki sayfaların ezici çoğunluğu bu düzende.
 */
export function SkeletonPage() {
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden p-5" role="status" aria-label="Sayfa yükleniyor">
      {/* Başlık */}
      <div className="flex flex-col gap-2">
        <Skeleton height={26} width={220} />
        <Skeleton height={14} width={320} />
      </div>

      {/* Filtre çubuğu */}
      <div className="flex flex-wrap gap-2">
        <Skeleton height={36} width={180} className="rounded-lg" />
        <Skeleton height={36} width={130} className="rounded-lg" />
        <Skeleton height={36} width={130} className="rounded-lg" />
      </div>

      {/* İçerik */}
      <SkeletonList count={7} rowHeight={56} />
    </div>
  );
}
