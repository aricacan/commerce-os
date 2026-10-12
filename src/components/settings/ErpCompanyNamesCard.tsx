'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { erpSourcesApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export function ErpCompanyNamesCard() {
  const { lang, t } = useI18n();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: sources = [] } = useQuery({
    queryKey: ['erp-sources'],
    queryFn: erpSourcesApi.list,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, displayName }: { id: number; displayName: string }) =>
      erpSourcesApi.update(id, { displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-sources'] });
      setSuccessMsg(lang === 'tr' ? 'Firma adÄ± gÃ¼ncellendi.' : 'Company name updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  if (sources.length === 0) return null;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
        {lang === 'tr' ? 'ERP KaynaklarÄ± â€” Firma AdlarÄ±' : 'ERP Sources â€” Company Names'}
      </h2>
      {successMsg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
          {successMsg}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sources.map((src) => {
          const draft = drafts[src.id] ?? src.displayName;
          const dirty = draft.trim() !== src.displayName && draft.trim().length > 0;
          return (
            <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', width: 92, flexShrink: 0 }}>
                {src.country} Â· {src.erp}
              </span>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [src.id]: e.target.value }))}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, outline: 'none',
                }}
              />
              <button
                type="button"
                disabled={!dirty || mutation.isPending}
                onClick={() => mutation.mutate({ id: src.id, displayName: draft.trim() })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8,
                  border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.4,
                }}
              >
                <Save size={13} />
                {t('save')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
