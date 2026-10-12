// Radar dashboard'una erişebilecek roller — backend'deki RadarCompaniesController'ın
// [Authorize(Roles = ...)] listesiyle birebir aynı tutulmalı. Hem radar/layout.tsx'in
// erişim kontrolünde hem Topbar'daki Uygulamalar panelinin görünürlüğünde kullanılır.
export const RADAR_ROLES = ['SuperAdmin', 'Admin', 'ForeignTrade'];
