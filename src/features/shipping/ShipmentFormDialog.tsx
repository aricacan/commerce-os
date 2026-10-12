'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { shippingApi, type CarrierDto } from '../../lib/api/shipping';
import { btnPrimary, btnGhost, inputStyle, labelStyle, errorTextStyle, Select } from './shared';
import { palette, icon } from '../shared/design';

interface Props {
  carriers: CarrierDto[];
  onClose: () => void;
  onCreated: () => void;
  initial?: Partial<FormState>;
}

interface FormState {
  carrierId: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientTown: string;
  recipientAddress: string;
  orderNumber: string;
  weightKg: string;
  desi: string;
}

const EMPTY: FormState = {
  carrierId: '', recipientName: '', recipientPhone: '', recipientCity: '',
  recipientTown: '', recipientAddress: '', orderNumber: '', weightKg: '', desi: '',
};

// Boş string → null. Backend'e "" göndermek, alanın DOLU ama boş olduğu anlamına
// gelirdi; null "girilmedi" demek. İkisi farklı şeyler.
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function ShipmentFormDialog({ carriers, onClose, onCreated, initial }: Props) {
  const [form, setForm] = useState<FormState>(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const carrierId = Number(form.carrierId);
  const canSubmit = form.carrierId !== '' && form.recipientName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await shippingApi.createShipment({
        carrierId,
        recipientName:    form.recipientName.trim(),
        recipientPhone:   orNull(form.recipientPhone),
        recipientCity:    orNull(form.recipientCity),
        recipientTown:    orNull(form.recipientTown),
        recipientAddress: orNull(form.recipientAddress),
        orderNumber:      orNull(form.orderNumber),
        weightKg:         numberOrNull(form.weightKg),
        desi:             numberOrNull(form.desi),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gönderi oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCarrier = carriers.find((c) => c.id === carrierId);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 30001,
        background: 'oklch(21% 0.006 260 / 0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto',
          background: palette.card, borderRadius: 14,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 20px 50px -12px oklch(21% 0.006 260 / 0.2)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${palette.borderFaint}`,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: palette.textStrong }}>Yeni gönderi</span>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }} aria-label="Kapat">
            <X size={icon.md} strokeWidth={icon.stroke} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={labelStyle}>Taşıyıcı *</div>
            <Select
              value={form.carrierId}
              onChange={set('carrierId')}
              style={{ width: '100%' }}
              aria-label="Taşıyıcı"
            >
              <option value="">Seçiniz</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </Select>

            {/* Adaptörü yazılmamış taşıyıcı seçildiyse ne olacağı ÖNCEDEN söylenir —
                kaydedip "neden takip numarası yok?" diye şaşırmasın. */}
            {selectedCarrier && !selectedCarrier.isSupported && (
              <p style={{ fontSize: 11.5, color: palette.warningText, margin: '6px 0 0' }}>
                {selectedCarrier.displayName} entegrasyonu henüz hazır değil — gönderi
                taslak olarak kaydedilir, taşıyıcıya iletilmez.
              </p>
            )}
          </div>

          <div>
            <div style={labelStyle}>Alıcı adı *</div>
            <input
              value={form.recipientName}
              onChange={(e) => set('recipientName')(e.target.value)}
              style={inputStyle}
              placeholder="Ad Soyad"
            />
          </div>

          <div>
            <div style={labelStyle}>Telefon</div>
            <input value={form.recipientPhone} onChange={(e) => set('recipientPhone')(e.target.value)} style={inputStyle} placeholder="05XX XXX XX XX" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Şehir</div>
              <input value={form.recipientCity} onChange={(e) => set('recipientCity')(e.target.value)} style={inputStyle} placeholder="İstanbul" />
            </div>
            <div>
              {/* Aras varış şubesini ilçeden belirler — zorunlu. */}
              <div style={labelStyle}>İlçe</div>
              <input value={form.recipientTown} onChange={(e) => set('recipientTown')(e.target.value)} style={inputStyle} placeholder="Kadıköy" />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Adres</div>
            <textarea
              value={form.recipientAddress}
              onChange={(e) => set('recipientAddress')(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Sipariş no</div>
              <input value={form.orderNumber} onChange={(e) => set('orderNumber')(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Ağırlık (kg)</div>
              <input value={form.weightKg} onChange={(e) => set('weightKg')(e.target.value)} style={inputStyle} inputMode="decimal" />
            </div>
            <div>
              <div style={labelStyle}>Desi</div>
              <input value={form.desi} onChange={(e) => set('desi')(e.target.value)} style={inputStyle} inputMode="decimal" />
            </div>
          </div>

          {error && <p style={errorTextStyle}>{error}</p>}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 20px', borderTop: `1px solid ${palette.borderFaint}`,
        }}>
          <button onClick={onClose} style={btnGhost} disabled={saving}>Vazgeç</button>
          <button
            onClick={() => void handleSubmit()}
            style={{ ...btnPrimary, opacity: canSubmit && !saving ? 1 : 0.5 }}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
