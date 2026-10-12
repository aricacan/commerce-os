import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ERP',
  description: 'ERP Dashboard',
  manifest: '/manifest.json',
  // Sekme faviconu → kullanıcının koyduğu StoreB emblemi (public/favicon.png, 96x96).
  // app/favicon.ico konvansiyonu kaldırıldığından metadata.icons deterministik olarak bunu kullanır.
  // apple-touch-icon AYRI: iOS'ta ana ekrana eklenen ikon odur ve 180x180 olmak
  // ZORUNDA (96'lık favicon orada bulanık çıkar), o yüzden üretilmiş sete bakar.
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'StoreB' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ef4444" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
