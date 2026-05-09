import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, Panel, ProgressBar, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Tab = 'overview' | 'dept' | 'variance' | 'forecast'

const BUDGET_DATA = [
  { category: 'Staff Costs', budget: 58200, actual: 54600, variance: 3600, variantPct: 6.2 },
  { category: 'Programme Delivery', budget: 24000, actual: 26400, variance: -2400, variantPct: -10.0 },
  { category: 'Overheads', budget: 14800, actual: 13900, variance: 900, variantPct: 6.1 },
  { category: 'Marketing', budget: 4200, actual: 5100, variance: -900, variantPct: -21.4 },
  { category: 'Training and CPD', budget: 2800, actual: 2200, variance: 600, variantPct: 21.4 },
]

const DEPT_DATA = [
  { dept: 'Youth Connect', allocated: 'GBP 38,000', spent: 'GBP 31,200', remaining: 'GBP 6,800', pct: 82 },
  { dept: 'Skills Hub', allocated: 'GBP 28,500', spent: 'GBP 24,100', remaining: 'GBP 4,400', pct: 85 },
  { dept: 'Community Outreach', allocated: 'GBP 18,000', spent: 'GBP 12,600', remaining: 'GBP 5,400', pct: 70 },
  { dept: 'Core Ops', allocated: 'GBP 19,500', spent: 'GBP 17,800', remaining: 'GBP 1,700', pct: 91 },
]

export default function Budgets() {
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState('YTD')
  const [varianceNarrative, setVarianceNarrative] = useState('Variance commentary will appear here once you run the analysis.')
  const [budgetNote, setBudgetNote] = useState('No new budget adjustment logged yet.')

  const chartData = useMemo(
    () => BUDGET_DATA.map((row) => ({ name: row.category.split(' ')[0], budget: row.budget, actual: row.actual })),
    []
  )

  const exportBudgetPack = () => {
    downloadCsvFile('budget-vs-actual.csv', BUDGET_DATA)
    toast.success('Budget export downloaded')
  }

  const setBudget = () => {
    setBudgetNote(`Budget checkpoint saved for ${period}. Department heads can now review their latest allocations.`)
    toast.success('Budget checkpoint saved')
  }

  const analyseVariances = () => {
    const worst = [...BUDGET_DATA].sort((a, b) => a.variantPct - b.variantPct)[0]
    setVarianceNarrative(`Largest pressure point: ${worst.category} is over budget by GBP ${Math.abs(worst.variance).toLocaleString()} (${Math.abs(worst.variantPct).toFixed(1)}%). Review unplanned commitments and rephase lower-priority spend.`)
    toast.success('Variance analysis updated')
  }

  return (
    <AppLayout
      title="Budgets and FP&A"
      subtitle="Financial planning and analysis"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportBudgetPack}>Export</Button>
          <Button onClick={setBudget}>Set Budget</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Budget" value="GBP 104,000" change="FY 2024-25" icon="B" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Total Spent" value="GBP 102,200" change="98.3% utilised" icon="S" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Remaining" value="GBP 1,800" change="1.7% of budget" changeUp={false} icon="R" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Net Variance" value="+GBP 1,800" change="Under budget YTD" changeUp icon="V" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
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
                {['YTD', 'Q1', 'Q2', 'Q3', 'Q4'].map((p) => <option key={p}>{p}</option>)}
              </select>
              <Button onClick={setBudget}>Set Budget</Button>
            </div>
          </div>

          <Panel title="Budget Summary" titleIcon="BS" iconColor="#C9A84C" noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#7A8BA8' }}>GBP {r.budget.toLocaleString()}</span> },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>GBP {r.actual.toLocaleString()}</span> },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}GBP {Math.abs(r.variance).toLocaleString()}</span> },
                { key: 'variantPct', header: '% Var', align: 'right', render: (r) => <Badge variant={r.variantPct >= 0 ? 'green' : 'red'}>{r.variantPct >= 0 ? '+' : ''}{r.variantPct.toFixed(1)}%</Badge> },
              ]}
              data={BUDGET_DATA}
            />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
            <Panel title="Budget Utilisation Chart" titleIcon="CH" iconColor="#C9A84C">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`GBP ${v.toLocaleString()}`, '']} />
                  <Bar dataKey="budget" fill="rgba(201,168,76,0.25)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Budget" />
                  <Bar dataKey="actual" fill="rgba(201,168,76,0.55)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
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
            data={DEPT_DATA}
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
                { key: 'budget', header: 'Budget', align: 'right', render: (r) => `GBP ${r.budget.toLocaleString()}` },
                { key: 'actual', header: 'Actual', align: 'right', render: (r) => `GBP ${r.actual.toLocaleString()}` },
                { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>{r.variance >= 0 ? '+' : '-'}GBP {Math.abs(r.variance).toLocaleString()}</span> },
                { key: 'cause', header: 'Likely Cause' },
              ]}
              data={[
                { category: 'Programme Delivery', budget: 24000, actual: 26400, variance: -2400, cause: 'Additional workshops in February' },
                { category: 'Marketing', budget: 4200, actual: 5100, variance: -900, cause: 'Unplanned print campaign' },
                { category: 'Staff Costs', budget: 58200, actual: 54600, variance: 3600, cause: 'Vacancy savings in Q1 and Q2' },
              ]}
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
            data={[
              { category: 'Staff Costs', h1: 'GBP 27,300', h2: 'GBP 27,300', fy: 'GBP 54,600', budget: 'GBP 58,200', v: '+GBP 3,600', vNum: 3600 },
              { category: 'Programme Delivery', h1: 'GBP 13,200', h2: 'GBP 13,200', fy: 'GBP 26,400', budget: 'GBP 24,000', v: '-GBP 2,400', vNum: -2400 },
              { category: 'Overheads', h1: 'GBP 6,950', h2: 'GBP 6,950', fy: 'GBP 13,900', budget: 'GBP 14,800', v: '+GBP 900', vNum: 900 },
            ]}
          />
        </Panel>
      )}
    </AppLayout>
  )
}
