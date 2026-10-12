import type { ReactNode } from 'react';

interface Props {
  title: string;
  description: string;
  actions: ReactNode;
  error: string | null;
  children?: ReactNode;
}

// Bakım kartındaki tek işlem satırı: başlık + açıklama solda, düğmeler sağda (telefonda alta kayar), sonuç altta.
export function MaintenanceRow({ title, description, actions, error, children }: Props) {
  return (
    <li className="flex flex-col gap-2 rounded-md bg-bg-subtle p-2.5">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <span className="text-ui-sm font-semibold text-fg">{title}</span>
          <span className="text-ui-xs text-fg-muted">{description}</span>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
      {error && <p role="alert" className="m-0 text-ui-xs text-danger">{error}</p>}
    </li>
  );
}
