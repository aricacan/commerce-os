import { redirect } from 'next/navigation';

// "/" → "/dashboard" yönlendir (route group çakışmasını önler)
export default function RootPage() {
  redirect('/dashboard');
}
