import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, Alert, StatCard, DataTable, FormInput } from '@/components/ui'
import { downloadCsvFile, downloadPageSummary } from '@/lib/export'
import toast from 'react-hot-toast'

const INITIAL_DSARS: Array<{ subject: string; type: string; received: string; deadline: string; status: string; variant: string }> = []

export default function GDPR() {
  const [dsars, setDsars] = useState(INITIAL_DSARS)
  const [subjectName, setSubjectName] = useState('')
  const [subjectType, setSubjectType] = useState('Access Request')

  const exportData = () => {
    downloadPageSummary('gdpr-data-export.txt', 'GDPR & Data Snapshot', [
      `Open DSARs: ${dsars.length}`,
      'ICO registration: Not recorded',
      'Data subjects tracked: Not recorded',
      'Consent rate: Not recorded',
    ])
  }

  const logDsar = () => {
    if (!subjectName.trim()) {
      toast.error('Enter a data subject name first')
      return
    }
    setDsars((current) => [
      { subject: subjectName.trim(), type: subjectType, received: new Date().toLocaleDateString('en-GB'), deadline: '30 days from now', status: 'Open', variant: 'amber' },
      ...current,
    ])
    setSubjectName('')
    toast.success('DSAR logged')
  }

  return (
    <AppLayout
      title="GDPR & Data"
      subtitle="UK GDPR / DPA 2018"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={exportData}>↓ Data Export</Button>
          <Button onClick={logDsar}>+ Log DSAR</Button>
        </div>
      }
    >
      <Alert variant="info" icon="i">
        GDPR controls only reflect records stored in this workspace. Empty values below mean the required evidence has not been captured yet.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="ICO Registration" value="Not recorded" change="Update in workspace records" changeUp={false} icon="LOCK" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Open DSARs" value={dsars.length} change={dsars.length ? '30-day deadline applies' : 'No open requests'} icon="DSAR" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Data Subjects" value="0" change="No tracked register yet" icon="DATA" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Consent Rate" value="Not recorded" change="Add consent evidence to calculate" icon="OK" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <Panel title="Log Data Subject Request" titleIcon="DATA" iconColor="#C9A84C">
          <FormInput label="Data Subject" value={subjectName} onChange={setSubjectName} placeholder="Full name" />
          <FormInput label="Request Type" value={subjectType} onChange={setSubjectType} as="select">
            <option>Access Request</option>
            <option>Erasure Request</option>
            <option>Rectification Request</option>
            <option>Portability Request</option>
          </FormInput>
          <Button fullWidth onClick={logDsar}>Create DSAR</Button>
        </Panel>

        <Panel title="Open DSAR Register" titleIcon="DSAR" iconColor="#5E9EFF" noPadding>
          <DataTable
            columns={[
              { key: 'subject', header: 'Subject', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.subject}</span> },
              { key: 'type', header: 'Type', render: (row) => <Badge variant="slate">{row.type}</Badge> },
              { key: 'received', header: 'Received' },
              { key: 'deadline', header: 'Deadline' },
              { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
            ]}
            data={dsars}
            emptyMessage="No DSARs logged yet"
          />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 18 }}>
        {[
          {
            title: 'ICO Registration',
            icon: 'ICO',
            status: 'Not registered',
            statusColor: '#F5365C',
            desc: 'Store the workspace registration number and renewal evidence once the ICO fee has been paid.',
            action: () => window.open('https://ico.org.uk/for-organisations/data-protection-fee/', '_blank', 'noopener,noreferrer'),
            actionLabel: 'Open ICO Portal',
            actionVariant: 'primary' as const,
          },
          {
            title: 'Consent Management',
            icon: 'CONSENT',
            status: 'Not configured',
            statusColor: '#FB8C00',
            desc: 'Track consent date, lawful basis, withdrawal route, and communication preferences before relying on GDPR metrics.',
            action: () => downloadCsvFile('consent-gap-list.csv', [{ area: 'Marketing consent', status: 'Needed' }, { area: 'Consent date', status: 'Needed' }, { area: 'Withdrawal flow', status: 'Needed' }]),
            actionLabel: 'Export Consent Gap List',
            actionVariant: 'ghost' as const,
          },
          {
            title: 'Data Subject Rights',
            icon: 'RIGHTS',
            status: 'In progress',
            statusColor: '#F5365C',
            desc: 'DSAR workflow, Right to Erasure, and portability controls are being operationalised.',
            action: () => toast.success('Use the DSAR register above to track open requests.'),
            actionLabel: 'Open DSAR Workflow',
            actionVariant: 'ghost' as const,
          },
        ].map((card) => (
          <Panel key={card.title}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: card.statusColor, marginBottom: 6 }}>{card.status}</div>
            <div style={{ fontSize: 11.5, color: '#7A8BA8', marginBottom: 14, lineHeight: 1.6 }}>{card.desc}</div>
            <Button variant={card.actionVariant} small onClick={card.action}>{card.actionLabel}</Button>
          </Panel>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="Data Retention Schedule" titleIcon="KEEP" iconColor="#C9A84C">
          {[
            { category: 'Employee Records', retention: '6 years after leaving', basis: 'Legal obligation' },
            { category: 'Donor Records', retention: '7 years', basis: 'Gift Aid / HMRC' },
            { category: 'Beneficiary Records', retention: '7 years', basis: 'Safeguarding' },
            { category: 'Financial Records', retention: '7 years', basis: 'Companies Act' },
            { category: 'CCTV Footage', retention: '30 days', basis: 'GDPR proportionality' },
            { category: 'Email Correspondence', retention: '3 years', basis: 'Business need' },
          ].map((row) => (
            <div key={row.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
              <div>
                <div style={{ color: '#C8D3E8', fontWeight: 500 }}>{row.category}</div>
                <div style={{ color: '#5C6B84', fontSize: 11 }}>{row.basis}</div>
              </div>
              <Badge variant="slate">{row.retention}</Badge>
            </div>
          ))}
        </Panel>

        <Panel title="GDPR Compliance Roadmap" titleIcon="ROAD" iconColor="#5E9EFF">
          {[
            { phase: 'Phase 1 (Complete)', items: ['Gift Aid consent boolean', 'Row-level security', 'Basic audit logging'], done: true },
            { phase: 'Phase 2 (Month 1)', items: ['ICO registration', 'Consent management UI', 'DSAR workflow (30-day)'], done: false },
            { phase: 'Phase 3 (Month 2)', items: ['Data portability export', 'Right to erasure workflow', 'Privacy notice generator'], done: false },
          ].map((phase) => (
            <div key={phase.phase} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: phase.done ? '#2DCE89' : '#5C6B84', fontSize: 11 }}>{phase.done ? 'OK' : 'TODO'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: phase.done ? '#2DCE89' : '#C8D3E8' }}>{phase.phase}</span>
              </div>
              {phase.items.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 14px', fontSize: 11.5, color: '#5C6B84' }}>
                  <span style={{ color: phase.done ? '#2DCE89' : '#5C6B84' }}>{phase.done ? 'OK' : '-'}</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </Panel>
      </div>
    </AppLayout>
  )
}
