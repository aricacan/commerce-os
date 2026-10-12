export function SystemPanelStyles() {
  return (
    <style>{`
  .settings-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;
    padding: 24px;
    flex: 1;
    overflow: hidden;
  }
  @media (max-width: 768px) {
    .settings-layout {
      grid-template-columns: 1fr;
      padding: 12px;
      gap: 16px;
      overflow-y: auto;
    }
    .platform-list {
      max-height: 240px;
    }
  }
  .platform-list {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }
  .platform-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    cursor: pointer;
    border: none;
    border-bottom: 1px solid var(--border-soft);
    transition: all 0.2s ease;
    background: transparent;
    color: var(--fg-muted);
    text-align: left;
    width: 100%;
    font-family: inherit;
  }
  .platform-item:last-child {
    border-bottom: none;
  }
  .platform-item:hover {
    background: var(--bg-subtle);
    color: var(--fg);
    padding-left: 24px;
  }
  .platform-item.active {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .platform-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-subtle);
    color: var(--fg-muted);
    transition: all 0.2s ease;
  }
  .platform-item.active .platform-icon {
    background: linear-gradient(135deg, #e52521, #c01f1b);
    color: #fff;
    box-shadow: 0 4px 12px rgba(229,37,33,0.3);
  }
  .platform-item-name {
    flex: 1;
    font-size: 13.5px;
    font-weight: 700;
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .form-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 28px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field-label {
    font-size: 11px;
    font-weight: 750;
    color: var(--fg-muted);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .field-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .field-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fg-muted);
    pointer-events: none;
    display: flex;
  }
  .field-input {
    width: 100%;
    padding: 11px 14px 11px 38px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--fg);
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .field-input:focus {
    border-color: #e52521;
    box-shadow: 0 0 0 3px rgba(229,37,33,0.1);
  }
  .field-input-secret {
    padding-right: 40px;
  }
  .input-eye-btn {
    position: absolute;
    right: 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--fg-muted);
    padding: 0;
    display: flex;
    align-items: center;
  }
  .input-eye-btn:hover {
    color: var(--fg);
  }
  .env-toggle {
    display: inline-flex;
    padding: 4px;
    border-radius: 12px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    gap: 4px;
    width: fit-content;
  }
  .env-toggle-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--fg-muted);
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
  }
  .env-toggle-btn.active {
    background: var(--card);
    color: #e52521;
    box-shadow: var(--shadow-sm);
  }
  .badge {
    font-size: 10.5px;
    padding: 3px 9px 3px 7px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.2px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .badge::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: currentColor;
    flex-shrink: 0;
  }
  .badge.active {
    background: rgba(16,185,129,0.12);
    color: #10b981;
  }
  .badge.inactive {
    background: var(--bg-subtle);
    color: var(--fg-muted);
    border: 1px solid var(--border);
  }
  .badge.warning {
    background: rgba(245,158,11,0.12);
    color: #f59e0b;
  }
  .toast-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 20px;
    animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: var(--shadow-xs);
  }
  .toast-alert.success {
    background: rgba(16,185,129,0.1);
    color: #10b981;
    border: 1px solid rgba(16,185,129,0.2);
  }
  .toast-alert.error {
    background: rgba(239,68,68,0.1);
    color: #ef4444;
    border: 1px solid rgba(239,68,68,0.2);
  }
  @keyframes toastSlideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .settings-tabs {
    display: flex;
    gap: 4px;
    padding: 6px;
    background: var(--bg-subtle);
    border-radius: 12px;
    width: fit-content;
  }
  .settings-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s ease;
    white-space: nowrap;
  }
  .settings-tab:hover {
    color: var(--fg);
  }
  .settings-tab.active {
    background: var(--card);
    color: #e52521;
    font-weight: 700;
    box-shadow: var(--shadow-xs);
  }
  .settings-table {
    width: 100%;
    border-collapse: collapse;
  }
  .settings-table th {
    padding: 14px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: var(--fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-subtle);
  }
  .settings-table td {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-soft);
    font-size: 13.5px;
    color: var(--fg);
    vertical-align: middle;
  }
  .settings-table tbody tr {
    transition: background 0.15s ease;
  }
  .settings-table tbody tr:hover {
    background: var(--bg-subtle);
  }
  .settings-table tbody tr:last-child td {
    border-bottom: none;
  }
  .role-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg-subtle);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    padding: 0;
  }
  .role-chip:hover {
    border-color: #e52521;
    color: #e52521;
    transform: scale(1.05);
  }
  .role-chip.on {
    background: #e52521;
    border-color: #e52521;
    color: #fff;
    box-shadow: 0 3px 8px rgba(229,37,33,0.3);
  }
  .role-chip.locked {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent);
    cursor: not-allowed;
    opacity: 0.85;
  }
  .row-save-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    background: linear-gradient(135deg, #e52521, #c01f1b);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(229,37,33,0.3);
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .row-save-btn:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-0.5px);
  }
  .row-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .model-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .model-card:hover {
    border-color: var(--fg-subtle);
    background: var(--bg-subtle);
    transform: translateY(-1px);
  }
  .model-card.active {
    border-color: #e52521;
    background: var(--accent-soft);
    box-shadow: 0 0 0 3px rgba(229,37,33,0.08);
  }
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    background: linear-gradient(135deg, #e52521, #c01f1b);
    box-shadow: var(--shadow-xs);
  }
  .role-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.2px;
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
  }
  .role-badge.role-superadmin {
    background: rgba(229,37,33,0.12);
    color: #e52521;
    border-color: rgba(229,37,33,0.2);
  }
  .role-badge.role-admin {
    background: rgba(37,99,235,0.12);
    color: #2563eb;
    border-color: rgba(37,99,235,0.2);
  }
  .role-badge.role-moderator {
    background: rgba(124,58,237,0.12);
    color: #7c3aed;
    border-color: rgba(124,58,237,0.2);
  }
  .role-badge.role-default {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: transparent;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 24px;
    height: 42px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #e52521, #c01f1b);
    color: #fff;
    font-size: 13.5px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(229,37,33,0.25);
    transition: all 0.2s ease;
  }
  .btn-primary:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(229,37,33,0.32);
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 20px;
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-secondary:hover {
    color: var(--fg);
    background: var(--bg-subtle);
    border-color: var(--fg-subtle);
    transform: translateY(-0.5px);
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: overlayFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .modal-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.94) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .ai-select, .ai-input {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-subtle);
    color: var(--fg);
    font-size: 13px;
    outline: none;
    transition: all 0.15s ease;
  }
  .ai-select:focus, .ai-input:focus {
    border-color: #e52521;
    background: var(--card);
    box-shadow: 0 0 0 3px rgba(229,37,33,0.1);
  }
`}</style>
  );
}

