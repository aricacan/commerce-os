// Partnerlere açık MCP araçlarının listesi — TEK KAYNAK.
//
// İki yerde gösteriliyor: "Genel Bakış" sekmesinde (günlük başvuru için, hemen
// göz önünde) ve "Amaç & Yardım" rehberinde (kurulumu anlatan bağlamın içinde).
// Liste kopyalansaydı yeni bir tool eklendiğinde biri güncellenip diğeri
// unutulurdu.
//
// Alan adları HelpDoc'un FieldTable satır tipiyle AYNI (field/desc) — rehber
// tarafında dönüştürme yapmadan doğrudan verilebiliyor.
export interface PartnerTool {
  /** Partnerin çağırdığı tool adı. */
  field: string;
  /** Ne döndürdüğü — kişisel veri sınırları dahil. */
  desc: string;
}

export const PARTNER_TOOLS: readonly PartnerTool[] = [
  { field: 'list_categories', desc: 'Kategori listesi' },
  { field: 'list_stores', desc: 'Mağaza listesi' },
  { field: 'list_products / get_product', desc: 'Ürün: SKU, stok, kategori, mağaza, satış fiyatı' },
  { field: 'list_orders / get_order', desc: 'Sipariş: SKU, adet, durum, tarih, toplam tutar — müşteri bilgisi yok' },
  { field: 'list_erp_connections', desc: 'Bağlı ERP sistemleri' },
  { field: 'list_marketplace_connections', desc: 'Bağlı pazaryeri hesapları' },
  { field: 'get_ads_overview', desc: 'Reklam performansı özeti: harcama, gösterim, tıklama' },
  { field: 'list_sites', desc: 'Bağlı web siteleri' },
  { field: 'get_site_requests_summary', desc: 'Site talep hacmi özeti — ziyaretçi bilgisi yok' },
  { field: 'validate_mapping', desc: 'Partner kendi alan eşlemesini anında doğrulatır' },
];
