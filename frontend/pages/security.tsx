import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = '2fa' | 'sessions' | 'encryption' | 'audit'

const SESSIONS = [
  { device: 'Chrome / Windows 11', location: 'Manchester, UK', ip: '82.44.12.100', last: 'Now', current: true },
  { device: 'Safari / iPhone 15', location: 'Manchester, UK', ip: '82.44.12.101', last: '2h ago', current: false },
  { device: 'Chrome / MacBook Pro', location: 'London, UK', ip: '188.28.90.44', last: '3d ago', current: false },
]

const AUDIT_LOG = [
  { ts: '15 Mar 15:42', user: 'D. Ogbuagu', action: 'Login', resource: 'Dashboard', ip: '82.44.12.100', result: 'Success' },
  { ts: '15 Mar 14:20', user: 'D. Ogbuagu', action: 'Approve Expense', resource: 'EXP-0248', ip: '82.44.12.100', result: 'Success' },
  { ts: '14 Mar 09:15', user: 'A. Ibrahim', action: 'Login', resource: 'Dashboard', ip: '82.44.15.200', result: 'Success' },
  { ts: '13 Mar 17:31', user: 'Unknown', action: 'Login Attempt', resource: 'Auth', ip: '45.88.15.33', result: 'Failed' },
  { ts: '12 Mar 11:00', user: 'D. Ogbuagu', action: 'Run Payroll', resource: 'PAY-0023', ip: '82.44.12.100', result: 'Success' },
]

export default function Security() {
  const [tab, setTab] = useState<Tab>('2fa')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)

  return (
    <AppLayout
      title="Security & 2FA"
      subtitle="Security Centre"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export Audit Log</Button>
          <Button>🔑 Change Password</Button>
        </div>
      }
    >
      <Alert variant="gold" icon="🔒">
        <strong>Security Centre:</strong> Manage 2FA, active sessions, data encryption, audit trails, and compliance certifications.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="2FA Status" value={twoFAEnabled ? 'Enabled' : 'Disabled'} change={twoFAEnabled ? 'TOTP active' : 'Recommended'} changeUp={twoFAEnabled} icon="🔐" accentColor={twoFAEnabled ? '#2DCE89' : '#F5365C'} iconBg={twoFAEnabled ? 'rgba(45,206,137,0.12)' : 'rgba(245,54,92,0.12)'} />
        <StatCard label="Active Sessions" value="3" change="1 current · 2 other" icon="◉" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Failed Logins" value="1" change="Last 30 days · 1 IP" changeUp={false} icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Data Encryption" value="AES-256" change="At rest + in transit" icon="🔒" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {([
          { key: '2fa', label: 'Two-Factor Auth' },
          { key: 'sessions', label: 'Active Sessions' },
          { key: 'encryption', label: 'Encryption Status' },
          { key: 'audit', label: 'Security Audit Log' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === '2fa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
          <Panel title="Two-Factor Authentication" titleIcon="🔐" iconColor="#C9A84C">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '12px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: twoFAEnabled ? 'rgba(45,206,137,0.12)' : 'rgba(245,54,92,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
              }}>
                {twoFAEnabled ? '🔐' : '🔓'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: twoFAEnabled ? '#2DCE89' : '#F5365C', marginBottom: 6 }}>
                  2FA is {twoFAEnabled ? 'enabled' : 'disabled'}
                </div>
                <div style={{ fontSize: 12, color: '#5C6B84', lineHeight: 1.6, marginBottom: 14 }}>
                  {twoFAEnabled
                    ? 'Your account is protected with TOTP (Time-based One-Time Password) two-factor authentication.'
                    : 'Enable two-factor authentication to add an extra layer of security. We recommend using an authenticator app (Google Authenticator, Authy).'}
                </div>
                <Button onClick={() => setTwoFAEnabled(!twoFAEnabled)} variant={twoFAEnabled ? 'ghost' : 'default'}>
                  {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA with Authenticator'}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Security Score" titleIcon="◎" iconColor="#5E9EFF">
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 56, color: twoFAEnabled ? '#2DCE89' : '#FB8C00', textAlign: 'center', letterSpacing: '-0.03em', margin: '12px 0 4px' }}>
              {twoFAEnabled ? '90' : '70'}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#5C6B84', marginBottom: 16 }}>Security score / 100</div>
            {[
              { item: 'Strong password set', ok: true },
              { item: 'Two-factor authentication', ok: twoFAEnabled },
              { item: 'Active sessions < 5', ok: true },
              { item: 'No failed logins (30d)', ok: false },
            ].map(row => (
              <div key={row.item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                <span style={{ color: row.ok ? '#2DCE89' : '#F5365C' }}>{row.ok ? '✓' : '✗'}</span>
                <span style={{ color: row.ok ? '#7A8BA8' : '#C8D3E8' }}>{row.item}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === 'sessions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Active Sessions</div>
            <Button variant="ghost" style={{ color: '#F5365C', borderColor: 'rgba(245,54,92,0.3)' }}>Revoke All Other Sessions</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'device', header: 'Device', render: r => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.device}</span>
                    {r.current && <Badge variant="green">Current</Badge>}
                  </div>
                )},
                { key: 'location', header: 'Location' },
                { key: 'ip', header: 'IP Address', mono: true },
                { key: 'last', header: 'Last Active' },
                { key: 'actions', header: '', render: (r) => !r.current
                  ? <Button small variant="ghost" style={{ color: '#F5365C' }}>Revoke</Button>
                  : <span style={{ fontSize: 11, color: '#5C6B84' }}>—</span>
                },
              ]}
              data={SESSIONS}
            />
          </Panel>
        </>
      )}

      {tab === 'encryption' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { title: 'Data at Rest', icon: '💾', status: 'AES-256 Encrypted', desc: 'All database storage encrypted via Supabase / PostgreSQL native encryption.', ok: true },
            { title: 'Data in Transit', icon: '🔄', status: 'TLS 1.3', desc: 'All API traffic encrypted with TLS 1.3. HTTP → HTTPS redirect enforced.', ok: true },
            { title: 'Password Storage', icon: '🔑', status: 'bcrypt', desc: 'Passwords hashed with bcrypt (cost factor 12). Never stored in plain text.', ok: true },
            { title: 'API Keys', icon: '🗝️', status: 'Vault Protected', desc: 'All API keys stored in environment variables, never in codebase.', ok: true },
            { title: 'Database Backups', icon: '📦', status: 'Daily Encrypted', desc: 'Automated daily backups retained for 30 days, encrypted at rest.', ok: true },
            { title: 'Audit Logging', icon: '📋', status: 'Immutable Log', desc: 'All user actions logged immutably via Supabase audit trail.', ok: true },
          ].map(item => (
            <Panel key={item.title}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EDF5', marginBottom: 4 }}>{item.title}</div>
              <div style={{ marginBottom: 10 }}><Badge variant={item.ok ? 'green' : 'red'}>{item.status}</Badge></div>
              <div style={{ fontSize: 11.5, color: '#5C6B84', lineHeight: 1.6 }}>{item.desc}</div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Security Audit Log</div>
            <Button variant="ghost">↓ Export</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ts', header: 'Timestamp', mono: true },
                { key: 'user', header: 'User' },
                { key: 'action', header: 'Action', render: r => <span style={{ fontWeight: 500, color: '#C8D3E8' }}>{r.action}</span> },
                { key: 'resource', header: 'Resource', mono: true },
                { key: 'ip', header: 'IP Address', mono: true },
                { key: 'result', header: 'Result', render: r => <Badge variant={r.result === 'Success' ? 'green' : 'red'}>{r.result}</Badge> },
              ]}
              data={AUDIT_LOG}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
