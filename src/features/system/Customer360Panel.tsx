'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Package, MessageCircle, AlertCircle, Users, ChevronDown, Phone,
} from 'lucide-react';
import { customer360Api } from '../../lib/api/customer360';
import { useI18n } from '../../lib/i18n';
import { formatOrderNumberWithHash } from '../../utils/orderNumber';
import { orderStatusLabel } from '../../utils/orderStatusLabel';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

const AVATAR_PALETTE = ['#e52521', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Customer360Panel() {
  const { lang } = useI18n();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const enabled = query.length >= MIN_QUERY_LENGTH;
  const { data, isFetching } = useQuery({
    queryKey: ['customer360-search', query],
    queryFn: () => customer360Api.search(query),
    enabled,
    staleTime: 15_000,
  });

  const totals = useMemo(() => {
    if (!data) return null;
    const revenue = data.orderCustomers.reduce((sum, g) => sum + g.totalRevenue, 0);
    const profit = data.orderCustomers.reduce((sum, g) => sum + g.totalNetProfit, 0);
    return { customers: data.orderCustomers.length, revenue, profit };
  }, [data]);

  const hasResults = !!data && (data.orderCustomers.length > 0 || data.contacts.length > 0);

  return (
    <div className="flex flex-col gap-4 w-full text-xs">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] pointer-events-none" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lang === 'tr' ? 'İsim, sipariş no veya e-posta ile ara…' : 'Search by name, order number, or email…'}
          className="h-10 w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)] shadow-xs transition"
        />
      </div>

      {!enabled && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)] space-y-2">
          <Users size={24} className="mx-auto opacity-30" />
          <p>
            {lang === 'tr'
              ? `Aramak için en az ${MIN_QUERY_LENGTH} karakter yazın.`
              : `Type at least ${MIN_QUERY_LENGTH} characters to search.`}
          </p>
        </div>
      )}

      {enabled && isFetching && !data && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">
          {lang === 'tr' ? 'Aranıyor…' : 'Searching…'}
        </div>
      )}

      {enabled && data && !hasResults && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">
          {lang === 'tr' ? 'Hiçbir eşleşme bulunamadı.' : 'No matches found.'}
        </div>
      )}

      {hasResults && totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--fg-muted)]">{lang === 'tr' ? 'Eşleşen Müşteri' : 'Matched Customers'}</span>
            <div className="text-base font-bold text-[var(--fg)]">{totals.customers}</div>
          </div>
          <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--fg-muted)]">{lang === 'tr' ? 'Toplam Ciro' : 'Total Revenue'}</span>
            <div className="text-base font-bold text-[var(--fg)]">₺{totals.revenue.toLocaleString('tr-TR')}</div>
          </div>
          <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--fg-muted)]">{lang === 'tr' ? 'Toplam Net Kâr' : 'Total Net Profit'}</span>
            <div className={`text-base font-bold ${totals.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totals.profit >= 0 ? '+' : ''}₺{totals.profit.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>
      )}

      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sipariş Eşleşmeleri */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase">
              <Package size={13} />
              <span>{lang === 'tr' ? 'Sipariş Eşleşmeleri' : 'Order Matches'}</span>
              <span className="text-[var(--fg)] font-mono">({data!.orders.length})</span>
            </div>
            {data!.orderCustomers.map((group) => (
              <CustomerOrderGroup
                key={group.customerName}
                group={group}
                orders={data!.orders.filter((o) => o.customerName === group.customerName)}
                lang={lang}
              />
            ))}
            {data!.orderCustomers.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border-soft)] rounded-[4px]">
                {lang === 'tr' ? 'Sipariş eşleşmesi yok.' : 'No order matches.'}
              </div>
            )}
          </div>

          {/* Omnichannel / Konuşma Eşleşmeleri */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase">
              <MessageCircle size={13} />
              <span>{lang === 'tr' ? 'Konuşma Eşleşmeleri' : 'Conversation Matches'}</span>
              <span className="text-[var(--fg)] font-mono">({data!.contacts.length})</span>
            </div>
            {data!.contacts.map((contact) => (
              <ContactCard key={contact.contactId} contact={contact} lang={lang} />
            ))}
            {data!.contacts.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border-soft)] rounded-[4px]">
                {lang === 'tr' ? 'Konuşma eşleşmesi yok.' : 'No conversation matches.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const color = colorForName(name);
  return (
    <div
      style={{ width: size, height: size, background: color }}
      className="rounded-[4px] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
    >
      {initialsForName(name)}
    </div>
  );
}

function CustomerOrderGroup({ group, orders, lang }: {
  group: { customerName: string; orderCount: number; totalRevenue: number; totalNetProfit: number };
  orders: import('../../lib/api/customer360').CustomerOrderRow[];
  lang: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-[var(--bg-subtle)]/40 cursor-pointer"
      >
        <Avatar name={group.customerName} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[var(--fg)] truncate">{group.customerName}</div>
          <div className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
            {group.orderCount} {lang === 'tr' ? 'sipariş' : 'orders'} · ₺{group.totalRevenue.toLocaleString('tr-TR')}
            {' · '}
            <span className={`font-semibold ${group.totalNetProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {group.totalNetProfit >= 0 ? '+' : ''}₺{group.totalNetProfit.toLocaleString('tr-TR')}
            </span>
          </div>
        </div>
        <ChevronDown size={14} className={`text-[var(--fg-muted)] shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-soft)] p-2.5 bg-[var(--bg-subtle)]/20 space-y-1.5">
          {orders.map((o) => (
            <div key={o.orderId} className="flex items-center justify-between p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold text-[var(--fg)]">
                  <span title={o.platformOrderNumber} className="truncate">{formatOrderNumberWithHash(o.platformOrderNumber)}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)] font-normal">
                    {orderStatusLabel(o.universalStatus)}
                  </span>
                </div>
                <div className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
                  {o.storeName} / {o.platformName} · {new Date(o.orderDate).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-[var(--fg)]">₺{o.revenue.toLocaleString('tr-TR')}</div>
                <div className={`text-[10.5px] font-semibold ${o.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {o.netProfit >= 0 ? '+' : ''}₺{o.netProfit.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact, lang }: { contact: import('../../lib/api/customer360').ContactMatch; lang: string }) {
  return (
    <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={contact.displayName} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[var(--fg)] truncate">{contact.displayName}</div>
          <div className="flex items-center gap-2 text-[10.5px] text-[var(--fg-muted)] mt-0.5">
            <span className="flex items-center gap-1">
              <MessageCircle size={10} className="text-emerald-500" />
              <span>{contact.channelName}</span>
            </span>
            {contact.phoneNumber && (
              <span className="flex items-center gap-1 font-mono">
                <Phone size={9} />
                <span>{contact.phoneNumber}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {contact.conversations.length === 0 ? (
        <div className="text-[11px] text-[var(--fg-muted)]">
          {lang === 'tr' ? 'Konuşma geçmişi yok.' : 'No conversation history.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {contact.conversations.map((c) => (
            <div
              key={c.conversationId}
              className={`p-2 rounded-[3px] border bg-[var(--bg-subtle)]/30 text-xs ${
                c.isUrgent ? 'border-rose-500/30' : 'border-[var(--border-soft)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--fg)] truncate">{c.lastMessagePreview || '(mesaj yok)'}</span>
                {c.isUrgent && <AlertCircle size={12} className="text-rose-500 shrink-0" />}
              </div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-1 flex items-center justify-between">
                <span>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString('tr-TR') : '—'} · {c.status}</span>
                {c.unreadCount > 0 && (
                  <span className="px-1.5 rounded-[2px] bg-rose-500 text-white font-bold text-[9.5px]">
                    {c.unreadCount} okunmadı
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
