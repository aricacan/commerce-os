'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { omnichannelApi, type EmbeddedSignupConfigDto } from '../../lib/api/omnichannel';
import { cardButtonClass } from './formClasses';
import { MetaSetupNotice } from './MetaSetupNotice';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { useFacebookSdk } from './useFacebookSdk';
import { parseSignupEvent, type SignupInfo } from './embeddedSignupEvents';

// FB.login kodu ile pencerenin numara bilgisi ayrı ayrı gelir. Biri gelip diğeri bu süre
// içinde gelmezse düğme sonsuza dek "Bağlanıyor…"da kalmasın. Meta'nın kodu zaten 30 sn yaşar.
const SIGNUP_PAIR_TIMEOUT_MS = 25_000;
// Kodsuz geri çağrıda kısa bekleme: Meta'nın kendi hata/iptal olayı (daha açıklayıcı) önce gösterilsin.
const EVENT_GRACE_MS = 1_500;

// Meta belgesindeki coexistence açılış parametreleri. featureType/sessionInfoVersion
// MUTLAKA `extras` içinde olmalı: üst seviyede Meta onları yok sayar ve "yeni numara
// ekle" akışını açar → Business uygulamasındaki numara için "bu numara zaten bir
// WhatsApp hesabına kayıtlı" hatası çıkar.
const COEXISTENCE_EXTRAS = {
  setup: {},
  featureType: 'whatsapp_business_app_onboarding',
  sessionInfoVersion: '3',
} as const;

// WhatsApp Business App Coexistence bağlama butonu. Kanallar başlığında "Yeni Kanal"ın
// yanında durur; ayrı bir panel/kart yok — bağlanan numara kanal grid'inde normal kart
// olarak görünür (tek panelden yönetim). Template yönetimi WhatsApp kartındaki butondadır.
// settings: kanal formunda seçilen ülke / mağaza / katalog profili. Bağlanan kanal
// doğrudan doğru ayarlarla açılır; sonradan düzenlemeye gerek kalmaz.
export interface ChannelConnectSettings {
  country: string | null;
  storeCode: string | null;
  catalogProfileId: number | null;
  // Yalnız Facebook/Instagram bağlamada kullanılır: yeni açılan kanalın markası.
  brandId?: number | null;
}

export function WhatsAppConnectButton({
  onConnected, settings,
}: { onConnected: () => Promise<void> | void; settings?: ChannelConnectSettings }) {
  const [config, setConfig] = useState<EmbeddedSignupConfigDto | null>(null);
  const [configError, setConfigError] = useState(false);
  // SDK hazır mı? Hook script'i bir kez yükler ve window.FB belirince true döner.
  const sdkReady = useFacebookSdk(config?.appId);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<string | null>(null);
  const signupRef = useRef<SignupInfo | null>(null);
  const completingRef = useRef(false);
  const pairTimerRef = useRef<number | null>(null);
  // Bu denemede hata zaten gösterildi mi? (İptalde hem olay hem kodsuz geri çağrı gelir.)
  const reportedRef = useRef(false);
  const { notify } = useFeedback();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Hata YUTULMAZ: eskiden catch boştu ve buton sessizce kayboluyordu — kullanıcı
      // için "çalışmıyor"dan ayırt edilemezdi.
      void omnichannelApi.getEmbeddedSignupConfig()
        .then(setConfig)
        .catch(() => setConfigError(true));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const clearPairTimer = useCallback(() => {
    if (pairTimerRef.current !== null) window.clearTimeout(pairTimerRef.current);
    pairTimerRef.current = null;
  }, []);

  useEffect(() => clearPairTimer, [clearPairTimer]);

  const fail = useCallback((message: string) => {
    clearPairTimer();
    codeRef.current = null; signupRef.current = null;
    setBusy(false);
    if (reportedRef.current) return;
    reportedRef.current = true;
    notify.error(message);
  }, [clearPairTimer, notify]);

  // Kod ve numara bilgisinden yalnız biri geldiyse diğeri için süre tutulur.
  const armPairTimer = useCallback(() => {
    clearPairTimer();
    pairTimerRef.current = window.setTimeout(() => fail(signupRef.current
      ? 'Meta yetkilendirme kodunu göndermedi. Pencereyi kapatıp yeniden deneyin.'
      : 'Meta numara bilgisini göndermedi. Akışı sonuna kadar (son ekrandaki "Bitir") tamamlayıp yeniden deneyin.'),
    SIGNUP_PAIR_TIMEOUT_MS);
  }, [clearPairTimer, fail]);

  const tryComplete = useCallback(async () => {
    if (completingRef.current) return;
    if (!codeRef.current || !signupRef.current) { armPairTimer(); return; }
    clearPairTimer();
    completingRef.current = true; setBusy(true);
    const code = codeRef.current; const info = signupRef.current;
    codeRef.current = null; signupRef.current = null;
    try {
      await omnichannelApi.completeEmbeddedSignup({
        authorizationCode: code,
        wabaId: info.wabaId,
        phoneNumberId: info.phoneNumberId ?? null,
        businessId: info.businessId ?? null,
        country: settings?.country ?? null,
        storeCode: settings?.storeCode ?? null,
        catalogProfileId: settings?.catalogProfileId ?? null,
      });
      notify.success(info.coexistence
        ? 'WhatsApp Business uygulaması numarası bağlandı. Telefondaki uygulama açık kalsın; telefondan yazdıklarınız da panele düşer.'
        : 'WhatsApp Business hesabı bağlandı.');
      await onConnected();
    } catch (e) {
      notify.error(describeError(e));
    } finally { completingRef.current = false; setBusy(false); }
  }, [armPairTimer, clearPairTimer, notify, onConnected, settings]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const parsed = parseSignupEvent(event);
      if (!parsed) return;
      if (parsed.kind === 'finish') { signupRef.current = parsed.info; void tryComplete(); }
      else fail(parsed.message);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [tryComplete, fail]);

  const connect = () => {
    if (!config || !window.FB || !sdkReady || busy) return;
    clearPairTimer();
    setBusy(true); codeRef.current = null; signupRef.current = null; reportedRef.current = false;
    window.FB.login((response) => {
      const code = response.authResponse?.code;
      if (!code) {
        clearPairTimer();
        pairTimerRef.current = window.setTimeout(
          () => fail('Meta yetkilendirme kodu döndürmedi. Pencere kapatıldıysa yeniden deneyin.'), EVENT_GRACE_MS);
        return;
      }
      codeRef.current = code;
      void tryComplete();
    }, {
      config_id: config.configurationId,
      response_type: 'code',
      override_default_response_type: true,
      extras: COEXISTENCE_EXTRAS,
    });
  };

  // Yapılandırma yoksa buton GİZLENMEZ; yerinde sebebi söyleyen pasif bir rozet durur.
  if (configError) return <MetaSetupNotice label="WhatsApp Business" loadError />;
  if (!config) return null; // henüz yükleniyor
  if (!config.configured) {
    return <MetaSetupNotice label="WhatsApp Business" missingSettings={config.missingSettings} />;
  }

  return (
    <button type="button" onClick={connect} disabled={!sdkReady || busy} className={`${cardButtonClass} shrink-0`}>
      <Link2 size={15} /> {busy ? 'Bağlanıyor…' : 'WhatsApp Business ile bağla (önerilen)'}
    </button>
  );
}
