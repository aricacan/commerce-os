import type { MetaPermissionProbeCallDto, MetaPermissionProbeOutcome } from '../../lib/api/omnichannel-maintenance';

const OUTCOME_MARK: Record<MetaPermissionProbeOutcome, string> = {
  Success: '✓',
  Failed: '✗',
  Skipped: '–',
};

// Kanal satırındaki tek çağrı: "✓ GET /{page-id}/feed (3 öğe)", "✗ ... — (#200) ... (kod 200)", "– ... — atlandı nedeni".
// Yeni alanlar eski backend'de olmayabilir; itemCount/error yoksa o parça yazılmaz.
export function probeCallText(call: MetaPermissionProbeCallDto): string {
  const count = call.itemCount != null ? ` (${call.itemCount} öğe)` : '';
  const reason = call.error ? ` — ${call.error}` : '';
  return `${OUTCOME_MARK[call.outcome]} ${call.call}${count}${reason}`;
}
