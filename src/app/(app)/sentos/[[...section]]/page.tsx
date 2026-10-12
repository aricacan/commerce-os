import { WorkspaceRoutePage } from '../../../../components/layout/WorkspaceRoutePage';

// Modül rotası — iç sekmeler opsiyonel catch-all segmentinden okunur (bkz. ModuleWorkspace).
export default function Page() {
  return <WorkspaceRoutePage workspace="sentos" />;
}
