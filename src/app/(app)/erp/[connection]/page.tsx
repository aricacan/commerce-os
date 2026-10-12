import { IntegrationConnectionDetailView } from '../../../../features/system/IntegrationConnectionDetailView';

export default async function ErpConnectionPage({ params }: { params: Promise<{ connection: string }> }) {
  const { connection } = await params;
  return <IntegrationConnectionDetailView kind={0} slug={connection} />;
}
