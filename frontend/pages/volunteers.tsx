import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'register' | 'hours' | 'agreements'

type VolunteerRecord = {
  id?: number
  name: string
  role: string
  programme: string
  hours: string
  dbs: string
  status: string
}

type HoursRecord = {
  id?: number
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
  const [showVolunteerForm, setShowVolunteerForm] = useState(false)
  const [showHoursForm, setShowHoursForm] = useState(false)
  const [volunteerForm, setVolunteerForm] = useState<VolunteerRecord>(EMPTY_VOLUNTEER)
  const [hoursForm, setHoursForm] = useState<HoursRecord>(EMPTY_HOURS)
  const [editingVolunteerId, setEditingVolunteerId] = useState<number | null>(null)
  const [editingHoursId, setEditingHoursId] = useState<number | null>(null)

  const { data, refetch } = useQuery({
    queryKey: ['volunteers-workspace'],
    queryFn: api.getVolunteersWorkspace,
    staleTime: 60_000,
  })

  const volunteers = data?.register ?? []
  const hours = data?.hours ?? []
  const agreements = data?.agreements ?? []
  const summary = data?.summary

  const exportVolunteers = () => {
    downloadCsvFile('volunteer-register.csv', volunteers)
    toast.success('Volunteer register exported')
  }

  const openVolunteerForm = (record?: VolunteerRecord) => {
    setVolunteerForm(record ?? EMPTY_VOLUNTEER)
    setEditingVolunteerId(record?.id ?? null)
    setShowVolunteerForm(true)
  }

  const saveVolunteer = async () => {
    if (!volunteerForm.name || !volunteerForm.role || !volunteerForm.hours) {
      toast.error('Complete the volunteer details before saving')
      return
    }

    const payload = {
      name: volunteerForm.name,
      role: volunteerForm.role,
      programme: volunteerForm.programme,
      hours: volunteerForm.hours,
      dbs: volunteerForm.dbs,
      status: volunteerForm.status,
    }

    if (editingVolunteerId === null) {
      await api.createVolunteer(payload)
      toast.success('Volunteer saved')
    } else {
      await api.updateVolunteer(editingVolunteerId, payload)
      toast.success('Volunteer updated')
    }

    await refetch()
    setShowVolunteerForm(false)
    setEditingVolunteerId(null)
    setVolunteerForm(EMPTY_VOLUNTEER)
  }

  const openHoursForm = (record?: HoursRecord) => {
    setHoursForm(record ?? EMPTY_HOURS)
    setEditingHoursId(record?.id ?? null)
    setShowHoursForm(true)
  }

  const saveHours = async () => {
    if (!hoursForm.name || !hoursForm.week || !hoursForm.logged) {
      toast.error('Complete the hours record before saving')
      return
    }

    const payload = {
      volunteer_name: hoursForm.name,
      week: hoursForm.week,
      logged: hoursForm.logged,
      approved: hoursForm.status === 'Approved' && hoursForm.approved === '-' ? hoursForm.logged : hoursForm.approved,
      value: hoursForm.value,
      status: hoursForm.status,
    }

    if (editingHoursId === null) {
      await api.createVolunteerHours(payload)
      toast.success('Hours log saved')
    } else {
      await api.updateVolunteerHours(editingHoursId, payload)
      toast.success('Hours log updated')
    }

    await refetch()
    setShowHoursForm(false)
    setEditingHoursId(null)
    setHoursForm(EMPTY_HOURS)
  }

  const activeVolunteers = useMemo(() => summary?.active_volunteers ?? 0, [summary])

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
        <StatCard label="Active Volunteers" value={String(activeVolunteers)} change={`${summary?.inactive_volunteers ?? 0} inactive`} icon="V" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Hours This Month" value={`${summary?.hours_this_month ?? 0}h`} change="Backend tracked" changeUp icon="H" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Volunteer Value" value={summary?.volunteer_value ?? 'GBP 0'} change="At NMW equivalent" icon="GBP" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="DBS Required" value={String(summary?.dbs_required ?? 0)} change="Renewals due" changeUp={false} icon="D" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
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
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openVolunteerForm(r as VolunteerRecord)}>View / Edit</Button> },
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
                { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openHoursForm(r as HoursRecord)}>View / Edit</Button> },
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
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'green' : r.status === 'Due Renewal' ? 'amber' : 'red'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openVolunteerForm({
                name: r.name,
                role: 'Volunteer',
                programme: 'Community',
                hours: 'Flexible',
                dbs: 'Pending',
                status: r.status === 'Active' ? 'Active' : 'Onboarding',
              })}>Open Record</Button> },
            ]}
            data={agreements}
          />
        </Panel>
      )}

      {showVolunteerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingVolunteerId === null ? 'Add Volunteer' : 'Edit Volunteer'}
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
              <Button variant="ghost" fullWidth onClick={() => { setShowVolunteerForm(false); setEditingVolunteerId(null); setVolunteerForm(EMPTY_VOLUNTEER) }}>Cancel</Button>
              <Button fullWidth onClick={saveVolunteer}>Save Volunteer</Button>
            </div>
          </div>
        </div>
      )}

      {showHoursForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingHoursId === null ? 'Log Volunteer Hours' : 'Edit Hours Log'}
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
              <Button variant="ghost" fullWidth onClick={() => { setShowHoursForm(false); setEditingHoursId(null); setHoursForm(EMPTY_HOURS) }}>Cancel</Button>
              <Button fullWidth onClick={saveHours}>Save Hours</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
