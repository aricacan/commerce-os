'use client';

import { useState } from 'react';
import { omnichannelApi, type PaymentOptionDto, type PaymentOptionSaveDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { PAYMENT_METHOD_LABELS, paymentOptionDraftFrom, toPaymentOptionSaveDto } from './paymentOptionDraft';

// Ödeme yöntemi yazma işlemleri (kaydet / aç-kapat / sil) ve bildirimleri. Ödeme ekranı ile Kanal Merkezi
// aynı akışı kullanır; `reload` her başarılı yazmadan sonra çağrılır.
export function usePaymentOptionActions(reload: () => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  /** `existing` doluysa günceller, boşsa oluşturur. Başarıyı döner (form kapansın mı?). */
  const save = async (existing: PaymentOptionDto | null, body: PaymentOptionSaveDto): Promise<boolean> => {
    setSaving(true);
    try {
      if (existing) await omnichannelApi.updatePaymentOption(existing.id, body);
      else await omnichannelApi.createPaymentOption(body);
      notify.success('Ödeme yöntemi kaydedildi.');
      await reload();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (option: PaymentOptionDto) => {
    try {
      const toggled = paymentOptionDraftFrom({ ...option, isActive: !option.isActive });
      await omnichannelApi.updatePaymentOption(option.id, toPaymentOptionSaveDto(toggled));
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  /** `scopeDescription`: onay penceresinde hangi kapsamın silineceğini söyleyen kısa metin. */
  const remove = async (option: PaymentOptionDto, scopeDescription: string) => {
    const ok = await confirm({
      title: `${PAYMENT_METHOD_LABELS[option.method]} silinsin mi?`,
      body: scopeDescription,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await omnichannelApi.deletePaymentOption(option.id);
      notify.success('Ödeme yöntemi silindi.');
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return { saving, save, toggle, remove };
}
