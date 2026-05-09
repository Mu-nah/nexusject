import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, EmptyState, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Tab = 'forecast' | 'scenarios' | 'runway'
type Scenario = 'optimistic' | 'base' | 'stress'

const currency = (value: number) => `GBP ${value.toLocaleString()}`

export default function Cashflow() {
  const [tab, setTab] = useState<Tab>('forecast')
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('base')
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['planning-cashflow'],
    queryFn: api.getPlanningCashflow,
    staleTime: 60_000,
  })

  const scenarioCopy = data?.scenario_copy ?? {
    optimistic: 'Optimistic outlook will appear once the forecast feed loads.',
    base: 'Base case commentary will appear once the forecast feed loads.',
    stress: 'Stress case commentary will appear once the forecast feed loads.',
  }

  const [analysisText, setAnalysisText] = useState(scenarioCopy.base)
  const [recommendations, setRecommendations] = useState<string[]>(data?.recommendations ?? [])

  useEffect(() => {
    setAnalysisText(scenarioCopy[selectedScenario])
  }, [scenarioCopy, selectedScenario])

  useEffect(() => {
    if (data?.recommendations) {
      setRecommendations(data.recommendations)
    }
  }, [data])

  const summary = data?.summary
  const forecastRows = useMemo(() => data?.forecast ?? [], [data])
  const errorMessage = (error as any)?.response?.data?.detail || (error as Error | undefined)?.message

  const exportForecast = () => {
    downloadCsvFile('cashflow-forecast.csv', forecastRows)
    toast.success('Cash flow forecast exported')
  }

  const refreshForecast = async () => {
    await refetch()
    toast.success('Forecast refreshed from backend')
  }

  const generateScenarioAnalysis = () => {
    setAnalysisText(scenarioCopy[selectedScenario])
    toast.success('Scenario analysis updated')
  }

  const generateRecommendations = () => {
    if (data?.recommendations?.length) {
      setRecommendations(data.recommendations)
    }
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
      {isError && (
        <Alert variant="error" icon="!">
          <strong>Cash flow forecast could not load.</strong> {errorMessage || 'Please refresh the page or try again in a moment.'}
        </Alert>
      )}

      <Alert variant="gold" icon="$">
        <strong>13-week rolling cash forecast:</strong> Review expected inflows, outflows, and runway over the next quarter.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Current Cash" value={summary ? currency(summary.current_cash) : isLoading || isFetching ? 'Loading...' : 'Unavailable'} change="As at today" icon="GBP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="13-Week Projected" value={summary ? currency(summary.projected_cash) : isLoading || isFetching ? 'Loading...' : 'Unavailable'} change="End of forecast period" icon="13W" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Net Cash Movement" value={summary ? `${summary.net_movement >= 0 ? '+' : '-'}${currency(Math.abs(summary.net_movement))}` : isLoading || isFetching ? 'Loading...' : 'Unavailable'} change="Over 13 weeks" changeUp={(summary?.net_movement ?? 0) >= 0} icon="NET" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Runway" value={summary?.runway_months ? `${summary.runway_months} mo` : isLoading || isFetching ? 'Loading...' : 'Unavailable'} change="At current burn rate" icon="R" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
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
            {isLoading || isFetching ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A8BA8', fontSize: 12.5 }}>
                Loading forecast...
              </div>
            ) : isError ? (
              <EmptyState title="Forecast unavailable" description="Please refresh the page or try again shortly." />
            ) : forecastRows.length === 0 ? (
              <EmptyState title="No forecast rows yet" description="Once transactions or seed data are available, the 13-week forecast will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={forecastRows}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [currency(v), '']} />
                  <Area type="monotone" dataKey="balance" stroke="#C9A84C" strokeWidth={2} fill="url(#cashGrad)" dot={false} name="Cash Balance" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Weekly Detail" titleIcon="DT" iconColor="#C9A84C" style={{ marginTop: 14 }} noPadding>
            <DataTable
              columns={[
                { key: 'week', header: 'Week', mono: true },
                { key: 'inflow', header: 'Inflows', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>+{currency(r.inflow)}</span> },
                { key: 'outflow', header: 'Outflows', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5365C' }}>-{currency(r.outflow)}</span> },
                { key: 'net', header: 'Net', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: r.net >= 0 ? '#2DCE89' : '#F5365C' }}>{r.net >= 0 ? '+' : '-'}{currency(Math.abs(r.net))}</span> },
                { key: 'balance', header: 'Closing Balance', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{currency(r.balance)}</span> },
              ]}
              data={forecastRows}
            />
          </Panel>
          {isError && (
            <div style={{ marginTop: 14 }}>
              <Button onClick={refreshForecast}>Retry Forecast</Button>
            </div>
          )}
        </>
      )}

      {tab === 'scenarios' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Cash Flow Scenarios</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              { key: 'optimistic', label: 'Optimistic', color: '#2DCE89', endBalance: summary ? currency(summary.projected_cash + 12000) : 'GBP 0', desc: 'Receivables clear on time and the next grant milestone lands in the next cycle.' },
              { key: 'base', label: 'Base Case', color: '#C9A84C', endBalance: summary ? currency(summary.projected_cash) : 'GBP 0', desc: 'Current trajectory continues with expected payment timing and normal collection.' },
              { key: 'stress', label: 'Stress Test', color: '#F5365C', endBalance: summary ? currency(Math.max(summary.projected_cash - 18000, 0)) : 'GBP 0', desc: 'Grant timing slips and discretionary spend is not rephased in time.' },
            ].map((scenario) => (
              <Panel key={scenario.key} style={{ border: selectedScenario === scenario.key ? `2px solid ${scenario.color}` : `2px solid ${scenario.color}22` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: scenario.color, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  {scenario.label}
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: scenario.color, letterSpacing: '-0.03em', marginBottom: 4 }}>
                  {scenario.endBalance}
                </div>
                <div style={{ fontSize: 12, color: '#5C6B84', marginBottom: 12 }}>13-week closing outlook</div>
                <div style={{ fontSize: 12, color: '#7A8BA8', lineHeight: 1.6, marginBottom: 14 }}>{scenario.desc}</div>
                <Button small variant={selectedScenario === scenario.key ? 'primary' : 'ghost'} onClick={() => setSelectedScenario(scenario.key as Scenario)}>
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
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 64, color: '#E8C56A', textAlign: 'center', letterSpacing: '-0.04em', margin: '16px 0 4px' }}>
                {summary?.runway_months ? Math.round(summary.runway_months * 30) : 0}
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#5C6B84' }}>days at current burn rate</div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#7A8BA8' }}>
                Lowest projected point is <strong style={{ color: '#C9A84C' }}>{summary?.lowest_week ?? 'W0'}</strong> at {summary ? currency(summary.lowest_balance) : 'GBP 0'}.
              </div>
            </Panel>

            <Panel title="Runway Assumptions" titleIcon="AS" iconColor="#5E9EFF">
              {[
                { label: 'Current Cash Balance', value: summary ? currency(summary.current_cash) : 'GBP 0' },
                { label: 'Monthly Burn Rate', value: summary ? currency(summary.avg_monthly_burn) : 'GBP 0' },
                { label: 'Net Forecast Movement', value: summary ? `${summary.net_movement >= 0 ? '+' : '-'}${currency(Math.abs(summary.net_movement))}` : 'GBP 0' },
                { label: 'Projected 13-Week Close', value: summary ? currency(summary.projected_cash) : 'GBP 0' },
                { label: 'Lowest Forecast Week', value: summary?.lowest_week ?? 'W0' },
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
