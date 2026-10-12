'use client';

import { use } from 'react';
import { ProductDetailPage } from '../../../../features/products/ProductDetailPage';

export default function ProductDetailRoute({ params }: { params: Promise<{ sku: string }> }) {
  const resolvedParams = use(params);
  const sku = decodeURIComponent(resolvedParams.sku);
  return <ProductDetailPage sku={sku} />;
}
