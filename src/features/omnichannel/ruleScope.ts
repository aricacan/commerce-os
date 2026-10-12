// Çapraz satış ve devir kuralları iki yerde aynı bileşenle gösterilir: Hesap geneli (tüm kurallar) ve Kanal Merkezi
// (yalnız o kanala uyanlar). Kanal Merkezi bu kapsamı verir; verilmezse bileşen tüm kuralları gösterir.
export interface ChannelRuleScope {
  /** Yeni çapraz satış kuralının varsayılan markası (kanalın markası). */
  brandId: number | null;
  /** Yeni devir kuralının varsayılan ülkesi (kanalın ülkesi). */
  country: string | null;
  /** Sunucunun bu kanala uyan saydığı kural kimlikleri. */
  visibleIds: ReadonlySet<number>;
  /** Kural değişince kanal ayarlarını (eşleşen kural listesini) yeniler. */
  onChanged: () => Promise<void>;
}

export const rulesInScope = <T extends { id: number }>(rules: readonly T[], scope?: ChannelRuleScope): T[] =>
  scope ? rules.filter((rule) => scope.visibleIds.has(rule.id)) : [...rules];

/** Sayfa olarak (Hesap geneli) kendi dolgusunu taşır; Kanal Merkezi içinde yerleşik olarak dolgusuzdur. */
export const rulesRootClass = (scope?: ChannelRuleScope): string =>
  scope ? 'flex min-w-0 flex-col gap-4 text-xs' : 'flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5';
