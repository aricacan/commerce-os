'use client';

import { useEffect, useState } from 'react';
import { IS_DEMO } from '../../lib/demo/config';
import { DemoCard } from '../demo/DemoCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Building2 } from 'lucide-react';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useErpisCompanyOverview } from '@/hooks/erpis/useErpisQuery';
import { orderApi } from '@/lib/api/orders';
import type { ErpisCompanyOverview } from '@/lib/api';
import type { DashboardOverview } from '../../types/api';
import { CardHero, CardPeriods, DetailHint, count, formatRange, money } from './DashboardCardParts';
import { DashboardTotals } from './DashboardTotals';
import { ReleaseNotesCard } from './ReleaseNotesCard';

// Pano giriş ekranı: üstte yarı yarıya "Genel Toplam" ve "Sürüm güncellemeleri", altında
// e-ticaret + FİRMA BAŞINA bir kart. Kartlar ALT ALTA, tam genişlikte dizilir: yeni eklenen
// firma listenin sonuna iner, ızgara düzeni (kaç sütun, hangi kart geniş) hesabı gerekmez.
const ERPIS_MODULE_KEY = 'erpis';
const ECOMMERCE_HREF = '/dashboard/ecommerce';
const ERPIS_HREF = '/dashboard/erpis';
const LAST_CHOICE_KEY = 'dashboard_last_choice';

export function DashboardChooser() {
  const router = useRouter();
  const { isModuleAllowed, moduleFlags, isLoading } = useModuleAccess();
  const [lastChoice, setLastChoice] = useState<string | null>(null);

  const erpisAvailable = moduleFlags[ERPIS_MODULE_KEY] !== false && isModuleAllowed(ERPIS_MODULE_KEY);
  const overview = useErpisCompanyOverview();
  const ecommerce = useQuery({
    queryKey: ['dashboard-ecommerce-overview'],
    queryFn: orderApi.overview,
  });

  useEffect(() => {
    if (isLoading) return;

    if (!erpisAvailable) {
      router.replace(ECOMMERCE_HREF);
      return;
    }

    try {
      setLastChoice(localStorage.getItem(LAST_CHOICE_KEY));
    } catch {
      // Yoksay
    }
  }, [isLoading, erpisAvailable, router]);

  if (isLoading || !erpisAvailable) return null;

  const companies = overview.data ?? [];

  function remember(href: string) {
    try { localStorage.setItem(LAST_CHOICE_KEY, href); } catch { /* yoksay */ }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:gap-5">
        {/* Üst şerit: sol yarı genel toplam, sağ yarı sürüm güncellemeleri (dar ekranda alt alta) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <DashboardTotals ecommerce={ecommerce.data} companies={companies} />
          {IS_DEMO ? <DemoCard /> : <ReleaseNotesCard />}
        </div>

        {/* Kartlar alt alta, tam genişlikte */}
        <div className="flex w-full flex-col gap-3.5 lg:gap-4">
          <EcommerceCard
            overview={ecommerce.data}
            isLast={lastChoice === ECOMMERCE_HREF}
            onSelect={() => remember(ECOMMERCE_HREF)}
          />

          {companies.map((company) => {
            const href = `${ERPIS_HREF}?companyId=${company.companyId}`;

            return (
              <CompanyCard
                key={company.companyId}
                company={company}
                isLast={lastChoice === href}
                href={href}
                onSelect={() => remember(href)}
              />
            );
          })}

          {overview.isLoading && <CardSkeleton />}
        </div>
      </div>
    </div>
  );
}

// Kart: dar ekranda dikey; lg+ ekranda solda başlık + ana rakam, sağda dönem tablosu (satır düzeni).
// pb-8: sağ alttaki DetailHint ipucuna yer bırakır (her kırılımda yeniden yazılır, yoksa p-* ezer).
const CARD_CLASS = 'group relative flex min-h-[210px] flex-col gap-3 rounded-[10px] border '
  + 'border-[var(--border)] bg-[var(--card)] p-4 pb-8 shadow-xs transition-all sm:gap-3.5 sm:p-5 sm:pb-8 '
  + 'hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md '
  + 'lg:min-h-0 lg:flex-row lg:items-stretch lg:gap-8 lg:p-6 lg:pb-8 '
  + 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 '
  + 'focus-visible:outline-[var(--fg)]';

const CARD_MAIN_CLASS = 'flex min-w-0 flex-1 flex-col gap-3 sm:gap-3.5 lg:max-w-[42%]';
const CARD_SIDE_CLASS = 'flex min-w-0 flex-1 flex-col justify-end lg:justify-center '
  + 'lg:border-l lg:border-[var(--border-soft)] lg:pl-8';

function EcommerceCard({ overview, isLast, onSelect }: {
  overview?: DashboardOverview;
  isLast: boolean;
  onSelect: () => void;
}) {
  const aov = overview && overview.month.orderCount > 0
    ? Math.round(overview.month.amount / overview.month.orderCount)
    : 0;

  return (
    <Link href={ECOMMERCE_HREF} onClick={onSelect} className={CARD_CLASS}>
      <div className={CARD_MAIN_CLASS}>
        <div className="flex items-center justify-between">
          <CardTitle name="E-ticaret" isLast={isLast} icon={<ShoppingCart size={19} strokeWidth={1.9} />} />
          <span className="rounded-[4px] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            Pazaryerleri
          </span>
        </div>

        {overview ? (
          <>
            <CardHero
              label="Bu ay"
              range={formatRange(overview.monthFrom, overview.monthTo)}
              value={overview.month.amount}
              unit="TL"
              previous={overview.previousMonth}
              storea={overview.daily}
            />

            <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--fg-muted)]">
              <div className="flex items-center gap-1.5">
                <span>Ort. Sipariş:</span>
                <strong className="font-extrabold text-[var(--fg)] tabular-nums">{money(aov)} TL</strong>
              </div>
              <span className="text-[10px] font-medium text-[var(--fg-muted)]">
                Canlı Senkron
              </span>
            </div>
          </>
        ) : (
          <p className="flex-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            Pazaryeri ve ERP senkron verisi — sipariş, kâr, kargo, reklam
          </p>
        )}
      </div>

      {overview && (
        <div className={CARD_SIDE_CLASS}>
          <CardPeriods
            bare
            format={money}
            periods={[
              { label: 'Bugün', period: toCard(overview.today) },
              { label: 'Son 7 gün', period: toCard(overview.last7) },
              { label: 'Son 1 ay', period: toCard(overview.last30) },
              { label: 'Son 1 yıl', period: toCard(overview.last365) },
            ]}
          />
        </div>
      )}
      <DetailHint />
    </Link>
  );
}

// E-ticaret dönemi kart şekline çevriliyor: iki uç farklı alan adları kullanıyor
// (productCount / itemCount) ama kart tek bir şekil biliyor.
function toCard(period: DashboardOverview['today']) {
  return {
    amount: period.amount,
    orderCount: period.orderCount,
    itemCount: period.productCount,
  };
}

function CompanyCard({ company, href, isLast, onSelect }: {
  company: ErpisCompanyOverview;
  href: string;
  isLast: boolean;
  onSelect: () => void;
}) {
  const byQuantity = company.last365.amount === 0 && company.last365.quantity > 0;

  const value = (period: ErpisCompanyOverview['today']) =>
    (byQuantity ? period.quantity : period.amount);

  const totalMarket = company.domestic + company.foreign;
  const domesticPct = totalMarket > 0 ? Math.round((company.domestic / totalMarket) * 100) : 0;
  const foreignPct = totalMarket > 0 ? 100 - domesticPct : 0;

  return (
    <Link href={href} onClick={onSelect} className={CARD_CLASS}>
      <div className={CARD_MAIN_CLASS}>
        <div className="flex items-center justify-between">
          <CardTitle name={company.name} isLast={isLast} icon={<Building2 size={19} strokeWidth={1.9} />} />
          <span className="rounded-[4px] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            Fabrika
          </span>
        </div>

        <CardHero
          label="Bu ay"
          range={formatRange(company.monthFrom, company.monthTo)}
          note={company.previousMonth == null && company.dataSince
            ? `${formatSince(company.dataSince)} beri`
            : undefined}
          value={value(company.month)}
          unit={byQuantity ? 'adet' : company.currency}
          previous={company.previousMonth}
          storea={byQuantity ? company.dailyQuantity : company.daily}
        />

        {totalMarket > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--fg-muted)]">
            <div className="flex items-center gap-2">
              <span>Y. İçi: <strong className="font-extrabold text-[var(--fg)]">%{domesticPct}</strong></span>
              <span className="text-[var(--border)]">•</span>
              <span>İhracat: <strong className="font-extrabold text-[var(--fg)]">%{foreignPct}</strong></span>
            </div>
            <span className="text-[10px] font-medium text-[var(--fg-muted)]">
              Erpis SQL
            </span>
          </div>
        )}
      </div>

      <div className={CARD_SIDE_CLASS}>
        <CardPeriods
          bare
          format={byQuantity ? count : money}
          periods={[
            { label: 'Bugün', period: { ...company.today, amount: value(company.today) } },
            { label: 'Son 7 gün', period: { ...company.last7, amount: value(company.last7) } },
            { label: 'Son 1 ay', period: { ...company.last30, amount: value(company.last30) } },
            { label: 'Son 1 yıl', period: { ...company.last365, amount: value(company.last365) } },
          ]}
        />
      </div>
      <DetailHint />
    </Link>
  );
}

function CardTitle({ name, isLast, icon }: {
  name: string;
  isLast: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon && (
        <span className="shrink-0 text-[var(--fg-muted)] transition-colors group-hover:text-[var(--fg)]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-[-0.3px] text-[var(--fg)] sm:text-[20px]">
        {name}
      </span>
      {isLast && <LastBadge />}
    </div>
  );
}

// "7 Eyl'den" gibi kısa bir tarih — kartın alt şeridinde tam tarih fazla yer kaplıyor.
function formatSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}'den`;
}

function LastBadge() {
  return (
    <span className="shrink-0 rounded-[4px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.3px] text-[var(--fg-muted)]">
      Son
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="min-h-[190px] animate-pulse rounded-[10px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] lg:min-h-[150px]" />
  );
}
