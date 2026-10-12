'use client';

import { DEMO_USER } from '../../lib/demo/config';

interface DemoLoginScreenProps {
  submitting: boolean;
  onStart: () => void;
}

// Demo girişi: arka plan/logo yok; yalın, ortalanmış kart. Hesap önceden belli, tek tuşla girilir.
export function DemoLoginScreen({ submitting, onStart }: DemoLoginScreenProps) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f1f2f4] px-4 py-10 dark:bg-[#0f1115]">
      <section className="flex w-full max-w-[400px] flex-col gap-6 rounded-2xl border border-black/5 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#171a20]">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#111827] text-sm font-extrabold tracking-wider text-white">
            ERP
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-[#111827] dark:text-white">Giriş yap</h1>
            <p className="m-0 text-sm text-[#6b7280] dark:text-[#9ca3af]">Demo hesabıyla panele devam edin</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#f9fafb] px-4 py-3 dark:border-white/10 dark:bg-[#1e222a]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-sm font-bold text-white">
            D
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold text-[#111827] dark:text-white">Demo Hesabı</span>
            <span className="truncate text-xs text-[#6b7280] dark:text-[#9ca3af]">{DEMO_USER.email}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={onStart}
          className="w-full cursor-pointer rounded-xl border-0 bg-[#008060] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#006e52] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Giriş yapılıyor…' : 'Demo hesabıyla giriş yap'}
        </button>

        <p className="m-0 text-center text-xs text-[#9ca3af]">
          Bu bir demo ortamıdır. Veriler kurgusaldır, değişiklikler kaydedilmez.
        </p>
      </section>
    </main>
  );
}
