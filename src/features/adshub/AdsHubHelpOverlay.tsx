'use client';

import {
  HelpDocOverlay, DocSection, SubHeading, Steps, Callout, CodeLine, ExtLink, FieldTable,
  type HelpSection,
} from '../shared/HelpDoc';
import { palette } from '../shared/design';

interface Props {
  onClose: () => void;
}

// AdsHub'ın "Yardım" sayfası — kabuk (tam ekran doküman, bölüm gezinmesi, Esc,
// odak tuzağı) ve tipografi primitive'leri features/shared/HelpDoc.tsx'te; burada
// yalnızca AdsHub'a özgü İÇERİK var.
//
// İçerik varsayımsal değil: PowerShell curl takma adı, MCC/normal hesap
// karışıklığı, OAuth Playground test kullanıcısı gereksinimi gibi gerçekten
// yaşanmış ve doğrulanmış adımlardan derlendi.

const SECTIONS: readonly HelpSection[] = [
  { id: 'genel', label: 'Genel' },
  { id: 'meta', label: 'Meta' },
  { id: 'google', label: 'Google' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'production', label: 'Başka Firmalar İçin' },
  { id: 'guvenlik', label: 'Güvenlik' },
];

export function AdsHubHelpOverlay({ onClose }: Props) {
  return (
    <HelpDocOverlay title="AdsHub — API Bağlantı Rehberi" sections={SECTIONS} onClose={onClose}>
          <DocSection id="genel" title="Genel">
            <p style={{ fontSize: 13.5, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
              AdsHub üç reklam platformuyla (Meta, Google, TikTok) doğrudan API üzerinden konuşur —
              her platform kendi kimlik doğrulama modelini kullanır, üçü de birbirinden farklıdır.
              Bu sayfa, her birinde hesap bağlamak için gereken bilgiyi (token, ID, secret) nereden
              alacağını, adım adım ve gerçekten yaşanmış sorunlarla birlikte anlatır.
            </p>
            <Callout tone="info">
              Panelde "AdsHub → Hesaplar → Yeni reklam hesabı bağla" formuna girdiğin her bilgi
              (token, secret, refresh token) veritabanında <strong>şifreli</strong> saklanır — bu
              sayfadaki hiçbir adımda bu bilgileri bana (Claude'a) ya da başka birine yapıştırman
              gerekmez, doğrudan formun kendisine girilir.
            </Callout>
          </DocSection>

          {/* ── META ─────────────────────────────────────────────────────── */}
          <DocSection id="meta" title="Meta (Facebook / Instagram) Ads">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Meta'da tek bir uzun ömürlü <strong>System User Token</strong> yeterli — Google'ın
              aksine sürekli yenileme gerektirmez. Süreç 4 aşama: Business Manager → App → System
              User → Token.
            </p>
            <Callout tone="success">
              Tek tıkla bağlantı ("Hesaplar → Yeni reklam hesabı bağla → Meta ile bağlan") artık
              ÇALIŞIYOR — Omnichannel modülünün (WhatsApp/Instagram) zaten Live + Business Verified
              olan Meta App'ini paylaşıyor, ayrı bir uygulama kurmana gerek yok. Şu an yalnızca bu
              app'in admin/test kullanıcıları bağlanabilir (henüz{' '}
              <code>ads_read</code>/<code>business_management</code> için Advanced Access
              onaylanmadı) — başka firmaların self-servis bağlanabilmesi için bkz. "Başka Firmalar
              İçin" bölümü. Ayrıca OAuth ile bağlanan hesabın jetonu ~60 gün sonra süresi dolan bir
              kullanıcı jetonudur — manuel akıştaki System User Token'ın aksine süresizdir, bu
              yüzden periyodik olarak yeniden bağlanman gerekebilir.
            </Callout>
            <Callout tone="warning">
              "Yönlendirme URI'si beyaz listede bulunmadığı için başarısız oldu" hatası alırsan:
              Meta for Developers → uygulama → Facebook Login ürünü → Ayarlar → Client OAuth
              Settings → Valid OAuth Redirect URIs listesine{' '}
              <CodeLine>{'https://api.example.com/api/adshub/oauth/meta/callback'}</CodeLine>{' '}
              ekle (Omnichannel'ın kendi WhatsApp callback'i orada zaten var ama bu FARKLI bir
              path, ayrıca eklenmesi gerekiyor).
            </Callout>

            <SubHeading>1. Business Manager'da uygulama (App) oluştur</SubHeading>
            <Steps items={[
              <>
                <ExtLink href="https://developers.facebook.com/apps">developers.facebook.com/apps</ExtLink>{' '}
                adresine git, Business Manager hesabınla giriş yap.
              </>,
              'Yeni uygulama oluştur — türü "İşletme" (Business) seç.',
              'Uygulama Ürünleri kısmına "Marketing API" ürününü ekle.',
            ]} />

            <SubHeading>2. System User oluştur</SubHeading>
            <Steps items={[
              <>
                <ExtLink href="https://business.facebook.com/settings/system-users">
                  Business Settings → Sistem Kullanıcıları
                </ExtLink>{' '}
                bölümüne git, "Ekle" ile yeni bir System User oluştur.
              </>,
              <>
                İsim seçerken dikkat: <strong>"API"</strong> gibi bazı jenerik/rezerve kelimeler
                Meta tarafından reddediliyor. Bunun yerine tanımlayıcı bir isim kullan (ör. "Reklam"
                ya da "AdsHub Entegrasyon").
              </>,
              'Rol olarak "Çalışan" (Employee) yeterli — Admin şart değil, sadece raporlama/okuma yapılacak.',
            ]} />

            <SubHeading>3. System User'a uygulamayı ve reklam hesabını ata</SubHeading>
            <Steps items={[
              <>
                Oluşturduğun System User'a git → <strong>"Varlık ekle" (Add Assets)</strong> →
                "Uygulamalar" sekmesinden 1. adımda oluşturduğun uygulamayı ekle.
              </>,
              <>
                Aynı şekilde <strong>"Reklam Hesapları"</strong> sekmesinden ilgili reklam hesabını
                (ör. StoreB UK) System User'a ata, en az "Görüntüleme" (View) yetkisiyle.
              </>,
            ]} />
            <Callout tone="warning">
              "Uygun izin yok" / token üretilemiyor hatası genelde bu adımın atlanmasından
              kaynaklanıyor — System User'a hem uygulama hem reklam hesabı varlık olarak
              eklenmeden token üretilemiyor.
            </Callout>

            <SubHeading>4. Token üret</SubHeading>
            <Steps items={[
              'System User sayfasında "Yeni Jeton Oluştur" (Generate New Token) butonuna bas.',
              '1. adımda oluşturduğun uygulamayı seç.',
              <>İzin (scope) olarak en az <code>ads_read</code> seç — sadece okuma yeterli, yazma izni gerekmiyor.</>,
              'Token\'ı kopyala — bu, süresiz bir System User Token, panelde "Erişim jetonu" alanına girilecek.',
            ]} />

            <SubHeading>5. Reklam Hesabı ID'sini bul</SubHeading>
            <Steps items={[
              <>
                <ExtLink href="https://business.facebook.com/settings/ad-accounts">
                  Business Settings → Reklam Hesapları
                </ExtLink>{' '}
                sekmesine git (Sayfalar sekmesiyle KARIŞTIRMA — ikisi de benzer görünüyor).
              </>,
              <>Doğru hesabın yanında para birimi etiketi (₺, £ gibi) görünür; ID <code>act_123456789</code> formatında ya da öneksiz.</>,
            ]} />

            <SubHeading>Sık karşılaşılan hatalar</SubHeading>
            <FieldTable rows={[
              { field: '(#200) permission', desc: 'ads_management/ads_read izni verilmemiş — genelde token/hesap ID panelde yanlış girilmiş, curl ile ayrı ayrı doğrula.' },
              { field: '(#190) Page Access Token', desc: 'Yanlış token kaynağı — System User\'ın kendi ürettiği token yerine, başka bir akıştan (ör. WhatsApp/Sayfa) alınmış bir token kullanılmış olabilir.' },
              { field: 'Page ID ile Ad Account ID karışması', desc: 'Sayfalar sekmesindeki ID (görsel olarak sayfa ikonlu, para birimi YOK) ile Reklam Hesapları sekmesindeki ID (para birimi VAR) farklı — doğru sekmeden alındığından emin ol.' },
            ]} />
          </DocSection>

          {/* ── GOOGLE ───────────────────────────────────────────────────── */}
          <DocSection id="google" title="Google Ads">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Google'ın modeli Meta'dan çok daha uzun: bir Cloud projesi, bir OAuth istemcisi, bir
              Developer Token ve sürekli yenilenen (refresh token'la) bir erişim jetonu gerekiyor.
              En sık karışan nokta: Developer Token yalnızca bir{' '}
              <strong>Yönetici (Manager/MCC) hesabından</strong> alınabiliyor — normal bir reklam
              hesabından değil.
            </p>
            <Callout tone="success">
              Google Ads API erişimi (Developer Token, Basic Access) alındı — tek tıkla bağlantı
              ("Hesaplar → Yeni reklam hesabı bağla → Google ile bağlan") gerçek verilerle
              çalışıyor. Google'ın OAuth consent screen'i hâlâ "Testing" modunda olduğu için şu an
              yalnızca test kullanıcı listesine eklenen mailler bağlanabilir — başka firmaların
              self-servis bağlanabilmesi için bkz. "Başka Firmalar İçin" bölümü.
            </Callout>
            <Callout tone="warning">
              Bağlantı ekranında listede <strong>Yönetici (Manager/MCC) hesabı</strong> görürsen
              SEÇME — kendi kampanyası olmaz, bağlarsan harcama hep ₺0 görünür ve senkron hiç
              tamamlanmaz (canlıda yaşandı). Panel bunları artık "⚠️ Yönetici hesabı, seçilemez"
              diye işaretleyip devre dışı bırakıyor ama listede gerçek reklam hesabını (para birimi
              etiketi olan, MCC'den FARKLI bir ID) seçtiğinden emin ol.
            </Callout>

            <SubHeading>1. Google Cloud Console'da proje + OAuth istemcisi</SubHeading>
            <Steps items={[
              <><ExtLink href="https://console.cloud.google.com">console.cloud.google.com</ExtLink> üzerinde yeni bir proje oluştur.</>,
              '"APIs & Services → Library" içinden "Google Ads API"yi bul ve etkinleştir (Enable).',
              '"APIs & Services → OAuth consent screen" (yeni arayüzde "Audience"/"Branding" sekmeleri altında) — "External" seç, uygulama adı/mail gibi temel bilgileri doldur.',
              <>
                "APIs & Services → Credentials → Create Credentials → OAuth client ID" — tür olarak{' '}
                <strong>"Web application"</strong> seç (Desktop app DEĞİL — OAuth Playground ile
                refresh token üretirken "redirect_uri_mismatch" hatası verir).
              </>,
              <>Authorized redirect URIs alanına şunu ekle: <CodeLine>{'https://developers.google.com/oauthplayground'}</CodeLine></>,
              'Oluşan Client ID + Client Secret\'ı not al.',
            ]} />
            <Callout tone="warning">
              OAuth consent screen "Testing" modundaysa, sadece "Test users" listesine eklediğin
              mailler giriş yapabilir — refresh token üretirken "403: access_denied" hatası alırsan,
              Audience/consent screen ayarından kendi mailini test user olarak ekle.
            </Callout>

            <SubHeading>2. Developer Token — yalnızca Manager (MCC) hesabından</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Normal bir reklam hesabında (kampanya yayınlayan hesap) <code>API Center</code>{' '}
              sayfası "yalnızca yönetici hesapları tarafından kullanılabilir" hatası verir — admin
              yetkin olsa bile fark etmez, hesabın TÜRÜ yönetici (MCC) olmalı.
            </p>
            <Steps items={[
              <>
                Ayrı bir Manager hesabın yoksa:{' '}
                <ExtLink href="https://ads.google.com/home/tools/manager-accounts/">
                  ads.google.com/home/tools/manager-accounts
                </ExtLink>{' '}
                üzerinden "Yönetici hesabı oluştur" (kampanya akışına GİRME, "Başkalarının
                hesaplarını yönet" seçeneğini seç).
              </>,
              'Yeni Manager hesabı içinden "Hesaplar" sekmesi → "+" → mevcut reklam hesabını Customer ID\'siyle bağlantı isteği gönder.',
              'Reklam hesabının admin\'i kendi hesabına girip (Yönetici → Erişim ve güvenlik → Yöneticiler sekmesi) isteği "Kabul et".',
              <>
                Kabul edilince Manager hesabıyla giriş yapıp{' '}
                <ExtLink href="https://ads.google.com/aw/apicenter">ads.google.com/aw/apicenter</ExtLink>{' '}
                sayfasına git — Developer Token orada görünür.
              </>,
            ]} />
            <Callout tone="success">
              Yeni bir Manager hesabı açmak RİSKSİZ — kendi başına kampanya yayınlamıyor, bütçe/ödeme
              almıyor, bağlı hesabın kampanyalarına dokunmuyor. Bağlama daveti karşı tarafın onayı
              olmadan hiçbir şey değiştirmiyor.
            </Callout>

            <SubHeading>3. Basic Access başvurusu</SubHeading>
            <Steps items={[
              'Token ilk oluştuğunda "Test Account" seviyesindedir — sadece Google\'ın verdiği test hesaplarıyla çalışır, gerçek kampanya verisi çekemez.',
              <>
                API Center sayfasında "Apply for Basic Access" ile başvuru yap — Account ID
                alanına <strong>Manager (MCC) hesabının</strong> Customer ID'sini gir, normal bir
                reklam hesabının ID'sini DEĞİL. Yanlış türde bir ID girersen Google başvuruyu
                "This account is not a Google Ads manager account" diyerek reddedip AYNI formu
                tekrar göndermeni istemiyor — bilgileri düzeltip yeniden başvurman gerekiyor
                (canlıda yaşandı).
              </>,
              'Developer contact e-postası olarak kişisel Gmail yerine role-based bir adres kullan (ör. ads-api@example.com) — Google bunu açıkça öneriyor, kişi şirketten ayrılırsa/yetkisi değişirse başvuru sahipsiz kalmasın diye.',
              'Google\'ın onayı genelde 1-3 iş günü sürer, mail gelir; onay sonrası token otomatik gerçek erişime geçer.',
            ]} />

            <SubHeading>4. Refresh Token üret (OAuth Playground)</SubHeading>
            <Steps items={[
              <><ExtLink href="https://developers.google.com/oauthplayground">developers.google.com/oauthplayground</ExtLink> adresine git.</>,
              'Sağ üstteki dişli (⚙️) ikonuna tıkla → "Use your own OAuth credentials" işaretle → 1. adımdaki Client ID/Secret\'ı yapıştır.',
              <>Sol listeye elle şu scope\'u ekle: <CodeLine>{'https://www.googleapis.com/auth/adwords'}</CodeLine></>,
              '"Authorize APIs" → Google hesabı seçtir, izin ver.',
              '"Exchange authorization code for tokens" butonuna bas — çıkan "Refresh token" değerini kopyala.',
            ]} />

            <SubHeading>5. Customer ID'yi bul</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Google Ads paneli sağ üstte, hesap adının yanında <code>123-456-7890</code> formatında
              10 haneli numara.
            </p>

            <SubHeading>Sık karşılaşılan hatalar</SubHeading>
            <FieldTable rows={[
              { field: 'redirect_uri_mismatch', desc: 'OAuth istemcisi "Desktop app" türünde oluşturulmuş — "Web application" türünde, redirect URI\'si Playground\'a eklenmiş yeni bir istemci oluştur.' },
              { field: '403: access_denied', desc: 'Consent screen Testing modunda ve mailin test user listesinde değil — Audience ayarından ekle.' },
              { field: '"yalnızca yönetici hesapları"', desc: 'API Center\'a normal (MCC olmayan) bir hesapla giriliyor — bkz. yukarıdaki Manager hesabı adımı.' },
              { field: '"not a Google Ads manager account"', desc: 'Basic Access başvurusuna normal bir reklam hesabının ID\'si girilmiş — Manager (MCC) hesabının Customer ID\'si girilmeli, başvuru sıfırdan (farklı bilgilerle) yeniden gönderilmeli.' },
              { field: 'act_ ID\'sinde boşluk', desc: 'Kopyala-yapıştır sırasında ID\'nin başına/arasına yanlışlıkla boşluk girebiliyor — curl/adres çubuğuna yapıştırmadan önce kontrol et.' },
            ]} />
          </DocSection>

          {/* ── TIKTOK ───────────────────────────────────────────────────── */}
          <DocSection id="tiktok" title="TikTok Ads">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              TikTok'un modeli Meta'ya yakın — App ID/Secret + uzun ömürlü Access Token, Google
              gibi sürekli yenileme gerektirmiyor. Onay süreci TikTok'un kendi yoğunluğuna göre
              Google'dan biraz daha uzun sürebilir.
            </p>
            <Callout tone="info">
              Bu platform için tek tıkla bağlantı butonu da var ("Hesaplar → Yeni reklam hesabı
              bağla → TikTok ile bağlan") — ama şu an TikTok'un uygulama incelemesi (Marketing API
              erişim onayı) gelene kadar yalnızca test kullanıcıları için çalışır (bkz. "Başka
              Firmalar İçin" bölümü). Onay gelene kadar aşağıdaki manuel yöntemi kullan.
            </Callout>

            <SubHeading>1. TikTok for Business hesabı</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              <ExtLink href="https://business.tiktok.com">business.tiktok.com</ExtLink> üzerinde
              zaten bir reklam hesabı olmalı (reklam yayınlanıyorsa muhtemelen mevcut).
            </p>

            <SubHeading>2. Geliştirici uygulaması (App) oluştur</SubHeading>
            <Steps items={[
              <><ExtLink href="https://developers.tiktok.com">developers.tiktok.com</ExtLink> adresine TikTok Business hesabınla giriş yap.</>,
              '"My apps" → "Create an app" — uygulama adı ve temel bilgileri doldur.',
              'Oluşan App ID ve App Secret\'ı not al.',
            ]} />

            <SubHeading>3. Marketing API erişimi başvurusu</SubHeading>
            <Steps items={[
              'Uygulamana "Marketing API" ürününü ekle.',
              'Gereken scope\'ları seç: "Ad Account Management", "Reporting" gibi — salt-okunur raporlama amaçlı.',
              'Kullanım amacını yaz ("kendi reklam verilerimizi iç dashboard\'a çekmek, salt-okunur") ve incelemeye gönder.',
            ]} />
            <Callout tone="info">
              TikTok'un inceleme süresi değişken — birkaç günden birkaç haftaya kadar sürebilir,
              Google'a göre daha az öngörülebilir.
            </Callout>

            <SubHeading>4. Access Token üret</SubHeading>
            <Steps items={[
              'Onay sonrası geliştirici panelinden "Advertiser Authorization" akışını başlat.',
              'TikTok reklam hesabınla "Bu uygulamaya izin ver" ekranını onayla.',
              'Üretilen Access Token\'ı kopyala — uzun ömürlü, Meta\'nın System User token\'ı gibi nadiren yenilenmesi gerekir.',
            ]} />

            <SubHeading>5. Advertiser ID'yi bul</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              TikTok Ads Manager'da hesap ayarlarından görünen sayısal Advertiser ID.
            </p>
          </DocSection>

          {/* ── PRODUCTION / BAŞKA FİRMALAR ─────────────────────────────────── */}
          <DocSection id="production" title="Başka Firmalar İçin — Tek Tıkla Bağlantı Ne Zaman Herkese Açık Olur?">
            <p style={{ fontSize: 13.5, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
              "Meta/Google/TikTok ile bağlan" butonları uygulama seviyesinde <strong>paylaşımlı bir
              tek kimlik</strong> kullanıyor (Triple Whale gibi ürünlerin standart modeli — her
              müşteri kendi geliştirici uygulamasını kurmuyor). Kod tarafı üçü için de hazır ve
              çalışıyor, ama her platformun kendi <strong>"halka açık uygulama" onayı</strong>{' '}
              tamamlanmadan yalnızca bizim geliştirici konsolumuzdaki test/admin kullanıcıları
              bağlanabilir — yabancı bir müşteri "Bu uygulama doğrulanmamış" ekranıyla karşılaşır
              ya da hiç erişemez. Bu onaylar platformların kendi süreçleri, koda bağlı değil.
            </p>

            <SubHeading>Meta — en yakın (Omnichannel'ın işini kullanıyoruz)</SubHeading>
            <Steps items={[
              'Business verification zaten TAMAMLANDI (Omnichannel App\'i Live) — bu genelde en yavaş adım, atlandı.',
              <>
                Meta for Developers → uygulama → <strong>App Review → Permissions and Features</strong>{' '}
                → <code>ads_read</code> ve <code>business_management</code> için "Request Advanced
                Access".
              </>,
              'Buton aktif olmadan önce Meta en az bir BAŞARILI test API çağrısı istiyor — "Meta ile bağlan" ile kendi hesabınla bir kez bağlan, bu şartı karşılar (ilk çağrıdan sonra buton ~24 saatte aktifleşir).',
              'İnceleme için: kısa bir ekran kaydı (AdsHub\'ın reklam verisini okuyup ERP\'yle birleştirdiğini gösteren) + yazılı açıklama ("reklam harcaması/performansını okuyup ERP verisiyle birleştirip gerçek kârı gösteriyoruz — yazma erişimi yok").',
              'Onay genelde birkaç gün sürer (Live + Verified bir app için).',
            ]} />

            <SubHeading>Google — ayrı, daha yavaş</SubHeading>
            <Steps items={[
              'Bu, Basic Access başvurusundan (Developer Token seviyesi) TAMAMEN AYRI bir süreç.',
              <>
                Google Cloud Console → <strong>OAuth consent screen (Audience/Branding)</strong> →
                "Testing"den "In production"a geçiş — <code>adwords</code> scope'u "hassas scope"
                sayıldığı için Google'ın kendi incelemesine giriyor.
              </>,
              'Gerekli: gizlilik politikası URL\'si, doğrulanmış bir domain, çoğu zaman OAuth akışını gösteren bir demo video.',
              'Bu tipik olarak en uzun süren onay — günler değil, haftalar sürebilir.',
            ]} />

            <SubHeading>TikTok — ayrı, kısayolu yok</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Meta veya Google'ın onayından bağımsız, TikTok for Business'ın kendi Marketing API
              inceleme süreci gerekiyor. Şu an düşük öncelikli — Meta + Google onaylanınca çoğu
              müşteri zaten en az bir platforma bağlanabilir.
            </p>

            <Callout tone="info">
              Bu onaylar tamamlanana kadar da satış durmuyor: manuel akış ("Yeni reklam hesabı
              bağla" formuna token/secret elle girme, bkz. yukarıdaki platform bölümleri) her zaman
              çalışır — müşteri kendi geliştirici uygulamasını kurup token'ı kendisi üretir. Tek
              tıkla bağlantı, bu manuel adımları ORTADAN KALDIRAN bir kolaylık, olmazsa olmaz değil.
            </Callout>
          </DocSection>

          {/* ── GÜVENLİK ─────────────────────────────────────────────────── */}
          <DocSection id="guvenlik" title="Güvenlik">
            <Callout tone="warning">
              Token, secret ve refresh token'lar gerçek reklam hesaplarına erişim sağlar —
              e-posta, Slack mesajı ya da bu gibi bir sohbete YAPIŞTIRILMAMALI. Her zaman doğrudan
              panelin ilgili formuna girilmeli.
            </Callout>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Panele girilen tüm kimlik bilgileri veritabanında şifreli olarak saklanır (düz metin
              değil) ve hiçbir API yanıtında/log kaydında geri dönmez. Bir token'ı iptal etmek
              istersen ilgili platformun kendi panelinden (Meta: System User → "Jetonu iptal et",
              Google: OAuth istemcisini sil/refresh token'ı iptal et, TikTok: uygulamanın
              yetkilendirmesini kaldır) yapman yeterli — AdsHub tarafında ayrıca bir işlem
              gerekmez, bir sonraki senkron denemesi "kimlik bilgisi geçersiz" hatasıyla
              duraklar ve sana haber verir.
            </p>
          </DocSection>

    </HelpDocOverlay>
  );
}
