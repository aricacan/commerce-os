'use client';

import { useMemo } from 'react';
import { customerCrmApi, type InterestStatus } from '../../lib/api/customer-crm';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, type CustomerSectionProps } from './CustomerPanelParts';
import { CustomerInterestRow } from './CustomerInterestRow';
import { sortInterests } from './customerInterestRules';

interface Props extends CustomerSectionProps {
  onOpenConversation?: (conversationId: number) => void;
}

// Müşterinin sorduğu ürünler. Bot durumu kendisi ilerletir (sordu → fiyat → sipariş); temsilci
// "Kayıp" gibi kararı elle verir. Açık ilgiler üstte durur.
export function CustomerInterestsSection({ profile, readOnly, onChanged, onOpenConversation }: Props) {
  const { notify } = useFeedback();
  const interests = useMemo(() => sortInterests(profile.interests), [profile.interests]);

  const changeStatus = async (interestId: number, status: InterestStatus) => {
    try {
      await customerCrmApi.updateInterest(profile.id, interestId, status);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <PanelSection title="İlgilendiği ürünler" count={interests.length}>
      {interests.length === 0 && (
        <EmptyLine>Henüz ürün sorulmadı. Müşteri bir ürün sorunca bot buraya ekler.</EmptyLine>
      )}
      <ul className="flex flex-col gap-2">
        {interests.map((interest) => (
          <CustomerInterestRow key={interest.id} interest={interest} readOnly={readOnly}
            onStatusChange={(status) => void changeStatus(interest.id, status)}
            onOpenConversation={onOpenConversation} />
        ))}
      </ul>
    </PanelSection>
  );
}
