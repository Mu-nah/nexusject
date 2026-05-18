import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = '2fa' | 'sessions' | 'encryption' | 'audit' | 'rbac' | 'sso'

type RBACRole = { id: number; name: string; description: string; permissions: string[]; userCount: number }
type UserRoleAssignment = { id: number; user: string; email: string; role: string; status: 'Active' | 'Suspended'; lastLogin: string }

const RBAC_ROLES: RBACRole[] = [
  { id: 1, name: 'Super Admin', description: 'Full system access including user management and settings', permissions: ['All modules', 'User management', 'Settings', 'Audit log'], userCount: 2 },
  { id: 2, name: 'Finance Manager', description: 'Access to all finance modules including payroll and budgets', permissions: ['Accounting', 'Payroll', 'Expenses', 'Budgets', 'Donations', 'Reports'], userCount: 3 },
  { id: 3, name: 'HR Manager', description: 'People and HR module access including employee records', permissions: ['HR', 'Payroll (view)', 'Sponsorship', 'Rota', 'Volunteers'], userCount: 2 },
  { id: 4, name: 'Programme Manager', description: 'Grants, programmes, and project management access', permissions: ['Grants', 'Programmes', 'Projects', 'Reports (own)'], userCount: 4 },
  { id: 5, name: 'Trustee / Board', description: 'Read-only access to board-level reports and governance', permissions: ['Dashboard (read)', 'Reports (read)', 'Governance', 'Compliance (read)'], userCount: 7 },
  { id: 6, name: 'Staff', description: 'Standard staff access — expenses, rota, and own data', permissions: ['Expenses (own)', 'Rota (view)', 'Dashboard (limited)'], userCount: 12 },
]

const USER_ROLE_ASSIGNMENTS: UserRoleAssignment[] = [
  { id: 1, user: 'M. Okonkwo', email: 'm.okonkwo@org.uk', role: 'Super Admin', status: 'Active', lastLogin: '2026-05-18' },
  { id: 2, user: 'T. Singh', email: 't.singh@org.uk', role: 'Finance Manager', status: 'Active', lastLogin: '2026-05-17' },
  { id: 3, user: 'S. O\'Brien', email: 's.obrien@org.uk', role: 'HR Manager', status: 'Active', lastLogin: '2026-05-16' },
  { id: 4, user: 'P. Patel', email: 'p.patel@org.uk', role: 'Programme Manager', status: 'Active', lastLogin: '2026-05-15' },
  { id: 5, user: 'A. Johnson', email: 'a.johnson@org.uk', role: 'Staff', status: 'Active', lastLogin: '2026-05-14' },
  { id: 6, user: 'J. Carter', email: 'j.carter@org.uk', role: 'Staff', status: 'Suspended', lastLogin: '2026-04-28' },
]

type SSOProvider = 'None' | 'Azure AD' | 'Google Workspace' | 'Okta' | 'SAML 2.0'

const CURRENT_SESSION = { device: 'Current browser session', location: 'Current location', ip: '-', last: 'Now', current: true }

export default function Security() {
  const [tab, setTab] = useState<Tab>('2fa')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [sessions, setSessions] = useState([CURRENT_SESSION])
  const [auditLog, setAuditLog] = useState<Array<{ ts: string; user: string; action: string; resource: string; ip: string; result: string }>>([])
  const [passwordDraft, setPasswordDraft] = useState('')
  const [ssoProvider, setSsoProvider] = useState<SSOProvider>('None')
  const [ssoEntityId, setSsoEntityId] = useState('')
  const [ssoUrl, setSsoUrl] = useState('')
  const [ssoEnabled, setSsoEnabled] = useState(false)

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
          { key: 'rbac', label: 'Role Management' },
          { key: 'sso', label: 'SSO Configuration' },
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
      {tab === 'rbac' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Roles" value={String(RBAC_ROLES.length)} change="defined" accentColor="#C9A84C" />
            <StatCard label="Total Users" value={String(USER_ROLE_ASSIGNMENTS.length)} change="assigned" accentColor="#2DCE89" />
            <StatCard label="Suspended" value={String(USER_ROLE_ASSIGNMENTS.filter(u => u.status === 'Suspended').length)} change="users" accentColor="#F5365C" />
            <StatCard label="Admin Users" value={String(USER_ROLE_ASSIGNMENTS.filter(u => u.role === 'Super Admin').length)} change="super admins" accentColor="#FB8C00" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginBottom: 14 }}>
            <Panel title="Role Definitions" titleIcon="RD" iconColor="#C9A84C" noPadding
              action={<div style={{ padding: '12px 16px 0' }}><Button small onClick={() => toast.success('Add role coming soon')}>+ Add Role</Button></div>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      {['Role', 'Description', 'Permissions', 'Users'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RBAC_ROLES.map(role => (
                      <tr key={role.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)', whiteSpace: 'nowrap' }}>{role.name}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 11.5, minWidth: 160 }}>{role.description}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {role.permissions.slice(0, 3).map(p => <Badge key={p} variant="slate">{p}</Badge>)}
                            {role.permissions.length > 3 && <span style={{ fontSize: 11, color: 'var(--mute)' }}>+{role.permissions.length - 3}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{role.userCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="User Role Assignments" titleIcon="UA" iconColor="#5E9EFF" noPadding
              action={<div style={{ padding: '12px 16px 0' }}><Button small onClick={() => toast.success('Assign role coming soon')}>+ Assign Role</Button></div>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      {['User', 'Role', 'Status', 'Last Login', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {USER_ROLE_ASSIGNMENTS.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--heading)' }}>{u.user}</div>
                          <div style={{ fontSize: 11, color: 'var(--mute)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}><Badge variant="blue">{u.role}</Badge></td>
                        <td style={{ padding: '12px 14px' }}><Badge variant={u.status === 'Active' ? 'green' : 'red'}>{u.status}</Badge></td>
                        <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--mute)' }}>{new Date(u.lastLogin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <Button small variant="ghost" onClick={() => toast.success(`Edit role for ${u.user}`)}>Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'sso' && (
        <>
          <Alert variant={ssoEnabled ? 'info' : 'warning'} icon={ssoEnabled ? 'i' : '!'}>
            {ssoEnabled ? `SSO is active via ${ssoProvider}. Users can sign in with their organisation credentials.` : 'SSO is not configured. Users authenticate with email and password.'}
          </Alert>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginTop: 14 }}>
            <Panel title="SSO Provider" titleIcon="SSO" iconColor="#C9A84C">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 10, fontWeight: 600 }}>Choose Identity Provider</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(['None', 'Azure AD', 'Google Workspace', 'Okta', 'SAML 2.0'] as SSOProvider[]).map(p => (
                    <button key={p} onClick={() => setSsoProvider(p)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${ssoProvider === p ? '#C9A84C' : 'var(--line)'}`, background: ssoProvider === p ? 'rgba(201,168,76,0.1)' : 'var(--surface-muted)', color: ssoProvider === p ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12.5, fontFamily: "'Instrument Sans', sans-serif", fontWeight: ssoProvider === p ? 600 : 400 }}>{p}</button>
                  ))}
                </div>
              </div>

              {ssoProvider !== 'None' && (
                <>
                  <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>
                      {ssoProvider === 'Google Workspace' ? 'Google Domain' : ssoProvider === 'Okta' ? 'Okta Domain' : 'Entity ID / Issuer'}
                    </label>
                    <input value={ssoEntityId} onChange={(e) => setSsoEntityId(e.target.value)}
                      placeholder={ssoProvider === 'Azure AD' ? 'https://sts.windows.net/{tenant-id}/' : ssoProvider === 'Google Workspace' ? 'yourdomain.com' : 'https://your-idp.com/'}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>
                      {ssoProvider === 'Google Workspace' ? 'OAuth2 Redirect URI' : 'SSO Login URL'}
                    </label>
                    <input value={ssoUrl} onChange={(e) => setSsoUrl(e.target.value)}
                      placeholder="https://login.microsoftonline.com/.../saml2"
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
                  </div>
                  <Button fullWidth onClick={() => { setSsoEnabled(true); toast.success(`SSO configured via ${ssoProvider}`) }}>
                    Save & Enable SSO
                  </Button>
                  {ssoEnabled && (
                    <Button fullWidth variant="ghost" onClick={() => { setSsoEnabled(false); setSsoProvider('None'); toast.success('SSO disabled') }} style={{ marginTop: 8 }}>
                      Disable SSO
                    </Button>
                  )}
                </>
              )}
            </Panel>

            <Panel title="Attribute Mapping" titleIcon="AM" iconColor="#5E9EFF">
              <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
                Map your identity provider attributes to Realtouch One user fields. These must match the claims sent in the SAML assertion or JWT.
              </div>
              {[
                { label: 'Email address', idpAttr: 'email / http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' },
                { label: 'Display name', idpAttr: 'name / displayName' },
                { label: 'First name', idpAttr: 'given_name / givenname' },
                { label: 'Last name', idpAttr: 'family_name / surname' },
                { label: 'Role / Groups', idpAttr: 'roles / groups / memberOf' },
              ].map(({ label, idpAttr }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', whiteSpace: 'nowrap' }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{idpAttr}</span>
                </div>
              ))}

              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Service Provider Details</div>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>
                  <div style={{ marginBottom: 3 }}>ACS URL: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>https://app.realtouchone.com/auth/saml/callback</span></div>
                  <div>Entity ID: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>https://app.realtouchone.com</span></div>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </AppLayout>
  )
}
