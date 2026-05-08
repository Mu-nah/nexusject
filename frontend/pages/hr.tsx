import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = 'employees' | 'onboarding' | 'contracts' | 'rtw' | 'dbs' | 'leave' | 'performance'

const EMPLOYEES = [
  { name: 'Dominic Ogbuagu', role: 'CFO / Director', dept: 'Core Ops', type: 'FT', status: 'Active', rtw: 'Valid', dbs: 'Enhanced' },
  { name: 'Aisha Ibrahim', role: 'Programme Manager', dept: 'Youth Connect', type: 'FT', status: 'Active', rtw: 'Valid', dbs: 'Enhanced' },
  { name: 'Kwame Okafor', role: 'Community Worker', dept: 'Skills Hub', type: 'PT', status: 'Active', rtw: 'Due Soon', dbs: 'Enhanced' },
  { name: 'Jamilu Musa', role: 'Finance Assistant', dept: 'Core Ops', type: 'PT', status: 'Active', rtw: 'Expired', dbs: 'Basic' },
]

export default function HR() {
  const [tab, setTab] = useState<Tab>('employees')

  return (
    <AppLayout
      title="HR Management"
      subtitle="People & Workforce"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>+ Add Employee</Button>
        </div>
      }
    >
      <Alert variant="warning" icon="⚠">
        <strong>RTW Check Required:</strong> J. Musa's Right to Work document has expired. Legal obligation — employment must be paused or document renewed immediately.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Headcount" value="12" change="8 FT · 4 PT" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="RTW Expired" value="1" change="Immediate action required" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="DBS Renewals Due" value="2" change="Within 90 days" icon="◎" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Open Vacancies" value="2" change="Skills Hub + Outreach" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'employees', label: 'All Employees' },
          { key: 'onboarding', label: 'Onboarding' },
          { key: 'contracts', label: 'Contracts' },
          { key: 'rtw', label: 'Right to Work' },
          { key: 'dbs', label: 'DBS Checks' },
          { key: 'leave', label: 'Leave' },
          { key: 'performance', label: 'Performance' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'employees' && (
        <Panel noPadding>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
              { key: 'role', header: 'Role' },
              { key: 'dept', header: 'Department', render: r => <Badge variant="slate">{r.dept}</Badge> },
              { key: 'type', header: 'Type', render: r => <Badge variant={r.type === 'FT' ? 'blue' : 'slate'}>{r.type}</Badge> },
              { key: 'rtw', header: 'RTW', render: r => <Badge variant={r.rtw === 'Valid' ? 'green' : r.rtw === 'Due Soon' ? 'amber' : 'red'}>{r.rtw}</Badge> },
              { key: 'dbs', header: 'DBS', render: r => <Badge variant={r.dbs === 'Enhanced' ? 'blue' : 'slate'}>{r.dbs}</Badge> },
              { key: 'actions', header: '', render: () => <Button small variant="ghost">View</Button> },
            ]}
            data={EMPLOYEES}
          />
        </Panel>
      )}

      {tab === 'onboarding' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Onboarding Workflows</div>
            <Button>+ Start Onboarding</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            <Panel title="Active Onboarding" titleIcon="⊞" iconColor="#C9A84C">
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#5C6B84', fontSize: 12.5 }}>
                No active onboarding workflows. Click + Start Onboarding to begin.
              </div>
            </Panel>
            <Panel title="Onboarding Checklist" titleIcon="✓" iconColor="#2DCE89">
              {['Offer letter signed', 'Contract issued', 'Right to Work check', 'DBS check initiated', 'Bank details collected', 'IT equipment ordered', 'Induction scheduled', 'Payroll added'].map((item, i) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 12 }}>
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
            <strong>CRIMINAL LIABILITY:</strong> RTW checks required before employment. Penalties from Feb 2024: <strong>£45,000</strong> per worker (first breach) / <strong>£60,000</strong> (repeat). From 31 Dec 2026: BRP cards invalid — eVisa share codes only.
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'docType', header: 'Document Type' },
                { key: 'checked', header: 'Last Checked' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Expired' ? <Button small>Renew</Button> : <Button small variant="ghost">View</Button> },
              ]}
              data={[
                { name: 'Dominic Ogbuagu', docType: 'British Passport', checked: '01 Sep 2022', expires: 'N/A', status: 'Valid', sV: 'green' },
                { name: 'Aisha Ibrahim', docType: 'British Passport', checked: '01 Mar 2023', expires: 'N/A', status: 'Valid', sV: 'green' },
                { name: 'Kwame Okafor', docType: 'BRP Card', checked: '01 Jun 2023', expires: '31 Dec 2026', status: 'Due Soon', sV: 'amber' },
                { name: 'Jamilu Musa', docType: 'BRP Card', checked: '01 Jan 2023', expires: '01 Jan 2025', status: 'Expired', sV: 'red' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'dbs' && (
        <>
          <Alert variant="error" icon="⚠">
            <strong>SAFEGUARDING DUTY:</strong> All staff/volunteers working with children require Enhanced DBS + Barred List check (Children Act 1989/2004). Recommended renewal every 3 years.
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'level', header: 'DBS Level', render: r => <Badge variant={r.level === 'Enhanced' ? 'blue' : 'slate'}>{r.level}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'renewal', header: 'Next Renewal' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
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
            <StatCard label="Annual Leave Requests" value="2" change="Pending approval" icon="◷" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
            <StatCard label="Sick Days YTD" value="8.5" change="Avg 0.7/employee" icon="+" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
            <StatCard label="Leave Balance" value="124d" change="Across all staff" icon="≡" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
            <StatCard label="Upcoming Absence" value="3" change="Next 14 days" icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
          </div>
          <Panel title="Leave Requests" titleIcon="◷" iconColor="#C9A84C" noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'type', header: 'Type', render: r => <Badge variant="blue">{r.type}</Badge> },
                { key: 'from', header: 'From' },
                { key: 'to', header: 'To' },
                { key: 'days', header: 'Days' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Pending' ? <Button small>Approve</Button> : <Button small variant="ghost">View</Button> },
              ]}
              data={[
                { name: 'Kwame Okafor', type: 'Annual Leave', from: '28 Apr', to: '02 May', days: '5', status: 'Pending', sV: 'amber' },
                { name: 'Aisha Ibrahim', type: 'Annual Leave', from: '14 Apr', to: '17 Apr', days: '4', status: 'Approved', sV: 'green' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'performance' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Performance Management</div>
            <Button>+ Schedule Review</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'reviewer', header: 'Reviewer' },
                { key: 'type', header: 'Review Type', render: r => <Badge variant="slate">{r.type}</Badge> },
                { key: 'due', header: 'Due Date' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
              ]}
              data={[
                { name: 'Aisha Ibrahim', reviewer: 'D. Ogbuagu', type: 'Quarterly', due: '30 Apr 2025', status: 'Scheduled', sV: 'blue' },
                { name: 'Kwame Okafor', reviewer: 'A. Ibrahim', type: 'Probation', due: '15 May 2025', status: 'Scheduled', sV: 'blue' },
                { name: 'Jamilu Musa', reviewer: 'D. Ogbuagu', type: 'Annual', due: '01 Feb 2025', status: 'Completed', sV: 'green' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'contracts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Contracts & HR Documents</div>
            <Button>+ Upload Document</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Employee', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'docType', header: 'Document Type', render: r => <Badge variant="slate">{r.docType}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'expires', header: 'Expires' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: () => <Button small variant="ghost">↓ View</Button> },
              ]}
              data={[
                { name: 'Dominic Ogbuagu', docType: 'Employment Contract', issued: '01 Apr 2022', expires: 'Permanent', status: 'Active', sV: 'green' },
                { name: 'Aisha Ibrahim', docType: 'Employment Contract', issued: '01 Mar 2023', expires: 'Permanent', status: 'Active', sV: 'green' },
                { name: 'Kwame Okafor', docType: 'Fixed Term Contract', issued: '01 Jun 2023', expires: '31 May 2025', status: 'Due', sV: 'amber' },
              ]}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
