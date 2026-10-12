// GENERIC arka plan export polling istemcisi — backend'deki ExportFileStore/ExportJobsController
// karşılığı (bkz. src/backend/DemoDashboard.Infrastructure/Jobs/ExportFileStore.cs). Şu an tek
// üretici ProductCost export'u (productCostApi.startExportExcel) ama uç GENERİK: jobId döndüren
// herhangi bir "start" çağrısı bu status/download çiftiyle poll edilip indirilebilir.
import { request, BASE, authHeader, throwIfNotOk } from './core';

export type ExportJobStatus =
  | { state: 'NotFound' }
  | { state: 'Running' }
  | { state: 'Failed'; errorMessage: string }
  | { state: 'Completed'; fileName: string; downloadUrl: string };

export const exportJobsApi = {
  status: (jobId: string) => request<ExportJobStatus>(`/export-jobs/${jobId}`),

  // downloadUrl auth header gerektirdiği için düz <a href> yerine Blob indirmesiyle yapılır
  // (productCostApi.exportExcel ile AYNI desen).
  download: async (jobId: string, fileName: string): Promise<void> => {
    const res = await fetch(`${BASE}/export-jobs/${jobId}/download`, { headers: authHeader() });
    await throwIfNotOk(res);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
