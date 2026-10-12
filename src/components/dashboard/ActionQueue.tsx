'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { actionQueueApi, type ActionQueueItem } from '@/lib/api/orderStatuses';

/**
 * Dashboard "yapılacaklar" kartı.
 *
 * Amaç rakam göstermek değil, kullanıcıyı bir sonraki işine götürmek — bu yüzden her
 * satır bir bağlantıdır. Sayısı sıfır olan satır gösterilmez: boş bir uyarı listesi,
 * gerçek uyarıları gölgeler.
 */
export function ActionQueue() {
  const [items, setItems] = useState<ActionQueueItem[] | null>(null);

  useEffect(() => {
    let active = true;
    actionQueueApi
      .get()
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  if (items === null) return null;

  const pending = items.filter((item) => item.count > 0);
  if (pending.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl border p-4">
      <h2 className="text-sm font-semibold">Yapılacaklar</h2>

      <ul className="flex flex-col gap-1">
        {pending.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <span>{item.label}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
