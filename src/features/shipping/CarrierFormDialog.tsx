'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  shippingApi, CARRIER_TYPE,
  type CarrierDto, type CarrierType, type CarrierCredentialsInput,
} from '../../lib/api/shipping';
import {
  cardStyle, btnPrimary, btnGhost, inputStyle, labelStyle, errorTextStyle,
  CARRIER_TYPE_META, CREDENTIAL_FIELDS,
} from './shared';
import { palette, icon } from '../shared/design';

interface Props {
  // null = yeni taşıyıcı, dolu = düzenleme.
  carrier: CarrierDto | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS: CarrierType[] = [
  CARRIER_TYPE.Aras, CARRIER_TYPE.Yurtici, CARRIER_TYPE.Mng,
  CARRIER_TYPE.Surat, CARRIER_TYPE.Ups, CARRIER_TYPE.Dhl,
];

export function CarrierFormDialog({ carrier, onClose, onSaved }: Props) {
  const isEdit = carrier !== null;

  const [type, setType] = useState<CarrierType>(carrier?.type ?? CARRIER_TYPE.Aras);
  const [displayName, setDisplayName] = useState(carrier?.displayName ?? '');
  const [accountCode, setAccountCode] = useState(carrier?.accountCode ?? '');
  const [storeCode, setStoreCode] = useState(carrier?.storeCode ?? '');
  const [isTestMode, setIsTestMode] = useState(carrier?.isTestMode ?? false);
  const [isDefault, setIsDefault] = useState(carrier?.isDefault ?? false);
  const [isActive, setIsActive] = useState(carrier?.isActive ?? true);

  // Düzenlemede boş bırakılırsa mevcut şifreli bilgiler korunur.
  const [credentials, setCredentials] = useState<CarrierCredentialsInput>({});

  // Her alan kendi göster/gizle durumunu tutar.
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const toggleVisible = (key: string) =>
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = CREDENTIAL_FIELDS[type];

  const setCredential = (key: string, value: string) =>
    setCredentials((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const touched = Object.values(credentials).some((v) => v && v.trim() !== '');
        await shippingApi.updateCarrier(carrier.id, {
          displayName, accountCode,
          storeCode: storeCode || null,
          isTestMode, isDefault, isActive,
          credentials: touched ? credentials : null,
        });
      } else {
        await shippingApi.createCarrier({
          type, displayName, accountCode,
          storeCode: storeCode || null,
          isTestMode, isDefault,
          credentials,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  // Zorunlu kimlik alanları da dolu olmalı — yoksa varsayılan Aras'ta kullanıcı yalnız
  // ad+kod girip Kaydet'e basıyor, backend "Kullanıcı adı/Parola zorunludur" 400 dönüyor
  // ve kayıt oluşmuyordu (şifre alanları formda aşağıda olduğu için gözden kaçıyordu).
  // Düzenlemede kimlik boş bırakılabilir (mevcut korunur).
  const credsOk = isEdit || fields
    .filter((f) => !f.optional)
    .every((f) => ((credentials as Record<string, string | undefined>)[f.key] ?? '').trim() !== '');

  const canSave = displayName.trim().length >= 2 && accountCode.trim().length > 0 && credsOk && !saving;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'oklch(21% 0.006 260 / 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30001, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...cardStyle, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: palette.textStrong }}>
            {isEdit ? 'Taşıyıcıyı Düzenle' : 'Yeni Taşıyıcı'}
          </h2>
          <button onClick={onClose} style={{ ...btnGhost, padding: 6, border: 'none' }} aria-label="Kapat">
            <X size={icon.lg} strokeWidth={icon.stroke} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tip yalnızca oluştururken seçilir: tip değişince kimlik bilgilerinin şekli
              de değişir, mevcut kaydı dönüştürmek yerine yeni taşıyıcı açmak doğrudur. */}
          {!isEdit && (
            <div>
              <div style={labelStyle}>Taşıyıcı</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TYPE_OPTIONS.map((t) => {
                  const meta = CARRIER_TYPE_META[t];
                  const selected = t === type;
                  return (
                    <button
                      key={t}
                      onClick={() => { setType(t); setCredentials({}); }}
                      style={{
                        ...btnGhost,
                        borderColor: selected ? palette.accentBorder : palette.borderSoft,
                        background: selected ? palette.accentSoft : 'transparent',
                        color: selected ? meta.color : palette.text,
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      <meta.Icon size={icon.md} strokeWidth={icon.stroke} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div style={labelStyle}>Görünen ad</div>
            <input
              style={inputStyle}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="StoreB Aras Kurumsal"
            />
          </div>

          <div>
            <div style={labelStyle}>Hesap / gönderici kodu</div>
            <input
              style={inputStyle}
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="Taşıyıcının verdiği müşteri kodu"
            />
          </div>

          <div>
            <div style={labelStyle}>Mağaza kodu (opsiyonel)</div>
            <input
              style={inputStyle}
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              placeholder="STOREB"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Kimlik bilgileri</div>

            {/* Alanların BOŞ görünmesi "silindi" izlenimi veriyordu — sadece pasif
                yapmak / başka bir alanı değiştirmek için hiçbir kimlik alanına
                dokunmaya gerek olmadığını açıkça söylüyoruz. */}
            {isEdit && carrier?.hasCredentials && (
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center', fontSize: 12,
                color: palette.success, background: palette.accentSoft,
                borderRadius: 8, padding: '8px 10px',
              }}>
                <CheckCircle2 size={14} />
                Kimlik bilgileri kayıtlı. Değiştirmek istemiyorsanız aşağıdaki alanları
                boş bırakın — kaydetseniz bile silinmez.
              </div>
            )}

            {fields.map((f) => {
              // Yalnızca gerçek sırlar gizlenir; kullanıcı adı/müşteri kodu görünür olmalı
              // (hepsi password olunca kullanıcı ne yazdığını göremiyordu).
              const isSecret = /pass|secret|key|token/i.test(f.key);
              const missing = !f.optional && !isEdit
                && ((credentials as Record<string, string | undefined>)[f.key] ?? '').trim() === '';
              const visible = visibleFields[f.key] ?? false;
              return (
                <div key={f.key}>
                  <div style={{ ...labelStyle, fontWeight: 500 }}>
                    {f.label}{f.optional ? ' (opsiyonel)' : ' *'}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{
                        ...inputStyle, borderColor: missing ? palette.warningText : undefined,
                        paddingRight: isSecret ? 36 : undefined,
                      }}
                      type={isSecret && !visible ? 'password' : 'text'}
                      autoComplete="off"
                      placeholder={isEdit ? 'Değiştirmek için yazın' : f.optional ? '' : 'Zorunlu'}
                      value={(credentials as Record<string, string | undefined>)[f.key] ?? ''}
                      onChange={(e) => setCredential(f.key, e.target.value)}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleVisible(f.key)}
                        aria-label={visible ? 'Gizle' : 'Göster'}
                        style={{
                          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                          display: 'flex', color: palette.textMuted,
                        }}
                      >
                        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setIsTestMode(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              <span style={{ fontSize: 13, fontWeight: 600, color: palette.textStrong }}>Test ortamı</span>
              {/* Bu uyarı önemli: canlı hesapla test göndermek gerçek fatura ve
                  gerçek kurye çağrısı demek. */}
              <span style={{ display: 'block', fontSize: 11, color: palette.textMuted }}>
                Kapalıyken oluşturulan gönderiler gerçektir — fatura kesilir, kurye çağrılır.
              </span>
            </span>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            <span style={{ fontSize: 13, color: palette.text }}>Varsayılan taşıyıcı</span>
          </label>

          {isEdit && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span style={{ fontSize: 13, color: palette.text }}>Aktif</span>
            </label>
          )}

          {error && <div style={errorTextStyle}>{error}</div>}

          {/* Kaydet pasifse NEDEN pasif olduğunu söyle — sessizce gri duran buton
              "çalışmıyor" gibi görünüyordu. */}
          {!canSave && !saving && (
            <div style={{ fontSize: 12, color: palette.warningText, fontWeight: 600 }}>
              {displayName.trim().length < 2
                ? 'Görünen ad en az 2 karakter olmalı.'
                : accountCode.trim().length === 0
                  ? 'Hesap kodu zorunludur.'
                  : `Zorunlu kimlik alanlarını doldurun: ${fields
                      .filter((f) => !f.optional && ((credentials as Record<string, string | undefined>)[f.key] ?? '').trim() === '')
                      .map((f) => f.label)
                      .join(', ')}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={btnGhost}>İptal</button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
