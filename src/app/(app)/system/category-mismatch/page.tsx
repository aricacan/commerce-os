import { redirect } from 'next/navigation';

// Eski rota — Uyusmazliklar sekmesi kendi URL'ine tasindi.
export default function LegacyCategoryMismatchRedirect() {
  redirect('/products/categories/mismatches');
}
