import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, Alert } from '@/components/ui'
import { useRouter } from 'next/router'

type Urgency = 'urgent' | 'due_soon' | 'on_track'

interface ComplianceItem {
  requirement: string
  regulator: string
  due_date: string
  status: string
  badge: any
  days_remaining: number
}

const ITEMS: ComplianceItem[] = [
  { requirement: 'RTI Payroll Submission — March', regulator: 'HMRC', due_date: '19 Apr 2025', status: 'Due Soon', badge: 'amber', days_remaining: 31 },
  { requirement: 'NLCF Grant Interim Report', regulator: 'NLCF', due_date: '28 Mar 2025', status: 'Urgent', badge: 'red', days_remaining: 9 },
  { requirement: 'Rochdale Council SLA Renewal', regulator: 'Rochdale MBC', due_date: '31 Mar 2025', status: 'Urgent', badge: 'red', days_remaining: 12 },
  { requirement: 'Annual Gift Aid Claim', regulator: 'HMRC', due_date: '30 Apr 2025', status: 'Due Soon', badge: 'amber', days_remaining: 42 },
  { requirement: 'VAT Return (exempt status confirmation)', regulator: 'HMRC', due_date: '31 May 2025', status: 'On Track', badge: 'green', days_remaining: 73 },
  { requirement: 'Independent Examiner Review', regulator: 'Charity Commission', due_date: '30 Jun 2025', status: 'On Track', badge: 'green', days_remaining: 103 },
  { requirement: 'Annual Return — Charity Commission', regulator: 'CHTY COMM', due_date: '31 Jul 2025', status: 'On Track', badge: 'green', days_remaining: 134 },
  { requirement: 'Corporation Tax Return (CIC)', regulator: 'HMRC', due_date: '31 Jan 2026', status: 'On Track', badge: 'green', days_remaining: 318 },
  { requirement: 'Companies House Confirmation Statement', regulator: 'Companies House', due_date: '15 Nov 2025', status: 'On Track', badge: 'green', days_remaining: 241 },
]

const urgent = ITEMS.filter(i => i.badge === 'red').length
const due_soon = ITEMS.filter(i => i.badge === 'amber').length
const on_track = ITEMS.filter(i => i.badge === 'green').length
const score = Math.round((on_track / ITEMS.length) * 100)

export default function Compliance() {
  const router = useRouter()

  return (
    <AppLayout
      title="Compliance Hub"
      subtitle="HMRC · Charity Commission"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>↓ Export Schedule</Button>
          <Button onClick={() => router.push('/ai')}>✦ AI Compliance Review</Button>
        </div>
      }
    >
      {urgent > 0 && (
        <Alert variant="error" icon="⚠">
          <strong>{urgent} urgent items</strong> require immediate action — NLCF report and SLA renewal both due within 2 weeks.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Compliance Score" value={`${score}%`}     change="All critical areas reviewed" changeUp  accentColor="#10b981" />
        <StatCard label="Urgent Actions"   value={urgent}           change="Require immediate attention" changeUp={false} accentColor="#ef4444" />
        <StatCard label="Due Soon"         value={due_soon}         change="Within next 60 days"         accentColor="#f59e0b" />
        <StatCard label="On Track"         value={on_track}         change="No action needed"            changeUp  accentColor="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <Panel title="Compliance Schedule — FY 2025" noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Requirement', 'Regulator', 'Due Date', 'Days', 'Status', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b',
                    textAlign: 'left', borderBottom: '1px solid #1e293b',
                    fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em',
                    background: '#0f172a', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((item, i) => (
                <tr key={i} style={{ background: item.badge === 'red' ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>
                    {item.requirement}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', color: '#64748b', fontSize: 12 }}>
                    {item.regulator}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {item.due_date}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: item.days_remaining <= 14 ? '#f87171' : item.days_remaining <= 45 ? '#fbbf24' : '#64748b' }}>
                    {item.days_remaining}d
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                    <Badge variant={item.badge as any}>{item.status}</Badge>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                    {item.badge !== 'green' && (
                      <Button small onClick={() => router.push('/ai')}>Act ✦</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div>
          {/* Score breakdown */}
          <Panel title="Compliance Health" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif', fontSize: 52, fontWeight: 600,
                color: score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>{score}%</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, marginBottom: 20 }}>Overall compliance score</div>
            </div>
            {[
              ['Urgent', urgent, '#ef4444', urgent === 0],
              ['Due Soon', due_soon, '#f59e0b', due_soon === 0],
              ['On Track', on_track, '#10b981', true],
            ].map(([label, count, color, ok]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color as string }} />
                  <span style={{ color: '#94a3b8' }}>{label as string}</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: ok ? '#34d399' : color as string }}>{count as number}</span>
              </div>
            ))}
          </Panel>

          {/* Quick links */}
          <Panel title="Quick Links">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'HMRC PAYE Portal', url: 'https://www.tax.service.gov.uk' },
                { label: 'Charity Commission', url: 'https://www.gov.uk/manage-charity-online' },
                { label: 'Companies House', url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return' },
                { label: 'NLCF Grantee Portal', url: 'https://www.tnlcommunityfund.org.uk' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 12px', background: '#1e293b', borderRadius: 8,
                    fontSize: 12, color: '#94a3b8', textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
                >
                  {link.label}
                  <span style={{ fontSize: 10, color: '#475569' }}>↗</span>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
