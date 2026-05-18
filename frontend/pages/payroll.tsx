import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, Alert, FormInput } from '@/components/ui'
import { useEmployees, usePayrollRuns, useRunPayroll } from '@/hooks/useFinancial'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

type Tab = 'register' | 'statutory' | 'nmw' | 'p60_p11d' | 'history'
type StatType = 'ssp' | 'smp' | 'spp'

const gbp = (n: number) =>
  `GBP ${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// 2026-27 NMW/NLW rates
const NMW_RATES = [
  { band: 'National Living Wage (21+)', hourly: 12.21 },
  { band: '18–20 years', hourly: 10.00 },
  { band: '16–17 years', hourly: 7.55 },
  { band: 'Apprentice (under 19 / first year)', hourly: 7.55 },
]

// 2026-27 statutory pay rates
const SSP_WEEKLY = 116.75
const SMP_STATUTORY_WEEKLY = 184.03
const SPP_WEEKLY = 184.03

function calcSSP(weeksOff: number, waitingDays: number) {
  const qualifyingWeeks = Math.max(0, weeksOff - waitingDays / 5)
  return Math.min(qualifyingWeeks, 28) * SSP_WEEKLY
}

function calcSMP(grossWeeklyPay: number) {
  const firstSixWeeks = grossWeeklyPay * 0.9 * 6
  const remaining33Weeks = SMP_STATUTORY_WEEKLY * 33
  return { firstSixWeeks, remaining33Weeks, total: firstSixWeeks + remaining33Weeks }
}

function calcSPP() {
  return SPP_WEEKLY * 2
}

export default function Payroll() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('register')
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [showRunModal, setShowRunModal] = useState(false)
  const [statType, setStatType] = useState<StatType>('ssp')
  const [sspWeeks, setSspWeeks] = useState('2')
  const [smpWeeklyGross, setSmpWeeklyGross] = useState('500')

  const { data: employees = [], isLoading } = useEmployees()
  const { data: runs = [] } = usePayrollRuns()
  const runMutation = useRunPayroll()

  const totalGross = employees.reduce((s: number, e: any) => s + (e.gross_salary ?? 0), 0)
  const totalNet = employees.reduce((s: number, e: any) => s + (e.calculated?.net_pay ?? 0), 0)
  const totalEmployerCost = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_total_cost ?? 0), 0)
  const totalEmployerNI = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_ni ?? 0), 0)
  const totalPension = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_pension ?? 0), 0)
  const activePeriodLabel = runs[0]?.period || 'Current payroll period'
  const workspaceName = user?.organisation || 'Your workspace'
  const currentTaxYear = `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-${String(new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear()).slice(-2)}`

  const nmwBreaches = useMemo(() => {
    return employees.filter((emp: any) => {
      const annualGross = emp.gross_salary ?? 0
      const hoursPerWeek = emp.hours_per_week ?? 37.5
      const hourlyRate = annualGross / 52 / hoursPerWeek
      return hourlyRate < NMW_RATES[0].hourly
    })
  }, [employees])

  const sspResult = useMemo(() => {
    const weeks = parseFloat(sspWeeks) || 0
    return calcSSP(weeks, 3)
  }, [sspWeeks])

  const smpResult = useMemo(() => {
    const weeklyGross = parseFloat(smpWeeklyGross) || 0
    return calcSMP(weeklyGross)
  }, [smpWeeklyGross])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'register', label: 'Employee Register' },
    { key: 'statutory', label: 'Statutory Pay Calculator' },
    { key: 'nmw', label: 'NMW Compliance' },
    { key: 'p60_p11d', label: 'P60 & P11D' },
    { key: 'history', label: 'Run History' },
  ]

  return (
    <AppLayout
      title="Payroll Engine"
      subtitle={`Tax Year ${currentTaxYear}`}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => toast.success('RTI submission sent to HMRC (demo)')}>RTI to HMRC</Button>
          <Button onClick={() => setShowRunModal(true)}>Run Payroll</Button>
        </div>
      }
    >
      {nmwBreaches.length > 0 && (
        <Alert variant="gold" icon="!">
          <strong>NMW Alert:</strong> {nmwBreaches.length} employee{nmwBreaches.length > 1 ? 's are' : ' is'} potentially below National Minimum Wage. Review the NMW Compliance tab immediately.
        </Alert>
      )}
      {nmwBreaches.length === 0 && (
        <Alert variant="info" icon="i">
          All employees passed NMW/NLW compliance check for 2026-27. Next payroll action: review pending RTI before 5th of the month.
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Monthly Gross" value={gbp(totalGross)} change={`${employees.length} employees`} accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" icon="GR" />
        <StatCard label="Employer NI" value={gbp(totalEmployerNI)} change="13.8% on qualifying" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" icon="NI" />
        <StatCard label="Employer Pension" value={gbp(totalPension)} change="3% AE contributions" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" icon="AE" />
        <StatCard label="Total Employer Cost" value={gbp(totalEmployerCost)} change="incl. NI + pension" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" icon="TC" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
              background: 'none',
              borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t.key ? 'var(--gold2)' : 'var(--mute)',
              fontWeight: tab === t.key ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {t.label}
            {t.key === 'nmw' && nmwBreaches.length > 0 && (
              <span style={{ marginLeft: 6, background: '#F5365C', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                {nmwBreaches.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
          <Panel title="Employee Register" noPadding action={<Button small onClick={() => router.push('/payroll/new-employee')}>+ Add Employee</Button>}>
            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--mute)' }}>Loading employees...</div>
            ) : employees.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>No employees on payroll yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Employee', 'Role', 'Contract', 'Gross', 'PAYE', 'Emp NI', 'Net Pay', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textAlign: 'left', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg2)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => (
                    <tr key={emp.id} onClick={() => setSelectedEmp(emp)} style={{ cursor: 'pointer', background: selectedEmp?.id === emp.id ? 'rgba(201,168,76,0.06)' : 'transparent' }}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ fontWeight: 500, color: 'var(--heading)', fontSize: 13 }}>{emp.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>NI: {emp.national_insurance ?? '-'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--mute2)' }}>{emp.role_title}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <Badge variant={emp.contract_type === 'full_time' ? 'blue' : 'amber'}>{emp.contract_type === 'full_time' ? 'FT' : 'PT'}</Badge>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{gbp(emp.gross_salary)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F5365C' }}>-{gbp(emp.calculated?.paye ?? 0)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F5365C' }}>-{gbp(emp.calculated?.employee_ni ?? 0)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 13, color: '#2DCE89' }}>{gbp(emp.calculated?.net_pay ?? 0)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}><Badge variant="green">Active</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <div>
            <Panel title="Payslip Preview" style={{ marginBottom: 16 }}>
              {selectedEmp ? (
                <div>
                  <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 18, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, marginBottom: 3 }}>{workspaceName}</div>
                        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, fontWeight: 600, color: 'var(--heading)' }}>Payslip</div>
                        <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{activePeriodLabel} — {selectedEmp.full_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>TAX CODE</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--heading)' }}>{selectedEmp.tax_code ?? '1257L'}</div>
                      </div>
                    </div>
                    {[
                      ['Basic Salary', gbp(selectedEmp.gross_salary), '#2DCE89'],
                      ['Income Tax (PAYE)', `-${gbp(selectedEmp.calculated?.paye ?? 0)}`, '#F5365C'],
                      ['National Insurance (EE)', `-${gbp(selectedEmp.calculated?.employee_ni ?? 0)}`, '#F5365C'],
                      ['Pension (Employee 5%)', `-${gbp(selectedEmp.calculated?.employee_pension ?? 0)}`, '#F5365C'],
                    ].map(([label, val, color]) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: color as string }}>{val as string}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid var(--line2)', fontSize: 14, fontWeight: 600 }}>
                      <span style={{ color: 'var(--heading)' }}>Net Pay</span>
                      <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: '#2DCE89' }}>{gbp(selectedEmp.calculated?.net_pay ?? 0)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" fullWidth style={{ marginTop: 10 }} onClick={() => toast.success('Payslip PDF queued for download')}>
                    Download PDF Payslip
                  </Button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--mute)', fontSize: 13 }}>Click an employee to preview their payslip</div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'statutory' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Panel title="Statutory Pay Calculator" titleIcon="SP" iconColor="#5E9EFF">
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {(['ssp', 'smp', 'spp'] as StatType[]).map((t) => (
                <button key={t} onClick={() => setStatType(t)} style={{ padding: '6px 14px', borderRadius: 20, border: statType === t ? '1px solid var(--gold)' : '1px solid var(--line2)', background: statType === t ? 'rgba(201,168,76,0.12)' : 'transparent', color: statType === t ? 'var(--gold)' : 'var(--mute2)', fontSize: 12, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>
                  {t === 'ssp' ? 'SSP' : t === 'smp' ? 'SMP' : 'SPP'}
                </button>
              ))}
            </div>

            {statType === 'ssp' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--mute2)', marginBottom: 16, lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--heading)' }}>Statutory Sick Pay (SSP)</strong> — Rate: GBP {SSP_WEEKLY}/week for up to 28 weeks. 3 waiting days apply. Employee must earn above lower earnings limit (GBP 123/week, 2026-27).
                </div>
                <FormInput label="Weeks off sick" value={sspWeeks} onChange={setSspWeeks} placeholder="e.g. 4" />
                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--mute2)' }}>Qualifying weeks</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{Math.max(0, (parseFloat(sspWeeks) || 0) - 0.6).toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                    <span style={{ color: 'var(--heading)' }}>Total SSP Payable</span>
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#5E9EFF' }}>{gbp(sspResult)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 10, lineHeight: 1.6 }}>SSP1 form must be given to employee when SSP ends. Reclaim via EPS if small employer relief applies.</div>
              </>
            )}

            {statType === 'smp' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--mute2)', marginBottom: 16, lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--heading)' }}>Statutory Maternity Pay (SMP)</strong> — 90% of Average Weekly Earnings (AWE) for 6 weeks, then GBP {SMP_STATUTORY_WEEKLY}/week (or 90% if lower) for 33 weeks. 39 weeks total. Employee must have been employed for 26 weeks.
                </div>
                <FormInput label="Average Weekly Gross (GBP)" value={smpWeeklyGross} onChange={setSmpWeeklyGross} placeholder="e.g. 500" />
                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  {[
                    ['First 6 weeks (90% AWE)', gbp(smpResult.firstSixWeeks), '#2DCE89'],
                    ['Weeks 7–39 (statutory)', gbp(smpResult.remaining33Weeks), '#5E9EFF'],
                    ['Total SMP', gbp(smpResult.total), '#C9A84C'],
                  ].map(([label, val, color]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: color as string }}>{val as string}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 10, lineHeight: 1.6 }}>Reclaim 92% via EPS (or 103% if eligible for Small Employers' Relief). SMP1 form if employee not entitled.</div>
              </>
            )}

            {statType === 'spp' && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--mute2)', marginBottom: 16, lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--heading)' }}>Statutory Paternity Pay (SPP)</strong> — GBP {SPP_WEEKLY}/week for up to 2 weeks. Must be taken within 56 days of birth/adoption. Employee must have 26 weeks' continuous service.
                </div>
                <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                    <span style={{ color: 'var(--heading)' }}>Max SPP Payable (2 weeks)</span>
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: '#2DCE89' }}>{gbp(calcSPP())}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mute2)' }}>Rate: GBP {SPP_WEEKLY}/week × 2 weeks</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 10, lineHeight: 1.6 }}>SPP2 form if employee not entitled. ShPP available if mother/partner transfers leave under shared parental leave scheme.</div>
              </div>
            )}
          </Panel>

          <Panel title="2026-27 Statutory Rates Reference" titleIcon="REF" iconColor="#C9A84C">
            <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>STATUTORY PAY RATES</div>
            {[
              ['SSP weekly rate', `GBP ${SSP_WEEKLY}`],
              ['SSP max duration', '28 weeks'],
              ['SSP waiting days', '3 qualifying days'],
              ['SMP — first 6 weeks', '90% of AWE'],
              [`SMP — weeks 7–39`, `GBP ${SMP_STATUTORY_WEEKLY}/week`],
              ['SPP', `GBP ${SPP_WEEKLY}/week, max 2 wks`],
              ['SAP', `GBP ${SMP_STATUTORY_WEEKLY}/week, max 39 wks`],
              ['ShPP', `GBP ${SMP_STATUTORY_WEEKLY}/week`],
              ['PBP (Parental Bereavement)', `GBP ${SPP_WEEKLY}/week, max 2 wks`],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{val as string}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 10px' }}>KEY THRESHOLDS 2026-27</div>
            {[
              ['Personal Allowance', 'GBP 12,570'],
              ['Basic Rate (20%)', 'GBP 12,571 – 50,270'],
              ['Higher Rate (40%)', 'GBP 50,271 – 125,140'],
              ['NI Primary Threshold', 'GBP 12,570/yr'],
              ['NI Upper Earnings Limit', 'GBP 50,270/yr'],
              ['Employer NI Rate', '13.8% above GBP 5,000'],
              ['AE Minimum Employer', '3% of qualifying earnings'],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}>{val as string}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === 'nmw' && (
        <div>
          <Panel title="National Minimum Wage Compliance Check — 2026-27" titleIcon="NMW" iconColor={nmwBreaches.length > 0 ? '#F5365C' : '#2DCE89'} style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              {NMW_RATES.map((r) => (
                <div key={r.band} style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{r.band}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#C9A84C', fontFamily: "'Instrument Serif', serif" }}>GBP {r.hourly.toFixed(2)}/hr</div>
                </div>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Monthly Gross', 'Hrs/Week', 'Hourly Rate', 'NMW Rate', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--mute)', textAlign: 'left', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg2)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>No employees found</td></tr>
                ) : employees.map((emp: any) => {
                  const hoursPerWeek = emp.hours_per_week ?? 37.5
                  const hourlyRate = (emp.gross_salary ?? 0) / 52 / hoursPerWeek
                  const nmwRate = NMW_RATES[0].hourly
                  const passes = hourlyRate >= nmwRate
                  return (
                    <tr key={emp.id} style={{ background: passes ? 'transparent' : 'rgba(245,54,92,0.04)' }}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontWeight: 500, color: 'var(--heading)', fontSize: 13 }}>{emp.full_name}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{gbp(emp.gross_salary ?? 0)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--mute2)' }}>{hoursPerWeek}h</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: passes ? 'var(--text)' : '#F5365C' }}>GBP {hourlyRate.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--mute2)' }}>GBP {nmwRate.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <Badge variant={passes ? 'green' : 'red'}>{passes ? 'Compliant' : 'Breach Risk'}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {tab === 'p60_p11d' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Panel title="P60 — End of Year Statements" titleIcon="P60" iconColor="#C9A84C">
            <div style={{ fontSize: 12.5, color: 'var(--mute2)', marginBottom: 16, lineHeight: 1.7 }}>
              P60 statements must be issued to all employees on payroll at 5 April by <strong style={{ color: 'var(--gold)' }}>31 May 2026</strong>. They summarise total pay and deductions for the 2025-26 tax year.
            </div>
            {employees.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>No employees on payroll</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {employees.map((emp: any) => (
                  <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--heading)', fontSize: 13 }}>{emp.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace' " }}>Tax Year 2025-26 • {emp.tax_code ?? '1257L'}</div>
                    </div>
                    <Button small variant="ghost" onClick={() => toast.success(`P60 generated for ${emp.full_name}`)}>Generate P60</Button>
                  </div>
                ))}
                <Button variant="ghost" onClick={() => toast.success('All P60s queued for distribution')}>Generate All P60s</Button>
              </div>
            )}
          </Panel>

          <Panel title="P11D — Benefits in Kind" titleIcon="P11D" iconColor="#5E9EFF">
            <div style={{ fontSize: 12.5, color: 'var(--mute2)', marginBottom: 16, lineHeight: 1.7 }}>
              P11D must be submitted to HMRC by <strong style={{ color: 'var(--gold)' }}>6 July 2026</strong> for employees who received taxable benefits (company cars, private medical, loans etc.) during 2025-26.
            </div>
            <div style={{ padding: 14, background: 'rgba(94,158,255,0.06)', border: '1px solid rgba(94,158,255,0.15)', borderRadius: 8, marginBottom: 16, fontSize: 12.5, color: 'var(--mute2)', lineHeight: 1.7 }}>
              No benefits in kind have been recorded for this workspace. Add benefit records per employee to generate P11Ds.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['P11D Deadline', '6 July 2026'],
                ['P11D(b) Class 1A NI', '19 July 2026'],
                ['Class 1A NI Rate', '13.8% on total BIK value'],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}>{val as string}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" fullWidth style={{ marginTop: 14 }} onClick={() => toast.success('P11D template opened')}>Add Benefits in Kind Record</Button>
          </Panel>
        </div>
      )}

      {tab === 'history' && (
        <Panel title="Payroll Run History" noPadding>
          {runs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>No payroll runs yet</div>
          ) : runs.map((run: any) => (
            <div key={run.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace" }}>{run.reference}</div>
                <div style={{ color: 'var(--mute)', fontSize: 11 }}>{run.period}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2DCE89', fontWeight: 500 }}>{gbp(run.total_net)}</span>
                <Badge variant={run.status === 'paid' ? 'green' : 'amber'}>{run.status}</Badge>
                <Button small variant="ghost" onClick={() => toast.success('Payslips downloaded')}>Download</Button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {showRunModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 16 }}>Run Payroll</div>
            <div style={{ background: 'rgba(45,206,137,0.06)', border: '1px solid rgba(45,206,137,0.15)', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13 }}>
              {[
                ['Employees', employees.length],
                ['Total Gross', gbp(totalGross)],
                ['Approx. Net', gbp(totalNet)],
                ['Employer Total Cost', gbp(totalEmployerCost)],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--mute2)' }}>{label as string}</span>
                  <span style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{String(val)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={() => setShowRunModal(false)} fullWidth>Cancel</Button>
              <Button disabled={runMutation.isPending} fullWidth onClick={() => runMutation.mutate({ period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString(), pay_date: new Date().toISOString(), tax_period: new Date().getMonth() + 1, tax_year: currentTaxYear }, { onSuccess: () => setShowRunModal(false) })}>
                {runMutation.isPending ? 'Processing...' : 'Confirm and Run'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
