'use client';

import { useState } from 'react';
import { omnichannelApi, type BrandDto, type BrandSaveDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Editör durumu: kapalı, yeni marka ya da mevcut bir markanın düzenlenmesi.
export type BrandEditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; brand: BrandDto };

// Marka ekle/düzenle/sil akışı. Marka değişince kanal kartlarındaki marka adı da yenilensin diye
// üst bileşen iki listeyi birden yükler (`onChanged`).
export function useBrandEditor(onChanged: () => Promise<void>) {
  const [editor, setEditor] = useState<BrandEditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const save = async (body: BrandSaveDto) => {
    setSaving(true);
    try {
      if (editor.mode === 'edit') await omnichannelApi.updateBrand(editor.brand.id, body);
      else await omnichannelApi.createBrand(body);
      notify.success(`${body.name} kaydedildi.`);
      setEditor({ mode: 'closed' });
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (brand: BrandDto) => {
    const ok = await confirm({
      title: `"${brand.name}" markası silinsin mi?`,
      body: 'Kanallar silinmez, markasız kalır.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await omnichannelApi.deleteBrand(brand.id);
      notify.success('Marka silindi.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return {
    editor,
    saving,
    openNew: () => setEditor({ mode: 'new' }),
    openEdit: (brand: BrandDto) => setEditor({ mode: 'edit', brand }),
    close: () => setEditor({ mode: 'closed' }),
    save,
    remove,
  };
}
