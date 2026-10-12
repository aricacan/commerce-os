'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, X } from 'lucide-react';
import { returnsApi, type ReturnDocument } from '../../lib/api/returns';
import { customerApi } from '../../lib/api/pre-accounting';
import { describeError } from '../../lib/errors';

interface Props {
  returnId: number;
  customerId: number | null;
  onChanged: (document: ReturnDocument) => void;
}

const MAX_SUGGESTIONS = 8;

/**
 * İade belgesine cari bağlama.
 *
 * NEDEN ZORUNLU: `CompleteAsync` alacağı YALNIZCA `CustomerId` doluysa yazıyor. Talepten
 * üretilen belgelerde cari çoğu zaman otomatik çözülemez — pazaryeri siparişlerinin çoğu
 * PROXY e-posta taşıyor (eBay/Amazon/Temu) ve o adresler carilerimizde bulunmaz. Bu ekran
 * olmadan operatör iadeyi "Tamamla" diyip bitmiş sanıyor, ama cariye hiçbir şey yazılmıyor
 * ve geriye yalnızca bir uyarı denetim satırı kalıyordu.
 */
export function ReturnCustomerPicker({ returnId, customerId, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cari listesi küçük ve nadiren değişir; sunucuda arama ucu yok, filtreleme istemcide.
  //
  // Bağlı cari VARKEN de yüklenir: aksi halde seçici hiç açılmadığı için liste gelmiyor ve
  // ekranda ada karşılık yalnızca "#3" görünüyordu — kullanıcı paranın kime yazılacağını
  // yine göremezdi. Sorgu paylaşılan bir anahtar kullanıyor, yani tüm kartlar tek istek atar.
  const { data: customers } = useQuery({
    queryKey: ['customers-for-return'],
    queryFn: customerApi.list,
    enabled: open || customerId !== null,
    staleTime: 5 * 60_000,
  });

  const bagli = customers?.find((c) => c.id === customerId) ?? null;

  const term = search.trim().toLocaleLowerCase('tr-TR');
  const oneriler = (customers ?? [])
    .filter((c) =>
      term === ''
      || c.name.toLocaleLowerCase('tr-TR').includes(term)
      || (c.email?.toLocaleLowerCase('tr-TR').includes(term) ?? false))
    .slice(0, MAX_SUGGESTIONS);

  async function apply(next: number | null) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await returnsApi.setCustomer(returnId, next));
      setOpen(false);
      setSearch('');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  if (customerId !== null) {
    return (
      <p className="m-0 flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Link2 size={11} />
        Cari bağlı{bagli ? `: ${bagli.name}` : ` (#${customerId})`} — tamamlanınca iade tutarı
        bu hesaba alacak yazılacak.
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply(null)}
          className="cursor-pointer rounded-[2px] px-1 text-fg-subtle hover:text-danger disabled:opacity-50"
          title="Cari bağını kaldır"
        >
          <X size={11} />
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 rounded-[2px] bg-warning-soft px-2 py-1 text-[11px] text-warning">
          Cari bağlı değil — bu belge tamamlansa bile <strong>hiçbir hesaba alacak yazılmaz</strong>.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[2px] border border-border-soft bg-bg-subtle/50 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-border hover:text-fg"
        >
          <Link2 size={11} />
          Cari Bağla
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[2px] border border-border-soft bg-bg-subtle/40 p-2">
      <input
        type="search"
        value={search}
        autoFocus
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari adı veya e-posta ara…"
        className="h-7 rounded-[2px] border border-border-soft bg-card px-2 text-[11px] text-fg"
      />

      {customers === undefined ? (
        <p className="m-0 text-[11px] text-fg-muted">Yükleniyor…</p>
      ) : oneriler.length === 0 ? (
        <p className="m-0 text-[11px] text-fg-muted">Eşleşen cari yok.</p>
      ) : (
        <ul className="flex max-h-40 list-none flex-col gap-0.5 overflow-y-auto p-0">
          {oneriler.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void apply(customer.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[2px] px-2 py-1 text-left text-[11px] hover:bg-card disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-fg">{customer.name}</span>
                {customer.email && (
                  <span className="shrink-0 truncate text-fg-subtle">{customer.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="m-0 text-[11px] text-danger">{error}</p>}

      <button
        type="button"
        onClick={() => { setOpen(false); setError(null); }}
        className="w-fit cursor-pointer rounded-[2px] px-1 text-[11px] text-fg-muted hover:text-fg"
      >
        Vazgeç
      </button>
    </div>
  );
}
