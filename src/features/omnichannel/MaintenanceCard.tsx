'use client';

import { AutomationEchoRepairRow } from './AutomationEchoRepairRow';
import { ContactNameBackfillRow } from './ContactNameBackfillRow';
import { Customer360BackfillRow } from './Customer360BackfillRow';
import { MetaPermissionProbeRow } from './MetaPermissionProbeRow';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

// Bir kerelik veri onarımları — yalnız Omnichannel yöneticisi görür (asıl denetim sunucuda).
export function MaintenanceCard() {
  const isAdmin = useIsOmnichannelAdmin();
  if (!isAdmin) return null;

  return (
    <section aria-label="Bakım" className="flex flex-col gap-3 rounded-lg border border-border-soft bg-card p-3">
      <h3 className="m-0 text-ui-md font-bold text-fg">Bakım</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <AutomationEchoRepairRow />
        <ContactNameBackfillRow />
        <Customer360BackfillRow />
        <MetaPermissionProbeRow />
      </ul>
    </section>
  );
}
