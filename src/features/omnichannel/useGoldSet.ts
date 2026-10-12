'use client';

import { useCallback, useEffect, useState } from 'react';
import { goldApi, type GoldRunSummaryDto, type GoldScenarioDto } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';

// Altın Set sekmesinin verisi: senaryolar ve koşu geçmişi (P35). Aç/kapat ve silme burada, koşturma
// ayrı kanca (useGoldRunner) — biri diğerinin yükleme durumunu bozmasın.
export function useGoldSet() {
  const [scenarios, setScenarios] = useState<GoldScenarioDto[]>([]);
  const [runs, setRuns] = useState<GoldRunSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [loadedScenarios, loadedRuns] = await Promise.all([goldApi.getScenarios(), goldApi.getRuns()]);
      setScenarios(loadedScenarios);
      setRuns(loadedRuns);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const toggleActive = useCallback(async (scenario: GoldScenarioDto) => {
    const updated = await goldApi.setScenarioActive(scenario.id, !scenario.isActive);
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const remove = useCallback(async (scenario: GoldScenarioDto) => {
    await goldApi.deleteScenario(scenario.id);
    setScenarios((prev) => prev.filter((s) => s.id !== scenario.id));
  }, []);

  return { scenarios, runs, loading, error, reload, toggleActive, remove };
}
