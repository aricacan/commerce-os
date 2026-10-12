'use client';

import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  oldOrdersApi,
  type OldOrderBucket,
  type OldOrderPreview,
} from '@/lib/api/orderStatuses';
import {
  AUTO_COMPLETE_DISABLED,
  OLD_ORDER_DEFAULT_DAYS,
  OLD_ORDER_MIN_DAYS,
  autoCompleteLabel,
  parseDays,
} from './oldOrderCompletion';

const INPUT_CLASS =
  'w-24 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--border)]';

function BucketList({ title, buckets }: { title: string; buckets: OldOrderBucket[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[var(--fg-muted)]">{title}</span>
      {buckets.map((bucket) => (
        <div key={bucket.label} className="flex items-center justify-between gap-3 text-xs text-[var(--fg)]">
          <span>{bucket.label}</span>
          <span className="font-mono text-[var(--fg-muted)]">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ preview }: { preview: OldOrderPreview }) {
  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
      <p className="text-xs text-[var(--fg)]">
        <span className="font-bold">{preview.eligibleCount}</span> sipariş tamamlanacak
        {preview.eligibleCount > 0 && preview.oldestOrderDate && preview.newestOrderDate && (
          <span className="text-[var(--fg-muted)]">
            {' '}({new Date(preview.oldestOrderDate).toLocaleDateString('tr-TR')} –{' '}
            {new Date(preview.newestOrderDate).toLocaleDateString('tr-TR')})
          </span>
        )}
      </p>
      {preview.skippedManualCount > 0 && (
        <p className="text-[11px] text-[var(--fg-muted)]">
          {preview.skippedManualCount} sipariş elle yönetildiği için atlanır.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BucketList title="Mağaza" buckets={preview.byStore} />
        <BucketList title="Platform" buckets={preview.byPlatform} />
        <BucketList title="Mevcut durum" buckets={preview.byStatus} />
      </div>
    </div>
  );
}

export function OldOrderCompletionCard() {
  const [daysInput, setDaysInput] = useState(String(OLD_ORDER_DEFAULT_DAYS));
  const [preview, setPreview] = useState<OldOrderPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoDays, setAutoDays] = useState(AUTO_COMPLETE_DISABLED);

  const days = parseDays(daysInput);

  useEffect(() => {
    oldOrdersApi
      .getAutoComplete()
      .then((setting) => setAutoDays(setting.days))
      .catch(() => setError('Otomatik tamamlama ayarı yüklenemedi.'));
  }, []);

  async function loadPreview() {
    if (days === null) return;
    setError(null);
    setMessage(null);
    try {
      setPreview(await oldOrdersApi.preview(days));
    } catch {
      setError('Önizleme alınamadı.');
    }
  }

  async function complete() {
    if (!preview) return;
    setConfirmOpen(false);
    try {
      const result = await oldOrdersApi.complete(preview.days, preview.eligibleCount);
      setMessage(`${result.completedCount} sipariş tamamlandı.`);
      setPreview(null);
    } catch {
      setError('Tamamlanamadı. Sayı değişmiş olabilir; önizlemeyi yenileyin.');
    }
  }

  async function toggleAuto() {
    const next = autoDays === AUTO_COMPLETE_DISABLED ? days : AUTO_COMPLETE_DISABLED;
    if (next === null) return;
    try {
      await oldOrdersApi.setAutoComplete(next);
      setAutoDays(next);
    } catch {
      setError('Otomatik tamamlama ayarı kaydedilemedi.');
    }
  }

  return (
    <div
      data-tour="order-statuses-old-orders"
      className="flex max-w-4xl flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4"
    >
      <div className="flex items-center gap-2">
        <Archive size={14} className="text-[var(--fg-muted)]" />
        <h2 className="text-xs font-bold text-[var(--fg)]">Eski siparişleri tamamla</h2>
      </div>
      <p className="text-[11px] text-[var(--fg-muted)]">
        Belirtilen günden eski açık siparişler &quot;Tamamlandı&quot; olur (kapalı sayılır) ve
        bekleyen işlerde görünmez. İptal ve iade siparişleri ile elle yönetilenler değişmez.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={OLD_ORDER_MIN_DAYS}
          value={daysInput}
          onChange={(event) => setDaysInput(event.target.value)}
          aria-label="Gün sayısı"
          className={INPUT_CLASS}
        />
        <span className="text-xs text-[var(--fg-muted)]">günden eski (en az {OLD_ORDER_MIN_DAYS})</span>
        <Button variant="secondary" size="sm" disabled={days === null} onClick={loadPreview}>
          Önizle
        </Button>
      </div>

      {preview && <PreviewTable preview={preview} />}
      {preview && preview.eligibleCount > 0 && (
        <div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            Tamamlandı yap
          </Button>
        </div>
      )}

      {message && <p className="text-xs font-semibold text-emerald-600">{message}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] pt-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--fg)]">Otomatik tamamlama</span>
          <span className="text-[11px] text-[var(--fg-muted)]">{autoCompleteLabel(autoDays)}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={autoDays === AUTO_COMPLETE_DISABLED && days === null}
          onClick={toggleAuto}
        >
          {autoDays === AUTO_COMPLETE_DISABLED ? `${days ?? OLD_ORDER_DEFAULT_DAYS} gün ile aç` : 'Kapat'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eski siparişler tamamlansın mı?"
        description={`${preview?.eligibleCount ?? 0} sipariş tamamlanacak. Bu işlem geri alınamaz.`}
        confirmLabel="Tamamlandı yap"
        onConfirm={() => void complete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
