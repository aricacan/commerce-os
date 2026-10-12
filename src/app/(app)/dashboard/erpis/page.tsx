import { ErpisDashboard } from '../../../../components/dashboard/erpis/ErpisDashboard';

// Panonun Erpis görünümü. E-ticaret görünümü (/dashboard) ayrı bir rota — ikisi aynı
// kiracıya ait, sadece veri kaynağı farklı (bkz. DashboardChooser).
export default function ErpisDashboardPage() {
  return <ErpisDashboard />;
}
