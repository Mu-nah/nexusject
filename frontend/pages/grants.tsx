import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, ProgressBar, Alert } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pct = (n: number) => `${n.toFixed(1)}%`

export default function Grants() {
  const router = useRouter()
  const { data: grants = [], isLoading } = useQuery({ queryKey: ['grants'], queryFn: () => api.getGrants('active') })
  const { data: summary } = useQuery({ queryKey: ['grants-summary'], queryFn: api.getGrantsSummary })

  const reportMutation = useMutation({
    mutationFn: (grantId: number) => api.aiGrantReport(
      grantId,
      '2025-01-01T00:00:00',
      '2025-03-31T23:59:59'
    ),
    onSuccess: () => {
      toast.success('AI report generated — check Reports')
      router.push('/reports')
    },
    onError: () => toast.error('Report generation failed'),
  })

  const chartData = grants.map((g: any) => ({
    name: g.funder?.split(' ').slice(0, 2).join(' '),
    Spent: g.amount_spent,
    Remaining: g.amount_remaining,
  }))

  const getBarColor = (pct: number) => pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981'

  return (
    <AppLayout
      title="Grant Management"
      subtitle={`${summary?.active_grants ?? 3} active grants`}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>✦ AI Analysis</Button>
          <Button onClick={() => router.push('/grants/new')}>+ New Grant</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Awarded" value={gbp(summary?.total_awarded ?? 142500)} change={`${summary?.active_grants ?? 3} active grants`} accentColor="#3b82f6" />
        <StatCard label="Spent to Date" value={gbp(summary?.total_spent ?? 104200)} change={`${pct(summary?.overall_utilisation_pct ?? 73.1)} utilised`} changeUp accentColor="#10b981" />
        <StatCard label="Remaining" value={gbp(summary?.total_remaining ?? 38300)} change="across all grants" accentColor="#f59e0b" />
        <StatCard label="Next Report Due" value="13 days" change="NLCF deadline" changeUp={false} accentColor="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <div>
          {grants.map((g: any) => (
            <div key={g.id} style={{
              background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 12, padding: '18px 20px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                    {g.reference} · {new Date(g.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} – {new Date(g.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Badge variant="green">Active</Badge>
                    {g.report_days_remaining !== null && g.report_days_remaining <= 14 && (
                      <Badge variant="red">Report due {g.report_days_remaining}d</Badge>
                    )}
                    {g.utilisation_pct >= 80 && <Badge variant="amber">{pct(g.utilisation_pct)} utilised</Badge>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{gbp(g.amount_spent)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>of {gbp(g.amount_awarded)}</div>
                </div>
              </div>
              <ProgressBar value={g.utilisation_pct} color={getBarColor(g.utilisation_pct)} height={8} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <Button small variant="ghost" onClick={() => router.push(`/grants/${g.id}`)}>View Spending</Button>
                <Button
                  small
                  onClick={() => reportMutation.mutate(g.id)}
                  disabled={reportMutation.isPending}
                >
                  {reportMutation.isPending ? 'Generating…' : 'AI Report ✦'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <Panel title="Grant Utilisation" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => [gbp(v), '']} />
                <Bar dataKey="Spent" fill="#10b981" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="Remaining" fill="rgba(51,65,85,0.6)" stackId="a" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Pipeline">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { name: 'Lloyds Bank Foundation', note: 'EOI submitted Feb 2025', amount: '£75,000', variant: 'violet' },
                { name: 'Sport England', note: 'Application in progress', amount: '£25,000', variant: 'violet' },
                { name: 'Esmée Fairbairn', note: 'Research phase', amount: '£50,000', variant: 'slate' },
              ].map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', fontSize: 13,
                  borderBottom: i < 2 ? '1px solid #1e293b' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{p.note}</div>
                  </div>
                  <Badge variant={p.variant as any}>{p.amount}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
