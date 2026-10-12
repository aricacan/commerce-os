'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { palette, icon } from '../shared/design';

interface Props {
  onClose: () => void;
}

// Fiziksel Depo'nun "Yardım" sayfası — AdsHubHelpOverlay ile aynı kalıp
// (tam ekran, bölüm gezinmeli doküman), ama içerik farklı amaçlı: AdsHub dış
// API'lara nasıl bağlanılacağını anlatıyor, burası depo personeline modülün
// GÜNLÜK KULLANIMINI ve altında yatan kuralları (stok neden sadece hareket
// kaydından türer, iade neden bazen karantinaya gider, mutabakat düzeltmesi
// neyi değiştirip neyi değiştirmediği) anlatıyor.

const SECTIONS = [
  { id: 'genel', label: 'Genel' },
  { id: 'cihaz', label: 'Cihaz Bağlama' },
  { id: 'kurulum', label: 'Depo Kurulumu' },
  { id: 'operasyon', label: 'Operasyonlar' },
  { id: 'toplama', label: 'Toplama & Paketleme' },
  { id: 'yonetim', label: 'Yönetim' },
  { id: 'sss', label: 'Sık Sorulanlar' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 76, marginBottom: 40 }}>
      <h2 style={{
        fontSize: 22, fontWeight: 800, color: palette.textStrong,
        letterSpacing: '-0.01em', marginBottom: 16,
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 15, fontWeight: 700, color: palette.textStrong, marginTop: 6 }}>
      {children}
    </h3>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingLeft: 22, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.55 }}>{item}</li>
      ))}
    </ol>
  );
}

function Callout({ tone, children }: { tone: 'warning' | 'info' | 'success'; children: ReactNode }) {
  const styles = {
    warning: { bg: palette.warningSoft, color: palette.warningText, Icon: AlertTriangle },
    info: { bg: palette.accentSoft, color: palette.accent, Icon: AlertTriangle },
    success: { bg: 'oklch(48% 0.09 155 / 0.1)', color: palette.success, Icon: ShieldCheck },
  }[tone];
  const { bg, color, Icon } = styles;
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 10,
      background: bg, color, fontSize: 12.5, lineHeight: 1.55, fontWeight: 600,
    }}>
      <Icon size={icon.md} strokeWidth={icon.stroke} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontWeight: 500 }}>{children}</div>
    </div>
  );
}

function FieldTable({ rows }: { rows: { field: string; desc: string }[] }) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${palette.borderSoft}`, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div
          key={r.field}
          style={{
            display: 'flex', gap: 14, padding: '9px 14px', fontSize: 12.5,
            background: i % 2 === 0 ? palette.card : palette.bg,
            borderTop: i === 0 ? 'none' : `1px solid ${palette.borderFaint}`,
          }}
        >
          <code
            className="font-mono"
            style={{
              width: 190, flexShrink: 0,
              color: palette.accent, fontWeight: 700,
            }}
          >
            {r.field}
          </code>
          <span style={{ color: palette.textMuted, lineHeight: 1.5 }}>{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

export function WarehouseHelpOverlay({ onClose }: Props) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40000, background: palette.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Üst şerit — sabit, kapatma + bölüm gezinmesi */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px',
        borderBottom: `1px solid ${palette.borderFaint}`, background: palette.card,
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: palette.textStrong, flexShrink: 0 }}>
          Fiziksel Depo — Kullanım Rehberi
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              style={{
                border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12.5,
                fontWeight: 600, cursor: 'pointer', background: palette.chipBg, color: palette.textMuted,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Kapat"
          style={{
            marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: `1px solid ${palette.borderSoft}`, background: 'transparent',
            color: palette.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={icon.lg} strokeWidth={icon.stroke} />
        </button>
      </div>

      {/* İçerik — ortalanmış, okunabilir genişlikte, kaydırılabilir */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>

          {/* ── GENEL ────────────────────────────────────────────────────── */}
          <DocSection id="genel" title="Genel">
            <p style={{ fontSize: 13.5, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
              Fiziksel Depo modülü, gerçek raflardaki stoğu ERP'den (Sentos/Base) bağımsız,
              kendi doğruluğunda takip eder. Depoyu kurar, raf bazında ne kadar ürün olduğunu
              bilir, mal kabul/toplama/sayım/transfer/iade akışlarını el terminali (barkod
              okuma) ile yürütür.
            </p>
            <Callout tone="info">
              Değişmeyen tek kural: bir raftaki stok miktarı SADECE bir hareket kaydı (mal
              kabul, toplama, transfer, sayım düzeltmesi, iade) sonucunda değişir — hiçbir ekran
              stok sayısını doğrudan elle değiştirmez. Bu yüzden her sayı, "kim/ne zaman/nereden
              nereye" sorularının cevabı olan bir geçmişe sahiptir (Yönetim → Hareket Geçmişi).
            </Callout>
            <SubHeading>Barkod/QR tarama nasıl çalışır?</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Her raf, kurulum sırasında kendine özgü bir QR koduyla etiketlenir (Yönetim veya
              Depo Kur sekmesinden basılabilir). Sekmelerdeki "Tara" düğmeleri cihazın
              kamerasını açar; okunan kod bir ürün barkodu ya da raf QR'ı olabilir, ekran hangisi
              olduğunu otomatik ayırt eder.
            </p>
          </DocSection>

          {/* ── CİHAZ BAĞLAMA ────────────────────────────────────────────── */}
          <DocSection id="cihaz" title="Cihaz Bağlama — El Terminali / Barkod Okuyucu">
            <p style={{ fontSize: 13.5, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
              Fiziksel Depo, ayrı bir masaüstü uygulaması değil — depoda kullanılan her cihaz
              (telefon, tablet, Android el terminali, masaüstü) aynı web adresine
              (demo.example.com) tarayıcıdan girerek bağlanır. Üç farklı tarama yöntemi var,
              hangisinin kullanılacağı elindeki cihaza göre değişir.
            </p>

            <SubHeading>1. Kamera ile tarama (ekrandaki "Tara" düğmesi)</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Modülün her yerindeki <strong>"Tara"</strong> düğmesi cihazın kamerasını açar —
              ekstra kurulum gerekmez, herhangi bir telefon/tablet/laptopta kamera izni
              verilince çalışır.
            </p>
            <Callout tone="warning">
              Kamera erişimi SADECE HTTPS üzerinden çalışır — demo.example.com zaten
              HTTPS, ama yerel ağda IP adresiyle (ör. http://192.168.x.x) girilirse kamera
              izni istenmez, "Kamera erişimi için HTTPS gerekli" uyarısı çıkar.
            </Callout>

            <SubHeading>2. USB/Bluetooth "klavye taklidi" el terminali</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Piyasadaki çoğu ucuz el terminali/tabanca okuyucu aslında bir klavye gibi
              davranır — barkodu okuyunca değeri bir metin kutusuna "yazar" ve Enter'a basar.
              Bu tip bir cihaz için:
            </p>
            <Steps items={[
              'USB ise takmak, Bluetooth ise cihazın kendi kılavuzuna göre bilgisayar/tabletin Bluetooth ayarlarından eşleştirmek yeterli — ekstra bir sürücü kurulmaz.',
              <>Ekranda kamera açan bir "Tara" düğmesi YERİNE, elle ürün/raf ID girilen bir metin
                kutusu varsa (ör. Mal Kabul veya Toplama sekmesindeki "ürün ID" alanı), o kutuya
                <strong> tıklayıp imleci içine bırak</strong>, sonra el terminaliyle okut — barkod
                otomatik yazılır.</>,
              'Kamera açan "Tara" düğmeleri bu tip cihazlarla çalışmaz — onlar sadece kameraya barkod gösterme akışı için tasarlandı.',
            ]} />

            <SubHeading>3. Android tabanlı el terminali (dahili kameralı)</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Zebra/Honeywell gibi Android işletim sistemli el terminalleri aslında bir Android
              telefon gibidir — üzerindeki Chrome tarayıcısından demo.example.com'a girip
              normal şekilde giriş yapman yeterli, "Tara" düğmeleri cihazın kendi kamerasını
              açar (1. yöntemle aynı). Cihaza özel donanım entegrasyonu (laser tetik tuşu vb.)
              şu an desteklenmiyor.
            </p>
          </DocSection>

          {/* ── DEPO KURULUMU ────────────────────────────────────────────── */}
          <DocSection id="kurulum" title="Depo Kurulumu">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Yeni bir depo açıldığında otomatik olarak tek seviyeli ("Raf") basit bir yapı
              gelir — ihtiyaca göre çok seviyeli bir hiyerarşiye (ör. Bölge → Koridor → Raf →
              Göz) genişletilebilir.
            </p>

            <SubHeading>1. Seviye tipleri</SubHeading>
            <Steps items={[
              'Her depo, kendi "seviye" yapısını tanımlar — 2 seviyeli (Oda → Raf) de olabilir, 5 seviyeli de.',
              <>Sadece <strong>"stok tutar"</strong> işaretli en alt seviyedeki lokasyonlarda ürün bulunabilir — üst seviyeler (Bölge, Koridor gibi) sadece gruplama içindir.</>,
              'Bir seviye "Karantina" olarak işaretlenebilir (bkz. İade bölümü) — o seviyedeki tüm raflar satılabilir stoktan otomatik hariç tutulur.',
            ]} />

            <SubHeading>2. Depo Kur sekmesi — 2D yerleşim</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Kuşbakışı bir editörde raflar/duvarlar/koridorlar sürükle-bırak ile yerleştirilir.
              Bu yerleşim sadece görsel değil — Toplama sekmesindeki rota optimizasyonu ve
              Yönetim'deki "Yerleşim Önerileri" (slotting) buradaki x/y koordinatlarını kullanır.
            </p>

            <SubHeading>3. 3D Gez sekmesi</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              2D'de kurulan yerleşimin 3 boyutlu, gezilebilir hâli — yeni bir depo çalışanına
              raf düzenini anlatmak için kullanışlı, veri girişi yapılmaz.
            </p>
          </DocSection>

          {/* ── OPERASYONLAR ─────────────────────────────────────────────── */}
          <DocSection id="operasyon" title="Operasyonlar">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              "Sorgula & İşlem" sekmesi günlük terminal işlerinin merkezi — dört temel işlem tek
              ekrandan yürütülür.
            </p>

            <SubHeading>Sorgula</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Bir ürün barkodu taranırsa o ürünün bulunduğu TÜM raflar listelenir; bir raf QR'ı
              taranırsa o raftaki TÜM ürünler listelenir. Aynı ekrandan raf bazında ikmal
              (replenishment) eşiği de ayarlanabilir — eşiğin altına düşen raflar Yönetim →
              "İkmal Gereken Raflar" listesinde otomatik çıkar.
            </p>

            <SubHeading>Rafa Yerleştir</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Sırasıyla ürün, sonra hedef raf taranır, miktar girilir. Bu, mal kabul belgesi
              OLMADAN doğrudan stok eklemek içindir (ör. sayım fazlası, iç transfer) — tedarikçiden
              gelen sevkiyat için "Mal Kabul" sekmesindeki belge akışı kullanılmalı.
            </p>

            <SubHeading>Say</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Bir raf seçilip (tarayarak veya "Bugün Sayılması Önerilen Raflar" listesinden tek
              tıkla) o raftaki her ürün tek tek sayılır. Sayım <strong>bitirilene</strong> kadar
              stok değişmez; "Sayımı Bitir"e basılınca fark varsa otomatik düzeltme hareketi
              oluşur.
            </p>
            <Callout tone="info">
              Hangi rafın bugün sayılması gerektiği ELLE seçilmez — A sınıfı (çok satan) ürünlerin
              olduğu raflar haftada bir, B sınıfı ayda bir, C sınıfı üç ayda bir otomatik önerilir
              (bkz. Yönetim → ABC sınıflandırması).
            </Callout>

            <SubHeading>Transfer Et</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Ürün → kaynak raf → hedef raf sırasıyla taranır, miktar girilir. Kaynakta yeterli
              stok yoksa işlem reddedilir.
            </p>

            <SubHeading>Mal Kabul</SubHeading>
            <Steps items={[
              'Tedarikçi adı ve kabul lokasyonu ile bir belge açılır.',
              'Belgeye ürün + beklenen miktar satırları eklenir (elle veya tarayarak).',
              <>Sevkiyat gelince her satır ayrı ayrı <strong>Kabul Et</strong> (gerçekte gelen miktar girilir, beklenenden az/çok olabilir) veya <strong>Reddet</strong> edilir.</>,
              'Tüm satırlar işlenince belge otomatik "Tamamlandı" olur ve listeden kalkar.',
            ]} />
          </DocSection>

          {/* ── TOPLAMA & PAKETLEME ──────────────────────────────────────── */}
          <DocSection id="toplama" title="Toplama & Paketleme">
            <SubHeading>Tekli toplama</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Bir sipariş referansıyla görev açılır, satırlar eklenir; her satır için raf taranıp
              miktar girilerek toplanır. Bir satır bir "kit" ürünse (bkz. aşağı), bileşenleri ayrı
              ayrı taranmak üzere otomatik alt-satırlara açılır.
            </p>

            <SubHeading>Dalga toplama (birden fazla sipariş, tek tur)</SubHeading>
            <Steps items={[
              'Açık görevlerden 2 veya daha fazlası işaretlenir.',
              '"Dalga Oluştur" ile hepsi tek bir rotaya bağlanır — sistem raf koordinatlarına göre en kısa yürüyüş sırasını (greedy en-yakın-komşu) hesaplar.',
              'Tarama akışı artık "sıradaki raf" gösterir, pikçi depoda rastgele dolaşmaz.',
            ]} />

            <SubHeading>Kit ürünler</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Bir SKU birden fazla bileşenden oluşuyorsa (ör. bir "set" ürünü), Yönetim
              sekmesinden kit tanımı yapılabilir. Toplama sırasında kit satırı otomatik
              bileşenlerine ayrılır — pikçi her bileşeni ayrı ayrı tarar, kit kendisi ayrıca
              taranmaz.
            </p>

            <SubHeading>Paketleme + kargo köprüsü</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Tüm satırlar toplandığında görev "Paketlemeye Hazır" durumuna geçer. Kutu boyutu
              (S/M/L) + ağırlık/desi girilip "Paketle" denince görev tamamlanır ve doğrudan
              Kargo modülüne (sipariş referansı, ağırlık, desi ön-doldurulmuş) geçiş yapılabilir.
            </p>
          </DocSection>

          {/* ── YÖNETİM ──────────────────────────────────────────────────── */}
          <DocSection id="yonetim" title="Yönetim">
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Yönetim sekmesi depoyu İŞLETEN değil, İZLEYEN taraf — tüm kararlar burada
              öneri/uyarı olarak sunulur, hiçbiri otomatik uygulanmaz.
            </p>

            <FieldTable rows={[
              { field: 'İkmal Gereken Raflar', desc: 'Elle ayarlanmış minimum eşiğin altına düşen raf/ürün çiftleri.' },
              { field: 'Yerleşim Önerileri (Slotting)', desc: 'ABC sınıfı "A" (en çok satan) olup paketleme istasyonuna uzak bir rafta duran ürünler — taşıma önerir, taşımaz.' },
              { field: 'ABC Sınıflandırması', desc: 'Son 30 günlük satış adedine göre: en çok satan %20 = A, sonraki %30 = B, kalan %50 = C. Hem slotting hem sayım programı bu sınıfı kullanır.' },
              { field: 'Üretkenlik KPI\'ları', desc: 'Kullanıcı başına saatlik toplama adedi, ortalama toplama süresi (görev açılışından paketlenmesine kadar), sayım doğruluk %\'si.' },
              { field: 'Kitler', desc: 'Toplama sırasında otomatik bileşenlerine ayrılacak SKU tanımları — burada oluşturulur/silinir.' },
              { field: 'Hareket Geçmişi', desc: 'Her stok değişiminin kim/ne/kaç/nereden-nereye kaydı — bir sayının nereden geldiğini takip etmenin tek yolu budur.' },
            ]} />

            <SubHeading>ERP Mutabakatı</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
              Fiziksel depo stoğu ile ERP'den (Sentos/Base) senkronize edilen önbellek arasında
              fark bulunan ürünleri listeler.
            </p>
            <Callout tone="warning">
              "Fiziksel sayıma göre düzelt" butonu SADECE bizim kayıtlı ERP önbellek değerimizi
              (Product.StockQuantity) fiziksel sayıma eşitler — gerçek Sentos/Base sistemine
              hiçbir yazma isteği gitmez. Bu bilinçli bir tasarım kararı: fiziksel depo
              ERP'nin gerçek stok kaynağı değil, sadece kendi doğruluğunu ayrı takip eden bir
              sistemdir.
            </Callout>
          </DocSection>

          {/* ── SIK SORULANLAR ───────────────────────────────────────────── */}
          <DocSection id="sss" title="Sık Sorulanlar">
            <SubHeading>İade edilen bir ürün neden bazen "Karantina" rafına gidiyor, bazen direkt satılabilir rafa?</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              İade akışında (Mal Kabul → İade Al) hangi rafın seçildiğine bağlı — hedef raf
              "Karantina" tipi bir seviyedeyse iade orada satılabilir sayılmaz (ERP Mutabakatı ve
              stok sorgulamalarında görünmez), normal bir rafsa direkt satılabilir stoğa eklenir.
              Ürünün kalite kontrolden geçip geçmediğine göre depo çalışanı seçer.
            </p>

            <SubHeading>Bir raf iki kez sayıldığında (ağ hatası sonrası tekrar deneme) ne olur?</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Zaten onaylanmış bir sayım oturumu ikinci kez onaylanmaya çalışılırsa sistem
              reddeder ("bu oturum zaten onaylanmış") — stok iki kez düzeltilmez.
            </p>

            <SubHeading>Toplama/kabul ekranında "zaten işlenmiş" hatası aldım, ürün gerçekten toplanmış mı?</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Evet — bu, aynı işlemin ikinci kez gönderildiğini (ör. ağ zaman aşımı sonrası
              tekrar dokunma) gösterir, önceki işlem zaten başarıyla kaydedilmiştir. Ekranı
              yenilemek güncel durumu gösterir.
            </p>

            <SubHeading>Depo boşken (henüz raf/QR yok) hangi sekmeler kullanılabilir?</SubHeading>
            <p style={{ fontSize: 13, color: palette.textMuted, margin: 0, lineHeight: 1.6 }}>
              Önce "Depo Kur" sekmesinden en az bir seviye tipi ve raf oluşturulmalı — diğer tüm
              sekmeler (Sorgula, Mal Kabul, Toplama, Yönetim) o raflara bağlı çalışır.
            </p>
          </DocSection>

        </div>
      </div>
    </div>,
    document.body,
  );
}
