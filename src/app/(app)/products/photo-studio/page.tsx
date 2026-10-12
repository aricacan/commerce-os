'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductsPhotoStudioRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/photo-studio');
  }, [router]);

  return null;
}
