import { TrendyolInvoiceUploadDetailPageView } from '../../../../../components/invoicing/TrendyolInvoiceUploadDetailPageView';

export default async function TrendyolInvoiceUploadDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  return <TrendyolInvoiceUploadDetailPageView batchId={batchId} />;
}
