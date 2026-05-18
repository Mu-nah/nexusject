import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, Panel, ProgressBar, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Tab = 'overview' | 'dept' | 'variance' | 'forecast' | 'scenarios'
type Scenario = 'best' | 'base' | 'worst'

interface ScenarioAssumptions {
  grantsIncome: number
  contractIncome: number
  donations: number
  otherIncome: number
  staffCosts: number
  programmeCosts: number
  adminOverhead: number
  premises: number
}

const SCENARIO_DEFAULTS: Record<Scenario, ScenarioAssumptions> = {
  base: { grantsIncome: 450000, contractIncome: 180000, donations: 85000, otherIncome: 25000, staffCosts: 320000, programmeCosts: 145000, adminOverhead: 65000, premises: 48000 },
  best: { grantsIncome: 540000, contractIncome: 215000, donations: 115000, otherIncome: 38000, staffCosts: 335000, programmeCosts: 165000, adminOverhead: 65000, premises: 48000 },
  worst: { grantsIncome: 330000, contractIncome: 135000, donations: 58000, otherIncome: 14000, staffCosts: 305000, programmeCosts: 112000, adminOverhead: 58000, premises: 48000 },
}

const SCENARIO_META: Record<Scenario, { label: string; color: string; bg: string; description: string }> = {
  best:  { label: 'Best Case',  color: '#2DCE89', bg: 'rgba(45,206,137,0.08)',  description: 'All major grants secured, strong fundraising, contracts renewed at full value' },
  base:  { label: 'Base Case',  color: '#C9A84C', bg: 'rgba(201,168,76,0.08)',  description: 'Expected outcome based on current pipeline and historic performance' },
  worst: { label: 'Worst Case', color: '#F5365C', bg: 'rgba(245,54,92,0.08)',   description: 'Key grant not renewed, reduced contracts, significant cost pressures materialise' },
}

const INCOME_DRIVERS = [
  { key: 'grantsIncome', label: 'Grants & Trusts Income' },
  { key: 'contractIncome', label: 'Contract / Commissioned Income' },
  { key: 'donations', label: 'Donations & Fundraising' },
  { key: 'otherIncome', label: 'Other Income' },
] as const

const EXPENDITURE_DRIVERS = [
  { key: 'staffCosts', label: 'Staff Costs (Salaries + NI + Pension)' },
  { key: 'programmeCosts', label: 'Programme Delivery Costs' },
  { key: 'adminOverhead', label: 'Admin & Overhead' },
  { key: 'premises', label: 'Premises & Facilities' },
] as const

function calcScenario(a: ScenarioAssumptions) {
  const totalIncome = a.grantsIncome + a.contractIncome + a.donations + a.otherIncome
  const totalExpenditure = a.staffCosts + a.programmeCosts + a.adminOverhead + a.premises
  return { totalIncome, totalExpenditure, net: totalIncome - totalExpenditure }
}

const currency = (value: number) => `GBP ${value.toLocaleString()}`

export default function Budgets() {
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState('YTD')
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['planning-budgets'],
    queryFn: api.getPlanningBudgets,
    staleTime: 60_000,
  })

  const [varianceNarrative, setVarianceNarrative] = useState('Variance commentary will appear here once you run the analysis.')
  const [budgetNote, setBudgetNote] = useState('No new budget adjustment logged yet.')
  const [activeScenario, setActiveScenario] = useState<Scenario>('base')
  const [scenarioAssumptions, setScenarioAssumptions] = useState<Record<Scenario, ScenarioAssumptions>>(SCENARIO_DEFAULTS)

  const updateAssumption = (scenario: Scenario, key: keyof ScenarioAssumptions, value: number) => {
    setScenarioAssumptions(prev => ({ ...prev, [scenario]: { ...prev[scenario], [key]: value } }))
  }

  const scenarioResults = useMemo(() => ({
    best:  calcScenario(scenarioAssumptions.best),
    base:  calcScenario(scenarioAssumptions.base),
    worst: calcScenario(scenarioAssumptions.worst),
  }), [scenarioAssumptions])

  useEffect(() => {
    if (data?.variance_narrative) {
      setVarianceNarrative(data.variance_narrative)
    }
    if (data?.budget_note) {
      setBudgetNote(data.budget_note)
    }
  }, [data])

  const categories = data?.categories ?? []
  const departments = data?.departments ?? []
  const varianceRows = data?.variance_rows ?? []
  const forecastRows = data?.forecast_rows ?? []
  const summary = data?.summary

  const chartData = useMemo(
    () => categories.map((row: any) => ({ name: row.category.split(' ')[0], budget: row.budget, actual: row.actual })),
    [categories]
  )

  const exportBudgetPack = () => {
    downloadCsvFile('budget-vs-actual.csv', categories)
    toast.success('Budget export downloaded')
  }

  const saveBudgetCheckpoint = async () => {
    await refetch()
    setBudgetNote(`Budget checkpoint refreshed for ${period}. The latest plan and actuals are now in view.`)
    toast.success('Budget checkpoint refreshed')
  }

  const analyseVariances = () => {
    setVarianceNarrative(data?.variance_narrative ?? 'Variance commentary will appear here after the analysis refreshes.')
    toast.success('Variance analysis updated')
  }

  return (
    <AppLayout
      title="Budgets and FP&A"
      subtitle="Financial planning and analysis"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportBudgetPack}>Export</Button>
          <Button onClick={saveBudgetCheckpoint}>Refresh Plan</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Budget" value={summary ? currency(summary.total_budget) : 'Loading...'} change="FY planning view" icon="B" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Total Spent" value={summary ? currency(summary.total_spent) : 'Loading...'} change="Current actuals" icon="S" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Remaining" value={summary ? currency(Math.abs(summary.remaining)) : 'Loading...'} change={summary && summary.remaining < 0 ? 'Overspent against plan' : 'Headroom remaining'} changeUp={!!summary && summary.remaining >= 0} icon="R" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Net Variance" value={summary ? `${summary.net_variance >= 0 ? '+' : '-'}${currency(Math.abs(summary.net_variance))}` : 'Loading...'} change={`${summary?.active_staff ?? 0} active staff in planning scope`} changeUp={!!summary && summary.net_variance >= 0} icon="V" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview', label: 'Budget vs Actual' },
          { key: 'dept', label: 'Departmental Budgets' },
          { key: 'variance', label: 'Variance Analysis' },
          { key: 'forecast', label: 'Full Year Forecast' },
          { key: 'scenarios', label: 'Scenario Modelling' },
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

      {tab === 'overview' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Budget vs Actual</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--line2)',
                  color: 'var(--text)',
                  borderRadius: 7,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                {(data?.periods ?? ['YTD']).map((p: string) => <option key={p}>{p}</option>)}
              </select>
              <Button onClick={saveBudgetCheckpoint}>Refresh Plan</Button>
            </div>
          </div>

          <Panel title="Budget Summary" titleIcon="BS" iconColor="#C9A84C" noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute2)' }}>{currency(r.budget)}</span> },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{currency(r.actual)}</span> },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}{currency(Math.abs(r.variance))}</span> },
                { key: 'variantPct', header: '% Var', align: 'right', render: (r) => <Badge variant={r.variantPct >= 0 ? 'green' : 'red'}>{r.variantPct >= 0 ? '+' : ''}{r.variantPct.toFixed(1)}%</Badge> },
              ]}
              data={categories}
            />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
            <Panel title="Budget Utilisation Chart" titleIcon="CH" iconColor="#C9A84C">
              {isLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute2)', fontSize: 12.5 }}>
                  Loading budget chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--mute)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--mute)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(v: number) => [currency(v), '']} />
                    <Bar dataKey="budget" fill="rgba(201,168,76,0.25)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Budget" />
                    <Bar dataKey="actual" fill="rgba(201,168,76,0.55)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Budget Control Note" titleIcon="NT" iconColor="#5E9EFF">
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.8 }}>{budgetNote}</div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'dept' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'dept', header: 'Department', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.dept}</span> },
              { key: 'allocated', header: 'Allocated', align: 'right', mono: true },
              { key: 'spent', header: 'Spent', align: 'right', mono: true },
              { key: 'remaining', header: 'Remaining', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>{r.remaining}</span> },
              {
                key: 'pct',
                header: 'Utilisation',
                render: (r) => (
                  <div style={{ width: 100 }}>
                    <ProgressBar value={r.pct} color={r.pct > 90 ? '#F5365C' : r.pct > 80 ? '#FB8C00' : '#C9A84C'} />
                    <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{r.pct}%</div>
                  </div>
                ),
              },
            ]}
            data={departments}
          />
        </Panel>
      )}

      {tab === 'variance' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Variance Analysis</div>
            <Button onClick={analyseVariances}>Analyse Variances</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => currency(r.budget) },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => currency(r.actual) },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}{currency(Math.abs(r.variance))}</span> },
                { key: 'cause', header: 'Likely Cause' },
              ]}
              data={varianceRows}
            />
          </Panel>
          <Panel title="Variance Narrative" titleIcon="AI" iconColor="#C9A84C" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.8 }}>{varianceNarrative}</div>
          </Panel>
        </>
      )}

      {tab === 'forecast' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.category}</span> },
              { key: 'h1', header: 'H1 Actual', align: 'right', mono: true },
              { key: 'h2', header: 'H2 Forecast', align: 'right', mono: true },
              { key: 'fy', header: 'FY Total', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{r.fy}</span> },
              { key: 'budget', header: 'Original Budget', align: 'right', mono: true },
              { key: 'v', header: 'Variance', align: 'right', render: (r) => <Badge variant={r.vNum >= 0 ? 'green' : 'red'}>{r.v}</Badge> },
            ]}
            data={forecastRows}
          />
        </Panel>
      )}

      {tab === 'scenarios' && (
        <>
          {/* Scenario selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            {(['best', 'base', 'worst'] as Scenario[]).map((s) => {
              const meta = SCENARIO_META[s]
              const res = scenarioResults[s]
              const isActive = activeScenario === s
              return (
                <button
                  key={s}
                  onClick={() => setActiveScenario(s)}
                  style={{
                    flex: '1 1 200px',
                    padding: '14px 18px',
                    border: `1.5px solid ${isActive ? meta.color : 'var(--line)'}`,
                    borderRadius: 10,
                    background: isActive ? meta.bg : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 11, color: meta.color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'Instrument Sans', sans-serif" }}>{meta.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: isActive ? meta.color : 'var(--heading)', marginBottom: 4 }}>
                    {res.net >= 0 ? '+' : ''}{currency(res.net)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.5 }}>{meta.description}</div>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginBottom: 14 }}>
            {/* Assumption Drivers */}
            <Panel title={`${SCENARIO_META[activeScenario].label} — Assumption Drivers`} titleIcon="AD" iconColor={SCENARIO_META[activeScenario].color}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Income Assumptions</div>
              {INCOME_DRIVERS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>GBP</span>
                    <input
                      type="number"
                      value={scenarioAssumptions[activeScenario][key]}
                      onChange={(e) => updateAssumption(activeScenario, key, Number(e.target.value))}
                      style={{
                        width: 100,
                        padding: '5px 8px',
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--line2)',
                        borderRadius: 6,
                        color: 'var(--heading)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />

              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Expenditure Assumptions</div>
              {EXPENDITURE_DRIVERS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>GBP</span>
                    <input
                      type="number"
                      value={scenarioAssumptions[activeScenario][key]}
                      onChange={(e) => updateAssumption(activeScenario, key, Number(e.target.value))}
                      style={{
                        width: 100,
                        padding: '5px 8px',
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--line2)',
                        borderRadius: 6,
                        color: 'var(--heading)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />

              {/* Active scenario totals */}
              {(['totalIncome', 'totalExpenditure', 'net'] as const).map((metric) => {
                const val = scenarioResults[activeScenario][metric]
                const labels = { totalIncome: 'Total Income', totalExpenditure: 'Total Expenditure', net: 'Net Surplus / (Deficit)' }
                const isNet = metric === 'net'
                return (
                  <div key={metric} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: isNet ? 'none' : '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12.5, color: isNet ? 'var(--heading)' : 'var(--mute)', fontWeight: isNet ? 600 : 400 }}>{labels[metric]}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: isNet ? 700 : 500, color: isNet ? (val >= 0 ? '#2DCE89' : '#F5365C') : 'var(--text)' }}>
                      {isNet && val >= 0 ? '+' : ''}{currency(val)}
                    </span>
                  </div>
                )
              })}
            </Panel>

            {/* Scenario Comparison */}
            <Panel title="Scenario Comparison" titleIcon="SC" iconColor="#C9A84C">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--mute)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Line</th>
                    {(['worst', 'base', 'best'] as Scenario[]).map((s) => (
                      <th key={s} style={{ textAlign: 'right', padding: '6px 4px', color: SCENARIO_META[s].color, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: activeScenario === s ? `2px solid ${SCENARIO_META[s].color}` : '2px solid transparent' }}>
                        {SCENARIO_META[s].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...INCOME_DRIVERS, ...EXPENDITURE_DRIVERS].map(({ key, label }, idx) => {
                    const isFirstExpenditure = idx === INCOME_DRIVERS.length
                    return (
                      <>
                        {isFirstExpenditure && (
                          <tr key="divider-label">
                            <td colSpan={4} style={{ padding: '10px 0 4px', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Expenditure</td>
                          </tr>
                        )}
                        {idx === 0 && (
                          <tr key="income-label">
                            <td colSpan={4} style={{ padding: '4px 0', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Income</td>
                          </tr>
                        )}
                        <tr key={key} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '7px 0', color: 'var(--text)' }}>{label}</td>
                          {(['worst', 'base', 'best'] as Scenario[]).map((s) => (
                            <td key={s} style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", padding: '7px 4px', color: activeScenario === s ? SCENARIO_META[s].color : 'var(--mute2)', fontWeight: activeScenario === s ? 600 : 400 }}>
                              {currency(scenarioAssumptions[s][key as keyof ScenarioAssumptions])}
                            </td>
                          ))}
                        </tr>
                      </>
                    )
                  })}

                  {/* Totals */}
                  {(['totalIncome', 'totalExpenditure', 'net'] as const).map((metric) => {
                    const labels = { totalIncome: 'Total Income', totalExpenditure: 'Total Expenditure', net: 'Net Surplus / (Deficit)' }
                    const topBorder = metric === 'totalIncome' || metric === 'totalExpenditure' || metric === 'net'
                    return (
                      <tr key={metric} style={{ borderTop: topBorder ? '2px solid var(--line)' : undefined }}>
                        <td style={{ padding: '8px 0', fontWeight: 700, color: 'var(--heading)', fontSize: 12.5 }}>{labels[metric]}</td>
                        {(['worst', 'base', 'best'] as Scenario[]).map((s) => {
                          const val = scenarioResults[s][metric]
                          const isNet = metric === 'net'
                          return (
                            <td key={s} style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", padding: '8px 4px', fontWeight: 700, fontSize: 13, color: isNet ? (val >= 0 ? '#2DCE89' : '#F5365C') : (activeScenario === s ? SCENARIO_META[s].color : 'var(--text)') }}>
                              {isNet && val >= 0 ? '+' : ''}{currency(val)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Resilience Range</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--mute)' }}>Downside vs Base</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#F5365C' }}>{currency(scenarioResults.base.net - scenarioResults.worst.net)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 4 }}>
                  <span style={{ color: 'var(--mute)' }}>Upside vs Base</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2DCE89' }}>+{currency(scenarioResults.best.net - scenarioResults.base.net)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 4 }}>
                  <span style={{ color: 'var(--mute)' }}>Full Swing (Worst→Best)</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{currency(scenarioResults.best.net - scenarioResults.worst.net)}</span>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Scenario Guidance" titleIcon="SG" iconColor="#5E9EFF">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {(['best', 'base', 'worst'] as Scenario[]).map((s) => (
                <div key={s} style={{ padding: '12px 14px', borderRadius: 8, background: SCENARIO_META[s].bg, border: `1px solid ${SCENARIO_META[s].color}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SCENARIO_META[s].color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{SCENARIO_META[s].label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.65 }}>{SCENARIO_META[s].description}</div>
                  <div style={{ marginTop: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: SCENARIO_META[s].color, fontWeight: 600 }}>
                    Net: {scenarioResults[s].net >= 0 ? '+' : ''}{currency(scenarioResults[s].net)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
