import { DashboardChooser } from '../../../components/dashboard/DashboardChooser';

// Pano giriş ekranı: kullanıcı hangi tarafa bakacağını seçer.
//
// E-ticaret ve fabrika iki ayrı iş alanı; ikisinin KPI'ları, widget'ları ve filtreleri
// farklı. Birini varsayılan yapıp diğerini bir sekmenin arkasına koymak, ikinci grubu
// sürekli fazladan tıklamaya zorlardı.
export default function DashboardPage() {
  return <DashboardChooser />;
}
