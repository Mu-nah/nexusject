import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

export default function Governance() {
  const [trustees, setTrustees] = useState([
    { name: 'Dominic Ogbuagu', role: 'Director / CFO', appointed: '01 Apr 2022', status: 'Active', coi: 'None declared' },
    { name: 'Grace Okafor', role: 'Chair', appointed: '01 Apr 2022', status: 'Active', coi: 'None declared' },
    { name: 'Ahmed Al-Rashid', role: 'Secretary', appointed: '15 Jun 2022', status: 'Active', coi: 'None declared' },
  ])

  return (
    <AppLayout
      title="Governance"
      subtitle="CIC Governance & Compliance"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export Register</Button>
          <Button>+ Add Trustee</Button>
        </div>
      }
    >
      <Alert variant="warning" icon="⚡">
        Governance module — Phase 3 build. Trustee register, conflict of interest, CIC community interest statement, and related party transactions all required.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Directors / Trustees" value="3" change="All active" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Conflicts Declared" value="0" change="Annual review due Jun" icon="◎" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Board Meetings" value="4" change="FY 2024-25" icon="≡" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="CIC Report Due" value="31 Jan" change="Companies House" icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Trustee / Director Register" titleIcon="⊞" iconColor="#C9A84C"
          action={<Button small>+ Add Trustee</Button>}>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role', render: r => <Badge variant="slate">{r.role}</Badge> },
              { key: 'appointed', header: 'Appointed' },
              { key: 'status', header: 'Status', render: r => <Badge variant="green">{r.status}</Badge> },
              { key: 'actions', header: '', render: () => <Button small variant="ghost">View</Button> },
            ]}
            data={trustees}
          />
        </Panel>

        <Panel title="Conflict of Interest Register" titleIcon="◎" iconColor="#5E9EFF">
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#5C6B84', fontSize: 12.5 }}>
            No conflicts declared. Board members should declare annually.
          </div>
          <Button variant="ghost" small style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>+ Declare Interest</Button>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="CIC Community Interest Statement" titleIcon="◉" iconColor="#C9A84C">
          {[
            { label: 'CIC Number', value: '14587923' },
            { label: 'Registered Name', value: 'Harvest Touch CIC' },
            { label: 'Annual CIC Report', value: '2023 — Filed ✓' },
            { label: 'Asset Lock', value: 'Confirmed' },
            { label: 'Community Benefit', value: 'Employment & Training' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
              <span style={{ color: '#5C6B84' }}>{row.label}</span>
              <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <Button small style={{ width: '100%', justifyContent: 'center' }}>Generate 2024 CIC Report</Button>
          </div>
        </Panel>

        <Panel title="Related Party Transactions" titleIcon="⊛" iconColor="#FB8C00">
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#5C6B84', fontSize: 12.5, marginBottom: 12 }}>
            No related party transactions recorded this financial year.
          </div>
          <div style={{ padding: 12, background: 'rgba(251,140,0,0.06)', border: '1px solid rgba(251,140,0,0.15)', borderRadius: 8, fontSize: 12, color: '#FB8C00', lineHeight: 1.6 }}>
            Any transactions with directors, their families, or connected organisations must be disclosed in the annual report under FRS 102 Section 33.
          </div>
          <Button variant="ghost" small style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>+ Record Transaction</Button>
        </Panel>
      </div>
    </AppLayout>
  )
}
