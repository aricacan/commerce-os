'use client';

import type { ProductDraftContext } from '../../lib/api/product-drafts';
import { labelClass } from './product-entry-ui';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';

export interface StoreTarget {
  storeId: number;
  keepLocally: boolean;
  targetDataSourceIds: number[];
}

interface Props {
  editable: boolean;
  context: ProductDraftContext | undefined;
  storeTargets: StoreTarget[];
  onChange: (next: StoreTarget[]) => void;
}

export function ProductEntryTabTargets({ editable, context, storeTargets, onChange }: Props) {
  function toggleStore(storeId: number) {
    if (storeTargets.some((t) => t.storeId === storeId)) {
      onChange(storeTargets.filter((t) => t.storeId !== storeId));
    } else {
      onChange([...storeTargets, { storeId, keepLocally: true, targetDataSourceIds: [] }]);
    }
  }

  function updateTarget(storeId: number, patch: Partial<StoreTarget>) {
    onChange(storeTargets.map((t) => (t.storeId === storeId ? { ...t, ...patch } : t)));
  }

  function toggleSource(storeId: number, sourceId: number) {
    const target = storeTargets.find((t) => t.storeId === storeId);
    if (!target) return;
    updateTarget(storeId, {
      targetDataSourceIds: target.targetDataSourceIds.includes(sourceId)
        ? target.targetDataSourceIds.filter((id) => id !== sourceId)
        : [...target.targetDataSourceIds, sourceId],
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className={labelClass}>Hedef Mağaza(lar) *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {context?.stores.map((store) => {
            const target = storeTargets.find((t) => t.storeId === store.id);
            const isSelected = !!target;
            const groupedByCountry = store.erpSources.reduce<Record<string, typeof store.erpSources>>((acc, source) => {
              (acc[source.country] ??= []).push(source);
              return acc;
            }, {});

            return (
              <div
                key={store.id}
                style={{
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--border)' : '1px solid var(--border-soft)',
                  background: isSelected ? 'var(--card)' : 'var(--bg-subtle)',
                  padding: 12,
                  transition: 'all 0.15s',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: editable ? 'pointer' : 'default' }}>
                  <CustomCheckbox
                    checked={isSelected}
                    disabled={!editable}
                    onChange={() => toggleStore(store.id)}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>
                    {store.name}
                  </span>
                </label>

                {target && (
                  <div style={{ marginTop: 10, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: editable ? 'pointer' : 'default' }}>
                      <CustomCheckbox
                        checked={target.keepLocally}
                        disabled={!editable}
                        onChange={(checked) => updateTarget(store.id, { keepLocally: checked })}
                      />
                      <span style={{ fontSize: 12, color: 'var(--fg)' }}>
                        Sadece Dashboard&apos;da tut (DEMO ERP)
                      </span>
                    </label>

                    {Object.entries(groupedByCountry).map(([country, sources]) => (
                      <div key={country} style={{ marginTop: 4 }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                          {country}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {sources.map((source) => (
                            <label key={source.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: editable ? 'pointer' : 'default' }}>
                              <CustomCheckbox
                                checked={target.targetDataSourceIds.includes(source.id)}
                                disabled={!editable}
                                onChange={() => toggleSource(store.id, source.id)}
                              />
                              <span style={{ fontSize: 11.5, color: 'var(--fg)' }}>
                                {source.name} <span style={{ color: 'var(--fg-muted)' }}>({source.connectorType})</span>
                              </span>
                              {/* Hedef SECILEBILIR kalir — engellemiyoruz. Ama yazicisi olmayan bir
                                  ERP'ye gonderim kesin basarisiz olacagi icin bu onceden soylenir;
                                  aksi halde taslak kuyruga duser ve kullanici "gitti" sanir. */}
                              {source.supportsDispatch === false && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                  border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.06)', color: '#fda4af',
                                }}>
                                  Gönderim desteklenmiyor
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bkz. ManualOrderWorkspace — durum iki yönlü gösterilir, açıkken de görünür. */}
      {context && (
        <p style={{
          margin: 0, padding: '8px 12px', borderRadius: 4,
          border: context.externalDispatchEnabled
            ? '1px solid rgba(245,158,11,0.28)' : '1px solid var(--border-soft)',
          background: context.externalDispatchEnabled
            ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
          fontSize: 11,
          color: context.externalDispatchEnabled ? 'var(--fg)' : 'var(--fg-muted)',
        }}>
          {context.dispatchNotice}
        </p>
      )}
    </div>
  );
}
