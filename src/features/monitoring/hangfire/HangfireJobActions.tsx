import { ExternalLink, History, Play } from 'lucide-react';
import type { HangfireJobInfoDto } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

interface Props {
  job: HangfireJobInfoDto;
  /** SuperAdmin: tetikleme ve gömülü panele geçiş. */
  canOperate: boolean;
  isTriggering: boolean;
  onHistory: (job: HangfireJobInfoDto) => void;
  onTrigger: (job: HangfireJobInfoDto) => void;
  onOpenRun: (hangfireJobId: string) => void;
}

export function HangfireJobActions({ job, canOperate, isTriggering, onHistory, onTrigger, onOpenRun }: Props) {
  const lastRunId = job.lastRun?.hangfireJobId;
  // Alan yoksa (eski backend) kayıtlı varsayılır — backend yine de kayıtsızı 409 ile reddeder.
  const isRegistered = job.isRegistered !== false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" icon={<History size={13} />} onClick={() => onHistory(job)}>
        Geçmiş
      </Button>
      {canOperate && lastRunId && (
        <Button variant="ghost" size="sm" icon={<ExternalLink size={13} />} onClick={() => onOpenRun(lastRunId)}>
          Hangfire&apos;da aç
        </Button>
      )}
      {canOperate && (
        <Button
          variant="primary"
          size="sm"
          icon={<Play size={13} />}
          loading={isTriggering}
          disabled={!isRegistered}
          onClick={() => onTrigger(job)}
        >
          {isRegistered ? 'Çalıştır' : 'Kapalı'}
        </Button>
      )}
    </div>
  );
}
