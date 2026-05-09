import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'register' | 'hours' | 'agreements'

type VolunteerRecord = {
  name: string
  role: string
  programme: string
  hours: string
  dbs: string
  status: string
}

type HoursRecord = {
  name: string
  week: string
  logged: string
  approved: string
  value: string
  status: string
}

const EMPTY_VOLUNTEER: VolunteerRecord = {
  name: '',
  role: '',
  programme: 'Community',
  hours: '',
  dbs: 'Pending',
  status: 'Onboarding',
}

const EMPTY_HOURS: HoursRecord = {
  name: '',
  week: '',
  logged: '',
  approved: '-',
  value: '',
  status: 'Pending',
}

export default function Volunteers() {
  const [tab, setTab] = useState<Tab>('register')
  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([
    { name: 'Sarah Adebayo', role: 'Youth Mentor', programme: 'Youth Connect', hours: '8h/wk', dbs: 'Enhanced', status: 'Active' },
    { name: 'Michael Osei', role: 'Skills Trainer', programme: 'Skills Hub', hours: '4h/wk', dbs: 'Enhanced', status: 'Active' },
    { name: 'Fatima Al-Hassan', role: 'Admin Support', programme: 'Core Ops', hours: '6h/wk', dbs: 'Basic', status: 'Active' },
    { name: 'Peter Nwosu', role: 'Event Support', programme: 'Community', hours: '2h/wk', dbs: 'Enhanced', status: 'Inactive' },
  ])
  const [hours, setHours] = useState<HoursRecord[]>([
    { name: 'Sarah Adebayo', week: 'W/E 15 Mar', logged: '8.5h', approved: '8.5h', value: 'GBP 97.75', status: 'Approved' },
    { name: 'Michael Osei', week: 'W/E 15 Mar', logged: '4.0h', approved: '4.0h', value: 'GBP 46.00', status: 'Approved' },
    { name: 'Fatima Al-Hassan', week: 'W/E 15 Mar', logged: '6.0h', approved: '-', value: 'GBP 69.00', status: 'Pending' },
    { name: 'Sarah Adebayo', week: 'W/E 08 Mar', logged: '8.0h', approved: '8.0h', value: 'GBP 92.00', status: 'Approved' },
  ])
  const [showVolunteerForm, setShowVolunteerForm] = useState(false)
  const [showHoursForm, setShowHoursForm] = useState(false)
  const [volunteerForm, setVolunteerForm] = useState<VolunteerRecord>(EMPTY_VOLUNTEER)
  const [hoursForm, setHoursForm] = useState<HoursRecord>(EMPTY_HOURS)
  const [editingVolunteerIndex, setEditingVolunteerIndex] = useState<number | null>(null)
  const [editingHoursIndex, setEditingHoursIndex] = useState<number | null>(null)

  const activeVolunteers = useMemo(() => volunteers.filter((row) => row.status === 'Active').length, [volunteers])

  const exportVolunteers = () => {
    downloadCsvFile('volunteer-register.csv', volunteers)
    toast.success('Volunteer register exported')
  }

  const openVolunteerForm = (record?: VolunteerRecord, index?: number) => {
    setVolunteerForm(record ?? EMPTY_VOLUNTEER)
    setEditingVolunteerIndex(index ?? null)
    setShowVolunteerForm(true)
  }

  const saveVolunteer = () => {
    if (!volunteerForm.name || !volunteerForm.role || !volunteerForm.hours) {
      toast.error('Complete the volunteer details before saving')
      return
    }

    if (editingVolunteerIndex === null) {
      setVolunteers((current) => [...current, volunteerForm])
      toast.success('Volunteer saved')
    } else {
      setVolunteers((current) => current.map((row, index) => index === editingVolunteerIndex ? volunteerForm : row))
      toast.success('Volunteer updated')
    }

    setShowVolunteerForm(false)
    setEditingVolunteerIndex(null)
    setVolunteerForm(EMPTY_VOLUNTEER)
  }

  const openHoursForm = (record?: HoursRecord, index?: number) => {
    setHoursForm(record ?? EMPTY_HOURS)
    setEditingHoursIndex(index ?? null)
    setShowHoursForm(true)
  }

  const saveHours = () => {
    if (!hoursForm.name || !hoursForm.week || !hoursForm.logged) {
      toast.error('Complete the hours record before saving')
      return
    }

    if (editingHoursIndex === null) {
      setHours((current) => [{ ...hoursForm, approved: hoursForm.status === 'Approved' ? hoursForm.logged : hoursForm.approved }, ...current])
      toast.success('Hours log saved')
    } else {
      setHours((current) => current.map((row, index) => index === editingHoursIndex ? hoursForm : row))
      toast.success('Hours log updated')
    }

    setShowHoursForm(false)
    setEditingHoursIndex(null)
    setHoursForm(EMPTY_HOURS)
  }

  return (
    <AppLayout
      title="Volunteers"
      subtitle="Volunteer management"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportVolunteers}>Export</Button>
          <Button onClick={() => openVolunteerForm()}>+ Add Volunteer</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Active Volunteers" value={String(activeVolunteers)} change={`${volunteers.length - activeVolunteers} inactive`} icon="V" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Hours This Month" value="186h" change="Up 12% vs last month" changeUp icon="H" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Volunteer Value" value="GBP 2,139" change="At NMW equivalent" icon="GBP" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="DBS Required" value={String(volunteers.filter((row) => row.dbs === 'Pending').length)} change="Renewals due" changeUp={false} icon="D" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'register', label: 'Volunteer Register' },
          { key: 'hours', label: 'Hours Log' },
          { key: 'agreements', label: 'Volunteer Agreements' },
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

      {tab === 'register' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role' },
              { key: 'programme', header: 'Programme', render: (r) => <Badge variant="slate">{r.programme}</Badge> },
              { key: 'hours', header: 'Commitment' },
              { key: 'dbs', header: 'DBS', render: (r) => <Badge variant={r.dbs === 'Enhanced' ? 'blue' : 'slate'}>{r.dbs}</Badge> },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'green' : r.status === 'Inactive' ? 'slate' : 'amber'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openVolunteerForm(r, volunteers.findIndex((row) => row.name === r.name && row.role === r.role))}>View / Edit</Button> },
            ]}
            data={volunteers}
          />
        </Panel>
      )}

      {tab === 'hours' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Volunteer Hours Log</div>
            <Button onClick={() => openHoursForm()}>+ Log Hours</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Volunteer', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'week', header: 'Week Ending' },
                { key: 'logged', header: 'Hours Logged', mono: true },
                { key: 'approved', header: 'Approved', mono: true },
                { key: 'value', header: 'Value', align: 'right', render: (r) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>{r.value}</span> },
                { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Approved' ? 'green' : 'amber'}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openHoursForm(r, hours.findIndex((row) => row.name === r.name && row.week === r.week))}>View / Edit</Button> },
              ]}
              data={hours}
            />
          </Panel>
        </>
      )}

      {tab === 'agreements' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Volunteer', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'issued', header: 'Issued' },
              { key: 'signed', header: 'Signed' },
              { key: 'expires', header: 'Expires' },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.sV}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openVolunteerForm({
                name: r.name,
                role: 'Volunteer',
                programme: 'Community',
                hours: 'Flexible',
                dbs: 'Pending',
                status: r.status === 'Active' ? 'Active' : 'Onboarding',
              })}>Open Record</Button> },
            ]}
            data={[
              { name: 'Sarah Adebayo', issued: '01 Sep 2023', signed: '03 Sep 2023', expires: 'Sep 2025', status: 'Active', sV: 'green' as const },
              { name: 'Michael Osei', issued: '01 Jan 2024', signed: '05 Jan 2024', expires: 'Jan 2026', status: 'Active', sV: 'green' as const },
              { name: 'Fatima Al-Hassan', issued: '01 Jun 2023', signed: '08 Jun 2023', expires: 'Jun 2025', status: 'Due Renewal', sV: 'amber' as const },
              { name: 'Peter Nwosu', issued: '01 Mar 2023', signed: '02 Mar 2023', expires: 'Mar 2025', status: 'Expired', sV: 'red' as const },
            ]}
          />
        </Panel>
      )}

      {showVolunteerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingVolunteerIndex === null ? 'Add Volunteer' : 'Edit Volunteer'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Full Name" value={volunteerForm.name} onChange={(v) => setVolunteerForm({ ...volunteerForm, name: v })} placeholder="Volunteer name" />
              <FormInput label="Role" value={volunteerForm.role} onChange={(v) => setVolunteerForm({ ...volunteerForm, role: v })} placeholder="Support role" />
              <FormInput label="Programme" as="select" value={volunteerForm.programme} onChange={(v) => setVolunteerForm({ ...volunteerForm, programme: v })}>
                <option value="Youth Connect">Youth Connect</option>
                <option value="Skills Hub">Skills Hub</option>
                <option value="Core Ops">Core Ops</option>
                <option value="Community">Community</option>
              </FormInput>
              <FormInput label="Commitment" value={volunteerForm.hours} onChange={(v) => setVolunteerForm({ ...volunteerForm, hours: v })} placeholder="e.g. 4h/wk" />
              <FormInput label="DBS" as="select" value={volunteerForm.dbs} onChange={(v) => setVolunteerForm({ ...volunteerForm, dbs: v })}>
                <option value="Pending">Pending</option>
                <option value="Basic">Basic</option>
                <option value="Enhanced">Enhanced</option>
              </FormInput>
              <FormInput label="Status" as="select" value={volunteerForm.status} onChange={(v) => setVolunteerForm({ ...volunteerForm, status: v })}>
                <option value="Onboarding">Onboarding</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </FormInput>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowVolunteerForm(false); setEditingVolunteerIndex(null); setVolunteerForm(EMPTY_VOLUNTEER) }}>Cancel</Button>
              <Button fullWidth onClick={saveVolunteer}>Save Volunteer</Button>
            </div>
          </div>
        </div>
      )}

      {showHoursForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingHoursIndex === null ? 'Log Volunteer Hours' : 'Edit Hours Log'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Volunteer Name" value={hoursForm.name} onChange={(v) => setHoursForm({ ...hoursForm, name: v })} placeholder="Volunteer name" />
              <FormInput label="Week Ending" value={hoursForm.week} onChange={(v) => setHoursForm({ ...hoursForm, week: v })} placeholder="W/E 15 Mar" />
              <FormInput label="Hours Logged" value={hoursForm.logged} onChange={(v) => setHoursForm({ ...hoursForm, logged: v })} placeholder="e.g. 6.0h" />
              <FormInput label="Approved Hours" value={hoursForm.approved} onChange={(v) => setHoursForm({ ...hoursForm, approved: v })} placeholder="Approved value" />
              <FormInput label="Value" value={hoursForm.value} onChange={(v) => setHoursForm({ ...hoursForm, value: v })} placeholder="GBP 69.00" />
              <FormInput label="Status" as="select" value={hoursForm.status} onChange={(v) => setHoursForm({ ...hoursForm, status: v })}>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
              </FormInput>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowHoursForm(false); setEditingHoursIndex(null); setHoursForm(EMPTY_HOURS) }}>Cancel</Button>
              <Button fullWidth onClick={saveHours}>Save Hours</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
