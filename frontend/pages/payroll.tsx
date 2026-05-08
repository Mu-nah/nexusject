import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, DataTable, Alert, FormInput } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const gbp = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Payroll() {
  const router = useRouter()
  const qc = useQueryClient()
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [showRunModal, setShowRunModal] = useState(false)

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: api.getEmployees,
  })

  const { data: runs = [] } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: api.getPayrollRuns,
  })

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips', selectedEmp?.id],
    queryFn: () => api.getPayslips(selectedEmp.id),
    enabled: !!selectedEmp,
  })

  const runMutation = useMutation({
    mutationFn: api.runPayroll,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      toast.success(`Payroll run ${data.reference} complete — ${data.employee_count} employees, net ${gbp(data.total_net)}`)
      setShowRunModal(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Payroll run failed'),
  })

  const totalGross = employees.reduce((s: number, e: any) => s + (e.gross_salary ?? 0), 0)
  const totalNet = employees.reduce((s: number, e: any) => s + (e.calculated?.net_pay ?? 0), 0)
  const totalEmployerCost = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_total_cost ?? 0), 0)
  const totalEmployerNI = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_ni ?? 0), 0)
  const totalPension = employees.reduce((s: number, e: any) => s + (e.calculated?.employer_pension ?? 0), 0)

  return (
    <AppLayout
      title="Payroll Engine"
      subtitle="2024-25"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">RTI to HMRC</Button>
          <Button onClick={() => setShowRunModal(true)}>▶ Run Payroll</Button>
        </div>
      }
    >
      <Alert variant="info" icon="ℹ">
        March payroll run scheduled for <strong>28 March 2025</strong>. PAYE/NI submissions due to HMRC by <strong>19 April</strong>.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Monthly Gross" value={gbp(totalGross)} change={`${employees.length} employees`} accentColor="#10b981" />
        <StatCard label="Employer NI" value={gbp(totalEmployerNI)} change="13.8% on qualifying" accentColor="#f59e0b" />
        <StatCard label="Employer Pension" value={gbp(totalPension)} change="3% AE contributions" accentColor="#3b82f6" />
        <StatCard label="Total Employer Cost" value={gbp(totalEmployerCost)} change="incl. NI + pension" accentColor="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        {/* Employee table */}
        <Panel title="Employee Register" noPadding action={
          <Button small onClick={() => router.push('/payroll/new-employee')}>+ Add Employee</Button>
        }>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading employees…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Role', 'Contract', 'Gross', 'PAYE', 'Emp NI', 'Net Pay', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #1e293b', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f172a', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    style={{ cursor: 'pointer', background: selectedEmp?.id === emp.id ? 'rgba(16,185,129,0.06)' : 'transparent' }}
                  >
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{emp.full_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                        NI: {emp.national_insurance ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)', fontSize: 12, color: '#94a3b8' }}>{emp.role_title}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                      <Badge variant={emp.contract_type === 'full_time' ? 'blue' : 'amber'}>
                        {emp.contract_type === 'full_time' ? 'FT' : 'PT'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)', fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 13 }}>{gbp(emp.gross_salary)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#f87171' }}>-{gbp(emp.calculated?.paye ?? 0)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#f87171' }}>-{gbp(emp.calculated?.employee_ni ?? 0)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)', fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 13, color: '#34d399' }}>{gbp(emp.calculated?.net_pay ?? 0)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                      <Badge variant="green">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Payslip preview */}
        <div>
          <Panel title="Payslip Preview" style={{ marginBottom: 16 }}>
            {selectedEmp ? (
              <div>
                <div style={{ background: '#1e293b', borderRadius: 10, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: '1px solid #334155', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>
                        Harvest Touch Youth & Skills CIC
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                        Payslip
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        March 2025 · {selectedEmp.full_name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>TAX CODE</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{selectedEmp.tax_code ?? '1257L'}</div>
                    </div>
                  </div>
                  {[
                    ['Basic Salary', gbp(selectedEmp.gross_salary), '#34d399'],
                    ['Income Tax (PAYE)', `-${gbp(selectedEmp.calculated?.paye ?? 0)}`, '#f87171'],
                    ['National Insurance (EE)', `-${gbp(selectedEmp.calculated?.employee_ni ?? 0)}`, '#f87171'],
                    ['Pension (Employee 5%)', `-${gbp(selectedEmp.calculated?.employee_pension ?? 0)}`, '#f87171'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(51,65,85,0.4)', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>{label}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid #475569', fontSize: 14, fontWeight: 600 }}>
                    <span style={{ color: '#f1f5f9' }}>Net Pay</span>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#34d399' }}>
                      {gbp(selectedEmp.calculated?.net_pay ?? 0)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" fullWidth style={{ marginTop: 12 }}>↓ Download PDF Payslip</Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>
                Click an employee to preview their payslip
              </div>
            )}
          </Panel>

          {/* Payroll run history */}
          <Panel title="Run History" noPadding>
            {runs.slice(0, 4).map((run: any) => (
              <div key={run.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#e2e8f0', fontFamily: 'DM Mono, monospace' }}>{run.reference}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{run.period}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', color: '#34d399', fontWeight: 500 }}>{gbp(run.total_net)}</div>
                  <Badge variant={run.status === 'paid' ? 'green' : 'amber'}>{run.status}</Badge>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      {/* Run payroll modal */}
      {showRunModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>
              Run March Payroll
            </div>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Employees</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'DM Mono, monospace' }}>{employees.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Total Gross</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'DM Mono, monospace' }}>{gbp(totalGross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Approx. Net</span>
                <span style={{ color: '#34d399', fontFamily: 'DM Mono, monospace' }}>{gbp(totalNet)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Employer Total Cost</span>
                <span style={{ color: '#fbbf24', fontFamily: 'DM Mono, monospace' }}>{gbp(totalEmployerCost)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={() => setShowRunModal(false)} fullWidth>Cancel</Button>
              <Button
                onClick={() => runMutation.mutate({
                  period_start: '2025-03-01T00:00:00',
                  period_end: '2025-03-31T23:59:59',
                  pay_date: '2025-03-28T00:00:00',
                  tax_period: 12,
                  tax_year: '2024-25',
                })}
                disabled={runMutation.isPending}
                fullWidth
              >
                {runMutation.isPending ? 'Processing…' : '▶ Confirm & Run'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
