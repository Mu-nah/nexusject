import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, EmptyState, Panel, ProgressBar, StatCard } from '@/components/ui'
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

const STATUS_COLORS: Record<ProjectStatus, string> = {
  'On Track': 'green', 'At Risk': 'amber', 'Delayed': 'red', 'Completed': 'blue', 'Planning': 'slate',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  'High': 'red', 'Medium': 'amber', 'Low': 'green',
}

const TASK_COLUMNS: { key: TaskStatus; color: string; description: string }[] = [
  { key: 'To Do',       color: '#5E9EFF', description: 'Not yet started' },
  { key: 'In Progress', color: '#FB8C00', description: 'Currently active' },
  { key: 'Review',      color: '#9B59B6', description: 'Needs sign-off' },
  { key: 'Done',        color: '#2DCE89', description: 'Complete' },
]

const gbp = (n: number) => `GBP ${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`

const projects: Project[] = []
const tasks: Task[] = []
const milestones: Milestone[] = []

export default function Projects() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const tasksByStatus = useMemo(() => {
    const filtered = selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : tasks
    const map: Record<TaskStatus, Task[]> = { 'To Do': [], 'In Progress': [], 'Review': [], 'Done': [] }
    filtered.forEach(t => map[t.status].push(t))
    return map
  }, [selectedProjectId])

  const visibleMilestones = useMemo(() => {
    const ms = selectedProjectId ? milestones.filter(m => m.projectId === selectedProjectId) : milestones
    return ms.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }, [selectedProjectId])

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0)
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0)
  const atRisk = projects.filter(p => p.status === 'At Risk' || p.status === 'Delayed').length

  return (
    <AppLayout
      title="Project Management"
      subtitle="Delivery tracking · Milestones · Resources"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/ai')}>Realtouch IQ</Button>
          <Button onClick={() => toast.success('Project creation coming soon — connect your workspace projects')}>+ New Project</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Projects" value={String(projects.length)} change={projects.length === 0 ? 'No projects yet' : `${projects.filter(p => p.status === 'On Track').length} on track`} accentColor="#C9A84C" />
        <StatCard label="At Risk / Delayed" value={String(atRisk)} change={atRisk === 0 ? 'Nothing flagged' : 'Need attention'} changeUp={atRisk === 0} accentColor={atRisk > 0 ? '#F5365C' : '#2DCE89'} />
        <StatCard label="Open Tasks" value={String(tasks.filter(t => t.status !== 'Done').length)} change={tasks.length === 0 ? 'No tasks yet' : `${tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length} high priority`} accentColor="#FB8C00" />
        <StatCard label="Total Budget" value={totalBudget > 0 ? gbp(totalBudget) : '—'} change={totalBudget > 0 ? `${gbp(totalSpent)} spent (${((totalSpent / totalBudget) * 100).toFixed(0)}%)` : 'No budget allocated yet'} accentColor="#5E9EFF" />
      </div>

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

      {tab === 'overview' && (
        projects.length === 0 ? (
          <Panel>
            <EmptyState
              title="No projects yet"
              description="Create your first project to track delivery progress, budgets, milestones, and team allocation."
            />
          </Panel>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map(p => {
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
        )
      )}

      {tab === 'tasks' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>Filter by project:</span>
              <button onClick={() => setSelectedProjectId(null)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === null ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === null ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === null ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }}>All</button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setSelectedProjectId(p.id)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === p.id ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === p.id ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === p.id ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 11.5, fontFamily: "'Instrument Sans', sans-serif", maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name.split(' ').slice(0, 3).join(' ')}…
                </button>
              ))}
            </div>
            <Button small onClick={() => toast.success('Add task — create a project first')}>+ Add Task</Button>
          </div>

          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {TASK_COLUMNS.map(({ key, color, description }) => {
              const columnTasks = tasksByStatus[key]
              return (
                <div key={key} style={{ flex: '0 0 230px', minWidth: 230 }}>
                  <div style={{ borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden' }}>
                    <div style={{ borderTop: `3px solid ${color}`, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)' }}>{key}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 20, padding: '2px 8px' }}>{columnTasks.length}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{description}</div>
                    </div>
                    <div style={{ padding: '10px 10px 4px' }}>
                      {columnTasks.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--mute)', padding: '8px 4px', textAlign: 'center' }}>No tasks</div>}
                      {columnTasks.map(t => {
                        const projectName = projects.find(p => p.id === t.projectId)?.name ?? ''
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

      {tab === 'milestones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>Filter:</span>
              <button onClick={() => setSelectedProjectId(null)} style={{ padding: '4px 12px', borderRadius: 14, border: selectedProjectId === null ? '1px solid #C9A84C' : '1px solid var(--line)', background: selectedProjectId === null ? 'rgba(201,168,76,0.1)' : 'transparent', color: selectedProjectId === null ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }}>All Projects</button>
              {projects.map(p => (
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
            {visibleMilestones.length === 0 ? (
              <EmptyState title="No milestones yet" description="Add projects and milestones to track delivery checkpoints." />
            ) : (
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
                      const project = projects.find(p => p.id === m.projectId)
                      const daysToGo = Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000)
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--line)', opacity: m.completed ? 0.7 : 1 }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: m.completed ? 'var(--mute)' : 'var(--heading)', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.title}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--mute)', fontSize: 12 }}>{project?.name.split(' ').slice(0, 4).join(' ')}…</td>
                          <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute)', fontSize: 11.5 }}>{new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {m.completed
                              ? <span style={{ fontSize: 11.5, color: '#2DCE89' }}>Done {m.completedDate ? new Date(m.completedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
                              : <Badge variant={daysToGo < 0 ? 'red' : daysToGo <= 14 ? 'amber' : 'green'}>{daysToGo < 0 ? `${Math.abs(daysToGo)}d overdue` : `${daysToGo}d`}</Badge>}
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
            )}
          </Panel>
        </>
      )}

      {tab === 'resources' && (
        projects.length === 0 ? (
          <Panel>
            <EmptyState title="No resource data yet" description="Add projects and team members to see allocation and workload." />
          </Panel>
        ) : (
          <>
            <Panel title="Team Allocation" titleIcon="TA" iconColor="#C9A84C">
              {(() => {
                const teamMap: Record<string, { projects: string[]; taskCount: number; highPriority: number }> = {}
                projects.forEach(p => {
                  [p.owner, ...p.team].forEach(member => {
                    if (!teamMap[member]) teamMap[member] = { projects: [], taskCount: 0, highPriority: 0 }
                    if (!teamMap[member].projects.includes(p.name)) teamMap[member].projects.push(p.name)
                  })
                })
                tasks.filter(t => t.status !== 'Done').forEach(t => {
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
              {projects.map(p => (
                <Panel key={p.id} title={p.name.length > 35 ? p.name.slice(0, 35) + '…' : p.name} titleIcon="P" iconColor={STATUS_COLORS[p.status] === 'green' ? '#2DCE89' : STATUS_COLORS[p.status] === 'red' ? '#F5365C' : '#FB8C00'}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {[p.owner, ...p.team].map(m => (
                      <span key={m} style={{ fontSize: 11.5, padding: '3px 8px', background: 'var(--surface-muted)', borderRadius: 10, color: 'var(--text)' }}>{m}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginBottom: 6 }}>
                    {tasks.filter(t => t.projectId === p.id && t.status !== 'Done').length} open tasks · {milestones.filter(m => m.projectId === p.id && !m.completed).length} milestones pending
                  </div>
                  <ProgressBar value={p.progress} color={p.status === 'Delayed' ? '#F5365C' : p.status === 'At Risk' ? '#FB8C00' : '#2DCE89'} />
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{p.progress}% complete</div>
                </Panel>
              ))}
            </div>
          </>
        )
      )}
    </AppLayout>
  )
}
