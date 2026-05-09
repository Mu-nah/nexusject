import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'workspace' | 'team' | 'access'

const ROLE_OPTIONS = ['viewer', 'programme_manager', 'finance_manager', 'hr_manager', 'compliance_manager', 'cfo', 'admin']
const LEGAL_TYPES = ['Company', 'Charity / NGO', 'CIC / Nonprofit', 'School / Training Centre', 'Other']
const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN']

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '9px 15px',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 9,
  background: active ? '#C9A84C' : '#1C2230',
  color: active ? '#0C0F14' : '#7A8BA8',
  fontWeight: 600,
  fontSize: 12.5,
})

export default function Admin() {
  const [tab, setTab] = useState<Tab>('workspace')
  const [workspace, setWorkspace] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [accessMonitor, setAccessMonitor] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
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
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'viewer' })

  const load = async () => {
    setLoading(true)
    try {
      const [workspaceRes, usersRes, invitesRes, accessRes] = await Promise.all([
        api.getWorkspace(),
        api.listAdminUsers(),
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
      await api.updateWorkspace(workspaceForm)
      toast.success('Workspace updated')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Workspace update failed')
    } finally {
      setSavingWorkspace(false)
    }
  }

  const sendInvite = async () => {
    setInviteLoading(true)
    try {
      const result = await api.inviteWorkspaceUser(inviteForm)
      toast.success('Invite sent')
      await navigator.clipboard.writeText(result.invite_link)
      toast.success('Invite link copied')
      setInviteForm({ full_name: '', email: '', role: 'viewer' })
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invite failed')
    } finally {
      setInviteLoading(false)
    }
  }

  const pendingInvites = useMemo(() => invites.filter((invite) => !invite.accepted), [invites])
  const ownerAdminCount = useMemo(() => users.filter((user) => ['owner', 'admin'].includes(user.role)).length, [users])

  return (
    <AppLayout
      title="Workspace Admin"
      subtitle="Edit Workspace, Team, and Access"
      actions={tab === 'workspace'
        ? <Button onClick={saveWorkspace} disabled={savingWorkspace}>{savingWorkspace ? 'Saving...' : 'Save Workspace'}</Button>
        : tab === 'team'
          ? <Button onClick={sendInvite} disabled={inviteLoading || !inviteForm.full_name || !inviteForm.email}>{inviteLoading ? 'Sending...' : 'Invite Teammate'}</Button>
          : undefined}
    >
      <Alert variant="info" icon="✦">
        This area is now focused on workspace administration only. Accounting navigation has been simplified so the ledger sub-tabs stay inside the accounting screen where they belong.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Workspace Users" value={users.length} change="Current team members" icon="⊠" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Invites" value={pendingInvites.length} change="Awaiting acceptance" icon="✉" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Owner / Admins" value={ownerAdminCount} change="Privileged access" icon="⚙" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Never Logged In" value={accessMonitor?.summary?.never_logged_in ?? 0} change="Users to follow up" icon="◷" accentColor="#B388FF" iconBg="rgba(179,136,255,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setTab('workspace')} style={tabButtonStyle(tab === 'workspace')}>Edit Workspace</button>
        <button onClick={() => setTab('team')} style={tabButtonStyle(tab === 'team')}>Team</button>
        <button onClick={() => setTab('access')} style={tabButtonStyle(tab === 'access')}>Access Monitor</button>
      </div>

      {tab === 'workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16 }}>
          <Panel title="Workspace Details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
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
                <div style={{ fontSize: 10.5, color: '#5C6B84', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Slug</div>
                <div style={{ fontSize: 13, color: '#E8EDF5' }}>{workspace?.slug || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: '#5C6B84', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Status</div>
                <Badge variant={workspace?.is_active ? 'green' : 'red'}>{workspace?.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: '#5C6B84', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Created</div>
                <div style={{ fontSize: 13, color: '#E8EDF5' }}>{workspace?.created_at ? new Date(workspace.created_at).toLocaleString('en-GB') : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: '#5C6B84', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Last Updated</div>
                <div style={{ fontSize: 13, color: '#E8EDF5' }}>{workspace?.updated_at ? new Date(workspace.updated_at).toLocaleString('en-GB') : '—'}</div>
              </div>
              <Alert variant="success" icon="✓">
                Changes here update the active workspace profile used across onboarding, reports, and team invites.
              </Alert>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 16 }}>
          <Panel title="Invite a Teammate">
            <FormInput label="Full Name" value={inviteForm.full_name} onChange={(v) => setInviteForm((prev) => ({ ...prev, full_name: v }))} />
            <FormInput label="Email" value={inviteForm.email} onChange={(v) => setInviteForm((prev) => ({ ...prev, email: v }))} type="email" />
            <FormInput label="Role" value={inviteForm.role} onChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))} as="select">
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
            </FormInput>
            <Button fullWidth onClick={sendInvite} disabled={inviteLoading || !inviteForm.full_name || !inviteForm.email}>
              {inviteLoading ? 'Sending invite...' : 'Invite to Workspace'}
            </Button>
          </Panel>

          <Panel title="Workspace Team">
            <div style={{ marginBottom: 14, color: '#7A8BA8', fontSize: 12.5 }}>
              Manage who belongs to this workspace and track invitation status in one place.
            </div>
            <DataTable
              columns={[
                { key: 'full_name', header: 'Name', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant={['owner', 'admin'].includes(row.role) ? 'gold' : 'slate'}>{row.role.replace('_', ' ')}</Badge> },
                { key: 'last_login', header: 'Last Login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleString('en-GB') : 'Never' },
              ]}
              data={users}
              emptyMessage={loading ? 'Loading team...' : 'No workspace users found'}
            />
          </Panel>

          <Panel title="Pending and Past Invites" style={{ gridColumn: '1 / -1' }}>
            <DataTable
              columns={[
                { key: 'full_name', header: 'Invitee', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant="slate">{row.role.replace('_', ' ')}</Badge> },
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatCard label="Active Users" value={accessMonitor?.summary?.active_users ?? 0} change="Accounts enabled" icon="✓" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
              <StatCard label="Privileged Users" value={accessMonitor?.summary?.owners_admins ?? 0} change="Owner + admin roles" icon="⚙" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
              <StatCard label="Pending Invites" value={accessMonitor?.summary?.pending_invites ?? 0} change="Access not activated" icon="✉" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
              <StatCard label="Never Logged In" value={accessMonitor?.summary?.never_logged_in ?? 0} change="Needs follow-up" icon="◷" accentColor="#B388FF" iconBg="rgba(179,136,255,0.12)" />
            </div>
          </Panel>

          <Panel title="User Access Monitor">
            <DataTable
              columns={[
                { key: 'full_name', header: 'User', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant={['owner', 'admin'].includes(row.role) ? 'gold' : 'slate'}>{row.role.replace('_', ' ')}</Badge> },
                { key: 'is_active', header: 'Status', render: (row) => <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Active' : 'Disabled'}</Badge> },
                { key: 'last_login', header: 'Last Login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleString('en-GB') : 'Never' },
                { key: 'created_at', header: 'Added', render: (row) => new Date(row.created_at).toLocaleString('en-GB') },
              ]}
              data={accessMonitor?.users || []}
              emptyMessage={loading ? 'Loading access records...' : 'No user access records found'}
            />
          </Panel>

          <Panel title="Invite Access Trail">
            <DataTable
              columns={[
                { key: 'full_name', header: 'Invitee', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant="slate">{row.role.replace('_', ' ')}</Badge> },
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
