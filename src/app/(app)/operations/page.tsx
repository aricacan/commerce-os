import { redirect } from 'next/navigation';

type OperationsPageProps = {
  searchParams: Promise<{ view?: string }>;
};

// Operasyon Merkezi Sistem İzleme modülüne taşındı. Eski adres kayıtlı linkler, yer imleri
// ve operasyon işlerinin eylem bağlantıları için ayakta kalıyor. Onaylar ve Değişiklik
// Geçmişi Ayarlar'a taşındı; diğer her şey İzleme > İş Kuyruğu'na gider.
const VIEW_TO_PATH: Record<string, string> = {
  approvals: '/system/moderation',
  history: '/system/change-history',
};

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const { view } = await searchParams;
  redirect(VIEW_TO_PATH[view ?? ''] ?? '/monitoring/operations');
}
