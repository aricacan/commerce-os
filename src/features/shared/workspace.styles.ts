// ModuleWorkspace kabuğunun kullandığı ortak, saf stil sabitleri.
import { layers } from './design';

export const workspaceOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: '#ffffff', zIndex: layers.workspace,
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  animation: 'fadeIn 0.1s ease-in-out',
};

export const workspaceContainer: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', background: '#ffffff',
  overflow: 'hidden',
};

export const roomsSidebar: React.CSSProperties = {
  background: '#f9f9f9', display: 'flex', flexDirection: 'column',
  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden',
};

export const sidebarHeader: React.CSSProperties = {
  padding: '16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8,
};

export const iconBtnNavbar: React.CSSProperties = {
  background: 'none', border: 'none', color: '#5f5f5f', cursor: 'pointer', padding: 5,
  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6,
  transition: 'background 0.12s',
};

export const chatMainArea: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
  background: '#ffffff', position: 'relative',
};
