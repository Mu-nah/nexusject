import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, EmptyState, FormInput, Panel, ProgressBar, StatCard } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Tab = 'overview' | 'beneficiaries' | 'sroi' | 'sessions'

type ProgrammeForm = {
  name: string; description: string; total_budget: string
  target_participants: string; start_date: string; end_date: string
}

const EMPTY_FORM: ProgrammeForm = { name: '', description: '', total_budget: '', target_participants: '', start_date: '', end_date: '' }
const gbp = (n: number) => `GBP ${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ── Beneficiary CRM mock data ──────────────────────────────────────────────
type BenStatus = 'Active' | 'Graduated' | 'Withdrawn' | 'Referred'
interface Beneficiary {
  id: number; name: string; programme: string; age: number; status: BenStatus
  joinDate: string; sessionsAttended: number; totalSessions: number; notes: string
}

const MOCK_BENEFICIARIES: Beneficiary[] = [
  { id: 1, name: 'Alex Johnson', programme: 'Youth Employability', age: 19, status: 'Active', joinDate: '2026-01-15', sessionsAttended: 8, totalSessions: 12, notes: 'Strong progress; CV workshop completed.' },
  { id: 2, name: 'Priya Patel',  programme: 'Digital Skills',     age: 34, status: 'Active', joinDate: '2026-02-03', sessionsAttended: 5, totalSessions: 8,  notes: 'Attending Tuesday cohort.' },
  { id: 3, name: 'Marcus Brown', programme: 'Youth Employability', age: 21, status: 'Graduated', joinDate: '2025-09-01', sessionsAttended: 12, totalSessions: 12, notes: 'Secured employment. Positive outcome.' },
  { id: 4, name: 'Sarah Williams', programme: 'Community Wellbeing', age: 52, status: 'Active', joinDate: '2026-03-10', sessionsAttended: 3, totalSessions: 10, notes: 'Joined via GP social prescribing.' },
  { id: 5, name: 'James Carter', programme: 'Digital Skills', age: 28, status: 'Withdrawn', joinDate: '2026-01-22', sessionsAttended: 2, totalSessions: 8, notes: 'Work commitments. Open to re-joining.' },
  { id: 6, name: 'Fatima Hassan', programme: 'Community Wellbeing', age: 44, status: 'Active', joinDate: '2026-02-28', sessionsAttended: 7, totalSessions: 10, notes: '' },
]

const BEN_STATUS_COLORS: Record<BenStatus, string> = {
  Active: 'green', Graduated: 'blue', Withdrawn: 'red', Referred: 'amber',
}

// ── Session log mock data ─────────────────────────────────────────────────
interface Session {
  id: number; date: string; programme: string; activityType: string
  facilitator: string; attendees: number; notes: string
}

const MOCK_SESSIONS: Session[] = [
  { id: 1, date: '2026-05-16', programme: 'Youth Employability', activityType: 'Workshop', facilitator: 'M. Okonkwo', attendees: 8, notes: 'CV writing and LinkedIn profiles' },
  { id: 2, date: '2026-05-14', programme: 'Digital Skills', activityType: 'Group Session', facilitator: 'T. Singh', attendees: 6, notes: 'Introduction to spreadsheets' },
  { id: 3, date: '2026-05-13', programme: 'Community Wellbeing', activityType: 'Drop-in', facilitator: 'S. O\'Brien', attendees: 11, notes: 'Open session; peer support focus' },
  { id: 4, date: '2026-05-09', programme: 'Youth Employability', activityType: '1-to-1', facilitator: 'M. Okonkwo', attendees: 1, notes: 'Mock interview with Alex Johnson' },
  { id: 5, date: '2026-05-07', programme: 'Digital Skills', activityType: 'Workshop', facilitator: 'T. Singh', attendees: 7, notes: 'Email and online safety session' },
]

// ── SROI outcomes ─────────────────────────────────────────────────────────
interface SROIOutcome {
  label: string; count: number; unitValue: number; attribution: number; deadweight: number
}

const DEFAULT_SROI_OUTCOMES: SROIOutcome[] = [
  { label: 'Participants entering employment', count: 8, unitValue: 18000, attribution: 0.65, deadweight: 0.15 },
  { label: 'Participants gaining qualifications', count: 14, unitValue: 4500, attribution: 0.75, deadweight: 0.10 },
  { label: 'Improved wellbeing (WEMWBS)', count: 22, unitValue: 3200, attribution: 0.60, deadweight: 0.20 },
  { label: 'Reduced social isolation', count: 18, unitValue: 2800, attribution: 0.55, deadweight: 0.25 },
]

export default function Programmes() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState<ProgrammeForm>(EMPTY_FORM)
  const [benSearch, setBenSearch] = useState('')
  const [sroiInvestment, setSroiInvestment] = useState(95000)
  const [sroiVolunteerValue, setSroiVolunteerValue] = useState(12400)
  const [sroiOutcomes, setSroiOutcomes] = useState<SROIOutcome[]>(DEFAULT_SROI_OUTCOMES)

  const { data: progData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['programme-costs'],
    queryFn: api.getProgrammeCosts,
    staleTime: 60_000,
  })

  const createProgramme = useMutation({
    mutationFn: api.createProgramme,
    onSuccess: async () => {
      toast.success('Programme saved')
      setShowCreateForm(false)
      setForm(EMPTY_FORM)
      await queryClient.invalidateQueries({ queryKey: ['programme-costs'] })
      await queryClient.invalidateQueries({ queryKey: ['grants-summary'] })
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.detail ?? 'Failed to save programme')
    },
  })

  const programmes = progData?.programmes ?? []
  const totalBeneficiaries = useMemo(() => programmes.reduce((s: number, p: any) => s + (p.participants ?? 0), 0), [programmes])
  const totalVolunteerHours = useMemo(() => programmes.reduce((s: number, p: any) => s + (p.volunteer_hours ?? 0), 0), [programmes])
  const totalVolunteerValue = useMemo(() => programmes.reduce((s: number, p: any) => s + (p.volunteer_value ?? 0), 0), [programmes])
  const avgCostPerHead = useMemo(() => programmes.length ? programmes.reduce((s: number, p: any) => s + (p.cost_per_beneficiary ?? 0), 0) / programmes.length : 0, [programmes])
  const chartData = useMemo(() => programmes.map((p: any) => ({ name: p.name.split(' ').slice(0, 2).join(' '), Budget: p.total_budget, Spent: p.spent, fullName: p.name })), [programmes])
  const getStatus = (p: any) => { const u = p.utilisation_pct ?? 0; return u > 95 ? 'Over budget' : u > 80 ? 'Near limit' : 'On track' }

  const filteredBeneficiaries = useMemo(() =>
    MOCK_BENEFICIARIES.filter(b =>
      b.name.toLowerCase().includes(benSearch.toLowerCase()) ||
      b.programme.toLowerCase().includes(benSearch.toLowerCase())
    ), [benSearch])

  const sroiSocialValue = useMemo(() => sroiOutcomes.reduce((sum, o) => {
    const gross = o.count * o.unitValue
    return sum + gross * o.attribution * (1 - o.deadweight)
  }, 0) + sroiVolunteerValue, [sroiOutcomes, sroiVolunteerValue])

  const sroiRatio = useMemo(() => sroiInvestment > 0 ? sroiSocialValue / sroiInvestment : 0, [sroiSocialValue, sroiInvestment])

  const saveProgramme = () => {
    if (!form.name.trim()) { toast.error('Enter a programme name first'); return }
    createProgramme.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      total_budget: Number(form.total_budget || 0),
      target_participants: Number(form.target_participants || 0),
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    })
  }

  const errorMessage = (error as any)?.response?.data?.detail || (error as Error | undefined)?.message

  return (
    <AppLayout
      title="Programme Budgets"
      subtitle="Cost per beneficiary · SROI · Beneficiary CRM"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>Realtouch IQ</Button>
          <Button onClick={() => setShowCreateForm(true)}>+ New Programme</Button>
        </div>
      }
    >
      {isError && <Alert variant="error" icon="!"><strong>Programme data could not load.</strong> {errorMessage}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Active Programmes" value={programmes.length} accentColor="#10b981" />
        <StatCard label="Beneficiaries YTD" value={totalBeneficiaries} change="tracked from programme records" changeUp={totalBeneficiaries > 0} accentColor="#3b82f6" />
        <StatCard label="Avg Cost / Person" value={gbp(avgCostPerHead)} accentColor="#8b5cf6" />
        <StatCard label="Volunteer Value" value={gbp(totalVolunteerValue)} change={`${totalVolunteerHours.toLocaleString()} hours`} changeUp accentColor="#f59e0b" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview',      label: 'Programme Overview' },
          { key: 'beneficiaries', label: 'Beneficiary CRM' },
          { key: 'sroi',          label: 'SROI Calculator' },
          { key: 'sessions',      label: 'Session Log' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5, background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent', color: tab === t.key ? 'var(--gold)' : 'var(--mute)', fontWeight: tab === t.key ? 600 : 400, fontFamily: "'Instrument Sans', sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          {!isError && programmes.length === 0 && !isLoading && (
            <Alert variant="info" icon="i"><strong>No programmes yet.</strong> Add your first programme to start tracking budgets, beneficiaries, and cost per person.</Alert>
          )}
          {showCreateForm && (
            <Panel title="Add Programme" titleIcon="+" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <FormInput label="Programme name" value={form.name} onChange={(v) => setForm(c => ({ ...c, name: v }))} placeholder="e.g. Youth Connect" />
                <FormInput label="Total budget" value={form.total_budget} onChange={(v) => setForm(c => ({ ...c, total_budget: v }))} placeholder="e.g. 50000" type="number" />
                <FormInput label="Target participants" value={form.target_participants} onChange={(v) => setForm(c => ({ ...c, target_participants: v }))} placeholder="e.g. 120" type="number" />
                <FormInput label="Start date" value={form.start_date} onChange={(v) => setForm(c => ({ ...c, start_date: v }))} type="date" />
                <FormInput label="End date" value={form.end_date} onChange={(v) => setForm(c => ({ ...c, end_date: v }))} type="date" />
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormInput label="Description" value={form.description} onChange={(v) => setForm(c => ({ ...c, description: v }))} as="textarea" placeholder="What is this programme delivering?" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <Button variant="ghost" onClick={() => { setShowCreateForm(false); setForm(EMPTY_FORM) }}>Cancel</Button>
                <Button onClick={saveProgramme} disabled={createProgramme.isPending}>{createProgramme.isPending ? 'Saving...' : 'Save Programme'}</Button>
              </div>
            </Panel>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 16, marginBottom: 16 }}>
            <Panel title="Budget vs Actual" titleIcon="*">
              {isLoading || isFetching ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 12.5 }}>Loading...</div>
              ) : chartData.length === 0 ? (
                <EmptyState icon="*" title="No programme chart yet" description="Create a programme to see budget versus spend here." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.35)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--mute)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--mute)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--line2)', fontSize: 12, color: 'var(--text)' }} formatter={(v: number, name: string) => [`GBP ${v.toLocaleString()}`, name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''} />
                    <Bar dataKey="Budget" fill="rgba(201,168,76,0.25)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Spent" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Cost Per Beneficiary" titleIcon="o" iconColor="#a78bfa">
              {programmes.length === 0 ? (
                <EmptyState title="No cost data yet" description="Programme costing appears after your first programme is added." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {programmes.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <span style={{ color: 'var(--mute)', fontSize: 12 }}>{p.name.split(' ').slice(0, 3).join(' ')}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: p.cost_per_beneficiary > 500 ? '#f87171' : p.cost_per_beneficiary > 300 ? '#fbbf24' : '#34d399' }}>GBP {Number(p.cost_per_beneficiary).toFixed(0)}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--mute)' }}>Portfolio average</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--heading)' }}>GBP {avgCostPerHead.toFixed(0)}</span>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {programmes.length === 0 ? (
            <Panel><EmptyState icon="o" title="No active programmes" description="Use New Programme to create the first one." /></Panel>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
              {programmes.map((p: any) => {
                const status = getStatus(p)
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--heading)', marginBottom: 4 }}>{p.name}</div>
                        <span style={{ fontSize: 11, color: status === 'On track' ? '#34d399' : status === 'Near limit' ? '#fbbf24' : '#f87171' }}>{status}</span>
                      </div>
                      <Button small variant="ghost" onClick={() => router.push('/ai')}>AI Analyse</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                      {[['Budget', gbp(p.total_budget), 'var(--mute)'], ['Spent', gbp(p.spent), 'var(--heading)'], ['Remaining', gbp(p.remaining), p.remaining < p.total_budget * 0.1 ? '#f87171' : '#34d399']].map(([label, val, color]) => (
                        <div key={label} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <ProgressBar value={p.utilisation_pct} color={p.utilisation_pct > 95 ? '#ef4444' : p.utilisation_pct > 80 ? '#f59e0b' : '#10b981'} height={6} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--mute)', flexWrap: 'wrap', gap: 12 }}>
                      <span>{p.participants} / {p.target_participants} participants</span>
                      <span>{p.volunteer_hours.toLocaleString()}h volunteer ({gbp(p.volunteer_value)} value)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {isError && <div style={{ marginTop: 16 }}><Button onClick={() => refetch()}>Retry Load</Button></div>}
        </>
      )}

      {/* ── Beneficiary CRM ────────────────────────────────────── */}
      {tab === 'beneficiaries' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Beneficiaries" value={String(MOCK_BENEFICIARIES.length)} change="registered" accentColor="#C9A84C" />
            <StatCard label="Active" value={String(MOCK_BENEFICIARIES.filter(b => b.status === 'Active').length)} change="currently engaged" accentColor="#2DCE89" />
            <StatCard label="Graduated" value={String(MOCK_BENEFICIARIES.filter(b => b.status === 'Graduated').length)} change="positive completions" accentColor="#5E9EFF" />
            <StatCard label="Avg Attendance" value={`${(MOCK_BENEFICIARIES.reduce((s, b) => s + (b.sessionsAttended / b.totalSessions), 0) / MOCK_BENEFICIARIES.length * 100).toFixed(0)}%`} change="engagement rate" accentColor="#FB8C00" />
          </div>

          <Panel title="Beneficiary Register" titleIcon="BR" iconColor="#C9A84C" noPadding
            action={
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
                <input placeholder="Search name or programme..." value={benSearch} onChange={(e) => setBenSearch(e.target.value)}
                  style={{ padding: '6px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--text)', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", width: 200 }} />
                <Button small onClick={() => toast.success('Add beneficiary form coming soon')}>+ Add Beneficiary</Button>
              </div>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Name', 'Programme', 'Age', 'Status', 'Joined', 'Attendance', 'Notes', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBeneficiaries.map((b) => {
                    const attendancePct = Math.round(b.sessionsAttended / b.totalSessions * 100)
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)' }}>{b.name}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)' }}>{b.programme}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>{b.age}</td>
                        <td style={{ padding: '12px 14px' }}><Badge variant={BEN_STATUS_COLORS[b.status] as any}>{b.status}</Badge></td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5 }}>{new Date(b.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60 }}><ProgressBar value={attendancePct} color={attendancePct >= 75 ? '#2DCE89' : attendancePct >= 50 ? '#FB8C00' : '#F5365C'} /></div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--mute)' }}>{b.sessionsAttended}/{b.totalSessions}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5, maxWidth: 180 }}>{b.notes || '—'}</td>
                        <td style={{ padding: '12px 14px' }}><Button small variant="ghost" onClick={() => toast.success(`View ${b.name}`)}>View</Button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ── SROI Calculator ─────────────────────────────────────── */}
      {tab === 'sroi' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Investment" value={gbp(sroiInvestment)} change="programme costs + overheads" accentColor="#C9A84C" />
            <StatCard label="Social Value Created" value={gbp(sroiSocialValue)} change="net present value" accentColor="#2DCE89" />
            <StatCard label="SROI Ratio" value={`£${sroiRatio.toFixed(2)}`} change="per £1 invested" changeUp={sroiRatio >= 3} accentColor={sroiRatio >= 3 ? '#2DCE89' : sroiRatio >= 1.5 ? '#FB8C00' : '#F5365C'} />
            <StatCard label="Net Social Value" value={gbp(sroiSocialValue - sroiInvestment)} change="above investment" changeUp={sroiSocialValue > sroiInvestment} accentColor="#5E9EFF" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            <Panel title="Investment Inputs" titleIcon="II" iconColor="#C9A84C">
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>Total Programme Investment (GBP)</label>
                <input type="number" value={sroiInvestment} onChange={(e) => setSroiInvestment(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>Staff, programme, admin, and overhead costs</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>Volunteer Time Value (GBP)</label>
                <input type="number" value={sroiVolunteerValue} onChange={(e) => setSroiVolunteerValue(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>Use NCVO minimum wage valuation or market-rate method</div>
              </div>

              <div style={{ padding: '12px 14px', background: sroiRatio >= 3 ? 'rgba(45,206,137,0.08)' : 'rgba(201,168,76,0.08)', borderRadius: 8, border: `1px solid ${sroiRatio >= 3 ? '#2DCE89' : '#C9A84C'}40` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sroiRatio >= 3 ? '#2DCE89' : '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>SROI Interpretation</div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.7 }}>
                  {sroiRatio >= 5 ? 'Exceptional return — every £1 invested generates more than £5 of social value. Compelling case for funders.' :
                   sroiRatio >= 3 ? 'Strong SROI — industry benchmark for well-run charities. Clearly demonstrates value for money.' :
                   sroiRatio >= 1.5 ? 'Moderate return — positive but consider strengthening outcomes or reducing costs.' :
                   'Below typical benchmarks — review outcome methodology or investment efficiency.'}
                </div>
                <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: sroiRatio >= 3 ? '#2DCE89' : '#C9A84C' }}>
                  £{sroiRatio.toFixed(2)} social value per £1 invested
                </div>
              </div>
            </Panel>

            <Panel title="Outcome Assumptions" titleIcon="OA" iconColor="#5E9EFF">
              <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
                For each outcome, set count, proxy unit value, attribution (your contribution), and deadweight (would have happened anyway).
              </div>
              {sroiOutcomes.map((o, i) => {
                const grossValue = o.count * o.unitValue
                const netValue = grossValue * o.attribution * (1 - o.deadweight)
                return (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 8, marginBottom: 10, border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', marginBottom: 10 }}>{o.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                      {[
                        { label: 'Count', key: 'count', isInt: true },
                        { label: 'Unit Value (£)', key: 'unitValue', isInt: true },
                        { label: 'Attribution %', key: 'attribution', isInt: false },
                        { label: 'Deadweight %', key: 'deadweight', isInt: false },
                      ].map(({ label, key, isInt }) => (
                        <div key={key}>
                          <div style={{ fontSize: 10.5, color: 'var(--mute)', marginBottom: 4 }}>{label}</div>
                          <input
                            type="number"
                            value={isInt ? (o as any)[key] : Math.round((o as any)[key] * 100)}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setSroiOutcomes(prev => prev.map((x, xi) => xi === i ? { ...x, [key]: isInt ? v : v / 100 } : x))
                            }}
                            style={{ width: '100%', padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 6, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span style={{ color: 'var(--mute)' }}>Gross: {gbp(grossValue)}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace', monospace", fontWeight: 600, color: '#2DCE89' }}>Net: {gbp(netValue)}</span>
                    </div>
                  </div>
                )
              })}
            </Panel>
          </div>
        </>
      )}

      {/* ── Session Log ─────────────────────────────────────────── */}
      {tab === 'sessions' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Sessions This Month" value={String(MOCK_SESSIONS.length)} change="logged activities" accentColor="#C9A84C" />
            <StatCard label="Total Attendees" value={String(MOCK_SESSIONS.reduce((s, x) => s + x.attendees, 0))} change="unique touchpoints" accentColor="#2DCE89" />
            <StatCard label="Programmes Active" value={String(new Set(MOCK_SESSIONS.map(s => s.programme)).size)} change="with sessions this month" accentColor="#5E9EFF" />
            <StatCard label="Avg Group Size" value={(MOCK_SESSIONS.reduce((s, x) => s + x.attendees, 0) / MOCK_SESSIONS.length).toFixed(1)} change="attendees per session" accentColor="#FB8C00" />
          </div>

          <Panel title="Session Log" titleIcon="SL" iconColor="#C9A84C" noPadding
            action={
              <div style={{ padding: '12px 16px 0' }}>
                <Button small onClick={() => toast.success('Log session form coming soon')}>+ Log Session</Button>
              </div>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Date', 'Programme', 'Activity Type', 'Facilitator', 'Attendees', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SESSIONS.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute)', fontSize: 11.5 }}>{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)' }}>{s.programme}</td>
                      <td style={{ padding: '12px 14px' }}><Badge variant="blue">{s.activityType}</Badge></td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)' }}>{s.facilitator}</td>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{s.attendees}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5 }}>{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
