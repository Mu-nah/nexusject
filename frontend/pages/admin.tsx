import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = 'users' | 'orgs' | 'system' | 'logs'

const USERS = [
  { name: 'Dominic Ogbuagu', email: 'dominic@harvesttouch.org.uk', role: 'Super Admin / CFO', org: 'Harvest Touch CIC', status: 'Active', lastLogin: 'Now' },
  { name: 'Aisha Ibrahim', email: 'aisha@harvesttouch.org.uk', role: 'Programme Manager', org: 'Harvest Touch CIC', status: 'Active', lastLogin: '2h ago' },
  { name: 'Kwame Okafor', email: 'kwame@harvesttouch.org.uk', role: 'Staff', org: 'Harvest Touch CIC', status: 'Active', lastLogin: '1d ago' },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <AppLayout
      title="Admin Portal"
      subtitle="Super Admin · System Control"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ System Export</Button>
          <Button>+ Invite User</Button>
        </div>
      }
    >
      <div style={{
        background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#C8D3E8',
      }}>
        <span style={{ fontSize: 16 }}>⚙</span>
        <span><strong style={{ color: '#C9A84C' }}>Admin Portal</strong> — Full system control. Super Admin access only. All actions are logged immutably.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Users" value="3" change="1 SA · 2 staff" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Organisations" value="1" change="Harvest Touch CIC" icon="◉" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="System Status" value="Online" change="All services healthy" changeUp icon="✓" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="DB Storage" value="124 MB" change="8.3% of quota" icon="◫" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'users', label: 'User Management' },
          { key: 'orgs', label: 'Organisations' },
          { key: 'system', label: 'System Settings' },
          { key: 'logs', label: 'Admin Logs' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>User Management</div>
            <Button>+ Invite User</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: r => <Badge variant={r.role.includes('Super') ? 'gold' : 'slate'}>{r.role}</Badge> },
                { key: 'lastLogin', header: 'Last Login' },
                { key: 'status', header: 'Status', render: r => <Badge variant="green">{r.status}</Badge> },
                { key: 'actions', header: '', render: () => <Button small variant="ghost">Edit</Button> },
              ]}
              data={USERS}
            />
          </Panel>
        </>
      )}

      {tab === 'orgs' && (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5', marginBottom: 14 }}>Organisations</div>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#0C0F14', fontFamily: "'Instrument Serif', serif", flexShrink: 0,
              }}>H</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EDF5' }}>Harvest Touch CIC</div>
                <div style={{ fontSize: 12, color: '#5C6B84' }}>CIC No: 14587923 · Rochdale, Greater Manchester</div>
              </div>
              <Badge variant="green">Active</Badge>
              <Button small variant="ghost">Settings</Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16, padding: 12, background: '#1C2230', borderRadius: 8 }}>
              {[
                { label: 'FY End', value: '31 March' },
                { label: 'VAT Number', value: 'GB 123 456 789' },
                { label: 'Plan', value: 'Enterprise' },
                { label: 'Created', value: '01 Apr 2022' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: 10, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 12.5, color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {tab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="Service Health" titleIcon="✓" iconColor="#2DCE89">
            {[
              { service: 'Database (Supabase)', status: 'Operational', latency: '12ms', ok: true },
              { service: 'API Backend (FastAPI)', status: 'Operational', latency: '8ms', ok: true },
              { service: 'Frontend (Next.js)', status: 'Operational', latency: '—', ok: true },
              { service: 'AI (Claude API)', status: 'Operational', latency: '1.2s avg', ok: true },
              { service: 'Email (SMTP)', status: 'Not Configured', latency: '—', ok: false },
            ].map(row => (
              <div key={row.service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: row.ok ? '#2DCE89' : '#F5365C', fontSize: 8 }}>●</span>
                  <span style={{ color: '#C8D3E8' }}>{row.service}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {row.latency !== '—' && <span style={{ fontSize: 11, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace" }}>{row.latency}</span>}
                  <Badge variant={row.ok ? 'green' : 'amber'}>{row.status}</Badge>
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="System Settings" titleIcon="⚙" iconColor="#C9A84C">
            {[
              { label: 'Application Version', value: '1.0.0' },
              { label: 'Database', value: 'PostgreSQL 15' },
              { label: 'Backend', value: 'FastAPI 0.104' },
              { label: 'Frontend', value: 'Next.js 14' },
              { label: 'AI Model', value: 'claude-sonnet-4' },
              { label: 'Environment', value: 'Production' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                <span style={{ color: '#5C6B84' }}>{row.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{row.value}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === 'logs' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Admin Action Log</div>
            <Button variant="ghost">↓ Export</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ts', header: 'Timestamp', mono: true },
                { key: 'admin', header: 'Admin' },
                { key: 'action', header: 'Action', render: r => <span style={{ fontWeight: 500, color: '#C8D3E8' }}>{r.action}</span> },
                { key: 'target', header: 'Target' },
                { key: 'result', header: 'Result', render: r => <Badge variant="green">{r.result}</Badge> },
              ]}
              data={[
                { ts: '15 Mar 15:00', admin: 'D. Ogbuagu', action: 'Approve Payroll Run', target: 'PAY-0023', result: 'Success' },
                { ts: '14 Mar 10:22', admin: 'D. Ogbuagu', action: 'Update User Role', target: 'A. Ibrahim', result: 'Success' },
                { ts: '01 Mar 09:00', admin: 'D. Ogbuagu', action: 'Create User', target: 'K. Okafor', result: 'Success' },
              ]}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
