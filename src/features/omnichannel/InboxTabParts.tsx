import { Inbox as InboxIcon } from 'lucide-react';
import type { HubConnectionStatus } from './useOmnichannelHub';

// P38: bağlantı durumu şeridi — yalnızca 'connected' değilken görünür, konuşma listesinin
// TEPESİNDE (her iki düzende de ortak) çünkü kullanıcı önce oraya bakıyor.
export function ConnectionBanner({ status }: { status: HubConnectionStatus }) {
  if (status === 'connected') return null;
  const connecting = status === 'connecting';
  return (
    <div
      role="status"
      className={`flex shrink-0 items-center gap-2 px-4 py-1.5 text-ui-xs font-semibold ${
        connecting ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger'
      }`}
    >
      <span className={`size-1.5 shrink-0 rounded-full bg-current ${connecting ? 'animate-pulse' : ''}`} />
      {connecting ? 'Canlı bağlantı kuruluyor…' : 'Canlı bağlantı koptu — mesajlar gecikmeli gelebilir'}
    </div>
  );
}

// Boş durum bilerek tasarlandı: "seçim yok" demek yerine ne yapılacağını söylüyor.
export function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-bg-subtle text-fg-muted">
        <InboxIcon size={22} aria-hidden />
      </span>
      <p className="m-0 text-ui-md font-semibold text-fg">Bir konuşma seçin</p>
      <p className="m-0 max-w-[280px] text-ui-sm text-fg-muted">
        Soldaki listeden bir müşteri seçerek yazışmayı görüntüleyip yanıtlayabilirsiniz.
      </p>
    </div>
  );
}
