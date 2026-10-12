import { create } from 'zustand';

// Marka-only seçim — Widget/Excel Rapor Oluşturucu ve AI ajanı gibi "bu markanın TÜM
// verisi dahil olsun" diyen, connector (Sentos/Base) ayrımına ihtiyaç duymayan yerler
// için. Ambient ERP seçicisi (Topbar) BUNU DEĞİL, aşağıdaki ErpSourceCode'u kullanır.
export type BrandCode = 'storea' | 'storeb';

export const BRAND_OPTIONS: { code: BrandCode; label: string; color: string }[] = [
  { code: 'storea', label: 'StoreA', color: '#64748b' },
  { code: 'storeb', label: 'StoreB', color: '#64748b' },
];

// Ambient ERP seçicisi (Topbar) — bir (Mağaza × ERP-kaynağı) kombinasyonunun kodu.
// Base'in bir markanın verisi olduğu doğru (order_source_id ile StoreA/StoreB'ye
// atanıyor — bkz. BaseChannelStoreMapping) ama o markanın Sentos-native verisiyle
// BİRLEŞTİRİLMEDEN ayrı görülmek isteniyor (kullanıcı talebi: "storea sentos, storeb
// sentos ve baseden gelen verileri birleştirmek istemiyoruz ayrı görmek istiyoruz").
// Bu yüzden burada "storea"/"storeb" gibi bare bir kod YOK — her seçenek kaynağını
// açıkça taşır.
//
// TİP ARTIK SABİT LİTERAL BİRLİK DEĞİL, `string`: geçerli kod kümesi backend'de
// veritabanındaki DataSource satırlarından türetiliyor (bkz. IErpSourceCodeResolver) ve
// panelden yeni bir mağaza/ERP eklenince büyüyor. Sabit birlik tutulduğunda yeni eklenen
// mağazanın kodu `isErpSourceCode` tarafından eleniyor, kullanıcı seçemiyordu.
// Gerçek doğrulama backend'de yapılır — bilinmeyen kod orada açık bir hata verir.
export type ErpSourceCode = string;

// Yalnızca GERİYE DÖNÜK varsayılan/örnek liste. Canlı seçenekler Topbar'da
// erpSourcesApi üzerinden dinamik gelir (bkz. Topbar rawSourceCatalog); burası
// sadece API'nin henüz yanıt vermediği ilk render için bir yer tutucudur.
export const ERP_SOURCE_OPTIONS: { code: ErpSourceCode; label: string; color: string }[] = [
  { code: 'base-storea', label: 'Base - StoreA', color: '#64748b' },
  { code: 'base-storeb', label: 'Base - StoreB', color: '#64748b' },
  { code: 'storea-sentos', label: 'Sentos - StoreA', color: '#64748b' },
  { code: 'storeb-sentos', label: 'Sentos - StoreB', color: '#64748b' },
];

const STORAGE_KEY = 'selectedStores';
const LEGACY_STORAGE_KEY = 'selectedStore'; // eski tekil-seçim sürümü
const PLATFORM_STORAGE_KEY = 'selectedPlatformIds';
const LEGACY_PLATFORM_STORAGE_KEY = 'selectedPlatformId'; // eski tekil-seçim sürümü
const MP_STORAGE_KEY = 'selectedMp';

// localStorage'dan okunan değerin ŞEKLİNİ doğrular, geçerliliğini DEĞİL — geçerli kod
// kümesi artık dinamik (bkz. ErpSourceCode yorumu), bu yüzden burada sabit bir listeye
// karşı eşleştirmek panelden eklenen yeni mağazaları sessizce elerdi.
//
// "storea"/"storeb"/"base" gibi ESKİ bare kodlar hâlâ elenir: tire içermeyen bir kod
// (Mağaza × ERP) çifti olamaz. Bu, eski formatın temizlenmesini korurken yeni kodlara
// (ör. "acme-sentos") yer açar.
function isErpSourceCode(value: unknown): value is ErpSourceCode {
  return typeof value === 'string' && value.includes('-') && value.length > 2;
}

// Doğrudan pazaryeri entegrasyonu (ERP'den bağımsız, ör. "Amazon-StoreA") — Settings >
// Entegrasyon'da kayıtlı bir PlatformApiCredential'dan türer (bkz. integrationsApi.mpOptions).
export interface MpSelection {
  storeId: number;
  storeCode: string;
  platformId: number;
  platformName: string;
}

interface StoreSelectorState {
  // Boş dizi = "Tümü" (filtre yok). 1+ eleman = o (marka, kaynak) çiftlerine filtrele.
  selectedStores: ErpSourceCode[];
  // ERP seçimine ek pazaryeri (Platform.Id) alt-filtresi — ÇOKLU seçim, ERP boşken anlamsız.
  // Boş dizi = "Tümü" (filtre yok). MP aktifken HER ZAMAN boştur (bkz. setMp — ikisi
  // birlikte aktif olmaz).
  selectedPlatformIds: number[];
  // Doğrudan pazaryeri entegrasyonu modu — aktifken selectedStores/selectedPlatformIds sıfırlanır.
  selectedMp: MpSelection | null;
  toggleStore: (code: ErpSourceCode) => void;
  selectAll: () => void;
  setSelectedStores: (codes: ErpSourceCode[]) => void;
  togglePlatform: (platformId: number) => void;
  clearPlatforms: () => void;
  setMp: (mp: MpSelection | null) => void;
}

function persist(codes: ErpSourceCode[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch (e) {
    console.error('Failed to persist selectedStores to localStorage:', e);
  }
}

function persistPlatforms(platformIds: number[]) {
  try {
    if (platformIds.length === 0) localStorage.removeItem(PLATFORM_STORAGE_KEY);
    else localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(platformIds));
  } catch (e) {
    console.error('Failed to persist selectedPlatformIds to localStorage:', e);
  }
}

function persistMp(mp: MpSelection | null) {
  try {
    if (mp === null) localStorage.removeItem(MP_STORAGE_KEY);
    else localStorage.setItem(MP_STORAGE_KEY, JSON.stringify(mp));
  } catch (e) {
    console.error('Failed to persist selectedMp to localStorage:', e);
  }
}

function readInitialStores(): ErpSourceCode[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Eski format ("storea"/"storeb"/"base" bare kodlar) artık geçersiz — filter onları
      // sessizce eler, kullanıcı bir sonraki yüklemede "Tümü"ye düşer (kırılma yok).
      if (Array.isArray(parsed)) return parsed.filter(isErpSourceCode);
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to read selectedStores from localStorage:', e);
  }
  return [];
}

function readInitialPlatforms(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((n): n is number => Number.isFinite(n));
    }
    // Eski tekil-seçim formatından göç — bir kereliğine okunup silinir.
    const legacy = localStorage.getItem(LEGACY_PLATFORM_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PLATFORM_STORAGE_KEY);
    const legacyNum = legacy !== null ? Number(legacy) : NaN;
    return Number.isFinite(legacyNum) ? [legacyNum] : [];
  } catch (e) {
    console.error('Failed to read selectedPlatformIds from localStorage:', e);
    return [];
  }
}

function readInitialMp(): MpSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(MP_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as MpSelection) : null;
  } catch (e) {
    console.error('Failed to read selectedMp from localStorage:', e);
    return null;
  }
}

export const useStoreSelector = create<StoreSelectorState>((set, get) => ({
  selectedStores: readInitialStores(),
  selectedPlatformIds: readInitialPlatforms(),
  selectedMp: readInitialMp(),
  toggleStore: (code) => {
    const current = get().selectedStores;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    // KRİTİK: bir önceki ERP seçiminde geçerli olan Platform'lar (ör. eBay), yeni ERP
    // kapsamında (ör. Sentos - StoreA) hiç var olmayabilir — bu durumda ambient
    // X-Platform header'ı o kapsamdaki TÜM siparişleri sessizce sıfıra düşürür
    // ("hiç veri yok" gibi görünür). Bu yüzden ERP seçimi her değiştiğinde Platform
    // "Tümü"ne (boş) sıfırlanır; kullanıcı isterse yeni kapsamda tekrar seçer.
    persist(next);
    persistPlatforms([]);
    persistMp(null);
    set({ selectedStores: next, selectedPlatformIds: [], selectedMp: null });
  },
  selectAll: () => {
    persist([]);
    persistPlatforms([]);
    persistMp(null);
    set({ selectedStores: [], selectedPlatformIds: [], selectedMp: null });
  },
  setSelectedStores: (codes) => {
    // toggleStore ile aynı gerekçe: ERP kapsamı topluca değiştiğinde önceki Platform
    // seçimi yeni kapsamda geçersiz olup "hiç veri yok" gibi görünebilir — Platform'u
    // "Tümü"ne sıfırla (kaskad seçicideki "Bu ülkenin/ERP'nin tümü" bunu kullanır).
    persist(codes);
    persistPlatforms([]);
    persistMp(null);
    set({ selectedStores: codes, selectedPlatformIds: [], selectedMp: null });
  },
  togglePlatform: (platformId) => {
    const current = get().selectedPlatformIds;
    const next = current.includes(platformId)
      ? current.filter((id) => id !== platformId)
      : [...current, platformId];
    persistPlatforms(next);
    set({ selectedPlatformIds: next });
  },
  clearPlatforms: () => {
    persistPlatforms([]);
    set({ selectedPlatformIds: [] });
  },
  setMp: (mp) => {
    persist([]);
    persistPlatforms([]);
    persistMp(mp);
    set({ selectedStores: [], selectedPlatformIds: [], selectedMp: mp });
  },
}));
