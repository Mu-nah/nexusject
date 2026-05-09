import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, DataTable, ProgressBar, Alert } from '@/components/ui'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user && router.pathname !== '/login') router.replace('/login')
  }, [user, router])

  const { data: summary } = useQuery({ queryKey: ['financial-summary'], queryFn: api.getFinancialSummary })
  const { data: cashflow } = useQuery({ queryKey: ['cashflow'], queryFn: () => api.getCashflow(12) })
  const { data: grants } = useQuery({ queryKey: ['grants-dashboard'], queryFn: api.getGrantsDashboard })
  const { data: donations } = useQuery({ queryKey: ['donations-dashboard'], queryFn: api.getDonationsDashboard })

  const cashflowData = cashflow?.data ?? []
  const grantList = grants?.grants ?? []
  const donationTrend = donations?.monthly_trend ?? []

  const pieData = [
    { name: 'Staffing',    value: 54, color: '#C9A84C' },
    { name: 'Programmes',  value: 22, color: '#5E9EFF' },
    { name: 'Overheads',   value: 14, color: '#FB8C00' },
    { name: 'Other',       value: 10, color: '#B388FF' },
  ]

  return (
    <AppLayout
      title="CFO Command Centre"
      subtitle="FY 2024–25"
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>↓ Export</Button>
          <Button onClick={() => router.push('/accounting')}>+ New Entry</Button>
        </div>
      }
    >
      <Alert variant="gold" icon="⚡">
        <strong>Action required:</strong> {summary?.pending_expenses_count ?? 4} expense claims pending · NLCF report 13d · Payroll 6d · RTW check J. Musa expired
      </Alert>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Funds"      value={gbp(summary?.total_cash ?? 84320)}              change="↑ 12.4% vs last quarter" changeUp icon="£"  accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Monthly Burn"     value={gbp(summary?.avg_monthly_burn ?? 7842)}          change="↑ 8.1% vs last month" changeUp={false} icon="↓" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Cash Runway"      value={`${summary?.cash_runway_months ?? 10.8} mo`}     change="At current burn rate" icon="◷" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Active Grants"    value={gbp(summary?.total_grants_awarded ?? 142500)}    change={`3 grants · £38K left`} changeUp icon="⊕" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Cashflow + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Cash Flow 2024–25" titleIcon="◈" iconColor="#C9A84C">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cashflowData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
              <XAxis dataKey="month_short" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v/1000}k`} />
              <Tooltip
                contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`£${v.toLocaleString()}`, '']}
              />
              <Bar dataKey="income"   fill="rgba(201,168,76,0.45)"  stroke="#C9A84C" strokeWidth={1} radius={[3,3,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="rgba(245,54,92,0.3)"    stroke="#F5365C" strokeWidth={1} radius={[3,3,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Expenditure Split" titleIcon="◉" iconColor="#B388FF">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }} formatter={(v) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7A8BA8' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                  {d.name}
                </span>
                <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Grants + Pending + Donations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Grant Status" titleIcon="⊕" iconColor="#5E9EFF" action={
          <span onClick={() => router.push('/grants')} style={{ fontSize: 11.5, color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>Manage →</span>
        }>
          {grantList.slice(0, 3).map((g: any) => (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: '#7A8BA8' }}>{g.name?.split(' ').slice(0, 3).join(' ')}</span>
                <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>
                  £{(g.spent/1000).toFixed(0)}k / £{(g.awarded/1000).toFixed(0)}k
                </span>
              </div>
              <ProgressBar
                value={g.utilisation_pct}
                color={g.utilisation_pct > 90 ? '#F5365C' : g.utilisation_pct > 75 ? '#FB8C00' : '#C9A84C'}
              />
            </div>
          ))}
        </Panel>

        <Panel title="Pending Approvals" titleIcon="⊟" iconColor="#FB8C00" action={
          <span onClick={() => router.push('/expenses')} style={{ fontSize: 11.5, color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>Review →</span>
        }>
          <DataTable
            columns={[
              { key: 'name', header: 'Claimant', render: (r) => (
                <div>
                  <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 12 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.date}</div>
                </div>
              )},
              { key: 'amount', header: '', align: 'right', render: (r) => <Badge variant="amber">{r.amount}</Badge> },
            ]}
            data={[
              { name: 'J. Musa',     date: '14 Mar', amount: '£48.60' },
              { name: 'A. Ibrahim',  date: '12 Mar', amount: '£124.00' },
              { name: 'K. Okafor',   date: '10 Mar', amount: '£32.50' },
              { name: 'D. Ogbuagu',  date: '08 Mar', amount: '£200.00' },
            ]}
          />
        </Panel>

        <Panel title="Donations YTD" titleIcon="♡" iconColor="#F5365C" action={
          <span onClick={() => router.push('/donations')} style={{ fontSize: 11.5, color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>View all →</span>
        }>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 600, color: '#2DCE89', letterSpacing: '-0.03em', marginBottom: 4 }}>
            {gbp(donations?.ytd_total ?? 9240)}
          </div>
          <div style={{ fontSize: 12, color: '#5C6B84', marginBottom: 16 }}>↑ 34% vs prior year</div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={donationTrend}>
              <defs>
                <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DCE89" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2DCE89" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="amount" stroke="#2DCE89" strokeWidth={2} fill="url(#donGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Recent transactions */}
      <Panel title="Recent Transactions" action={
        <span onClick={() => router.push('/accounting')} style={{ fontSize: 11.5, color: '#C9A84C', cursor: 'pointer', fontWeight: 500 }}>View ledger →</span>
      } noPadding>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', mono: true },
            { key: 'description', header: 'Description', render: (r) => <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.description}</span> },
            { key: 'category', header: 'Category', render: (r) => <Badge variant={r.catVariant as any}>{r.category}</Badge> },
            { key: 'programme', header: 'Programme' },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: r.income ? '#2DCE89' : '#F5365C' }}>
                {r.income ? '+' : '-'}{r.amount}
              </span>
            )},
            { key: 'status', header: 'Status', render: (r) => <Badge variant={r.statusVariant as any}>{r.status}</Badge> },
          ]}
          data={[
            { date: '15 Mar', description: 'NLCF Grant Disbursement',    category: 'Grant Income', catVariant: 'blue',  programme: 'Youth Connect', amount: '£15,000',  income: true,  status: 'Cleared', statusVariant: 'green' },
            { date: '14 Mar', description: 'Staff Salaries — March',     category: 'Payroll',      catVariant: 'slate', programme: 'Core Ops',     amount: '£4,850',   income: false, status: 'Cleared', statusVariant: 'green' },
            { date: '12 Mar', description: 'Skills Workshop — Catering', category: 'Programme',    catVariant: 'gold',  programme: 'Skills Hub',   amount: '£124.00',  income: false, status: 'Pending', statusVariant: 'amber' },
            { date: '10 Mar', description: 'Online Donation — M. Rashid',category: 'Donation',     catVariant: 'green', programme: 'General',      amount: '£250.00',  income: true,  status: 'Cleared', statusVariant: 'green' },
            { date: '08 Mar', description: 'Venue Hire — Rochdale Hub',  category: 'Overhead',     catVariant: 'slate', programme: '—',            amount: '£200.00',  income: false, status: 'Pending', statusVariant: 'amber' },
          ]}
        />
      </Panel>
    </AppLayout>
  )
}
