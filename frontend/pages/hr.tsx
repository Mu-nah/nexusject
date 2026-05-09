import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'employees' | 'onboarding' | 'contracts' | 'rtw' | 'dbs' | 'leave' | 'performance'

const INITIAL_EMPLOYEES = [
  { name: 'Dominic Ogbuagu', role: 'CFO / Director', dept: 'Core Ops', type: 'FT', status: 'Active', rtw: 'Valid', dbs: 'Enhanced' },
  { name: 'Aisha Ibrahim', role: 'Programme Manager', dept: 'Youth Connect', type: 'FT', status: 'Active', rtw: 'Valid', dbs: 'Enhanced' },
  { name: 'Kwame Okafor', role: 'Community Worker', dept: 'Skills Hub', type: 'PT', status: 'Active', rtw: 'Due Soon', dbs: 'Enhanced' },
  { name: 'Jamilu Musa', role: 'Finance Assistant', dept: 'Core Ops', type: 'PT', status: 'Active', rtw: 'Expired', dbs: 'Basic' },
]

const INITIAL_RTW = [
  { name: 'Dominic Ogbuagu', docType: 'British Passport', checked: '01 Sep 2022', expires: 'N/A', status: 'Valid', sV: 'green' },
  { name: 'Aisha Ibrahim', docType: 'British Passport', checked: '01 Mar 2023', expires: 'N/A', status: 'Valid', sV: 'green' },
  { name: 'Kwame Okafor', docType: 'BRP Card', checked: '01 Jun 2023', expires: '31 Dec 2026', status: 'Due Soon', sV: 'amber' },
  { name: 'Jamilu Musa', docType: 'BRP Card', checked: '01 Jan 2023', expires: '01 Jan 2025', status: 'Expired', sV: 'red' },
]

const INITIAL_LEAVE = [
  { name: 'Kwame Okafor', type: 'Annual Leave', from: '28 Apr', to: '02 May', days: '5', status: 'Pending', sV: 'amber' },
  { name: 'Aisha Ibrahim', type: 'Annual Leave', from: '14 Apr', to: '17 Apr', days: '4', status: 'Approved', sV: 'green' },
]

const INITIAL_REVIEWS = [
  { name: 'Aisha Ibrahim', reviewer: 'D. Ogbuagu', type: 'Quarterly', due: '30 Apr 2025', status: 'Scheduled', sV: 'blue' },
  { name: 'Kwame Okafor', reviewer: 'A. Ibrahim', type: 'Probation', due: '15 May 2025', status: 'Scheduled', sV: 'blue' },
  { name: 'Jamilu Musa', reviewer: 'D. Ogbuagu', type: 'Annual', due: '01 Feb 2025', status: 'Completed', sV: 'green' },
]

const INITIAL_CONTRACTS = [
  { name: 'Dominic Ogbuagu', docType: 'Employment Contract', issued: '01 Apr 2022', expires: 'Permanent', status: 'Active', sV: 'green' },
  { name: 'Aisha Ibrahim', docType: 'Employment Contract', issued: '01 Mar 2023', expires: 'Permanent', status: 'Active', sV: 'green' },
  { name: 'Kwame Okafor', docType: 'Fixed Term Contract', issued: '01 Jun 2023', expires: '31 May 2025', status: 'Due', sV: 'amber' },
]

export default function HR() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('employees')
  const [employees] = useState(INITIAL_EMPLOYEES)
  const [rtwRows, setRtwRows] = useState(INITIAL_RTW)
  const [leaveRows, setLeaveRows] = useState(INITIAL_LEAVE)
  const [reviewRows, setReviewRows] = useState(INITIAL_REVIEWS)
  const [contractRows, setContractRows] = useState(INITIAL_CONTRACTS)
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [onboardingCount, setOnboardingCount] = useState(0)
  const [reviewName, setReviewName] = useState('')
  const [docName, setDocName] = useState('')

  const exportEmployees = () => downloadCsvFile('hr-employees.csv', employees)

  const expiredCount = useMemo(() => rtwRows.filter((row) => row.status === 'Expired').length, [rtwRows])
  const dueSoonDbs = 2

  const approveLeave = (name: string) => {
    setLeaveRows((current) =>
      current.map((row) => (row.name === name ? { ...row, status: 'Approved', sV: 'green' } : row))
    )
    toast.success(`Leave approved for ${name}`)
  }

  const renewRtw = (name: string) => {
    setRtwRows((current) =>
      current.map((row) =>
        row.name === name ? { ...row, checked: new Date().toLocaleDateString('en-GB'), expires: '31 Dec 2026', status: 'Valid', sV: 'green' } : row
      )
    )
    toast.success(`Right to Work renewed for ${name}`)
  }

  const startOnboarding = () => {
    setOnboardingCount((count) => count + 1)
    toast.success('New onboarding workflow started')
  }

  const scheduleReview = () => {
    if (!reviewName.trim()) {
      toast.error('Enter an employee name first')
      return
    }
    setReviewRows((current) => [
      { name: reviewName.trim(), reviewer: 'Workspace Admin', type: 'Quarterly', due: '30 Jun 2026', status: 'Scheduled', sV: 'blue' },
      ...current,
    ])
    setReviewName('')
    toast.success('Performance review scheduled')
  }

  const uploadDocument = () => {
    if (!docName.trim()) {
      toast.error('Enter a document title first')
      return
    }
    setContractRows((current) => [
      { name: 'General HR File', docType: docName.trim(), issued: new Date().toLocaleDateString('en-GB'), expires: 'Open', status: 'Active', sV: 'green' },
      ...current,
    ])
    setDocName('')
    toast.success('Document added to HR records')
  }

  return (
    <AppLayout
      title="HR Management"
      subtitle="People & Workforce"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={exportEmployees}>↓ Export</Button>
          <Button onClick={() => router.push('/payroll/new-employee')}>+ Add Employee</Button>
        </div>
      }
    >
      <Alert variant="warning" icon="⚠">
        <strong>RTW Check Required:</strong> J. Musa's Right to Work document has expired. Legal obligation — employment must be paused or document renewed immediately.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Headcount" value="12" change="8 FT · 4 PT" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="RTW Expired" value={expiredCount} change="Immediate action required" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="DBS Renewals Due" value={dueSoonDbs} change="Within 90 days" icon="◎" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Open Vacancies" value="2" change="Skills Hub + Outreach" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'employees', label: 'All Employees' },
          { key: 'onboarding', label: 'Onboarding' },
          { key: 'contracts', label: 'Contracts' },
          { key: 'rtw', label: 'Right to Work' },
          { key: 'dbs', label: 'DBS Checks' },
          { key: 'leave', label: 'Leave' },
          { key: 'performance', label: 'Performance' },
        ] as { key: Tab; label: string }[]).map((section) => (
          <button key={section.key} onClick={() => setTab(section.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === section.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === section.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === section.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{section.label}</button>
        ))}
      </div>

      {tab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEmployee ? '1.45fr 0.8fr' : '1fr', gap: 14 }}>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'role', header: 'Role' },
                { key: 'dept', header: 'Department', render: (row) => <Badge variant="slate">{row.dept}</Badge> },
                { key: 'type', header: 'Type', render: (row) => <Badge variant={row.type === 'FT' ? 'blue' : 'slate'}>{row.type}</Badge> },
                { key: 'rtw', header: 'RTW', render: (row) => <Badge variant={row.rtw === 'Valid' ? 'green' : row.rtw === 'Due Soon' ? 'amber' : 'red'}>{row.rtw}</Badge> },
                { key: 'dbs', header: 'DBS', render: (row) => <Badge variant={row.dbs === 'Enhanced' ? 'blue' : 'slate'}>{row.dbs}</Badge> },
                { key: 'actions', header: '', render: (row) => <Button small variant="ghost" onClick={() => setSelectedEmployee(row)}>View</Button> },
              ]}
              data={employees}
            />
          </Panel>

          {selectedEmployee && (
            <Panel title="Employee Snapshot" titleIcon="⊞" iconColor="#C9A84C">
              <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EDF5', marginBottom: 10 }}>{selectedEmployee.name}</div>
              <div style={{ display: 'grid', gap: 10, fontSize: 12.5 }}>
                <div style={{ color: '#7A8BA8' }}>Role: <span style={{ color: '#E8EDF5' }}>{selectedEmployee.role}</span></div>
                <div style={{ color: '#7A8BA8' }}>Department: <span style={{ color: '#E8EDF5' }}>{selectedEmployee.dept}</span></div>
                <div style={{ color: '#7A8BA8' }}>Employment Type: <span style={{ color: '#E8EDF5' }}>{selectedEmployee.type}</span></div>
                <div style={{ color: '#7A8BA8' }}>RTW Status: <span style={{ color: '#E8EDF5' }}>{selectedEmployee.rtw}</span></div>
                <div style={{ color: '#7A8BA8' }}>DBS Level: <span style={{ color: '#E8EDF5' }}>{selectedEmployee.dbs}</span></div>
              </div>
              <Button variant="ghost" fullWidth style={{ marginTop: 14 }} onClick={() => setSelectedEmployee(null)}>Close</Button>
            </Panel>
          )}
        </div>
      )}

      {tab === 'onboarding' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Onboarding Workflows</div>
            <Button onClick={startOnboarding}>+ Start Onboarding</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            <Panel title="Active Onboarding" titleIcon="⊞" iconColor="#C9A84C">
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#5C6B84', fontSize: 12.5 }}>
                {onboardingCount === 0 ? 'No active onboarding workflows.' : `${onboardingCount} onboarding workflow${onboardingCount > 1 ? 's' : ''} active.`}
              </div>
            </Panel>
            <Panel title="Onboarding Checklist" titleIcon="✓" iconColor="#2DCE89">
              {['Offer letter signed', 'Contract issued', 'Right to Work check', 'DBS check initiated', 'Bank details collected', 'IT equipment ordered', 'Induction scheduled', 'Payroll added'].map((item, index) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: index < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 12 }}>
                  <span style={{ color: '#2DCE89' }}>✓</span>
                  <span style={{ color: '#7A8BA8' }}>{item}</span>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}

      {tab === 'rtw' && (
        <>
          <Alert variant="error" icon="⚠">
            <strong>CRIMINAL LIABILITY:</strong> RTW checks required before employment. Penalties from Feb 2024: <strong>£45,000</strong> per worker (first breach) / <strong>£60,000</strong> (repeat).
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'docType', header: 'Document Type' },
                { key: 'checked', header: 'Last Checked' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.sV as any}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => row.status === 'Expired' ? <Button small onClick={() => renewRtw(row.name)}>Renew</Button> : <Button small variant="ghost" onClick={() => setSelectedEmployee({ name: row.name, role: row.docType, dept: 'Compliance Check', type: 'Record', rtw: row.status, dbs: 'N/A' })}>View</Button> },
              ]}
              data={rtwRows}
            />
          </Panel>
        </>
      )}

      {tab === 'dbs' && (
        <>
          <Alert variant="error" icon="⚠">
            <strong>SAFEGUARDING DUTY:</strong> All staff or volunteers working with children require Enhanced DBS + Barred List check.
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'level', header: 'DBS Level', render: (row) => <Badge variant={row.level === 'Enhanced' ? 'blue' : 'slate'}>{row.level}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'renewal', header: 'Next Renewal' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.sV as any}>{row.status}</Badge> },
              ]}
              data={[
                { name: 'Dominic Ogbuagu', level: 'Enhanced', issued: '01 Sep 2022', renewal: 'Sep 2025', status: 'Valid', sV: 'green' },
                { name: 'Aisha Ibrahim', level: 'Enhanced', issued: '01 Mar 2023', renewal: 'Mar 2026', status: 'Valid', sV: 'green' },
                { name: 'Kwame Okafor', level: 'Enhanced', issued: '01 Jun 2022', renewal: 'Jun 2025', status: 'Due Soon', sV: 'amber' },
                { name: 'Jamilu Musa', level: 'Basic', issued: '01 Jan 2023', renewal: 'Jan 2026', status: 'Valid', sV: 'green' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'leave' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            <StatCard label="Annual Leave Requests" value={leaveRows.filter((row) => row.status === 'Pending').length} change="Pending approval" icon="◷" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
            <StatCard label="Sick Days YTD" value="8.5" change="Avg 0.7/employee" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
            <StatCard label="Leave Balance" value="124d" change="Across all staff" icon="≡" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
            <StatCard label="Upcoming Absence" value="3" change="Next 14 days" icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
          </div>
          <Panel title="Leave Requests" titleIcon="◷" iconColor="#C9A84C" noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'type', header: 'Type', render: (row) => <Badge variant="blue">{row.type}</Badge> },
                { key: 'from', header: 'From' },
                { key: 'to', header: 'To' },
                { key: 'days', header: 'Days' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.sV as any}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => row.status === 'Pending' ? <Button small onClick={() => approveLeave(row.name)}>Approve</Button> : <Button small variant="ghost" onClick={() => setSelectedEmployee({ name: row.name, role: row.type, dept: 'Leave Request', type: 'Request', rtw: row.status, dbs: row.days })}>View</Button> },
              ]}
              data={leaveRows}
            />
          </Panel>
        </>
      )}

      {tab === 'performance' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Performance Management</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ minWidth: 220 }}>
                <FormInput value={reviewName} onChange={setReviewName} placeholder="Employee name" />
              </div>
              <Button onClick={scheduleReview}>+ Schedule Review</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'reviewer', header: 'Reviewer' },
                { key: 'type', header: 'Review Type', render: (row) => <Badge variant="slate">{row.type}</Badge> },
                { key: 'due', header: 'Due Date' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.sV as any}>{row.status}</Badge> },
              ]}
              data={reviewRows}
            />
          </Panel>
        </>
      )}

      {tab === 'contracts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Contracts & HR Documents</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ minWidth: 240 }}>
                <FormInput value={docName} onChange={setDocName} placeholder="Document title" />
              </div>
              <Button onClick={uploadDocument}>+ Upload Document</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'docType', header: 'Document Type', render: (row) => <Badge variant="slate">{row.docType}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.sV as any}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => <Button small variant="ghost" onClick={() => setSelectedEmployee({ name: row.name, role: row.docType, dept: 'HR Document', type: 'Document', rtw: row.status, dbs: row.expires })}>↓ View</Button> },
              ]}
              data={contractRows}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
