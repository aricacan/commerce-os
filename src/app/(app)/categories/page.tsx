import { redirect } from 'next/navigation';

// Eski rota — kategoriler /products/categories/* altina tasindi (her sekme kendi URL'inde).
export default function LegacyCategoriesRedirect() {
  redirect('/products/categories/catalog');
}
