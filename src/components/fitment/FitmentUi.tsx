import type { ReactNode } from 'react';
import type { TranslationKey } from '../../lib/translations/tr';

export const ROW_STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  Unmatched: 'fitment_status_unmatched',
  Matched: 'fitment_status_matched',
  Approved: 'fitment_status_approved',
  Rejected: 'fitment_status_rejected',
};

export const EDIT_FIELD_KEYS: Record<'category' | 'brand' | 'model' | 'year', TranslationKey> = {
  category: 'fitment_field_category',
  brand: 'fitment_field_brand',
  model: 'fitment_field_model',
  year: 'fitment_field_year',
};

export function formatVehicle(vehicle: { vehicleMake: string; vehicleModel: string | null; startYear: number | null; endYear: number | null }) {
  const years = vehicle.startYear ? ` ${vehicle.startYear}${vehicle.endYear ? `-${vehicle.endYear}` : '+'}` : '';
  return `${vehicle.vehicleMake}${vehicle.vehicleModel ? ` (${vehicle.vehicleModel})` : ''}${years}`;
}

export function FitmentIconButton({
  icon,
  color,
  onClick,
  disabled,
  title,
}: {
  icon: ReactNode;
  color?: string;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ color }}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] transition hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
