// SiteHub panosu uçlarını çağırabilecek roller — backend'deki
// SiteHubDashboardController'ın [Authorize(Roles = ...)] listesiyle BİREBİR aynı
// tutulmalı. Ana dashboard'daki SiteHub özet kartının görünürlüğünde kullanılır:
// kart yalnızca ucu gerçekten çağırabilen rollere gösterilir. Aksi halde yetkisiz
// her kullanıcıya 403 kaynaklı, düzeltemeyeceği bir hata kutusu düşer.
// (lib/radar/roles.ts ile aynı desen.)
export const SITEHUB_DASHBOARD_ROLES = ['SuperAdmin', 'Admin', 'Moderator'];
