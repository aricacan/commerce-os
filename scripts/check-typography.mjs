#!/usr/bin/env node
// Elle yazılmış font boyutu / ağırlığı sayar ve dosya bazında raporlar.
//
// NEDEN: tipografi ölçeği (globals.css, --text-ui-*) tek seferde uygulanamaz — arayüzde
// binlerce elle yazılmış bildirim var ve hepsini bir commit'te değiştirmek gözden
// geçirilemez bir diff üretir. Geçiş modül modül yapılıyor; bu betik "ne kadar kaldı"
// sorusunu ÖLÇÜLEBİLİR tutuyor, tahmine bırakmıyor.
//
// Kullanım:
//   node scripts/check-typography.mjs           → özet + en kötü 20 dosya
//   node scripts/check-typography.mjs --all      → bütün dosyalar

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const showAll = process.argv.includes('--all');

// Satır içi stil (fontSize: 12), Tailwind arbitrary değer (text-[10.5px]) ve ağırlık.
const PATTERNS = [
  { key: 'fontSize', re: /fontSize:\s*[0-9.]+/g },
  { key: 'text-[Npx]', re: /text-\[[0-9.]+px\]/g },
  { key: 'fontWeight', re: /fontWeight:\s*[0-9]+/g },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const rows = [];
const totals = Object.fromEntries(PATTERNS.map((p) => [p.key, 0]));
const distinctSizes = new Set();

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  let fileTotal = 0;

  for (const { key, re } of PATTERNS) {
    const matches = source.match(re) ?? [];
    totals[key] += matches.length;
    fileTotal += matches.length;

    if (key !== 'fontWeight') {
      for (const match of matches) {
        const size = match.match(/[0-9.]+/)?.[0];
        if (size) distinctSizes.add(Number(size));
      }
    }
  }

  if (fileTotal > 0) rows.push({ path: relative(SRC, file).replace(/\\/g, '/'), count: fileTotal });
}

rows.sort((a, b) => b.count - a.count);
const grandTotal = Object.values(totals).reduce((sum, n) => sum + n, 0);

console.log('Elle yazilmis tipografi bildirimi:');
for (const { key } of PATTERNS) console.log(`  ${key.padEnd(12)} ${totals[key]}`);
console.log(`  ${'TOPLAM'.padEnd(12)} ${grandTotal}`);
console.log(`\nFarkli font boyutu sayisi: ${distinctSizes.size}`);
console.log(`  ${[...distinctSizes].sort((a, b) => a - b).join(', ')}`);
console.log('\nHedef olcek (globals.css): 10, 11, 12, 13.5, 16, 20, 28 — 7 basamak.\n');

const shown = showAll ? rows : rows.slice(0, 20);
console.log(showAll ? `${rows.length} dosya:` : `En yogun ${shown.length} dosya:`);
for (const { path, count } of shown) console.log(`${String(count).padStart(5)}  ${path}`);
