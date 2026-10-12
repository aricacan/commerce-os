import { DashboardFilters } from '../../../../components/dashboard/DashboardFilters';
import { KpiBar } from '../../../../components/dashboard/KpiBar';
import { DeferredDashboardContent } from '../../../../components/dashboard/DeferredDashboardContent';

// Panonun e-ticaret görünümü — pazaryeri ve ERP senkron verisi.
export default function EcommerceDashboardPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <DashboardFilters />
      <KpiBar />
      <DeferredDashboardContent />
    </div>
  );
}
