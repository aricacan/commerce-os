export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: TourPlacement;
}

export interface PageHelpItem {
  id: string;
  href: string;
  title: string;
  badge?: string;
  description: string;
  features: string[];
  tourSteps?: TourStep[];
}
