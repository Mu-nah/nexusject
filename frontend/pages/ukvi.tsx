import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = 'licence' | 'workers' | 'cos' | 'duties' | 'audit'

export default function UKVI() {
  const [tab, setTab] = useState<Tab>('licence')

  return (
    <AppLayout
      title="UKVI & Sponsorship"
      subtitle="Sponsor Licence Management"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export Pack</Button>
          <Button>Generate Audit Pack</Button>
        </div>
      }
    >
      <Alert variant="error" icon="⚠">
        <strong>UKVI SPONSOR LICENCE:</strong> ~2,000 licences revoked in 2024–25. Compliance visits with as little as 48 hours notice. Maintain audit-readiness at all times.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Licence Status" value="Active" change="A-rated sponsor" icon="◎" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Sponsored Workers" value="1" change="Kwame Okafor" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="CoS Available" value="5" change="Annual allocation" icon="≡" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Reporting Duties" value="2" change="Actions overdue" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: 'licence', label: 'Sponsor Licence' },
          { key: 'workers', label: 'Sponsored Workers' },
          { key: 'cos', label: 'CoS Register' },
          { key: 'duties', label: 'Reporting Duties' },
          { key: 'audit', label: 'Audit Pack' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'licence' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Panel title="Licence Details" titleIcon="◎" iconColor="#2DCE89">
              {[
                { label: 'Organisation', value: 'Harvest Touch CIC' },
                { label: 'Licence Number', value: 'SHL/2022/0001234' },
                { label: 'Rating', value: 'A-Rating' },
                { label: 'Issue Date', value: '01 Jun 2022' },
                { label: 'Expiry Date', value: '31 May 2027' },
                { label: 'Licence Type', value: 'Worker' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                  <span style={{ color: '#5C6B84' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{row.value}</span>
                </div>
              ))}
            </Panel>

            <Panel title="Compliance Checklist" titleIcon="✓" iconColor="#C9A84C">
              {[
                { item: 'Level 1 / Level 2 users appointed', ok: true },
                { item: 'Authorising Officer designated', ok: true },
                { item: 'HR systems capable of monitoring', ok: true },
                { item: 'Absence monitoring in place', ok: true },
                { item: 'Right to Work checks — all staff', ok: false },
                { item: 'Sponsored worker records up to date', ok: true },
                { item: 'Annual Confirmation of Accuracy', ok: false },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 12 }}>
                  <span style={{ color: row.ok ? '#2DCE89' : '#F5365C' }}>{row.ok ? '✓' : '✗'}</span>
                  <span style={{ color: row.ok ? '#7A8BA8' : '#C8D3E8' }}>{row.item}</span>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}

      {tab === 'workers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Sponsored Worker Register</div>
            <Button>+ Add Sponsored Worker</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'role', header: 'Role / SOC Code' },
                { key: 'cos', header: 'CoS Ref', mono: true },
                { key: 'startDate', header: 'Start Date' },
                { key: 'visaExpiry', header: 'Visa Expiry' },
                { key: 'rtw', header: 'RTW', render: r => <Badge variant={r.rtwV as any}>{r.rtw}</Badge> },
                { key: 'status', header: 'Status', render: r => <Badge variant="green">{r.status}</Badge> },
              ]}
              data={[
                { name: 'Kwame Okafor', role: 'Community Worker / 3229', cos: 'CoS-2023-0041', startDate: '01 Jun 2023', visaExpiry: '31 Dec 2026', rtw: 'Due Soon', rtwV: 'amber', status: 'Active' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'cos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Certificate of Sponsorship (CoS) Register</div>
            <Button>+ Assign CoS</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'cosRef', header: 'CoS Reference', mono: true },
                { key: 'worker', header: 'Assigned To' },
                { key: 'type', header: 'Type', render: r => <Badge variant="blue">{r.type}</Badge> },
                { key: 'issued', header: 'Issued' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
              ]}
              data={[
                { cosRef: 'CoS-2023-0041', worker: 'Kwame Okafor', type: 'Defined', issued: '15 May 2023', status: 'Used', sV: 'green' },
                { cosRef: 'CoS-2024-0012', worker: 'Unassigned', type: 'Undefined', issued: '—', status: 'Available', sV: 'slate' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'duties' && (
        <>
          <Alert variant="error" icon="⚠">
            <strong>REPORTING DUTIES:</strong> Worker changes within <strong>10 working days</strong>. Organisational changes within <strong>20 working days</strong>. Unauthorised absences of 10+ consecutive days must be reported. Penalties: licence suspension or revocation.
          </Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'duty', header: 'Reporting Duty', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.duty}</span> },
                { key: 'trigger', header: 'Trigger Event' },
                { key: 'deadline', header: 'Deadline' },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.sV as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Overdue' || r.status === 'Due' ? <Button small>Report Now</Button> : <Button small variant="ghost">View</Button> },
              ]}
              data={[
                { duty: 'RTW Check Renewal', trigger: 'J. Musa BRP expired', deadline: 'Immediate', status: 'Overdue', sV: 'red' },
                { duty: 'Absence Report', trigger: 'K. Okafor — 11 consecutive days', deadline: 'Within 10 working days', status: 'Due', sV: 'amber' },
                { duty: 'Annual Confirmation of Accuracy', trigger: 'Annual requirement', deadline: 'Jun 2025', status: 'Upcoming', sV: 'slate' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'audit' && (
        <>
          <div style={{
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 10, padding: 16, marginBottom: 18, fontSize: 12.5, color: '#C8D3E8', lineHeight: 1.7,
          }}>
            ⚡ UKVI compliance visits can occur with as little as 48 hours notice. This generator produces a complete sponsor documentation dossier on demand.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <Button>Generate Audit Pack</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { title: 'Sponsor Licence', desc: 'Licence certificate, conditions, rating history', icon: '📄', status: 'Ready', sV: 'green' },
              { title: 'Sponsored Workers', desc: 'CoS records, visa copies, RTW evidence', icon: '👥', status: 'Action Needed', sV: 'red' },
              { title: 'Reporting Log', desc: 'All SMS reports submitted to UKVI', icon: '📋', status: 'Ready', sV: 'green' },
              { title: 'HR Policies', desc: 'Recruitment, monitoring, absence policies', icon: '📑', status: 'Ready', sV: 'green' },
              { title: 'Payroll Evidence', desc: 'Payslips matching CoS salary levels', icon: '💷', status: 'Ready', sV: 'green' },
              { title: 'Absence Records', desc: 'Attendance monitoring records', icon: '📅', status: 'Incomplete', sV: 'amber' },
            ].map(item => (
              <Panel key={item.title}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EDF5', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: '#5C6B84', marginBottom: 12 }}>{item.desc}</div>
                <Badge variant={item.sV as any}>{item.status}</Badge>
              </Panel>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  )
}
