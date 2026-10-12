import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const nextDir = join(process.cwd(), '.next');
const manifestRoot = join(nextDir, 'server', 'app');
const targetKb = Number(process.env.BUNDLE_TARGET_KB ?? 250);
const internalTargetKb = Number(process.env.BUNDLE_INTERNAL_TARGET_KB ?? 220);

if (!Number.isFinite(targetKb) || !Number.isFinite(internalTargetKb) || internalTargetKb > targetKb) {
  console.error('Bundle hedefleri geçersiz. İç hedef, zorunlu hedeften büyük olamaz.');
  process.exit(1);
}

if (!existsSync(manifestRoot)) {
  console.error('Bundle manifest bulunamadı. Önce `npm run build` çalıştırın.');
  process.exit(1);
}

function findManifests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return findManifests(fullPath);
    return entry.name.endsWith('client-reference-manifest.js') ? [fullPath] : [];
  });
}

function readManifest(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const assignmentIndex = source.lastIndexOf(' = ');
  if (assignmentIndex < 0) return null;
  return JSON.parse(source.slice(assignmentIndex + 3).replace(/;\s*$/, ''));
}

const rows = findManifests(manifestRoot).flatMap((manifestPath) => {
  const manifest = readManifest(manifestPath);
  if (!manifest?.entryJSFiles) return [];
  const entries = Object.values(manifest.entryJSFiles);
  const files = [...new Set(entries.at(-1) ?? [])];
  const gzipBytes = files.reduce((total, file) => {
    const chunkPath = join(nextDir, file);
    return existsSync(chunkPath) ? total + gzipSync(readFileSync(chunkPath)).byteLength : total;
  }, 0);
  const route = relative(manifestRoot, manifestPath)
    .split(sep).join('/')
    .replace('/page_client-reference-manifest.js', '')
    .replace('page_client-reference-manifest.js', '/');
  return [{ route, gzipKb: Math.round((gzipBytes / 1024) * 10) / 10 }];
}).sort((left, right) => right.gzipKb - left.gzipKb);

console.table(rows.slice(0, 20));
const overTarget = rows.filter((row) => row.gzipKb > targetKb);
const overInternalTarget = rows.filter((row) => row.gzipKb > internalTargetKb);
console.log(`Zorunlu hedef: ${targetKb} KB gzip`);
console.log(`${overTarget.length}/${rows.length} route hedefin üzerinde.`);

console.log(`İç güvenlik hedefi: ${internalTargetKb} KB gzip`);
console.log(`${overInternalTarget.length}/${rows.length} route iç hedefin üzerinde.`);

if (overInternalTarget.length > 0) {
  console.warn(`İç hedef uyarısı: ${overInternalTarget.map((row) => `${row.route}=${row.gzipKb}KB`).join(', ')}`);
}

if (overTarget.length > 0) {
  console.error(`Bundle bütçesi aşıldı: ${overTarget.map((row) => `${row.route}=${row.gzipKb}KB`).join(', ')}`);
  process.exit(1);
}
