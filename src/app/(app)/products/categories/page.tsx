import { redirect } from 'next/navigation';

// Kategoriler kok rotasi — varsayilan sekme katalog.
export default function CategoriesIndexPage() {
  redirect('/products/categories/catalog');
}
