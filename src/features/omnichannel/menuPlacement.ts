export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface MenuPosition {
  top: number;
  left: number;
}

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

// Menüyü tetikleyicinin altına, sağ kenarı hizalı koyar; altta yer yoksa yukarı çevirir,
// ekran dışına taşmaması için görünür alana sıkıştırır.
export function placeMenu(trigger: Box, menu: Size, viewport: Size): MenuPosition {
  const fitsBelow = trigger.bottom + MENU_GAP + menu.height <= viewport.height - VIEWPORT_MARGIN;
  const preferredTop = fitsBelow ? trigger.bottom + MENU_GAP : trigger.top - MENU_GAP - menu.height;
  const maxTop = viewport.height - VIEWPORT_MARGIN - menu.height;
  const maxLeft = viewport.width - VIEWPORT_MARGIN - menu.width;
  return {
    top: Math.max(VIEWPORT_MARGIN, Math.min(preferredTop, maxTop)),
    left: Math.max(VIEWPORT_MARGIN, Math.min(trigger.right - menu.width, maxLeft)),
  };
}
