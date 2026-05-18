import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

type Tab = 'licence' | 'workers' | 'cos' | 'duties' | 'audit'

type WorkerRecord = {
  id?: number
  name: string
  role: string
  cos: string
  startDate: string
  visaExpiry: string
  rtw: string
  status: string
}

type CosRecord = {
  id?: number
  cosRef: string
  worker: string
  type: string
  issued: string
  status: string
}

const EMPTY_WORKER: WorkerRecord = {
  name: '',
  role: '',
  cos: '',
  startDate: '',
  visaExpiry: '',
  rtw: 'Due Soon',
  status: 'Active',
}

const EMPTY_COS: CosRecord = {
  cosRef: '',
  worker: 'Unassigned',
  type: 'Undefined',
  issued: '',
  status: 'Available',
}

const dutyVariant = (status: string) => status === 'Overdue' ? 'red' : status === 'Due' ? 'amber' : status === 'Reported' ? 'green' : 'slate'
const rtwVariant = (status: string) => status === 'Valid' ? 'green' : status === 'Expired' ? 'red' : 'amber'
const cosVariant = (status: string) => status === 'Used' ? 'green' : status === 'Reserved' ? 'amber' : 'slate'

type ChecklistStatus = 'ok' | 'fail' | 'na'

export default function UKVI() {
  const user = useAuthStore((state) => state.user)
  const [tab, setTab] = useState<Tab>('licence')
  const [country, setCountry] = useState('United Kingdom')
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [showCosForm, setShowCosForm] = useState(false)
  const [workerForm, setWorkerForm] = useState<WorkerRecord>(EMPTY_WORKER)
  const [cosForm, setCosForm] = useState<CosRecord>(EMPTY_COS)
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null)
  const [editingCosId, setEditingCosId] = useState<number | null>(null)
  const [dutyLog, setDutyLog] = useState('No report has been submitted from this screen yet.')

  const { data, refetch } = useQuery({
    queryKey: ['ukvi-workspace'],
    queryFn: api.getUkviWorkspace,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.duty_log) {
      setDutyLog(data.duty_log)
    }
  }, [data])

  const workers = data?.workers ?? []
  const cosRecords = data?.cos_records ?? []
  const duties = data?.duties ?? []
  const summary = data?.summary
  const organisationName = user?.organisation || 'Current workspace'
  const hasUkviData = Boolean(workers.length || cosRecords.length || duties.length)
  const overdueDuties = duties.filter((item: any) => item.status === 'Overdue' || item.status === 'Due')
  const validRtwCount = workers.filter((item: WorkerRecord) => item.rtw === 'Valid').length
  const licenceRows = [
    { label: 'Organisation', value: organisationName },
    { label: 'Licence Status', value: summary?.licence_status ?? 'Not recorded' },
    { label: 'Sponsored Workers', value: String(summary?.sponsored_workers ?? 0) },
    { label: 'Available CoS', value: String(summary?.cos_available ?? 0) },
    { label: 'Open Reporting Duties', value: String(summary?.reporting_duties ?? 0) },
    { label: 'Latest Duty Log', value: dutyLog || 'No reporting activity yet' },
  ]
  const hasLicence = (summary?.licence_status ?? 'Not recorded') !== 'Not recorded'
  const hasWorkers = workers.length > 0
  const hasCos = cosRecords.length > 0
  const hasDuties = duties.length > 0
  const hasLog = dutyLog !== 'No report has been submitted from this screen yet.'

  const complianceChecklist: { item: string; status: ChecklistStatus; note: string }[] = [
    {
      item: 'Sponsor licence status recorded',
      status: !hasUkviData ? 'na' : hasLicence ? 'ok' : 'fail',
      note: hasLicence ? summary?.licence_status ?? '' : 'Go to Sponsor Licence tab to record',
    },
    {
      item: 'Sponsored worker register maintained',
      status: !hasUkviData ? 'na' : hasWorkers ? 'ok' : 'fail',
      note: hasWorkers ? `${workers.length} worker${workers.length !== 1 ? 's' : ''} on record` : 'No workers added yet',
    },
    {
      item: 'Certificate of Sponsorship register',
      status: !hasUkviData ? 'na' : hasCos ? 'ok' : 'fail',
      note: hasCos ? `${cosRecords.length} CoS record${cosRecords.length !== 1 ? 's' : ''}` : 'No CoS records yet',
    },
    {
      item: 'Right to Work checks valid',
      status: !hasWorkers ? 'na' : validRtwCount === workers.length ? 'ok' : 'fail',
      note: !hasWorkers ? 'No workers to check' : `${validRtwCount}/${workers.length} valid`,
    },
    {
      item: 'Reporting duties up to date',
      status: !hasDuties ? 'na' : overdueDuties.length === 0 ? 'ok' : 'fail',
      note: !hasDuties ? 'No duties logged yet' : overdueDuties.length === 0 ? 'All duties reported' : `${overdueDuties.length} overdue`,
    },
    {
      item: 'Latest UKVI action log captured',
      status: !hasUkviData ? 'na' : hasLog ? 'ok' : 'fail',
      note: hasLog ? 'Log entry present' : 'No action logged yet',
    },
  ]
  const licenceChangeText =
    summary?.licence_status === 'Not recorded'
      ? 'Add your sponsor licence records'
      : hasUkviData
        ? 'Workspace records loaded'
        : 'No UKVI activity yet'

  const exportPack = () => {
    downloadCsvFile('ukvi-audit-pack-index.csv', [
      { section: 'Sponsor licence', status: 'Ready' },
      { section: 'Sponsored workers', status: 'Backend tracked' },
      { section: 'Reporting log', status: 'Ready' },
      { section: 'HR policies', status: 'Ready' },
    ])
    toast.success('Audit pack index exported')
  }

  const openWorkerForm = (record?: WorkerRecord) => {
    setWorkerForm(record ?? EMPTY_WORKER)
    setEditingWorkerId(record?.id ?? null)
    setShowWorkerForm(true)
  }

  const saveWorker = async () => {
    if (!workerForm.name || !workerForm.role || !workerForm.cos || !workerForm.visaExpiry) {
      toast.error('Complete the sponsored worker record before saving')
      return
    }

    const payload = {
      name: workerForm.name,
      role: workerForm.role,
      cos: workerForm.cos,
      start_date: workerForm.startDate,
      visa_expiry: workerForm.visaExpiry,
      rtw: workerForm.rtw,
      status: workerForm.status,
    }

    if (editingWorkerId === null) {
      await api.createUkviWorker(payload)
      toast.success('Sponsored worker saved')
    } else {
      await api.updateUkviWorker(editingWorkerId, payload)
      toast.success('Sponsored worker updated')
    }

    await refetch()
    setShowWorkerForm(false)
    setEditingWorkerId(null)
    setWorkerForm(EMPTY_WORKER)
  }

  const openCosForm = (record?: CosRecord) => {
    setCosForm(record ?? EMPTY_COS)
    setEditingCosId(record?.id ?? null)
    setShowCosForm(true)
  }

  const saveCos = async () => {
    if (!cosForm.cosRef || !cosForm.type) {
      toast.error('Complete the CoS record before saving')
      return
    }

    const payload = {
      cos_ref: cosForm.cosRef,
      worker: cosForm.worker,
      type: cosForm.type,
      issued: cosForm.issued,
      status: cosForm.status,
    }

    if (editingCosId === null) {
      await api.createUkviCos(payload)
      toast.success('CoS record saved')
    } else {
      await api.updateUkviCos(editingCosId, payload)
      toast.success('CoS record updated')
    }

    await refetch()
    setShowCosForm(false)
    setEditingCosId(null)
    setCosForm(EMPTY_COS)
  }

  const reportDuty = async (dutyId: number, duty: string) => {
    const note = `${duty} reported on ${new Date().toLocaleDateString('en-GB')}.`
    const response = await api.reportUkviDuty(dutyId, note)
    setDutyLog(response.latest_note)
    await refetch()
    toast.success('Reporting action logged')
  }

  return (
    <AppLayout
      title="Sponsorship"
      subtitle="Sponsor licence management · Worker compliance"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button variant="ghost" onClick={exportPack}>Export Pack</Button>
          <Button onClick={() => setTab('audit')}>Audit Pack</Button>
        </div>
      }
    >
      <Alert variant={hasUkviData ? 'warning' : 'info'} icon={hasUkviData ? '!' : 'i'}>
        {hasUkviData ? (
          <><strong>Sponsor compliance active:</strong> Review workers, CoS allocations, and reporting duties to stay audit-ready. UKVI visits can happen with little notice.</>
        ) : (
          <>No sponsorship records yet. Add your sponsor licence, workers, and CoS certificates to activate the compliance checklist.</>
        )}
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Licence Status" value={summary?.licence_status ?? 'Not recorded'} change={licenceChangeText} icon="L" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Sponsored Workers" value={String(summary?.sponsored_workers ?? 0)} change={workers[0]?.name ?? 'No workers recorded'} icon="W" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="CoS Available" value={String(summary?.cos_available ?? 0)} change={cosRecords.length ? 'Certificates recorded in register' : 'No certificates recorded yet'} icon="C" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Reporting Duties" value={String(summary?.reporting_duties ?? 0)} change={overdueDuties.length ? 'Action required' : 'No overdue duties'} changeUp={false} icon="D" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
      </div>

      {/* Jurisdiction selector — content-level setting that all tabs adapt to */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: 'var(--mute2)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sponsoring jurisdiction</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, fontSize: 14, pointerEvents: 'none', zIndex: 1 }}>🇬🇧</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{
              appearance: 'none',
              paddingLeft: 32, paddingRight: 28, paddingTop: 6, paddingBottom: 6,
              background: 'color-mix(in srgb, var(--gold) 10%, var(--bg3))',
              border: '1px solid var(--gold-line)',
              borderRadius: 20,
              color: 'var(--gold2)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            <option value="United Kingdom">United Kingdom</option>
          </select>
          <span style={{ position: 'absolute', right: 10, fontSize: 10, color: 'var(--gold2)', pointerEvents: 'none' }}>▾</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 'auto' }}>Compliance rules, thresholds, and timelines apply for this jurisdiction</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'licence', label: 'Sponsor Licence' },
          { key: 'workers', label: 'Sponsored Workers' },
          { key: 'cos', label: 'CoS Register' },
          { key: 'duties', label: 'Reporting Duties' },
          { key: 'audit', label: 'Audit Pack' },
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

      {tab === 'licence' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Panel title="Licence Details" titleIcon="LD" iconColor="#2DCE89">
            {licenceRows.map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                <span style={{ color: '#5C6B84' }}>{row.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8', textAlign: 'right', maxWidth: '62%' }}>{row.value}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Compliance Checklist" titleIcon="CC" iconColor="#C9A84C">
            {complianceChecklist.map((row, index) => {
              const iconColor = row.status === 'ok' ? '#2DCE89' : row.status === 'fail' ? '#F5365C' : '#5C6B84'
              const iconLabel = row.status === 'ok' ? 'OK' : row.status === 'fail' ? '!' : '—'
              const textColor = row.status === 'ok' ? '#7A8BA8' : row.status === 'fail' ? '#C8D3E8' : '#5C6B84'
              return (
                <div key={row.item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: index < complianceChecklist.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: iconColor, fontWeight: 700, fontSize: 12, minWidth: 18, marginTop: 1 }}>{iconLabel}</span>
                  <div>
                    <div style={{ fontSize: 12, color: textColor }}>{row.item}</div>
                    <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>{row.note}</div>
                  </div>
                </div>
              )
            })}
            {!hasUkviData && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(201,168,76,0.06)', borderRadius: 7, fontSize: 11.5, color: '#5C6B84', lineHeight: 1.65 }}>
                Checklist items show <strong style={{ color: '#5C6B84' }}>—</strong> until records are added. Items only fail once data exists but something is wrong.
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'workers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Sponsored Worker Register</div>
            <Button onClick={() => openWorkerForm()}>+ Add Sponsored Worker</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'role', header: 'Role / SOC Code' },
                { key: 'cos', header: 'CoS Ref', mono: true },
                { key: 'startDate', header: 'Start Date' },
                { key: 'visaExpiry', header: 'Visa Expiry' },
                { key: 'rtw', header: 'RTW', render: (r) => <Badge variant={rtwVariant(r.rtw) as any}>{r.rtw}</Badge> },
                { key: 'status', header: 'Status', render: (r) => <Badge variant="green">{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openWorkerForm(r as WorkerRecord)}>View / Edit</Button> },
              ]}
              data={workers}
              emptyMessage="No sponsored workers recorded yet"
            />
          </Panel>
        </>
      )}

      {tab === 'cos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Certificate of Sponsorship Register</div>
            <Button onClick={() => openCosForm()}>+ Assign CoS</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'cosRef', header: 'CoS Reference', mono: true },
                { key: 'worker', header: 'Assigned To' },
                { key: 'type', header: 'Type', render: (r) => <Badge variant="blue">{r.type}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'status', header: 'Status', render: (r) => <Badge variant={cosVariant(r.status) as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => <Button small variant="ghost" onClick={() => openCosForm(r as CosRecord)}>View / Edit</Button> },
              ]}
              data={cosRecords}
              emptyMessage="No CoS records created yet"
            />
          </Panel>
        </>
      )}

      {tab === 'duties' && (
        <>
          <Alert variant={duties.length ? 'warning' : 'info'} icon={duties.length ? '!' : 'i'}>
            {duties.length
              ? 'Worker changes should be reported within 10 working days, and organisational changes within 20 working days.'
              : 'No reporting duty entries have been logged in this workspace yet.'}
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'duty', header: 'Reporting Duty', render: (r) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.duty}</span> },
                { key: 'trigger', header: 'Trigger Event' },
                { key: 'deadline', header: 'Deadline' },
                { key: 'status', header: 'Status', render: (r) => <Badge variant={dutyVariant(r.status) as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Overdue' || r.status === 'Due' ? <Button small onClick={() => reportDuty(r.id, r.duty)}>Report Now</Button> : <Button small variant="ghost" onClick={() => toast.success(`${r.duty} reviewed`)}>View</Button> },
              ]}
              data={duties}
              emptyMessage="No reporting duties recorded yet"
            />
          </Panel>
          <Panel title="Latest Duty Update" titleIcon="LOG" iconColor="#5E9EFF" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.8 }}>{dutyLog}</div>
          </Panel>
        </>
      )}

      {tab === 'audit' && (
        <>
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: 16, marginBottom: 18, fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.7 }}>
            UKVI visits can happen with little notice. Use this pack to confirm sponsor records, worker evidence, and policy documents are ready.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <Button onClick={exportPack}>Generate Audit Pack</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { title: 'Sponsor Licence', desc: 'Licence certificate, conditions, and rating history', status: 'Ready', sV: 'green' as const },
              { title: 'Sponsored Workers', desc: 'CoS records, visa copies, and RTW evidence', status: workers.some((item: WorkerRecord) => item.rtw !== 'Valid') ? 'Action Needed' : 'Ready', sV: workers.some((item: WorkerRecord) => item.rtw !== 'Valid') ? 'red' as const : 'green' as const },
              { title: 'Reporting Log', desc: 'All SMS reports submitted to UKVI', status: 'Ready', sV: 'green' as const },
              { title: 'HR Policies', desc: 'Recruitment, monitoring, and absence policies', status: 'Ready', sV: 'green' as const },
              { title: 'Payroll Evidence', desc: 'Payslips matching CoS salary levels', status: 'Ready', sV: 'green' as const },
              { title: 'Absence Records', desc: 'Attendance monitoring records', status: duties.some((item: any) => item.status === 'Overdue' || item.status === 'Due') ? 'Incomplete' : 'Ready', sV: duties.some((item: any) => item.status === 'Overdue' || item.status === 'Due') ? 'amber' as const : 'green' as const },
            ].map((item) => (
              <Panel key={item.title}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EDF5', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: '#5C6B84', marginBottom: 12 }}>{item.desc}</div>
                <Badge variant={item.sV}>{item.status}</Badge>
              </Panel>
            ))}
          </div>
        </>
      )}

      {showWorkerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingWorkerId === null ? 'Add Sponsored Worker' : 'Edit Sponsored Worker'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Worker Name" value={workerForm.name} onChange={(v) => setWorkerForm({ ...workerForm, name: v })} placeholder="Full name" />
              <FormInput label="Role / SOC Code" value={workerForm.role} onChange={(v) => setWorkerForm({ ...workerForm, role: v })} placeholder="Community Worker / 3229" />
              <FormInput label="CoS Reference" value={workerForm.cos} onChange={(v) => setWorkerForm({ ...workerForm, cos: v })} placeholder="Certificate reference" />
              <FormInput label="Start Date" value={workerForm.startDate} onChange={(v) => setWorkerForm({ ...workerForm, startDate: v })} placeholder="DD/MM/YYYY" />
              <FormInput label="Visa Expiry" value={workerForm.visaExpiry} onChange={(v) => setWorkerForm({ ...workerForm, visaExpiry: v })} placeholder="DD/MM/YYYY" />
              <FormInput label="RTW Status" as="select" value={workerForm.rtw} onChange={(v) => setWorkerForm({ ...workerForm, rtw: v })}>
                <option value="Valid">Valid</option>
                <option value="Due Soon">Due Soon</option>
                <option value="Expired">Expired</option>
              </FormInput>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowWorkerForm(false); setEditingWorkerId(null); setWorkerForm(EMPTY_WORKER) }}>Cancel</Button>
              <Button fullWidth onClick={saveWorker}>Save Worker</Button>
            </div>
          </div>
        </div>
      )}

      {showCosForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>
              {editingCosId === null ? 'Assign CoS' : 'Edit CoS Record'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="CoS Reference" value={cosForm.cosRef} onChange={(v) => setCosForm({ ...cosForm, cosRef: v })} placeholder="Certificate reference" />
              <FormInput label="Assigned To" value={cosForm.worker} onChange={(v) => setCosForm({ ...cosForm, worker: v })} placeholder="Worker name" />
              <FormInput label="Type" as="select" value={cosForm.type} onChange={(v) => setCosForm({ ...cosForm, type: v })}>
                <option value="Defined">Defined</option>
                <option value="Undefined">Undefined</option>
              </FormInput>
              <FormInput label="Issued" value={cosForm.issued} onChange={(v) => setCosForm({ ...cosForm, issued: v })} placeholder="DD/MM/YYYY" />
              <FormInput label="Status" as="select" value={cosForm.status} onChange={(v) => setCosForm({ ...cosForm, status: v })}>
                <option value="Available">Available</option>
                <option value="Used">Used</option>
                <option value="Reserved">Reserved</option>
              </FormInput>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowCosForm(false); setEditingCosId(null); setCosForm(EMPTY_COS) }}>Cancel</Button>
              <Button fullWidth onClick={saveCos}>Save CoS</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
