import { BASE, request, uploadHeaders, throwIfNotOk } from './core';

export const excelReportApi = {
  preview: (body: import('../../types/api').ExcelReportRequest) =>
    request<import('../../types/api').ExcelReportPreview>('/excel-report/preview', {
      method: 'POST', body: JSON.stringify(body),
    }),

  generate: async (body: import('../../types/api').ExcelReportRequest): Promise<void> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...uploadHeaders() };
    const res = await fetch(`${BASE}/excel-report/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadTemplate: async (moduleName: string): Promise<void> => {
    const headers: Record<string, string> = { ...uploadHeaders() };
    const res = await fetch(`${BASE}/excel-report/template/${encodeURIComponent(moduleName)}`, {
      method: 'GET',
      headers,
    });
    await throwIfNotOk(res);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Şablon_${moduleName}_DEMO.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
