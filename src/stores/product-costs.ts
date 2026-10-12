import { create } from 'zustand';
import type { CostItem, CostMatchItem, MatchResult, UnmatchedProduct } from '../lib/api';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface Step {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
}

// 'preview': match-preview sonucu geldi, kullanıcı "Onayla ve Uygula"ya basmadan hiçbir şey
// DB'ye yazılmadı — Fiyat Güncelleme Önizlemesi burada gösterilir.
// 'committing': kullanıcı onayladı, match-commit isteği sürüyor.
export type Phase = 'idle' | 'parsed' | 'matching' | 'preview' | 'committing' | 'done';

export interface MatchState {
  allModeration: CostMatchItem[];
  totalAutoApplied: number;
  totalProducts: number;
  matchedCount: number;
  // Önceden sessizce atlanıp hiçbir yere kaydedilmeyen ürünler — artık nedeniyle gösteriliyor.
  unmatched: UnmatchedProduct[];
}

interface ProductCostsState {
  phase: Phase;
  costItems: CostItem[];
  // match-preview'ın HAM yanıtı — commit'e AYNEN geri gönderilecek `matches` dizisini taşır
  // (bkz. matchCommit'in "yeniden hesaplama yok, önizlemeyi aynen uygula" tasarımı).
  previewResult: MatchResult | null;
  matchState: MatchState | null;
  steps: Step[];

  setPhase: (phase: Phase) => void;
  setCostItems: (items: CostItem[]) => void;
  setPreviewResult: (result: MatchResult | null) => void;
  setMatchState: (state: MatchState | null) => void;
  setSteps: (steps: Step[]) => void;
  updateStep: (id: string, patch: Partial<Step>) => void;
  reset: () => void;
}

export const useProductCostsStore = create<ProductCostsState>((set) => ({
  phase: 'idle',
  costItems: [],
  previewResult: null,
  matchState: null,
  steps: [],

  setPhase: (phase) => set({ phase }),
  setCostItems: (costItems) => set({ costItems }),
  setPreviewResult: (previewResult) => set({ previewResult }),
  setMatchState: (matchState) => set({ matchState }),
  setSteps: (steps) => set({ steps }),
  updateStep: (id, patch) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  reset: () =>
    set({ phase: 'idle', costItems: [], previewResult: null, matchState: null, steps: [] }),
}));
