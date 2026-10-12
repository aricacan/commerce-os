import { IntegrationConnectionDetailView } from '../../../../features/system/IntegrationConnectionDetailView';

export default async function MarketplaceConnectionPage({ params }: { params: Promise<{ connection: string }> }) {
  const { connection } = await params;
  return <IntegrationConnectionDetailView kind={1} slug={connection} />;
}
