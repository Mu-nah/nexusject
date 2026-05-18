import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, Alert, StatCard, DataTable, FormInput } from '@/components/ui'
import { downloadCsvFile, downloadPageSummary } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'ropa' | 'breaches'

// ── ROPA types ────────────────────────────────────────────────────────────
type LawfulBasis = 'Consent' | 'Legitimate Interests' | 'Legal Obligation' | 'Vital Interests' | 'Public Task' | 'Contract'
type ROPAStatus = 'Documented' | 'Under Review' | 'Needs Update'

interface ROPAEntry {
  id: number
  activity: string
  purpose: string
  dataSubjects: string
  personalDataCategories: string
  specialCategories: boolean
  recipients: string
  retention: string
  lawfulBasis: LawfulBasis
  status: ROPAStatus
}

const INITIAL_ROPA: ROPAEntry[] = [
  { id: 1, activity: 'Payroll Processing', purpose: 'Calculate and pay employee salaries, PAYE, NI', dataSubjects: 'Employees', personalDataCategories: 'Name, NI number, bank details, salary, tax code', specialCategories: false, recipients: 'HMRC, pension provider', retention: '6 years after leaving', lawfulBasis: 'Legal Obligation', status: 'Documented' },
  { id: 2, activity: 'Beneficiary Support Records', purpose: 'Deliver programme services and track outcomes', dataSubjects: 'Service users / beneficiaries', personalDataCategories: 'Name, DOB, contact, programme notes', specialCategories: true, recipients: 'Programme staff only', retention: '7 years', lawfulBasis: 'Public Task', status: 'Under Review' },
  { id: 3, activity: 'Donor Gift Aid Claims', purpose: 'HMRC Gift Aid submissions', dataSubjects: 'Donors', personalDataCategories: 'Name, address, donation amount, Gift Aid declaration', specialCategories: false, recipients: 'HMRC', retention: '7 years', lawfulBasis: 'Legal Obligation', status: 'Documented' },
  { id: 4, activity: 'Volunteer Management', purpose: 'Recruit, onboard and manage volunteers', dataSubjects: 'Volunteers', personalDataCategories: 'Name, contact, DBS status, availability', specialCategories: false, recipients: 'HR team, DBS service', retention: '3 years after leaving', lawfulBasis: 'Legitimate Interests', status: 'Needs Update' },
  { id: 5, activity: 'CCTV Surveillance', purpose: 'Premises security and safety', dataSubjects: 'Staff, visitors, public', personalDataCategories: 'Images / footage', specialCategories: false, recipients: 'Security team, police if required', retention: '30 days', lawfulBasis: 'Legitimate Interests', status: 'Documented' },
]

const ROPA_STATUS_COLORS: Record<ROPAStatus, string> = {
  'Documented': 'green',
  'Under Review': 'amber',
  'Needs Update': 'red',
}

const LAWFUL_BASIS_COLORS: Record<LawfulBasis, string> = {
  'Consent': 'green',
  'Legitimate Interests': 'blue',
  'Legal Obligation': 'amber',
  'Vital Interests': 'red',
  'Public Task': 'purple',
  'Contract': 'grey',
}

// ── Breach Notification types ─────────────────────────────────────────────
type BreachStatus = 'Assessing' | 'ICO Notified' | 'Contained' | 'Closed' | 'No Notification Required'
type BreachSeverity = 'High' | 'Medium' | 'Low'

interface BreachIncident {
  id: number
  title: string
  discoveredAt: string
  reportedAt: string | null
  status: BreachStatus
  severity: BreachSeverity
  dataCategories: string
  individualsAffected: number | null
  consequences: string
  actionsTaken: string
  icoReference: string | null
}

const INITIAL_BREACHES: BreachIncident[] = [
  { id: 1, title: 'Misdirected email containing staff payslips', discoveredAt: '2026-05-10T09:30:00', reportedAt: '2026-05-11T14:00:00', status: 'ICO Notified', severity: 'High', dataCategories: 'Financial data, NI numbers', individualsAffected: 3, consequences: 'Personal financial data exposed to wrong recipient', actionsTaken: 'Email recalled, recipient confirmed deletion, staff notified, encryption controls reviewed', icoReference: 'ZA-2026-12345' },
  { id: 2, title: 'Lost encrypted laptop — Finance Manager', discoveredAt: '2026-04-28T16:00:00', reportedAt: null, status: 'No Notification Required', severity: 'Low', dataCategories: 'Encrypted financial spreadsheets', individualsAffected: 0, consequences: 'Device encrypted; no data at risk. ICO threshold not met.', actionsTaken: 'Remote wipe initiated, incident documented, device insurance claim filed', icoReference: null },
]

const BREACH_STATUS_COLORS: Record<BreachStatus, string> = {
  'Assessing': 'amber',
  'ICO Notified': 'blue',
  'Contained': 'green',
  'Closed': 'slate',
  'No Notification Required': 'slate',
}

const BREACH_SEVERITY_COLORS: Record<BreachSeverity, string> = {
  'High': 'red', 'Medium': 'amber', 'Low': 'green',
}

function hoursElapsed(discoveredAt: string): number {
  return Math.floor((Date.now() - new Date(discoveredAt).getTime()) / (1000 * 60 * 60))
}

const INITIAL_DSARS: Array<{ subject: string; type: string; received: string; deadline: string; status: string; variant: string }> = []

export default function GDPR() {
  const [tab, setTab] = useState<Tab>('overview')
  const [dsars, setDsars] = useState(INITIAL_DSARS)
  const [subjectName, setSubjectName] = useState('')
  const [subjectType, setSubjectType] = useState('Access Request')
  const [ropaEntries, setRopaEntries] = useState<ROPAEntry[]>(INITIAL_ROPA)
  const [ropaSearch, setRopaSearch] = useState('')
  const [breaches, setBreaches] = useState<BreachIncident[]>(INITIAL_BREACHES)
  const [showBreachForm, setShowBreachForm] = useState(false)
  const [breachTitle, setBreachTitle] = useState('')
  const [breachCategories, setBreachCategories] = useState('')
  const [breachAffected, setBreachAffected] = useState('')
  const [breachConsequences, setBreachConsequences] = useState('')
  const [breachSeverity, setBreachSeverity] = useState<BreachSeverity>('Medium')

  const exportData = () => {
    downloadPageSummary('gdpr-data-export.txt', 'GDPR & Data Snapshot', [
      `Open DSARs: ${dsars.length}`,
      `ROPA entries: ${ropaEntries.length}`,
      `Active breach incidents: ${breaches.filter(b => b.status === 'Assessing' || b.status === 'ICO Notified').length}`,
    ])
  }

  const logDsar = () => {
    if (!subjectName.trim()) { toast.error('Enter a data subject name first'); return }
    const received = new Date()
    const deadline = new Date(received.getTime() + 30 * 24 * 60 * 60 * 1000)
    setDsars((current) => [
      { subject: subjectName.trim(), type: subjectType, received: received.toLocaleDateString('en-GB'), deadline: deadline.toLocaleDateString('en-GB'), status: 'Open', variant: 'amber' },
      ...current,
    ])
    setSubjectName('')
    toast.success('DSAR logged — 30-day clock started')
  }

  const logBreach = () => {
    if (!breachTitle.trim()) { toast.error('Enter a breach title'); return }
    const newBreach: BreachIncident = {
      id: breaches.length + 10,
      title: breachTitle,
      discoveredAt: new Date().toISOString(),
      reportedAt: null,
      status: 'Assessing',
      severity: breachSeverity,
      dataCategories: breachCategories,
      individualsAffected: breachAffected ? Number(breachAffected) : null,
      consequences: breachConsequences,
      actionsTaken: '',
      icoReference: null,
    }
    setBreaches(prev => [newBreach, ...prev])
    setBreachTitle(''); setBreachCategories(''); setBreachAffected(''); setBreachConsequences('')
    setShowBreachForm(false)
    toast.success('Breach incident logged — 72-hour ICO clock is running')
  }

  const filteredRopa = useMemo(() =>
    ropaEntries.filter(e =>
      e.activity.toLowerCase().includes(ropaSearch.toLowerCase()) ||
      e.dataSubjects.toLowerCase().includes(ropaSearch.toLowerCase())
    ), [ropaEntries, ropaSearch])

  const openBreaches = breaches.filter(b => b.status === 'Assessing' || b.status === 'ICO Notified')

  return (
    <AppLayout
      title="GDPR & Data"
      subtitle="UK GDPR · DPA 2018 · ICO compliance"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={exportData}>Export</Button>
          <Button onClick={() => tab === 'breaches' ? setShowBreachForm(true) : logDsar()}>
            {tab === 'breaches' ? '+ Log Breach' : '+ Log DSAR'}
          </Button>
        </div>
      }
    >
      <Alert variant="info" icon="i">
        GDPR controls reflect records stored in this workspace. Under UK GDPR Article 33, notifiable breaches must be reported to the ICO within 72 hours of discovery.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18, marginTop: 14 }}>
        <StatCard label="Open DSARs" value={dsars.length} change="30-day deadline" accentColor="#C9A84C" />
        <StatCard label="ROPA Entries" value={ropaEntries.length} change={`${ropaEntries.filter(e => e.status === 'Documented').length} documented`} accentColor="#2DCE89" />
        <StatCard label="Active Breaches" value={openBreaches.length} change={openBreaches.length > 0 ? 'ICO clock running' : 'No open incidents'} changeUp={openBreaches.length === 0} accentColor={openBreaches.length > 0 ? '#F5365C' : '#2DCE89'} />
        <StatCard label="ROPA Needing Update" value={ropaEntries.filter(e => e.status === 'Needs Update').length} change="review required" accentColor="#FB8C00" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview', label: 'DSAR & Overview' },
          { key: 'ropa',     label: 'ROPA Builder' },
          { key: 'breaches', label: 'Breach Notification' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5, background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent', color: tab === t.key ? 'var(--gold)' : 'var(--mute)', fontWeight: tab === t.key ? 600 : 400, fontFamily: "'Instrument Sans', sans-serif" }}>
            {t.label}
            {t.key === 'breaches' && openBreaches.length > 0 && <span style={{ marginLeft: 6, background: '#F5365C', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{openBreaches.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Panel title="Log Data Subject Request" titleIcon="DATA" iconColor="#C9A84C">
              <FormInput label="Data Subject" value={subjectName} onChange={setSubjectName} placeholder="Full name" />
              <FormInput label="Request Type" value={subjectType} onChange={setSubjectType} as="select">
                <option>Access Request</option>
                <option>Erasure Request</option>
                <option>Rectification Request</option>
                <option>Portability Request</option>
                <option>Restriction Request</option>
                <option>Objection</option>
              </FormInput>
              <Button fullWidth onClick={logDsar}>Create DSAR — 30-day clock starts now</Button>
            </Panel>

            <Panel title="Open DSAR Register" titleIcon="DSAR" iconColor="#5E9EFF" noPadding>
              <DataTable
                columns={[
                  { key: 'subject', header: 'Subject', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.subject}</span> },
                  { key: 'type', header: 'Type', render: (row) => <Badge variant="slate">{row.type}</Badge> },
                  { key: 'received', header: 'Received' },
                  { key: 'deadline', header: 'Deadline' },
                  { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
                ]}
                data={dsars}
                emptyMessage="No DSARs logged yet"
              />
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 18 }}>
            {[
              { title: 'ICO Registration', icon: 'ICO', status: 'Not recorded', statusColor: '#F5365C', desc: 'Store ICO registration number and renewal evidence once paid.', action: () => window.open('https://ico.org.uk/for-organisations/data-protection-fee/', '_blank', 'noopener,noreferrer'), actionLabel: 'Open ICO Portal', actionVariant: 'primary' as const },
              { title: 'Consent Management', icon: 'CONSENT', status: 'Not configured', statusColor: '#FB8C00', desc: 'Track consent date, lawful basis, withdrawal route, and communication preferences.', action: () => downloadCsvFile('consent-gap-list.csv', [{ area: 'Marketing consent', status: 'Needed' }, { area: 'Consent date', status: 'Needed' }]), actionLabel: 'Export Gap List', actionVariant: 'ghost' as const },
              { title: 'Data Subject Rights', icon: 'RIGHTS', status: 'In progress', statusColor: '#F5365C', desc: 'DSAR workflow, Right to Erasure, and portability controls being operationalised.', action: () => setTab('ropa'), actionLabel: 'Open ROPA', actionVariant: 'ghost' as const },
            ].map((card) => (
              <Panel key={card.title}>
                <div style={{ fontSize: 11.5, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: card.statusColor, marginBottom: 6 }}>{card.status}</div>
                <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>{card.desc}</div>
                <Button variant={card.actionVariant} small onClick={card.action}>{card.actionLabel}</Button>
              </Panel>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Panel title="Data Retention Schedule" titleIcon="KEEP" iconColor="#C9A84C">
              {[
                { category: 'Employee Records', retention: '6 years after leaving', basis: 'Legal obligation' },
                { category: 'Donor Records', retention: '7 years', basis: 'Gift Aid / HMRC' },
                { category: 'Beneficiary Records', retention: '7 years', basis: 'Safeguarding' },
                { category: 'Financial Records', retention: '7 years', basis: 'Companies Act' },
                { category: 'CCTV Footage', retention: '30 days', basis: 'GDPR proportionality' },
                { category: 'Email Correspondence', retention: '3 years', basis: 'Business need' },
              ].map((row) => (
                <div key={row.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--heading)', fontWeight: 500 }}>{row.category}</div>
                    <div style={{ color: 'var(--mute)', fontSize: 11 }}>{row.basis}</div>
                  </div>
                  <Badge variant="slate">{row.retention}</Badge>
                </div>
              ))}
            </Panel>

            <Panel title="GDPR Compliance Roadmap" titleIcon="ROAD" iconColor="#5E9EFF">
              {[
                { phase: 'Phase 1 — Complete', items: ['Gift Aid consent boolean', 'Row-level security', 'Basic audit logging'], done: true },
                { phase: 'Phase 2 — Current', items: ['ICO registration', 'Consent management UI', 'DSAR workflow (30-day)', 'ROPA documentation'], done: false },
                { phase: 'Phase 3 — Upcoming', items: ['Data portability export', 'Right to erasure workflow', 'Privacy notice generator', '72-hour breach automation'], done: false },
              ].map((phase) => (
                <div key={phase.phase} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: phase.done ? '#2DCE89' : 'var(--mute)', fontSize: 11 }}>{phase.done ? 'DONE' : 'TODO'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: phase.done ? '#2DCE89' : 'var(--heading)' }}>{phase.phase}</span>
                  </div>
                  {phase.items.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 14px', fontSize: 11.5, color: 'var(--mute)' }}>
                      <span style={{ color: phase.done ? '#2DCE89' : 'var(--mute)' }}>{phase.done ? '✓' : '–'}</span>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}

      {/* ── ROPA Builder ──────────────────────────────────────── */}
      {tab === 'ropa' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Record of Processing Activities</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>UK GDPR Article 30 — maintained by Data Controller</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="Search activities..." value={ropaSearch} onChange={(e) => setRopaSearch(e.target.value)}
                style={{ padding: '6px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--text)', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", width: 180 }} />
              <Button small onClick={() => downloadCsvFile('ropa.csv', filteredRopa.map(e => ({ Activity: e.activity, Purpose: e.purpose, 'Data Subjects': e.dataSubjects, 'Lawful Basis': e.lawfulBasis, Retention: e.retention, Status: e.status })))}>Export ROPA</Button>
              <Button small onClick={() => toast.success('Add processing activity form coming soon')}>+ Add Activity</Button>
            </div>
          </div>

          <Panel noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Processing Activity', 'Purpose', 'Data Subjects', 'Personal Data', 'Special Cat.', 'Lawful Basis', 'Retention', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRopa.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)', minWidth: 160 }}>{e.activity}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5, minWidth: 180 }}>{e.purpose}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)', whiteSpace: 'nowrap' }}>{e.dataSubjects}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5, minWidth: 180 }}>{e.personalDataCategories}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {e.specialCategories ? <Badge variant="red">Yes</Badge> : <Badge variant="slate">No</Badge>}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <Badge variant={LAWFUL_BASIS_COLORS[e.lawfulBasis] as any}>{e.lawfulBasis}</Badge>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--mute)', whiteSpace: 'nowrap' }}>{e.retention}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant={ROPA_STATUS_COLORS[e.status] as any}>{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="ROPA Guidance" titleIcon="i" iconColor="#5E9EFF" style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {[
                { title: 'Who must maintain a ROPA?', body: 'Under UK GDPR Article 30, organisations with 250+ employees must maintain a ROPA. Smaller organisations must still document processing activities that are not occasional, involve special category data, or could result in a risk to rights and freedoms.' },
                { title: 'Special Category Data', body: 'Extra safeguards required for: health data, racial/ethnic origin, religious beliefs, biometric data, genetic data, sexual orientation, trade union membership, political opinions. Document the Article 9(2) condition used.' },
                { title: 'Lawful Basis Reminder', body: 'Identify one lawful basis per processing activity. Consent must be freely given, specific, informed, and unambiguous. Legitimate Interests requires a three-part test (purpose, necessity, balancing). Legal Obligation requires a specific UK law.' },
              ].map(({ title, body }) => (
                <div key={title} style={{ padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', lineHeight: 1.65 }}>{body}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ── Breach Notification ──────────────────────────────── */}
      {tab === 'breaches' && (
        <>
          {openBreaches.length > 0 && (
            <Alert variant="error" icon="!">
              <strong>{openBreaches.length} active breach incident{openBreaches.length > 1 ? 's' : ''}.</strong> Under UK GDPR Article 33, notifiable breaches must be reported to the ICO within 72 hours of discovery. Check elapsed time below.
            </Alert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '14px 0 18px' }}>
            <StatCard label="Total Incidents" value={String(breaches.length)} change="all time" accentColor="#C9A84C" />
            <StatCard label="Assessing" value={String(breaches.filter(b => b.status === 'Assessing').length)} change="ICO clock running" accentColor="#FB8C00" />
            <StatCard label="ICO Notified" value={String(breaches.filter(b => b.status === 'ICO Notified').length)} change="reported within 72hr" accentColor="#5E9EFF" />
            <StatCard label="Closed / Contained" value={String(breaches.filter(b => ['Contained', 'Closed', 'No Notification Required'].includes(b.status)).length)} change="resolved" accentColor="#2DCE89" />
          </div>

          {showBreachForm && (
            <Panel title="Log New Breach Incident" titleIcon="!" iconColor="#F5365C" style={{ marginBottom: 16 }}>
              <Alert variant="error" icon="!">
                The 72-hour ICO notification clock starts from the time of <strong>discovery</strong>, not when the breach occurred. Log this incident immediately.
              </Alert>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormInput label="Incident Title / Description" value={breachTitle} onChange={setBreachTitle} placeholder="e.g. Misdirected email containing personal data" />
                </div>
                <FormInput label="Categories of Personal Data" value={breachCategories} onChange={setBreachCategories} placeholder="e.g. Name, NI number, salary" />
                <FormInput label="Approximate Individuals Affected" value={breachAffected} onChange={setBreachAffected} type="number" placeholder="e.g. 5" />
                <FormInput label="Severity" value={breachSeverity} onChange={(v) => setBreachSeverity(v as BreachSeverity)} as="select">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </FormInput>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormInput label="Likely Consequences" value={breachConsequences} onChange={setBreachConsequences} as="textarea" placeholder="Describe the risk to individuals' rights and freedoms" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <Button variant="ghost" onClick={() => setShowBreachForm(false)}>Cancel</Button>
                <Button onClick={logBreach}>Log Incident — Start 72hr Clock</Button>
              </div>
            </Panel>
          )}

          {breaches.map((b) => {
            const elapsed = hoursElapsed(b.discoveredAt)
            const isCritical = b.status === 'Assessing' && elapsed > 48
            const clockPct = Math.min((elapsed / 72) * 100, 100)
            return (
              <div key={b.id} style={{ background: 'var(--surface)', border: `1px solid ${isCritical ? '#F5365C' : 'var(--line)'}`, borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--heading)', marginBottom: 6 }}>{b.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge variant={BREACH_STATUS_COLORS[b.status] as any}>{b.status}</Badge>
                      <Badge variant={BREACH_SEVERITY_COLORS[b.severity] as any}>{b.severity} Severity</Badge>
                      {b.icoReference && <Badge variant="blue">ICO Ref: {b.icoReference}</Badge>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: elapsed > 72 ? '#F5365C' : elapsed > 48 ? '#FB8C00' : '#2DCE89' }}>
                      {elapsed}h
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mute)' }}>since discovery</div>
                  </div>
                </div>

                {(b.status === 'Assessing') && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mute)', marginBottom: 4 }}>
                      <span>72-hour ICO notification deadline</span>
                      <span style={{ fontWeight: 600, color: elapsed > 72 ? '#F5365C' : elapsed > 48 ? '#FB8C00' : '#2DCE89' }}>{Math.max(0, 72 - elapsed)}h remaining</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-muted)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${clockPct}%`, background: elapsed > 72 ? '#F5365C' : elapsed > 48 ? '#FB8C00' : '#2DCE89', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Data Categories</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{b.dataCategories || 'Not recorded'}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Individuals Affected</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{b.individualsAffected !== null ? b.individualsAffected : 'Under assessment'}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Discovered</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{new Date(b.discoveredAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {b.consequences && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, marginBottom: 3 }}>Likely Consequences</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{b.consequences}</div>
                  </div>
                )}
                {b.actionsTaken && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, marginBottom: 3 }}>Actions Taken</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{b.actionsTaken}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  {b.status === 'Assessing' && (
                    <>
                      <Button small variant="ghost" onClick={() => { setBreaches(prev => prev.map(x => x.id === b.id ? { ...x, status: 'No Notification Required' } : x)); toast.success('Marked: no ICO notification required') }}>No Notification Required</Button>
                      <Button small onClick={() => { setBreaches(prev => prev.map(x => x.id === b.id ? { ...x, status: 'ICO Notified', reportedAt: new Date().toISOString() } : x)); toast.success('Marked as ICO notified') }}>Mark ICO Notified</Button>
                    </>
                  )}
                  {b.status === 'ICO Notified' && (
                    <Button small onClick={() => { setBreaches(prev => prev.map(x => x.id === b.id ? { ...x, status: 'Closed' } : x)); toast.success('Incident closed') }}>Close Incident</Button>
                  )}
                </div>
              </div>
            )
          })}

          <Panel title="ICO Notification: What to Include" titleIcon="i" iconColor="#5E9EFF" style={{ marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { title: '1. Nature of breach', body: 'Describe the categories and approximate number of personal data records and individuals affected.' },
                { title: '2. DPO contact details', body: 'Name and contact details of the Data Protection Officer (or contact point).' },
                { title: '3. Likely consequences', body: 'Describe the likely consequences of the personal data breach.' },
                { title: '4. Measures taken', body: 'Describe the measures taken or proposed to address the breach, including to mitigate its possible adverse effects.' },
              ].map(({ title, body }) => (
                <div key={title} style={{ padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', lineHeight: 1.6 }}>{body}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
