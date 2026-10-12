'use client';

import { useState } from 'react';
import {
  omnichannelOrderDestinationsApi, type OrderDestinationOptionDto, type OrderDestinationRuleSaveDto,
} from '../../lib/api/omnichannel-order-destinations';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { saveConfirmText } from './orderDestinationRules';

// Sipariş hedefi yazma işlemleri (kaydet / sil) ve bildirimleri. Kayıt canlı siparişlerin gideceği yeri
// değiştirdiği için önce onay istenir; Kanal Merkezi ve Hesap geneli aynı akışı kullanır.
export function useOrderDestinationActions(reload: () => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  /** `existingId` doluysa günceller, boşsa oluşturur. Başarıyı döner (form kapansın mı?). */
  const save = async (
    existingId: number | null, body: OrderDestinationRuleSaveDto, option: OrderDestinationOptionDto,
  ): Promise<boolean> => {
    const ok = await confirm({
      title: 'Sipariş hedefi kaydedilsin mi?',
      body: saveConfirmText(option),
      confirmLabel: 'Kaydet',
    });
    if (!ok) return false;

    setSaving(true);
    try {
      if (existingId !== null) await omnichannelOrderDestinationsApi.update(existingId, body);
      else await omnichannelOrderDestinationsApi.create(body);
      notify.success('Sipariş hedefi kaydedildi.');
      await reload();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** `consequence`: onay penceresinde silmenin sonucunu söyleyen kısa metin. */
  const remove = async (id: number, consequence: string): Promise<boolean> => {
    const ok = await confirm({ title: 'Hedef kuralı silinsin mi?', body: consequence, confirmLabel: 'Sil', danger: true });
    if (!ok) return false;
    try {
      await omnichannelOrderDestinationsApi.remove(id);
      notify.success('Hedef kuralı silindi.');
      await reload();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    }
  };

  return { saving, save, remove };
}
