'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Radio, X } from 'lucide-react';
import {
  omnichannelApi,
  type BrandDto, type ChannelCredentialsInput, type ChannelType,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { ChannelConnectSection } from './ChannelConnectSection';
import { ChannelManualFields } from './ChannelManualFields';
import { ChannelScopeFields } from './ChannelScopeFields';
import { ChannelTypePicker } from './ChannelTypePicker';
import { OmniDialogShell } from './OmniDialogShell';
import { canSaveDraft, defaultBotEnabled, toCreateBody } from './channelDraft';
import { manualEntryLabel, missingCredentialLabels, supportsConnect } from './channelCredentialRules';
import { CHANNEL_TYPE_META } from './shared';
import { useChannelDraft } from './useChannelDraft';

interface Props {
  // Marka seçenekleri — liste Kanallar ekranında zaten yüklü, form tekrar çekmez.
  brands: BrandDto[];
  onClose: () => void;
  onSaved: () => void;
}

// Yeni kanal ekleme penceresi, iki adım: 1) kanal türü, 2) o türe özel tek form. Marka / ülke / katalog ortak
// bölümde durur; Meta kanalları "bağla" düğmesiyle (önerilen) ya da katlanır "Elle gir" ile eklenir. Alanlar
// Kanal Merkezi › Genel satır içi düzenlemesiyle paylaşılan bileşenlerdir. Var olan kanal Kanal Merkezi'nde düzenlenir.
export function ChannelFormDialog({ brands, onClose, onSaved }: Props) {
  const { draft, patch } = useChannelDraft(null);
  const [typeChosen, setTypeChosen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [credentials, setCredentials] = useState<ChannelCredentialsInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectable = supportsConnect(draft.type);
  const showsManualForm = !connectable || manualOpen;
  // OAuth düğmelerine geçen ayarlar: bağlanan kanal doğrudan doğru ülke/profille açılır.
  const connectSettings = {
    country: draft.country || null, storeCode: draft.storeCode || null,
    catalogProfileId: draft.catalogProfileId, brandId: draft.brandId,
  };
  const canSave = canSaveDraft(draft, false) && missingCredentialLabels(draft.type, credentials).length === 0;

  const pickType = (type: ChannelType) => {
    patch({ type, botEnabled: defaultBotEnabled(type) });
    setCredentials({});
    setManualOpen(false);
    setTypeChosen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await omnichannelApi.createChannel(toCreateBody(draft, credentials));
      onSaved();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const typeMeta = CHANNEL_TYPE_META[draft.type];
  const ManualChevron = manualOpen ? ChevronDown : ChevronRight;

  return (
    <OmniDialogShell
      onClose={onClose}
      layer="form"
      backdropClassName="bg-black/60 backdrop-blur-xs"
      panelClassName="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)] text-xs"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
        <div className="flex items-center gap-2">
          {typeChosen ? (
            <button
              type="button"
              onClick={() => setTypeChosen(false)}
              aria-label="Kanal türünü değiştir"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
            >
              <ArrowLeft size={15} />
            </button>
          ) : (
            <Radio size={16} className="text-[var(--fg-muted)]" />
          )}
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {typeChosen ? `${typeMeta.label} kanalı ekle` : 'Yeni İletişim Kanalı Ekle'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {!typeChosen && <ChannelTypePicker onPick={pickType} />}

        {typeChosen && (
          <>
            <ChannelScopeFields draft={draft} patch={patch} brands={brands} channel={null} />

            {connectable && (
              <>
                <ChannelConnectSection type={draft.type} settings={connectSettings} onConnected={onSaved} />
                <button
                  type="button"
                  onClick={() => setManualOpen((open) => !open)}
                  aria-expanded={manualOpen}
                  className="flex cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  <ManualChevron size={14} /> {manualEntryLabel(draft.type)}
                </button>
              </>
            )}

            {showsManualForm && (
              <ChannelManualFields
                draft={draft}
                patch={patch}
                credentials={credentials}
                onCredentialsChange={(change) => setCredentials((prev) => ({ ...prev, ...change }))}
              />
            )}

            {error && <div className="rounded-[3px] bg-rose-500/10 p-2 text-xs text-rose-500">{error}</div>}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex h-8 cursor-pointer items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)]"
        >
          Vazgeç
        </button>
        {typeChosen && showsManualForm && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canSave}
            className="inline-flex h-8 cursor-pointer items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        )}
      </div>
    </OmniDialogShell>
  );
}
