import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, Panel, ProgressBar, StatCard } from '@/components/ui'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'tasks' | 'milestones' | 'resources'
type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Completed' | 'Planning'
type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done'
type Priority = 'High' | 'Medium' | 'Low'

interface Project {
  id: number; name: string; description: string; status: ProjectStatus
  owner: string; team: string[]; startDate: string; endDate: string
  budget: number; spent: number; progress: number; linkedGrant: string | null
}

interface Task {
  id: number; projectId: number; title: string; status: TaskStatus
  assignee: string; priority: Priority; dueDate: string | null; description: string
}

interface Milestone {
  id: number; projectId: number; title: string; dueDate: string
  completed: boolean; completedDate: string | null
}

const MOCK_PROJECTS: Project[] = [
  { id: 1, name: 'Community Wellbeing Programme Phase 2', description: 'Extending the Phase 1 wellbeing programme to 3 new boroughs', status: 'On Track', owner: 'S. O\'Brien', team: ['M. Okonkwo', 'T. Singh', 'P. Patel'], startDate: '2026-04-01', endDate: '2026-12-31', budget: 120000, spent: 31500, progress: 28, linkedGrant: 'National Lottery Community Fund' },
  { id: 2, name: 'Digital Inclusion Initiative', description: 'Equipping 150 residents with digital skills and devices', status: 'At Risk', owner: 'T. Singh', team: ['A. Johnson', 'F. Hassan'], startDate: '2026-03-01', endDate: '2026-09-30', budget: 45000, spent: 28200, progress: 65, linkedGrant: 'Tudor Trust' },
  { id: 3, name: 'Staff Training & Development Programme', description: 'Mandatory training rollout + CPD framework', status: 'On Track', owner: 'M. Okonkwo', team: ['S. O\'Brien'], startDate: '2026-01-01', endDate: '2026-06-30', budget: 18000, spent: 14400, progress: 80, linkedGrant: null },
  { id: 4, name: 'Office Relocation', description: 'Move to new accessible premises', status: 'Planning', owner: 'J. Carter', team: ['T. Singh', 'M. Okonkwo'], startDate: '2026-07-01', endDate: '2026-08-31', budget: 35000, spent: 0, progress: 5, linkedGrant: null },
  { id: 5, name: 'Annual Impact Report 2025-26', description: 'Produce and publish beneficiary impact data and case studies', status: 'Delayed', owner: 'P. Patel', team: ['A. Johnson'], startDate: '2026-05-01', endDate: '2026-06-30', budget: 8000, spent: 3200, progress: 40, linkedGrant: null },
]

const MOCK_TASKS: Task[] = [
  { id: 1, projectId: 1, title: 'Recruit Phase 2 programme coordinator', status: 'In Progress', assignee: 'M. Okonkwo', priority: 'High', dueDate: '2026-05-30', description: 'Advertise, shortlist, and interview for new coordinator role' },
  { id: 2, projectId: 1, title: 'Venue contracts for Southwark sessions', status: 'To Do', assignee: 'S. O\'Brien', priority: 'High', dueDate: '2026-06-15', description: '' },
  { id: 3, projectId: 2, title: 'Procure 30 refurbished laptops', status: 'Review', assignee: 'T. Singh', priority: 'High', dueDate: '2026-05-25', description: 'Three quotes obtained; awaiting approval' },
  { id: 4, projectId: 2, title: 'Partner agreement — Digital Futures Charity', status: 'Done', assignee: 'T. Singh', priority: 'Medium', dueDate: '2026-04-30', description: '' },
  { id: 5, projectId: 3, title: 'Deliver Safeguarding refresher training', status: 'Done', assignee: 'M. Okonkwo', priority: 'High', dueDate: '2026-04-15', description: '' },
  { id: 6, projectId: 3, title: 'GDPR training — all staff', status: 'In Progress', assignee: 'S. O\'Brien', priority: 'High', dueDate: '2026-06-01', description: '' },
  { id: 7, projectId: 4, title: 'Confirm new lease', status: 'To Do', assignee: 'J. Carter', priority: 'High', dueDate: '2026-07-10', description: '' },
  { id: 8, projectId: 5, title: 'Collect beneficiary case studies', status: 'In Progress', assignee: 'P. Patel', priority: 'Medium', dueDate: '2026-05-28', description: '' },
  { id: 9, projectId: 5, title: 'Design layout and print production', status: 'To Do', assignee: 'A. Johnson', priority: 'Low', dueDate: '2026-06-20', description: '' },
]

const MOCK_MILESTONES: Milestone[] = [
  { id: 1, projectId: 1, title: 'Phase 2 team in place', dueDate: '2026-06-30', completed: false, completedDate: null },
  { id: 2, projectId: 1, title: 'First community session delivered', dueDate: '2026-07-31', completed: false, completedDate: null },
  { id: 3, projectId: 2, title: 'All laptops distributed', dueDate: '2026-06-15', completed: false, completedDate: null },
  { id: 4, projectId: 2, title: '75 participants enrolled', dueDate: '2026-07-01', completed: false, completedDate: null },
  { id: 5, projectId: 3, title: 'All mandatory training complete', dueDate: '2026-06-30', completed: false, completedDate: null },
  { id: 6, projectId: 3, title: 'CPD framework launched', dueDate: '2026-04-01', completed: true, completedDate: '2026-03-28' },
  { id: 7, projectId: 5, title: 'First draft to CEO', dueDate: '2026-06-01', completed: false, completedDate: null },
  { id: 8, projectId: 5, title: 'Published on website', dueDate: '2026-06-30', completed: false, completedDate: null },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  'On Track': 'green', 'At Risk': 'amber', 'Delayed': 'red', 'Completed': 'blue', 'Planning': 'grey',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  'High': 'red', 'Medium': 'amber', 'Low': 'green',
}

const TASK_COLUMNS: { key: TaskStatus; color: string; description: string }[] = [
  { key: 'To Do',      color: '#5E9EFF', description: 'Not yet started' },
  { key: 'In Progress', color: '#FB8C00', description: 'Currently active' },
  { key: 'Review',     color: '#9B59B6', description: 'Needs sign-off' },
  { key: 'Done',       color: '#2DCE89', description: 'Complete' },
]

const gbp = (n: number) => `GBP ${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`

export default function Projects() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const selectedProject = MOCK_PROJECTS.find(p => p.id === selectedProjectId) ?? null

  const tasksByStatus = useMemo(() => {
    const filtered = selectedProjectId
      ? MOCK_TASKS.filter(t => t.projectId === selectedProjectId)
      : MOCK_TASKS
    const map: Record<TaskStatus, Task[]> = { 'To Do': [], 'In Progress': [], 'Review': [], 'Done': [] }
    filtered.forEach(t => map[t.status].push(t))
    return map
  }, [selectedProjectId])

  const visibleMilestones = useMemo(() => {
    const ms = selectedProjectId ? MOCK_MILESTONES.filter(m => m.projectId === selectedProjectId) : MOCK_MILESTONES
    return ms.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }, [selectedProjectId])

  const totalBudget = MOCK_PROJECTS.reduce((s, p) => s + p.budget, 0)
  const totalSpent = MOCK_PROJECTS.reduce((s, p) => s + p.spent, 0)
  const atRisk = MOCK_PROJECTS.filter(p => p.status === 'At Risk' || p.status === 'Delayed').length

  return (
    <AppLayout
      title="Project Management"
      subtitle="Delivery tracking · Milestones · Resources"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>Realtouch IQ</Button>
          <Button onClick={() => toast.success('New project form coming soon')}>+ New Project</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Projects" value={String(MOCK_PROJECTS.length)} change={`${MOCK_PROJECTS.filter(p => p.status === 'On Track').length} on track`} accentColor="#C9A84C" />
        <StatCard label="At Risk / Delayed" value={String(atRisk)} change="need attention" changeUp={atRisk === 0} accentColor={atRisk > 0 ? '#F5365C' : '#2DCE89'} />
        <StatCard label="Open Tasks" value={String(MOCK_TASKS.filter(t => t.status !== 'Done').length)} change={`${MOCK_TASKS.filter(t => t.priority === 'High' && t.status !== 'Done').length} high priority`} accentColor="#FB8C00" />
        <StatCard label="Total Budget" value={gbp(totalBudget)} change={`${gbp(totalSpent)} spent (${((totalSpent / totalBudget) * 100).toFixed(0)}%)`} accentColor="#5E9EFF" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'overview',   label: 'Projects' },
          { key: 'tasks',      label: 'Task Board' },
          { key: 'milestones', label: 'Milestones' },
          { key: 'resources',  label: 'Resource Overview' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5, background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent', color: tab === t.key ? 'var(--gold)' : 'var(--mute)', fontWeight: tab === t.key ? 600 : 400, fontFamily: "'Instrument Sans', sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Projects overview ─────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_PROJECTS.map(p => {
            const daysRemaining = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000)
            const budgetPct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${p.status === 'At Risk' || p.status === 'Delayed' ? 'rgba(245,54,92,0.3)' : 'var(--line)'}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--heading)', marginBottom: 5 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 8 }}>{p.description}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge variant={STATUS_COLORS[p.status] as any}>{p.status}</Badge>
                      <span style={{ fontSize: 11.5, color: 'var(--mute)' }}>Owner: {p.owner}</span>
                      {p.linkedGrant && <Badge variant="blue">Grant: {p.linkedGrant.split(' ').slice(0, 3).join(' ')}</Badge>}
                      {daysRemaining < 30 && daysRemaining > 0 && <Badge variant="red">{daysRemaining}d remaining</Badge>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button small variant="ghost" onClick={() => { setSelectedProjectId(p.id); setTab('tasks') }}>Tasks</Button>
                    <Button small variant="ghost" onClick={() => { setSelectedProjectId(p.id); setTab('milestones') }}>Milestones</Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 5 }}>Delivery Progress</div>
                    <ProgressBar value={p.progress} color={p.status === 'Delayed' ? '#F5365C' : p.status === 'At Risk' ? '#FB8C00' : '#2DCE89'} />
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{p.progress}% complete</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 5 }}>Budget Utilisation</div>
                    <ProgressBar value={budgetPct} color={budgetPct > 90 ? '#F5365C' : budgetPct > 75 ? '#FB8C00' : '#C9A84C'} />
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{gbp(p.spent)} / {gbp(p.budget)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 5 }}>Timeline</div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(p.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} → {new Date(p.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: daysRemaining < 0 ? '#F5365C' : 'var(--mute)', marginTop: 3 }}>
                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 5 }}>Team</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[p.owner, ...p.team].map(member => (
                        <span key={member} style={{ fontSize: 11, padding: '2px 7px', background: 'var(--surface-muted)', borderRadius: 10, color: 'var(--text)' }}>{member}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Task board ────────────────────────────────────── */}
      {tab === 'tasks' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>Filter by project:</span>
              <button onClick={() => setSelectedProjectId(null)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === null ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === null ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === null ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }}>All</button>
              {MOCK_PROJECTS.map(p => (
                <button key={p.id} onClick={() => setSelectedProjectId(p.id)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === p.id ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === p.id ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === p.id ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 11.5, fontFamily: "'Instrument Sans', sans-serif", maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name.split(' ').slice(0, 3).join(' ')}…
                </button>
              ))}
            </div>
            <Button small onClick={() => toast.success('Add task form coming soon')}>+ Add Task</Button>
          </div>

          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {TASK_COLUMNS.map(({ key, color, description }) => {
              const tasks = tasksByStatus[key]
              return (
                <div key={key} style={{ flex: '0 0 230px', minWidth: 230 }}>
                  <div style={{ borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden' }}>
                    <div style={{ borderTop: `3px solid ${color}`, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)' }}>{key}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 20, padding: '2px 8px' }}>{tasks.length}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{description}</div>
                    </div>
                    <div style={{ padding: '10px 10px 4px' }}>
                      {tasks.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--mute)', padding: '8px 4px', textAlign: 'center' }}>No tasks</div>}
                      {tasks.map(t => {
                        const projectName = MOCK_PROJECTS.find(p => p.id === t.projectId)?.name ?? ''
                        const dueIn = t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000) : null
                        return (
                          <div key={t.id} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--heading)', marginBottom: 5, lineHeight: 1.4 }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 6 }}>{projectName.split(' ').slice(0, 3).join(' ')}…</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                              <Badge variant={PRIORITY_COLORS[t.priority] as any}>{t.priority}</Badge>
                              <span style={{ fontSize: 11, color: 'var(--mute)' }}>{t.assignee.split(' ')[0]}</span>
                            </div>
                            {dueIn !== null && (
                              <div style={{ marginTop: 5 }}>
                                <Badge variant={dueIn < 0 ? 'red' : dueIn <= 7 ? 'amber' : 'slate'}>{dueIn < 0 ? `${Math.abs(dueIn)}d overdue` : `Due ${dueIn}d`}</Badge>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Milestones ────────────────────────────────────── */}
      {tab === 'milestones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>Filter:</span>
              <button onClick={() => setSelectedProjectId(null)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === null ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === null ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === null ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }}>All Projects</button>
              {MOCK_PROJECTS.map(p => (
                <button key={p.id} onClick={() => setSelectedProjectId(p.id)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === p.id ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === p.id ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === p.id ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 11.5, fontFamily: "'Instrument Sans', sans-serif" }}>
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--mute)' }}>
              {visibleMilestones.filter(m => m.completed).length} / {visibleMilestones.length} completed
            </div>
          </div>

          <Panel noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Milestone', 'Project', 'Due Date', 'Days', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleMilestones.map(m => {
                    const project = MOCK_PROJECTS.find(p => p.id === m.projectId)
                    const daysToGo = Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000)
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--line)', opacity: m.completed ? 0.7 : 1 }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: m.completed ? 'var(--mute)' : 'var(--heading)', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.title}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 12 }}>{project?.name.split(' ').slice(0, 4).join(' ')}…</td>
                        <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute)', fontSize: 11.5 }}>{new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 14px' }}>
                          {m.completed ? <span style={{ fontSize: 11.5, color: '#2DCE89' }}>Done {m.completedDate ? new Date(m.completedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span> :
                            <Badge variant={daysToGo < 0 ? 'red' : daysToGo <= 14 ? 'amber' : 'green'}>{daysToGo < 0 ? `${Math.abs(daysToGo)}d overdue` : `${daysToGo}d`}</Badge>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge variant={m.completed ? 'green' : 'amber'}>{m.completed ? 'Completed' : 'Pending'}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ── Resources ─────────────────────────────────────── */}
      {tab === 'resources' && (
        <>
          <Panel title="Team Allocation" titleIcon="TA" iconColor="#C9A84C">
            {(() => {
              const teamMap: Record<string, { projects: string[]; taskCount: number; highPriority: number }> = {}
              MOCK_PROJECTS.forEach(p => {
                [p.owner, ...p.team].forEach(member => {
                  if (!teamMap[member]) teamMap[member] = { projects: [], taskCount: 0, highPriority: 0 }
                  if (!teamMap[member].projects.includes(p.name)) teamMap[member].projects.push(p.name)
                })
              })
              MOCK_TASKS.filter(t => t.status !== 'Done').forEach(t => {
                if (!teamMap[t.assignee]) teamMap[t.assignee] = { projects: [], taskCount: 0, highPriority: 0 }
                teamMap[t.assignee].taskCount++
                if (t.priority === 'High') teamMap[t.assignee].highPriority++
              })
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      {['Team Member', 'Projects', 'Open Tasks', 'High Priority', 'Load'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(teamMap).map(([member, data]) => {
                      const loadPct = Math.min(data.taskCount * 20, 100)
                      return (
                        <tr key={member} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--heading)' }}>{member}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--mute)', fontSize: 11.5 }}>{data.projects.length} project{data.projects.length !== 1 ? 's' : ''}</td>
                          <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', fontWeight: 600 }}>{data.taskCount}</td>
                          <td style={{ padding: '10px 12px' }}>{data.highPriority > 0 ? <Badge variant="red">{data.highPriority}</Badge> : <span style={{ color: 'var(--mute)' }}>—</span>}</td>
                          <td style={{ padding: '10px 12px', minWidth: 120 }}>
                            <ProgressBar value={loadPct} color={loadPct > 80 ? '#F5365C' : loadPct > 60 ? '#FB8C00' : '#2DCE89'} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
            {MOCK_PROJECTS.map(p => (
              <Panel key={p.id} title={p.name.length > 35 ? p.name.slice(0, 35) + '…' : p.name} titleIcon="P" iconColor={STATUS_COLORS[p.status] === 'green' ? '#2DCE89' : STATUS_COLORS[p.status] === 'red' ? '#F5365C' : '#FB8C00'}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[p.owner, ...p.team].map(m => (
                    <span key={m} style={{ fontSize: 11.5, padding: '3px 8px', background: 'var(--surface-muted)', borderRadius: 10, color: 'var(--text)' }}>{m}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 6 }}>
                  {MOCK_TASKS.filter(t => t.projectId === p.id && t.status !== 'Done').length} open tasks · {MOCK_MILESTONES.filter(m => m.projectId === p.id && !m.completed).length} milestones pending
                </div>
                <ProgressBar value={p.progress} color={p.status === 'Delayed' ? '#F5365C' : p.status === 'At Risk' ? '#FB8C00' : '#2DCE89'} />
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{p.progress}% complete</div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  )
}
