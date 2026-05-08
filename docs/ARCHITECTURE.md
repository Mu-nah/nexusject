# Nexus One — Technical Architecture
## Phase 1 (Prototype) → Production Blueprint
### Realtouch Global Ventures Ltd

---

## Phase 1: Single-File Architecture

The Phase 1 deliverable is a self-contained HTML application requiring no server, no build step, and no dependencies to install.

```
nexus-one.html (384 KB)
│
├── <head>
│   ├── Google Fonts (CDN): Instrument Sans, Instrument Serif, JetBrains Mono
│   ├── Chart.js (CDN): v4.x
│   └── <style> (3,200+ lines of inline CSS)
│       ├── CSS Custom Properties (theme variables: dark/light)
│       ├── Layout (sidebar, main, topbar, content)
│       ├── Components (stat-card, panel, dt table, badge, btn, modal)
│       └── Page-specific styles
│
├── <body>
│   ├── <aside class="sidebar">     Navigation (36 routes)
│   ├── <main class="main">
│   │   ├── .topbar                 Search, period selector, notifications, AI chat
│   │   └── .content
│   │       ├── #page-dashboard     (active on load)
│   │       ├── #page-ai
│   │       ├── ... (34 more pages, all present in DOM, display:none until active)
│   │       └── #page-admin
│   └── <!-- 20+ modal overlays -->
│
└── <script> (4,800+ lines of inline JS)
    ├── Null-safe helpers: safeHTML(), safeTXT(), safeEl()
    ├── Data Layer
    │   ├── DEFAULT_DATA (seed data for demo)
    │   ├── loadData() / saveData() (localStorage persistence)
    │   └── logAudit() (immutable audit trail)
    ├── Theme System: applyTheme(), toggleTheme()
    ├── Navigation Engine
    │   ├── META{} (36 page title/path entries)
    │   ├── nav(id, subtab) (route + render dispatch)
    │   └── toggleSub(), setPeriod()
    ├── Modal System: openModal(), closeModal()
    ├── Chart Engine: buildCharts(), destroyCharts()
    ├── AI Intelligence Layer
    │   ├── buildSystemPrompt() (live data injection)
    │   ├── callClaude() (Anthropic API)
    │   └── sendMsg() (chat interface)
    ├── Finance Render Functions (14 modules)
    ├── HR Render Functions (20 modules)
    ├── UKVI Render Functions (5 modules)
    ├── Compliance Render Functions (4 modules)
    ├── Security/Admin Render Functions (6 modules)
    ├── Phase 1 New Modules (9 modules)
    │   ├── initPhase1Data()
    │   ├── AR: renderAR(), renderARInvoices(), renderARCustomers()...
    │   ├── AP: renderAP(), renderAPInvoices(), renderAPSuppliers()...
    │   ├── VAT: renderVAT(), renderVATTransactions(), calculateVAT()...
    │   ├── Budgets: renderBudgets(), renderBudgetTable()...
    │   ├── Cashflow: renderCashflow(), render13WeekForecast()...
    │   ├── Security: renderSecurity(), render2FATable()...
    │   ├── GDPR: renderGDPR()
    │   ├── Governance: renderGovernance()
    │   └── Reports: renderReports(), renderSoFA(), aiBoardPack()...
    ├── 30+ Save Functions (CRUD operations)
    ├── AI Action Functions (aiCashFlowForecast, aiBoardPack, etc.)
    └── Boot sequence: loadData(), applyTheme(), renderDashboard(), buildCharts()
```

---

## Production Architecture (Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS ONE CLOUD                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  CloudFront  │    │    Next.js   │    │   FastAPI        │  │
│  │  (CDN/WAF)   │───▶│  Frontend   │───▶│   Backend        │  │
│  └──────────────┘    │  (SSR/PWA)  │    │  (Python 3.11)   │  │
│                      └──────────────┘    └────────┬─────────┘  │
│                                                   │            │
│                    ┌──────────────────────────────┤            │
│                    │                              │            │
│           ┌────────▼───────┐          ┌──────────▼──────────┐  │
│           │  PostgreSQL 16  │          │      Redis 7         │  │
│           │  (Multi-tenant) │          │  (Cache/Sessions/    │  │
│           │  RLS enabled    │          │   JWT Blacklist)     │  │
│           └────────────────┘          └─────────────────────┘  │
│                                                                 │
│           ┌────────────────┐          ┌─────────────────────┐  │
│           │   Celery        │          │    Elasticsearch    │  │
│           │   Workers       │          │    (Full-text)      │  │
│           │  (Payroll/RTI/  │          └─────────────────────┘  │
│           │   Reports)      │                                   │
│           └────────────────┘                                   │
│                                                                 │
│           ┌────────────────┐          ┌─────────────────────┐  │
│           │    AWS S3       │          │   Claude Sonnet     │  │
│           │  (Payslips/     │          │   API (Anthropic)   │  │
│           │   Contracts/    │          │   [Server-side      │  │
│           │   DBS certs)    │          │    proxy only]      │  │
│           └────────────────┘          └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

External APIs:
├── HMRC Government Gateway (RTI, MTD VAT, PAYE)
├── Companies House (company data, filing deadlines)
├── UKVI / Home Office (Share Code RTW verification)
├── NEST Pension (auto-enrolment file submission)
├── Plaid / TrueLayer (Open Banking)
├── Stripe / GoCardless (payments)
├── DocuSign / Adobe Sign (e-signatures)
└── Twilio (SMS 2FA)
```

---

## Multi-Tenancy Model

```
Database Strategy:
├── SME Tier (< 100 employees): Schema-per-tenant
│   └── PostgreSQL schema isolation with RLS
│       nexus_tenant_abc123.employees
│       nexus_tenant_abc123.transactions
│       ...
│
└── Enterprise Tier (> 100 employees): Database-per-tenant
    └── Complete database isolation
        ├── Meets HIPAA, SOX data residency requirements
        ├── Independent backup/restore per tenant
        └── EU data residency option (Frankfurt RDS)
```

---

## Security Architecture

```
Authentication Flow:
User → HTTPS → CloudFront WAF → Next.js → FastAPI
                                           │
                                    ┌──────▼──────┐
                                    │ Auth Service │
                                    │             │
                                    │ JWT (RS256) │
                                    │ 15min access│
                                    │ 7day refresh│
                                    │             │
                                    │ Redis       │
                                    │ blacklist   │
                                    └─────────────┘

Field Encryption:
┌─────────────────────────────────────────────────┐
│ Sensitive fields encrypted before DB storage:   │
│                                                 │
│  NI Number:        AES-256-GCM + unique IV      │
│  Bank Account:     AES-256-GCM + unique IV      │
│  Sort Code:        AES-256-GCM + unique IV      │
│  Passport No.:     AES-256-GCM + unique IV      │
│  Medical data:     AES-256-GCM + unique IV      │
│  API Keys:         AWS Secrets Manager          │
│                                                 │
│  Key Management:   AWS KMS (automatic rotation) │
└─────────────────────────────────────────────────┘
```

---

## AI Architecture

```
AI Intelligence Layer:

User Query → Frontend → FastAPI /ai/assistant
                              │
                    ┌─────────▼──────────┐
                    │  System Prompt     │
                    │  Builder           │
                    │                   │
                    │  Injects:          │
                    │  - Live financials │
                    │  - Payroll data    │
                    │  - Grant status    │
                    │  - HR alerts       │
                    │  - Compliance gaps │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Anthropic API     │
                    │  Claude Sonnet     │
                    │  claude-sonnet-    │
                    │  4-20250514        │
                    │                   │
                    │  Key: Server-side  │
                    │  Never in client  │
                    └─────────┬──────────┘
                              │
                    Streaming response → Frontend
```

---

*Realtouch Global Ventures Ltd | Nexus One Architecture v1.0 | May 2026*
