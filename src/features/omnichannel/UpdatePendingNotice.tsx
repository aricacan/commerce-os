import { CloudOff } from 'lucide-react';
import { SERVER_UPDATE_PENDING_TEXT } from './botTraceRules';

// Yeni uç sunucuda henüz yokken gösterilen sakin boş durum (hata kırmızısı değil).
export function UpdatePendingNotice() {
  return (
    <p role="status" className="m-0 flex items-start gap-2 rounded-lg bg-bg-subtle px-3 py-2 text-ui-xs text-fg-muted">
      <CloudOff size={13} className="mt-px shrink-0" aria-hidden />
      {SERVER_UPDATE_PENDING_TEXT}
    </p>
  );
}
