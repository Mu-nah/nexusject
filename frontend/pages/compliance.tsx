import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, Alert, FormInput } from '@/components/ui'
import { useRouter } from 'next/router'

type ComplianceStatus = 'Overdue' | 'Urgent' | 'Due Soon' | 'On Track' | 'Filed'

type ComplianceItem = {
  id: number
  requirement: string
  regulator: string
  due_date: string
  _rawDays: number
  filed: boolean
}

function calcBadge(days: number, filed: boolean): 'red' | 'amber' | 'green' | 'slate' {
  if (filed) return 'slate'
  if (days < 0) return 'red'
  if (days <= 30) return 'red'
  if (days <= 90) return 'amber'
  return 'green'
}

function calcStatus(days: number, filed: boolean): ComplianceStatus {
  if (filed) return 'Filed'
  if (days < 0) return 'Overdue'
  if (days <= 30) return 'Urgent'
  if (days <= 90) return 'Due Soon'
  return 'On Track'
}

function buildInitialItems(): ComplianceItem[] {
  const today = new Date()
  const y = today.getFullYear()
  const daysDiff = (d: Date) => Math.ceil((d.getTime() - today.getTime()) / 86400000)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const mk = (id: number, requirement: string, regulator: string, dueDate: Date): ComplianceItem => ({
    id, requirement, regulator, due_date: fmt(dueDate), _rawDays: daysDiff(dueDate), filed: false,
  })

  const nextFps = new Date(today.getFullYear(), today.getMonth() + 1, 5)
  const vatDates = [new Date(y, 4, 7), new Date(y, 7, 7), new Date(y, 10, 7), new Date(y + 1, 1, 7)]
  const nextVat = vatDates.find(d => d >= today) ?? vatDates[vatDates.length - 1]

  return [
    mk(1,  'P60 Statements to Employees',         'HMRC',                  new Date(y, 4, 31)),
    mk(2,  'Monthly RTI Full Payment Submission',  'HMRC',                  nextFps),
    mk(3,  'P11D / Benefits in Kind Return',       'HMRC',                  new Date(y, 6, 6)),
    mk(4,  'P11D(b) Class 1A NI Payment',          'HMRC',                  new Date(y, 6, 19)),
    mk(5,  'PAYE Settlement Agreement Payment',    'HMRC',                  new Date(y, 9, 19)),
    mk(6,  'VAT Return — Quarterly',               'HMRC MTD',              nextVat),
    mk(7,  'Annual Accounts Filing',               'Companies House',       new Date(y, 11, 31)),
    mk(8,  'Confirmation Statement',               'Companies House',       new Date(y, 7, 28)),
    mk(9,  'CIC Annual Report',                    'Companies House',       new Date(y, 11, 31)),
    mk(10, 'Charity Commission Annual Return',     'Charity Commission',    new Date(y + 1, 0, 31)),
    mk(11, 'ICO Data Protection Fee Renewal',      'ICO',                   new Date(y, 5, 30)),
    mk(12, 'Pension Auto-Enrolment Re-enrolment',  'Pensions Regulator',    new Date(y + 1, 8, 1)),
    mk(13, 'Annual Safeguarding Policy Review',    'Internal / Ofsted',     new Date(y, 8, 30)),
    mk(14, 'Working Time Regulations Annual Audit','Internal / HSE',        new Date(y, 10, 30)),
  ].sort((a, b) => a._rawDays - b._rawDays)
}

export default function Compliance() {
  const router = useRouter()
  const [items, setItems] = useState<ComplianceItem[]>(buildInitialItems)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ requirement: '', regulator: '', dueDate: '' })

  const toggleFiled = (id: number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, filed: !i.filed } : i))

  const removeItem = (id: number) =>
    setItems(prev => prev.filter(i => i.id !== id))

  const addItem = () => {
    if (!addForm.requirement.trim() || !addForm.dueDate) { return }
    const d = new Date(addForm.dueDate)
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
    setItems(prev => [...prev, {
      id: Date.now(), requirement: addForm.requirement.trim(),
      regulator: addForm.regulator.trim() || 'Internal',
      due_date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      _rawDays: days, filed: false,
    }].sort((a, b) => a._rawDays - b._rawDays))
    setAddForm({ requirement: '', regulator: '', dueDate: '' })
    setShowAdd(false)
  }

  const urgent = useMemo(() => items.filter(i => !i.filed && (i._rawDays < 0 || i._rawDays <= 30)).length, [items])
  const dueSoon = useMemo(() => items.filter(i => !i.filed && i._rawDays > 30 && i._rawDays <= 90).length, [items])
  const onTrack = useMemo(() => items.filter(i => !i.filed && i._rawDays > 90).length, [items])
  const filed = useMemo(() => items.filter(i => i.filed).length, [items])
  const active = items.filter(i => !i.filed).length
  const score = active > 0 ? Math.round((onTrack / active) * 100) : 100

  return (
    <AppLayout
      title="Compliance Hub"
      subtitle="UK regulatory calendar"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => router.push('/reports')}>Export Schedule</Button>
          <Button onClick={() => setShowAdd(true)}>+ Add Deadline</Button>
        </div>
      }
    >
      {urgent > 0 && (
        <Alert variant="gold" icon="!">
          <strong>Heads up:</strong> {urgent} deadline{urgent > 1 ? 's are' : ' is'} due within 30 days. Mark as Filed once submitted.
        </Alert>
      )}
      {urgent === 0 && (
        <Alert variant="info" icon="i">
          {active > 0
            ? `All tracked deadlines are within schedule. Next action: ${items.find(i => !i.filed && i._rawDays > 30 && i._rawDays <= 90)?.requirement ?? items.find(i => !i.filed)?.requirement ?? 'none'}.`
            : 'No active compliance deadlines. Add any deadlines relevant to your organisation.'}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Compliance Score" value={`${score}%`} change={`${active} active deadlines`} changeUp={score >= 80} accentColor="#C9A84C" icon="SC" />
        <StatCard label="Urgent / Overdue" value={urgent} change={urgent ? 'Requires immediate action' : 'No urgent actions'} changeUp={false} accentColor="#F5365C" icon="!" />
        <StatCard label="Due Soon" value={dueSoon} change="Within 90 days" accentColor="#FB8C00" icon="D" />
        <StatCard label="On Track" value={onTrack} change={filed > 0 ? `${filed} filed this cycle` : 'In good standing'} changeUp={onTrack > 0} accentColor="#2DCE89" icon="OK" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <Panel title="Compliance Schedule" noPadding action={
          <div style={{ padding: '10px 14px 0', fontSize: 11, color: 'var(--mute)' }}>
            Mark items as Filed once submitted · Remove items that don't apply
          </div>
        }>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Requirement', 'Regulator', 'Due Date', 'Days', 'Status', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textAlign: 'left', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg2)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const badge = calcBadge(it._rawDays, it.filed)
                  const status = calcStatus(it._rawDays, it.filed)
                  return (
                    <tr key={it.id} style={{ background: !it.filed && it._rawDays <= 30 ? 'rgba(245,54,92,0.03)' : 'transparent', opacity: it.filed ? 0.55 : 1 }}>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontWeight: 500, color: 'var(--heading)', fontSize: 13, textDecoration: it.filed ? 'line-through' : 'none' }}>
                        {it.requirement}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', color: 'var(--mute2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {it.regulator}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {it.due_date}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: it.filed ? 'var(--mute)' : it._rawDays < 0 ? '#F5365C' : it._rawDays <= 30 ? '#FB8C00' : 'var(--mute)', whiteSpace: 'nowrap' }}>
                        {it.filed ? 'Filed' : it._rawDays < 0 ? 'Overdue' : `${it._rawDays}d`}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
                        <Badge variant={badge}>{status}</Badge>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button small variant="ghost" onClick={() => toggleFiled(it.id)}>
                            {it.filed ? 'Undo' : 'Filed'}
                          </Button>
                          <Button small variant="ghost" onClick={() => removeItem(it.id)}>✕</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>No deadlines tracked. Click "+ Add Deadline" to add your first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Compliance Health">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 52, fontWeight: 600, color: score >= 80 ? '#2DCE89' : score >= 60 ? '#FB8C00' : '#F5365C', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {score}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 6, marginBottom: 20 }}>Overall compliance score</div>
            </div>
            {[['Urgent / Overdue', urgent, '#F5365C'], ['Due Soon', dueSoon, '#FB8C00'], ['On Track', onTrack, '#2DCE89'], ['Filed', filed, 'var(--mute)']].map(([label, count, color]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color as string }} />
                  <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: color as string }}>{count as number}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Regulatory Portals">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'HMRC PAYE Portal', url: 'https://www.tax.service.gov.uk' },
                { label: 'HMRC MTD VAT', url: 'https://www.gov.uk/government/collections/making-tax-digital-for-vat' },
                { label: 'Companies House', url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return' },
                { label: 'Charity Commission', url: 'https://www.gov.uk/manage-charity-online' },
                { label: 'ICO (Data Protection)', url: 'https://ico.org.uk/registration' },
                { label: 'Pensions Regulator', url: 'https://www.thepensionsregulator.gov.uk' },
              ].map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--mute2)', textDecoration: 'none', border: '1px solid var(--line)' }}>
                  {link.label}
                  <span style={{ fontSize: 10, color: 'var(--gold)' }}>→</span>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--heading)', marginBottom: 20, fontFamily: "'Instrument Serif', serif" }}>Add Compliance Deadline</div>
            <FormInput label="Requirement *" value={addForm.requirement} onChange={(v) => setAddForm({ ...addForm, requirement: v })} placeholder="e.g. Annual Gift Aid Submission" />
            <FormInput label="Regulator / Body" value={addForm.regulator} onChange={(v) => setAddForm({ ...addForm, regulator: v })} placeholder="e.g. HMRC, Internal" />
            <FormInput label="Due Date *" value={addForm.dueDate} onChange={(v) => setAddForm({ ...addForm, dueDate: v })} placeholder="YYYY-MM-DD" />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Button variant="ghost" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button fullWidth onClick={addItem}>Add Deadline</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
