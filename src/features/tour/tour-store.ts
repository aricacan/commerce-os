import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TourStep, PageHelpItem } from './types';

interface TourState {
  isOpen: boolean;
  activeTourId: string | null;
  currentStepIndex: number;
  steps: TourStep[];
  completedTours: Record<string, boolean>;

  // Help Modal state
  activeHelpModal: PageHelpItem | null;
  openHelpModal: (item: PageHelpItem) => void;
  closeHelpModal: () => void;

  startTour: (tourId: string, steps: TourStep[], force?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  closeTour: () => void;
  resetTourHistory: (tourId?: string) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeTourId: null,
      currentStepIndex: 0,
      steps: [],
      completedTours: {},

      activeHelpModal: null,
      openHelpModal: (item: PageHelpItem) => set({ activeHelpModal: item }),
      closeHelpModal: () => set({ activeHelpModal: null }),

      startTour: (tourId: string, steps: TourStep[], force = false) => {
        if (!steps || steps.length === 0) return;
        const state = get();
        // If already completed and not forced, do not auto open
        if (!force && state.completedTours[tourId]) return;

        set({
          isOpen: true,
          activeTourId: tourId,
          currentStepIndex: 0,
          steps,
          activeHelpModal: null, // close help modal when tour starts
        });
      },

      nextStep: () => {
        const { currentStepIndex, steps, activeTourId } = get();
        if (currentStepIndex < steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          // Completed
          if (activeTourId) {
            set((s) => ({
              isOpen: false,
              activeTourId: null,
              steps: [],
              completedTours: { ...s.completedTours, [activeTourId]: true },
            }));
          } else {
            set({ isOpen: false, activeTourId: null, steps: [] });
          }
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      goToStep: (index: number) => {
        const { steps } = get();
        if (index >= 0 && index < steps.length) {
          set({ currentStepIndex: index });
        }
      },

      skipTour: () => {
        const { activeTourId } = get();
        if (activeTourId) {
          set((s) => ({
            isOpen: false,
            activeTourId: null,
            steps: [],
            completedTours: { ...s.completedTours, [activeTourId]: true },
          }));
        } else {
          set({ isOpen: false, activeTourId: null, steps: [] });
        }
      },

      closeTour: () => {
        set({ isOpen: false, activeTourId: null, steps: [] });
      },

      resetTourHistory: (tourId?: string) => {
        if (tourId) {
          set((s) => {
            const copy = { ...s.completedTours };
            delete copy[tourId];
            return { completedTours: copy };
          });
        } else {
          set({ completedTours: {} });
        }
      },
    }),
    {
      name: 'demo_interactive_tours_v1',
      partialize: (state) => ({ completedTours: state.completedTours }),
    }
  )
);
