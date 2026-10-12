// Test koşusu (backend + frontend) özetini BusinessEventLog.payloadJson'dan çözer.
// payloadJson backend'de System.Text.Json varsayılanıyla (PascalCase) yazılır; olası casing
// farkına karşı alanlar büyük/küçük harf DUYARSIZ okunur (kırılgan nokta — bu yüzden ayrı test).

export interface ParsedSuite {
  name: string; total: number; passed: number; failed: number; durationMs: number;
}
export interface ParsedRun {
  total: number; passed: number; failed: number; durationMs: number;
  finishedAtUtc: string | null; suites: ParsedSuite[];
}

function ci(o: Record<string, unknown>, key: string): unknown {
  const found = Object.keys(o).find((k) => k.toLowerCase() === key.toLowerCase());
  return found !== undefined ? o[found] : undefined;
}

function toNum(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

export function parseRun(payloadJson: string | null | undefined): ParsedRun | null {
  if (!payloadJson) return null;
  try {
    const raw = JSON.parse(payloadJson) as Record<string, unknown>;
    const suitesRaw = ci(raw, 'suites');
    const suites: ParsedSuite[] = Array.isArray(suitesRaw)
      ? suitesRaw.map((s) => {
          const so = s as Record<string, unknown>;
          return {
            name: String(ci(so, 'name') ?? '—'),
            total: toNum(ci(so, 'total')),
            passed: toNum(ci(so, 'passed')),
            failed: toNum(ci(so, 'failed')),
            durationMs: toNum(ci(so, 'durationMs')),
          };
        })
      : [];
    return {
      total: toNum(ci(raw, 'total')),
      passed: toNum(ci(raw, 'passed')),
      failed: toNum(ci(raw, 'failed')),
      durationMs: toNum(ci(raw, 'durationMs')),
      finishedAtUtc: (ci(raw, 'finishedAtUtc') as string) ?? null,
      suites,
    };
  } catch {
    return null;
  }
}
