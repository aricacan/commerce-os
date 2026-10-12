# ERP Demo

Backend'siz, sahte verilerle çalışan salt-görüntü demo. Tüm veri kurgusaldır; kaydetme/silme gibi işlemler devre dışıdır.

```bash
npm install
npm run dev     # http://localhost:3000 — girişte "Demo versiyondur, devam et"
npm run build && npm start
```

Tüm istekler tarayıcıda cevaplanır (`src/lib/demo`); gerçek bir sunucuya bağlanılmaz.
