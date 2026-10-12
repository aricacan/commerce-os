'use client';

import { AlertTriangle } from 'lucide-react';

// Meta bağlama butonları (WhatsApp Business / Facebook) sunucuda ayar eksikse ya da
// yapılandırma isteği hata verirse ESKİDEN HİÇ RENDER EDİLMİYORDU. Kullanıcı ekranda
// hiçbir şey görmediği için "kanal bağlama çalışmıyor" diye raporluyordu ve sorunun
// sunucu ayarı olduğu hiçbir yerde yazmıyordu. Artık butonun yerinde bunu söyleyen
// pasif bir rozet duruyor.
export function MetaSetupNotice({ label, missingSettings, loadError }: {
  label: string;
  missingSettings?: string[];
  loadError?: boolean;
}) {
  const detail = loadError
    ? 'Yapılandırma sunucudan okunamadı — backend erişilebilir mi kontrol edin.'
    : missingSettings?.length
      ? `Sunucuda eksik ayar: ${missingSettings.join(', ')}`
      : 'Sunucuda Meta uygulaması yapılandırılmamış.';

  return (
    <span
      title={detail}
      className="inline-flex shrink-0 cursor-help items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-transparent px-3 py-[7px] text-[12.5px] font-semibold text-[var(--fg-muted)]"
    >
      <AlertTriangle size={14} />
      {label} — kurulmadı
    </span>
  );
}
