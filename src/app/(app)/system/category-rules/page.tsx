import { redirect } from 'next/navigation';

// Eski rota — Kategori Kurallari sekmesi kendi URL'ine tasindi.
export default function LegacyCategoryRulesRedirect() {
  redirect('/products/categories/rules');
}
