// Gelen kutusu konuşma senaryoları: her senaryo bir müşteri/bot/temsilci diyaloğu ve aşama bilgisidir.
import { DEMO_PRODUCTS } from './core';

export type Who = 'customer' | 'bot' | 'agent';
export interface Turn { who: Who; text: string }

// Sayısal karşılıklar api/omnichannel.ts enum'larıyla birebirdir (değer import'u döngü yaratır).
export const TOPIC = { Purchase: 1, Shipping: 2, AfterSales: 3, Complaint: 4, Other: 5 } as const;
export const STAGE = {
  BotHandling: 1, AwaitingCustomer: 2, AwaitingAgent: 3, Handoff: 4, OrderCollecting: 5,
  OrderAwaitingConfirmation: 6, AwaitingPayment: 7, OrderPlaced: 8, Shipped: 9, Resolved: 10, Dormant: 11,
} as const;
export const STATUS = { Open: 0, Pending: 1, Resolved: 2 } as const;
export const HANDOFF_REASON_CODE = { Requested: 1, Complaint: 2, PriceRequest: 3, NotUnderstood: 0 } as const;

export interface ScriptContext {
  first: string;
  full: string;
  city: string;
  productName: string;
  sku: string;
  price: string;
  vehicle: string;
  orderNo: string;
  country: 'TR' | 'UK';
}

export interface ScriptHandoff { reason: number; summary: string }

export interface Script {
  key: string;
  lang: 'tr' | 'en';
  topic: number;
  stage: number;
  status: number;
  botActive: boolean;
  urgent?: boolean;
  /** true: temsilciye atanmış (demo kullanıcı ya da ekip arkadaşı); false: atanmamış. */
  assigned: boolean;
  handoff?: ScriptHandoff;
  subject?: (ctx: ScriptContext) => string;
  turns: (ctx: ScriptContext) => Turn[];
}

const c = (text: string): Turn => ({ who: 'customer', text });
const b = (text: string): Turn => ({ who: 'bot', text });
const a = (text: string): Turn => ({ who: 'agent', text });

const FICTIONAL_IBAN = 'TR00 0000 0000 0000 0000 0000 00';

export const SCRIPTS: Record<string, Script> = {
  stock: {
    key: 'stock', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`Merhaba, ${x.vehicle} için ${x.productName} var mı?`),
      b(`Merhaba ${x.first}! ${x.vehicle} için ${x.productName} stokta mevcut, fiyatı ${x.price}. Model yılını öğrenebilir miyim?`),
      c('2019 model'),
      b(`Teşekkürler. 2019 ${x.vehicle} ile uyumlu: ${x.productName} (SKU: ${x.sku}) stokta. Sipariş vermek ister misiniz?`),
      c('Kargo ücreti ne kadar, kaç günde gelir?'),
      b('Türkiye içi kargo 1-2 iş günüdür. 750 TL üzeri siparişlerde kargo ücretsizdir.'),
    ],
  },
  collecting: {
    key: 'collecting', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.OrderCollecting, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.productName} sipariş vermek istiyorum`),
      b(`Harika! 1 adet ${x.productName}, ${x.price}. Teslimat için ad soyadınızı yazar mısınız?`),
      c(x.full),
      b('Teşekkürler. Teslimat adresinizi (il / ilçe / açık adres) yazar mısınız?'),
      c(`${x.city}, Örnek Mah. Deneme Sk. No:12 D:4`),
      b('Adresi not aldım. Ödeme yöntemi olarak Havale/EFT veya kapıda ödeme seçeneklerimiz var, hangisini tercih edersiniz?'),
      c('Kapıda ödeme olsun'),
    ],
  },
  confirm: {
    key: 'confirm', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.OrderAwaitingConfirmation, status: STATUS.Pending, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.vehicle} için ${x.productName} istiyorum, 2 adet`),
      b(`Elbette. ${x.productName} x2 stokta. Teslimat adresiniz ve adınız?`),
      c(`${x.full}, ${x.city} Merkez, Test Cad. No:5`),
      b(`Sipariş özetiniz:\n- ${x.productName} x2\n- Teslimat: ${x.city}\n- Ödeme: Kapıda ödeme\nOnaylıyor musunuz? (Evet / Hayır)`),
    ],
  },
  payment: {
    key: 'payment', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.AwaitingPayment, status: STATUS.Pending, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.productName} almak istiyorum, havale ile ödeyeceğim`),
      b(`Siparişiniz oluşturuldu (${x.orderNo}). Toplam ${x.price}. Ödeme için hesap bilgileri:\nDemo Oto Aksesuar - ${FICTIONAL_IBAN}\nAçıklamaya sipariş numaranızı yazmayı unutmayın.`),
      c('Tamamdır, akşam yatırırım'),
      b('Teşekkürler! Ödemeniz ulaştığında siparişinizi hemen hazırlayıp kargoya vereceğiz.'),
    ],
  },
  shipping: {
    key: 'shipping', lang: 'tr', topic: TOPIC.Shipping, stage: STAGE.Shipped, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`Merhaba, ${x.orderNo} numaralı siparişim ne durumda?`),
      b(`${x.orderNo} numaralı siparişiniz kargoya verildi. Takip numarası: 000123456789. Tahmini teslimat yarın.`),
      c('Çok teşekkürler'),
      b('Rica ederiz, iyi günler dileriz!'),
    ],
  },
  complaintOpen: {
    key: 'complaintOpen', lang: 'tr', topic: TOPIC.Complaint, stage: STAGE.Handoff, status: STATUS.Open, botActive: false, urgent: true, assigned: false,
    handoff: { reason: HANDOFF_REASON_CODE.Complaint, summary: 'Müşteri ürünün kutudan hasarlı çıktığını bildiriyor, değişim bekliyor.' },
    turns: (x) => [
      c(`Aldığım ${x.productName} kutudan çatlak çıktı, çok memnuniyetsizim`),
      b('Yaşadığınız sorun için çok üzgünüz. Sizi hemen bir temsilcimize bağlıyorum, kısa süre içinde yazacaklar.'),
      c('Acil dönüş yapın lütfen, aracıma takacaktım'),
      c(`Sipariş numaram ${x.orderNo}`),
    ],
  },
  complaintHandled: {
    key: 'complaintHandled', lang: 'tr', topic: TOPIC.Complaint, stage: STAGE.AwaitingCustomer, status: STATUS.Pending, botActive: false, assigned: true,
    handoff: { reason: HANDOFF_REASON_CODE.Complaint, summary: 'Hasarlı ürün şikâyeti; fotoğraf istendi, değişim hazırlanıyor.' },
    turns: (x) => [
      c(`${x.productName} bozuk geldi, ${x.orderNo} numaralı siparişim`),
      b('Üzgünüz, sizi hemen bir temsilcimize aktarıyorum.'),
      a(`Merhaba ${x.first}, ben Ece. Sorunu görebilmemiz için ürünün fotoğrafını paylaşabilir misiniz?`),
      c('Fotoğrafı gönderdim'),
      a('Teşekkürler, görüntü net. Ücretsiz değişim başlatıyorum; yeni ürün yarın kargoda olacak.'),
    ],
  },
  returnRequest: {
    key: 'returnRequest', lang: 'tr', topic: TOPIC.AfterSales, stage: STAGE.AwaitingCustomer, status: STATUS.Pending, botActive: false, assigned: true,
    handoff: { reason: HANDOFF_REASON_CODE.Requested, summary: 'Müşteri iade etmek istiyor, iade koşulları paylaşıldı.' },
    turns: (x) => [
      c(`${x.orderNo} siparişimi iade etmek istiyorum, aracıma uymadı`),
      b('Sizi iade işlemleri için bir temsilcimize bağlıyorum.'),
      a(`Merhaba ${x.first}, ürün kullanılmamışsa 14 gün içinde iade edebilirsiniz. İade kodunu e-postayla gönderiyorum.`),
      c('Kullanmadım, kutusu da duruyor'),
      a('Süper. Ürünü anlaşmalı kargo ile ücretsiz gönderebilirsiniz; ulaşınca ücret iadesi 3 iş günü içinde yapılır.'),
    ],
  },
  wholesale: {
    key: 'wholesale', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.Handoff, status: STATUS.Open, botActive: false, assigned: false,
    handoff: { reason: HANDOFF_REASON_CODE.PriceRequest, summary: 'Toptan fiyat talebi: 50 adet üzeri alım için özel teklif isteniyor.' },
    turns: (x) => [
      c(`Merhaba, ${x.productName} için toptan fiyat alabilir miyim? 50 adet düşünüyorum`),
      b('Toptan fiyat teklifleri için sizi satış ekibimize aktarıyorum, kısa sürede dönüş yapılacak.'),
      c('Fatura kesiyorum, vergi levhası gönderebilirim'),
    ],
  },
  fitment: {
    key: 'fitment', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.vehicle} 2018 model, araç telefon tutucu uyar mı?`),
      b(`Evet, Araç Telefon Tutucu modellerimiz ${x.vehicle} ile uyumludur; havalandırma ve torpido tipi seçenekleri var. Hangisini tercih edersiniz?`),
      c('Havalandırma tipi'),
      b('Havalandırma tipi tutucu stokta, fiyatı 249 TL. İsterseniz sipariş oluşturabilirim.'),
    ],
  },
  photo: {
    key: 'photo', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c('[Fotoğraf] Bu üründen sizde var mı?'),
      b(`Fotoğraftaki ürünle eşleşen kayıt bulundu: ${x.productName} (SKU: ${x.sku}), fiyatı ${x.price}. Stokta mevcut.`),
      c('Harika, kaç günde gelir?'),
      b('İstanbul içi 1 iş günü, diğer şehirler 1-2 iş günüdür.'),
    ],
  },
  outOfStock: {
    key: 'outOfStock', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.vehicle} için tavan barı arıyorum`),
      b(`${x.vehicle} için tavan barı modelimiz şu an stokta yok. Talebinizi kaydettim; stoğa girdiğinde sizi bilgilendireceğiz.`),
      c('Ne zaman gelir yaklaşık?'),
      b('Tedarikçi bilgisine göre 10-14 gün içinde stoğa girmesi bekleniyor.'),
    ],
  },
  invoice: {
    key: 'invoice', lang: 'tr', topic: TOPIC.AfterSales, stage: STAGE.Resolved, status: STATUS.Resolved, botActive: false, assigned: true,
    turns: (x) => [
      c(`${x.orderNo} siparişim için firma adına fatura istiyorum`),
      b('Fatura talebinizi bir temsilcimize iletiyorum.'),
      a('Merhaba, firma unvanı ve vergi numaranızı yazarsanız faturayı düzenleyip e-postanıza göndereceğim.'),
      c('Örnek Otomotiv Ltd. Şti. - Vergi no: 0000000000'),
      a('Faturanız e-postanıza gönderildi. İyi günler dilerim!'),
      c('Teşekkürler, ulaştı'),
    ],
  },
  thanks: {
    key: 'thanks', lang: 'tr', topic: TOPIC.Other, stage: STAGE.Resolved, status: STATUS.Resolved, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.orderNo} siparişim elime ulaştı, ürün harika`),
      b('Çok sevindik, geri bildiriminiz için teşekkür ederiz! Başka bir konuda yardımcı olabilirsek buradayız.'),
      c('Teşekkürler, tekrar alışveriş yapacağım'),
    ],
  },
  dormant: {
    key: 'dormant', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.Dormant, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`${x.productName} fiyatı nedir?`),
      b(`${x.productName} fiyatı ${x.price}, stokta mevcuttur. Sipariş oluşturmamı ister misiniz?`),
    ],
  },
  igPrice: {
    key: 'igPrice', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c('Fiyat?'),
      b(`Merhaba! Paylaşımdaki ürün ${x.productName}, fiyatı ${x.price}. Hangi aracınız için bakıyorsunuz?`),
      c(`${x.vehicle}`),
      b('Teşekkürler, bu araçla uyumlu. Sipariş vermek isterseniz adınızı ve teslimat ilini yazabilirsiniz.'),
    ],
  },
  emailWholesale: {
    key: 'emailWholesale', lang: 'tr', topic: TOPIC.Purchase, stage: STAGE.AwaitingAgent, status: STATUS.Open, botActive: false, assigned: true,
    handoff: { reason: HANDOFF_REASON_CODE.PriceRequest, summary: 'Kurumsal e-posta: bayilik ve toplu alım için fiyat listesi isteniyor.' },
    subject: () => 'Bayilik ve toplu alım hakkında bilgi',
    turns: (x) => [
      c(`Merhaba,\n\n${x.city}'da oto aksesuar mağazası işletiyoruz. Paspas, bagaj havuzu ve bakım ürünlerinizde bayilik koşullarını ve güncel toptan fiyat listenizi paylaşabilir misiniz?\n\nSaygılarımla,\n${x.full}`),
      a(`Merhaba ${x.first} Bey/Hanım,\n\nİlginiz için teşekkürler. Bayilik koşullarımızı ve fiyat listesini bu e-postaya ekleyerek göndereceğim. Minimum ilk sipariş tutarı ve vade seçeneklerini de ayrıca iletirim.\n\nİyi çalışmalar,\nDemo Oto Aksesuar`),
      c('Teşekkürler, listeyi inceleyip dönüş yapacağız.'),
    ],
  },
  emailQuestion: {
    key: 'emailQuestion', lang: 'tr', topic: TOPIC.Shipping, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    subject: (x) => `${x.orderNo} numaralı sipariş hakkında`,
    turns: (x) => [
      c(`Merhaba,\n${x.orderNo} numaralı siparişim 3 gündür kargoda görünüyor ancak hareket yok. Bilgi verebilir misiniz?\n\n${x.full}`),
      b(`Merhaba ${x.first}, siparişiniz taşıyıcı firmanın ${x.city} aktarma merkezine ulaştı ve yarın dağıtıma çıkacak. Takip numarası: 000123456789.`),
    ],
  },
  enStock: {
    key: 'enStock', lang: 'en', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`Hi, do you have ${x.productName} for a ${x.vehicle}?`),
      b(`Hello ${x.first}! Yes, ${x.productName} is in stock at ${x.price}. Could you tell me the model year?`),
      c('It is a 2018'),
      b(`Thanks. It fits the 2018 ${x.vehicle} (SKU: ${x.sku}). Would you like me to place an order?`),
      c('How long is delivery to ' + x.city + '?'),
      b('UK mainland delivery takes 2-3 working days. Orders over £50 ship free.'),
    ],
  },
  enDelivery: {
    key: 'enDelivery', lang: 'en', topic: TOPIC.Shipping, stage: STAGE.Shipped, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`Hello, where is my order ${x.orderNo}?`),
      b(`Your order ${x.orderNo} was dispatched yesterday. Tracking number: 000123456789. Estimated delivery: tomorrow before 6pm.`),
      c('Great, thank you'),
    ],
  },
  enReturn: {
    key: 'enReturn', lang: 'en', topic: TOPIC.AfterSales, stage: STAGE.AwaitingCustomer, status: STATUS.Pending, botActive: false, assigned: true,
    handoff: { reason: HANDOFF_REASON_CODE.Requested, summary: 'Customer wants to return an item that does not fit the car.' },
    turns: (x) => [
      c(`I would like to return ${x.productName} from order ${x.orderNo}, it does not fit my ${x.vehicle}`),
      b('I will connect you with a team member who can help with returns.'),
      a(`Hi ${x.first}, sorry about the trouble. You can return unused items within 30 days. I have emailed you a prepaid returns label.`),
      c('Thanks, I will post it tomorrow'),
    ],
  },
  enInvoice: {
    key: 'enInvoice', lang: 'en', topic: TOPIC.AfterSales, stage: STAGE.Resolved, status: STATUS.Resolved, botActive: false, assigned: true,
    turns: (x) => [
      c(`Can I get a VAT invoice for order ${x.orderNo}?`),
      b('Let me pass this to a colleague who can issue invoices.'),
      a('Hello! Sure - please confirm the company name and VAT number and I will email the invoice shortly.'),
      c('Example Garage Ltd, VAT GB000000000'),
      a('Done - the VAT invoice is on its way to your inbox.'),
    ],
  },
  enComplaint: {
    key: 'enComplaint', lang: 'en', topic: TOPIC.Complaint, stage: STAGE.Handoff, status: STATUS.Open, botActive: false, urgent: true, assigned: false,
    handoff: { reason: HANDOFF_REASON_CODE.Complaint, summary: 'Customer reports a damaged item and requests a replacement.' },
    turns: (x) => [
      c(`The ${x.productName} arrived damaged. Order ${x.orderNo}. This is really disappointing.`),
      b('I am very sorry about that. I am passing you to a team member right away.'),
      c('Please reply soon, I need it for the weekend'),
    ],
  },
  enFitment: {
    key: 'enFitment', lang: 'en', topic: TOPIC.Purchase, stage: STAGE.BotHandling, status: STATUS.Open, botActive: true, assigned: false,
    turns: (x) => [
      c(`Will a reversing camera work with a ${x.vehicle}?`),
      b(`Yes, our Reversing Camera is compatible with the ${x.vehicle}. It comes with a universal wiring kit. It costs ${x.price}.`),
      c('Does it come with fitting instructions?'),
      b('Yes, a step-by-step guide and a video link are included in the box.'),
    ],
  },
  enEmailBulk: {
    key: 'enEmailBulk', lang: 'en', topic: TOPIC.Purchase, stage: STAGE.AwaitingAgent, status: STATUS.Open, botActive: false, assigned: true,
    handoff: { reason: HANDOFF_REASON_CODE.PriceRequest, summary: 'Garage owner asks for trade pricing on floor mats and boot liners.' },
    subject: () => 'Trade pricing enquiry',
    turns: (x) => [
      c(`Hello,\n\nWe run a small garage in ${x.city} and would like trade pricing on floor mats and boot liners. Do you offer volume discounts?\n\nKind regards,\n${x.full}`),
      a(`Hi ${x.first},\n\nThanks for getting in touch. We do offer trade pricing from 20 units. I will send our trade price list shortly.\n\nBest wishes,\nDemo Auto UK`),
      c('Brilliant, much appreciated.'),
    ],
  },
};

const EN_KIND_NAMES = [
  '3D Floor Mats', 'Boot Liner', 'Steering Wheel Cover', 'Seat Cover Set', 'Wiper Set', 'LED Headlight Bulb',
  'Phone Holder', 'Car Air Freshener', 'Mud Flaps', 'Roof Bars', 'Reversing Camera', 'Tyre Shine',
];
const GBP_DIVISOR = 42;

export interface DemoProductView { id: number; sku: string; nameTr: string; nameEn: string; priceTry: number; priceGbp: number }

/** Demo ürün listesinin konuşmalar için sade görünümü (TR ve EN ad). */
export const PRODUCT_VIEWS: DemoProductView[] = DEMO_PRODUCTS.map((product, index) => ({
  id: product.id,
  sku: product.sku,
  nameTr: product.name,
  nameEn: `${product.brand} ${EN_KIND_NAMES[index % EN_KIND_NAMES.length]}`,
  priceTry: product.price,
  priceGbp: Math.max(6, Math.round(product.price / GBP_DIVISOR)),
}));

export const TR_VEHICLES = ['Passat B8', 'Golf 7', 'Corolla', 'Clio 5', 'Fiorino', 'Egea', 'Megane 4', 'Astra K'];
export const UK_VEHICLES = ['Ford Focus', 'Vauxhall Corsa', 'VW Golf', 'BMW 3 Series', 'Mini Cooper'];
