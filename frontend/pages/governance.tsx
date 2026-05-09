import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

export default function Governance() {
  const [trustees, setTrustees] = useState([
    { name: 'Dominic Ogbuagu', role: 'Director / CFO', appointed: '01 Apr 2022', status: 'Active', coi: 'None declared' },
    { name: 'Grace Okafor', role: 'Chair', appointed: '01 Apr 2022', status: 'Active', coi: 'None declared' },
    { name: 'Ahmed Al-Rashid', role: 'Secretary', appointed: '15 Jun 2022', status: 'Active', coi: 'None declared' },
  ])
  const [interestNote, setInterestNote] = useState('No conflicts declared. Board members should declare interests annually.')

  const exportRegister = () => {
    downloadCsvFile('trustee-register.csv', trustees)
    toast.success('Governance register exported')
  }

  const addTrustee = () => {
    setTrustees((current) => [
      ...current,
      { name: 'New trustee', role: 'Board Member', appointed: new Date().toLocaleDateString('en-GB'), status: 'Pending induction', coi: 'Awaiting declaration' },
    ])
    toast.success('Trustee draft added')
  }

  return (
    <AppLayout
      title="Governance"
      subtitle="CIC governance and compliance"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportRegister}>Export Register</Button>
          <Button onClick={addTrustee}>+ Add Trustee</Button>
        </div>
      }
    >
      <Alert variant="warning" icon="!">
        Governance module covering trustee register, conflicts, CIC reporting, and related party controls.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Directors / Trustees" value={String(trustees.length)} change="All active" icon="T" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Conflicts Declared" value="0" change="Annual review due June" icon="C" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Board Meetings" value="4" change="FY 2024-25" icon="M" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="CIC Report Due" value="31 Jan" change="Companies House" icon="R" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Panel title="Trustee / Director Register" titleIcon="TR" iconColor="#C9A84C" action={<Button small onClick={addTrustee}>+ Add Trustee</Button>}>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role', render: (r) => <Badge variant="slate">{r.role}</Badge> },
              { key: 'appointed', header: 'Appointed' },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'green' : 'amber'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => toast.success(`${r.name}: ${r.coi}`)}>View</Button> },
            ]}
            data={trustees}
          />
        </Panel>

        <Panel title="Conflict of Interest Register" titleIcon="COI" iconColor="#5E9EFF">
          <div style={{ padding: '12px 0', color: '#C8D3E8', fontSize: 12.5, lineHeight: 1.7 }}>{interestNote}</div>
          <Button
            variant="ghost"
            small
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => {
              setInterestNote('Draft interest declaration created for annual board review.')
              toast.success('Interest declaration draft created')
            }}
          >
            Declare Interest
          </Button>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <Panel title="CIC Community Interest Statement" titleIcon="CIC" iconColor="#C9A84C">
          {[
            { label: 'CIC Number', value: '14587923' },
            { label: 'Registered Name', value: 'Harvest Touch CIC' },
            { label: 'Annual CIC Report', value: '2023 Filed' },
            { label: 'Asset Lock', value: 'Confirmed' },
            { label: 'Community Benefit', value: 'Employment and training' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
              <span style={{ color: '#5C6B84' }}>{row.label}</span>
              <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <Button small style={{ width: '100%', justifyContent: 'center' }} onClick={() => toast.success('CIC report draft queued for export')}>
              Generate 2024 CIC Report
            </Button>
          </div>
        </Panel>

        <Panel title="Related Party Transactions" titleIcon="RPT" iconColor="#FB8C00">
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#5C6B84', fontSize: 12.5, marginBottom: 12 }}>
            No related party transactions recorded this financial year.
          </div>
          <div style={{ padding: 12, background: 'rgba(251,140,0,0.06)', border: '1px solid rgba(251,140,0,0.15)', borderRadius: 8, fontSize: 12, color: '#FB8C00', lineHeight: 1.6 }}>
            Transactions with directors, their families, or connected entities should be disclosed in annual reporting.
          </div>
          <Button variant="ghost" small style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => toast.success('Related party transaction form opened')}>
            Record Transaction
          </Button>
        </Panel>
      </div>
    </AppLayout>
  )
}
