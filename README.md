<h1 align="center">iERP · Commerce &amp; Operations Platform (Demo)</h1>

<p align="center">
  A modular ERP and operations panel for a manufacturer that sells through its own factory channel,<br/>
  its web stores and multiple marketplaces. This repository is the <strong>front end in demo mode</strong>:<br/>
  it runs entirely in the browser on fictional data, with no backend required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=fff" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=fff" alt="TanStack Query 5" />
  <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=fff" alt="PWA" />
  <img src="https://img.shields.io/badge/i18n-TR_%7C_EN-2E7D32" alt="Turkish and English" />
</p>

> **Demo notice.** All companies, people, orders and figures in this repository are fictional and generated in the browser. Create, update and delete actions are disabled. No real system is contacted.

---

## Contents

- [At a glance](#at-a-glance)
- [What the platform does](#what-the-platform-does)
- [Core modules](#core-modules)
- [Workspace apps](#workspace-apps)
- [Integrations](#integrations)
- [Platform capabilities](#platform-capabilities)
- [How demo mode works](#how-demo-mode-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Code quality](#code-quality)
- [Rights](#rights)

## At a glance

| | |
|---|---|
| **Type** | Web-based ERP, commerce operations and analytics panel |
| **Users** | Management, e-commerce, operations, warehouse, finance and accounting teams |
| **Pages** | 140+ routes across 11 core areas |
| **Workspace apps** | 17 modules that can be enabled per tenant and granted per user |
| **Codebase** | ~1,800 TypeScript files |
| **Languages** | Turkish and English |
| **Delivery** | Responsive web app, installable as a PWA (desktop, tablet, handheld terminal) |

## What the platform does

The platform brings sales, stock, logistics, finance and customer communication into one panel. It reads orders and products from the company's own ERP systems, marketplaces and web stores, then adds the layers those systems do not provide on their own:

- **One view of revenue** across the factory channel, domestic and export sales, and every marketplace.
- **Profitability per product and channel**, including commissions, shipping, advertising and returns.
- **Operational control**: stock health, price and stock consistency across channels, missing products between systems, and warehouse picking.
- **Customer communication** across WhatsApp, Instagram, Messenger, Facebook, TikTok and e-mail, with an AI assistant and human handoff.
- **Decision support**: demand forecasting, anomaly detection, cannibalization and cohort analysis, and an AI copilot over company data.
- **Finance and compliance**: Turkish e-invoice and e-archive workflows, pre-accounting, general ledger and marketplace reconciliation.

## Core modules

These areas live in the main sidebar.

| Area | What it covers | Routes |
|---|---|---|
| **Dashboard** | Group revenue, channel cards, release notes, customizable widget dashboards | `/dashboard`, `/dashboard/ecommerce` |
| **Orders** | Unified order list and detail, manual orders, returns, customer e-mails | `/orders`, `/orders/[id]`, `/orders/returns` |
| **Products** | Catalog and SKU detail, categories (catalog, rules, matching, mismatches), stock, stock risk, warehouse boxes, vehicle fitment, logistics data, product gaps, new product entry | `/products/*` |
| **Analytics** | Product analysis, anomaly detection, price and stock consistency, cohort analysis, cannibalization, loss-making products, price comparison against competitors | `/product-analysis`, `/anomaly`, `/cohort-analytics`, `/price-comparison/*` |
| **Finance** | Profit and loss, expenses, product costs, shipping rates, platform commission settings, receivables aging | `/finance/*`, `/product-costs` |
| **Invoicing** | e-Invoice and e-Archive invoices, delivery notes, invoice series, commercial responses, purchase matching, envelopes, tax codes, carriers, address book, marketplace invoice upload | `/invoicing/*` |
| **Purchasing** | Purchase orders, suppliers, raw materials, bills of materials | `/purchase-orders`, `/suppliers`, `/raw-materials`, `/bom` |
| **Pre-accounting** | Customers, treasury (cash and bank), collections and payments | `/accounting/customers`, `/accounting/treasury`, `/accounting/payments` |
| **General ledger** | Chart of accounts, journal entries, trial balance, VAT summary, e-Ledger, e-Archive daily report, marketplace reconciliation | `/accounting/*` |
| **Customization** | Excel report builder and dashboard widget designer | `/customize/excel`, `/customize/widget` |
| **Settings** | Users, permissions, two-factor authentication, order statuses, price groups, automation rules, AI settings, notifications, moderation, feedback, QR codes, credential vault, stores, ERP connections and import, change history | `/system/*` |

## Workspace apps

Workspace apps open from the apps launcher. Each has its own route and tabs, and each can be switched on per tenant and granted per user.

| App | Route | Purpose | Main tabs |
|---|---|---|---|
| **Omnichannel** | `/omnichannel` | Shared inbox for WhatsApp, social channels and e-mail, with an AI bot that answers order and shipment questions and hands off to the team | Inbox, handoffs and complaints, customers, quality centre, scripts, teams, bot, catalog, rules, payment |
| **Trendyol Hub** | `/trendyol` | Marketplace workspace for campaigns and profitability | Campaigns, campaign files, commission tariff, DSS analysis, invoice upload, marketplace profitability |
| **Shopify Hub** | `/shopify` | Shopify stores with live orders and catalog, plus an embedded Shopify admin app | Overview, orders, customers, discounts, products, collections, menus |
| **AdsHub** | `/adshub` | Google, Meta and TikTok ad accounts in one place, with profit-based recommendations and approvals | Overview, campaigns, profitability, recommendations, approvals, placement |
| **SellingView** | `/sellingview` | Sales forecasting and demand planning with AI analysts | Demand analyst, anomaly detective, price strategist, co-pilot, purchase planning, screener, rule backtest |
| **AI Copilot** | `/ai-copilot` | Decision assistant with retrieval over company documents (RAG) | Chat, documents |
| **WMS** | `/wms` | Warehouse management: layout designer, 3D warehouse view, picking and packing, handheld terminal | Setup, 3D view, operations, picking and packing, device pairing |
| **Logistics** | `/logistics` | Shipments, carriers, parcel volume and carrier mapping | Shipments, carriers, mappings |
| **Base Hub** | `/base` | Shipment, stock, vehicle catalog and product tracking for the UK store operation | Calculated, uploaded and merged stock views, catalog |
| **Sentos Hub** | `/sentos` | Stock consumption and missing-product tracking with red, orange and yellow alert levels | Overview, warnings, Sentos stock, potential stock, settings |
| **Erpis** | `/erpis` | Analysis and reporting on the factory ERP | Overview, orders, mixed orders, data dictionary |
| **OEM Matcher** | `/oem-matcher` | OEM part number matching and cross-referencing from Excel and supplier sites | Excel import, sites, scans, matching review, OEM dictionary, studio |
| **B2B Outreach** | `/b2b-outreach` | Company discovery, data collection and e-mail campaigns for B2B prospecting | Overview, scraping runs, companies, messages, templates, e-mail accounts |
| **SiteHub** | `/sitehub` | Quote requests, messages, shared blog and statistics from the group's corporate websites | Overview, inbox, shared blog, sites |
| **Photo Studio** | `/photo-studio` | AI image processing and media management | Studio, background removal |
| **System Monitoring** | `/monitoring` | Health checks, audit trail, sessions, page usage, slow endpoints, exceptions and background jobs | Overview, insights, sessions, activity, synthetic checks, jobs |
| **PartnerHub** | `/partnerhub` | MCP server that gives partner systems controlled, audited access to platform tools | Overview, clients, activity |

## Integrations

The interface is built to work with the following systems through the backend. In this demo they are represented with fictional data only.

| Category | Systems |
|---|---|
| **Marketplaces and stores** | Trendyol, Hepsiburada, Amazon, eBay, n11, Çiçeksepeti, Pazarama, Shopify |
| **ERP and inventory** | Erpis, Base (BaseLinker), Sentos, Logo, Netsis, Mikro |
| **e-Documents (Türkiye)** | e-Invoice, e-Archive and e-Ledger through integrators such as Uyumsoft and Foriba |
| **Carriers** | Aras, Yurtiçi, UPS, Royal Mail, Evri |
| **Advertising** | Google Ads, Meta, TikTok |
| **Messaging** | WhatsApp, Instagram, Messenger, Facebook, TikTok, e-mail |
| **AI** | DeepSeek and self-hosted models through Ollama |
| **Partner access** | Model Context Protocol (MCP) server |

## Platform capabilities

**Access and security**
- Role and permission management down to page and module level, with per-tenant module switches.
- Two-factor authentication with authenticator apps.
- Credential vault and full change history.

**Working faster**
- Command palette (`Ctrl + K`) and keyboard shortcuts.
- Multi-store selector that filters every screen.
- Guided tours and page-level help.
- Light and dark themes.

**Dashboards and reporting**
- Drag-and-drop dashboard widgets and a widget designer.
- Excel report builder, plus Excel and PDF export on lists.
- Charts, financial-style time series and maps of Turkish provinces and UK regions.

**Warehouse and field use**
- Barcode and QR scanning with the device camera.
- OCR to read shipping labels.
- 3D warehouse viewer.
- Installable PWA with offline page, install prompt and push notifications.

**Real-time and background work**
- Live updates over SignalR.
- Background job monitoring.
- Notification centre, alert stack and in-app feedback.

**Large data sets**
- Virtualized tables and lists, and query caching with optimistic updates.

## How demo mode works

Demo mode is switched on with one flag, `NEXT_PUBLIC_DEMO=true`, which is set in `next.config.ts`. With the flag off, the same code talks to the real backend.

| Piece | File | Role |
|---|---|---|
| Mock API router | `src/lib/demo/router.ts` | Intercepts `/api/...` calls in the browser and routes them to mock handlers, including the selected-store header |
| Mock handlers | `src/lib/demo/mocks/` | Return realistic responses per module (dashboard, finance, logistics, omnichannel and more) |
| Seed data | `src/lib/demo/data/`, `seed.ts` | Deterministic fake data from a seeded random generator, so every visit shows the same data |
| Session store | `src/lib/demo/session-store.ts` | Keeps in-session changes visible, for example a sent message or a status change, and resets on reload |
| Write guard | `src/lib/demo/write-guard.ts` | Silently accepts harmless writes such as preferences and tracking, and blocks real writes with a demo notice |
| Latency | `src/lib/demo/config.ts` | Simulates network delay so loading states are visible |

## Architecture

```
Browser (Next.js app, React 19)
  ├─ TanStack Query      server state, caching, optimistic updates
  ├─ Zustand             UI state (panels, layout, store selector, AI panel ...)
  ├─ REST API client     src/lib/api
  └─ SignalR             real-time updates
        │
        ▼
Backend API (not included)          In demo mode: src/lib/demo (in-browser mock API)
  ├─ Module registry, tenants and permissions
  ├─ Connectors: ERPs, marketplaces, carriers, e-documents, ads, messaging
  └─ Background jobs and monitoring
```

- The module list, tenant switches and user access come from the backend's module registry. The front end keeps only icons and routes.
- Every workspace app has a real, shareable URL, and the active tab is part of the address (for example `/adshub/campaigns`).
- Older module addresses are permanently redirected to the new names in `next.config.ts`, so existing bookmarks and links keep working.
- The `/shopify-app` route can be embedded inside Shopify admin. The rest of the panel cannot be framed.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, TypeScript (strict), Tailwind CSS 4, Lucide icons, next-themes |
| Data | TanStack Query 5, TanStack Virtual, Zustand |
| Real-time | Microsoft SignalR client |
| Charts and maps | Recharts, Lightweight Charts, Leaflet / React Leaflet |
| Dashboards | react-grid-layout, dnd-kit |
| 3D | three.js, React Three Fiber, Drei |
| Documents | ExcelJS, jsPDF, jspdf-autotable, html2canvas |
| Scanning and OCR | ZXing (barcode and QR), Tesseract.js |
| Security | DOMPurify for rendered HTML |
| Tooling | ESLint, TypeScript, Vitest |

## Getting started

**Requirements:** Node.js 20 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Demo hesabıyla giriş yap** (sign in with the demo account). No `.env` file is needed.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server on `localhost:3000` |
| `npm run build` | Create a standalone production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint `src/` with zero warnings allowed |
| `npm run typecheck` | Type-check the project |
| `node scripts/check-bundle-budget.mjs` | Check gzipped page bundles against a size budget (run after a build) |
| `node scripts/check-typography.mjs` | Report hand-written font sizes and weights per file |
| `node scripts/find-dead-code.mjs` | List source files that are never imported |

### Docker

The build uses Next.js standalone output and the repository includes a `.dockerignore`, so the app can be packaged as a small Node.js container.

## Project structure

```
src/
  app/            Routes: (app) for the panel, plus login, password reset and the Shopify embedded app
  features/       One folder per module: business logic and screens
  components/     Shared UI, layout, dashboard, charts, PWA, AI widget, barcode and more
  hooks/          Data and UI hooks, grouped by module
  stores/         Zustand stores for UI state
  lib/
    api/          API client per area
    demo/         Demo mode: mock router, handlers, seed data, write guard
    translations/ Turkish and English dictionaries
    nav-groups.ts         Sidebar structure
    workspace-routes.ts   Workspace app routes and module keys
  types/          Shared TypeScript types
public/           Icons, brand logos, PWA manifest and service worker, map data
scripts/          Bundle budget, typography and dead-code checks
```

## Code quality

- TypeScript in strict mode and ESLint with a zero-warning policy.
- Code-split workspace apps that load only when opened.
- A per-page bundle size budget that can be checked after any build.
- In-repo checks for typography consistency and unused files.

## Rights

All rights reserved. This repository is shared as a demonstration of the product. The code, design and documentation may not be copied, redistributed or used commercially without permission. Third-party libraries remain under their own licenses.
