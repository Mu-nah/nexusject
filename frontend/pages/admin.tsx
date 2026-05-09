import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'users' | 'invites'

const ROLE_OPTIONS = ['viewer', 'programme_manager', 'finance_manager', 'cfo', 'admin']

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', role: 'viewer' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const [usersRes, invitesRes] = await Promise.all([api.listAdminUsers(), api.listWorkspaceInvites()])
    setUsers(usersRes)
    setInvites(invitesRes)
  }

  useEffect(() => {
    load().catch(() => toast.error('Failed to load admin data'))
  }, [])

  const sendInvite = async () => {
    setLoading(true)
    try {
      const result = await api.inviteWorkspaceUser(form)
      toast.success('Invite sent')
      await navigator.clipboard.writeText(result.invite_link)
      toast.success('Invite link copied')
      setForm({ full_name: '', email: '', role: 'viewer' })
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invite failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout
      title="Admin Portal"
      subtitle="Workspace Admin"
      actions={<Button onClick={sendInvite} disabled={loading || !form.full_name || !form.email}>{loading ? 'Sending...' : 'Send Invite'}</Button>}
    >
      <Alert variant="success" icon="✦">
        Owners and admins can invite teammates into the current workspace. Invites are emailed with an activation link and accepted users inherit workspace access automatically.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Workspace Users" value={users.length} change="Active team members" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Invites" value={invites.filter((invite) => !invite.accepted).length} change="Awaiting acceptance" icon="✉" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Accepted Invites" value={invites.filter((invite) => invite.accepted).length} change="Joined workspace" icon="✓" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Owner/Admins" value={users.filter((user) => ['owner', 'admin'].includes(user.role)).length} change="High privilege users" icon="⚙" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16, marginBottom: 18 }}>
        <Panel title="Invite a Teammate">
          <FormInput label="Full Name" value={form.full_name} onChange={(v) => setForm((prev) => ({ ...prev, full_name: v }))} />
          <FormInput label="Email" value={form.email} onChange={(v) => setForm((prev) => ({ ...prev, email: v }))} type="email" />
          <FormInput label="Role" value={form.role} onChange={(v) => setForm((prev) => ({ ...prev, role: v }))} as="select">
            {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
          </FormInput>
          <Button fullWidth onClick={sendInvite} disabled={loading || !form.full_name || !form.email}>
            {loading ? 'Sending invite...' : 'Invite to Workspace'}
          </Button>
        </Panel>

        <Panel title="Workspace Team">
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['users', 'invites'] as Tab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: tab === item ? '#C9A84C' : '#1C2230',
                  color: tab === item ? '#0C0F14' : '#7A8BA8',
                  fontWeight: 600,
                }}
              >
                {item === 'users' ? 'Users' : 'Invites'}
              </button>
            ))}
          </div>

          {tab === 'users' ? (
            <DataTable
              columns={[
                { key: 'full_name', header: 'Name', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant={['owner', 'admin'].includes(row.role) ? 'gold' : 'slate'}>{row.role.replace('_', ' ')}</Badge> },
                { key: 'last_login', header: 'Last Login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleString('en-GB') : 'Never' },
              ]}
              data={users}
            />
          ) : (
            <DataTable
              columns={[
                { key: 'full_name', header: 'Invitee', render: (row) => <span style={{ fontWeight: 600, color: '#E8EDF5' }}>{row.full_name}</span> },
                { key: 'email', header: 'Email', mono: true },
                { key: 'role', header: 'Role', render: (row) => <Badge variant="slate">{row.role.replace('_', ' ')}</Badge> },
                { key: 'accepted', header: 'Status', render: (row) => <Badge variant={row.accepted ? 'green' : 'amber'}>{row.accepted ? 'Accepted' : 'Pending'}</Badge> },
              ]}
              data={invites}
            />
          )}
        </Panel>
      </div>
    </AppLayout>
  )
}
