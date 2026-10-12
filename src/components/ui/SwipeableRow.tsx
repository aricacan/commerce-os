'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { haptic } from '../../lib/haptics';
import { useMobile } from '../../hooks/useMobile';

// Liste satırını yana kaydırınca aksiyon (iOS Mail modeli).
//
// Tasarım kararı: aksiyon eşiği geçilince BIRAKILDIĞINDA çalışır, satır açık kalmaz.
// Yarı açık satır bırakmak, kullanıcı listeyi kaydırdığında "takılmış" hissi veriyor
// ve hangi satırın açık olduğunu takip etmeyi gerektiriyor.
//
// Yıkıcı aksiyonlar için `destructive` işaretle — o zaman eşik daha uzun olur ki
// kazara silme olmasın.

const THRESHOLD_PX = 80;
const DESTRUCTIVE_THRESHOLD_PX = 140;
const MAX_TRANSLATE_PX = 160;
const VERTICAL_TOLERANCE_PX = 12;   // Bu kadar dikey hareketten sonrası kaydırma sayılır

export interface SwipeAction {
  label: string;
  Icon: LucideIcon;
  onAction: () => void;
  /** Silme gibi geri dönüşü zor işlemler — daha uzun kaydırma ister. */
  destructive?: boolean;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Sola kaydırınca sağdan beliren aksiyon. */
  left?: SwipeAction;
  /** Sağa kaydırınca soldan beliren aksiyon. */
  right?: SwipeAction;
}

export function SwipeableRow({ children, left, right }: SwipeableRowProps) {
  const isMobile = useMobile();
  const [dx, setDx] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const passedRef = useRef(false);

  // Masaüstünde jest yok — orada satır menüleri ve butonlar zaten var.
  if (!isMobile || (!left && !right)) return <>{children}</>;

  const action = dx < 0 ? left : right;
  const threshold = action?.destructive ? DESTRUCTIVE_THRESHOLD_PX : THRESHOLD_PX;
  const passed = Math.abs(dx) >= threshold;

  function onTouchStart(e: React.TouchEvent) {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lockedRef.current = null;
    passedRef.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    const start = startRef.current;
    if (!start) return;

    const deltaX = e.touches[0].clientX - start.x;
    const deltaY = e.touches[0].clientY - start.y;

    // Yönü bir kez kilitle: kullanıcı dikey kaydırmaya başladıysa satır artık kaymaz,
    // yoksa liste kaydırmak imkânsız hale gelir.
    if (lockedRef.current === null) {
      if (Math.abs(deltaY) > VERTICAL_TOLERANCE_PX) { lockedRef.current = 'vertical'; return; }
      if (Math.abs(deltaX) > VERTICAL_TOLERANCE_PX) { lockedRef.current = 'horizontal'; }
      else return;
    }
    if (lockedRef.current === 'vertical') return;

    // Tanımlı aksiyonu olmayan yöne kaydırmaya izin verme.
    if ((deltaX < 0 && !left) || (deltaX > 0 && !right)) return;

    const next = Math.max(-MAX_TRANSLATE_PX, Math.min(MAX_TRANSLATE_PX, deltaX));
    const nextAction = next < 0 ? left : right;
    const nextThreshold = nextAction?.destructive ? DESTRUCTIVE_THRESHOLD_PX : THRESHOLD_PX;

    // Eşiği geçtiği AN tek titreşim — kullanıcı bırakırsa ne olacağını bilir.
    const nowPassed = Math.abs(next) >= nextThreshold;
    if (nowPassed && !passedRef.current) haptic.light();
    passedRef.current = nowPassed;

    setDx(next);
  }

  function onTouchEnd() {
    startRef.current = null;
    if (passedRef.current && action) {
      if (action.destructive) haptic.warning(); else haptic.medium();
      action.onAction();
    }
    passedRef.current = false;
    setDx(0);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Aksiyon zemini — satırın ALTINDA durur, satır kaydıkça ortaya çıkar. */}
      {action && (
        <div
          className={`absolute inset-y-0 flex items-center px-5 ${dx < 0 ? 'right-0' : 'left-0'} ${
            action.destructive ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'
          }`}
          style={{ width: Math.abs(dx) }}
        >
          <span className={`flex flex-col items-center gap-1 text-white transition-opacity ${passed ? 'opacity-100' : 'opacity-60'}`}>
            <action.Icon size={17} />
            <span className="text-ui-2xs font-bold whitespace-nowrap">{action.label}</span>
          </span>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? 'transform .2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
