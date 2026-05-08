import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Tab = 'forecast' | 'scenarios' | 'runway'

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

export default function Cashflow() {
  const [tab, setTab] = useState<Tab>('forecast')

  return (
    <AppLayout
      title="Cash Flow Forecast"
      subtitle="13-Week Rolling · AI-Powered"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>✦ AI Refresh Forecast</Button>
        </div>
      }
    >
      <Alert variant="gold" icon="💰">
        <strong>13-Week Rolling Cash Flow Forecast</strong> — AI-powered. Updates automatically from live invoices, payroll schedules, and known commitments.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Current Cash" value="£84,320" change="As at today" icon="£" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="13-Week Projected" value="£71,970" change="End of forecast period" icon="⟳" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Net Cash Movement" value="-£12,350" change="Over 13 weeks" changeUp={false} icon="↓" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Runway" value="10.8 mo" change="At current burn rate" icon="◷" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'forecast', label: '13-Week Forecast' },
          { key: 'scenarios', label: 'Scenarios' },
          { key: 'runway', label: 'Runway Calculator' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'forecast' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>13-Week Rolling Cash Forecast</div>
            <Button>✦ AI Refresh Forecast</Button>
          </div>
          <Panel title="Weekly Cash Position" titleIcon="◈" iconColor="#C9A84C">
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
                <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v/1000}k`} />
                <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`£${v.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="balance" stroke="#C9A84C" strokeWidth={2} fill="url(#cashGrad)" dot={false} name="Cash Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Weekly Detail" titleIcon="≡" iconColor="#C9A84C" style={{ marginTop: 14 }} noPadding>
            <DataTable
              columns={[
                { key: 'week', header: 'Week', mono: true },
                { key: 'inflow', header: 'Inflows', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89' }}>+£{r.inflow.toLocaleString()}</span> },
                { key: 'outflow', header: 'Outflows', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5365C' }}>-£{r.outflow.toLocaleString()}</span> },
                { key: 'net', header: 'Net', align: 'right', render: r => {
                  const net = r.inflow - r.outflow
                  return <span style={{ fontFamily: "'JetBrains Mono', monospace", color: net >= 0 ? '#2DCE89' : '#F5365C' }}>{net >= 0 ? '+' : ''}£{Math.abs(net).toLocaleString()}</span>
                }},
                { key: 'balance', header: 'Closing Balance', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>£{r.balance.toLocaleString()}</span> },
              ]}
              data={WEEKLY}
            />
          </Panel>
        </>
      )}

      {tab === 'scenarios' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Cash Flow Scenarios</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { label: 'Optimistic', color: '#2DCE89', endBalance: '£91,420', change: '+£7,100', desc: 'NLCF milestone received in W4 · All AR collected on time · No unexpected expenditure', variant: 'green' as const },
              { label: 'Base Case', color: '#C9A84C', endBalance: '£71,970', change: '-£12,350', desc: 'Current trajectory maintained · Standard payment timings · No major surprises', variant: 'gold' as const },
              { label: 'Stress Test', color: '#F5365C', endBalance: '£48,220', change: '-£36,100', desc: 'GMCA payment delayed 60d · Core staff salary increase · Programme overspend', variant: 'red' as const },
            ].map(s => (
              <Panel key={s.label} style={{ border: `2px solid ${s.color}22` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{s.label}</div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: s.color, letterSpacing: '-0.03em', marginBottom: 4 }}>{s.endBalance}</div>
                <div style={{ fontSize: 12, color: '#5C6B84', marginBottom: 12 }}>13-week closing · {s.change}</div>
                <div style={{ fontSize: 12, color: '#7A8BA8', lineHeight: 1.6 }}>{s.desc}</div>
              </Panel>
            ))}
          </div>

          <Panel title="AI Scenario Analysis" titleIcon="✦" iconColor="#C9A84C" style={{ marginTop: 14 }}
            action={<Button small>✦ Generate AI Analysis</Button>}>
            <div style={{ fontSize: 12.5, color: '#5C6B84', lineHeight: 1.8 }}>
              Click Generate to run AI scenario analysis.
            </div>
          </Panel>
        </>
      )}

      {tab === 'runway' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Runway Calculator</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Panel title="Current Runway" titleIcon="◷" iconColor="#C9A84C">
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 64, color: '#E8C56A', textAlign: 'center', letterSpacing: '-0.04em', margin: '16px 0 4px' }}>324</div>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#5C6B84' }}>days at current burn rate</div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#7A8BA8' }}>Funds exhaust approx. <strong style={{ color: '#C9A84C' }}>Feb 2026</strong> without new income</div>
            </Panel>

            <Panel title="Runway Assumptions" titleIcon="≡" iconColor="#5E9EFF">
              {[
                { label: 'Current Cash Balance', value: '£84,320' },
                { label: 'Monthly Burn Rate', value: '£7,842' },
                { label: 'Monthly Inflows (avg)', value: '£6,200' },
                { label: 'Net Monthly Outflow', value: '£1,642' },
                { label: 'Committed Grants (next 3mo)', value: '£18,000' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                  <span style={{ color: '#5C6B84' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{row.value}</span>
                </div>
              ))}
            </Panel>
          </div>

          <Panel title="AI Runway Recommendations" titleIcon="✦" iconColor="#C9A84C" style={{ marginTop: 14 }}
            action={<Button small>✦ Get AI Recommendations</Button>}>
            <div style={{ fontSize: 12.5, color: '#5C6B84', lineHeight: 1.8 }}>
              Click to get AI-powered runway extension recommendations.
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
