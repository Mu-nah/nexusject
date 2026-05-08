import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, ProgressBar } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Tab = 'overview' | 'dept' | 'variance' | 'forecast'

const BUDGET_DATA = [
  { category: 'Staff Costs', budget: 58200, actual: 54600, variance: 3600, variantPct: 6.2, color: '#2DCE89' },
  { category: 'Programme Delivery', budget: 24000, actual: 26400, variance: -2400, variantPct: -10.0, color: '#F5365C' },
  { category: 'Overheads', budget: 14800, actual: 13900, variance: 900, variantPct: 6.1, color: '#2DCE89' },
  { category: 'Marketing', budget: 4200, actual: 5100, variance: -900, variantPct: -21.4, color: '#F5365C' },
  { category: 'Training & CPD', budget: 2800, actual: 2200, variance: 600, variantPct: 21.4, color: '#2DCE89' },
]

const CHART_DATA = BUDGET_DATA.map(d => ({ name: d.category.split(' ')[0], budget: d.budget, actual: d.actual }))

const DEPT_DATA = [
  { dept: 'Youth Connect', allocated: '£38,000', spent: '£31,200', remaining: '£6,800', pct: 82 },
  { dept: 'Skills Hub', allocated: '£28,500', spent: '£24,100', remaining: '£4,400', pct: 85 },
  { dept: 'Community Outreach', allocated: '£18,000', spent: '£12,600', remaining: '£5,400', pct: 70 },
  { dept: 'Core Ops', allocated: '£19,500', spent: '£17,800', remaining: '£1,700', pct: 91 },
]

export default function Budgets() {
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState('YTD')

  return (
    <AppLayout
      title="Budgets & FP&A"
      subtitle="Financial Planning & Analysis"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>✎ Set Budget</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Budget" value="£104,000" change="FY 2024–25" icon="◫" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Total Spent" value="£102,200" change="98.3% utilised" icon="↓" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Remaining" value="£1,800" change="1.7% of budget" changeUp={false} icon="◷" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Net Variance" value="+£1,800" change="Under budget YTD" changeUp icon="✓" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'overview', label: 'Budget vs Actual' },
          { key: 'dept', label: 'Departmental Budgets' },
          { key: 'variance', label: 'Variance Analysis' },
          { key: 'forecast', label: 'Full Year Forecast' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Budget vs Actual — FY 2024–25</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={{
                background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', color: '#C8D3E8',
                borderRadius: 7, padding: '6px 12px', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif",
              }}>
                {['YTD', 'Q1', 'Q2', 'Q3', 'Q4'].map(p => <option key={p}>{p}</option>)}
              </select>
              <Button>✎ Set Budget</Button>
            </div>
          </div>
          <Panel title="Budget vs Actual Summary" titleIcon="≡" iconColor="#C9A84C">
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#7A8BA8' }}>£{r.budget.toLocaleString()}</span> },
                { key: 'actual', header: 'Actual', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>£{r.actual.toLocaleString()}</span> },
                { key: 'variance', header: 'Variance', align: 'right', render: r => (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>
                    {r.variance >= 0 ? '+' : ''}£{Math.abs(r.variance).toLocaleString()}
                  </span>
                )},
                { key: 'variantPct', header: '% Var', align: 'right', render: r => (
                  <Badge variant={r.variantPct >= 0 ? 'green' : 'red'}>{r.variantPct >= 0 ? '+' : ''}{r.variantPct.toFixed(1)}%</Badge>
                )},
              ]}
              data={BUDGET_DATA}
            />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <Panel title="Budget Utilisation Chart" titleIcon="◈" iconColor="#C9A84C">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CHART_DATA} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v/1000}k`} />
                  <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`£${v.toLocaleString()}`, '']} />
                  <Bar dataKey="budget" fill="rgba(201,168,76,0.25)" stroke="#C9A84C" strokeWidth={1} radius={[3,3,0,0]} name="Budget" />
                  <Bar dataKey="actual" fill="rgba(201,168,76,0.55)" stroke="#C9A84C" strokeWidth={1} radius={[3,3,0,0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Variance Alerts" titleIcon="!" iconColor="#FB8C00">
              {BUDGET_DATA.filter(d => d.variantPct < 0).map(d => (
                <div key={d.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#C8D3E8' }}>{d.category}</div>
                    <div style={{ fontSize: 11, color: '#5C6B84' }}>Overspent by £{Math.abs(d.variance).toLocaleString()}</div>
                  </div>
                  <Badge variant="red">{d.variantPct.toFixed(1)}%</Badge>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}

      {tab === 'dept' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Departmental Budget Summary</div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'dept', header: 'Department', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.dept}</span> },
                { key: 'allocated', header: 'Allocated', align: 'right', mono: true },
                { key: 'spent', header: 'Spent', align: 'right', mono: true },
                { key: 'remaining', header: 'Remaining', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>{r.remaining}</span> },
                { key: 'pct', header: 'Utilisation', render: r => (
                  <div style={{ width: 100 }}>
                    <ProgressBar value={r.pct} color={r.pct > 90 ? '#F5365C' : r.pct > 80 ? '#FB8C00' : '#C9A84C'} />
                    <div style={{ fontSize: 10, color: '#5C6B84', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{r.pct}%</div>
                  </div>
                )},
              ]}
              data={DEPT_DATA}
            />
          </Panel>
        </>
      )}

      {tab === 'variance' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Variance Analysis</div>
            <Button>✦ AI Analyse Variances</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'budget', header: 'Budget', align: 'right', mono: true },
                { key: 'actual', header: 'Actual', align: 'right', mono: true },
                { key: 'variance', header: 'Variance', align: 'right', render: r => (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: r.variance >= 0 ? '#2DCE89' : '#F5365C' }}>
                    {r.variance >= 0 ? '+' : ''}£{Math.abs(r.variance).toLocaleString()}
                  </span>
                )},
                { key: 'cause', header: 'Likely Cause' },
              ]}
              data={[
                { category: 'Programme Delivery', budget: '£24,000', actual: '£26,400', variance: -2400, cause: 'Additional workshops in Feb' },
                { category: 'Marketing', budget: '£4,200', actual: '£5,100', variance: -900, cause: 'Unplanned print campaign' },
                { category: 'Staff Costs', budget: '£58,200', actual: '£54,600', variance: 3600, cause: 'Vacancy savings Q1–Q2' },
              ]}
            />
          </Panel>
          <Panel title="AI Variance Narrative" titleIcon="✦" iconColor="#C9A84C" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: '#5C6B84', lineHeight: 1.8 }}>
              Click ✦ AI Analyse to generate variance narrative.
            </div>
          </Panel>
        </>
      )}

      {tab === 'forecast' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Full Year Forecast (FYF)</div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'category', header: 'Category', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.category}</span> },
                { key: 'h1', header: 'H1 Actual', align: 'right', mono: true },
                { key: 'h2', header: 'H2 Forecast', align: 'right', mono: true },
                { key: 'fy', header: 'FY Total', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{r.fy}</span> },
                { key: 'budget', header: 'Original Budget', align: 'right', mono: true },
                { key: 'v', header: 'Variance', align: 'right', render: r => (
                  <Badge variant={r.vNum >= 0 ? 'green' : 'red'}>{r.v}</Badge>
                )},
              ]}
              data={[
                { category: 'Staff Costs', h1: '£27,300', h2: '£27,300', fy: '£54,600', budget: '£58,200', v: '+£3,600', vNum: 3600 },
                { category: 'Programme Delivery', h1: '£13,200', h2: '£13,200', fy: '£26,400', budget: '£24,000', v: '-£2,400', vNum: -2400 },
                { category: 'Overheads', h1: '£6,950', h2: '£6,950', fy: '£13,900', budget: '£14,800', v: '+£900', vNum: 900 },
              ]}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
