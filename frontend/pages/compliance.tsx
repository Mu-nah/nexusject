import { useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, Alert } from '@/components/ui'
import { useRouter } from 'next/router'

type ComplianceItem = {
  requirement: string
  regulator: string
  due_date: string
  status: string
  badge: 'red' | 'amber' | 'green'
  days_remaining: number | null
}

function buildComplianceCalendar(): ComplianceItem[] {
  const today = new Date()
  const y = today.getFullYear()

  const daysDiff = (target: Date) =>
    Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const item = (requirement: string, regulator: string, dueDate: Date): ComplianceItem => {
    const days = daysDiff(dueDate)
    return {
      requirement,
      regulator,
      due_date: fmt(dueDate),
      status: days < 0 ? 'Overdue' : days <= 30 ? 'Urgent' : days <= 90 ? 'Due Soon' : 'On Track',
      badge: days < 0 || days <= 30 ? 'red' : days <= 90 ? 'amber' : 'green',
      days_remaining: days < 0 ? null : days,
    }
  }

  // Monthly RTI FPS — due 5th of the following month
  const nextFpsMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5)

  // HMRC annual dates (relative to current calendar year)
  const p60Due = new Date(y, 4, 31)           // 31 May — P60s to employees
  const p11dDue = new Date(y, 6, 6)            // 6 July — P11D filing to HMRC
  const p11dbNiDue = new Date(y, 6, 19)        // 19 July — Class 1A NI payment
  const psaDue = new Date(y, 9, 19)            // 19 Oct — PAYE Settlement Agreement

  // VAT quarterly due dates (standard monthly filer with quarterly periods)
  // Q1 Jan–Mar → 7 May; Q2 Apr–Jun → 7 Aug; Q3 Jul–Sep → 7 Nov; Q4 Oct–Dec → 7 Feb next year
  const vatDueDates = [
    new Date(y, 4, 7),
    new Date(y, 7, 7),
    new Date(y, 10, 7),
    new Date(y + 1, 1, 7),
  ]
  const nextVatDue = vatDueDates.find((d) => d >= today) ?? vatDueDates[vatDueDates.length - 1]

  // Companies House — assume year-end 31 March, accounts due 31 Dec, CS due 28 Aug
  const annualAccounts = new Date(y, 11, 31)
  const confirmationStatement = new Date(y, 7, 28)  // 28 Aug
  const cicAnnualReport = new Date(y, 11, 31)

  // Charity Commission — Annual Return due 10 months after 31 Mar year-end = 31 Jan next year
  const charityReturn = new Date(y + 1, 0, 31)

  // ICO Data Protection Fee — annual renewal (use 30 Jun as typical)
  const icoRenewal = new Date(y, 5, 30)

  // Pensions Regulator — re-enrolment triennial (next cycle Sep next year)
  const aeReenrolment = new Date(y + 1, 8, 1)

  // Safeguarding policy annual review — end of summer
  const safeguardingReview = new Date(y, 8, 30)  // 30 Sep

  // Working Time Regulations — annual review
  const workingTimeReview = new Date(y, 10, 30)  // 30 Nov

  const items: ComplianceItem[] = [
    item('P60 Statements to Employees', 'HMRC', p60Due),
    item('Monthly RTI Full Payment Submission', 'HMRC', nextFpsMonth),
    item('P11D / Benefits in Kind Return', 'HMRC', p11dDue),
    item('P11D(b) Class 1A NI Payment', 'HMRC', p11dbNiDue),
    item('PAYE Settlement Agreement Payment', 'HMRC', psaDue),
    item('VAT Return — Quarterly', 'HMRC MTD', nextVatDue),
    item('Annual Accounts Filing', 'Companies House', annualAccounts),
    item('Confirmation Statement', 'Companies House', confirmationStatement),
    item('CIC Annual Report', 'Companies House', cicAnnualReport),
    item('Charity Commission Annual Return', 'Charity Commission', charityReturn),
    item('ICO Data Protection Fee Renewal', 'ICO', icoRenewal),
    item('Pension Auto-Enrolment Re-enrolment', 'Pensions Regulator', aeReenrolment),
    item('Annual Safeguarding Policy Review', 'Internal / Ofsted', safeguardingReview),
    item('Working Time Regulations Annual Audit', 'Internal / HSE', workingTimeReview),
  ]

  return items.sort((a, b) => {
    const aDays = a.days_remaining ?? -999
    const bDays = b.days_remaining ?? -999
    return aDays - bDays
  })
}

export default function Compliance() {
  const router = useRouter()

  const ITEMS = useMemo(() => buildComplianceCalendar(), [])

  const urgent = ITEMS.filter((i) => i.badge === 'red').length
  const dueSoon = ITEMS.filter((i) => i.badge === 'amber').length
  const onTrack = ITEMS.filter((i) => i.badge === 'green').length
  const overdue = ITEMS.filter((i) => i.status === 'Overdue').length
  const score = ITEMS.length ? Math.round((onTrack / ITEMS.length) * 100) : 0

  return (
    <AppLayout
      title="Compliance Hub"
      subtitle="UK regulatory calendar"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>Export Schedule</Button>
          <Button onClick={() => router.push('/ai')}>Compliance Review</Button>
        </div>
      }
    >
      {overdue > 0 && (
        <Alert variant="gold" icon="!">
          <strong>Action required:</strong> {overdue} compliance deadline{overdue > 1 ? 's are' : ' is'} overdue. Review immediately.
        </Alert>
      )}
      {overdue === 0 && urgent > 0 && (
        <Alert variant="gold" icon="!">
          <strong>Heads up:</strong> {urgent} deadline{urgent > 1 ? 's are' : ' is'} due within 30 days.
        </Alert>
      )}
      {overdue === 0 && urgent === 0 && (
        <Alert variant="info" icon="i">
          All tracked deadlines are within their scheduled window. Next urgent action: {ITEMS.find((i) => i.badge === 'amber')?.requirement ?? 'none due soon'}.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Compliance Score" value={`${score}%`} change={`${ITEMS.length} deadlines tracked`} changeUp={score >= 80} accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" icon="SC" />
        <StatCard label="Urgent / Overdue" value={urgent} change={urgent ? 'Requires immediate action' : 'No urgent actions'} changeUp={false} accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" icon="!" />
        <StatCard label="Due Soon" value={dueSoon} change={dueSoon ? 'Within 90 days' : 'Nothing due soon'} accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" icon="D" />
        <StatCard label="On Track" value={onTrack} change={onTrack ? 'In good standing' : 'No tracked deadlines yet'} changeUp={onTrack > 0} accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" icon="OK" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <Panel title="Compliance Schedule" noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Requirement', 'Regulator', 'Due Date', 'Days', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--mute)',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--line)',
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      background: 'var(--bg2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((item, i) => (
                <tr key={i} style={{ background: item.badge === 'red' ? 'rgba(245,54,92,0.03)' : 'transparent' }}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontWeight: 500, color: 'var(--heading)', fontSize: 13 }}>
                    {item.requirement}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--mute2)', fontSize: 12 }}>
                    {item.regulator}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {item.due_date}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: item.days_remaining === null ? '#F5365C' : item.days_remaining <= 30 ? '#FB8C00' : 'var(--mute)' }}>
                    {item.days_remaining === null ? 'Overdue' : `${item.days_remaining}d`}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                    <Badge variant={item.badge}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Compliance Health">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 52,
                fontWeight: 600,
                color: score >= 80 ? '#2DCE89' : score >= 60 ? '#FB8C00' : '#F5365C',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                {score}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 6, marginBottom: 20 }}>Overall compliance score</div>
            </div>
            {[
              ['Urgent / Overdue', urgent, '#F5365C'],
              ['Due Soon', dueSoon, '#FB8C00'],
              ['On Track', onTrack, '#2DCE89'],
            ].map(([label, count, color]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color as string }} />
                  <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: color as string }}>
                  {count as number}
                </span>
              </div>
            ))}
          </Panel>

          <Panel title="Regulatory Portals">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'HMRC PAYE Portal', url: 'https://www.tax.service.gov.uk' },
                { label: 'HMRC MTD VAT', url: 'https://www.gov.uk/government/collections/making-tax-digital-for-vat' },
                { label: 'Companies House', url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return' },
                { label: 'Charity Commission', url: 'https://www.gov.uk/manage-charity-online' },
                { label: 'ICO (Data Protection)', url: 'https://ico.org.uk/registration' },
                { label: 'Pensions Regulator', url: 'https://www.thepensionsregulator.gov.uk' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--mute2)',
                    textDecoration: 'none',
                    border: '1px solid var(--line)',
                  }}
                >
                  {link.label}
                  <span style={{ fontSize: 10, color: 'var(--gold)' }}>→</span>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
