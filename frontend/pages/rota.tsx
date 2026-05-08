import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, StatCard } from '@/components/ui'

type Tab = 'rota' | 'timesheets' | 'absences'

const ROTA = [
  { name: 'Aisha Ibrahim', mon: '09:00–17:00', tue: '09:00–17:00', wed: 'OFF', thu: '09:00–17:00', fri: '09:00–17:00', total: '32h' },
  { name: 'Kwame Okafor', mon: '10:00–14:00', tue: '10:00–14:00', wed: '10:00–14:00', thu: 'OFF', fri: 'OFF', total: '12h' },
  { name: 'Jamilu Musa', mon: 'OFF', tue: '13:00–17:00', wed: '13:00–17:00', thu: '13:00–17:00', fri: '13:00–17:00', total: '16h' },
]

const TIMESHEETS = [
  { name: 'Aisha Ibrahim', week: 'W/E 15 Mar', scheduled: '32h', actual: '32.5h', overtime: '0.5h', status: 'Approved', sV: 'green' },
  { name: 'Kwame Okafor', week: 'W/E 15 Mar', scheduled: '12h', actual: '12.0h', overtime: '—', status: 'Approved', sV: 'green' },
  { name: 'Jamilu Musa', week: 'W/E 15 Mar', scheduled: '16h', actual: '14.0h', overtime: '—', status: 'Pending', sV: 'amber' },
  { name: 'Aisha Ibrahim', week: 'W/E 08 Mar', scheduled: '32h', actual: '31.0h', overtime: '—', status: 'Approved', sV: 'green' },
]

export default function Rota() {
  const [tab, setTab] = useState<Tab>('rota')

  return (
    <AppLayout
      title="Rota & Timesheets"
      subtitle="Schedule Management"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">Export Timesheets</Button>
          <Button>+ Add Shift</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Scheduled Hours" value="60h" change="This week · 4 staff" icon="◷" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Timesheets Pending" value="2" change="Awaiting approval" icon="⊟" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Overtime This Month" value="3.5h" change="0.5h this week" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Absences (MTD)" value="1" change="Planned" icon="!" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'rota', label: 'Weekly Rota' },
          { key: 'timesheets', label: 'Timesheets' },
          { key: 'absences', label: 'Absence Log' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'rota' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Rota — w/c 17 March 2025</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost">← Previous</Button>
              <Button variant="ghost">Next →</Button>
              <Button>+ Add Shift</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'mon', header: 'Mon', render: r => <span style={{ fontSize: 11, color: r.mon === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.mon}</span> },
                { key: 'tue', header: 'Tue', render: r => <span style={{ fontSize: 11, color: r.tue === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.tue}</span> },
                { key: 'wed', header: 'Wed', render: r => <span style={{ fontSize: 11, color: r.wed === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.wed}</span> },
                { key: 'thu', header: 'Thu', render: r => <span style={{ fontSize: 11, color: r.thu === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.thu}</span> },
                { key: 'fri', header: 'Fri', render: r => <span style={{ fontSize: 11, color: r.fri === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.fri}</span> },
                { key: 'total', header: 'Total', render: r => <Badge variant="gold">{r.total}</Badge> },
              ]}
              data={ROTA}
            />
          </Panel>
        </>
      )}

      {tab === 'timesheets' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Timesheets</div>
            <Button variant="ghost">Export Timesheets</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'week', header: 'Week Ending' },
                { key: 'scheduled', header: 'Scheduled', mono: true },
                { key: 'actual', header: 'Actual', mono: true },
                { key: 'overtime', header: 'Overtime', render: r => <span style={{ color: r.overtime !== '—' ? '#FB8C00' : '#5C6B84', fontFamily: "'JetBrains Mono', monospace" }}>{r.overtime}</span> },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Pending' ? <Button small>Approve</Button> : <Button small variant="ghost">View</Button> },
              ]}
              data={TIMESHEETS}
            />
          </Panel>
        </>
      )}

      {tab === 'absences' && (
        <Panel title="Absence Log" titleIcon="!" iconColor="#FB8C00" noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'from', header: 'From' },
              { key: 'to', header: 'To' },
              { key: 'days', header: 'Days', mono: true },
              { key: 'type', header: 'Type', render: r => <Badge variant={r.tV as any}>{r.type}</Badge> },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
            ]}
            data={[
              { name: 'Kwame Okafor', from: '10 Mar', to: '10 Mar', days: '1', type: 'Sick', tV: 'amber', status: 'Recorded', sV: 'slate' },
              { name: 'Aisha Ibrahim', from: '14 Apr', to: '17 Apr', days: '4', type: 'Annual Leave', tV: 'blue', status: 'Approved', sV: 'green' },
            ]}
          />
        </Panel>
      )}
    </AppLayout>
  )
}
