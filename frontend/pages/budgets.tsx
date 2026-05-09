import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, Panel, ProgressBar, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Tab = 'overview' | 'dept' | 'variance' | 'forecast'

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

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview', label: 'Budget vs Actual' },
          { key: 'dept', label: 'Departmental Budgets' },
          { key: 'variance', label: 'Variance Analysis' },
          { key: 'forecast', label: 'Full Year Forecast' },
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
              color: tab === t.key ? '#E8C56A' : '#5C6B84',
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Budget vs Actual</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  background: '#1C2230',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#C8D3E8',
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
                { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#7A8BA8' }}>{currency(r.budget)}</span> },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{currency(r.actual)}</span> },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}{currency(Math.abs(r.variance))}</span> },
                { key: 'variantPct', header: '% Var', align: 'right', render: (r) => <Badge variant={r.variantPct >= 0 ? 'green' : 'red'}>{r.variantPct >= 0 ? '+' : ''}{r.variantPct.toFixed(1)}%</Badge> },
              ]}
              data={categories}
            />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
            <Panel title="Budget Utilisation Chart" titleIcon="CH" iconColor="#C9A84C">
              {isLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A8BA8', fontSize: 12.5 }}>
                  Loading budget chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [currency(v), '']} />
                    <Bar dataKey="budget" fill="rgba(201,168,76,0.25)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Budget" />
                    <Bar dataKey="actual" fill="rgba(201,168,76,0.55)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Budget Control Note" titleIcon="NT" iconColor="#5E9EFF">
              <div style={{ fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.8 }}>{budgetNote}</div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'dept' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'dept', header: 'Department', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.dept}</span> },
              { key: 'allocated', header: 'Allocated', align: 'right', mono: true },
              { key: 'spent', header: 'Spent', align: 'right', mono: true },
              { key: 'remaining', header: 'Remaining', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>{r.remaining}</span> },
              {
                key: 'pct',
                header: 'Utilisation',
                render: (r) => (
                  <div style={{ width: 100 }}>
                    <ProgressBar value={r.pct} color={r.pct > 90 ? '#F5365C' : r.pct > 80 ? '#FB8C00' : '#C9A84C'} />
                    <div style={{ fontSize: 10, color: '#5C6B84', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{r.pct}%</div>
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Variance Analysis</div>
            <Button onClick={analyseVariances}>Analyse Variances</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => currency(r.budget) },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => currency(r.actual) },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}{currency(Math.abs(r.variance))}</span> },
                { key: 'cause', header: 'Likely Cause' },
              ]}
              data={varianceRows}
            />
          </Panel>
          <Panel title="Variance Narrative" titleIcon="AI" iconColor="#C9A84C" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.8 }}>{varianceNarrative}</div>
          </Panel>
        </>
      )}

      {tab === 'forecast' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
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
    </AppLayout>
  )
}
