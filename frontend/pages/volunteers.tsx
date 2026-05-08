import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, StatCard } from '@/components/ui'

type Tab = 'register' | 'hours' | 'agreements'

const VOLS = [
  { name: 'Sarah Adebayo', role: 'Youth Mentor', programme: 'Youth Connect', hours: '8h/wk', dbs: 'Enhanced', status: 'Active' },
  { name: 'Michael Osei', role: 'Skills Trainer', programme: 'Skills Hub', hours: '4h/wk', dbs: 'Enhanced', status: 'Active' },
  { name: 'Fatima Al-Hassan', role: 'Admin Support', programme: 'Core Ops', hours: '6h/wk', dbs: 'Basic', status: 'Active' },
  { name: 'Peter Nwosu', role: 'Event Support', programme: 'Community', hours: '2h/wk', dbs: 'Enhanced', status: 'Inactive' },
]

const HOURS = [
  { name: 'Sarah Adebayo', week: 'W/E 15 Mar', logged: '8.5h', approved: '8.5h', value: '£97.75', status: 'Approved' },
  { name: 'Michael Osei', week: 'W/E 15 Mar', logged: '4.0h', approved: '4.0h', value: '£46.00', status: 'Approved' },
  { name: 'Fatima Al-Hassan', week: 'W/E 15 Mar', logged: '6.0h', approved: '—', value: '£69.00', status: 'Pending' },
  { name: 'Sarah Adebayo', week: 'W/E 08 Mar', logged: '8.0h', approved: '8.0h', value: '£92.00', status: 'Approved' },
]

export default function Volunteers() {
  const [tab, setTab] = useState<Tab>('register')

  return (
    <AppLayout
      title="Volunteers"
      subtitle="Volunteer Management"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>+ Add Volunteer</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Active Volunteers" value="14" change="3 inactive" icon="♡" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Hours This Month" value="186h" change="↑ 12% vs last month" changeUp icon="◷" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Volunteer Value" value="£2,139" change="At NMW equivalent" icon="£" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="DBS Required" value="2" change="Renewals due" changeUp={false} icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'register', label: 'Volunteer Register' },
          { key: 'hours', label: 'Hours Log' },
          { key: 'agreements', label: 'Volunteer Agreements' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'register' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role' },
              { key: 'programme', header: 'Programme', render: r => <Badge variant="slate">{r.programme}</Badge> },
              { key: 'hours', header: 'Commitment' },
              { key: 'dbs', header: 'DBS', render: r => <Badge variant={r.dbs === 'Enhanced' ? 'blue' : 'slate'}>{r.dbs}</Badge> },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'Active' ? 'green' : 'slate'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: () => <Button small variant="ghost">View</Button> },
            ]}
            data={VOLS}
          />
        </Panel>
      )}

      {tab === 'hours' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Volunteer Hours Log</div>
            <Button>+ Log Hours</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Volunteer', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'week', header: 'Week Ending' },
                { key: 'logged', header: 'Hours Logged', mono: true },
                { key: 'approved', header: 'Approved', mono: true },
                { key: 'value', header: 'Value (NMW)', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>{r.value}</span> },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'Approved' ? 'green' : 'amber'}>{r.status}</Badge> },
              ]}
              data={HOURS}
            />
          </Panel>
        </>
      )}

      {tab === 'agreements' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Volunteer Agreements</div>
            <Button>+ Issue Agreement</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Volunteer', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'issued', header: 'Issued' },
                { key: 'signed', header: 'Signed' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: () => <Button small variant="ghost">↓ View</Button> },
              ]}
              data={[
                { name: 'Sarah Adebayo', issued: '01 Sep 2023', signed: '03 Sep 2023', expires: 'Sep 2025', status: 'Active', sV: 'green' },
                { name: 'Michael Osei', issued: '01 Jan 2024', signed: '05 Jan 2024', expires: 'Jan 2026', status: 'Active', sV: 'green' },
                { name: 'Fatima Al-Hassan', issued: '01 Jun 2023', signed: '08 Jun 2023', expires: 'Jun 2025', status: 'Due Renewal', sV: 'amber' },
                { name: 'Peter Nwosu', issued: '01 Mar 2023', signed: '02 Mar 2023', expires: 'Mar 2025', status: 'Expired', sV: 'red' },
              ]}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
