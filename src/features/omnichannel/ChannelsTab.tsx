'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Radio, Tags } from 'lucide-react';
import { omnichannelApi, type ChannelDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { ChannelFormDialog } from './ChannelFormDialog';
import { WhatsAppTemplatesDialog } from './WhatsAppTemplatesDialog';
import { ChannelDiagnosisDialog } from './ChannelDiagnosisDialog';
import { BrandForm } from './BrandForm';
import { BrandSection } from './BrandSection';
import { ChannelCard } from './ChannelCard';
import { ChannelsSkeleton } from './ChannelsSkeleton';
import { groupChannelsIntoBrandSections } from './channelCardRules';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import { useBrandEditor } from './useBrandEditor';
import { useBrands } from './useBrands';
import { useCatalogProfiles } from './useCatalogProfiles';
import { useChannelActions } from './useChannelActions';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';
import { useOmnichannelNav } from './OmnichannelNavContext';

export function ChannelsTab() {
  const [channels, setChannels] = useState<ChannelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateChannel, setTemplateChannel] = useState<ChannelDto | null>(null);
  const [diagnosisChannel, setDiagnosisChannel] = useState<ChannelDto | null>(null);
  const { go } = useOmnichannelNav();
  const { profiles } = useCatalogProfiles();
  const { brands, error: brandsError, reload: reloadBrands } = useBrands();
  const canEditBrands = useIsOmnichannelAdmin();
  const catalogName = (id: number | null | undefined) =>
    id == null ? null : profiles.find((p) => p.id === id)?.name ?? `Profil #${id}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChannels(await omnichannelApi.getChannels());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Kanal ↔ marka karşılıklı: kanal kaydı markanın kanal sayısını, marka silme/adı kanal kartını değiştirir.
  const reloadAll = useCallback(async () => {
    await Promise.all([load(), reloadBrands()]);
  }, [load, reloadBrands]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const actions = useChannelActions(load);
  const brandEditor = useBrandEditor(reloadAll);
  const openCenter = (channel: ChannelDto) => go({ tab: 'channels', channelId: channel.id });
  const openCreate = () => setDialogOpen(true);

  const sections = groupChannelsIntoBrandSections(channels, brands);
  const showSkeleton = loading && channels.length === 0;
  const isEmpty = !loading && channels.length === 0;

  return (
    <div className="flex w-full flex-1 flex-col gap-5 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-ui-lg font-bold text-[var(--fg)]">İletişim Kanalları</h2>
          </div>
          <p className="max-w-2xl text-ui-xs text-[var(--fg-muted)]">
            WhatsApp, Instagram, Facebook, TikTok ve e-posta hesaplarınızı markalara göre yönetin. Bir kanalın bot, ödeme, katalog ve kurallarına Kanal Merkezi'nden ulaşırsınız.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditBrands && brandEditor.editor.mode === 'closed' && (
            <button type="button" onClick={brandEditor.openNew} className={secondaryButtonClass}>
              <Tags size={13} /> Marka Ekle
            </button>
          )}
          <button type="button" onClick={openCreate} className={primaryButtonClass}>
            <Plus size={13} /> Yeni kanal ekle
          </button>
        </div>
      </div>

      {(error || brandsError) && (
        <div role="alert" className="rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-ui-xs text-[var(--danger)]">
          {error ?? brandsError}
        </div>
      )}

      {brandEditor.editor.mode !== 'closed' && (
        <BrandForm
          key={brandEditor.editor.mode === 'edit' ? brandEditor.editor.brand.id : 'new'}
          initial={brandEditor.editor.mode === 'edit' ? brandEditor.editor.brand : null}
          saving={brandEditor.saving}
          onSave={(body) => void brandEditor.save(body)}
          onCancel={brandEditor.close}
        />
      )}

      {showSkeleton && <ChannelsSkeleton />}

      {isEmpty && (
        <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--border)] p-12 text-center text-ui-xs text-[var(--fg-muted)]">
          <p className="text-ui-md font-semibold text-[var(--fg)]">Henüz bağlı bir kanal bulunmuyor</p>
          <p>İlk WhatsApp numaranızı veya Meta hesabınızı bağlayarak mesajlaşmayı başlatın.</p>
          <button type="button" onClick={openCreate} className={`${primaryButtonClass} mt-4`}>
            <Plus size={13} /> Yeni kanal ekle
          </button>
        </div>
      )}

      {!showSkeleton && sections.map((section) => (
        <BrandSection
          key={section.key}
          brand={section.brand}
          channelCount={section.channels.length}
          canEdit={canEditBrands}
          onEdit={() => section.brand && brandEditor.openEdit(section.brand)}
          onDelete={() => section.brand && void brandEditor.remove(section.brand)}
        >
          {section.channels.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border-soft)] p-4 text-center text-ui-xs text-[var(--fg-muted)]">
              Bu markaya bağlı kanal yok. Yeni kanal eklerken markayı seçebilirsiniz.
            </p>
          ) : (
            // items-start: bir kart uzayınca (ör. geçmiş aktarma sonucu) satırdaki diğer kartlar gerilmesin.
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
              {section.channels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  catalogName={catalogName(c.catalogProfileId)}
                  testing={actions.testingId === c.id}
                  testResult={actions.testResults[c.id] ?? null}
                  onOpenCenter={() => openCenter(c)}
                  onTest={() => void actions.testConnection(c)}
                  onDiagnose={() => setDiagnosisChannel(c)}
                  onToggleActive={() => void actions.toggleActive(c)}
                  onDelete={() => void actions.remove(c)}
                  onOpenTemplates={() => setTemplateChannel(c)}
                />
              ))}
            </div>
          )}
        </BrandSection>
      ))}

      {dialogOpen && (
        <ChannelFormDialog
          brands={brands}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); void reloadAll(); }}
        />
      )}

      {templateChannel && (
        <WhatsAppTemplatesDialog
          channelId={templateChannel.id}
          channelName={templateChannel.displayName}
          onClose={() => setTemplateChannel(null)}
        />
      )}

      {diagnosisChannel && (
        <ChannelDiagnosisDialog
          channelId={diagnosisChannel.id}
          channelName={diagnosisChannel.displayName}
          onClose={() => setDiagnosisChannel(null)}
        />
      )}
    </div>
  );
}
