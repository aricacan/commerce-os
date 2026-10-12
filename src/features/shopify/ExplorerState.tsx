'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { explorerErrorText } from './explorerRules';

interface Props {
  loading: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry: () => void;
  children: ReactNode;
}

const SKELETON_ROWS = 8;
const SKELETON_ROW_HEIGHT = 48;

// Liste durumları: yükleniyor iskeleti → hata (yeniden dene) → boş durum → içerik. Hata ASLA boş liste gibi görünmez.
export function ExplorerState({ loading, error, isEmpty, emptyTitle, emptyDescription, onRetry, children }: Props) {
  if (loading) return <SkeletonList count={SKELETON_ROWS} rowHeight={SKELETON_ROW_HEIGHT} />;
  if (error) {
    return <ErrorState title="Shopify verisi alınamadı" description={explorerErrorText(error)} onRetry={onRetry} />;
  }
  if (isEmpty) return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}
