'use client';

import { useEffect, useState } from 'react';
import { historyApi, type EntityHistoryItem } from '@/lib/api/history';

interface Props {
  entityType: string;
  entityId: string;
  limit?: number;
}

/**
 * Belge geçmişi paneli — fatura, sipariş, cari gibi belgelerin denetim kaydını gösterir.
 *
 * Veri yıllardır AuditLog'da vardı; eksik olan tek şey kullanıcıya gösterilmesiydi.
 */
export function EntityHistoryPanel({ entityType, entityId, limit = 100 }: Props) {
  const [items, setItems] = useState<EntityHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    historyApi
      .forEntity(entityType, entityId, limit)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError('Geçmiş yüklenemedi.');
      });

    return () => {
      active = false;
    };
  }, [entityType, entityId, limit]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (items === null) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Bu belge için henüz kayıt yok.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li
          key={`${item.occurredAt}-${index}`}
          className={`flex flex-col gap-1 border-l-2 pl-3 ${
            item.severity === 'Warning' ? 'border-amber-500' : 'border-border'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span>{item.action}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {item.source}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={item.occurredAt}>
              {new Date(item.occurredAt).toLocaleString('tr-TR')}
            </time>
            {item.userEmail && <span>· {item.userEmail}</span>}
          </div>

          {item.details && (
            <p className="break-all text-xs text-muted-foreground">{item.details}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
