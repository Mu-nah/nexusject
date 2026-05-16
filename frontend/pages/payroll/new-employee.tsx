import { useState } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Button, FormInput, Panel } from '@/components/ui'
import api from '@/lib/api'
import { formatGBP2, isValidNI, isValidTaxCode } from '@/lib/utils'

interface FormState {
  full_name: string
  email: string
  role_title: string
  national_insurance: string
  tax_code: string
  contract_type: string
  gross_salary: string
  pension_enrolled: boolean
  pension_employee_rate: string
  pension_employer_rate: string
  grant_funded: boolean
  grant_id: string
  programme_id: string
  start_date: string
}

const INITIAL: FormState = {
  full_name: '',
  email: '',
  role_title: '',
  national_insurance: '',
  tax_code: '1257L',
  contract_type: 'full_time',
  gross_salary: '',
  pension_enrolled: true,
  pension_employee_rate: '5.0',
  pension_employer_rate: '3.0',
  grant_funded: false,
  grant_id: '',
  programme_id: '',
  start_date: new Date().toISOString().split('T')[0],
}

export default function NewEmployee() {
  const router = useRouter()
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [preview, setPreview] = useState<any>(null)

  const set = (key: keyof FormState) => (val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const mutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: (data) => {
      toast.success(`Employee ${data.full_name} added - ${data.employee_number}`)
      qc.invalidateQueries({ queryKey: ['employees'] })
      router.push('/payroll')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to add employee'),
  })

  const validate = (): boolean => {
    const errs: Partial<FormState> = {}
    if (!form.full_name.trim()) errs.full_name = 'Required'
    if (!form.gross_salary || isNaN(Number(form.gross_salary))) errs.gross_salary = 'Enter a valid amount'
    if (form.national_insurance && !isValidNI(form.national_insurance)) errs.national_insurance = 'Invalid NI number'
    if (!isValidTaxCode(form.tax_code)) errs.tax_code = 'Invalid tax code'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const calculatePreview = () => {
    if (!form.gross_salary) return
    const gross = Number(form.gross_salary)
    const annualGross = gross * 12
    const personalAllowance = 12570
    const taxable = Math.max(0, annualGross - personalAllowance)
    const paye = Math.round(Math.min(taxable, 37700) * 0.2 / 12 * 100) / 100
    const empNI = annualGross > 12570 ? Math.round((Math.min(annualGross, 50270) - 12570) * 0.08 / 12 * 100) / 100 : 0
    const erNI = annualGross > 9100 ? Math.round((annualGross - 9100) * 0.138 / 12 * 100) / 100 : 0
    const qualifyingEarnings = Math.max(0, Math.min(annualGross, 50270) - 6240)
    const empPension = Math.round(qualifyingEarnings * Number(form.pension_employee_rate) / 100 / 12 * 100) / 100
    const erPension = Math.round(qualifyingEarnings * Number(form.pension_employer_rate) / 100 / 12 * 100) / 100
    setPreview({
      gross,
      paye,
      empNI,
      erNI,
      empPension,
      erPension,
      net: gross - paye - empNI - empPension,
      employerCost: gross + erNI + erPension,
    })
  }

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      full_name: form.full_name,
      email: form.email || undefined,
      role_title: form.role_title || undefined,
      national_insurance: form.national_insurance || undefined,
      tax_code: form.tax_code,
      contract_type: form.contract_type,
      gross_salary: Number(form.gross_salary),
      pension_enrolled: form.pension_enrolled,
      pension_employee_rate: Number(form.pension_employee_rate),
      pension_employer_rate: Number(form.pension_employer_rate),
      grant_funded: form.grant_funded,
      grant_id: form.grant_id ? Number(form.grant_id) : undefined,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
    })
  }

  return (
    <AppLayout
      title="Add Employee"
      subtitle="Payroll engine"
      actions={<Button variant="ghost" onClick={() => router.push('/payroll')}>Back to Payroll</Button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, maxWidth: 960 }}>
        <div>
          <Panel title="Personal Details" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormInput label="Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Sarah Johnson" />
                {errors.full_name && <div style={{ fontSize: 11, color: '#f87171', marginTop: -10, marginBottom: 10 }}>{errors.full_name}</div>}
              </div>
              <FormInput label="Email Address" value={form.email} onChange={set('email')} placeholder="name@example.com" type="email" />
              <FormInput label="Role / Job Title" value={form.role_title} onChange={set('role_title')} placeholder="e.g. Youth Worker" />
              <FormInput label="NI Number" value={form.national_insurance} onChange={set('national_insurance')} placeholder="AB 12 34 56 C" />
              {errors.national_insurance && <div style={{ fontSize: 11, color: '#f87171', marginTop: -10, marginBottom: 10 }}>{errors.national_insurance}</div>}
              <FormInput label="Tax Code" value={form.tax_code} onChange={set('tax_code')} placeholder="1257L" />
              {errors.tax_code && <div style={{ fontSize: 11, color: '#f87171', marginTop: -10, marginBottom: 10 }}>{errors.tax_code}</div>}
            </div>
          </Panel>

          <Panel title="Contract & Pay" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="Contract Type" value={form.contract_type} onChange={set('contract_type')} as="select">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="casual">Casual / Zero Hours</option>
                <option value="volunteer">Volunteer (expenses only)</option>
              </FormInput>
              <FormInput label="Start Date" value={form.start_date} onChange={set('start_date')} type="date" />
              <div style={{ gridColumn: '1 / -1' }}>
                <FormInput
                  label="Gross Monthly Salary (GBP) *"
                  value={form.gross_salary}
                  onChange={(v) => { set('gross_salary')(v); setPreview(null) }}
                  placeholder="e.g. 1800"
                  type="number"
                />
                {errors.gross_salary && <div style={{ fontSize: 11, color: '#f87171', marginTop: -10, marginBottom: 10 }}>{errors.gross_salary}</div>}
              </div>
              <Button variant="ghost" onClick={calculatePreview} style={{ gridColumn: '1/-1' }}>
                Preview Pay Calculation
              </Button>
            </div>
          </Panel>

          <Panel title="Pension & Grant Funding">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="pension" checked={form.pension_enrolled} onChange={(e) => set('pension_enrolled')(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#059669' }} />
              <label htmlFor="pension" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Enrolled in auto-enrolment pension</label>
            </div>
            {form.pension_enrolled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <FormInput label="Employee Rate %" value={form.pension_employee_rate} onChange={set('pension_employee_rate')} type="number" />
                <FormInput label="Employer Rate %" value={form.pension_employer_rate} onChange={set('pension_employer_rate')} type="number" />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="grant" checked={form.grant_funded} onChange={(e) => set('grant_funded')(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#059669' }} />
              <label htmlFor="grant" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Salary is grant-funded</label>
            </div>
            {form.grant_funded && (
              <FormInput label="Grant ID (optional)" value={form.grant_id} onChange={set('grant_id')} placeholder="e.g. 1" type="number" />
            )}
          </Panel>
        </div>

        <div>
          {preview && (
            <Panel title="Pay Calculation Preview" titleIcon="CALC" style={{ marginBottom: 16 }}>
              <Alert variant="info" icon="i">
                Estimates based on the currently configured UK payroll preview rules. Actual figures may vary.
              </Alert>
              {[
                ['Gross Pay', formatGBP2(preview.gross), '#e2e8f0'],
                ['PAYE Tax', `-${formatGBP2(preview.paye)}`, '#f87171'],
                ['Employee NI (8%)', `-${formatGBP2(preview.empNI)}`, '#f87171'],
                ['Employee Pension', `-${formatGBP2(preview.empPension)}`, '#f87171'],
                ['Net Pay', formatGBP2(preview.net), '#34d399'],
                ['Employer NI', formatGBP2(preview.erNI), '#fbbf24'],
                ['Employer Pension', formatGBP2(preview.erPension), '#fbbf24'],
                ['Total Employer Cost', formatGBP2(preview.employerCost), '#fbbf24'],
              ].map(([label, val, color], i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    fontSize: 13,
                    borderTop: [4, 7].includes(i) ? '1px solid #334155' : 'none',
                    borderBottom: i < 7 ? '1px solid rgba(51,65,85,0.4)' : 'none',
                    marginTop: [4, 7].includes(i) ? 8 : 0,
                    fontWeight: [4, 7].includes(i) ? 600 : 400,
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', color }}>{val}</span>
                </div>
              ))}
            </Panel>
          )}

          <Panel title="Ready to add?">
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
              Once added, the employee will appear in the payroll register and will be included in the next payroll run.
            </div>
            <Button
              fullWidth
              onClick={handleSubmit}
              disabled={mutation.isPending}
              style={{ marginBottom: 10 }}
            >
              {mutation.isPending ? 'Adding employee...' : '+ Add Employee'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push('/payroll')}>
              Cancel
            </Button>
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
