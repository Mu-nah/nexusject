# Nexus One — Changelog

All notable changes to Nexus One are documented here.

---

## [1.0.0] — Phase 1 Complete — May 2026

### Added — Finance Module
- **Accounts Receivable (AR)** — Invoice generation, customer register, aged debtors (4-bucket analysis), receipt allocation, credit control chase schedule
- **Accounts Payable (AP)** — Supplier invoice approval workflow (Pending → Approved → Paid), supplier register with bank details, aged creditors analysis, payment batch runs, purchase order management with 3-way matching
- **VAT & Making Tax Digital** — Box 1/4/5 VAT return calculator from live AR/AP data, VAT transactions ledger by rate, MTD submission integration point, EC Sales List, VAT rates reference panel
- **Budgets & FP&A** — 8-line budget register, Budget vs Actual with variance alerts, departmental budget summary, full-year forecast model, AI-generated variance narrative
- **Cash Flow Forecast** — 13-week rolling weekly model from live payroll + invoices, 3-scenario modelling (Optimistic/Base/Stress), Runway Calculator with days-to-zero date projection, AI cash flow recommendations
- **Financial Reports** — FRS 102 P&L, Balance Sheet, Cash Flow Statement; AI Management Accounts with CFO commentary; AI Board Pack (7 sections); SORP-compliant SoFA with restricted/unrestricted fund split; Companies House data panel with filing deadlines; Custom Report Builder

### Added — HR Module (Phase 1 Completion)
- Complete payroll engine with HMRC PAYE/NI/pension/NMW validation
- RTI FPS/EPS submission tracking
- P60, P45, P11D, P11D(b) generation workflows
- All 10 UKVI reporting duties with deadline tracking

### Added — Compliance & Governance
- **GDPR** — DSAR workflow with 30-day deadline tracking, Article 30 ROPA (5 processing activities), data retention register (6 categories with legal bases)
- **Security Centre** — 2FA setup flows (TOTP + SMS), active session management with revoke, encryption status audit, ISO 27001 gap analysis (10 Annex A controls), compliance certification roadmap
- **Governance** — Trustee/Director register fully wired, conflict of interest panel

### Added — Navigation & Architecture
- Sidebar Finance section now includes: AR & Invoicing, AP & Suppliers, VAT & MTD, Budgets & FP&A, Cash Flow Forecast
- META breadcrumb entries for all 36 pages
- nav() routing for all new pages
- initPhase1Data() seed function with realistic Harvest Touch demo data
- 48 render functions, 30+ save functions, 11 AI functions

### Fixed
- `buildCharts()` missing closing brace (caused all subsequent functions to parse as nested)
- `renderDonations()` null crash when page elements absent — rewrote with `safeTXT()`/`safeHTML()` null-safe helpers
- Duplicate `renderPayroll()` function removed
- £ symbol used as JS identifier renamed to `fmt()` / `fmt2()` across 29 call sites
- `setPeriod()` tab selector corrected to `.tb-actions .tab`
- `page-donations`, `page-grants`, `page-programmes` re-injected (dropped during HR module build)
- 11 `safeHTML()` call sites with paren imbalances corrected
- Compliance section `dept-label` missing opening `<div>` tag
- Template literal nested quotes in `renderGrants` rewritten with string concatenation

---

## [0.9.0] — HR Module Build — April 2026

### Added
- Complete People & HR module (10 sub-pages)
- UKVI & Sponsorship module (5 sub-pages, best-in-class)
- Admin Portal with 6-tier RBAC permission matrix
- Immutable audit log
- Dark/light theme toggle

---

## [0.8.0] — Core Finance Build — March 2026

### Added
- Executive Dashboard with live stat cards and Chart.js charts
- AI Intelligence module with real Claude Sonnet API
- Accounting ledger with double-entry journals
- Expense management with approval workflow
- Donation platform with Gift Aid tracking
- Grant management with utilisation tracking
- Programme budget management

---

*Realtouch Global Ventures Ltd | Nexus One*
