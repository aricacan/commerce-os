'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import {
  MAIL_AUDIENCE,
  TRIGGER_STATUSES,
  orderMailTemplateApi,
  type OrderMailAudience,
  type OrderMailPreview,
  type OrderMailTemplate,
} from '../../lib/api/order-mail-templates';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { ErrorState } from '../../components/ui/ErrorState';
import { FormSelect, type FormSelectOption } from '../../components/ui/FormSelect';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { sanitizeEmailHtml } from '../../lib/sanitize';
import { orderStatusLabel } from '../../utils/orderStatusLabel';

const inputClass =
  'w-full rounded-[3px] border border-border-soft bg-card px-2.5 py-1.5 text-ui-xs text-fg outline-none transition focus:border-border';
const labelClass = 'mb-1 block text-ui-xs font-medium text-fg-muted';

type Draft = {
  id?: number;
  key: string;
  name: string;
  triggerStatus: string;
  subject: string;
  htmlBody: string;
  audience: OrderMailAudience;
  isEnabled: boolean;
};

function toDraft(template: OrderMailTemplate): Draft {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    triggerStatus: template.triggerStatus ?? '',
    subject: template.subject,
    htmlBody: template.htmlBody,
    audience: template.audience,
    isEnabled: template.isEnabled,
  };
}

const EMPTY_DRAFT: Draft = {
  key: '',
  name: '',
  triggerStatus: '',
  subject: '',
  htmlBody: '<p>Merhaba {{musteriAdi}},</p>\n<p>Siparişiniz kargoya verildi.</p>',
  audience: MAIL_AUDIENCE.DirectOnly,
  isEnabled: false,
};

const TRIGGER_OPTIONS: FormSelectOption<string>[] = [
  { value: '', label: 'Yok (Manuel)' },
  ...TRIGGER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) })),
];

const AUDIENCE_OPTIONS: FormSelectOption<OrderMailAudience>[] = [
  { value: MAIL_AUDIENCE.DirectOnly, label: 'Yalnızca gerçek adresler', hint: 'Pazarlama & bildirim' },
  { value: MAIL_AUDIENCE.DirectAndProxy, label: 'Gerçek + Pazaryeri (İşlemsel)', hint: 'eBay, Amazon maskeli dahil' },
];

export const TEMPLATE_PRESETS: ReadonlyArray<{
  key: string;
  name: string;
  triggerStatus: string;
  audience: OrderMailAudience;
  subject: string;
  htmlBody: string;
  category: string;
  description: string;
}> = [
  {
    key: 'order-received',
    name: 'Sipariş Alındı',
    triggerStatus: 'Yeni',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Siparişiniz Alındı — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişiniz başarıyla alınmıştır.</p>\n<p>Paketiniz hazırlandığında kargo takip bilgileri sizinle paylaşılacaktır.</p>\n<p>Bizi tercih ettiğiniz için teşekkür ederiz.<br/><strong>{{magaza}}</strong></p>',
    category: 'Sipariş Durumu',
    description: 'Sipariş ilk oluşturulduğunda gönderilen bilgilendirme',
  },
  {
    key: 'order-preparing',
    name: 'Sipariş Hazırlanıyor',
    triggerStatus: 'Hazırlanıyor',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Siparişiniz Hazırlanıyor — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişiniz depomuzda özenle paketlenmeye başlandı.</p>\n<p>Ürünleriniz kalite kontrolden geçtikten sonra kargoya teslim edilecektir.</p>\n<p>Saygılarımızla,<br/><strong>{{magaza}}</strong></p>',
    category: 'Depo & Paketleme',
    description: 'Depo hazırlık aşamasına geçen siparişler için bildirim',
  },
  {
    key: 'order-shipped',
    name: 'Kargoya Verildi',
    triggerStatus: 'Kargolandı',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Siparişiniz Kargoya Verildi — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişiniz kargo firmasına teslim edilmiştir.</p>\n<p><strong>Kargo Firması:</strong> {{kargoFirmasi}}<br/><strong>Takip Numarası:</strong> {{kargoTakipNo}}<br/><strong>Teslimat Adresi:</strong> {{sehir}}</p>\n<p>Kargonuzu ilgili taşıyıcının web sitesinden takip edebilirsiniz.</p>\n<p>İyi günlerde kullanmanız dileğiyle,<br/><strong>{{magaza}}</strong></p>',
    category: 'Lojistik & Kargo',
    description: 'Kargo takip no ve taşıyıcı bilgisiyle giden bildirim',
  },
  {
    key: 'order-delivered',
    name: 'Teslim Edildi & Memnuniyet',
    triggerStatus: 'Teslim Edildi',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'Siparişiniz Teslim Edildi — Deneyiminizi Paylaşın',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinizin teslim edildiğini görüntülüyoruz.</p>\n<p>Ürününüzden memnun kaldınız mı? Herhangi bir montaj veya uyumluluk sorusu için bu e-postayı yanıtlayarak bize doğrudan ulaşabilirsiniz.</p>\n<p>Keyifli sürüşler dileriz!<br/><strong>{{magaza}}</strong></p>',
    category: 'Satış Sonrası',
    description: 'Teslimat sonrası müşteri memnuniyeti ve yorum talebi',
  },
  {
    key: 'order-review-reminder',
    name: 'Ürün Değerlendirme & Yorum',
    triggerStatus: '',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'Aldığınız Oto Aksesuarı Nasıl Buldunuz? — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p>Yakın zamanda teslim aldığınız ürününüzü umarız beğendiniz. Deneyiminiz diğer araç sahipleri için çok değerli!</p>\n<p>Birkaç dakikanızı ayırarak siparişinizi değerlendirirseniz çok seviniriz.</p>\n<p>İyi yolculuklar dileriz,<br/><strong>{{magaza}}</strong></p>',
    category: 'Satış Sonrası',
    description: 'Teslimatın ardından müşteriden geri bildirim ve mağaza puanı isteme',
  },
  {
    key: 'order-cancelled',
    name: 'Sipariş İptal Edildi',
    triggerStatus: 'İptal Edildi',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Sipariş İptali — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişiniz talebiniz veya stok durumu doğrultusunda iptal edilmiştir.</p>\n<p>Ödemeniz ilgili ödeme kanalı üzerinden iade sürecine alınmıştır. Bankanıza bağlı olarak 2-5 iş günü içinde hesabınıza yansıyacaktır.</p>\n<p>Anlayışınız için teşekkür ederiz.<br/><strong>{{magaza}}</strong></p>',
    category: 'İptal & İade',
    description: 'İptal ve ücret iadesi bilgilendirme mesajı',
  },
  {
    key: 'order-return-received',
    name: 'İade Alındı & Süreç',
    triggerStatus: 'İade Alındı',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'İade Paketiniz Bize Ulaştı — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinize ait iade paketiniz servis merkezimize ulaşmıştır.</p>\n<p>Teknik ekibimiz ürünü kontrol ettikten sonra yasal süre içinde iade/değişim onayınız tamamlanacaktır.</p>\n<p>Bilgilerinize sunarız.<br/><strong>{{magaza}}</strong></p>',
    category: 'İptal & İade',
    description: 'İade depoya ulaştığında müşteriye iletilen bildirim',
  },
  {
    key: 'order-invoice-issued',
    name: 'E-Fatura Bilgilendirmesi',
    triggerStatus: 'Fatura Kesildi',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'E-Faturanız Hazırlandı — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinize ait resmi e-Arşiv / e-Faturanız düzenlenmiştir.</p>\n<p>Faturanızı ekte veya GİB portalı üzerinden görüntüleyebilirsiniz.</p>\n<p>Sağlıklı günler dileriz.<br/><strong>{{magaza}}</strong></p>',
    category: 'Muhasebe & Fatura',
    description: 'Fatura oluşturulduğunda gönderilen resmi bilgilendirme',
  },
  {
    key: 'order-delay-notice',
    name: 'Teslimat Gecikmesi Bilgisi',
    triggerStatus: '',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Siparişiniz Hakkında Bilgilendirme — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinizin kargoya verilişinde lojistik yoğunluk nedeniyle kısa bir gecikme yaşanmaktadır.</p>\n<p>Siparişiniz en kısa sürede öncelikli olarak gönderilecektir. Yaşanan aksaklıktan dolayı özür diler, sabrınız için teşekkür ederiz.</p>\n<p><strong>{{magaza}} Destek Ekibi</strong></p>',
    category: 'Müşteri Desteği',
    description: 'Hava veya kargo yoğunluklarında gecikme yaşayan siparişler için',
  },
  {
    key: 'order-address-check',
    name: 'Adres Teyidi Talebi',
    triggerStatus: '',
    audience: MAIL_AUDIENCE.DirectAndProxy,
    subject: 'Teslimat Adresinizi Doğrulayabilir misiniz? — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinizin sevkiyatı için adres bilgilerinizde bina/daire no veya telefon numarası eksik görünmektedir.</p>\n<p>Kargonuzun sorunsuz ulaşabilmesi için bu e-postayı doğru adres ve güncel telefonunuzla yanıtlamanızı rica ederiz.</p>\n<p>Teşekkürler,<br/><strong>{{magaza}}</strong></p>',
    category: 'Müşteri Desteği',
    description: 'Eksik veya hatalı kargo adresleri için müşteri teyit şablonu',
  },
  {
    key: 'order-fitment-guide',
    name: 'Montaj & Uyumluluk Kılavuzu',
    triggerStatus: '',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'Aksesuar Parçanız İçin Montaj Önerileri — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p>Satın aldığınız aksesuar ürününün aracınıza montajı öncesinde yüzeyin temiz ve kuru olmasına dikkat ediniz.</p>\n<p>Çift taraflı bant veya klipsli parçaların montajında oda sıcaklığında (20°C+) uygulama yapılması tavsiye edilir.</p>\n<p>Her türlü teknik destek için ekibimizle iletişime geçebilirsiniz.<br/><strong>{{magaza}} Teknik Destek</strong></p>',
    category: 'Teknik Destek',
    description: 'Oto aksesuar ürünleri için montaj ipuçları kılavuzu',
  },
  {
    key: 'order-warranty-support',
    name: 'Garanti & Destek Bilgilendirmesi',
    triggerStatus: '',
    audience: MAIL_AUDIENCE.DirectOnly,
    subject: 'Ürün Garantiniz ve Teknik Destek Kanallarımız — {{platformSiparisNo}}',
    htmlBody: '<p>Merhaba <strong>{{musteriAdi}}</strong>,</p>\n<p><strong>{{platformSiparisNo}}</strong> numaralı siparişinizdeki tüm parçalar üretim hatalarına karşı resmi garantimiz altındadır.</p>\n<p>Herhangi bir arıza veya montaj sorusunda sipariş faturanızla birlikte doğrudan teknik destek birimimize başvurabilirsiniz.</p>\n<p><strong>{{magaza}} Müşteri Memnuniyeti Birimi</strong></p>',
    category: 'Teknik Destek',
    description: 'Garanti koşulları ve yetkili destek irtibat bilgisi',
  },
];

export function OrderMailTemplatesTab() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'editor' | 'presets'>('editor');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<OrderMailPreview | null>(null);
  const [previewMode, setPreviewMode] = useState<'visual' | 'code'>('visual');

  const templatesQuery = useQuery({
    queryKey: ['order-mail-templates'],
    queryFn: orderMailTemplateApi.list,
    staleTime: 60_000,
  });

  const placeholdersQuery = useQuery({
    queryKey: ['order-mail-placeholders'],
    queryFn: orderMailTemplateApi.placeholders,
    staleTime: Infinity,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['order-mail-templates'] });

  const saveMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (value: Draft) =>
      orderMailTemplateApi.save({
        id: value.id,
        key: value.key,
        name: value.name,
        triggerStatus: value.triggerStatus || null,
        subject: value.subject,
        htmlBody: value.htmlBody,
        audience: value.audience,
        isEnabled: value.isEnabled,
      }),
    onSuccess: (saved) => {
      toast.success('Şablon kaydedildi.');
      setDraft(toDraft(saved));
      invalidate();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const deleteMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (id: number) => orderMailTemplateApi.remove(id),
    onSuccess: () => {
      toast.success('Şablon silindi.');
      setDraft(null);
      setPreview(null);
      invalidate();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const previewMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (id: number) => orderMailTemplateApi.preview(id),
    onSuccess: setPreview,
    onError: (error) => toast.error(describeError(error)),
  });

  const handlePreview = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.key.trim()) {
      toast.error('Önizleme için şablon adı ve anahtarını doldurun.');
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync(draft);
      if (saved?.id) {
        previewMutation.mutate(saved.id);
      }
    } catch {
      // Handled in mutation onError
    }
  };

  const loadPreset = (preset: typeof TEMPLATE_PRESETS[number]) => {
    setDraft({
      key: preset.key,
      name: preset.name,
      triggerStatus: preset.triggerStatus,
      audience: preset.audience,
      subject: preset.subject,
      htmlBody: preset.htmlBody,
      isEnabled: true,
    });
    setPreview(null);
    setView('editor');
    toast.success(`"${preset.name}" şablonu yüklendi.`);
  };

  const filteredPresets = useMemo(() => {
    let list =
      categoryFilter === 'all'
        ? TEMPLATE_PRESETS
        : TEMPLATE_PRESETS.filter((p) => p.category === categoryFilter);
    if (presetSearch.trim()) {
      const q = presetSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [categoryFilter, presetSearch]);

  if (templatesQuery.isError) return <ErrorState onRetry={() => templatesQuery.refetch()} />;

  const templates = templatesQuery.data ?? [];
  const isPreviewLoading = saveMutation.isPending || previewMutation.isPending;

  const categories = Array.from(new Set(TEMPLATE_PRESETS.map((p) => p.category)));

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      {/* Üst Çubuk: Sekmeler ve Aksiyonlar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setView('editor')}
            className={`cursor-pointer h-8 rounded-[4px] px-3 text-ui-xs font-semibold transition-colors ${
              view === 'editor'
                ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
            }`}
          >
            Şablon Düzenleyici {templates.length > 0 && `(${templates.length})`}
          </button>
          <button
            type="button"
            onClick={() => setView('presets')}
            className={`cursor-pointer h-8 rounded-[4px] px-3 text-ui-xs font-semibold transition-colors ${
              view === 'presets'
                ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
            }`}
          >
            Hazır Şablon Kütüphanesi ({TEMPLATE_PRESETS.length})
          </button>
        </div>

        {view === 'editor' && (
          <button
            type="button"
            onClick={() => {
              setDraft({ ...EMPTY_DRAFT });
              setPreview(null);
            }}
            className="cursor-pointer h-8 rounded-[4px] border border-border bg-card px-3 text-ui-xs font-semibold text-fg transition-colors hover:bg-card-hover shadow-xs"
          >
            + Yeni Şablon
          </button>
        )}
      </div>

      {/* Görünüm 1: Sayfaya Tam Oturan Hazır Şablonlar Kütüphanesi */}
      {view === 'presets' ? (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
          {/* Kategori ve Arama Filtresi */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <FilterSelect
              value={categoryFilter}
              options={[
                { value: 'all', label: `Tüm Kategoriler (${TEMPLATE_PRESETS.length})` },
                ...categories.map((cat) => ({
                  value: cat,
                  label: `${cat} (${TEMPLATE_PRESETS.filter((p) => p.category === cat).length})`,
                })),
              ]}
              placeholder="Kategori Seçin"
              onChange={setCategoryFilter}
              showAllOption={false}
              height="h-8"
              minWidth={200}
            />

            <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-64">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Şablon ara…"
                className="h-8 w-full rounded-[4px] border border-border-soft bg-card pl-8 pr-2.5 text-xs text-fg outline-none transition focus:border-border"
              />
            </div>
          </div>

          {/* Tam Genişlik Kartlar Izgarası */}
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredPresets.map((preset) => (
              <div
                key={preset.key}
                className="flex flex-col justify-between rounded-[6px] border border-border-soft bg-card p-4 transition hover:border-border hover:shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-ui-sm font-bold text-fg m-0">{preset.name}</h3>
                    <span className="rounded-[4px] border border-border-soft bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                      {preset.category}
                    </span>
                  </div>

                  <p className="text-ui-xs text-fg-muted m-0 leading-relaxed">{preset.description}</p>

                  <div className="rounded-[4px] border border-border-soft/60 bg-bg-subtle/50 px-2.5 py-1.5 font-mono text-[11px] text-fg-muted truncate">
                    <strong className="text-fg">Konu:</strong> {preset.subject}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border-soft/60 pt-3">
                  <span className="text-[11px] text-fg-subtle">
                    {preset.triggerStatus ? `Tetikleyici: ${preset.triggerStatus}` : 'Manuel gönderim'}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="cursor-pointer h-8 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 text-ui-xs font-semibold transition shadow-xs"
                  >
                    Şablonu Kullan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Görünüm 2: Düzenleyici (Sol Liste + Sağ Form/Önizleme) */
        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
          {/* Sol Kenar Çubuğu */}
          <aside className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle px-1">
              Kayıtlı Şablonlar
            </div>
            <div className="flex flex-col gap-1.5">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setDraft(toDraft(template));
                    setPreview(null);
                  }}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[3px] border p-2.5 text-left transition-colors ${
                    draft?.id === template.id
                      ? 'border-border bg-bg-subtle shadow-xs'
                      : 'border-border-soft bg-card hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-ui-xs font-semibold text-fg">{template.name}</span>
                    <span
                      className={`rounded-[2px] px-1.5 py-0.2 text-[10px] font-medium ${
                        template.isEnabled ? 'bg-success-soft text-success' : 'bg-bg-subtle text-fg-muted'
                      }`}
                    >
                      {template.isEnabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <span className="text-[11px] text-fg-muted">
                    {template.triggerStatus ? `Tetikleyici: ${template.triggerStatus}` : 'Manuel'}
                  </span>
                </button>
              ))}

              {templates.length === 0 && !templatesQuery.isLoading && (
                <div className="rounded-[3px] border border-dashed border-border-soft p-4 text-center text-ui-xs text-fg-muted">
                  Kayıtlı şablon bulunmuyor.
                </div>
              )}
            </div>

            {/* Hızlı Hazır Şablonlar Listesi */}
            <div className="mt-3 border-t border-border-soft pt-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Hazır Kurgular
                </span>
                <button
                  type="button"
                  onClick={() => setView('presets')}
                  className="cursor-pointer text-[11px] font-medium text-fg-muted hover:text-fg"
                >
                  Tümünü Gör
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {TEMPLATE_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="cursor-pointer rounded-[3px] border border-border-soft/60 bg-card px-2 py-1.5 text-left text-[11px] text-fg-muted transition hover:border-border hover:bg-card-hover hover:text-fg"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Sağ Alan (Editör & Önizleme) */}
          {draft ? (
            <section className="flex flex-col gap-3 min-h-0 overflow-y-auto rounded-[3px] border border-border-soft bg-card p-4 shadow-xs pr-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="tpl-name">
                    Şablon Adı
                  </label>
                  <input
                    id="tpl-name"
                    className={inputClass}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Kargolandı Bildirimi"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tpl-key">
                    Benzersiz Anahtar
                  </label>
                  <input
                    id="tpl-key"
                    className={inputClass}
                    value={draft.key}
                    onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                    placeholder="order-shipped"
                  />
                </div>
                <div>
                  <label className={labelClass}>Tetikleyici Durum</label>
                  <FormSelect<string>
                    value={draft.triggerStatus}
                    options={TRIGGER_OPTIONS}
                    onChange={(val) => setDraft({ ...draft, triggerStatus: val })}
                    triggerClassName="h-8 rounded-[3px] text-ui-xs"
                  />
                </div>
                <div>
                  <label className={labelClass}>Hedef Kitle</label>
                  <FormSelect<OrderMailAudience>
                    value={draft.audience}
                    options={AUDIENCE_OPTIONS}
                    onChange={(val) => setDraft({ ...draft, audience: val })}
                    triggerClassName="h-8 rounded-[3px] text-ui-xs"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="tpl-subject">
                  E-posta Konusu
                </label>
                <input
                  id="tpl-subject"
                  className={inputClass}
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder="Siparişiniz Kargoya Verildi - {{platformSiparisNo}}"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="tpl-body">
                  Gövde (HTML)
                </label>
                <textarea
                  id="tpl-body"
                  rows={8}
                  className={`${inputClass} font-mono text-ui-xs leading-relaxed`}
                  value={draft.htmlBody}
                  onChange={(e) => setDraft({ ...draft, htmlBody: e.target.value })}
                />
              </div>

              {/* Değişkenler */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-ui-2xs text-fg-subtle">Değişkenler:</span>
                {placeholdersQuery.data?.map((placeholder) => (
                  <button
                    key={placeholder.name}
                    type="button"
                    title={placeholder.description}
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, htmlBody: `${prev.htmlBody} {{${placeholder.name}}}` }
                          : prev,
                      )
                    }
                    className="cursor-pointer rounded-[2px] border border-border-soft bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-mono text-fg-muted transition-colors hover:border-border hover:text-fg"
                  >
                    {`{{${placeholder.name}}}`}
                  </button>
                ))}
              </div>

              {/* Aktiflik Kontrolü */}
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-ui-xs text-fg">
                <input
                  type="checkbox"
                  className="rounded-[2px]"
                  checked={draft.isEnabled}
                  onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })}
                />
                <span>Şablon Aktif (Tetiklendiğinde otomatik e-posta gönder)</span>
              </label>

              {/* Butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveMutation.mutate(draft)}
                    disabled={saveMutation.isPending}
                    className="cursor-pointer h-8 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3.5 text-ui-xs font-semibold transition shadow-xs disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    className="cursor-pointer h-8 rounded-[4px] border border-border bg-card px-3 text-ui-xs font-semibold text-fg transition hover:bg-card-hover disabled:opacity-50 shadow-xs"
                  >
                    {isPreviewLoading ? 'Oluşturuluyor...' : 'Önizleme Oluştur'}
                  </button>
                </div>

                {draft.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.id && confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
                        deleteMutation.mutate(draft.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="cursor-pointer h-8 rounded-[4px] border border-danger/30 bg-danger-soft px-3 text-ui-xs font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
                  >
                    Sil
                  </button>
                )}
              </div>

              {/* Render Edilmiş Önizleme Paneli */}
              {preview && (
                <div className="mt-2 flex flex-col gap-2 rounded-[3px] border border-border-soft bg-bg-subtle/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft/60 pb-2">
                    <div className="flex items-center gap-2 text-ui-xs text-fg-muted">
                      <span>
                        Örnek Sipariş: <strong className="text-fg font-mono">{preview.platformOrderNumber}</strong>
                      </span>
                      <span className="text-fg-subtle">·</span>
                      <span className="font-mono">{preview.recipient ? preview.recipient : 'Alıcı adresi yok'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-[2px] px-2 py-0.5 text-ui-2xs font-semibold ${
                          preview.wouldSend
                            ? 'bg-success-soft text-success'
                            : 'bg-warning-soft text-warning'
                        }`}
                      >
                        {preview.wouldSend ? 'Gönderilirdi' : `Engellendi: ${preview.blockReason}`}
                      </span>

                      <div className="flex items-center rounded-[2px] border border-border-soft bg-card p-0.5 text-ui-2xs">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('visual')}
                          className={`rounded-[2px] px-2 py-0.5 font-medium transition-colors ${
                            previewMode === 'visual'
                              ? 'bg-bg-subtle font-semibold text-fg'
                              : 'text-fg-muted hover:text-fg'
                          }`}
                        >
                          Görsel
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('code')}
                          className={`rounded-[2px] px-2 py-0.5 font-medium transition-colors ${
                            previewMode === 'code'
                              ? 'bg-bg-subtle font-semibold text-fg'
                              : 'text-fg-muted hover:text-fg'
                          }`}
                        >
                          HTML
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-ui-xs text-fg-muted">
                    Konu: <span className="font-semibold text-fg">{preview.subject}</span>
                  </div>

                  {previewMode === 'visual' ? (
                    <div className="min-h-[140px] rounded-[3px] border border-border-soft bg-card p-4 shadow-xs">
                      <div
                        className="max-w-none text-fg space-y-2 text-ui-xs leading-relaxed font-sans [&_p]:m-0 [&_a]:text-blue-500 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(preview.htmlBody) }}
                      />
                    </div>
                  ) : (
                    <pre className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-[3px] border border-border-soft bg-card p-3 font-mono text-ui-xs leading-relaxed text-fg-muted">
                      {preview.htmlBody}
                    </pre>
                  )}
                </div>
              )}
            </section>
          ) : (
            <section className="flex flex-col items-center justify-center rounded-[3px] border border-dashed border-border-soft p-12 text-center">
              <p className="text-ui-sm font-medium text-fg">Düzenlemek için sol listeden bir şablon seçin</p>
              <p className="mt-1 text-ui-xs text-fg-muted">veya Hazır Şablon Kütüphanesi'nden bir kurgu seçerek özelleştirin.</p>
              <button
                type="button"
                onClick={() => setView('presets')}
                className="mt-3 cursor-pointer rounded-[3px] border border-border bg-card px-3 py-1.5 text-ui-xs font-semibold text-fg transition hover:bg-card-hover"
              >
                Hazır Şablonlara Göz At
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
