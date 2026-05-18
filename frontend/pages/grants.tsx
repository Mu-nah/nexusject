import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, Panel, ProgressBar, StatCard } from '@/components/ui'
import api from '@/lib/api'

type Tab = 'overview' | 'funders' | 'pipeline'

const gbp = (n: number) => `GBP ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`

const currentQuarterBounds = () => {
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
  const start = new Date(Date.UTC(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0))
  const end = new Date(Date.UTC(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59))
  return { start: start.toISOString(), end: end.toISOString() }
}

type FunderType = 'Trust / Foundation' | 'Government' | 'Lottery' | 'Corporate' | 'Statutory'
type RelStatus = 'Active' | 'Lapsed' | 'Prospect' | 'Restricted'

interface Funder {
  id: number
  name: string
  type: FunderType
  contact: string
  relationship: RelStatus
  totalAwarded: number
  nextDeadline: string | null
  notes: string
}

const MOCK_FUNDERS: Funder[] = [
  { id: 1, name: 'National Lottery Community Fund', type: 'Lottery', contact: 'grants@tnlcommunityfund.org.uk', relationship: 'Active', totalAwarded: 180000, nextDeadline: '2026-07-31', notes: 'Key strategic funder. 3-year relationship.' },
  { id: 2, name: 'Tudor Trust', type: 'Trust / Foundation', contact: 'info@tudortrust.org.uk', relationship: 'Active', totalAwarded: 45000, nextDeadline: '2026-09-15', notes: 'Prefers unrestricted core cost funding.' },
  { id: 3, name: 'Local Authority — VCSE Grant', type: 'Government', contact: 'vcse@localauthority.gov.uk', relationship: 'Active', totalAwarded: 72000, nextDeadline: '2027-03-31', notes: 'Annual contract renewal due March.' },
  { id: 4, name: 'Garfield Weston Foundation', type: 'Trust / Foundation', contact: 'applications@garfieldweston.org', relationship: 'Prospect', totalAwarded: 0, nextDeadline: '2026-10-01', notes: 'Identified from research. First approach stage.' },
  { id: 5, name: 'City Bridge Foundation', type: 'Trust / Foundation', contact: 'grants@citybridgefoundation.org.uk', relationship: 'Lapsed', totalAwarded: 30000, nextDeadline: null, notes: 'Previous award 2023. Re-engagement planned for 2026.' },
]

type PipelineStage = 'Research' | 'Draft' | 'Submitted' | 'In Review' | 'Decision'

interface Application {
  id: number
  name: string
  funder: string
  amountSought: number
  stage: PipelineStage
  daysInStage: number
  deadline: string | null
  outcome?: 'Awarded' | 'Rejected'
}

const MOCK_APPLICATIONS: Application[] = [
  { id: 1, name: 'Community Wellbeing Programme Phase 2', funder: 'National Lottery Community Fund', amountSought: 120000, stage: 'In Review', daysInStage: 18, deadline: '2026-06-01' },
  { id: 2, name: 'Digital Inclusion Project', funder: 'Tudor Trust', amountSought: 25000, stage: 'Submitted', daysInStage: 7, deadline: '2026-08-15' },
  { id: 3, name: 'Core Costs 2026-27', funder: 'Local Authority — VCSE Grant', amountSought: 72000, stage: 'Draft', daysInStage: 3, deadline: '2027-01-31' },
  { id: 4, name: 'Young Persons Mentoring Fund', funder: 'Garfield Weston Foundation', amountSought: 50000, stage: 'Research', daysInStage: 12, deadline: '2026-10-01' },
  { id: 5, name: 'Volunteer Infrastructure Grant', funder: 'City Bridge Foundation', amountSought: 18000, stage: 'Research', daysInStage: 5, deadline: null },
  { id: 6, name: 'Employment Support Project', funder: 'Tudor Trust', amountSought: 35000, stage: 'Decision', daysInStage: 45, deadline: null, outcome: 'Awarded' },
  { id: 7, name: 'Equipment Replacement Fund', funder: 'Local Authority — VCSE Grant', amountSought: 8500, stage: 'Decision', daysInStage: 30, deadline: null, outcome: 'Rejected' },
]

const PIPELINE_STAGES: { key: PipelineStage; color: string; description: string }[] = [
  { key: 'Research',   color: '#5E9EFF', description: 'Identifying funders and eligibility' },
  { key: 'Draft',      color: '#C9A84C', description: 'Application being written' },
  { key: 'Submitted',  color: '#FB8C00', description: 'Submitted — awaiting acknowledgement' },
  { key: 'In Review',  color: '#9B59B6', description: 'Under funder assessment' },
  { key: 'Decision',   color: '#2DCE89', description: 'Decision received' },
]

const FUNDER_TYPE_COLORS: Record<FunderType, string> = {
  'Trust / Foundation': 'blue',
  'Government': 'green',
  'Lottery': 'amber',
  'Corporate': 'purple',
  'Statutory': 'grey',
}

const REL_COLORS: Record<RelStatus, string> = {
  'Active': 'green',
  'Lapsed': 'red',
  'Prospect': 'amber',
  'Restricted': 'grey',
}

export default function Grants() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [funderSearch, setFunderSearch] = useState('')

  const { data: grants = [], isLoading } = useQuery({ queryKey: ['grants'], queryFn: () => api.getGrants('active') })
  const { data: summary } = useQuery({ queryKey: ['grants-summary'], queryFn: api.getGrantsSummary })

  const reportMutation = useMutation({
    mutationFn: (grantId: number) => {
      const { start, end } = currentQuarterBounds()
      return api.aiGrantReport(grantId, start, end)
    },
    onSuccess: () => {
      toast.success('AI report generated - check Reports')
      router.push('/reports')
    },
    onError: () => toast.error('Report generation failed'),
  })

  const nextReport = grants
    .filter((grant: any) => !!grant.next_report_due)
    .map((grant: any) => {
      const days = Math.ceil((new Date(grant.next_report_due).getTime() - Date.now()) / 86400000)
      return { name: grant.name, days }
    })
    .filter((item: any) => item.days >= 0)
    .sort((a: any, b: any) => a.days - b.days)[0]

  const chartData = grants.map((grant: any) => ({
    name: grant.funder?.split(' ').slice(0, 2).join(' ') || grant.name,
    spent: Number(grant.amount_spent || 0),
    remaining: Number(grant.amount_remaining || 0),
  }))

  const getBarColor = (value: number) => (value > 90 ? '#ef4444' : value > 75 ? '#f59e0b' : '#10b981')

  const filteredFunders = useMemo(() =>
    MOCK_FUNDERS.filter(f =>
      f.name.toLowerCase().includes(funderSearch.toLowerCase()) ||
      f.type.toLowerCase().includes(funderSearch.toLowerCase())
    ), [funderSearch])

  const pipelineByStage = useMemo(() => {
    const map: Record<PipelineStage, Application[]> = {
      Research: [], Draft: [], Submitted: [], 'In Review': [], Decision: [],
    }
    MOCK_APPLICATIONS.forEach(a => map[a.stage].push(a))
    return map
  }, [])

  const totalSought = MOCK_APPLICATIONS.reduce((s, a) => s + a.amountSought, 0)
  const awarded = MOCK_APPLICATIONS.filter(a => a.outcome === 'Awarded')
  const successRate = MOCK_APPLICATIONS.filter(a => a.outcome).length > 0
    ? (awarded.length / MOCK_APPLICATIONS.filter(a => a.outcome).length) * 100
    : 0
  const totalRelationshipValue = MOCK_FUNDERS.reduce((s, f) => s + f.totalAwarded, 0)

  return (
    <AppLayout
      title="Grant Management"
      subtitle={`${summary?.active_grants ?? 0} active grants`}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>Realtouch IQ</Button>
          <Button onClick={() => router.push('/grants/new')}>+ New Grant</Button>
        </div>
      }
    >
      {!isLoading && grants.length === 0 && tab === 'overview' && (
        <Alert variant="info" icon="i">
          No active grants yet. Create your first grant to unlock utilisation, deadline tracking, and AI reporting.
        </Alert>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Awarded" value={gbp(summary?.total_awarded ?? 0)} change={`${summary?.active_grants ?? 0} active grants`} accentColor="#3b82f6" />
        <StatCard label="Spent to Date" value={gbp(summary?.total_spent ?? 0)} change={`${pct(summary?.overall_utilisation_pct ?? 0)} utilised`} changeUp accentColor="#10b981" />
        <StatCard label="Remaining" value={gbp(summary?.total_remaining ?? 0)} change="across all grants" accentColor="#f59e0b" />
        <StatCard label="Pipeline Value" value={gbp(totalSought)} change={`${MOCK_APPLICATIONS.filter(a => !a.outcome).length} active applications`} accentColor="#C9A84C" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview', label: 'Active Grants' },
          { key: 'funders',  label: 'Funder CRM' },
          { key: 'pipeline', label: 'Application Pipeline' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              background: 'none',
              borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
              color: tab === t.key ? 'var(--gold)' : 'var(--mute)',
              fontWeight: tab === t.key ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
          <div>
            {!isLoading && grants.length === 0 && (
              <Panel title="Active Grants">
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>No active grants in this workspace yet.</div>
              </Panel>
            )}
            {grants.map((grant: any) => {
              const reportDays = grant.next_report_due ? Math.ceil((new Date(grant.next_report_due).getTime() - Date.now()) / 86400000) : null
              return (
                <div key={grant.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--heading)', marginBottom: 2 }}>{grant.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {grant.reference} | {new Date(grant.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} {'→'} {new Date(grant.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Badge variant="green">Active</Badge>
                        {reportDays !== null && reportDays >= 0 && reportDays <= 14 && <Badge variant="red">Report due {reportDays}d</Badge>}
                        {grant.utilisation_pct >= 80 && <Badge variant="amber">{pct(grant.utilisation_pct)} utilised</Badge>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--heading)' }}>{gbp(grant.amount_spent)}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)' }}>of {gbp(grant.amount_awarded)}</div>
                    </div>
                  </div>
                  <ProgressBar value={grant.utilisation_pct} color={getBarColor(grant.utilisation_pct)} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <Button small variant="ghost" onClick={() => router.push(`/grants/${grant.id}`)}>View Spending</Button>
                    <Button small onClick={() => reportMutation.mutate(grant.id)} disabled={reportMutation.isPending}>
                      {reportMutation.isPending ? 'Generating...' : 'AI Report'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <Panel title="Grant Utilisation" style={{ marginBottom: 16 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--mute)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Number(v) / 1000}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--mute)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', fontSize: 12 }} formatter={(v: number) => [gbp(v), '']} />
                    <Bar dataKey="spent" fill="#10b981" stackId="a" />
                    <Bar dataKey="remaining" fill="rgba(201,168,76,0.25)" stackId="a" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--mute)' }}>
                  Grant utilisation will appear once active grants exist.
                </div>
              )}
            </Panel>

            <Panel title="Upcoming Deadlines">
              {MOCK_APPLICATIONS.filter(a => a.deadline && !a.outcome).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).slice(0, 4).map(a => {
                const days = Math.ceil((new Date(a.deadline!).getTime() - Date.now()) / 86400000)
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--heading)', fontWeight: 500 }}>{a.name.length > 32 ? a.name.slice(0, 32) + '…' : a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)' }}>{a.funder.split(' ').slice(0, 3).join(' ')}</div>
                    </div>
                    <Badge variant={days <= 14 ? 'red' : days <= 60 ? 'amber' : 'green'}>{days}d</Badge>
                  </div>
                )
              })}
            </Panel>
          </div>
        </div>
      )}

      {/* ── Funder CRM tab ─────────────────────────────── */}
      {tab === 'funders' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Funders" value={String(MOCK_FUNDERS.length)} change="in CRM" accentColor="#C9A84C" />
            <StatCard label="Active Relationships" value={String(MOCK_FUNDERS.filter(f => f.relationship === 'Active').length)} change="current partners" accentColor="#2DCE89" />
            <StatCard label="Prospects" value={String(MOCK_FUNDERS.filter(f => f.relationship === 'Prospect').length)} change="under cultivation" accentColor="#5E9EFF" />
            <StatCard label="Relationship Value" value={gbp(totalRelationshipValue)} change="total awarded by these funders" accentColor="#FB8C00" />
          </div>

          <Panel
            title="Funder Database"
            titleIcon="FD"
            iconColor="#C9A84C"
            noPadding
            action={
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
                <input
                  placeholder="Search funders..."
                  value={funderSearch}
                  onChange={(e) => setFunderSearch(e.target.value)}
                  style={{ padding: '6px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--text)', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", width: 180 }}
                />
                <Button small onClick={() => toast.success('Add funder form coming soon')}>+ Add Funder</Button>
              </div>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Funder', 'Type', 'Contact', 'Relationship', 'Total Awarded', 'Next Deadline', 'Notes', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFunders.map((f) => {
                    const deadlineDays = f.nextDeadline ? Math.ceil((new Date(f.nextDeadline).getTime() - Date.now()) / 86400000) : null
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)' }}>{f.name}</td>
                        <td style={{ padding: '12px 14px' }}><Badge variant={FUNDER_TYPE_COLORS[f.type] as any}>{f.type}</Badge></td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5 }}>{f.contact}</td>
                        <td style={{ padding: '12px 14px' }}><Badge variant={REL_COLORS[f.relationship] as any}>{f.relationship}</Badge></td>
                        <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C', fontWeight: 600 }}>{f.totalAwarded > 0 ? gbp(f.totalAwarded) : '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          {deadlineDays !== null ? (
                            <Badge variant={deadlineDays <= 30 ? 'red' : deadlineDays <= 90 ? 'amber' : 'green'}>{deadlineDays}d</Badge>
                          ) : <span style={{ color: 'var(--mute)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5, maxWidth: 200 }}>{f.notes}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <Button small variant="ghost" onClick={() => toast.success(`Edit ${f.name}`)}>Edit</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ── Application Pipeline tab ────────────────────── */}
      {tab === 'pipeline' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Applications" value={String(MOCK_APPLICATIONS.length)} change="this financial year" accentColor="#C9A84C" />
            <StatCard label="In Progress" value={String(MOCK_APPLICATIONS.filter(a => !a.outcome).length)} change="active in pipeline" accentColor="#5E9EFF" />
            <StatCard label="Awarded" value={String(awarded.length)} change={`${pct(successRate)} success rate`} changeUp accentColor="#2DCE89" />
            <StatCard label="Total Sought" value={gbp(MOCK_APPLICATIONS.filter(a => !a.outcome).reduce((s, a) => s + a.amountSought, 0))} change="live pipeline value" accentColor="#FB8C00" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Application Pipeline</div>
            <Button small onClick={() => toast.success('New application form coming soon')}>+ New Application</Button>
          </div>

          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {PIPELINE_STAGES.map(({ key, color, description }) => {
              const apps = pipelineByStage[key]
              return (
                <div key={key} style={{ flex: '0 0 220px', minWidth: 220 }}>
                  <div style={{ borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden' }}>
                    <div style={{ borderTop: `3px solid ${color}`, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)' }}>{key}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 20, padding: '2px 8px' }}>{apps.length}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{description}</div>
                    </div>
                    <div style={{ padding: '10px 10px 4px' }}>
                      {apps.length === 0 && (
                        <div style={{ fontSize: 11.5, color: 'var(--mute)', padding: '8px 4px', textAlign: 'center' }}>No applications</div>
                      )}
                      {apps.map(a => (
                        <div key={a.id} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', marginBottom: 4, lineHeight: 1.4 }}>
                            {a.name.length > 40 ? a.name.slice(0, 40) + '…' : a.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 6 }}>{a.funder.split(' ').slice(0, 3).join(' ')}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color, fontWeight: 600 }}>{gbp(a.amountSought)}</span>
                            {a.outcome ? (
                              <Badge variant={a.outcome === 'Awarded' ? 'green' : 'red'}>{a.outcome}</Badge>
                            ) : (
                              <span style={{ fontSize: 10.5, color: 'var(--mute)' }}>{a.daysInStage}d in stage</span>
                            )}
                          </div>
                          {a.deadline && !a.outcome && (() => {
                            const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
                            return <div style={{ marginTop: 5 }}><Badge variant={days <= 14 ? 'red' : days <= 60 ? 'amber' : 'green'}>Due {days}d</Badge></div>
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Panel title="Pipeline Summary" titleIcon="PS" iconColor="#C9A84C" style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {PIPELINE_STAGES.map(({ key, color }) => {
                const apps = pipelineByStage[key]
                const val = apps.reduce((s, a) => s + a.amountSought, 0)
                return (
                  <div key={key} style={{ padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{key}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--heading)' }}>{gbp(val)}</div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{apps.length} application{apps.length !== 1 ? 's' : ''}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
