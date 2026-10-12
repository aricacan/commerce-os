'use client';

import { useCallback, useEffect, useState } from 'react';
import { palette } from '../shared/design';
import {
  readSearchInputCandidates,
  sonarImports,
  sonarSites,
  type DiscoveryResult,
  type ImportBatchDto,
  type SearchInputCandidate,
  type SeedOem,
  type SeedOrigin,
  type SupplierSiteDto,
} from '../../lib/api/sonar';
import { Badge, ErrorNote } from './shared';

/**
 * Keşif paneli — bilinmeyen bir siteyi öğrenme akışının tek ekranı.
 *
 * Tohum OEM ŞARTI kalkmadı, KULLANICIDAN ALINMADI. Şart duruyor çünkü sonucu
 * bilinen bir sorgu olmadan "site bozuldu" ile "üründe stok yok" ayırt edilemez.
 * Değişen tek şey, o sorguyu kimin bulduğu: kullanıcı bilmiyorsa sistem önce
 * Excel'deki numaraları sitede aratır, o da tutmazsa sitenin kendi kataloğundan
 * bir ürün kodu çıkarır.
 */
export function DiscoveryPanel({ site, onValidated }: {
  site: SupplierSiteDto;
  onValidated: () => void;
}) {
  const [seedText, setSeedText] = useState('');
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [seedBatchId, setSeedBatchId] = useState<number | ''>('');
  const [loginUrlHint, setLoginUrlHint] = useState('');
  const [searchUrlHint, setSearchUrlHint] = useState('');
  const [searchInputHint, setSearchInputHint] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  /**
   * Keşif arama kutusunu bulamazsa sunucunun gönderdiği ADAY kutular.
   *
   * "Arama adresini yazın" demek çözüm değil: kullanıcı o adresi bilmez,
   * bilseydi bu modüle ihtiyacı olmazdı. Bildiği tek şey, siteye baktığında
   * arama kutusunun hangisi olduğu — o yüzden seçtiriyoruz.
   */
  const [candidates, setCandidates] = useState<SearchInputCandidate[]>([]);

  const seeds = parseSeeds(seedText);

  const loadBatches = useCallback(async () => {
    try {
      const list = await sonarImports.list();
      setBatches(list);
      if (list.length > 0) setSeedBatchId(list[0].id);
    } catch {
      // Excel listesi alınamazsa keşif YİNE çalışır: tohum sitenin kendi
      // kataloğundan çıkarılır. Bu yüzden hata kullanıcıya gösterilmez.
      setBatches([]);
    }
  }, []);

  useEffect(() => { void loadBatches(); }, [loadBatches]);

  const run = async (inputHint: string | null = searchInputHint) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setCandidates([]);
    try {
      const res = await sonarSites.discover(site.id, {
        seedOems: seeds,
        loginUrlHint: loginUrlHint.trim() || null,
        searchUrlHint: searchUrlHint.trim() || null,
        searchInputHint: inputHint,
        seedFromImportBatchId: seeds.length === 0 && seedBatchId !== '' ? seedBatchId : null,
      });
      setResult(res);
      if (res.validated) onValidated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Keşif başarısız.');
      setCandidates(readSearchInputCandidates(err));
    } finally {
      setRunning(false);
    }
  };

  const retryWith = (selector: string) => {
    setSearchInputHint(selector);
    void run(selector);
  };

  return (
    <div
      className="mt-3 flex flex-col gap-3 rounded-lg p-3"
      style={{ background: palette.inputBg, border: `1px solid ${palette.borderSoft}` }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: palette.text }}>
          Tohum OEM&apos;ler <span style={{ color: palette.textFaint }}>(opsiyonel)</span>
        </span>
        <span className="text-xs" style={{ color: palette.textFaint }}>
          Bu sitede bulunduğunu bildiğiniz numaralar. Bilmiyorsanız boş bırakın —
          sistem kendi bulur. Her satıra bir numara; stok kodunu biliyorsanız
          virgülle ekleyin.
        </span>
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          rows={3}
          placeholder={SEED_PLACEHOLDER}
          className="mt-1 w-full rounded-lg px-3 py-2 font-mono text-xs"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.text,
          }}
        />
      </div>

      {seeds.length === 0 && batches.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: palette.textMuted }}>
            Tohumları hangi Excel&apos;den arayalım
          </span>
          <select
            value={seedBatchId}
            onChange={(e) => setSeedBatchId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.text,
            }}
          >
            <option value="">Excel kullanma — sitenin kataloğundan bul</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.fileName}</option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <HintField
          label="Giriş sayfası (kendiliğinden bulunamazsa)"
          value={loginUrlHint}
          onChange={setLoginUrlHint}
          placeholder="https://site.com/uye-girisi"
        />
        <HintField
          label="Örnek arama adresi (kendiliğinden bulunamazsa)"
          value={searchUrlHint}
          onChange={setSearchUrlHint}
          placeholder="https://site.com/arama?q=ARANAN"
        />
      </div>

      {error && <ErrorNote message={error} />}

      {candidates.length > 0 && (
        <SearchInputPicker
          candidates={candidates}
          disabled={running}
          onPick={retryWith}
        />
      )}

      {/*
        Seçili kutu GÖRÜNÜR ve GERİ ALINABİLİR olmalı.
        Aksi hâlde yanlış bir seçim sessizce yapışıp kalır: sonraki her
        "Keşfi başlat" doğru kutuyu bulabilecek sezgiseli devre dışı bırakıp
        o yanlış seçiciyi gönderir ve kullanıcı sebebini göremez.
      */}
      {searchInputHint && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span style={{ color: palette.textMuted }}>
            Seçili arama kutusu: <code>{searchInputHint}</code>
          </span>
          <button
            type="button"
            onClick={() => setSearchInputHint(null)}
            className="underline"
            style={{ color: palette.text }}
          >
            seçimi kaldır
          </button>
        </div>
      )}

      {result && <DiscoveryReport result={result} />}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs" style={{ color: palette.textFaint }}>
          {/*
            Çalışırken metin DEĞİŞİR. Dakikalarca değişmeyen bir ekran, işin
            donduğu izlenimi verir; kullanıcı sekmeyi kapatır ya da tekrar
            başlatır ve site iki kat yorulur. Beklemenin NEDENİNİ söylemek,
            beklemeyi kısaltmaktan sonraki en iyi şeydir.
          */}
          {running
            ? 'Sekmeyi kapatmayın · site insan hızında geziliyor (istekler arası 2-4 sn)'
            : seeds.length === 0
              ? seedBatchId !== ''
                ? 'Tohumlar Excel taranarak bulunacak · 5-15 dakika sürebilir'
                : 'Tohumlar sitenin kataloğundan çıkarılacak · 1-3 dakika'
              : `${seeds.length} tohum · keşif 1-3 dakika sürebilir`}
        </span>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          style={{ background: palette.accent, color: palette.textOnFill }}
        >
          {running ? 'Keşfediliyor…' : 'Keşfi başlat'}
        </button>
      </div>
    </div>
  );
}

const SEED_PLACEHOLDER = '7E0945105A, BSG 90-806-005\n1K0615301M';

/**
 * Tohumun kaynagi raporda GOSTERILIR.
 *
 * Kullanicinin verdigi tohum ile sistemin buldugu ayni guvende degildir:
 * kullanici dogru cevabi da bilir, sistem yalniz "bu sorgu sonuc donduruyor"u
 * bilir. Profil sonradan tartisilirken bu ayrimin kayitta olmasi gerekir.
 */
const SEED_ORIGIN: Record<SeedOrigin, string> = {
  User: 'sizin verdiğiniz',
  ExcelProbe: "Excel'den bulundu",
  SiteCatalog: 'sitenin kataloğundan',
};

function HintField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: palette.textMuted }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg px-3 py-1.5 text-xs"
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          color: palette.text,
        }}
      />
    </label>
  );
}

/** Sonucu ham durumla değil GEREKÇEYLE gösterir: kullanıcı neyin eksik olduğunu görsün. */
/**
 * Arama kutusunu KULLANICI seçer.
 *
 * Sezgisel her siteyi bilemez ve bilmediğinde kullanıcıya "arama adresini
 * yazın" demek çözüm değildir: o adresi bilmez, bilseydi bu modüle ihtiyacı
 * olmazdı. Ama siteye baktığında arama kutusunun hangisi olduğunu bilir.
 *
 * En zor başarısızlığı otuz saniyelik bir işe çevirmek, sezgiselleri
 * mükemmelleştirmeye çalışmaktan çok daha ucuzdur.
 */
function SearchInputPicker({ candidates, disabled, onPick }: {
  candidates: SearchInputCandidate[];
  disabled: boolean;
  onPick: (selector: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-3"
      style={{ background: palette.card, border: `1px solid ${palette.borderSoft}` }}
    >
      <span className="text-xs font-medium" style={{ color: palette.text }}>
        Sitedeki yazı kutuları — hangisi arama kutusu?
      </span>
      <span className="text-xs" style={{ color: palette.textFaint }}>
        Birini seçin, keşif o kutuyla yeniden başlasın.
      </span>

      <div className="flex flex-wrap gap-2">
        {candidates.map((candidate) => (
          <button
            key={candidate.selector}
            type="button"
            disabled={disabled}
            onClick={() => onPick(candidate.selector)}
            className="rounded-lg px-3 py-1.5 text-left text-xs disabled:opacity-40"
            style={{ border: `1px solid ${palette.border}`, color: palette.text }}
          >
            <span className="block font-medium">
              {candidate.placeholder || candidate.name || candidate.id || 'isimsiz kutu'}
            </span>
            <span style={{ color: palette.textFaint }}>{candidate.selector}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DiscoveryReport({ result }: { result: DiscoveryResult }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: palette.surface }}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={result.validated ? 'ok' : 'danger'}>
          {result.validated ? 'Doğrulandı' : 'Doğrulanamadı'}
        </Badge>
        <span className="text-xs" style={{ color: palette.textMuted }}>
          Profil sürüm {result.revision}
        </span>
        <span className="text-xs" style={{ color: palette.textFaint }}>
          Tohum: {SEED_ORIGIN[result.seedOrigin]}
          {result.seedsUsed.length > 0 && ` (${result.seedsUsed.join(', ')})`}
        </span>
        {result.llmModel && (
          <span className="text-xs" style={{ color: palette.textFaint }}>
            Etiketleyen: {result.llmModel}
          </span>
        )}
      </div>

      {result.labeledFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.labeledFields.map((field) => (
            <Badge key={field} tone="info">{field}</Badge>
          ))}
        </div>
      )}

      {result.validated && !result.canProduceNotStocked && (
        <p className="text-xs" style={{ color: palette.warningText }}>
          Bu sitede ayırt edici bir &quot;sonuç yok&quot; işareti bulunamadı. Site
          asla &quot;stokta yok&quot; diyemeyecek; bulunamayan numaralar
          &quot;doğrulanamadı&quot; olarak raporlanır. Boş sonuç tek başına
          &quot;yok&quot; anlamına gelmez.
        </p>
      )}

      {result.failures.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: palette.text }}>
            Kalan doğrulama testleri
          </span>
          <ul className="flex flex-col gap-0.5">
            {result.failures.map((failure) => (
              <li key={failure} className="text-xs" style={{ color: palette.danger }}>
                • {failure}
              </li>
            ))}
          </ul>
          <span className="text-xs" style={{ color: palette.textFaint }}>
            Profil taslak olarak kaydedildi ama etkinleştirilmedi. Doğrulanmamış
            profille tarama, makul görünen ama tamamen yanlış veri üretir.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Serbest metinden tohum listesi çıkarır.
 *
 * Satır başına bir OEM; virgülden sonrası beklenen stok kodudur. Yapıştırmayı
 * desteklemek, kullanıcının Excel'den kopyalayabilmesi demektir.
 */
function parseSeeds(text: string): SeedOem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [oem, expected] = line.split(',').map((part) => part.trim());
      return { oem, expectedSupplierCode: expected || null };
    })
    .filter((seed) => seed.oem.length > 0);
}
