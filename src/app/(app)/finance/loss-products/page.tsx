import { redirect } from 'next/navigation';

// Eski rota — panel Analizler grubuna tasindi (/loss-products), bkz. nav-groups.ts.
export default function LegacyLossProductsRedirect() {
  redirect('/loss-products');
}
