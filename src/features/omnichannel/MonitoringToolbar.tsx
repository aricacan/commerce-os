import { AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { focusRing, motionFast } from '../shared/design';
import { MONITORING_MAX_DAYS, type MonitoringRangeValue } from './monitoringRules';

interface Props {
  range: MonitoringRangeValue;
  onRangeChange: (patch: Partial<MonitoringRangeValue>) => void;
  onRefresh: () => void;
  refreshing: boolean;
  // Seçilen aralık üst sınırı aşıyor: sunucu son MONITORING_MAX_DAYS güne kırpar.
  overLimit: boolean;
  // Seçim çözülemedi (ör. özel aralıkta yalnız bir uç seçili).
  invalid: boolean;
}

// İzleme başlığı: ortak tarih aralığı seçici + yenile; aralık sınırı ve geçersiz seçim uyarıları.
export function MonitoringToolbar({ range, onRangeChange, onRefresh, refreshing, overLimit, invalid }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-fg-muted" aria-hidden />
          <h2 className="m-0 text-ui-md font-bold text-fg">Bot ve kanal izleme</h2>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={range.preset}
            onChange={(preset) => onRangeChange({ preset })}
            customFrom={range.customFrom}
            customTo={range.customTo}
            onCustomChange={(customFrom, customTo) => onRangeChange({ preset: 'custom', customFrom, customTo })}
          />
          <button
            type="button" onClick={onRefresh} aria-label="Yenile"
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border text-fg-muted hover:bg-bg-subtle hover:text-fg ${focusRing} ${motionFast}`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden />
          </button>
        </div>
      </div>
      {overLimit && (
        <p role="status" className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-ui-xs text-warning">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          Seçtiğin aralık {MONITORING_MAX_DAYS} günden uzun: sorgu maliyeti yüzünden yalnızca bitiş tarihine en yakın {MONITORING_MAX_DAYS} gün gösterilir.
        </p>
      )}
      {invalid && (
        <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-ui-xs text-danger">
          Geçerli bir tarih aralığı seç.
        </p>
      )}
    </div>
  );
}
