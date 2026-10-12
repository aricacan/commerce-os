import { request } from './core';

// ─── ANA SİSTEM (kiracı üstü) ────────────────────────────────────────────────
// Bu uçlar YALNIZCA SystemAdmin rolüyle çağrılabilir — bkz. system-tenants.ts.
// Sektör kategori şablonlarını listeler ve mevcut bir kiracıya SONRADAN uygular
// (normal yol kiracı açılırken systemTenantsApi.create'e templateKey vermektir).

export interface CategoryTemplateSummary {
  key: string;
  displayNameTr: string;
  displayNameEn: string;
  version: number;
}

export interface CategoryTemplateApplyResult {
  templateKey: string;
  tenantId: number;
  categoriesCreated: number;
  categoriesSkippedExisting: number;
  rulesCreated: number;
  rulesSkippedExisting: number;
  sourceAliasesCreated: number;
  sourceAliasesSkippedExisting: number;
  notes: string[];
}

export const categoryTemplatesApi = {
  list: () => request<CategoryTemplateSummary[]>('/system/category-templates'),

  apply: (key: string, tenantId: number) =>
    request<CategoryTemplateApplyResult>(
      `/system/category-templates/${encodeURIComponent(key)}/apply?tenantId=${tenantId}`,
      { method: 'POST' },
    ),
};
