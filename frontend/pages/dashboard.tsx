import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, EmptyState, Panel, ProgressBar, StatCard } from '@/components/ui'
import api from '@/lib/api'
import { useAuthStore, useUiStore } from '@/lib/store'

const money = (n: number) =>
  `GBP ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { dashboardPeriodMode } = useUiStore()

  useEffect(() => {
    if (!user && router.pathname !== '/login') router.replace('/login')
  }, [user, router])

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', dashboardPeriodMode],
    queryFn: () => api.getFinancialSummary(dashboardPeriodMode),
  })
  const { data: cashflow } = useQuery({
    queryKey: ['cashflow', 12],
    queryFn: () => api.getCashflow(12),
  })
  const { data: grants } = useQuery({
    queryKey: ['grants-dashboard'],
    queryFn: () => api.getGrantsDashboard(),
  })
  const { data: donations } = useQuery({
    queryKey: ['donations-dashboard', dashboardPeriodMode],
    queryFn: () => api.getDonationsDashboard(dashboardPeriodMode),
  })
  const { data: pendingExpensesData } = useQuery({
    queryKey: ['dashboard-pending-expenses'],
    queryFn: () => api.getExpenses({ status: 'pending', limit: 5 }),
  })
  const { data: transactionsData } = useQuery({
    queryKey: ['dashboard-transactions'],
    queryFn: () => api.getTransactions({ limit: 5 }),
  })

  const cashflowData = cashflow?.data ?? []
  const grantList = grants?.grants ?? []
  const donationTrend = donations?.monthly_trend ?? []
  const pendingApprovals = pendingExpensesData?.items ?? []
  const recentTransactions = transactionsData?.items ?? []
  const periodLabel = summary?.period_label ?? 'Normal'

  const donationsLabel =
    dashboardPeriodMode === 'wtd'
      ? 'Donations WTD'
      : dashboardPeriodMode === 'qtd'
        ? 'Donations QTD'
        : dashboardPeriodMode === 'ytd'
          ? 'Donations YTD'
          : 'Donations YTD'

  const grantsLabel =
    dashboardPeriodMode === 'wtd'
      ? 'Current Grants'
      : dashboardPeriodMode === 'qtd'
        ? 'Quarter Grants'
        : dashboardPeriodMode === 'ytd'
          ? 'Year Grants'
          : 'Active Grants'

  const expenditureSplit: Array<{ name: string; value: number; color: string }> = recentTransactions
    .filter((txn: any) => txn.transaction_type === 'expense')
    .reduce((acc: Array<{ name: string; value: number; color: string }>, txn: any) => {
      const rawCategory = txn.category || 'Other'
      const mappedName =
        /payroll|salary|staff/i.test(rawCategory)
          ? 'Staffing'
          : /programme|grant/i.test(rawCategory)
            ? 'Programmes'
            : /overhead|rent|utilities|admin/i.test(rawCategory)
              ? 'Overheads'
              : 'Other'

      const palette: Record<string, string> = {
        Staffing: '#C9A84C',
        Programmes: '#5E9EFF',
        Overheads: '#FB8C00',
        Other: '#B388FF',
      }

      const existing = acc.find((item) => item.name === mappedName)
      if (existing) {
        existing.value += Number(txn.amount || 0)
      } else {
        acc.push({ name: mappedName, value: Number(txn.amount || 0), color: palette[mappedName] })
      }
      return acc
    }, [])

  const totalExpenditureSplit = expenditureSplit.reduce((sum: number, item) => sum + item.value, 0)

  return (
    <AppLayout
      title="CFO Command Centre"
      subtitle={periodLabel === 'Normal' ? 'Workspace overview' : periodLabel}
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>Export</Button>
          <Button onClick={() => router.push('/accounting')}>+ New Entry</Button>
        </div>
      }
    >
      {summary?.pending_expenses_count ? (
        <Alert variant="gold" icon="!">
          <strong>Action required:</strong> {summary.pending_expenses_count} expense claims pending - View currently filtered for {periodLabel.toLowerCase()}
        </Alert>
      ) : (
        <Alert variant="info" icon="i">
          No pending approvals in this workspace right now.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Funds" value={money(summary?.total_cash ?? 0)} change={`Mode: ${periodLabel}`} changeUp icon="GBP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label={summary?.burn_label ?? 'Monthly Burn'} value={money(summary?.avg_monthly_burn ?? 0)} change={`Filtered to ${periodLabel.toLowerCase()}`} changeUp={dashboardPeriodMode === 'normal' && (summary?.avg_monthly_burn ?? 0) > 0} icon="B" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Cash Runway" value={summary?.cash_runway_months != null ? `${summary.cash_runway_months} mo` : '-'} change="At current burn rate" icon="R" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label={grantsLabel} value={money(summary?.total_grants_awarded ?? 0)} change={`${summary?.active_grants_count ?? 0} grants - ${money(summary?.total_grants_remaining ?? 0)} left`} changeUp icon="G" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Cash Flow" titleIcon="CF" iconColor="#C9A84C">
          {cashflowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={cashflowData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" vertical={false} />
                <XAxis dataKey="month_short" tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5C6B84', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Number(v) / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                  formatter={(v: number) => [`GBP ${v.toLocaleString()}`, '']}
                />
                <Bar dataKey="income" fill="rgba(201,168,76,0.45)" stroke="#C9A84C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="rgba(245,54,92,0.3)" stroke="#F5365C" strokeWidth={1} radius={[3, 3, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No cashflow yet" description="Post income and expense transactions to see this chart." />
          )}
        </Panel>

        <Panel title="Expenditure Split" titleIcon="PIE" iconColor="#B388FF">
          {expenditureSplit.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={expenditureSplit} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" strokeWidth={0}>
                    {expenditureSplit.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', fontSize: 12, color: 'var(--text)' }}
                    formatter={(value: number) => {
                      const percent = totalExpenditureSplit > 0 ? Math.round((value / totalExpenditureSplit) * 100) : 0
                      return [`${money(value)} (${percent}%)`, '']
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
                {expenditureSplit.map((item) => {
                  const percent = totalExpenditureSplit > 0 ? Math.round((item.value / totalExpenditureSplit) * 100) : 0
                  return (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mute2)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                        {item.name}
                      </span>
                      <span style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{percent}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <EmptyState title="No expenditure split yet" description="This chart will appear after expense transactions are posted." />
          )}
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Grant Status"
          titleIcon="GR"
          iconColor="#5E9EFF"
          action={<span onClick={() => router.push('/grants')} style={{ fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer', fontWeight: 500 }}>Manage -&gt;</span>}
        >
          {grantList.length > 0 ? (
            grantList.slice(0, 3).map((grant: any) => (
              <div key={grant.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--mute2)' }}>{grant.name?.split(' ').slice(0, 3).join(' ')}</span>
                  <span style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                    GBP {(Number(grant.spent || 0) / 1000).toFixed(0)}k / GBP {(Number(grant.awarded || 0) / 1000).toFixed(0)}k
                  </span>
                </div>
                <ProgressBar value={grant.utilisation_pct} color={grant.utilisation_pct > 90 ? '#F5365C' : grant.utilisation_pct > 75 ? '#FB8C00' : '#C9A84C'} />
              </div>
            ))
          ) : (
            <EmptyState title="No grants yet" description="Create a grant to track utilisation and deadlines." />
          )}
        </Panel>

        <Panel
          title="Pending Approvals"
          titleIcon="PA"
          iconColor="#FB8C00"
          action={<span onClick={() => router.push('/expenses')} style={{ fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer', fontWeight: 500 }}>Review -&gt;</span>}
        >
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Claimant',
                render: (row) => (
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--heading)', fontSize: 12 }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mute)' }}>{row.date}</div>
                  </div>
                ),
              },
              { key: 'amount', header: '', align: 'right', render: (row) => <Badge variant="amber">{row.amount}</Badge> },
            ]}
            data={pendingApprovals.map((expense: any) => ({
              name: expense.claimant || 'Unknown claimant',
              date: new Date(expense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
              amount: money(expense.amount),
            }))}
            emptyMessage="No pending approvals"
          />
        </Panel>

        <Panel
          title={donationsLabel}
          titleIcon="DON"
          iconColor="#F5365C"
          action={<span onClick={() => router.push('/donations')} style={{ fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer', fontWeight: 500 }}>View all -&gt;</span>}
        >
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 600, color: '#2DCE89', letterSpacing: '-0.03em', marginBottom: 4 }}>
            {money(donations?.ytd_total ?? 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 16 }}>
            {donationTrend.length > 0 ? `${donationTrend.length} tracked periods in this view` : 'No donation history yet'}
          </div>
          {donationTrend.length > 0 ? (
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
          ) : (
            <EmptyState title="No donations yet" description="Donation activity will appear here once gifts are recorded." />
          )}
        </Panel>
      </div>

      <Panel title="Recent Transactions" action={<span onClick={() => router.push('/accounting')} style={{ fontSize: 11.5, color: 'var(--gold)', cursor: 'pointer', fontWeight: 500 }}>View ledger -&gt;</span>} noPadding>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', mono: true },
            { key: 'description', header: 'Description', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.description}</span> },
            { key: 'category', header: 'Category', render: (row) => <Badge variant={row.catVariant as any}>{row.category}</Badge> },
            { key: 'programme', header: 'Programme' },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (row) => (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: row.income ? '#2DCE89' : '#F5365C' }}>
                  {row.income ? '+' : '-'}{row.amount}
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (row) => <Badge variant={row.statusVariant as any}>{row.status}</Badge> },
          ]}
          data={recentTransactions.map((txn: any) => ({
            date: new Date(txn.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            description: txn.description,
            category: txn.category || (txn.transaction_type === 'income' ? 'Income' : 'Expense'),
            catVariant: txn.transaction_type === 'income' ? 'green' : 'slate',
            programme: txn.programme_id ? `Programme #${txn.programme_id}` : '-',
            amount: money(txn.amount),
            income: txn.transaction_type === 'income',
            status: txn.status || 'pending',
            statusVariant: txn.status === 'cleared' ? 'green' : txn.status === 'pending' ? 'amber' : 'slate',
          }))}
          emptyMessage="No transactions posted yet"
        />
      </Panel>
    </AppLayout>
  )
}
