import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { iconButtonClass } from './contentStyles';

export interface MenuMoveActions {
  canUp: boolean;
  canDown: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  onUp: () => void;
  onDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}

interface Props {
  label: string;
  actions: MenuMoveActions;
}

// Yukarı / aşağı / girintile / girintiyi azalt: liste görünümünün ve ağaçta sürüklemenin klavye erişilebilir karşılığı.
export function MenuMoveButtons({ label, actions }: Props) {
  return (
    <>
      <button type="button" className={iconButtonClass} aria-label={`${label} yukarı taşı`} disabled={!actions.canUp} onClick={actions.onUp}><ArrowUp size={14} aria-hidden /></button>
      <button type="button" className={iconButtonClass} aria-label={`${label} aşağı taşı`} disabled={!actions.canDown} onClick={actions.onDown}><ArrowDown size={14} aria-hidden /></button>
      <button type="button" className={iconButtonClass} aria-label={`${label} girintile`} disabled={!actions.canIndent} onClick={actions.onIndent}><ArrowRight size={14} aria-hidden /></button>
      <button type="button" className={iconButtonClass} aria-label={`${label} girintiyi azalt`} disabled={!actions.canOutdent} onClick={actions.onOutdent}><ArrowLeft size={14} aria-hidden /></button>
    </>
  );
}
