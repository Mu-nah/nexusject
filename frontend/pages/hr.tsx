import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, EmptyState, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'employees' | 'onboarding' | 'contracts' | 'rtw' | 'dbs' | 'leave' | 'performance'

type EmployeeRow = {
  id: number
  name: string
  role: string
  dept: string
  type: string
  status: string
  rtw: string
  dbs: string
}

type EmployeeForm = {
  full_name: string
  email: string
  role_title: string
  contract_type: string
  gross_salary: string
  start_date: string
}

const EMPTY_EMPLOYEE_FORM: EmployeeForm = {
  full_name: '',
  email: '',
  role_title: '',
  contract_type: 'full_time',
  gross_salary: '',
  start_date: new Date().toISOString().split('T')[0],
}

export default function HR() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('employees')
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null)
  const [reviewName, setReviewName] = useState('')
  const [docName, setDocName] = useState('')
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(EMPTY_EMPLOYEE_FORM)

  const { data, refetch, isLoading, isError, error } = useQuery({
    queryKey: ['hr-workspace'],
    queryFn: api.getHrWorkspace,
    staleTime: 60_000,
  })

  const createEmployee = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: async () => {
      toast.success('Employee added')
      setShowEmployeeForm(false)
      setEmployeeForm(EMPTY_EMPLOYEE_FORM)
      await queryClient.invalidateQueries({ queryKey: ['hr-workspace'] })
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.detail ?? 'Failed to add employee')
    },
  })

  const employees = data?.employees ?? []
  const rtwRows = data?.rtw ?? []
  const dbsRows = data?.dbs ?? []
  const leaveRows = data?.leave ?? []
  const reviewRows = data?.performance ?? []
  const contractRows = data?.contracts ?? []
  const summary = data?.summary
  const errorMessage = (error as any)?.response?.data?.detail || (error as Error | undefined)?.message

  const exportEmployees = () => downloadCsvFile('hr-employees.csv', employees)

  const openEmployeeForm = () => {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM)
    setShowEmployeeForm(true)
  }

  const saveEmployee = () => {
    if (!employeeForm.full_name.trim()) {
      toast.error('Enter an employee name first')
      return
    }
    if (!employeeForm.gross_salary.trim()) {
      toast.error('Enter a salary amount first')
      return
    }

    createEmployee.mutate({
      full_name: employeeForm.full_name.trim(),
      email: employeeForm.email.trim() || undefined,
      role_title: employeeForm.role_title.trim() || undefined,
      contract_type: employeeForm.contract_type,
      gross_salary: Number(employeeForm.gross_salary),
      start_date: employeeForm.start_date ? new Date(employeeForm.start_date).toISOString() : undefined,
    })
  }

  const approveLeave = async (id: number, name: string) => {
    await api.approveHrLeave(id)
    await refetch()
    toast.success(`Leave approved for ${name}`)
  }

  const renewRtw = async (id: number, name: string) => {
    await api.renewHrRtw(id)
    await refetch()
    toast.success(`Right to Work renewed for ${name}`)
  }

  const scheduleReview = async () => {
    if (!reviewName.trim()) {
      toast.error('Enter an employee name first')
      return
    }
    await api.createHrReview({
      name: reviewName.trim(),
      reviewer: 'Workspace Admin',
      review_type: 'Quarterly',
      due: '30 Jun 2026',
      status: 'Scheduled',
    })
    setReviewName('')
    await refetch()
    toast.success('Performance review scheduled')
  }

  const uploadDocument = async () => {
    if (!docName.trim()) {
      toast.error('Enter a document title first')
      return
    }
    await api.createHrContract({
      name: 'General HR File',
      doc_type: docName.trim(),
      issued: new Date().toLocaleDateString('en-GB'),
      expires: 'Open',
      status: 'Active',
    })
    setDocName('')
    await refetch()
    toast.success('Document added to HR records')
  }

  return (
    <AppLayout
      title="HR Management"
      subtitle="People & Workforce"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportEmployees}>Export</Button>
          <Button onClick={openEmployeeForm}>+ Add Employee</Button>
        </div>
      }
    >
      {isError && (
        <Alert variant="error" icon="!">
          <strong>HR records could not load.</strong> {errorMessage || 'The backend may need a restart so the latest HR routes are available.'}
        </Alert>
      )}

      <Alert variant="warning" icon="!">
        <strong>RTW Check Required:</strong> HR records now load from backend workspace tables, so renewals, leave approvals, and review scheduling no longer live in the client bundle.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Headcount" value={String(summary?.headcount ?? 0)} change="Backend workforce register" icon="EMP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="RTW Expired" value={String(summary?.expired_rtw ?? 0)} change="Immediate action required" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="DBS Renewals Due" value={String(summary?.dbs_due ?? 0)} change="Within 90 days" icon="DBS" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Open Vacancies" value={String(summary?.open_vacancies ?? 0)} change="Skills Hub + Outreach" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
      </div>

      {showEmployeeForm && (
        <Panel title="Add Employee" titleIcon="+" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <FormInput label="Full name" value={employeeForm.full_name} onChange={(value) => setEmployeeForm((current) => ({ ...current, full_name: value }))} placeholder="e.g. Sarah Johnson" />
            <FormInput label="Email" value={employeeForm.email} onChange={(value) => setEmployeeForm((current) => ({ ...current, email: value }))} placeholder="sarah@workspace.com" type="email" />
            <FormInput label="Role title" value={employeeForm.role_title} onChange={(value) => setEmployeeForm((current) => ({ ...current, role_title: value }))} placeholder="e.g. Youth Worker" />
            <FormInput label="Contract type" value={employeeForm.contract_type} onChange={(value) => setEmployeeForm((current) => ({ ...current, contract_type: value }))} as="select">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="casual">Casual</option>
              <option value="volunteer">Volunteer</option>
            </FormInput>
            <FormInput label="Gross monthly salary" value={employeeForm.gross_salary} onChange={(value) => setEmployeeForm((current) => ({ ...current, gross_salary: value }))} type="number" placeholder="e.g. 1800" />
            <FormInput label="Start date" value={employeeForm.start_date} onChange={(value) => setEmployeeForm((current) => ({ ...current, start_date: value }))} type="date" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => setShowEmployeeForm(false)}>Cancel</Button>
            <Button onClick={saveEmployee} disabled={createEmployee.isPending}>{createEmployee.isPending ? 'Saving…' : 'Save Employee'}</Button>
          </div>
        </Panel>
      )}

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
          <button
            key={section.key}
            onClick={() => setTab(section.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              background: 'none',
              borderBottom: tab === section.key ? '2px solid #C9A84C' : '2px solid transparent',
              color: tab === section.key ? '#E8C56A' : '#5C6B84',
              fontWeight: tab === section.key ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEmployee ? 'minmax(0, 1.45fr) minmax(260px, 0.8fr)' : '1fr', gap: 14 }}>
          <Panel noPadding>
            {isLoading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#5C6B84', fontSize: 13 }}>Loading HR records...</div>
            ) : employees.length === 0 ? (
              <EmptyState title="No employees yet" description="Add the first employee to populate HR, payroll, right-to-work, and document workflows." />
            ) : (
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                  { key: 'role', header: 'Role' },
                  { key: 'dept', header: 'Department', render: (row) => <Badge variant="slate">{row.dept}</Badge> },
                  { key: 'type', header: 'Type', render: (row) => <Badge variant={row.type === 'FT' ? 'blue' : 'slate'}>{row.type}</Badge> },
                  { key: 'rtw', header: 'RTW', render: (row) => <Badge variant={row.rtw === 'Valid' ? 'green' : row.rtw === 'Due Soon' ? 'amber' : 'red'}>{row.rtw}</Badge> },
                  { key: 'dbs', header: 'DBS', render: (row) => <Badge variant={row.dbs === 'Enhanced' ? 'blue' : 'slate'}>{row.dbs}</Badge> },
                  { key: 'actions', header: '', render: (row) => <Button small variant="ghost" onClick={() => setSelectedEmployee(row as EmployeeRow)}>View</Button> },
                ]}
                data={employees}
              />
            )}
          </Panel>

          {selectedEmployee && (
            <Panel title="Employee Snapshot" titleIcon="EMP" iconColor="#C9A84C">
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Onboarding Workflows</div>
            <Button onClick={openEmployeeForm}>+ Start Onboarding</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, 1fr)', gap: 14 }}>
            <Panel title="Active Onboarding" titleIcon="ON" iconColor="#C9A84C">
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#5C6B84', fontSize: 12.5 }}>
                {summary?.onboarding_count ? `${summary.onboarding_count} onboarding workflows active.` : 'No active onboarding workflows.'}
              </div>
            </Panel>
            <Panel title="Onboarding Checklist" titleIcon="OK" iconColor="#2DCE89">
              {['Offer letter signed', 'Contract issued', 'Right to Work check', 'DBS check initiated', 'Bank details collected', 'IT equipment ordered', 'Induction scheduled', 'Payroll added'].map((item, index) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: index < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 12 }}>
                  <span style={{ color: '#2DCE89' }}>OK</span>
                  <span style={{ color: '#7A8BA8' }}>{item}</span>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}

      {tab === 'rtw' && (
        <>
          <Alert variant="error" icon="!">
            <strong>CRIMINAL LIABILITY:</strong> RTW checks required before employment. Penalties from Feb 2024: <strong>£45,000</strong> per worker (first breach) / <strong>£60,000</strong> (repeat).
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'docType', header: 'Document Type' },
                { key: 'checked', header: 'Last Checked' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Valid' ? 'green' : row.status === 'Due Soon' ? 'amber' : 'red'}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => row.status === 'Expired' ? <Button small onClick={() => renewRtw(row.id, row.name)}>Renew</Button> : <Button small variant="ghost" onClick={() => setSelectedEmployee({ id: row.id, name: row.name, role: row.docType, dept: 'Compliance Check', type: 'Record', status: row.status, rtw: row.status, dbs: 'N/A' })}>View</Button> },
              ]}
              data={rtwRows}
            />
          </Panel>
        </>
      )}

      {tab === 'dbs' && (
        <>
          <Alert variant="error" icon="!">
            <strong>SAFEGUARDING DUTY:</strong> All staff or volunteers working with children require Enhanced DBS + Barred List check.
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'level', header: 'DBS Level', render: (row) => <Badge variant={row.level === 'Enhanced' ? 'blue' : 'slate'}>{row.level}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'renewal', header: 'Next Renewal' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Valid' ? 'green' : 'amber'}>{row.status}</Badge> },
              ]}
              data={dbsRows}
            />
          </Panel>
        </>
      )}

      {tab === 'leave' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Annual Leave Requests" value={String(leaveRows.filter((row: any) => row.status === 'Pending').length)} change="Pending approval" icon="LV" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
            <StatCard label="Sick Days YTD" value="8.5" change="Avg 0.7/employee" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
            <StatCard label="Leave Balance" value="124d" change="Across all staff" icon="BAL" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
            <StatCard label="Upcoming Absence" value="3" change="Next 14 days" icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
          </div>
          <Panel title="Leave Requests" titleIcon="LV" iconColor="#C9A84C" noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'type', header: 'Type', render: (row) => <Badge variant="blue">{row.type}</Badge> },
                { key: 'from', header: 'From' },
                { key: 'to', header: 'To' },
                { key: 'days', header: 'Days' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Approved' ? 'green' : 'amber'}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => row.status === 'Pending' ? <Button small onClick={() => approveLeave(row.id, row.name)}>Approve</Button> : <Button small variant="ghost" onClick={() => setSelectedEmployee({ id: row.id, name: row.name, role: row.type, dept: 'Leave Request', type: 'Request', status: row.status, rtw: row.status, dbs: row.days })}>View</Button> },
              ]}
              data={leaveRows}
            />
          </Panel>
        </>
      )}

      {tab === 'performance' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Performance Management</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'green' : 'blue'}>{row.status}</Badge> },
              ]}
              data={reviewRows}
            />
          </Panel>
        </>
      )}

      {tab === 'contracts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Contracts & HR Documents</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Active' ? 'green' : 'amber'}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => <Button small variant="ghost" onClick={() => setSelectedEmployee({ id: row.id, name: row.name, role: row.docType, dept: 'HR Document', type: 'Document', status: row.status, rtw: row.status, dbs: row.expires })}>View</Button> },
              ]}
              data={contractRows}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
