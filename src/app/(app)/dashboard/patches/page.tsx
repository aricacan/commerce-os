import { ReleasePatches } from '../../../../components/dashboard/ReleasePatches';

interface PatchesPageProps {
  searchParams: Promise<{ page?: string }>;
}

// Gün gün sürüm güncellemeleri; sayfa numarası adres çubuğundan (?page=2) okunur.
export default async function PatchesPage({ searchParams }: PatchesPageProps) {
  const { page } = await searchParams;

  return <ReleasePatches requestedPage={Number(page ?? 1)} />;
}
