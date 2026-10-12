import { redirect } from 'next/navigation';

// Eski rota — panel /trendyol/uploads adresine tasindi (bkz. nav-groups.ts).
export default function LegacyTrendyolUploadRedirect() {
  redirect('/trendyol/uploads');
}
