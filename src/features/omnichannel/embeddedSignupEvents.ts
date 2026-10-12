// Meta Embedded Signup açılır penceresinin `message` olaylarını ayrıştırır ve Meta'nın
// İngilizce hata metinlerini kullanıcının ne yapacağını söyleyen Türkçeye çevirir.
// Belge: developers.facebook.com/docs/whatsapp/embedded-signup/implementation
//        .../embedded-signup/custom-flows/onboarding-business-app-users (coexistence)

export type SignupInfo = {
  wabaId: string;
  // Coexistence (WhatsApp Business uygulaması numarası) bitişinde Meta bu alanı
  // göndermeyebilir; sunucu numarayı WABA'nın numara listesinden bulur.
  phoneNumberId?: string;
  businessId?: string;
  coexistence: boolean;
};

export type SignupEvent =
  | { kind: 'finish'; info: SignupInfo }
  | { kind: 'cancel'; message: string }
  | { kind: 'error'; message: string };

// Meta'nın başarı olayları. FINISH = yeni numara (Cloud API) akışı;
// FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING = mevcut WhatsApp Business uygulaması numarası.
const FINISH_EVENTS = new Set(['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING']);
const COEXISTENCE_FINISH = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';

// Kullanıcı pencereyi hangi ekranda kapattı (CANCEL.data.current_step).
const STEP_LABELS: Record<string, string> = {
  BUSINESS_ACCOUNT_SELECTION: 'işletme portföyü seçimi',
  WABA_PHONE_PROFILE_PICKER: 'WhatsApp hesabı seçimi',
  WHATSAPP_BUSINESS_PROFILE_SETUP: 'WhatsApp hesabı oluşturma',
  PHONE_NUMBER_SETUP: 'telefon numarası ekleme',
  PHONE_NUMBER_VERIFICATION: 'telefon numarası doğrulama',
  PERMISSIONS: 'izinler',
};

// Meta'nın akış içinde gösterdiği hata metinleri → ne yapılmalı. Sıra önemli: ilk eşleşen kazanır.
const KNOWN_ERRORS: ReadonlyArray<{ pattern: RegExp; text: string }> = [
  {
    pattern: /registered to an existing WhatsApp account|already registered|disconnect it from the existing account/i,
    text: 'Bu numara zaten bir WhatsApp uygulamasında kayıtlı ve Meta "yeni numara ekleme" ekranını açtı. '
      + 'Akışı yeniden başlatın ve ilk ekranda "Mevcut WhatsApp Business uygulaması hesabını bağla" seçeneğini seçin. '
      + 'Bu seçenek çıkmıyorsa: telefondaki WhatsApp Business uygulamasını en az 2.24.17 sürümüne güncelleyin; '
      + 'numaranın normal WhatsApp\'ta değil WhatsApp Business uygulamasında açık olduğundan emin olun.',
  },
  {
    pattern: /already exists in your list of phone numbers/i,
    text: 'Numara bu WhatsApp hesabında zaten ekli. Akışı yeniden başlatıp listeden mevcut numarayı seçin.',
  },
  {
    pattern: /blocked/i,
    text: 'WhatsApp bu numarayı engellemiş. Meta Business Suite > WhatsApp Yöneticisi\'ndeki uyarıya bakın.',
  },
  {
    pattern: /too many|guessed too many|requested your code too many/i,
    text: 'Çok fazla doğrulama denemesi yapıldı. Birkaç saat bekleyip yeniden deneyin.',
  },
  {
    pattern: /doesn.t appear to be valid|not valid/i,
    text: 'Numara geçersiz görünüyor. Ülke kodunu ve numarayı kontrol edip 5 dakika sonra yeniden deneyin.',
  },
  {
    pattern: /verified name violates/i,
    text: 'İşletme görünen adı WhatsApp kurallarına uymuyor. Adı (ör. yalnız marka adı) düzeltip yeniden deneyin.',
  },
  {
    pattern: /permission to create WhatsApp Business Accounts/i,
    text: 'Seçilen Meta işletme hesabında yönetici yetkiniz yok. Yönetici olduğunuz işletmeyi seçin ya da yetki isteyin.',
  },
];

function isFacebookOrigin(origin: string): boolean {
  return /^https:\/\/([a-z0-9-]+\.)*facebook\.com$/i.test(origin);
}

function readPayload(raw: unknown): Record<string, unknown> | null {
  let payload = raw;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function describeSignupError(message: string, code?: string, sessionId?: string): string {
  const known = KNOWN_ERRORS.find((e) => e.pattern.test(message));
  const reference = [code && `kod ${code}`, sessionId && `oturum ${sessionId}`].filter(Boolean).join(', ');
  const meta = message ? `Meta: "${message}"${reference ? ` (${reference})` : ''}` : reference;
  return known ? `${known.text}${meta ? ` — ${meta}` : ''}` : `Meta bağlantıyı tamamlamadı. ${meta}`.trim();
}

export function parseSignupEvent(event: MessageEvent): SignupEvent | null {
  if (!isFacebookOrigin(event.origin)) return null;
  const payload = readPayload(event.data);
  if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return null;

  const name = text(payload.event);
  const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>;

  if (FINISH_EVENTS.has(name)) {
    const wabaId = text(data.waba_id);
    if (!wabaId) return { kind: 'error', message: 'Meta bağlantıyı bitirdi ama WhatsApp hesap kimliğini (WABA) göndermedi. Yeniden deneyin.' };
    return {
      kind: 'finish',
      info: {
        wabaId,
        phoneNumberId: text(data.phone_number_id) || undefined,
        businessId: text(data.business_id) || undefined,
        coexistence: name === COEXISTENCE_FINISH,
      },
    };
  }

  if (name === 'FINISH_ONLY_WABA')
    return { kind: 'error', message: 'Akış telefon numarası seçilmeden bitti. Yeniden başlatıp numaranızı seçin.' };

  const errorMessage = text(data.error_message);
  if (name === 'ERROR' || errorMessage)
    return { kind: 'error', message: describeSignupError(errorMessage, text(data.error_code), text(data.session_id)) };

  if (name === 'CANCEL') {
    const step = STEP_LABELS[text(data.current_step)];
    return { kind: 'cancel', message: step ? `WhatsApp bağlantısı "${step}" ekranında yarıda bırakıldı.` : 'WhatsApp bağlantısı iptal edildi.' };
  }

  return null; // Bilinmeyen ara olaylar yok sayılır.
}
