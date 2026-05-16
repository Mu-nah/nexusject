import { useMutation, useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, Panel, ProgressBar, StatCard } from '@/components/ui'
import api from '@/lib/api'

const gbp = (n: number) => `GBP ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`

const currentQuarterBounds = () => {
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
  const start = new Date(Date.UTC(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0))
  const end = new Date(Date.UTC(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59))
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function Grants() {
  const router = useRouter()
  const { data: grants = [], isLoading } = useQuery({ queryKey: ['grants'], queryFn: () => api.getGrants('active') })
  const { data: summary } = useQuery({ queryKey: ['grants-summary'], queryFn: api.getGrantsSummary })

  const reportMutation = useMutation({
    mutationFn: (grantId: number) => {
      const { start, end } = currentQuarterBounds()
      return api.aiGrantReport(grantId, start, end)
    },
    onSuccess: () => {
      toast.success('AI report generated - check Reports')
      router.push('/reports')
    },
    onError: () => toast.error('Report generation failed'),
  })

  const nextReport = grants
    .filter((grant: any) => !!grant.next_report_due)
    .map((grant: any) => {
      const days = Math.ceil((new Date(grant.next_report_due).getTime() - Date.now()) / 86400000)
      return { name: grant.name, days }
    })
    .filter((item: any) => item.days >= 0)
    .sort((a: any, b: any) => a.days - b.days)[0]

  const chartData = grants.map((grant: any) => ({
    name: grant.funder?.split(' ').slice(0, 2).join(' ') || grant.name,
    spent: Number(grant.amount_spent || 0),
    remaining: Number(grant.amount_remaining || 0),
  }))

  const getBarColor = (value: number) => (value > 90 ? '#ef4444' : value > 75 ? '#f59e0b' : '#10b981')

  return (
    <AppLayout
      title="Grant Management"
      subtitle={`${summary?.active_grants ?? 0} active grants`}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>AI Analysis</Button>
          <Button onClick={() => router.push('/grants/new')}>+ New Grant</Button>
        </div>
      }
    >
      {!isLoading && grants.length === 0 && (
        <Alert variant="info" icon="i">
          This workspace has no grants yet. Create your first grant to unlock utilisation, deadline tracking, and AI reporting.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Awarded" value={gbp(summary?.total_awarded ?? 0)} change={`${summary?.active_grants ?? 0} active grants`} accentColor="#3b82f6" />
        <StatCard label="Spent to Date" value={gbp(summary?.total_spent ?? 0)} change={`${pct(summary?.overall_utilisation_pct ?? 0)} utilised`} changeUp accentColor="#10b981" />
        <StatCard label="Remaining" value={gbp(summary?.total_remaining ?? 0)} change="across all grants" accentColor="#f59e0b" />
        <StatCard
          label="Next Report Due"
          value={nextReport ? `${nextReport.days} day${nextReport.days === 1 ? '' : 's'}` : 'None'}
          change={nextReport ? `${nextReport.name} deadline` : 'No upcoming report deadlines'}
          changeUp={false}
          accentColor="#ef4444"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <div>
          {!isLoading && grants.length === 0 && (
            <Panel title="Active Grants">
              <div style={{ fontSize: 13, color: '#64748b' }}>No active grants in this workspace yet.</div>
            </Panel>
          )}

          {grants.map((grant: any) => {
            const reportDays = grant.next_report_due ? Math.ceil((new Date(grant.next_report_due).getTime() - Date.now()) / 86400000) : null
            return (
              <div
                key={grant.id}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  padding: '18px 20px',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{grant.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                      {grant.reference} | {new Date(grant.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} {'->'} {new Date(grant.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Badge variant="green">Active</Badge>
                      {reportDays !== null && reportDays >= 0 && reportDays <= 14 && <Badge variant="red">Report due {reportDays}d</Badge>}
                      {grant.utilisation_pct >= 80 && <Badge variant="amber">{pct(grant.utilisation_pct)} utilised</Badge>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{gbp(grant.amount_spent)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>of {gbp(grant.amount_awarded)}</div>
                  </div>
                </div>
                <ProgressBar value={grant.utilisation_pct} color={getBarColor(grant.utilisation_pct)} height={8} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button small variant="ghost" onClick={() => router.push(`/grants/${grant.id}`)}>View Spending</Button>
                  <Button small onClick={() => reportMutation.mutate(grant.id)} disabled={reportMutation.isPending}>
                    {reportMutation.isPending ? 'Generating...' : 'AI Report'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <Panel title="Grant Utilisation" style={{ marginBottom: 16 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${Number(v) / 1000}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => [gbp(v), '']} />
                  <Bar dataKey="spent" fill="#10b981" stackId="a" />
                  <Bar dataKey="remaining" fill="rgba(51,65,85,0.6)" stackId="a" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#64748b' }}>
                Grant utilisation will appear once this workspace has active grants.
              </div>
            )}
          </Panel>

          <Panel title="Pipeline">
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Grant pipeline tracking has no live records in this workspace yet.
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
