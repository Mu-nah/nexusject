import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Tab = 'forecast' | 'scenarios' | 'runway'
type Scenario = 'optimistic' | 'base' | 'stress'

const WEEKLY = [
  { week: 'W1', inflow: 15000, outflow: 6200, balance: 84320 },
  { week: 'W2', inflow: 2400, outflow: 5800, balance: 80920 },
  { week: 'W3', inflow: 8500, outflow: 6100, balance: 83320 },
  { week: 'W4', inflow: 4850, outflow: 7200, balance: 80970 },
  { week: 'W5', inflow: 1200, outflow: 5900, balance: 76270 },
  { week: 'W6', inflow: 12000, outflow: 6400, balance: 81870 },
  { week: 'W7', inflow: 3100, outflow: 5800, balance: 79170 },
  { week: 'W8', inflow: 900, outflow: 6200, balance: 73870 },
  { week: 'W9', inflow: 6000, outflow: 5900, balance: 73970 },
  { week: 'W10', inflow: 2500, outflow: 6100, balance: 70370 },
  { week: 'W11', inflow: 15000, outflow: 7400, balance: 77970 },
  { week: 'W12', inflow: 1800, outflow: 5800, balance: 73970 },
  { week: 'W13', inflow: 4200, outflow: 6200, balance: 71970 },
]

const SCENARIO_COPY: Record<Scenario, string> = {
  optimistic: 'Optimistic outlook: if receivables land to plan and the next NLCF milestone clears by week 4, cash cover strengthens and July pressure eases.',
  base: 'Base case: current commitments remain manageable, but the runway stays sensitive to programme spend and slow debtor collection.',
  stress: 'Stress test: a delayed grant drawdown and continued overhead pressure would compress runway quickly, so management action should start now.',
}

export default function Cashflow() {
  const [tab, setTab] = useState<Tab>('forecast')
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('base')
  const [analysisText, setAnalysisText] = useState(SCENARIO_COPY.base)
  const [recommendations, setRecommendations] = useState<string[]>([
    'Chase GBP 8,200 of receivables within 10 working days.',
    'Re-phase discretionary programme costs over the next four weeks.',
    'Protect a minimum cash reserve equal to three months of payroll.',
  ])

  const forecastRows = useMemo(
    () =>
      WEEKLY.map((row) => ({
        week: row.week,
        inflow: row.inflow,
        outflow: row.outflow,
        net: row.inflow - row.outflow,
        balance: row.balance,
      })),
    []
  )

  const exportForecast = () => {
    downloadCsvFile('cashflow-forecast.csv', forecastRows)
    toast.success('Cash flow forecast exported')
  }

  const refreshForecast = () => {
    const lowPoint = WEEKLY.reduce((lowest, row) => (row.balance < lowest.balance ? row : lowest), WEEKLY[0])
    setAnalysisText(`Forecast refreshed: the lowest cash point remains ${lowPoint.week} at GBP ${lowPoint.balance.toLocaleString()}. Focus on timing of payroll, grant receipts, and creditor payment dates.`)
    toast.success('Forecast refreshed')
  }

  const generateScenarioAnalysis = () => {
    setAnalysisText(SCENARIO_COPY[selectedScenario])
    toast.success('Scenario analysis updated')
  }

  const generateRecommendations = () => {
    const nextRecommendations =
      selectedScenario === 'stress'
        ? [
            'Freeze non-essential hiring until the next grant receipt is confirmed.',
            'Escalate overdue receivables over 30 days to formal collection.',
            'Pull forward restricted-income reporting to unlock remaining drawdown.',
          ]
        : selectedScenario === 'optimistic'
          ? [
              'Lock in receivable collection dates with written confirmations.',
              'Pre-approve programme spend only where linked to funded delivery.',
              'Document a board-level free reserves trigger for future grant cycles.',
            ]
          : [
              'Review payroll and programme spend weekly for the next month.',
              'Map every committed supplier payment against expected inflows.',
              'Maintain a standing list of deferrable costs if receipts slip.',
            ]
    setRecommendations(nextRecommendations)
    toast.success('Runway recommendations updated')
  }

  return (
    <AppLayout
      title="Cash Flow Forecast"
      subtitle="13-Week Rolling"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportForecast}>Export Forecast</Button>
          <Button onClick={refreshForecast}>Refresh Forecast</Button>
        </div>
      }
    >
      <Alert variant="gold" icon="$">
        <strong>13-week rolling cash forecast:</strong> this view updates from current inflows, payroll schedules, and known commitments so leadership can spot pressure early.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Current Cash" value="GBP 84,320" change="As at today" icon="GBP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="13-Week Projected" value="GBP 71,970" change="End of forecast period" icon="13W" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Net Cash Movement" value="-GBP 12,350" change="Over 13 weeks" changeUp={false} icon="NET" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Runway" value="10.8 mo" change="At current burn rate" icon="R" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'forecast', label: '13-Week Forecast' },
          { key: 'scenarios', label: 'Scenarios' },
          { key: 'runway', label: 'Runway Calculator' },
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

      {tab === 'forecast' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>13-Week Rolling Cash Forecast</div>
            <Button onClick={refreshForecast}>Refresh Forecast</Button>
          </div>
          <Panel title="Weekly Cash Position" titleIcon="CF" iconColor="#C9A84C">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`GBP ${v.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="balance" stroke="#C9A84C" strokeWidth={2} fill="url(#cashGrad)" dot={false} name="Cash Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Weekly Detail" titleIcon="DT" iconColor="#C9A84C" style={{ marginTop: 14 }} noPadding>
            <DataTable
              columns={[
                { key: 'week', header: 'Week', mono: true },
                { key: 'inflow', header: 'Inflows', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>+GBP {r.inflow.toLocaleString()}</span> },
                { key: 'outflow', header: 'Outflows', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5365C' }}>-GBP {r.outflow.toLocaleString()}</span> },
                { key: 'net', header: 'Net', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: r.net >= 0 ? '#2DCE89' : '#F5365C' }}>{r.net >= 0 ? '+' : '-'}GBP {Math.abs(r.net).toLocaleString()}</span> },
                { key: 'balance', header: 'Closing Balance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>GBP {r.balance.toLocaleString()}</span> },
              ]}
              data={forecastRows}
            />
          </Panel>
        </>
      )}

      {tab === 'scenarios' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Cash Flow Scenarios</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              { key: 'optimistic', label: 'Optimistic', color: '#2DCE89', endBalance: 'GBP 91,420', change: '+GBP 7,100', desc: 'Receivables clear on time and the next grant milestone lands in week 4.' },
              { key: 'base', label: 'Base Case', color: '#C9A84C', endBalance: 'GBP 71,970', change: '-GBP 12,350', desc: 'Current trajectory continues with normal collection and payment timing.' },
              { key: 'stress', label: 'Stress Test', color: '#F5365C', endBalance: 'GBP 48,220', change: '-GBP 36,100', desc: 'Grant timing slips and programme costs continue to run ahead of plan.' },
            ].map((scenario) => (
              <Panel key={scenario.key} style={{ border: selectedScenario === scenario.key ? `2px solid ${scenario.color}` : `2px solid ${scenario.color}22` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: scenario.color, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  {scenario.label}
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: scenario.color, letterSpacing: '-0.03em', marginBottom: 4 }}>
                  {scenario.endBalance}
                </div>
                <div style={{ fontSize: 12, color: '#5C6B84', marginBottom: 12 }}>13-week closing | {scenario.change}</div>
                <div style={{ fontSize: 12, color: '#7A8BA8', lineHeight: 1.6, marginBottom: 14 }}>{scenario.desc}</div>
                <Button
                  small
                  variant={selectedScenario === scenario.key ? 'primary' : 'ghost'}
                  onClick={() => setSelectedScenario(scenario.key as Scenario)}
                >
                  {selectedScenario === scenario.key ? 'Selected' : 'Use Scenario'}
                </Button>
              </Panel>
            ))}
          </div>

          <Panel
            title="Scenario Analysis"
            titleIcon="AI"
            iconColor="#C9A84C"
            style={{ marginTop: 14 }}
            action={<Button small onClick={generateScenarioAnalysis}>Generate Analysis</Button>}
          >
            <div style={{ fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.8 }}>{analysisText}</div>
          </Panel>
        </>
      )}

      {tab === 'runway' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Runway Calculator</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Panel title="Current Runway" titleIcon="RW" iconColor="#C9A84C">
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 64, color: '#E8C56A', textAlign: 'center', letterSpacing: '-0.04em', margin: '16px 0 4px' }}>324</div>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#5C6B84' }}>days at current burn rate</div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#7A8BA8' }}>
                Funds exhaust around <strong style={{ color: '#C9A84C' }}>February 2027</strong> without new income.
              </div>
            </Panel>

            <Panel title="Runway Assumptions" titleIcon="AS" iconColor="#5E9EFF">
              {[
                { label: 'Current Cash Balance', value: 'GBP 84,320' },
                { label: 'Monthly Burn Rate', value: 'GBP 7,842' },
                { label: 'Monthly Inflows (avg)', value: 'GBP 6,200' },
                { label: 'Net Monthly Outflow', value: 'GBP 1,642' },
                { label: 'Committed Grants (next 3mo)', value: 'GBP 18,000' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                  <span style={{ color: '#5C6B84' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{row.value}</span>
                </div>
              ))}
            </Panel>
          </div>

          <Panel
            title="Runway Recommendations"
            titleIcon="AI"
            iconColor="#C9A84C"
            style={{ marginTop: 14 }}
            action={<Button small onClick={generateRecommendations}>Refresh Recommendations</Button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Badge variant="gold">Action</Badge>
                  <div style={{ fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.7 }}>{item}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
