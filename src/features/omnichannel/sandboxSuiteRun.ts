import type { BotTestCaseResultDto, BotTestRunDto, BotTestScenarioDto } from '../../lib/api/omnichannel';

export type SandboxSuite = 'smoke' | 'full';

// Paket senaryo senaryo koşturulur: 30 senaryoyu tek istekte çalıştırmak canlıda vekil
// sunucuda kesiliyordu (26 Eyl 2026: önce 180 sn zaman aşımı, sonra "sunucuya ulaşılamadı").
export function scenariosOf(scenarios: readonly BotTestScenarioDto[], suite: SandboxSuite): BotTestScenarioDto[] {
  return suite === 'full' ? [...scenarios] : scenarios.filter((s) => s.suite === suite);
}

// Tek senaryonun sonucu çağrı hatasıyla gelmezse başarısız satır olarak gösterilir —
// paketin geri kalanı çalışmaya devam eder.
export function failedResult(scenario: BotTestScenarioDto, reason: string): BotTestCaseResultDto {
  return {
    scenarioId: scenario.id, name: scenario.name, passed: false,
    expected: scenario.expected, actual: `Hata: ${reason}`, durationMs: 0,
  };
}

export function summarizeRun(
  suite: SandboxSuite, results: readonly BotTestCaseResultDto[], durationMs: number,
): BotTestRunDto {
  const passed = results.filter((r) => r.passed).length;
  return {
    suite, total: results.length, passed, failed: results.length - passed, durationMs, results: [...results],
  };
}
