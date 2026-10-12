'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link2, X, AtSign, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  omnichannelApi, CHANNEL_TYPE,
  type MetaPagesConfigDto, type ConnectAllMetaPagesResultDto, type MetaChannelSummaryDto,
  type ConnectAllPageResultDto, type ChannelDto,
} from '../../lib/api/omnichannel';
import { MetaSetupNotice } from './MetaSetupNotice';
import { cardButtonClass, dialogCloseButtonClass } from './formClasses';
import { OmniDialogShell } from './OmniDialogShell';
import { palette } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import type { ChannelConnectSettings } from './WhatsAppEmbeddedSignup';

// Facebook/Instagram OAuth bağlama.
//
// AKIŞ SUNUCU TARAFLI: tarayıcı SDK'sı (FB.login) kullanılmıyor. Meta, kodu jetona
// çevirirken "redirect_uri diyalogdakiyle birebir aynı olmalı" diyor; SDK diyaloğu kendi
// iç adresiyle açtığı için takas HER zaman reddediliyordu (kod 100). Diyaloğu kendi geri
// dönüş adresimizle açıyoruz, kod doğrudan sunucuya geliyor.
//
// TEK GİRİŞ = TÜM KANALLAR: Meta ekranında seçilen her sayfa için Messenger kanalı, sayfaya
// bağlı Instagram hesabı varsa ayrıca Instagram kanalı otomatik açılır (2 sayfa + 2 IG = 4
// kanal). Sayfa sayfa "Bağla" demek eksik kanal bırakıyordu; ayrıca Meta seçilmeyen
// sayfaların iznini geri aldığı için tek tek bağlamak öncekileri bozuyordu.
const POPUP_FEATURES = 'popup=yes,width=620,height=760';

export function MetaPagesConnectButton({
  onConnectedAction, settings,
}: {
  onConnectedAction: () => Promise<void> | void;
  settings?: ChannelConnectSettings;
}) {
  const [config, setConfig] = useState<MetaPagesConfigDto | null>(null);
  const [configError, setConfigError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectAllMetaPagesResultDto | null>(null);
  const popupRef = useRef<Window | null>(null);
  const { notify } = useFeedback();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Hata YUTULMAZ — bkz. WhatsAppEmbeddedSignup'taki aynı düzeltme.
      void omnichannelApi.getMetaPagesConfig().then(setConfig).catch(() => setConfigError(true));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const connectAll = useCallback(async (selectionToken: string) => {
    try {
      const response = await omnichannelApi.connectAllMetaPages({
        selectionToken,
        country: settings?.country ?? null,
        storeCode: settings?.storeCode ?? null,
        catalogProfileId: settings?.catalogProfileId ?? null,
        brandId: settings?.brandId ?? null,
      });
      setResult(response);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  }, [settings, notify]);

  // Açılır pencere işi bitince seçim anahtarını buraya yollar (sunucudaki geri dönüş
  // sayfası postMessage eder). Sayfa jetonları tarayıcıya hiç gelmez.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; selectionToken?: string } | null;
      if (!data || data.type !== 'DEMO_META_PAGES' || !data.selectionToken) return;
      popupRef.current?.close();
      popupRef.current = null;
      void connectAll(data.selectionToken);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [connectAll]);

  const openDialog = async () => {
    if (!config || busy) return;
    setBusy(true);
    try {
      const { url } = await omnichannelApi.getMetaPagesAuthorizeUrl();
      popupRef.current = window.open(url, 'demo-meta-oauth', POPUP_FEATURES);
      if (!popupRef.current) {
        setBusy(false);
        notify.error('Tarayıcı açılır pencereyi engelledi. Bu site için açılır pencerelere izin verip tekrar deneyin.');
      }
    } catch (e) {
      setBusy(false);
      notify.error(describeError(e));
    }
  };

  // Sonuç penceresi kapanınca liste yenilenir: yenileme kanal ekleme penceresini
  // kapattığı için sonuç açıkken yapılırsa kullanıcı sonucu hiç göremezdi.
  const closeResult = async () => {
    setResult(null);
    await onConnectedAction();
  };

  // Yapılandırma yoksa buton GİZLENMEZ; yerinde sebebi söyleyen pasif bir rozet durur.
  if (configError) return <MetaSetupNotice label="Facebook / Instagram" loadError />;
  if (!config) return null; // henüz yükleniyor
  if (!config.configured) {
    return <MetaSetupNotice label="Facebook / Instagram" missingSettings={config.missingSettings} />;
  }

  return <>
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => void openDialog()} disabled={busy} className={`${cardButtonClass} shrink-0`}>
        <Link2 size={15} /> {busy ? 'Bağlanıyor…' : 'Facebook ile bağla (önerilen)'}
      </button>
      <span className="text-ui-xs leading-normal text-[var(--fg-muted)]">
        Meta ekranında <strong>TÜM</strong> sayfaları ve Instagram hesaplarını (diğer ülkeler dahil) birlikte
        seçin; daha önce bağladıysanız &quot;Ayarları düzenle&quot; ile yenilerini işaretleyin. Kayıtlı kanalların
        ayarları korunur, yeni sayfalar ayrı kanal olarak açılır.
      </span>
    </div>
    {result && <ConnectResultDialog result={result} onClose={() => void closeResult()} />}
  </>;
}

function ConnectResultDialog({ result, onClose }: { result: ConnectAllMetaPagesResultDto; onClose: () => void }) {
  const { pages, notGranted } = result;
  const channelCount = pages.reduce((sum, p) => sum + (p.facebook ? 1 : 0) + (p.instagram ? 1 : 0), 0);
  const hasInstagram = pages.some((p) => p.instagram);

  // Kanal ekleme penceresinin (layer="form") içinden açılır; onun üstünde kalmalı.
  return (
    <OmniDialogShell
      onClose={onClose}
      layer="stacked"
      panelClassName="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="m-0 text-ui-lg font-bold">{channelCount} kanal bağlandı</h2>
        <button onClick={onClose} className={dialogCloseButtonClass} aria-label="Kapat">
          <X size={18} />
        </button>
      </div>
      <div className="mb-3.5 text-ui-sm text-[var(--fg-muted)]">
        Her sayfa gelen kutusunda ayrı Messenger kanalı, bağlı Instagram hesabı ayrı Instagram kanalı olarak görünür.
      </div>

      {notGranted.length > 0 && <NotGrantedWarning channels={notGranted} />}
      {hasInstagram && <InstagramPrerequisite />}

      <div className="flex flex-col gap-2.5">
        {pages.map((page) => <PageResultRow key={page.pageId} page={page} />)}
      </div>
    </OmniDialogShell>
  );
}

function PageResultRow({ page }: { page: ConnectAllPageResultDto }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] p-3">
      <div className="text-ui-md font-semibold">{page.pageName}</div>
      {page.error ? (
        <ResultLine ok={false} icon={<AlertCircle size={13} />} text={page.error} />
      ) : (
        <>
          <ResultLine ok icon={<Link2 size={13} />}
            text={`Messenger kanalı · ${channelState(page.facebook, page.facebookAlreadyConnected)}`} />
          {page.instagram
            ? <ResultLine ok icon={<AtSign size={13} />}
                text={`Instagram kanalı (${page.instagram.displayName}) · ${channelState(page.instagram, page.instagramAlreadyConnected)}`} />
            : <div className="mt-1.5 text-ui-xs text-[var(--fg-muted)]">
                Bu sayfaya bağlı Instagram profesyonel hesabı yok.
              </div>}
        </>
      )}
    </div>
  );
}

// Kayıtlı kanalın ayarlarına dokunulmaz; yeni kanalın ülkesi (sayfa adından tahmin ya da
// formdan) yanlışsa kullanıcı kanal kartından düzeltebilsin diye ekranda yazar.
function channelState(channel: ChannelDto | null, alreadyConnected: boolean): string {
  if (alreadyConnected) return 'zaten bağlıydı, ayarları korundu';
  return `yeni eklendi · ülke: ${channel?.country ?? 'belirtilmemiş'}`;
}

function ResultLine({ ok, icon, text }: { ok: boolean; icon: ReactNode; text: string }) {
  return (
    <div className={`mt-1.5 flex items-center gap-1.5 text-ui-sm ${ok ? '' : 'text-[var(--danger)]'}`}>
      {icon}
      <span>{text}</span>
      {ok && <CheckCircle2 size={13} color={palette.success} />}
    </div>
  );
}

// Instagram'da bağlamak YETMEZ: hesap ayarı kapalıyken Meta hiç bildirim göndermez ve
// panelde hiçbir hata görünmez — yalnız "mesaj gelmiyor" olur.
function InstagramPrerequisite() {
  return (
    <div className="mb-3 rounded-[10px] border border-[var(--warning)] bg-[rgba(var(--warning-rgb),0.12)] p-3 text-[11.5px] leading-[1.6]">
      <strong>Instagram mesajlarının gelmesi için tek şey daha gerekli:</strong>
      <div className="mt-1">
        Her Instagram hesabında <strong>Ayarlar → Mesajlar ve hikâye yanıtları → Bağlı araçlar →
        &quot;Mesajlara erişime izin ver&quot;</strong> açık olmalı. Kapalıyken hesap bağlı görünür ama tek
        bir mesaj bile düşmez.
      </div>
    </div>
  );
}

// Meta'nın işletme girişi ekranında seçilen sayfalar öncekilerin YERİNE geçer: burada
// seçilmeyen kayıtlı kanalların izni kaldırıldı ve mesaj almayı bıraktılar.
function NotGrantedWarning({ channels }: { channels: MetaChannelSummaryDto[] }) {
  return (
    <div className="mb-3 rounded-[10px] border border-[var(--danger)] bg-[rgba(var(--danger-rgb),0.1)] p-3 text-[11.5px] leading-[1.6]">
      <strong>Bu girişte seçilmediği için şu kanalların izni kaldırıldı:</strong>
      <ul className="my-1 pl-[18px]">
        {channels.map((c) => (
          <li key={c.channelId}>
            {c.displayName} ({c.type === CHANNEL_TYPE.Instagram ? 'Instagram' : 'Messenger'})
          </li>
        ))}
      </ul>
      <strong>Facebook ile bağla</strong>&apos;ya yeniden basın ve Meta ekranında
      <strong> tüm sayfaları ve Instagram hesaplarını birlikte</strong> seçin.
    </div>
  );
}
