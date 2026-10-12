'use client';

import { useCatalogPriceRules } from './useCatalogPriceRules';

// Profil fiyat listesinin tek satırlık özeti. Kurallar profil düzenleyicisinde (Profil Merkezi › Düzenle) yönetilir.
export function PriceRulesSummary({ profileId }: { profileId: number }) {
  const { rules, loading, error } = useCatalogPriceRules(profileId);
  if (loading) return <span className="text-[var(--fg-muted)]">Fiyat kuralları yükleniyor…</span>;
  if (error) return <span className="text-rose-500">{error}</span>;

  const active = rules.filter((rule) => rule.isActive).length;
  return (
    <span className="text-[var(--fg)]">
      {rules.length === 0 ? 'Fiyat listesi yok (kaynağın fiyatı söylenir).' : `${rules.length} fiyat kuralı, ${active} aktif.`}
    </span>
  );
}
