'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { ColumnMappingStep } from './ColumnMappingStep';
import { LearnFromUploadPanel } from './LearnFromUploadPanel';
import { ErrorState, formatNumber } from './shared';
import {
  useCommitErpisUpload, useErpisCompanies, useErpisDatasets, useErpisMappings,
} from '@/hooks/erpis/useErpis';
import {
  erpisApi, erpisRequiredFields, formatMappingMatch,
  type ErpisExcelPreview, type ErpisImportSummary, type ErpisMappingDefinition,
  type ErpisSkuPatternInfo,
  type ErpisUploadMode,
} from '@/lib/api';
import { parseId, trLower } from './erpisFilterUtils';

const SAMPLE_COLUMN_LIMIT = 8;

// Firma seçicideki "otomatik" satırının değeri. Gerçek bir firma kimliği olamaz.
const AUTO_COMPANY = 'auto';

// 'confirm' adımı: şablon tanındığında eşleme adımı ATLANIR.
//
// Sistem her ay aynı dosyayı tanıdığı hâlde 90 kolonu tek tek onaylatıyordu. Şablon
// eşleşti ve zorunlu alanların hepsi doluysa sorulacak bir şey yok — kullanıcı ne
// yüklediğini görüp onaylar, eşlemeyi görmek isterse tek tıkla açar.
type Step = 'file' | 'routes' | 'confirm' | 'mapping' | 'result';

// Yükleme kipi — VARSAYILANI YOK.
//
// Önceki hâlde her sipariş yüklemesi sessizce "tam liste" sayılıyordu: dosyada olmayan
// her kalem kapatılıyordu. Kısmi bir dosya yükleyen kullanıcı 2.000+ siparişi farkında
// olmadan kapatabilirdi. Seçim zorunlu; sunucu da seçimsiz commit'i reddediyor.
const MODES: { value: ErpisUploadMode; label: string; detail: string }[] = [
  {
    value: 'Snapshot',
    label: 'Tam liste',
    detail: 'Bu dosya o anki durumun tamamı. Dosyada olmayan açık kalemler KAPANMIŞ sayılır.',
  },
  {
    value: 'Incremental',
    label: 'İlave',
    detail: 'Bu dosya yalnız yeni ve değişen kayıtları taşıyor. Hiçbir kayıt kapatılmaz.',
  },
];

interface Props {
  onClose: () => void;
}

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    try {
      const idx = msg.indexOf(':');
      if (idx !== -1) {
        const json = JSON.parse(msg.slice(idx + 1).trim());
        if (json.detail) return json.detail;
        if (json.title) return json.title;
      }
    } catch {
      // not json
    }
    return msg || fallback;
  }
  return fallback;
}

export function UploadWizardDialog({ onClose }: Props) {
  const [step, setStep] = useState<Step>('file');
  const [file, setFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [preview, setPreview] = useState<ErpisExcelPreview | null>(null);
  const [mapping, setMapping] = useState<ErpisMappingDefinition>({ fields: {}, headerRowIndex: 1 });
  const [saveAs, setSaveAs] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Varsayılan YOK (bkz. MODES): sunucu da seçimsiz commit'i reddediyor. Önceden 'İlave'
  // önseçiliydi ve kullanıcı tam listeyi farkında olmadan ilave olarak yüklüyordu.
  const [mode, setMode] = useState<ErpisUploadMode | null>(null);
  // Kullanıcının AÇIKÇA seçtiği şablon. Sunucunun kendi bulduğu şablon preview'da duruyor;
  // ikisini tek durumda tutmak, otomatik bulunanı sonraki okumada "seçilmiş" sayıyordu.
  const [templateId, setTemplateId] = useState<number | null>(null);
  // Eşleme elle değiştirildi mi — değişmediyse commit şablonun kendisiyle yapılır.
  const [mappingEdited, setMappingEdited] = useState(false);
  const [summary, setSummary] = useState<ErpisImportSummary | null>(null);

  // Kalıp → firma kararları. Yalnız KURALI OLMAYAN kalıplar için doldurulur; kayıtlı
  // kural varsa kullanıcıya hiç sorulmaz.
  const [routes, setRoutes] = useState<Record<string, number>>({});

  // Firma seçimi ya BİR FİRMA ya da OTOMATİK.
  //
  // Otomatikte satırlar stok koduna göre dağıtılıyor (bkz. Firma Kuralları); bir firma
  // seçildiğinde dosyanın tamamı oraya yazılıyor ve kural devreye girmiyor — kullanıcının
  // açık seçimi, kuraldan güçlü.
  const [autoRoute, setAutoRoute] = useState(false);

  const companies = useErpisCompanies();
  const datasets = useErpisDatasets();
  const templates = useErpisMappings(datasetId);
  const commit = useCommitErpisUpload();

  // Varsayılan firma: Kullanıcının belirlediği varsayılan firma, yoksa DEMO Levha, yoksa ilk aktif firma
  useEffect(() => {
    if (companyId !== null || !companies.data || companies.data.length === 0) return;

    const savedDefault = typeof window !== 'undefined' ? localStorage.getItem('erpis_default_company_id') : null;
    if (savedDefault) {
      const found = companies.data.find((c) => String(c.id) === savedDefault && c.isActive);
      if (found) {
        setCompanyId(found.id);
        return;
      }
    }

    const levhaCompany = companies.data.find((c) => c.isActive && trLower(c.name).includes('levha'));
    if (levhaCompany) {
      setCompanyId(levhaCompany.id);
      return;
    }

    const first = companies.data.find((c) => c.isActive);
    if (first) setCompanyId(first.id);
  }, [companies.data, companyId]);

  // Varsayılan rapor tipi: İlk aktif dataset
  useEffect(() => {
    if (datasetId !== null || !datasets.data || datasets.data.length === 0) return;
    const firstActive = datasets.data.find((d) => d.isActive);
    if (firstActive) setDatasetId(firstActive.id);
  }, [datasets.data, datasetId]);

  // Zorunlu alanlar seçili rapor tipine göre — sunucuyla aynı kural.
  const datasetKind = datasets.data?.find((d) => d.id === datasetId)?.kind;
  const requiredFields = erpisRequiredFields(datasetKind);
  const mappingComplete = requiredFields.every((f) => mapping.fields[f]);

  async function handleParse() {
    if (!file) {
      setError('Lütfen önce bir rapor dosyası seçin.');
      return;
    }
    if (!autoRoute && companyId == null) {
      setError('Lütfen bir firma seçin.');
      return;
    }
    if (datasetId == null) {
      setError('Lütfen bir rapor tipi seçin.');
      return;
    }
    if (!mode) {
      setError('Lütfen yükleme kipini (Tam liste veya İlave) seçin.');
      return;
    }

    setParsing(true);
    setError(null);
    try {
      // Seçilen şablon SUNUCUYA gönderiliyor. Önceden yalnız istemcide tutuluyordu:
      // dropdown bir şey seçiyor gibi görünüyor, sunucu ise başlık imzasına bakıp
      // kendi bildiğini okuyordu.
      const result = await erpisApi.parseUpload(file!, datasetId!, undefined, templateId);
      setPreview(result);
      setMapping(result.suggestedMapping);
      setMappingEdited(false);

      // Kuralı olmayan kalıp varsa ÖNCE o sorulur: hangi kartın hangi şirkete gittiği,
      // hangi kolonun neye eşlendiğinden daha önemli bir karar.
      setRoutes({});
      setStep(
        autoRoute && unroutedOf(result).length > 0 ? 'routes'
          : result.mappingComplete ? 'confirm'
            : 'mapping');
    } catch (err) {
      setError(parseErrorMessage(err, 'Dosya okunamadı.'));
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    if (!file || companyId == null || datasetId == null) return;
    setError(null);

    // Şablon bir adımdan diğerine TAŞINIYOR: eşleme şablondan geldi ve elle
    // değiştirilmediyse yükleme şablonun kimliğiyle yapılır (yükleme hangi şablonla
    // okunduğunu kaydeder). Değiştirildiyse kullanıcının eşlemesi gönderilir — sunucu
    // şablon kimliği gelince eşleme gövdesini yok sayıyor.
    const columnMappingId = !mappingEdited ? (preview?.matchedMappingId ?? null) : null;

    try {
      const result = await commit.mutateAsync([file, {
        companyId,
        datasetId,
        mode: mode!,
        columnMappingId,
        mapping: columnMappingId == null ? mapping : null,
        saveMappingAs: saveAs.trim() || null,
        // Önizlemenin kullandığı okuma ayarları aynen geri gönderilir: sunucu dosyayı
        // yeniden tespit ederse kullanıcının onayladığı tablo ile kaydedilen tablo
        // ayrışabilir (ör. ayraç farklı seçilirse satırlar tek kolona düşer).
        sheetName: preview?.sheetName ?? null,
        delimiter: preview?.delimiter ?? null,
        codePage: preview?.codePage ?? null,
        autoRoute,
        skuRoutes: Object.entries(routes).map(([pattern, id]) => ({
          pattern,
          companyId: id,
          sample: preview?.skuPatterns.find((p) => p.pattern === pattern)?.sample ?? null,
        })),
      }]);

      // Sonuç ADIMI: "yüklendi" demek neyin değiştiğini söylemiyordu. Kaç kayıt açıldı,
      // kaçı kapandı, kaçına dokunulmadı — yanlış dosya yüklendiği ancak burada fark
      // ediliyor.
      setSummary(result.summary);
      setStep('result');
    } catch (err) {
      setError(parseErrorMessage(err, 'Yükleme başarısız.'));
    }
  }

  return (
    <div className="fixed inset-0 z-[20100] flex items-center justify-center bg-black/40 p-2 md:p-4">
      {/* Diyalog YANA değil AŞAĞI büyür: genişlettiğimizde eşleme alanları üç sütuna
          yayılıp göz taramasını zorlaştırdı ve dar ekranlarda taştı. Genişlik okunabilir
          bir ölçüde sabit (3xl), yükseklik ekranın %92'sine kadar uzuyor, taşan kısım
          diyalogun kendi içinde kayıyor. */}
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg md:max-h-[92vh] md:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--fg)]">Erpis Raporu Yükle</h3>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              {step === 'file'
                ? 'Firma, rapor tipi ve Excel dosyasını seçin.'
                : step === 'routes'
                  ? 'Bu dosyadaki stok kodu kalıpları hangi firmaya ait?'
                  : step === 'mapping'
                  ? `${formatNumber(preview?.totalRows)} satır okundu. Kolonları eşleyin.`
                  : step === 'confirm'
                    ? `${formatNumber(preview?.totalRows)} satır okundu. Eşleme hazır.`
                    : 'Yükleme tamamlandı.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-[4px] border border-[var(--border-soft)] p-1.5 text-[var(--fg-muted)]"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        {error && <ErrorState text={error} />}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {step === 'file' ? (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Labelled label="Firma">
                  <FilterSelect
                    value={autoRoute ? AUTO_COMPANY : companyId ? String(companyId) : ''}
                    options={[
                      {
                        value: AUTO_COMPANY,
                        label: 'Otomatik',
                        sublabel: 'Stok koduna göre firmalara dağıt',
                      },
                      ...(companies.data ?? [])
                        .filter((c) => c.isActive)
                        .map((c) => ({ value: String(c.id), label: c.name, sublabel: c.code })),
                    ]}
                    placeholder="Firma seç"
                    onChange={(v) => {
                      const auto = v === AUTO_COMPANY;
                      setAutoRoute(auto);
                      // Otomatikte de bir firma gerekiyor: kuralı OLMAYAN kalıplar
                      // oraya düşecek. İlk aktif firma varsayılan taban.
                      setCompanyId(auto
                        ? ((companies.data ?? []).find((c) => c.isActive)?.id ?? null)
                        : parseId(v));
                    }}
                    minWidth="100%"
                  />
                </Labelled>
                <Labelled label="Rapor tipi">
                  <FilterSelect
                    value={datasetId ? String(datasetId) : ''}
                    options={(datasets.data ?? [])
                      .filter((d) => d.isActive)
                      .map((d) => ({ value: String(d.id), label: d.name }))}
                    placeholder="Rapor tipi seç"
                    onChange={(v) => {
                      setDatasetId(parseId(v));
                      // Şablonlar rapor tipine ait: başka tipin şablonu seçili kalmamalı.
                      setTemplateId(null);
                    }}
                    minWidth="100%"
                  />
                </Labelled>
              </div>

              {/* Kayıtlı şablon seçimi.
                  Şablon sistemi vardı ama seçici YOKTU: kullanıcı bir şablonu ancak
                  başlıkları birebir tutuyorsa kullanabiliyordu. Erpis rapor başlıklarını
                  sürümler arasında değiştirdiğinde eşleşme kopuyor ve kullanıcı her ay
                  sıfırdan eşleme yapıyordu. */}
              {(templates.data?.length ?? 0) > 0 && (
                <Labelled label="Kayıtlı şablon (isteğe bağlı)">
                  <FilterSelect
                    value={templateId ? String(templateId) : ''}
                    options={(templates.data ?? []).map((t) => ({
                      value: String(t.id),
                      label: t.name,
                      sublabel: `${t.sourceHeaders.length} kolon`,
                    }))}
                    placeholder="Otomatik tanı"
                    onChange={(v) => setTemplateId(parseId(v))}
                    minWidth="100%"
                  />
                </Labelled>
              )}

              {/* KİP SEÇİMİ — zorunlu, varsayılansız.
                  Bu seçim olmadan "Dosyayı Oku" düğmesi açılmıyor ve sunucu da commit'i
                  reddediyor. Sessiz bir varsayım, kullanıcının farkında olmadan binlerce
                  siparişi kapatmasına yol açıyordu. */}
              <Labelled label="Bu dosya ne?">
                <div className="flex flex-col gap-1.5">
                  {MODES.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-[5px] border p-2.5 transition-colors ${
                        mode === option.value
                          ? 'border-[var(--border)] bg-[var(--bg-subtle)]'
                          : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="erpis-upload-mode"
                        checked={mode === option.value}
                        onChange={() => setMode(option.value)}
                        className="mt-0.5 h-3.5 w-3.5 accent-[var(--fg)]"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold text-[var(--fg)]">{option.label}</span>
                        <span className="text-[11px] leading-snug text-[var(--fg-muted)]">
                          {option.detail}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </Labelled>

              {/* Erpis'in ürettiği dosyalar .xls UZANTILI ama içeriği SpreadsheetML XML.
                  Liste yalnızca dosya seçiciyi süzer; gerçek format sunucuda İÇERİKTEN
                  belirlenir (bkz. ErpisWorkbookSniffer), o yüzden uzantı yanlış olsa bile
                  dosya okunur. Sadece .xlsx kabul eden eski hâli, Erpis'in kendi
                  çıktılarının seçilmesini engelliyordu. */}
              <Labelled label="Rapor dosyası (.xls, .xlsx, .xml, .csv, .txt)">
                <input
                  type="file"
                  accept=".xls,.xlsx,.xlsm,.xml,.csv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] ?? null;
                    setFile(selected);
                    if (selected) setError(null);
                  }}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-[12px] text-[var(--fg)]"
                />
                {file && (
                  <div className="mt-1 flex items-center justify-between rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-[11.5px]">
                    <span className="truncate font-medium text-[var(--fg)]">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      title="Dosyayı kaldır"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </Labelled>

              {(companies.data?.length ?? 0) === 0 && (
                <p className="text-[11.5px] text-[var(--fg-muted)]">
                  Önce Firmalar sekmesinden en az bir firma tanımlayın.
                </p>
              )}
              {(datasets.data?.length ?? 0) === 0 && (
                <p className="text-[11.5px] text-[var(--fg-muted)]">
                  Önce Eşlemeler sekmesinden en az bir rapor tipi tanımlayın.
                </p>
              )}
            </>
          ) : step === 'routes' ? (
            <SkuRouteStep
              patterns={preview?.skuPatterns ?? []}
              companies={companies.data ?? []}
              routes={routes}
              onChange={setRoutes}
            />
          ) : step === 'result' ? (
            <ImportResult summary={summary} mode={mode} />
          ) : step === 'confirm' ? (
            <>
              {preview && <ReadSummary preview={preview} />}
              <ConfirmStep
                preview={preview}
                mode={mode}
                companyName={autoRoute
                  ? 'Otomatik (stok koduna göre)'
                  : companies.data?.find((c) => c.id === companyId)?.name}
                datasetName={datasets.data?.find((d) => d.id === datasetId)?.name}
                onEditMapping={() => setStep('mapping')}
              />
              <PreviewTable preview={preview} />
            </>
          ) : (
            <>
              {preview && <ReadSummary preview={preview} />}

              {preview?.matchedMappingName && (
                <p className="rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2 text-[11.5px] text-[var(--fg)]">
                  <strong className="font-bold">«{preview.matchedMappingName}»</strong> şablonu
                  kullanıldı — {formatMappingMatch(preview.matchKind).toLowerCase()}.
                  {(preview.missingRequiredFields.length > 0) && (
                    <> Eksik alanlar: <strong className="font-bold">
                      {preview.missingRequiredFields.join(', ')}
                    </strong></>
                  )}
                </p>
              )}

              <PreviewTable preview={preview} />

              <ColumnMappingStep
                headers={preview?.headers ?? []}
                mapping={mapping}
                requiredFields={requiredFields}
                onChange={(next) => {
                  setMapping(next);
                  setMappingEdited(true);
                }}
              />

              <Labelled label="Şablon olarak kaydet (isteğe bağlı)">
                <input
                  value={saveAs}
                  onChange={(e) => setSaveAs(e.target.value)}
                  placeholder="Örn. Aylık satış faturaları"
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
                />
              </Labelled>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
          {step === 'result' && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs"
            >
              <Check size={14} strokeWidth={1.8} />
              Kapat
            </button>
          )}
          {(step === 'mapping' || step === 'confirm' || step === 'routes') && (
            <button
              type="button"
              onClick={() => setStep('file')}
              className="rounded-[4px] border border-[var(--border-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-muted)]"
            >
              Geri
            </button>
          )}
          {step === 'file' ? (
            <button
              type="button"
              onClick={handleParse}
              disabled={!file || parsing}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} strokeWidth={1.8} />}
              Dosyayı Oku
            </button>
          ) : step === 'routes' ? (
            <button
              type="button"
              onClick={() => setStep(preview?.mappingComplete ? 'confirm' : 'mapping')}
              disabled={unroutedOf(preview).some((p) => routes[p.pattern] == null)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              <Check size={14} strokeWidth={1.8} />
              Devam
            </button>
          ) : step === 'mapping' || step === 'confirm' ? (
            <button
              type="button"
              onClick={handleCommit}
              disabled={!mappingComplete || commit.isPending}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              {commit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={1.8} />}
              Yüklemeyi Tamamla
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Okuma özeti — YALNIZ bir şeyler ters gittiğinde görünür.
//
// Önceden her yüklemede biçim, sayfa, başlık satırı, kolon/satır sayısı ve üç ayrı not
// satırı yazıyordu: ekranın üçte biri, doğru giden bir yüklemede kimsenin okumadığı
// teknik ayrıntıydı. Sayılar zaten diyalog başlığında ("199.999 satır okundu").
//
// Sorun varsa (dosya düz metin sanılmış, satır tavanı aşılmış, ayraç bulunamamış)
// kullanıcının BUNU görmesi şart — o durumda kutu açılıyor.
function ReadSummary({ preview }: { preview: ErpisExcelPreview }) {
  const FORMAT_LABELS: Record<string, string> = {
    SpreadsheetMl: 'SpreadsheetML (XML)',
    OpenXml: 'Excel (.xlsx)',
    Biff: 'Excel 97-2003 (.xls)',
    Csv: 'Ayraçlı metin',
  };

  // Tek kolonluk bir "tablo" neredeyse her zaman yanlış okumadır: Erpis raporlarının
  // hepsi çok kolonlu. Not varsa zaten okuyucu bir şeyden şikâyetçi.
  const suspicious = preview.headers.length <= 1;
  if (preview.notes.length === 0 && !suspicious) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2">
      <span className="text-[11.5px] font-bold text-[var(--fg)]">
        Dosya {FORMAT_LABELS[preview.format] ?? preview.format} olarak okundu
        {suspicious && ' — yalnız 1 kolon bulundu, bu büyük olasılıkla yanlış'}
      </span>

      {preview.notes.map((note) => (
        <p key={note} className="text-[11px] text-[var(--fg-muted)]">• {note}</p>
      ))}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">{label}</span>
      {children}
    </label>
  );
}

// İlk satırlar gösterilir ki kullanıcı hangi kolonun ne içerdiğini görerek eşleyebilsin.
// Geniş raporlarda tüm kolonları göstermek tabloyu okunmaz yapardı — ilki kadarı yeter,
// eşleme listesinde kolonların tamamı zaten var.
function PreviewTable({ preview }: { preview: ErpisExcelPreview | null }) {
  if (!preview || preview.sampleRows.length === 0) return null;

  const headers = preview.headers.slice(0, SAMPLE_COLUMN_LIMIT);
  const hiddenCount = preview.headers.length - headers.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[var(--bg-subtle)]">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-1.5 text-left font-bold text-[var(--fg)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.sampleRows.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-t border-[var(--border-soft)]">
                {headers.map((_, c) => (
                  <td key={c} className="whitespace-nowrap px-2 py-1.5 text-[var(--fg-muted)]">{row[c] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <span className="text-[10.5px] text-[var(--fg-muted)]">+{hiddenCount} kolon daha (eşleme listesinde hepsi var)</span>
      )}
    </div>
  );
}

// İçe aktarım sonucu — "yüklendi" demek neyin değiştiğini söylemiyordu.
//
// En kritik iki satır KAPANAN ve DOKUNULMAYAN: yanlış dosya yüklendiği ancak bu
// rakamlar görülünce fark ediliyor. Kapanan kayıt sayısı beklenenden büyükse kullanıcı
// hemen anlıyor ve yüklemeyi silebiliyor.
function ImportResult({ summary, mode }: {
  summary: ErpisImportSummary | null;
  mode: ErpisUploadMode | null;
}) {
  if (!summary) {
    return <p className="text-[12px] text-[var(--fg-muted)]">Yükleme tamamlandı.</p>;
  }

  const rows: { label: string; value: number; warn?: boolean }[] = [
    { label: 'Yeni sipariş', value: summary.ordersCreated },
    { label: 'Güncellenen sipariş', value: summary.ordersUpdated },
    { label: 'Yeni kalem', value: summary.linesCreated },
    { label: 'Güncellenen kalem', value: summary.linesUpdated },
    { label: 'Yeni stok kartı', value: summary.itemsCreated },
    { label: 'Güncellenen stok kartı', value: summary.itemsUpdated },
    { label: 'Kapanan sipariş', value: summary.closedOrders, warn: summary.closedOrders > 0 },
    { label: 'Kapanan kalem', value: summary.closedLines, warn: summary.closedLines > 0 },
    { label: 'Dokunulmayan stok kartı', value: summary.untouchedItems },
    { label: 'Dokunulmayan açık sipariş', value: summary.untouchedOrders },
    { label: 'Atlanan satır', value: summary.skippedRows, warn: summary.skippedRows > 0 },
  ].filter((row) => row.value > 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[11.5px] text-[var(--fg)]">
        Dosya <strong className="font-bold">{mode === 'Snapshot' ? 'tam liste' : 'ilave'}</strong> olarak
        işlendi.
        {mode === 'Snapshot'
          ? ' Bu dosyada görünmeyen açık kalemler kapatıldı.'
          : ' Hiçbir kayıt kapatılmadı.'}
      </p>

      {rows.length === 0 ? (
        <p className="text-[12px] text-[var(--fg-muted)]">Hiçbir kayıt değişmedi.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col rounded-[5px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2"
            >
              <span
                className="text-[17px] font-extrabold leading-tight tabular-nums"
                style={{ color: row.warn ? 'rgba(180,83,9,0.95)' : 'var(--fg)' }}
              >
                {formatNumber(row.value)}
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                {row.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sistemin ÖĞRENDİĞİ an: eksikliğin fark edildiği yer ile düzeltmenin yapıldığı
          yer aynı ekran. Ayrı bir sekmede duran öneriler kimse tarafından açılmıyordu. */}
      <LearnFromUploadPanel />
    </div>
  );
}

// Onay adımı — "ne yüklüyorum" sorusunun tek ekranlık cevabı.
//
// Eşleme adımı atlandığında kullanıcının gördüğü tek ekran bu. Dört şey yazıyor: hangi
// firmaya, hangi rapor tipi, kaç satır, hangi kipte. Kip özellikle: "tam liste" seçimi
// bu dosyada görünmeyen kalemleri KAPATIYOR ve geri alınması zor.
function ConfirmStep({ preview, mode, companyName, datasetName, onEditMapping }: {
  preview: ErpisExcelPreview | null;
  mode: ErpisUploadMode | null;
  companyName?: string;
  datasetName?: string;
  onEditMapping: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Firma', value: companyName ?? '—' },
    { label: 'Rapor tipi', value: datasetName ?? '—' },
    { label: 'Satır', value: formatNumber(preview?.totalRows) },
    { label: 'Kolon', value: formatNumber(preview?.headers.length) },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2"
          >
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
              {row.label}
            </span>
            <span className="truncate text-[13px] font-extrabold text-[var(--fg)]" title={row.value}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <p className="rounded-[4px] border border-[var(--border-soft)] px-3 py-2 text-[11.5px] text-[var(--fg)]">
        {preview?.matchedMappingName ? (
          <>
            <strong className="font-bold">«{preview.matchedMappingName}»</strong> şablonu kullanıldı
            {' '}— {formatMappingMatch(preview.matchKind).toLowerCase()}.
          </>
        ) : 'Eşleme başlık adlarından çıkarıldı.'}
        {' '}
        {mode === 'Snapshot'
          ? 'Dosya TAM LİSTE olarak işlenecek: burada görünmeyen açık kalemler kapatılacak.'
          : 'Dosya İLAVE olarak işlenecek: hiçbir kayıt kapatılmayacak.'}
      </p>

      {/* Eşleme gizli değil, bir tık ötede: sistemin ne yaptığını görmek isteyen
          kullanıcıyı engellemek, otomatikleştirmenin bedeli olmamalı. */}
      <button
        type="button"
        onClick={onEditMapping}
        className="w-fit text-[11.5px] font-bold text-[var(--fg-muted)] underline underline-offset-2"
      >
        Kolon eşlemesini gör / değiştir
      </button>
    </div>
  );
}

// Kuralı OLMAYAN kalıplar. Kayıtlı kural varsa kullanıcıya sorulmaz — soru bir kez
// sorulur, cevap kalıcıdır.
function unroutedOf(preview: ErpisExcelPreview | null): ErpisSkuPatternInfo[] {
  return (preview?.skuPatterns ?? []).filter((p) => p.companyId == null);
}

// Stok kodu kalıbı → firma adımı.
//
// Erpis tek dosyada bütün fabrikaların kartlarını veriyor ve hangi kartın hangi şirkete
// ait olduğunu söyleyen bir kolon YOK. Tek ipucu kodun biçimi:
//   99999999-999999-99999999   → DEMO Merkez (bitmiş ürün)
//   A.999-9999999999-999999999 → DEMO Levha (yarı mamul)
//
// Kural KODA GÖMÜLÜ DEĞİL: yeni bir fabrika ya da yeni bir kod şeması çıktığında kimse
// kod yazmasın diye kullanıcı burada bir kez seçiyor, sistem bir daha sormuyor.
function SkuRouteStep({ patterns, companies, routes, onChange }: {
  patterns: ErpisSkuPatternInfo[];
  companies: { id: number; name: string; isActive: boolean }[];
  routes: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const options = companies
    .filter((c) => c.isActive)
    .map((c) => ({ value: String(c.id), label: c.name }));

  const known = patterns.filter((p) => p.companyId != null);
  const unknown = patterns.filter((p) => p.companyId == null);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[11.5px] text-[var(--fg)]">
        Kod biçimi, kartın hangi şirkete ait olduğunu söyleyen tek ipucu. Bir kez
        seçtiğinizde kural kaydedilir; sonraki yüklemelerde yalnız <strong className="font-bold">yeni</strong> kalıplar sorulur.
      </p>

      <div className="flex flex-col gap-1.5">
        {unknown.map((pattern) => (
          <div
            key={pattern.pattern}
            className="flex flex-wrap items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-mono text-[12px] font-bold text-[var(--fg)]">
                {pattern.pattern}
              </span>
              <span className="truncate text-[10.5px] text-[var(--fg-muted)]">
                {formatNumber(pattern.rowCount)} satır · örnek {pattern.sample}
              </span>
            </div>

            <FilterSelect
              value={routes[pattern.pattern] ? String(routes[pattern.pattern]) : ''}
              options={options}
              placeholder="Firma seçin"
              onChange={(v) => {
                const id = parseId(v);
                const next = { ...routes };
                if (id == null) delete next[pattern.pattern];
                else next[pattern.pattern] = id;
                onChange(next);
              }}
              showAllOption={false}
              minWidth={190}
            />
          </div>
        ))}
      </div>

      {/* Kuralı olan kalıplar da GÖSTERİLİYOR ama sorulmuyor: kullanıcı dosyanın
          tamamının nereye gittiğini görebilmeli, yoksa "geri kalanı ne oldu" sorusu
          cevapsız kalıyor. */}
      {known.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
            Kuralı zaten var
          </span>
          {known.map((pattern) => (
            <div
              key={pattern.pattern}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[var(--border-soft)] px-3 py-1.5 text-[11px]"
            >
              <span className="truncate font-mono text-[var(--fg-muted)]">{pattern.pattern}</span>
              <span className="text-[var(--fg)]">
                {formatNumber(pattern.rowCount)} satır → <strong className="font-bold">{pattern.companyName}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
