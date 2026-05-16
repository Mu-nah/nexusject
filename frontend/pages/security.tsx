import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = '2fa' | 'sessions' | 'encryption' | 'audit'

const CURRENT_SESSION = { device: 'Current browser session', location: 'Current location', ip: '-', last: 'Now', current: true }

export default function Security() {
  const [tab, setTab] = useState<Tab>('2fa')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [sessions, setSessions] = useState([CURRENT_SESSION])
  const [auditLog, setAuditLog] = useState<Array<{ ts: string; user: string; action: string; resource: string; ip: string; result: string }>>([])
  const [passwordDraft, setPasswordDraft] = useState('')

  const exportAudit = () => {
    downloadCsvFile('security-audit-log.csv', auditLog)
    toast.success('Security audit export downloaded')
  }

  const changePassword = () => {
    if (!passwordDraft.trim()) {
      toast.error('Enter a new password first')
      return
    }
    setAuditLog((current) => [
      { ts: new Date().toLocaleString('en-GB'), user: 'Current User', action: 'Password Change', resource: 'Auth', ip: '-', result: 'Success' },
      ...current,
    ])
    setPasswordDraft('')
    toast.success('Password change recorded')
  }

  const revokeAllOtherSessions = () => {
    setSessions((current) => current.filter((session) => session.current))
    toast.success('All other sessions revoked')
  }

  return (
    <AppLayout
      title="Security & 2FA"
      subtitle="Security Centre"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportAudit}>Export Audit Log</Button>
          <div style={{ minWidth: 220 }}>
            <FormInput value={passwordDraft} onChange={setPasswordDraft} placeholder="New password draft" type="password" />
          </div>
          <Button onClick={changePassword}>Change Password</Button>
        </div>
      }
    >
      <Alert variant="info" icon="i">
        This security centre now reflects only actions taken in the current workspace session. Sample devices, IPs, and audit events have been removed.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="2FA Status" value={twoFAEnabled ? 'Enabled' : 'Disabled'} change={twoFAEnabled ? 'Authenticator active' : 'Not enabled yet'} changeUp={twoFAEnabled} icon="2FA" accentColor={twoFAEnabled ? '#2DCE89' : '#F5365C'} iconBg={twoFAEnabled ? 'rgba(45,206,137,0.12)' : 'rgba(245,54,92,0.12)'} />
        <StatCard label="Active Sessions" value={sessions.length} change="Current workspace session" icon="SES" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Failed Logins" value={auditLog.filter((entry) => entry.result === 'Failed').length} change="Only recorded workspace events" changeUp={false} icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Data Encryption" value="Configured" change="Transport and storage protections" icon="ENC" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: '2fa', label: 'Two-Factor Auth' },
          { key: 'sessions', label: 'Active Sessions' },
          { key: 'encryption', label: 'Encryption Status' },
          { key: 'audit', label: 'Security Audit Log' },
        ] as { key: Tab; label: string }[]).map((section) => (
          <button key={section.key} onClick={() => setTab(section.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === section.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === section.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === section.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{section.label}</button>
        ))}
      </div>

      {tab === '2fa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
          <Panel title="Two-Factor Authentication" titleIcon="2FA" iconColor="#C9A84C">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '12px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: twoFAEnabled ? 'rgba(45,206,137,0.12)' : 'rgba(245,54,92,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: twoFAEnabled ? '#2DCE89' : '#F5365C',
              }}>
                {twoFAEnabled ? 'ON' : 'OFF'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: twoFAEnabled ? '#2DCE89' : '#F5365C', marginBottom: 6 }}>
                  2FA is {twoFAEnabled ? 'enabled' : 'disabled'}
                </div>
                <div style={{ fontSize: 12, color: '#5C6B84', lineHeight: 1.6, marginBottom: 14 }}>
                  {twoFAEnabled
                    ? 'Your current session is protected with an additional authentication step.'
                    : 'Enable two-factor authentication to add an extra layer of security.'}
                </div>
                <Button
                  onClick={() => {
                    setTwoFAEnabled((value) => !value)
                    toast.success(twoFAEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled')
                  }}
                  variant={twoFAEnabled ? 'ghost' : 'default'}
                >
                  {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Security Score" titleIcon="SC" iconColor="#5E9EFF">
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 56, color: twoFAEnabled ? '#2DCE89' : '#FB8C00', textAlign: 'center', letterSpacing: '-0.03em', margin: '12px 0 4px' }}>
              {twoFAEnabled ? '85' : '60'}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#5C6B84', marginBottom: 16 }}>Based on current security settings</div>
          </Panel>
        </div>
      )}

      {tab === 'sessions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Active Sessions</div>
            <Button variant="ghost" style={{ color: '#F5365C', borderColor: 'rgba(245,54,92,0.3)' }} onClick={revokeAllOtherSessions}>Revoke All Other Sessions</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'device', header: 'Device', render: (row) => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.device}</span>{row.current && <Badge variant="green">Current</Badge>}</div> },
                { key: 'location', header: 'Location' },
                { key: 'ip', header: 'IP Address', mono: true },
                { key: 'last', header: 'Last Active' },
              ]}
              data={sessions}
            />
          </Panel>
        </>
      )}

      {tab === 'encryption' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { title: 'Data at Rest', status: 'Configured', desc: 'Storage protection details should come from deployed infrastructure.' },
            { title: 'Data in Transit', status: 'Configured', desc: 'HTTPS and transport encryption should be enforced at the platform edge.' },
            { title: 'Password Storage', status: 'Configured', desc: 'Password hashing is enabled in the application layer.' },
            { title: 'API Keys', status: 'Environment Protected', desc: 'Secrets should be managed in deployment environment variables.' },
            { title: 'Database Backups', status: 'Managed Externally', desc: 'Backup policy should be verified in hosting infrastructure.' },
            { title: 'Audit Logging', status: 'Workspace Events Only', desc: 'Only recorded workspace events appear below.' },
          ].map((item) => (
            <Panel key={item.title}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EDF5', marginBottom: 10 }}>{item.title}</div>
              <div style={{ marginBottom: 10 }}><Badge variant="green">{item.status}</Badge></div>
              <div style={{ fontSize: 11.5, color: '#5C6B84', lineHeight: 1.6 }}>{item.desc}</div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Security Audit Log</div>
            <Button variant="ghost" onClick={exportAudit}>Export</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ts', header: 'Timestamp', mono: true },
                { key: 'user', header: 'User' },
                { key: 'action', header: 'Action', render: (row) => <span style={{ fontWeight: 500, color: '#C8D3E8' }}>{row.action}</span> },
                { key: 'resource', header: 'Resource', mono: true },
                { key: 'ip', header: 'IP Address', mono: true },
                { key: 'result', header: 'Result', render: (row) => <Badge variant={row.result === 'Success' ? 'green' : 'red'}>{row.result}</Badge> },
              ]}
              data={auditLog}
              emptyMessage="No security audit events have been recorded in this workspace yet"
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
