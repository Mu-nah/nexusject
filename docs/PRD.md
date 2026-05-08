# Nexus One — Product Requirements Document (PRD)
## Version 1.0 | Phase 1 Complete | April 2026
### Realtouch Global Ventures Ltd — CONFIDENTIAL

---

## 1. Product Vision

**Mission:** Replace the entire stack of CFO, HR Director, COO, and compliance software with a single AI-powered platform that any organisation in the world can use from day one — at a fraction of the cost of incumbent enterprise systems.

**Target State:** Nexus One becomes the dominant AI enterprise operating system for UK SMEs, charities, CICs, and African businesses by 2028, with £10M ARR from 5,000+ organisations across the UK, Nigeria, UAE, and South Africa.

**Core Value Proposition:**
- One platform replaces: Xero + BrightHR + Compliance software + Grant management + UKVI tools
- Real AI intelligence (not chatbot bolted on) — knows live financial and HR data
- UK-first compliance depth no competitor matches at this price point
- First enterprise platform designed for African markets from the ground up

---

## 2. Product Architecture

### 2.1 Single-File Frontend (Phase 1)
The Phase 1 deliverable is a production-quality single-file HTML application:

- **File:** `nexus-one.html` (384 KB, self-contained)
- **Dependencies:** Chart.js (CDN only), Google Fonts (CDN only)
- **Storage:** `localStorage` (prototype); PostgreSQL (production)
- **AI:** Anthropic Claude Sonnet API (`claude-sonnet-4-20250514`)
- **Compatibility:** All modern browsers (Chrome, Firefox, Safari, Edge)

### 2.2 Production Backend (Phase 2)
Target production stack:

```
Frontend:   Next.js 14 + TypeScript (SSR, PWA)
API:        FastAPI (Python 3.11), async, REST + GraphQL
Database:   PostgreSQL 16 (schema-per-tenant SME, DB-per-tenant enterprise)
Cache:      Redis 7 (JWT blacklist, session store, rate limiting)
AI:         Anthropic Claude Sonnet (server-side proxy, key injection)
Queue:      Celery + Redis (payroll runs, RTI submissions, reports)
Storage:    AWS S3 / Azure Blob (payslips, contracts, DBS certs)
Search:     Elasticsearch 8 (full-text across all records)
Infra:      Kubernetes on AWS EKS (auto-scaling, zero-downtime)
```

### 2.3 Security Architecture (Production Requirements)
- AES-256-GCM field-level encryption: NI numbers, bank details, passport numbers, medical data
- JWT RS256 with Redis blacklist and 15-minute access token rotation
- bcrypt/Argon2 for password hashing
- TLS 1.3 minimum on all API traffic
- Row-level security in PostgreSQL (users see only their tenant's data)
- Rate limiting: 100 req/min per user, 1000 req/min per tenant
- 2FA enforcement (TOTP mandatory for Super Admin, optional for others in v1)
- Immutable audit log with cryptographic signing
- OWASP Top 10 compliance before any production data ingestion

---

## 3. Phase 1 Requirements — COMPLETE

### 3.1 Module Inventory (36 Pages)

#### Overview
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-01 | Executive Dashboard | `dashboard` | `renderDashboard()` | ✅ |
| P-02 | AI Intelligence | `ai` | `sendMsg()` | ✅ |

#### Finance
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-03 | Accounting Ledger | `accounting` | `renderAccounting()` | ✅ |
| P-04 | Expense Management | `expenses` | `renderExpenses()` | ✅ |
| P-05 | Donation Platform | `donations` | `renderDonations()` | ✅ |
| P-06 | Financial Reports | `reports` | `renderReports()` | ✅ |
| P-07 | AR & Invoicing | `ar` | `renderAR()` | ✅ |
| P-08 | AP & Suppliers | `ap` | `renderAP()` | ✅ |
| P-09 | VAT & MTD | `vat` | `renderVAT()` | ✅ |
| P-10 | Budgets & FP&A | `budgets` | `renderBudgets()` | ✅ |
| P-11 | Cash Flow Forecast | `cashflow` | `renderCashflow()` | ✅ |

#### Operations
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-12 | Grant Management | `grants` | `renderGrants()` | ✅ |
| P-13 | Programme Budgets | `programmes` | `renderProgrammes()` | ✅ |

#### People & HR
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-14 | Payroll Engine | `payroll` | `renderPayroll()` | ✅ |
| P-15 | Employee Register | `hr_emp` | `renderHREmp()` | ✅ |
| P-16 | HR Onboarding | `hr_onboard` | `renderOnboard()` | ✅ |
| P-17 | Contracts & Docs | `hr_contracts` | `renderContracts()` | ✅ |
| P-18 | Right to Work | `hr_rtw` | `renderRTW()` | ✅ |
| P-19 | DBS & Safeguarding | `hr_dbs` | `renderDBS()` | ✅ |
| P-20 | Leave Management | `hr_leave` | `renderLeave()` | ✅ |
| P-21 | Performance | `hr_perf` | `renderPerf()` | ✅ |
| P-22 | Disciplinary | `hr_disc` | `renderDisc()` | ✅ |
| P-23 | Training & CPD | `hr_training` | `renderTraining()` | ✅ |
| P-24 | Equality & Diversity | `hr_equality` | `renderEquality()` | ✅ |
| P-25 | Rota & Timesheets | `hr_rota` | `renderRota()` | ✅ |
| P-26 | Volunteers | `volunteers` | `renderVolunteers()` | ✅ |

#### UKVI & Sponsorship
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-27 | Sponsor Licence | `ukvi_licence` | `renderUKVILicence()` | ✅ |
| P-28 | Sponsored Workers | `ukvi_workers` | `renderUKVIWorkers()` | ✅ |
| P-29 | Certificate of Sponsorship | `ukvi_cos` | `renderUKVICOS()` | ✅ |
| P-30 | Reporting Duties | `ukvi_duties` | `renderUKVIDuties()` | ✅ |
| P-31 | Audit Pack | `ukvi_audit` | `renderUKVIAudit()` | ✅ |

#### Compliance & Governance
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-32 | Compliance Hub | `compliance` | `renderCompliance()` | ✅ |
| P-33 | GDPR & Data | `gdpr` | `renderGDPR()` | ✅ |
| P-34 | Governance | `governance` | `renderGovernance()` | ✅ |

#### System
| ID | Page | Nav Route | Render Fn | Status |
|----|------|-----------|-----------|--------|
| P-35 | Security Centre | `security` | `renderSecurity()` | ✅ |
| P-36 | Admin Portal | `admin` | `renderAdmin()` | ✅ |

### 3.2 Function Inventory

**Render Functions (48 total):**
`renderDashboard`, `renderDonations`, `renderGrants`, `renderProgrammes`, `renderPayroll`, `renderHREmp`, `renderOrgChart`, `renderHeadcount`, `renderLeave`, `renderLeaveBalances`, `renderBradfordTab`, `renderStatutoryTab`, `renderPerf`, `renderDisc`, `renderTraining`, `renderEquality`, `renderRota`, `renderOnboard`, `renderContracts`, `renderRTW`, `renderDBS`, `renderVolunteers`, `renderVolHours`, `renderVolAgreements`, `renderUKVILicence`, `renderUKVIWorkers`, `renderUKVICOS`, `renderUKVIDuties`, `renderUKVIAudit`, `renderCompliance`, `renderAccounting`, `renderJournals`, `renderBankAccounts`, `renderAdmin`, `renderAdminUsers`, `renderModules`, `renderPermMatrix`, `renderAuditLog`, `renderSystemConfig`, `renderAR`, `renderARInvoices`, `renderARCustomers`, `renderARAged`, `renderARReceipts`, `renderARCredit`, `renderAP`, `renderAPInvoices`, `renderAPSuppliers`, `renderAPAged`, `renderAPPayments`, `renderAPPO`, `renderVAT`, `renderVATTransactions`, `renderBudgets`, `renderBudgetTable`, `renderBudgetDept`, `renderBudgetVariance`, `renderBudgetForecast`, `renderCashflow`, `render13WeekForecast`, `renderCFScenarios`, `renderCFRunway`, `renderSecurity`, `render2FATable`, `renderSecSessions`, `renderSecEncryption`, `renderSecAuditLog`, `renderSecCerts`, `renderGDPR`, `renderGovernance`, `renderReports`, `renderMgmtAccounts`, `renderSoFA`, `renderCHData`, `renderPayRunTab`, `renderPayRunHistory`, `renderP60Tab`, `renderP11DTab`, `renderPensionTab`, `renderRTITab`

**Save/Action Functions (30+ total):**
`saveNewEntry`, `saveEmployee`, `saveDonation`, `saveRTW`, `saveDBS`, `saveTrustee`, `saveLeave`, `saveVolunteer`, `saveInviteUser`, `saveTenant`, `saveAccount`, `saveJournal`, `saveLeaver`, `saveP11D`, `saveSafeguarding`, `saveTraining`, `saveReview`, `saveDisc`, `saveContract`, `saveSponsoredWorker`, `saveCOS`, `saveDuty`, `saveLicence`, `saveInvoice`, `saveCustomer`, `saveReceipt`, `saveSupInvoice`, `saveSupplier`, `savePO`, `saveBudget`

**AI Functions:**
`callClaude`, `sendMsg`, `buildSystemPrompt`, `aiGrantReport`, `aiAnalyseVariance`, `aiCashFlowForecast`, `aiScenarioAnalysis`, `aiRunwayAdvice`, `aiGenerateAccounts`, `aiManagementAccounts`, `aiBoardPack`

### 3.3 Data Model

```typescript
interface NexusOneData {
  // Core
  employees:          Employee[];
  transactions:       Transaction[];
  expenses:           Expense[];
  grants:             Grant[];
  donations:          Donation[];
  trustees:           Trustee[];
  auditLog:           AuditEntry[];
  chatHistory:        ChatMessage[];
  theme:              'dark' | 'light';
  
  // Finance
  accounts:           Account[];
  journals:           Journal[];
  payrollRuns:        PayrollRun[];
  p11d:               P11DRecord[];
  invoices:           Invoice[];          // AR
  customers:          Customer[];
  supInvoices:        SupplierInvoice[];  // AP
  suppliers:          Supplier[];
  purchaseOrders:     PurchaseOrder[];
  budgetLines:        BudgetLine[];
  vatReturns:         VATReturn[];
  
  // HR
  rtw:                RTWRecord[];
  dbs:                DBSRecord[];
  volunteers:         Volunteer[];
  leaveRecords:       LeaveRecord[];
  leaveBalances:      Record<number, LeaveBalance>;
  performanceReviews: PerformanceReview[];
  disciplinary:       DisciplinaryCase[];
  safeguardingTraining: SafeguardingRecord[];
  trainingRecords:    TrainingRecord[];
  contracts:          ContractRecord[];
  
  // UKVI
  sponsoredWorkers:   SponsoredWorker[];
  cosList:            COS[];
  ukviDuties:         ReportableDuty[];
  ukviLicence:        UKVILicence;
  
  // Security
  sessions:           Session[];
}
```

---

## 4. Phase 2 Requirements

### 4.1 Applicant Tracking System (ATS)
- Multi-channel job posting (LinkedIn, Indeed, company careers page)
- AI-powered CV screening using Claude — ranks candidates against JD
- Interview scheduling with calendar integration (Google/Outlook Calendar API)
- Offer management with automatic payroll record creation on acceptance
- RTW digital check via UKVI Share Code API on offer acceptance
- Diversity analytics — Rooney Rule compliance, bias-reduction alerts

### 4.2 Learning Management System (LMS)
- In-platform course builder (video, quiz, certificate modules)
- SCORM-compatible import of existing training content
- Mandatory training assignment by role with automatic escalation
- AI-generated training content using Claude (policies, procedures, compliance briefings)
- CPD body integration: CIPD, CIMA, ACCA, SRA

### 4.3 Open Banking Integration
- Plaid / TrueLayer API for UK bank balance aggregation
- Automatic transaction categorisation (ML model)
- Bank reconciliation automation (match bank feed to GL entries)
- Cash position dashboard with real-time balance
- Multi-bank support (Barclays, HSBC, Lloyds, NatWest, Starling, Monzo)

### 4.4 Live Government API Integrations
- **HMRC RTI API** — Live FPS/EPS submission to Government Gateway (OAuth 2.0)
- **MTD VAT API** — Live VAT return submission with obligation tracking
- **Companies House API** — Auto-populate company data, filing deadline tracking
- **UKVI Digital RTW** — Share Code verification (Home Office API)
- **NEST Pension API** — Auto-enrolment contribution file submission
- **DBS Update Service API** — Instant online status checks at £13/year

### 4.5 Industry Modules
- **FCA SMCR** — Senior Managers Certification Regime register, conduct rules training tracker
- **CQC Module** — Safe staffing levels, KLOEs tracking, notifiable events log
- **Ofsted Module** — Safeguarding framework, EHCP/SEN management, attendance monitoring
- **CIS Module** — Construction Industry Scheme monthly returns, subcontractor management

### 4.6 Employee Self-Service Portal
- Mobile-first PWA (iOS/Android installable)
- View payslips, P60, P11D
- Request and track leave
- Complete and submit training
- Access HR documents
- Manager approval workflows (leave, expenses, timesheets)
- On-demand pay (earned wage access via integration)

### 4.7 Backend & Production Hardening
- FastAPI backend deployment (AWS/Azure)
- AES-256 field-level encryption for all PII
- SOC 2 Type I assessment
- ISO 27001 gap analysis and controls implementation
- Multi-tenant database architecture
- Automated encrypted backups (point-in-time recovery)
- Load testing to 10,000 concurrent users

---

## 5. Phase 3 Requirements — Global

### 5.1 United States
- Federal payroll: FICA (SS 6.2%, Medicare 1.45%), FUTA 6%, W-2, W-4, Form 941
- All 50 states: income tax tables, SUI rates, state-specific compliance
- FLSA overtime rules, FMLA leave tracking, ADA accommodation register
- US GAAP chart of accounts (FASB ASC), ASC 606 revenue recognition
- 1099 contractor management (NEC, MISC, DIV)
- SOX Section 302/404 controls documentation
- HIPAA compliance module (PHI handling, BAA management)

### 5.2 European Union
- EU-wide GDPR (SCCs for data transfers, DPA agreements)
- Works Council consultation workflows (Germany, France, Netherlands)
- Country-by-country payroll: Germany (Lohnsteuer, Sozialversicherung), France (DSN), Netherlands (loonheffing)
- DORA (Digital Operational Resilience Act) compliance for EU financial services

### 5.3 Africa
- **Nigeria:** PAYE by state, Pension (PenCom 10%+8%), ITF, NHF, NSITF, FIRS TaxPro filing
- **South Africa:** SARS PAYE, UIF (2%), SDL (1%), ETI, EMP201/501, Employment Equity reporting, BBBEE
- **Kenya:** NSSF, SHA (Social Health Authority 2024), PAYE (KRA), NHIF
- **Ghana:** SSNIT, PAYE (GRA), Tier 1/2/3 pension
- Pan-African compliance as market differentiator — first enterprise system to fully serve African businesses

### 5.4 Middle East & Gulf
- UAE: WPS (Wage Protection System) SIF file, EOSB calculation, DIFC/ADGM labour law
- Saudi Arabia: GOSI, Nitaqat Saudisation compliance, VAT (15%), Muqeem tracking

---

## 6. Phase 4 Requirements — AI Autonomy

### 6.1 Autonomous AI CFO
- Month-end close automation: AI executes closing checklist, posts accruals, reconciles accounts, generates management accounts — without human initiation
- Real-time financial health score updated every 15 minutes
- Predictive cash crisis alerts: "At current burn you reach £0 in 47 days — here are 3 actions"
- AI-generated statutory accounts: Companies House-ready with full note disclosures
- Investor relations pack generator: pitch deck financials, data room documents, DD Q&A

### 6.2 Autonomous AI HR Director
- Predictive turnover analysis: identify at-risk employees 90 days before resignation
- AI-driven pay equity audit: quarterly, with gender/ethnicity/age intersectionality
- Automated compliance calendar: every HR/payroll/legal deadline for every jurisdiction populated
- Workforce planning: headcount optimisation, succession planning, skills gap analysis

### 6.3 Agentic Operations
- OKR framework with AI-generated strategic insights
- Supplier risk management with AI contract review
- Self-healing workflows: AI detects broken processes and suggests fixes

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Dashboard load time: < 300ms on 4G mobile
- AI query response: < 3 seconds (95th percentile)
- Payroll run (500 employees): < 30 seconds
- Report generation: < 5 seconds
- Uptime SLA: 99.9% (< 8.76 hours downtime/year)

### 7.2 Security
- Penetration test: annual external test + continuous automated scanning
- Data encryption: AES-256-GCM at rest, TLS 1.3 in transit
- Access control: RBAC with 6 tiers (Super Admin → Read Only)
- Session management: JWT with 15-minute access tokens, 7-day refresh tokens
- Audit logging: 100% of write operations, immutable, 7-year retention
- GDPR Article 17: erasure within 30 days of request
- GDPR Article 20: data export within 30 days of request

### 7.3 Scalability
- Horizontal scaling via Kubernetes (auto-scale 2–50 pods)
- Database connection pooling (PgBouncer)
- CDN for static assets
- Background job queue for payroll, reports, bulk operations
- Target: 10,000 concurrent users, 1M employees under management

### 7.4 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation on all interactive elements
- Screen reader compatible (ARIA labels)
- High-contrast theme option

---

## 8. Pricing Architecture

| Tier | Price | Users | Modules | Target |
|------|-------|-------|---------|--------|
| Starter | £25/mo flat | 1 | Core accounting + 1 payroll | Sole traders, micro |
| Grow | £75/mo + £8/user | Up to 50 | Full CFO + HR + UKVI + GDPR | SMEs 5-50 staff |
| Scale | £250/mo + £15/user | Up to 500 | All Grow + FP&A + LMS + ATS | 100-500 employees |
| Enterprise | Custom (from £2k/mo) | Unlimited | Everything + white-label + SLA | 500+ multi-country |
| Charity/CIC | 50% discount | Any | Full platform | Registered charities/CICs |

---

## 9. Go-to-Market

### Phase 1 (Immediate — UK Focus)
1. **UK charities & CICs** — 170,000+ registered organisations, deeply underserved by existing tools, SORP compliance differentiator
2. **UK SMEs with sponsored workers** — 200,000+ UKVI licence holders, unique value proposition no competitor matches
3. **UK startups / scale-ups** — All-in-one replaces Xero + BrightHR + compliance stack at lower total cost

### Phase 2 (6-18 Months — Sector Expansion)
- UK professional services firms (FCA, SRA, CQC regulated)
- UK healthcare providers (primary care networks, dental groups, care homes)
- Nigerian businesses (2.5M+ registered companies, no dominant all-in-one)

### Phase 3 (18-36 Months — International)
- Pan-African market (Nigeria, South Africa, Kenya, Ghana, Rwanda)
- Middle East (UAE, Saudi Arabia — large expatriate workforce)
- US market entry (HIPAA, SOX, state-by-state payroll)

---

## 10. Success Metrics

| Metric | 12-Month Target | 36-Month Target |
|--------|----------------|-----------------|
| Paying organisations | 500 | 5,000 |
| ARR | £500K | £10M |
| UK charities/CICs | 300 | 2,000 |
| Net Promoter Score | > 60 | > 70 |
| Payrolled employees | 5,000 | 100,000 |
| AI queries/month | 50,000 | 2,000,000 |
| Countries supported | 1 (UK) | 8+ |
| Compliance frameworks | 12 | 30+ |

---

## Appendix A: Compliance Framework Master List

See [COMPLIANCE.md](./COMPLIANCE.md) for the full 47-framework compliance matrix.

## Appendix B: API Integration Roadmap

| API | Phase | Auth | Priority |
|-----|-------|------|----------|
| HMRC RTI | 2 | OAuth 2.0 (Government Gateway) | P1 |
| HMRC MTD VAT | 2 | OAuth 2.0 | P1 |
| Companies House | 2 | API Key | P1 |
| UKVI Share Code | 2 | API Key (Home Office) | P1 |
| NEST Pension | 2 | API Key | P2 |
| Plaid (Open Banking) | 2 | OAuth 2.0 | P2 |
| TrueLayer (Open Banking) | 2 | OAuth 2.0 | P2 |
| Stripe (Payments) | 2 | API Key | P2 |
| DocuSign | 2 | OAuth 2.0 | P2 |
| SARS eFiling | 3 | OAuth 2.0 | P3 |
| FIRS TaxPro | 3 | API Key | P3 |
| IRS e-file | 3 | OAuth 2.0 | P3 |

---

*Document version: 1.0 | Last updated: May 2026 | Owner: Dominic Ogbuagu, CTO*
*Classification: CONFIDENTIAL — Realtouch Global Ventures Ltd*
