'use client';

import {
  HelpDocOverlay, DocSection, SubHeading, Paragraph, Steps, Callout, CodeLine, FieldTable,
  type HelpSection,
} from '../shared/HelpDoc';
import { PARTNER_TOOLS } from './tools';
import { PARTNERHUB_MCP_URL, PARTNERHUB_TOKEN_URL } from '../../lib/api/partnerhub';

interface Props {
  onClose: () => void;
}

// PartnerHub'ın "Amaç & Yardım" sayfası. Kabuk ve tipografi ortak
// (features/shared/HelpDoc.tsx — AdsHub rehberiyle AYNI); burada yalnızca
// PartnerHub'a özgü içerik var.
//
// NEDEN BURADA: bu metinler önce "Genel Bakış" sekmesinin gövdesindeydi ve her
// açılışta ekranın yarısını kaplıyordu. Modülü ilk kez açan bir kez okur, sonra
// bir daha ihtiyaç duymaz — yani kalıcı ekran alanı değil, istendiğinde açılan
// bir rehber olmalı. Sol panelin en altındaki "Amaç & Yardım" düğmesi bunu açar.

const SECTIONS: readonly HelpSection[] = [
  { id: 'amac', label: 'Amaç' },
  { id: 'nasil', label: 'Nasıl Kullanılır' },
  { id: 'tools', label: 'Araçlar' },
  { id: 'guvenlik', label: 'Güvenlik' },
];

export function PartnerHubHelpOverlay({ onClose }: Props) {
  return (
    <HelpDocOverlay title="PartnerHub — Amaç & Yardım" sections={SECTIONS} onClose={onClose}>

      {/* ── AMAÇ ────────────────────────────────────────────────────────── */}
      <DocSection id="amac" title="Bu modül ne işe yarar?">
        <Paragraph>
          PartnerHub, dışarıdaki geliştirici partnerlerin ERP verisine{' '}
          <strong>güvenli ve salt-okunur</strong> şekilde erişmesini sağlayan entegrasyon
          katmanıdır. Bir partnerin size Excel sorması ya da panele kendi kullanıcısıyla
          girmesi yerine, kendi yazılımı doğrudan veriyi çeker.
        </Paragraph>

        <SubHeading>Hangi veriye erişilir?</SubHeading>
        <Paragraph>
          Siparişler, ürünler, kategoriler, mağazalar, bağlı ERP ve pazaryeri hesapları,
          reklam performansı özeti ve web sitesi talep hacmi. Tam liste aşağıdaki{' '}
          <strong>Araçlar</strong> bölümünde.
        </Paragraph>

        <SubHeading>İki katı sınır</SubHeading>
        <Steps
          items={[
            <>
              <strong>Kiracı sınırı:</strong> Her partner yalnızca bağlı olduğu markanın
              (kiracı) verisini görür. Başka bir markanın siparişi ya da ürünü hiçbir
              koşulda dönmez.
            </>,
            <>
              <strong>Kişisel veri sınırı:</strong> Müşteri adı, adresi, telefonu, e-postası
              ve site ziyaretçi bilgisi <strong>hiçbir araçta yer almaz</strong> — teknik
              olarak döndürülmez, gizlenmiş değildir.
            </>,
          ]}
        />

        <Callout tone="info">
          Tüm erişim <strong>salt-okunur</strong>. Partner hiçbir kayıt oluşturamaz,
          değiştiremez veya silemez.
        </Callout>
      </DocSection>

      {/* ── NASIL KULLANILIR ────────────────────────────────────────────── */}
      <DocSection id="nasil" title="Nasıl kullanılır?">
        <SubHeading>1. Partner için client oluşturun</SubHeading>
        <Steps
          items={[
            <><strong>Client&apos;lar</strong> sekmesine geçin.</>,
            <>
              <strong>Yeni Partner Ekle</strong> → partneri tanıyacağınız bir görünen ad girin
              (ör. &quot;BMW Group Entegrasyonu&quot;).
            </>,
            <>
              Kiracı sorulmaz: client, sizin oturum açtığınız kiracı altında oluşturulur ve
              yalnızca o kiracının verisini görebilir.
            </>,
            <>
              Açılan pencerede <strong>client id</strong> ve <strong>client secret</strong>{' '}
              görünür.
            </>,
          ]}
        />

        <Callout tone="warning">
          Client secret <strong>yalnızca bir kez</strong> gösterilir. Sunucu sadece
          şifrelenmiş özetini saklar, pencereyi kapattıktan sonra hiçbir yerden tekrar
          okunamaz. Kaybolursa <strong>Client&apos;lar</strong> sekmesindeki anahtar
          simgesiyle secret&apos;ı yenileyin: yeni secret bir kez gösterilir, eskisi ve onunla
          alınmış jetonlar hemen geçersiz olur.
        </Callout>

        <SubHeading>2. Bilgileri partnere iletin</SubHeading>
        <Paragraph>
          Partnerin ihtiyacı olan dört şey: client id, client secret, token adresi ve MCP
          adresi. Adresler bu sunucunun gerçek adresleridir, olduğu gibi kopyalanabilir.
        </Paragraph>
        <CodeLine>{`POST ${PARTNERHUB_TOKEN_URL}`}</CodeLine>
        <CodeLine>{PARTNERHUB_MCP_URL}</CodeLine>

        <SubHeading>3. Partner token alır ve bağlanır</SubHeading>
        <Steps
          items={[
            <>
              Partnerin yazılımı token adresine <code className="font-mono">client_credentials</code>{' '}
              akışıyla istek atar ve <code className="font-mono">partner.read</code> kapsamında
              bir erişim jetonu alır (kapsam gönderilmezse bu kapsam varsayılır). Jeton 1 saat
              geçerlidir; süresi dolunca aynı şekilde yenisi alınır.
            </>,
            <>
              Bu jetonla MCP (Model Context Protocol) adresine bağlanır ve aşağıdaki araçları
              çağırır. Kiracı bilgisi jetonun içine gömülüdür — partner onu değiştiremez.
            </>,
            <>
              Yaptığı her çağrı kaydedilir; <strong>Aktivite</strong> sekmesinden hangi
              partnerin hangi aracı ne sıklıkla çağırdığını görebilirsiniz.
            </>,
          ]}
        />

        <SubHeading>4. Erişimi sonlandırma</SubHeading>
        <Paragraph>
          <strong>Client&apos;lar</strong> sekmesindeki yasak işaretine basmak yeterli. Client
          anında devre dışı kalır: yeni jeton alamaz ve elindeki jeton da hemen reddedilir.
          Kayıt silinmez; aynı satırdaki güç simgesiyle yeniden etkinleştirebilirsiniz.
        </Paragraph>
        <Paragraph>
          Çöp kutusu simgesi client&apos;ı ve jetonlarını kalıcı olarak siler. Geçmiş çağrıları
          Aktivite sekmesinde client kimliğiyle görünmeye devam eder.
        </Paragraph>
      </DocSection>

      {/* ── ARAÇLAR ─────────────────────────────────────────────────────── */}
      <DocSection id="tools" title="Kullanılabilir araçlar (MCP tools)">
        <Paragraph>
          Partnere açık olan araçların tamamı. Bu liste partnerlere gönderilen rehberle
          birebir aynı — ekibin ne verdiğini görmek için dosya açmasına gerek kalmasın diye
          burada da duruyor.
        </Paragraph>
        <FieldTable rows={PARTNER_TOOLS} />
      </DocSection>

      {/* ── GÜVENLİK ────────────────────────────────────────────────────── */}
      <DocSection id="guvenlik" title="Güvenlik">
        <Callout tone="warning">
          Client secret gerçek veriye erişim sağlar — e-posta, Slack mesajı ya da sohbet
          penceresine yapıştırılmamalı. Partnere güvenli bir kanaldan (parola yöneticisi
          paylaşımı gibi) iletin.
        </Callout>

        <Paragraph>
          Bu ekranı yalnızca yöneticiler (SuperAdmin / Admin) görebilir; kontrol hem arayüzde
          hem sunucuda ayrı ayrı yapılır. Partnerlerin jetonları tamamen ayrı bir kimlik
          şemasına aittir: bir partner jetonu bu yönetim uçlarına hiçbir koşulda
          bağlanamaz.
        </Paragraph>

        <Paragraph>
          MCP ucu hız sınırlıdır ve sayaç IP değil <strong>client id</strong> üzerinden
          işler — tek bir partner, aracı arka arkaya çağırarak bir kiracının tüm verisini
          çekemez.
        </Paragraph>

        <Callout tone="success">
          Bir client&apos;ı devre dışı bıraktıktan, secret&apos;ını yeniledikten ya da sildikten
          sonra ayrıca bir işlem gerekmez: elindeki jeton bir sonraki istekte reddedilir.
        </Callout>
      </DocSection>

    </HelpDocOverlay>
  );
}
