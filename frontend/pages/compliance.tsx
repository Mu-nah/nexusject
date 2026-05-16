import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, Alert } from '@/components/ui'
import { useRouter } from 'next/router'

const ITEMS: Array<{
  requirement: string
  regulator: string
  due_date: string
  status: string
  badge: 'red' | 'amber' | 'green'
  days_remaining: number | null
}> = []

export default function Compliance() {
  const router = useRouter()
  const urgent = ITEMS.filter((i) => i.badge === 'red').length
  const dueSoon = ITEMS.filter((i) => i.badge === 'amber').length
  const onTrack = ITEMS.filter((i) => i.badge === 'green').length
  const score = ITEMS.length ? Math.round((onTrack / ITEMS.length) * 100) : 0

  return (
    <AppLayout
      title="Compliance Hub"
      subtitle="Workspace schedule"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>Export Schedule</Button>
          <Button onClick={() => router.push('/ai')}>Compliance Review</Button>
        </div>
      }
    >
      <Alert variant="info" icon="i">
        Track only the compliance deadlines recorded for this workspace. Nothing is preloaded anymore.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Compliance Score" value={`${score}%`} change={ITEMS.length ? 'Based on saved deadlines' : 'No compliance items recorded yet'} changeUp={score >= 80} accentColor="#10b981" />
        <StatCard label="Urgent Actions" value={urgent} change={urgent ? 'Require immediate attention' : 'No urgent actions'} changeUp={false} accentColor="#ef4444" />
        <StatCard label="Due Soon" value={dueSoon} change={dueSoon ? 'Within the next 60 days' : 'Nothing due soon'} accentColor="#f59e0b" />
        <StatCard label="On Track" value={onTrack} change={onTrack ? 'Currently in good standing' : 'No tracked deadlines yet'} changeUp={onTrack > 0} accentColor="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <Panel title="Compliance Schedule" noPadding>
          {ITEMS.length === 0 ? (
            <div style={{ padding: 18, fontSize: 12.5, color: 'var(--mute2)', lineHeight: 1.7 }}>
              No compliance deadlines have been recorded for this workspace yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Requirement', 'Regulator', 'Due Date', 'Days', 'Status'].map((h) => (
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
                  <tr key={i}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{item.requirement}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', color: '#64748b', fontSize: 12 }}>{item.regulator}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{item.due_date}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#64748b' }}>{item.days_remaining ?? '-'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}><Badge variant={item.badge}>{item.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div>
          <Panel title="Compliance Health" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif', fontSize: 52, fontWeight: 600,
                color: score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#94a3b8',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>{score}%</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, marginBottom: 20 }}>Overall compliance score</div>
            </div>
            {[
              ['Urgent', urgent, '#ef4444'],
              ['Due Soon', dueSoon, '#f59e0b'],
              ['On Track', onTrack, '#10b981'],
            ].map(([label, count, color]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color as string }} />
                  <span style={{ color: '#94a3b8' }}>{label as string}</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: color as string }}>{count as number}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Quick Links">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'HMRC PAYE Portal', url: 'https://www.tax.service.gov.uk' },
                { label: 'Charity Commission', url: 'https://www.gov.uk/manage-charity-online' },
                { label: 'Companies House', url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return' },
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
                  }}
                >
                  {link.label}
                  <span style={{ fontSize: 10, color: '#475569' }}>{'->'}</span>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
