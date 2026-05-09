import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'rota' | 'timesheets' | 'absences'

type ShiftRecord = {
  name: string
  mon: string
  tue: string
  wed: string
  thu: string
  fri: string
  total: string
}

const INITIAL_ROTA: ShiftRecord[] = [
  { name: 'Aisha Ibrahim', mon: '09:00-17:00', tue: '09:00-17:00', wed: 'OFF', thu: '09:00-17:00', fri: '09:00-17:00', total: '32h' },
  { name: 'Kwame Okafor', mon: '10:00-14:00', tue: '10:00-14:00', wed: '10:00-14:00', thu: 'OFF', fri: 'OFF', total: '12h' },
  { name: 'Jamilu Musa', mon: 'OFF', tue: '13:00-17:00', wed: '13:00-17:00', thu: '13:00-17:00', fri: '13:00-17:00', total: '16h' },
]

const INITIAL_TIMESHEETS = [
  { name: 'Aisha Ibrahim', week: 'W/E 15 Mar', scheduled: '32h', actual: '32.5h', overtime: '0.5h', status: 'Approved', sV: 'green' as const },
  { name: 'Kwame Okafor', week: 'W/E 15 Mar', scheduled: '12h', actual: '12.0h', overtime: '-', status: 'Approved', sV: 'green' as const },
  { name: 'Jamilu Musa', week: 'W/E 15 Mar', scheduled: '16h', actual: '14.0h', overtime: '-', status: 'Pending', sV: 'amber' as const },
  { name: 'Aisha Ibrahim', week: 'W/E 08 Mar', scheduled: '32h', actual: '31.0h', overtime: '-', status: 'Approved', sV: 'green' as const },
]

const EMPTY_SHIFT: ShiftRecord = {
  name: '',
  mon: 'OFF',
  tue: 'OFF',
  wed: 'OFF',
  thu: 'OFF',
  fri: 'OFF',
  total: '',
}

export default function Rota() {
  const [tab, setTab] = useState<Tab>('rota')
  const [weekOffset, setWeekOffset] = useState(0)
  const [rota, setRota] = useState(INITIAL_ROTA)
  const [timesheets, setTimesheets] = useState(INITIAL_TIMESHEETS)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState<ShiftRecord>(EMPTY_SHIFT)
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null)

  const weekLabel = useMemo(() => {
    const base = new Date('2025-03-17T00:00:00')
    base.setDate(base.getDate() + (weekOffset * 7))
    return base.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }, [weekOffset])

  const exportTimesheets = () => {
    downloadCsvFile('timesheets.csv', timesheets)
    toast.success('Timesheets exported')
  }

  const openShiftForm = (record?: ShiftRecord, index?: number) => {
    setShiftForm(record ?? EMPTY_SHIFT)
    setEditingShiftIndex(index ?? null)
    setShowShiftForm(true)
  }

  const saveShift = () => {
    if (!shiftForm.name || !shiftForm.total) {
      toast.error('Complete the shift record before saving')
      return
    }
    if (editingShiftIndex === null) {
      setRota((current) => [...current, shiftForm])
      toast.success('Shift saved')
    } else {
      setRota((current) => current.map((row, index) => index === editingShiftIndex ? shiftForm : row))
      toast.success('Shift updated')
    }
    setShowShiftForm(false)
    setEditingShiftIndex(null)
    setShiftForm(EMPTY_SHIFT)
  }

  const approveTimesheet = (name: string, week: string) => {
    setTimesheets((current) => current.map((row) => row.name === name && row.week === week ? { ...row, status: 'Approved', sV: 'green' as const } : row))
    toast.success('Timesheet approved')
  }

  return (
    <AppLayout
      title="Rota and Timesheets"
      subtitle="Schedule management"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportTimesheets}>Export Timesheets</Button>
          <Button onClick={() => openShiftForm()}>+ Add Shift</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Scheduled Hours" value="60h" change="This week | 4 staff" icon="H" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Timesheets Pending" value={String(timesheets.filter((row) => row.status === 'Pending').length)} change="Awaiting approval" icon="P" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Overtime This Month" value="3.5h" change="0.5h this week" icon="OT" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Absences (MTD)" value="1" change="Planned" icon="A" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'rota', label: 'Weekly Rota' },
          { key: 'timesheets', label: 'Timesheets' },
          { key: 'absences', label: 'Absence Log' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              background: 'none',
              borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
              color: tab === t.key ? '#E8C56A' : '#5C6B84',
              fontWeight: tab === t.key ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rota' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Rota for week commencing {weekLabel}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => setWeekOffset((value) => value - 1)}>Previous</Button>
              <Button variant="ghost" onClick={() => setWeekOffset((value) => value + 1)}>Next</Button>
              <Button onClick={() => openShiftForm()}>+ Add Shift</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'mon', header: 'Mon', render: (r) => <span style={{ fontSize: 11, color: r.mon === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.mon}</span> },
                { key: 'tue', header: 'Tue', render: (r) => <span style={{ fontSize: 11, color: r.tue === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.tue}</span> },
                { key: 'wed', header: 'Wed', render: (r) => <span style={{ fontSize: 11, color: r.wed === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.wed}</span> },
                { key: 'thu', header: 'Thu', render: (r) => <span style={{ fontSize: 11, color: r.thu === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.thu}</span> },
                { key: 'fri', header: 'Fri', render: (r) => <span style={{ fontSize: 11, color: r.fri === 'OFF' ? '#5C6B84' : '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{r.fri}</span> },
                { key: 'total', header: 'Total', render: (r) => <Badge variant="gold">{r.total}</Badge> },
                { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openShiftForm(r, rota.findIndex((row) => row.name === r.name))}>Edit</Button> },
              ]}
              data={rota}
            />
          </Panel>
        </>
      )}

      {tab === 'timesheets' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Timesheets</div>
            <Button variant="ghost" onClick={exportTimesheets}>Export Timesheets</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'week', header: 'Week Ending' },
                { key: 'scheduled', header: 'Scheduled', mono: true },
                { key: 'actual', header: 'Actual', mono: true },
                { key: 'overtime', header: 'Overtime', render: (r) => <span style={{ color: r.overtime !== '-' ? '#FB8C00' : '#5C6B84', fontFamily: "'JetBrains Mono', monospace" }}>{r.overtime}</span> },
                { key: 'status', header: 'Status', render: (r) => <Badge variant={r.sV}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Pending' ? <Button small onClick={() => approveTimesheet(r.name, r.week)}>Approve</Button> : <Button small variant="ghost" onClick={() => toast.success(`Viewing ${r.name}'s timesheet`)}>View</Button> },
              ]}
              data={timesheets}
            />
          </Panel>
        </>
      )}

      {tab === 'absences' && (
        <Panel title="Absence Log" titleIcon="AB" iconColor="#FB8C00" noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Employee', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'from', header: 'From' },
              { key: 'to', header: 'To' },
              { key: 'days', header: 'Days', mono: true },
              { key: 'type', header: 'Type', render: (r) => <Badge variant={r.tV}>{r.type}</Badge> },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.sV}>{r.status}</Badge> },
            ]}
            data={[
              { name: 'Kwame Okafor', from: '10 Mar', to: '10 Mar', days: '1', type: 'Sick', tV: 'amber' as const, status: 'Recorded', sV: 'slate' as const },
              { name: 'Aisha Ibrahim', from: '14 Apr', to: '17 Apr', days: '4', type: 'Annual Leave', tV: 'blue' as const, status: 'Approved', sV: 'green' as const },
            ]}
          />
        </Panel>
      )}

      {showShiftForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingShiftIndex === null ? 'Add Shift' : 'Edit Shift'}
            </div>
            <FormInput label="Employee Name" value={shiftForm.name} onChange={(v) => setShiftForm({ ...shiftForm, name: v })} placeholder="Team member" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <FormInput label="Monday" value={shiftForm.mon} onChange={(v) => setShiftForm({ ...shiftForm, mon: v })} placeholder="09:00-17:00 or OFF" />
              <FormInput label="Tuesday" value={shiftForm.tue} onChange={(v) => setShiftForm({ ...shiftForm, tue: v })} placeholder="09:00-17:00 or OFF" />
              <FormInput label="Wednesday" value={shiftForm.wed} onChange={(v) => setShiftForm({ ...shiftForm, wed: v })} placeholder="09:00-17:00 or OFF" />
              <FormInput label="Thursday" value={shiftForm.thu} onChange={(v) => setShiftForm({ ...shiftForm, thu: v })} placeholder="09:00-17:00 or OFF" />
              <FormInput label="Friday" value={shiftForm.fri} onChange={(v) => setShiftForm({ ...shiftForm, fri: v })} placeholder="09:00-17:00 or OFF" />
              <FormInput label="Weekly Total" value={shiftForm.total} onChange={(v) => setShiftForm({ ...shiftForm, total: v })} placeholder="32h" />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowShiftForm(false); setEditingShiftIndex(null); setShiftForm(EMPTY_SHIFT) }}>Cancel</Button>
              <Button fullWidth onClick={saveShift}>Save Shift</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
