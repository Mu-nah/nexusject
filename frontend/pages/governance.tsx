import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type TrusteeRecord = {
  id?: number
  name: string
  role: string
  appointed: string
  status: string
  coi: string
}

const EMPTY_TRUSTEE: TrusteeRecord = {
  name: '',
  role: '',
  appointed: '',
  status: 'Pending induction',
  coi: '',
}

export default function Governance() {
  const [showTrusteeForm, setShowTrusteeForm] = useState(false)
  const [trusteeForm, setTrusteeForm] = useState<TrusteeRecord>(EMPTY_TRUSTEE)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [interestNote, setInterestNote] = useState('No conflicts declared. Board members should declare interests annually.')

  const { data, refetch } = useQuery({
    queryKey: ['governance-workspace'],
    queryFn: api.getGovernanceWorkspace,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.interest_note) {
      setInterestNote(data.interest_note)
    }
  }, [data])

  const trustees = data?.trustees ?? []
  const summary = data?.summary

  const exportRegister = () => {
    downloadCsvFile('trustee-register.csv', trustees)
    toast.success('Governance register exported')
  }

  const openTrusteeForm = (record?: TrusteeRecord) => {
    setTrusteeForm(record ?? EMPTY_TRUSTEE)
    setEditingId(record?.id ?? null)
    setShowTrusteeForm(true)
  }

  const saveTrustee = async () => {
    if (!trusteeForm.name || !trusteeForm.role || !trusteeForm.appointed) {
      toast.error('Complete the trustee record before saving')
      return
    }
    const payload = {
      name: trusteeForm.name,
      role: trusteeForm.role,
      appointed: trusteeForm.appointed,
      status: trusteeForm.status,
      coi: trusteeForm.coi,
    }
    if (editingId === null) {
      await api.createTrustee(payload)
      toast.success('Trustee saved')
    } else {
      await api.updateTrustee(editingId, payload)
      toast.success('Trustee updated')
    }
    await refetch()
    setShowTrusteeForm(false)
    setEditingId(null)
    setTrusteeForm(EMPTY_TRUSTEE)
  }

  return (
    <AppLayout
      title="Governance"
      subtitle="CIC governance and compliance"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportRegister}>Export Register</Button>
          <Button onClick={() => openTrusteeForm()}>+ Add Trustee</Button>
        </div>
      }
    >
      <Alert variant="warning" icon="!">
        Keep the trustee register and conflict disclosures up to date for board and filing readiness.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Directors / Trustees" value={String(summary?.trustee_count ?? 0)} change="Workspace register" icon="T" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Conflicts Declared" value={String(summary?.conflicts_declared ?? 0)} change="Annual review due June" icon="C" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Board Meetings" value={String(summary?.board_meetings ?? 0)} change="FY 2024-25" icon="M" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="CIC Report Due" value={summary?.cic_report_due ?? '31 Jan'} change="Companies House" icon="R" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Panel title="Trustee / Director Register" titleIcon="TR" iconColor="#C9A84C" action={<Button small onClick={() => openTrusteeForm()}>+ Add Trustee</Button>}>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role', render: (r) => <Badge variant="slate">{r.role}</Badge> },
              { key: 'appointed', header: 'Appointed' },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'green' : 'amber'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openTrusteeForm(r as TrusteeRecord)}>View / Edit</Button> },
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

      {showTrusteeForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingId === null ? 'Add Trustee' : 'Edit Trustee'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Full Name" value={trusteeForm.name} onChange={(v) => setTrusteeForm({ ...trusteeForm, name: v })} placeholder="Trustee name" />
              <FormInput label="Role" value={trusteeForm.role} onChange={(v) => setTrusteeForm({ ...trusteeForm, role: v })} placeholder="Chair, Treasurer..." />
              <FormInput label="Appointed" value={trusteeForm.appointed} onChange={(v) => setTrusteeForm({ ...trusteeForm, appointed: v })} placeholder="01 Apr 2022" />
              <FormInput label="Status" as="select" value={trusteeForm.status} onChange={(v) => setTrusteeForm({ ...trusteeForm, status: v })}>
                <option value="Pending induction">Pending induction</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </FormInput>
            </div>
            <FormInput label="Conflict of Interest Note" value={trusteeForm.coi} onChange={(v) => setTrusteeForm({ ...trusteeForm, coi: v })} placeholder="None declared" as="textarea" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowTrusteeForm(false); setEditingId(null); setTrusteeForm(EMPTY_TRUSTEE) }}>Cancel</Button>
              <Button fullWidth onClick={saveTrustee}>Save Trustee</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
