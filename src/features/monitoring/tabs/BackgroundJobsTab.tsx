'use client';

import { useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { hangfireRunDetailsPath } from '../../../lib/api';
import { useMobile } from '../../../hooks/useMobile';
import { useOpenHangfireDashboard } from '../../../hooks/hangfire/useOpenHangfireDashboard';
import { useHangfireAccess, useRefreshHangfirePanel } from '../../../hooks/hangfire/useHangfirePanel';
import { HangfireJobsTab } from '../hangfire/HangfireJobsTab';
import { HangfireRuntimeTab } from '../hangfire/HangfireRuntimeTab';

export type BackgroundJobsView = 'jobs' | 'runtime';

// Arka plan işleri (Hangfire) — eski ayrı "Hangfire" modülü, 7 Eki 2026'da Sistem İzleme'nin
// Operasyon grubuna taşındı. İki görünüm: zamanlanmış iş listesi ve şu an çalışanlar.
export function BackgroundJobsTab({ view }: { view: BackgroundJobsView }) {
  const isMobile = useMobile();
  const refreshAll = useRefreshHangfirePanel();
  const { open: openDashboard, isOpening } = useOpenHangfireDashboard();

  // Tetikleme, yeniden deneme ve gömülü Hangfire paneli yalnız kurulumun sahibi şirketin
  // SuperAdmin'ine açık. Rol tek başına yetmez (her kiracının kendi SuperAdmin'i var); karar
  // sunucuda verilir, ekran yalnız cevabı uygular.
  const canOperate = useHangfireAccess();
  const openRun = useCallback(
    (hangfireJobId: string) => openDashboard(hangfireRunDetailsPath(hangfireJobId)),
    [openDashboard],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canOperate && (
          <Button variant="secondary" size="sm" icon={<ExternalLink size={13} />} loading={isOpening} onClick={() => openDashboard()}>
            Hangfire&apos;da aç
          </Button>
        )}
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={refreshAll}>
          Yenile
        </Button>
      </div>

      {view === 'jobs'
        ? <HangfireJobsTab isMobile={isMobile} canOperate={canOperate} onOpenRun={openRun} />
        : <HangfireRuntimeTab canOperate={canOperate} onOpenRun={openRun} />}
    </div>
  );
}
