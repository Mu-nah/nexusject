import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

type Tab = 'workspace' | 'team' | 'access'

const ROLE_OPTIONS = ['viewer', 'programme_manager', 'finance_manager', 'hr_manager', 'compliance_manager', 'cfo', 'admin', 'other']
const LEGAL_TYPES = ['Company', 'Charity / NGO', 'CIC / Nonprofit', 'School / Training Centre', 'Other']
const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN']
const MODULE_OPTIONS = [
  { key: 'finance', label: 'Finance' },
  { key: 'operations', label: 'Operations' },
  { key: 'people_hr', label: 'People & HR' },
  { key: 'compliance', label: 'Compliance & Governance' },
]

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '9px 15px',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 9,
  background: active ? '#C9A84C' : 'var(--surface-muted)',
  color: active ? 'var(--ink-inverse)' : 'var(--mute2)',
  fontWeight: 600,
  fontSize: 12.5,
})

const toggleModule = (current: string[], moduleKey: string) =>
  current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey]

const prettifyRole = (role: string) => (role === 'owner' ? 'admin' : role.replace(/_/g, ' '))

const cleanOptional = (value: string) => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function ModulePicker({
  value,
  onChange,
  disabled,
}: {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--mute2)', marginBottom: 10 }}>Module access</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {MODULE_OPTIONS.map((module) => {
          const active = value.includes(module.key)
          return (
            <button
              key={module.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(toggleModule(value, module.key))}
              style={{
                border: `1px solid ${active ? 'rgba(201,168,76,0.65)' : 'var(--line2)'}`,
                background: active ? 'rgba(201,168,76,0.12)' : 'var(--bg3)',
                color: active ? 'var(--gold2)' : 'var(--mute2)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
              }}
            >
              {module.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('workspace')
  const [workspace, setWorkspace] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [accessMonitor, setAccessMonitor] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)
  const [selectedRoleChoice, setSelectedRoleChoice] = useState('viewer')
  const [selectedCustomRole, setSelectedCustomRole] = useState('')
  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    legal_type: LEGAL_TYPES[0],
    email: '',
    phone: '',
    address: '',
    country: '',
    currency: 'GBP',
    charity_number: '',
    companies_house_number: '',
  })
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    role: 'viewer',
    custom_role: '',
    module_access: ['finance'],
  })

  const load = async () => {
    setLoading(true)
    try {
      const [workspaceRes, usersRes, invitesRes, accessRes] = await Promise.all([
        api.getWorkspace(),
        api.listAdminUsers({ invited_by_me: true }),
        api.listWorkspaceInvites(),
        api.getAccessMonitor(),
      ])
      setWorkspace(workspaceRes)
      setUsers(usersRes)
      setInvites(invitesRes)
      setAccessMonitor(accessRes)
      setWorkspaceForm({
        name: workspaceRes.name || '',
        legal_type: workspaceRes.legal_type || LEGAL_TYPES[0],
        email: workspaceRes.email || '',
        phone: workspaceRes.phone || '',
        address: workspaceRes.address || '',
        country: workspaceRes.country || '',
        currency: workspaceRes.currency || 'GBP',
        charity_number: workspaceRes.charity_number || '',
        companies_house_number: workspaceRes.companies_house_number || '',
      })
      if (!selectedUserId && accessRes?.users?.length) {
        setSelectedUserId(accessRes.users[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => toast.error('Failed to load workspace admin data'))
  }, [])

  const saveWorkspace = async () => {
    setSavingWorkspace(true)
    try {
      await api.updateWorkspace({
        name: workspaceForm.name.trim(),
        legal_type: workspaceForm.legal_type,
        email: cleanOptional(workspaceForm.email),
        phone: cleanOptional(workspaceForm.phone),
        address: cleanOptional(workspaceForm.address),
        country: cleanOptional(workspaceForm.country),
        currency: workspaceForm.currency,
        charity_number: cleanOptional(workspaceForm.charity_number),
        companies_house_number: cleanOptional(workspaceForm.companies_house_number),
      })
      toast.success('Workspace updated')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Workspace update failed')
    } finally {
      setSavingWorkspace(false)
    }
  }

  const inviteRoleValue = inviteForm.role === 'other' ? inviteForm.custom_role : inviteForm.role

  const sendInvite = async () => {
    if (!inviteForm.module_access.length) {
      toast.error('Select at least one module')
      return
    }
    if (!inviteRoleValue.trim()) {
      toast.error('Enter a role')
      return
    }
    setInviteLoading(true)
    try {
      const result = await api.inviteWorkspaceUser({
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: inviteRoleValue,
        module_access: inviteForm.module_access,
      })
      toast.success('Invite sent')
      await navigator.clipboard.writeText(result.invite_link)
      toast.success('Invite link copied')
      setInviteForm({ full_name: '', email: '', role: 'viewer', custom_role: '', module_access: ['finance'] })
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invite failed')
    } finally {
      setInviteLoading(false)
    }
  }

  const updateUserAccess = async (userId: number, patch: { role?: string; is_active?: boolean; module_access?: string[] }) => {
    setSavingUserId(userId)
    try {
      await api.updateWorkspaceUserAccess(userId, patch)
      toast.success('Access updated')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Access update failed')
    } finally {
      setSavingUserId(null)
    }
  }

  const pendingInvites = useMemo(() => invites.filter((invite) => !invite.accepted), [invites])
  const ownerAdminCount = useMemo(() => (accessMonitor?.users || []).filter((entry: any) => ['owner', 'admin'].includes(entry.role)).length, [accessMonitor?.users])
  const myTeamUsers = useMemo(() => users.filter((entry) => entry.id === user?.id || invites.some((invite) => invite.email === entry.email)), [invites, user?.id, users])
  const selectedUser = useMemo(() => (accessMonitor?.users || []).find((entry: any) => entry.id === selectedUserId) || null, [accessMonitor?.users, selectedUserId])
  const selectedModuleCount = selectedUser?.module_access?.length ?? 0

  useEffect(() => {
    if (!selectedUser) return
    const isPreset = ROLE_OPTIONS.includes(selectedUser.role)
    setSelectedRoleChoice(isPreset ? selectedUser.role : 'other')
    setSelectedCustomRole(isPreset ? '' : selectedUser.role)
  }, [selectedUser])

  return (
    <AppLayout
      title="Workspace Admin"
      subtitle="Workspace, team, and access control"
      actions={tab === 'workspace'
        ? <Button onClick={saveWorkspace} disabled={savingWorkspace}>{savingWorkspace ? 'Saving...' : 'Save Workspace'}</Button>
        : tab === 'team'
          ? <Button onClick={sendInvite} disabled={inviteLoading || !inviteForm.full_name || !inviteForm.email}>{inviteLoading ? 'Sending...' : 'Invite User'}</Button>
          : undefined}
    >
      <Alert variant="info" icon="i">
        Invite users into specific modules, monitor login status, and control workspace access from one place.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Workspace Users" value={myTeamUsers.length} change="Users invited through your links" icon="USR" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Invites" value={pendingInvites.length} change="Awaiting acceptance" icon="INV" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Admins" value={ownerAdminCount} change="Privileged access" icon="ADM" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Never Logged In" value={accessMonitor?.summary?.never_logged_in ?? 0} change="Users to follow up" icon="NEW" accentColor="#B388FF" iconBg="rgba(179,136,255,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('workspace')} style={tabButtonStyle(tab === 'workspace')}>Edit Workspace</button>
        <button onClick={() => setTab('team')} style={tabButtonStyle(tab === 'team')}>Team & Invites</button>
        <button onClick={() => setTab('access')} style={tabButtonStyle(tab === 'access')}>Access Monitor</button>
      </div>

      {tab === 'workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)', gap: 16 }}>
          <Panel title="Workspace Details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <FormInput label="Workspace Name" value={workspaceForm.name} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, name: v }))} />
              <FormInput label="Organisation Type" value={workspaceForm.legal_type} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, legal_type: v }))} as="select">
                {LEGAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </FormInput>
              <FormInput label="Email" value={workspaceForm.email} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, email: v }))} type="email" />
              <FormInput label="Phone" value={workspaceForm.phone} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, phone: v }))} />
              <FormInput label="Country" value={workspaceForm.country} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, country: v }))} />
              <FormInput label="Currency" value={workspaceForm.currency} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, currency: v }))} as="select">
                {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </FormInput>
              <FormInput label="Charity Number" value={workspaceForm.charity_number} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, charity_number: v }))} />
              <FormInput label="Companies House No." value={workspaceForm.companies_house_number} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, companies_house_number: v }))} />
            </div>
            <FormInput label="Address" value={workspaceForm.address} onChange={(v) => setWorkspaceForm((prev) => ({ ...prev, address: v }))} as="textarea" />
          </Panel>

          <Panel title="Workspace Snapshot">
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Slug</div>
                <div style={{ fontSize: 13, color: 'var(--heading)' }}>{workspace?.slug || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Status</div>
                <Badge variant={workspace?.is_active ? 'green' : 'red'}>{workspace?.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Created</div>
                <div style={{ fontSize: 13, color: 'var(--heading)' }}>{workspace?.created_at ? new Date(workspace.created_at).toLocaleString('en-GB') : '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Last Updated</div>
                <div style={{ fontSize: 13, color: 'var(--heading)' }}>{workspace?.updated_at ? new Date(workspace.updated_at).toLocaleString('en-GB') : '-'}</div>
              </div>
              <Alert variant="success" icon="ok">
                Changes here update the active workspace profile used across onboarding, reports, and team invites.
              </Alert>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.7fr)', gap: 16 }}>
          <Panel title="Invite a User">
            <FormInput label="Full Name" value={inviteForm.full_name} onChange={(v) => setInviteForm((prev) => ({ ...prev, full_name: v }))} />
            <FormInput label="Email" value={inviteForm.email} onChange={(v) => setInviteForm((prev) => ({ ...prev, email: v }))} type="email" />
            <FormInput label="Role" value={inviteForm.role} onChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))} as="select">
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{prettifyRole(role)}</option>)}
            </FormInput>
            {inviteForm.role === 'other' && (
              <FormInput label="Custom Role" value={inviteForm.custom_role} onChange={(v) => setInviteForm((prev) => ({ ...prev, custom_role: v }))} placeholder="e.g. external_auditor" />
            )}
            <ModulePicker value={inviteForm.module_access} onChange={(module_access) => setInviteForm((prev) => ({ ...prev, module_access }))} disabled={inviteLoading} />
            <Button fullWidth onClick={sendInvite} disabled={inviteLoading || !inviteForm.full_name || !inviteForm.email}>
              {inviteLoading ? 'Sending invite...' : 'Invite to Workspace'}
            </Button>
          </Panel>

          <Panel title="Workspace Team">
            <div style={{ marginBottom: 14, color: 'var(--mute2)', fontSize: 12.5 }}>
              This list shows only you and people who joined through your invite links.
            </div>
            <DataTable
              columns={[
                { key: 'full_name', header: 'Name', render: (row) => <span style={{ fontWeight: 600, color: 'var(--heading)' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant={['owner', 'admin'].includes(row.role) ? 'gold' : 'slate'}>{prettifyRole(row.role)}</Badge> },
                { key: 'modules', header: 'Modules', render: (row) => <span style={{ color: 'var(--mute2)', fontSize: 12 }}>{(row.module_access || []).join(', ') || 'restricted'}</span> },
                { key: 'last_login', header: 'Last Login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleString('en-GB') : 'Never' },
                {
                  key: 'manage',
                  header: '',
                  render: (row) => (
                    <Button
                      small
                      variant="ghost"
                      onClick={() => {
                        setSelectedUserId(row.id)
                        setTab('access')
                      }}
                    >
                      Manage
                    </Button>
                  ),
                },
              ]}
              data={myTeamUsers}
              emptyMessage={loading ? 'Loading team...' : 'No invited team members found'}
            />
          </Panel>

          <Panel title="Pending and Past Invites" style={{ gridColumn: '1 / -1' }}>
            <DataTable
              columns={[
                { key: 'full_name', header: 'Invitee', render: (row) => <span style={{ fontWeight: 600, color: 'var(--heading)' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant="slate">{prettifyRole(row.role)}</Badge> },
                { key: 'modules', header: 'Modules', render: (row) => <span style={{ color: 'var(--mute2)', fontSize: 12 }}>{(row.module_access || []).join(', ') || 'restricted'}</span> },
                { key: 'accepted', header: 'Status', render: (row) => <Badge variant={row.accepted ? 'green' : 'amber'}>{row.accepted ? 'Accepted' : 'Pending'}</Badge> },
                { key: 'created_at', header: 'Sent', render: (row) => new Date(row.created_at).toLocaleString('en-GB') },
              ]}
              data={invites}
              emptyMessage={loading ? 'Loading invites...' : 'No invites sent yet'}
            />
          </Panel>
        </div>
      )}

      {tab === 'access' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <Panel title="Access Overview">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <StatCard label="Active Users" value={accessMonitor?.summary?.active_users ?? 0} change="Accounts enabled" icon="ON" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
              <StatCard label="Admins" value={accessMonitor?.summary?.owners_admins ?? 0} change="Workspace admin access" icon="ADM" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
              <StatCard label="Pending Invites" value={accessMonitor?.summary?.pending_invites ?? 0} change="Access not activated" icon="INV" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
              <StatCard label="Never Logged In" value={accessMonitor?.summary?.never_logged_in ?? 0} change="Needs follow-up" icon="NEW" accentColor="#B388FF" iconBg="rgba(179,136,255,0.12)" />
            </div>
          </Panel>

          {selectedUser && (
            <Panel title="Selected User Controls">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--heading)', fontSize: 18 }}>{selectedUser.full_name}</div>
                    <div style={{ color: 'var(--mute)', fontSize: 12 }}>{selectedUser.email}</div>
                    <div style={{ color: 'var(--mute2)', fontSize: 12, marginTop: 6 }}>
                      Last login: {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString('en-GB') : 'Never'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant={selectedUser.is_active ? 'green' : 'red'}>{selectedUser.is_active ? 'Active' : 'Disabled'}</Badge>
                    <Badge variant={['owner', 'admin'].includes(selectedUser.role) ? 'gold' : 'slate'}>{prettifyRole(selectedUser.role)}</Badge>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <FormInput
                      label="Role"
                      value={selectedRoleChoice}
                      onChange={(value) => {
                        setSelectedRoleChoice(value)
                        if (value !== 'other') {
                          updateUserAccess(selectedUser.id, { role: value })
                        }
                      }}
                      as="select"
                    >
                      {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{prettifyRole(role)}</option>)}
                      {selectedUser.role === 'owner' && <option value="owner">owner</option>}
                    </FormInput>
                    {selectedRoleChoice === 'other' && (
                      <FormInput
                        label="Custom Role"
                        value={selectedCustomRole}
                        onChange={setSelectedCustomRole}
                        placeholder="custom role"
                      />
                    )}
                    {selectedRoleChoice === 'other' && (
                      <Button
                        fullWidth
                        onClick={() => updateUserAccess(selectedUser.id, { role: selectedCustomRole })}
                        disabled={!selectedCustomRole.trim() || savingUserId === selectedUser.id}
                      >
                        Save Custom Role
                      </Button>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 6 }}>Module Summary</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--heading)' }}>{selectedModuleCount}</div>
                        <div style={{ fontSize: 12, color: 'var(--mute2)' }}>enabled modules</div>
                      </div>
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 6 }}>Account State</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: selectedUser.is_active ? '#34d399' : '#f87171' }}>
                          {selectedUser.is_active ? 'Open' : 'Paused'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--mute2)' }}>workspace access</div>
                      </div>
                    </div>
                    <ModulePicker
                      value={selectedUser.module_access || []}
                      onChange={(module_access) => updateUserAccess(selectedUser.id, { module_access })}
                      disabled={savingUserId === selectedUser.id || selectedUser.role === 'owner'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button
                    variant="ghost"
                    onClick={() => updateUserAccess(selectedUser.id, { module_access: [] })}
                    disabled={savingUserId === selectedUser.id || selectedUser.role === 'owner'}
                  >
                    Restrict All Modules
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => updateUserAccess(selectedUser.id, { module_access: ['finance', 'operations', 'people_hr', 'compliance'] })}
                    disabled={savingUserId === selectedUser.id}
                  >
                    Restore Full Module Access
                  </Button>
                  <Button
                    variant={selectedUser.is_active ? 'ghost' : 'primary'}
                    onClick={() => updateUserAccess(selectedUser.id, { is_active: !selectedUser.is_active })}
                    disabled={savingUserId === selectedUser.id || selectedUser.role === 'owner'}
                  >
                    {savingUserId === selectedUser.id ? 'Saving...' : selectedUser.is_active ? 'Suspend User' : 'Reactivate User'}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="User Access Control">
            <div style={{ display: 'grid', gap: 14 }}>
              {(accessMonitor?.users || []).map((row: any) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedUserId(row.id)}
                  style={{
                    border: selectedUserId === row.id ? '1px solid rgba(201,168,76,0.7)' : '1px solid var(--line)',
                    borderRadius: 12,
                    padding: 14,
                    background: selectedUserId === row.id ? 'rgba(201,168,76,0.08)' : 'var(--bg3)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--heading)' }}>{row.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--mute)' }}>{row.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Active' : 'Disabled'}</Badge>
                      <Badge variant={['owner', 'admin'].includes(row.role) ? 'gold' : 'slate'}>{prettifyRole(row.role)}</Badge>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--mute2)' }}>
                    Modules: {(row.module_access || []).join(', ') || 'restricted'}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Invite Access Trail">
            <DataTable
              columns={[
                { key: 'full_name', header: 'Invitee', render: (row) => <span style={{ fontWeight: 600, color: 'var(--heading)' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant="slate">{prettifyRole(row.role)}</Badge> },
                { key: 'modules', header: 'Modules', render: (row) => <span style={{ color: 'var(--mute2)', fontSize: 12 }}>{(row.module_access || []).join(', ') || 'restricted'}</span> },
                { key: 'invited_by_name', header: 'Invited By', render: (row) => row.invited_by_name || '-' },
                { key: 'accepted', header: 'Status', render: (row) => <Badge variant={row.accepted ? 'green' : 'amber'}>{row.accepted ? 'Accepted' : 'Pending'}</Badge> },
                { key: 'accepted_at', header: 'Accepted At', render: (row) => row.accepted_at ? new Date(row.accepted_at).toLocaleString('en-GB') : 'Not yet' },
              ]}
              data={accessMonitor?.invites || []}
              emptyMessage={loading ? 'Loading invite activity...' : 'No invite activity found'}
            />
          </Panel>
        </div>
      )}
    </AppLayout>
  )
}
