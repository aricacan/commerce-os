'use client';

// lucide-react marka ikonlarını (WhatsApp/Instagram/Facebook/TikTok) yayınlamıyor,
// bu yüzden gerçek marka logoları basit SVG bileşenleri olarak buraya gömülüdür.
// Hepsi `currentColor` kullanır — böylece bulundukları yerin (kart rozeti / tip
// seçici) rengini alır, tek bir CHANNEL_TYPE_META.color kaynağından yönetilir.
import type { ComponentType } from 'react';
import { MessageCircle } from 'lucide-react';
import {
  CHANNEL_STATUS, CHANNEL_TYPE, ASSIGNMENT_POLICY,
  type ChannelStatus, type ChannelType, type AssignmentPolicy,
} from '../../lib/api/omnichannel';
import { palette } from '../shared/design';

// ─── Marka SVG ikonları ───────────────────────────────────────────────────────
// Tümü 24×24 viewBox. `color` verilmezse `currentColor` kullanılır (lucide-react
// ikonlarıyla aynı davranış) — bulundukları yerin metin rengini otomatik alırlar.

type IconProps = { size?: number; color?: string };

const WhatsAppIcon: ComponentType<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const FacebookIcon: ComponentType<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon: ComponentType<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon: ComponentType<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

// E-postanın marka logosu yok: marka-nötr, canlı zarf. Gövde `color` ile (mavi), kapak sabit
// kırmızıyla çizilir — açık ve koyu temada okunur, gri/soluk kalmaz.
const EMAIL_COLOR = 'oklch(55% 0.19 255)';
const EMAIL_FLAP_COLOR = 'oklch(62% 0.21 27)';
const EmailIcon: ComponentType<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1.5" y="4" width="21" height="16" rx="3" fill={color} />
    <path d="M2.5 6.5 12 13.5l9.5-7V8L12 15 2.5 8z" fill={EMAIL_FLAP_COLOR} />
  </svg>
);

// ─── Kanal tipi görünümü ──────────────────────────────────────────────────────

interface ChannelTypeMeta {
  label: string;
  Icon: ComponentType<IconProps>;
  color: string;
  brandColor: string;
  mono: string;
}

// color: tasarım paletine uyarlanmış (kart rozeti/seçici); brandColor: gerçek marka rengi
// (liste/başlık platform rozeti — ChannelPlatformIcon). Renkler marka renklerinin tasarım paletine uyarlanmış hâli — ham marka hex'leri
// bu sıcak gri zeminde fazla parlak kalıyordu.
export const CHANNEL_TYPE_META = {
  [CHANNEL_TYPE.WhatsApp]:  { label: 'WhatsApp',  Icon: WhatsAppIcon,  color: palette.success,       brandColor: '#25D366',          mono: 'WA' },
  [CHANNEL_TYPE.Instagram]: { label: 'Instagram', Icon: InstagramIcon, color: 'oklch(50% 0.1 15)',   brandColor: '#E4405F',          mono: 'IG' },
  [CHANNEL_TYPE.Facebook]:  { label: 'Facebook',  Icon: FacebookIcon,  color: 'oklch(45% 0.07 250)', brandColor: '#1877F2',          mono: 'FB' },
  [CHANNEL_TYPE.TikTok]:    { label: 'TikTok',    Icon: TikTokIcon,     color: 'oklch(24% 0.01 260)', brandColor: 'var(--fg)',        mono: 'TT' },
  [CHANNEL_TYPE.Email]:     { label: 'E-posta',   Icon: EmailIcon,      color: EMAIL_COLOR,            brandColor: EMAIL_COLOR,        mono: '@' },
} as const satisfies Record<ChannelType, ChannelTypeMeta>;

const UnknownChannelIcon = ({ size = 16, color }: IconProps) => <MessageCircle size={size} color={color} />;

// Tanınmayan kanal tipi (backend yeni bir tip ekledi, ön yüz henüz güncellenmedi) tüm
// gelen kutusunu ÇÖKERTMEZ — genel bir ikonla gösterilir. Ön yüz backend'den önce/sonra
// yayına çıkabildiği için bu durum gerçekten yaşanır.
const UNKNOWN_CHANNEL_TYPE: ChannelTypeMeta = {
  label: 'Diğer kanal', Icon: UnknownChannelIcon, color: palette.neutral, brandColor: palette.neutral, mono: '??',
};

export function channelTypeMeta(type: number): ChannelTypeMeta {
  return (CHANNEL_TYPE_META as Record<number, ChannelTypeMeta | undefined>)[type] ?? UNKNOWN_CHANNEL_TYPE;
}

// ─── Bağlantı durumu ──────────────────────────────────────────────────────────

// textClass hem yazının hem noktanın rengidir (nokta `bg-current` ile yazı rengini alır).
export const CHANNEL_STATUS_META = {
  [CHANNEL_STATUS.Disconnected]: { label: 'Bağlı değil',   textClass: 'text-[var(--fg-muted)]' },
  [CHANNEL_STATUS.Connected]:    { label: 'Bağlı',         textClass: 'text-[var(--success)]' },
  [CHANNEL_STATUS.Error]:        { label: 'Hata',          textClass: 'text-[var(--danger)]' },
} as const satisfies Record<ChannelStatus, { label: string; textClass: string }>;

export const ASSIGNMENT_POLICY_META = {
  [ASSIGNMENT_POLICY.None]:        { label: 'Atama yok', hint: 'Konuşmalar kimseye atanmaz; bildirim nöbetteki ekibe gider.' },
  [ASSIGNMENT_POLICY.Manual]:      { label: 'Elle atama', hint: 'Konuşmayı temsilci kendi üstlenir ya da yönetici atar.' },
  [ASSIGNMENT_POLICY.RoundRobin]:  { label: 'Sırayla dağıt', hint: 'Yeni konuşmalar nöbetteki ekibe sırayla paylaştırılır.' },
  [ASSIGNMENT_POLICY.LeastLoaded]: { label: 'En az yüklüye', hint: 'Yeni konuşma, açık konuşması en az olan nöbetteki üyeye verilir.' },
  [ASSIGNMENT_POLICY.FixedAgent]:  { label: 'Sabit kişi', hint: 'Her devir kanalın seçili sorumlusuna gider; sorumlu yoksa ayara göre ekibe dağıtılır ya da bekler.' },
} as const satisfies Record<AssignmentPolicy, { label: string; hint: string }>;

// Kanal tipine göre panelde hangi kimlik alanlarının isteneceği. Backend'deki
// ChannelCredentialsValidator ile aynı kuralın UI karşılığı — kullanıcı boş bırakıp
// sunucudan hata almadan önce burada uyarılır.
//
// WhatsApp artık yalnızca Meta Cloud API üzerinden çalışır (Node gateway kaldırıldı) —
// gerçek Meta kimlik bilgileri her zaman istenir.
export const CREDENTIAL_FIELDS: Record<ChannelType, { key: string; label: string; hint?: string }[]> = {
  // Phone Number ID SORULMAZ: kimlik alanının kendisi; backend ondan türetir (Instagram'daki
  // Page ID ile aynı gerekçe — iki kez sorulunca farklı girilip kanal yarı bozuluyordu).
  [CHANNEL_TYPE.WhatsApp]: [
    { key: 'wabaId', label: 'WABA ID', hint: 'Yönetim amaçlı; mesaj gönderirken kullanılmaz.' },
    { key: 'accessToken', label: 'Access Token' },
    { key: 'appSecret', label: 'App Secret', hint: 'Webhook imza doğrulaması için zorunlu.' },
  ],
  // Page ID SORULMAZ: hesap kimliği yukarıdaki "kimlik" alanından (ExternalIdentifier)
  // alınıyor ve backend PageId'yi ondan türetiyor — aynı değeri iki kez istemeyelim.
  [CHANNEL_TYPE.Instagram]: [
    { key: 'accessToken', label: 'Access Token' },
    { key: 'appSecret', label: 'App Secret', hint: 'Webhook imza doğrulaması için zorunlu.' },
  ],
  [CHANNEL_TYPE.Facebook]: [
    { key: 'accessToken', label: 'Access Token' },
    { key: 'appSecret', label: 'App Secret', hint: 'Webhook imza doğrulaması için zorunlu.' },
  ],
  [CHANNEL_TYPE.TikTok]: [
    { key: 'shopId', label: 'Shop ID' },
    { key: 'appKey', label: 'App Key' },
    { key: 'appSecret', label: 'App Secret' },
    { key: 'accessToken', label: 'Access Token' },
    { key: 'refreshToken', label: 'Refresh Token', hint: 'Jetonlar kısa ömürlüdür, yenileme için gerekir.' },
  ],
  // Port, güvenlik ve klasör ayrı bölümde (EmailServerFields); burada yalnız zorunlu metin alanları.
  [CHANNEL_TYPE.Email]: [
    { key: 'imapHost', label: 'IMAP sunucusu', hint: 'Plesk: mail.alanadi.com (gelen kutusu okunur).' },
    { key: 'smtpHost', label: 'SMTP sunucusu', hint: 'Genellikle IMAP ile aynı (yanıtlar buradan gider).' },
    { key: 'mailUsername', label: 'Kullanıcı adı', hint: 'Genellikle tam e-posta adresi.' },
    { key: 'mailPassword', label: 'Parola' },
  ],
};

// Kanal tipine göre "kimlik" alanının ne anlama geldiği — tek bir alana her kanalda
// farklı şey girildiği için etiket sabit olamaz.
//
// WhatsApp'ta ExternalIdentifier, telefon numarası DEĞİL Phone Number ID'dir — gelen
// webhook'u kanala eşlemek için backend bunu kullanır (MetaWebhookService).
export const IDENTIFIER_LABEL: Record<ChannelType, { label: string; placeholder: string }> = {
  [CHANNEL_TYPE.WhatsApp]:  { label: 'Phone Number ID', placeholder: '109876543212345' },
  [CHANNEL_TYPE.Instagram]: { label: 'Instagram hesap kimliği', placeholder: '17841400000000000' },
  [CHANNEL_TYPE.Facebook]:  { label: 'Sayfa kimliği', placeholder: '1234567890' },
  [CHANNEL_TYPE.TikTok]:    { label: 'Mağaza kimliği', placeholder: '7000000000000000000' },
  [CHANNEL_TYPE.Email]:     { label: 'E-posta adresi', placeholder: 'support@alanadi.com' },
};

export function StatusDot({ status }: { status: ChannelStatus }) {
  // Eski kayıtta kaldırılmış bir durum (1, 2) kalmışsa ekran çökmesin: "Bağlı değil".
  const meta = CHANNEL_STATUS_META[status] ?? CHANNEL_STATUS_META[CHANNEL_STATUS.Disconnected];
  return (
    <span className={`inline-flex items-center gap-1.5 text-ui-sm font-semibold ${meta.textClass}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
