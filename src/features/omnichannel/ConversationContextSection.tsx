import { Car, Package, Sparkles } from 'lucide-react';
import type { ConversationContextDto } from '../../lib/api/omnichannel';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS } from './infoSectionStyle';
import { vehicleLabelOf } from './useConversationContext';

// "Bot bu konuşmada ne öğrendi?" (Faz 9): araç ve ürün. Temsilci devraldığında müşteriye
// yeniden sormasın. Çağıran yalnız bilgi varken çizer (bkz. hasConversationContext).
export function ConversationContextSection({ context }: { context: ConversationContextDto }) {
  const vehicle = vehicleLabelOf(context);

  return (
    <section aria-label="Araç ve ürün" className={INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        <Sparkles size={14} className="shrink-0 text-fg-muted" aria-hidden />
        <h3 className="m-0 text-ui-sm font-bold text-fg">Botun öğrendikleri</h3>
      </div>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1.5 text-ui-sm">
        {vehicle && (
          <>
            <dt className="flex items-center gap-1.5 text-fg-muted"><Car size={13} aria-hidden /> Araç</dt>
            <dd className="m-0 break-words text-fg">{vehicle}</dd>
          </>
        )}
        {context.product && (
          <>
            <dt className="flex items-center gap-1.5 text-fg-muted"><Package size={13} aria-hidden /> Ürün</dt>
            <dd className="m-0 flex min-w-0 flex-col">
              <span className="break-words font-semibold text-fg">{context.product.name}</span>
              <span className="text-ui-xs text-fg-muted">
                SKU {context.product.supplierSku} · stok {context.product.stockQuantity}
              </span>
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
