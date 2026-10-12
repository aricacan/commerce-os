# ERP Demo

Backend'siz, sahte verilerle çalışan ERP yönetim paneli demosu (Next.js 16, React 19, TypeScript, Tailwind CSS).

## Çalıştırma

Node.js 20 veya üstü gerekir.

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açıp "Demo hesabıyla giriş yap" butonuna basın.

## Notlar

- Tüm veri kurgusaldır ve tarayıcıda üretilir (`src/lib/demo`); gerçek bir sunucuya bağlanılmaz.
- Kaydetme, silme ve oluşturma gibi işlemler devre dışıdır.
- `.env` dosyası gerekmez.
