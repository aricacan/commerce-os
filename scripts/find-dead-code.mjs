#!/usr/bin/env node
// Import edilmeyen kaynak dosyaları bulur.
//
// NEDEN ELDE YAZILDI: repoda knip/ts-prune gibi bir araç yok ve tek bir ölü-kod taraması
// için yeni bir bağımlılık + lockfile değişikliği getirmek istenmedi. Bu betik aynı işin
// dar ama yeterli bir versiyonunu yapar: tüm import/dynamic-import belirteçlerini toplar,
// sonra hiçbirinde adı geçmeyen dosyaları listeler.
//
// SINIRLARI (bilerek): yalnızca DOSYA seviyesinde çalışır, kullanılmayan tek tek export'ları
// bulmaz. Barrel (index.ts) üzerinden dolaylı kullanımı yakalayamaz. Bu yüzden çıktısı bir
// KARAR değil, bir ADAY LİSTESİDİR — silmeden önce her dosya elle doğrulanmalı.
//
// Kullanım: node scripts/find-dead-code.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, basename, extname } from 'node:path';

// fileURLToPath: yol icinde bosluk/Turkce karakter varsa URL.pathname yuzde-kodlu
// doner ve fs onu bulamaz (Windows'ta "Demo Oto" tam olarak bunu tetikliyor).
const SRC = fileURLToPath(new URL('../src/', import.meta.url));

// Rota dosyaları Next.js tarafından dosya sistemine göre yüklenir; hiçbir yerden
// import edilmezler ve ölü değildirler.
const ENTRY_POINT_NAMES = new Set([
  'page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx',
  'global-error.tsx', 'template.tsx', 'route.ts', 'default.tsx',
  'middleware.ts', 'instrumentation.ts',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC);

// Tüm import belirteçlerinin son parçası ("../../lib/api/orders" → "orders").
const imported = new Set();
const IMPORT_PATTERN = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1];
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
    imported.add(basename(specifier).replace(/\.(ts|tsx|js|jsx)$/, ''));
  }
}

const candidates = files
  .filter((file) => {
    const name = basename(file);
    if (ENTRY_POINT_NAMES.has(name)) return false;
    if (/\.(test|spec)\.(ts|tsx)$/.test(name)) return false;

    // Ambient modul genisletmeleri (declare module ...) hicbir yerden import EDILMEZ
    // ama TypeScript tarafindan otomatik yuklenir — olu degildirler.
    const source = readFileSync(file, 'utf8');
    if (/^\s*declare\s+(module|global)\s/m.test(source)) return false;

    return !imported.has(name.replace(extname(name), ''));
  })
  .map((file) => ({
    path: relative(SRC, file).replace(/\\/g, '/'),
    lines: readFileSync(file, 'utf8').split('\n').length,
  }))
  .sort((a, b) => b.lines - a.lines);

if (candidates.length === 0) {
  console.log('Import edilmeyen dosya bulunamadi.');
  process.exit(0);
}

const total = candidates.reduce((sum, c) => sum + c.lines, 0);
console.log(`${candidates.length} aday dosya, toplam ${total} satir:\n`);
for (const { path, lines } of candidates) {
  console.log(`${String(lines).padStart(5)}  ${path}`);
}
console.log('\nBunlar ADAYDIR, karar degil — silmeden once her birini elle dogrulayin.');
