import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, ProgressBar } from '@/components/ui'
import api from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const STATUS_BADGE: Record<string, any> = {
  'On track': 'green', 'Near limit': 'amber', 'Over budget': 'red', active: 'green',
}

export default function Programmes() {
  const router = useRouter()
  const { data: progData } = useQuery({ queryKey: ['programme-costs'], queryFn: api.getProgrammeCosts })
  const programmes = progData?.programmes ?? []

  const totalBeneficiaries = programmes.reduce((s: number, p: any) => s + (p.participants ?? 0), 0)
  const totalVolunteerHours = programmes.reduce((s: number, p: any) => s + (p.volunteer_hours ?? 0), 0)
  const totalVolunteerValue = programmes.reduce((s: number, p: any) => s + (p.volunteer_value ?? 0), 0)
  const avgCostPerHead = programmes.length
    ? programmes.reduce((s: number, p: any) => s + (p.cost_per_beneficiary ?? 0), 0) / programmes.length
    : 0

  const chartData = programmes.map((p: any) => ({
    name: p.name.split(' ').slice(0, 2).join(' '),
    Budget: p.total_budget,
    Spent: p.spent,
    fullName: p.name,
  }))

  const getStatus = (p: any) => {
    const pct = p.utilisation_pct ?? 0
    if (pct > 95) return 'Over budget'
    if (pct > 80) return 'Near limit'
    return 'On track'
  }

  return (
    <AppLayout
      title="Programme Budgets"
      subtitle="Cost per beneficiary"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>✦ AI Analysis</Button>
          <Button>+ New Programme</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Programmes" value={programmes.length}         accentColor="#10b981" />
        <StatCard label="Beneficiaries YTD"  value={totalBeneficiaries}        change="↑ 18%" changeUp accentColor="#3b82f6" />
        <StatCard label="Avg Cost / Person"  value={gbp(avgCostPerHead)}         accentColor="#8b5cf6" />
        <StatCard label="Volunteer Value"    value={gbp(totalVolunteerValue)}     change={`${totalVolunteerHours.toLocaleString()} hours`} changeUp accentColor="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Budget vs Actual" titleIcon="◈">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v/1000}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }}
                formatter={(v: number, name: string) => [`£${v.toLocaleString()}`, name]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Bar dataKey="Budget" fill="rgba(51,65,85,0.6)" radius={[3,3,0,0]} name="Budget" />
              <Bar dataKey="Spent" fill="#10b981" radius={[3,3,0,0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cost Per Beneficiary" titleIcon="◉" iconColor="#a78bfa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {programmes.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: 13 }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.name.split(' ').slice(0, 3).join(' ')}</span>
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontWeight: 500,
                  color: p.cost_per_beneficiary > 500 ? '#f87171' : p.cost_per_beneficiary > 300 ? '#fbbf24' : '#34d399',
                }}>
                  £{Number(p.cost_per_beneficiary).toFixed(0)}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Portfolio average</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#f1f5f9' }}>£{avgCostPerHead.toFixed(0)}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Programme detail cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {programmes.map((p: any) => {
          const status = getStatus(p)
          return (
            <div key={p.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={STATUS_BADGE[status] ?? 'slate'}>{status}</Badge>
                    {p.utilisation_pct > 80 && <Badge variant="amber">{p.utilisation_pct.toFixed(0)}% used</Badge>}
                  </div>
                </div>
                <Button small variant="ghost" onClick={() => router.push('/ai')}>AI Analyse ✦</Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  ['Budget', gbp(p.total_budget), '#94a3b8'],
                  ['Spent', gbp(p.spent), '#e2e8f0'],
                  ['Remaining', gbp(p.remaining), p.remaining < p.total_budget * 0.1 ? '#f87171' : '#34d399'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'DM Mono, monospace' }}>{val}</div>
                  </div>
                ))}
              </div>

              <ProgressBar
                value={p.utilisation_pct}
                color={p.utilisation_pct > 95 ? '#ef4444' : p.utilisation_pct > 80 ? '#f59e0b' : '#10b981'}
                height={6}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: '#64748b' }}>
                <span>{p.participants} / {p.target_participants} participants</span>
                <span>{p.volunteer_hours.toLocaleString()}h volunteer ({gbp(p.volunteer_value)} value)</span>
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
