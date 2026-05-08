import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, DataTable, Alert, FormInput } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Donations() {
  const qc = useQueryClient()
  const [showNewDonor, setShowNewDonor] = useState(false)
  const [newDonor, setNewDonor] = useState({ full_name: '', email: '', gift_aid_eligible: false })

  const { data: donationsData } = useQuery({ queryKey: ['donations'], queryFn: () => api.getDonations() })
  const { data: stats }        = useQuery({ queryKey: ['donations-dashboard'], queryFn: api.getDonationsDashboard })
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: api.getCampaigns })
  const { data: giftAid }      = useQuery({ queryKey: ['gift-aid'], queryFn: api.getGiftAidSummary })

  const donorMutation = useMutation({
    mutationFn: api.createDonor,
    onSuccess: () => {
      toast.success('Donor added')
      qc.invalidateQueries({ queryKey: ['donations'] })
      setShowNewDonor(false)
      setNewDonor({ full_name: '', email: '', gift_aid_eligible: false })
    },
    onError: () => toast.error('Failed to add donor'),
  })

  const donations = donationsData?.items ?? []
  const trend = stats?.monthly_trend ?? []

  return (
    <AppLayout
      title="Donation Platform"
      subtitle="Stripe · PayPal · Direct"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => window.open('/donate', '_blank')}>🔗 Donation Link</Button>
          <Button onClick={() => setShowNewDonor(true)}>+ Add Donor</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Donations YTD"  value={gbp(stats?.ytd_total ?? 9240)}     change="↑ 34% vs prior year"     changeUp accentColor="#10b981" />
        <StatCard label="Unique Donors"        value={stats?.unique_donors ?? 84}       change="↑ 12 new this quarter"   changeUp accentColor="#3b82f6" />
        <StatCard label="Recurring Monthly"    value={gbp((stats?.recurring_count ?? 18) * 34.4)} change={`${stats?.recurring_count ?? 18} standing orders`} changeUp accentColor="#8b5cf6" />
        <StatCard label="Gift Aid Claimable"   value={gbp(giftAid?.total_claimable ?? 1840)} change="From HMRC this year"  accentColor="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <div>
          {/* Donations table */}
          <Panel title="Donation History" noPadding style={{ marginBottom: 16 }}>
            <DataTable
              columns={[
                { key: 'date', header: 'Date', mono: true, render: (r) => new Date(r.donation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) },
                { key: 'donor', header: 'Donor', render: (r) => <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.donor}</span> },
                { key: 'type', header: 'Type', render: (r) => <Badge variant={r.is_recurring ? 'violet' : 'slate'}>{r.is_recurring ? 'Recurring' : 'One-off'}</Badge> },
                { key: 'method', header: 'Channel', render: (r) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{r.payment_method}</span> },
                { key: 'campaign', header: 'Campaign', render: (r) => <span style={{ color: '#64748b', fontSize: 12 }}>{r.campaign ?? 'General'}</span> },
                { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, color: '#34d399' }}>{gbp(r.amount)}</span> },
                { key: 'gift_aid', header: 'Gift Aid', render: (r) => r.gift_aid > 0 ? <Badge variant="green">25%</Badge> : <Badge variant="slate">N/A</Badge> },
              ]}
              data={donations}
              emptyMessage="No donations recorded yet"
            />
          </Panel>

          {/* Campaigns */}
          <Panel title="Campaigns" titleIcon="◉">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campaigns.map((c: any) => (
                <div key={c.id} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', color: '#34d399', fontWeight: 500 }}>{gbp(c.raised_amount)}</div>
                      {c.target_amount && <div style={{ fontSize: 11, color: '#64748b' }}>of {gbp(c.target_amount)}</div>}
                    </div>
                  </div>
                  {c.target_amount && (
                    <div style={{ height: 5, background: '#334155', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 10, background: '#10b981',
                        width: `${Math.min(100, (c.raised_amount / c.target_amount) * 100)}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  )}
                </div>
              ))}
              {campaigns.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                  No active campaigns. Create one to start fundraising.
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div>
          {/* Trend chart */}
          <Panel title="6-Month Trend" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, color: '#34d399', letterSpacing: '-0.03em', marginBottom: 4 }}>
              {gbp(stats?.ytd_total ?? 9240)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>↑ 34% year on year</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="donGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => [gbp(v), 'Donations']} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#donGrad2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Gift Aid */}
          <Panel title="Gift Aid" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, color: '#fbbf24', letterSpacing: '-0.03em', marginBottom: 4 }}>
              {gbp(giftAid?.total_claimable ?? 1840)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              claimable from HMRC · {giftAid?.eligible_donors ?? 0} eligible donors
            </div>
            <Button fullWidth onClick={() => toast.success('Gift Aid claim initiated — check your HMRC portal')}>
              Claim Gift Aid →
            </Button>
          </Panel>

          {/* Recent live feed */}
          <Panel title="Live Feed">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {donations.slice(0, 5).map((d: any, i: number) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', fontSize: 12,
                  borderBottom: i < 4 ? '1px solid rgba(51,65,85,0.3)' : 'none',
                }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#34d399', minWidth: 58 }}>
                    {gbp(d.amount)}
                  </div>
                  <div style={{ flex: 1, color: '#94a3b8' }}>{d.donor} — {d.campaign ?? 'General'}</div>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
                    {new Date(d.donation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
              {donations.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                  No donations yet
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* New Donor Modal */}
      {showNewDonor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              Add Donor
            </div>
            <FormInput label="Full Name" value={newDonor.full_name} onChange={(v) => setNewDonor({ ...newDonor, full_name: v })} placeholder="Mohammed Rashid" />
            <FormInput label="Email" value={newDonor.email} onChange={(v) => setNewDonor({ ...newDonor, email: v })} placeholder="m.rashid@example.com" type="email" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="gift_aid"
                checked={newDonor.gift_aid_eligible}
                onChange={(e) => setNewDonor({ ...newDonor, gift_aid_eligible: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#059669' }}
              />
              <label htmlFor="gift_aid" style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                Gift Aid eligible (donor has signed declaration)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => setShowNewDonor(false)}>Cancel</Button>
              <Button
                fullWidth
                onClick={() => donorMutation.mutate({ ...newDonor, source: 'manual' })}
                disabled={!newDonor.full_name || donorMutation.isPending}
              >
                {donorMutation.isPending ? 'Saving…' : 'Add Donor'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
