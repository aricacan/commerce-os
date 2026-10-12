import { request } from './core';

// ─── DEMO Radar (B2B lead generation & email automation) ───────────────────────

// ─── Ana dashboard (KpiBar) özet kartı ─────────────────────────────────────────

export interface RadarSicCodeSliceDto {
  sicCode: string;
  count: number;
}

export interface RadarWidgetSummaryDto {
  from: string;
  to: string;
  scrapedCompanyCount: number;
  emailsSentCount: number;
  leadRatePercent: number;
  activeScrapeRunCount: number;
  sicCodeDistribution: RadarSicCodeSliceDto[];
}

export const radarApi = {
  dashboardOverview: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return request<RadarWidgetSummaryDto>(`/radar/dashboard/overview${qs ? `?${qs}` : ''}`);
  },

  stats: (country?: string) =>
    request<import('../../types/api').RadarStats>(`/radar/stats${country ? `?country=${country}` : ''}`),

  recentActivity: (limit = 20, country?: string) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (country) q.set('country', country);
    return request<import('../../types/api').RadarRecentActivityItem[]>(`/radar/recent-activity?${q}`);
  },

  companies: {
    list: (params?: {
      page?: number; pageSize?: number; isActive?: boolean; status?: string; search?: string;
      category?: string; country?: string; city?: string; tag?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('pageSize', String(params.pageSize));
      if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.category) q.set('category', params.category);
      if (params?.country) q.set('country', params.country);
      if (params?.city) q.set('city', params.city);
      if (params?.tag) q.set('tag', params.tag);
      return request<import('../../types/api').PaginatedResult<import('../../types/api').RadarCompanyListItem>>(
        `/radar/companies?${q}`
      );
    },
    detail: (id: number) =>
      request<import('../../types/api').RadarCompanyDetail>(`/radar/companies/${id}`),
    cities: () => request<string[]>('/radar/companies/cities'),
    tags: () => request<string[]>('/radar/companies/tags'),
    create: (body: {
      companyNumber?: string; companyName: string; category: string; country?: string;
      email?: string | null; website?: string | null; city?: string | null; district?: string | null;
      companySizeLabel?: string | null; tags?: string[];
    }) =>
      request<import('../../types/api').RadarCompanyListItem>('/radar/companies', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: number, body: {
      companyName: string; category: string; email?: string | null; website?: string | null;
      city?: string | null; district?: string | null; isActive: boolean;
      companySizeLabel?: string | null; tags?: string[];
    }) =>
      request<import('../../types/api').RadarCompanyListItem>(`/radar/companies/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<void>(`/radar/companies/${id}`, { method: 'DELETE' }),
    messages: (id: number, page = 1, pageSize = 30) =>
      request<import('../../types/api').RadarMessageThread>(
        `/radar/companies/${id}/messages?page=${page}&pageSize=${pageSize}`
      ),
    reply: (id: number, body: {
      emailAccountId: number; templateId?: number | null; subject?: string; body?: string; markCompleted?: boolean;
    }) =>
      request<{ sent: boolean; messageId?: string | null }>(`/radar/companies/${id}/reply`, {
        method: 'POST', body: JSON.stringify(body),
      }),
    lookupDomain: (email: string) =>
      request<{ suggestedCompanyName?: string | null; website: string; candidateEmails: string[] }>(
        '/radar/companies/lookup-domain', { method: 'POST', body: JSON.stringify({ email }) }
      ),
    scoreLead: (id: number) =>
      request<{
        companyId: number; leadScore: number; leadCompanyType: string;
        leadIndustryMatch: boolean; leadProducts: string[]; leadScoredAt: string;
      }>(`/radar/companies/${id}/score-lead`, { method: 'POST' }),
  },

  analytics: (country?: string) =>
    request<import('../../types/api').RadarAnalytics>(`/radar/analytics${country ? `?country=${country}` : ''}`),

  scraper: {
    /** Companies House Feeder + Enricher koşusunu arka planda tetikler (Admin only).
     *  sicCode verilirse sadece o kod taranır, verilmezse tüm aktif kodlar. */
    trigger: (fullRescan = false, sicCode?: string) => {
      const params = new URLSearchParams({ fullRescan: String(fullRescan) });
      if (sicCode) params.set('sicCode', sicCode);
      return request<{ jobId: string; message: string }>(`/radar/scraper/trigger?${params}`, { method: 'POST' });
    },
  },

  scrapeRuns: {
    list: (limit = 10) => request<import('../../types/api').RadarScrapeRun[]>(`/radar/scrape-runs?limit=${limit}`),
  },

  sicCodes: {
    list: (activeOnly = false) =>
      request<import('../../types/api').RadarSicCode[]>(`/radar/sic-codes?activeOnly=${activeOnly}`),
    create: (body: { code: string; label?: string; country?: string }) =>
      request<import('../../types/api').RadarSicCode>('/radar/sic-codes', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: number, body: { label?: string; isActive: boolean; country?: string }) =>
      request<import('../../types/api').RadarSicCode>(`/radar/sic-codes/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<void>(`/radar/sic-codes/${id}`, { method: 'DELETE' }),
  },

  emailTemplates: {
    list: () => request<import('../../types/api').RadarEmailTemplate[]>('/radar/email-templates'),
    create: (body: {
      templateType: 'Sequence' | 'Reply'; stepNumber?: number | null; sicCode?: string | null;
      name?: string | null; subject: string; body: string;
    }) =>
      request<import('../../types/api').RadarEmailTemplate>('/radar/email-templates', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: number, body: {
      sicCode?: string | null; name?: string | null; subject: string; body: string; isActive: boolean;
    }) =>
      request<import('../../types/api').RadarEmailTemplate>(`/radar/email-templates/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<void>(`/radar/email-templates/${id}`, { method: 'DELETE' }),
  },

  testSend: (body: {
    emailAccountId: number; templateId: number; testEmail: string;
    companyName: string; city?: string; district?: string; website?: string;
  }) =>
    request<{ renderedSubject: string; renderedBody: string; sent: boolean; error?: string | null }>(
      '/radar/test-send', { method: 'POST', body: JSON.stringify(body) }
    ),

  emailAccounts: {
    list: () => request<import('../../types/api').RadarEmailAccount[]>('/radar/email-accounts'),
    create: (body: {
      emailAddress: string; password: string; smtpServer: string; smtpPort: number;
      imapServer: string; imapPort: number; dailyLimit?: number;
    }) =>
      request<import('../../types/api').RadarEmailAccount>('/radar/email-accounts', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: number, body: {
      password?: string | null; smtpServer: string; smtpPort: number;
      imapServer: string; imapPort: number; dailyLimit: number; isActive: boolean;
    }) =>
      request<import('../../types/api').RadarEmailAccount>(`/radar/email-accounts/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<void>(`/radar/email-accounts/${id}`, { method: 'DELETE' }),
  },

  alerts: () => request<import('../../types/api').RadarAlert[]>('/radar/alerts'),
};
