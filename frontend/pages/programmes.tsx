import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Button, EmptyState, FormInput, Panel, ProgressBar, StatCard } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type ProgrammeForm = {
  name: string
  description: string
  total_budget: string
  target_participants: string
  start_date: string
  end_date: string
}

const EMPTY_FORM: ProgrammeForm = {
  name: '',
  description: '',
  total_budget: '',
  target_participants: '',
  start_date: '',
  end_date: '',
}

const gbp = (n: number) => `GBP ${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function Programmes() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState<ProgrammeForm>(EMPTY_FORM)

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

  const totalBeneficiaries = useMemo(
    () => programmes.reduce((s: number, p: any) => s + (p.participants ?? 0), 0),
    [programmes]
  )
  const totalVolunteerHours = useMemo(
    () => programmes.reduce((s: number, p: any) => s + (p.volunteer_hours ?? 0), 0),
    [programmes]
  )
  const totalVolunteerValue = useMemo(
    () => programmes.reduce((s: number, p: any) => s + (p.volunteer_value ?? 0), 0),
    [programmes]
  )
  const avgCostPerHead = useMemo(
    () =>
      programmes.length
        ? programmes.reduce((s: number, p: any) => s + (p.cost_per_beneficiary ?? 0), 0) / programmes.length
        : 0,
    [programmes]
  )

  const chartData = useMemo(
    () =>
      programmes.map((p: any) => ({
        name: p.name.split(' ').slice(0, 2).join(' '),
        Budget: p.total_budget,
        Spent: p.spent,
        fullName: p.name,
      })),
    [programmes]
  )

  const getStatus = (p: any) => {
    const pct = p.utilisation_pct ?? 0
    if (pct > 95) return 'Over budget'
    if (pct > 80) return 'Near limit'
    return 'On track'
  }

  const saveProgramme = () => {
    if (!form.name.trim()) {
      toast.error('Enter a programme name first')
      return
    }

    createProgramme.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      total_budget: Number(form.total_budget || 0),
      target_participants: Number(form.target_participants || 0),
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    })
  }

  const closeCreateForm = () => {
    setShowCreateForm(false)
    setForm(EMPTY_FORM)
  }

  const errorMessage = (error as any)?.response?.data?.detail || (error as Error | undefined)?.message

  return (
    <AppLayout
      title="Programme Budgets"
      subtitle="Cost per beneficiary"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>AI Analysis</Button>
          <Button onClick={() => setShowCreateForm(true)}>+ New Programme</Button>
        </div>
      }
    >
      {isError && (
        <Alert variant="error" icon="!">
          <strong>Programme data could not load.</strong> {errorMessage || 'Please refresh the page or try again in a moment.'}
        </Alert>
      )}

      {!isError && programmes.length === 0 && !isLoading && (
        <Alert variant="info" icon="i">
          <strong>No programmes yet.</strong> Add your first programme to start tracking budgets, beneficiaries, and cost per person in this workspace.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Programmes" value={programmes.length} accentColor="#10b981" />
        <StatCard label="Beneficiaries YTD" value={totalBeneficiaries} change="Up 18%" changeUp accentColor="#3b82f6" />
        <StatCard label="Avg Cost / Person" value={gbp(avgCostPerHead)} accentColor="#8b5cf6" />
        <StatCard label="Volunteer Value" value={gbp(totalVolunteerValue)} change={`${totalVolunteerHours.toLocaleString()} hours`} changeUp accentColor="#f59e0b" />
      </div>

      {showCreateForm && (
        <Panel title="Add Programme" titleIcon="+" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <FormInput label="Programme name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="e.g. Youth Connect" />
            <FormInput label="Total budget" value={form.total_budget} onChange={(value) => setForm((current) => ({ ...current, total_budget: value }))} placeholder="e.g. 50000" type="number" />
            <FormInput label="Target participants" value={form.target_participants} onChange={(value) => setForm((current) => ({ ...current, target_participants: value }))} placeholder="e.g. 120" type="number" />
            <FormInput label="Start date" value={form.start_date} onChange={(value) => setForm((current) => ({ ...current, start_date: value }))} type="date" />
            <FormInput label="End date" value={form.end_date} onChange={(value) => setForm((current) => ({ ...current, end_date: value }))} type="date" />
            <div style={{ gridColumn: '1 / -1' }}>
              <FormInput label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} as="textarea" placeholder="What is this programme delivering?" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={closeCreateForm}>Cancel</Button>
            <Button onClick={saveProgramme} disabled={createProgramme.isPending}>
              {createProgramme.isPending ? 'Saving...' : 'Save Programme'}
            </Button>
          </div>
        </Panel>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 16, marginBottom: 16 }}>
        <Panel title="Budget vs Actual" titleIcon="*">
          {isLoading || isFetching ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 12.5 }}>
              Loading programme budget data...
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState icon="*" title="No programme chart yet" description="Create a programme to see budget versus spend here." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.35)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--line2)', fontSize: 12, color: 'var(--text)' }}
                  formatter={(v: number, name: string) => [`GBP ${v.toLocaleString()}`, name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                />
                <Bar dataKey="Budget" fill="rgba(51,65,85,0.6)" radius={[3, 3, 0, 0]} name="Budget" />
                <Bar dataKey="Spent" fill="#10b981" radius={[3, 3, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Cost Per Beneficiary" titleIcon="o" iconColor="#a78bfa">
          {programmes.length === 0 ? (
            <EmptyState title="No cost data yet" description="Programme costing appears here after your first programme is added." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {programmes.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(51,65,85,0.2)', fontSize: 13 }}>
                  <span style={{ color: 'var(--mute)', fontSize: 12 }}>{p.name.split(' ').slice(0, 3).join(' ')}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 500,
                      color: p.cost_per_beneficiary > 500 ? '#f87171' : p.cost_per_beneficiary > 300 ? '#fbbf24' : '#34d399',
                    }}
                  >
                    GBP {Number(p.cost_per_beneficiary).toFixed(0)}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid var(--line2)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--mute)' }}>Portfolio average</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--heading)' }}>GBP {avgCostPerHead.toFixed(0)}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {programmes.length === 0 ? (
        <Panel>
          <EmptyState
            icon="o"
            title="No active programmes in this workspace"
            description="Use New Programme to create the first one. The page will then calculate beneficiaries, budget usage, and volunteer value automatically."
          />
        </Panel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {programmes.map((p: any) => {
            const status = getStatus(p)
            return (
              <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--heading)', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: status === 'On track' ? '#34d399' : status === 'Near limit' ? '#fbbf24' : '#f87171' }}>{status}</span>
                      {p.utilisation_pct > 80 && <span style={{ fontSize: 11, color: '#fbbf24' }}>{p.utilisation_pct.toFixed(0)}% used</span>}
                    </div>
                  </div>
                  <Button small variant="ghost" onClick={() => router.push('/ai')}>AI Analyse</Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                  {[
                    ['Budget', gbp(p.total_budget), 'var(--mute)'],
                    ['Spent', gbp(p.spent), 'var(--heading)'],
                    ['Remaining', gbp(p.remaining), p.remaining < p.total_budget * 0.1 ? '#f87171' : '#34d399'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
                    </div>
                  ))}
                </div>

                <ProgressBar
                  value={p.utilisation_pct}
                  color={p.utilisation_pct > 95 ? '#ef4444' : p.utilisation_pct > 80 ? '#f59e0b' : '#10b981'}
                  height={6}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--mute)', gap: 12, flexWrap: 'wrap' }}>
                  <span>{p.participants} / {p.target_participants} participants</span>
                  <span>{p.volunteer_hours.toLocaleString()}h volunteer ({gbp(p.volunteer_value)} value)</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isError && (
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => refetch()}>Retry Load</Button>
        </div>
      )}
    </AppLayout>
  )
}
