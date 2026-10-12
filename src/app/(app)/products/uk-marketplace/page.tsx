import { redirect } from 'next/navigation';

// Base Ürün Takibi /base/tracking'e taşındı. Rota SİLİNMEDİ: eski yer imleri ve
// paylaşılmış derin linkler kırılmasın diye kalıcı yönlendirme bırakıldı.
export default function ProductsUkMarketplacePage() {
  redirect('/base/tracking');
}
