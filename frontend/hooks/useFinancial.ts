import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// ── Dashboard hooks ───────────────────────────────────────────────────────────

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: api.getFinancialSummary,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
  })
}

export function useCashflow(months = 12) {
  return useQuery({
    queryKey: ['cashflow', months],
    queryFn: () => api.getCashflow(months),
  })
}

export function useGrantsDashboard() {
  return useQuery({
    queryKey: ['grants-dashboard'],
    queryFn: api.getGrantsDashboard,
  })
}

export function useDonationsDashboard() {
  return useQuery({
    queryKey: ['donations-dashboard'],
    queryFn: api.getDonationsDashboard,
  })
}

export function useProgrammeCosts() {
  return useQuery({
    queryKey: ['programme-costs'],
    queryFn: api.getProgrammeCosts,
  })
}

// ── Accounting hooks ──────────────────────────────────────────────────────────

export function useAccounts(type?: string) {
  return useQuery({
    queryKey: ['accounts', type],
    queryFn: () => api.getAccounts(type),
  })
}

export function useTransactions(params?: any) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.getTransactions(params),
  })
}

export function useJournalEntries(params?: any) {
  return useQuery({
    queryKey: ['journal-entries', params],
    queryFn: () => api.getJournalEntries(params),
  })
}

export function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting-summary'],
    queryFn: api.getAccountingSummary,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      toast.success('Account created')
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to create account'),
  })
}

// ── Expenses hooks ────────────────────────────────────────────────────────────

export function useExpenses(params?: any) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => api.getExpenses(params),
  })
}

export function useReceipts(status?: string) {
  return useQuery({
    queryKey: ['receipts', status],
    queryFn: () => api.getReceipts(status),
    refetchInterval: 15000, // poll every 15s for OCR status updates
  })
}

export function useExpenseSummary() {
  return useQuery({
    queryKey: ['expense-summary'],
    queryFn: api.getExpenseSummary,
  })
}

export function useApproveExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: string; notes?: string }) =>
      api.approveExpense(id, decision, notes),
    onSuccess: (_, { decision }) => {
      toast.success(`Expense ${decision}`)
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expense-summary'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
    },
    onError: () => toast.error('Action failed'),
  })
}

export function useUploadReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.uploadReceipt,
    onSuccess: () => {
      toast.success('Receipt uploaded — OCR processing started')
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: () => toast.error('Upload failed'),
  })
}

// ── Payroll hooks ─────────────────────────────────────────────────────────────

export function useEmployees(activeOnly = true) {
  return useQuery({
    queryKey: ['employees', activeOnly],
    queryFn: () => api.getEmployees(activeOnly),
  })
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll-runs'],
    queryFn: api.getPayrollRuns,
  })
}

export function usePayslips(employeeId?: number) {
  return useQuery({
    queryKey: ['payslips', employeeId],
    queryFn: () => api.getPayslips(employeeId!),
    enabled: !!employeeId,
  })
}

export function useRunPayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.runPayroll,
    onSuccess: (data) => {
      toast.success(`Payroll run ${data.reference} complete — ${data.employee_count} employees`)
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Payroll run failed'),
  })
}

export function useCreateEmployeeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createEmployee,
    onSuccess: (data) => {
      toast.success(`Employee ${data.full_name} added`)
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to add employee'),
  })
}

// ── Grants hooks ──────────────────────────────────────────────────────────────

export function useGrants(status?: string) {
  return useQuery({
    queryKey: ['grants', status],
    queryFn: () => api.getGrants(status),
  })
}

export function useGrantSpending(grantId?: number) {
  return useQuery({
    queryKey: ['grant-spending', grantId],
    queryFn: () => api.getGrantSpending(grantId!),
    enabled: !!grantId,
  })
}

export function useGrantsSummary() {
  return useQuery({
    queryKey: ['grants-summary'],
    queryFn: api.getGrantsSummary,
  })
}

export function useGenerateGrantReport() {
  return useMutation({
    mutationFn: ({ grantId, start, end }: { grantId: number; start: string; end: string }) =>
      api.aiGrantReport(grantId, start, end),
    onSuccess: () => toast.success('Grant report generated'),
    onError: () => toast.error('Report generation failed'),
  })
}

// ── Donations hooks ───────────────────────────────────────────────────────────

export function useDonations(params?: any) {
  return useQuery({
    queryKey: ['donations', params],
    queryFn: () => api.getDonations(params),
  })
}

export function useDonors(params?: any) {
  return useQuery({
    queryKey: ['donors', params],
    queryFn: () => api.getDonors(params),
  })
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: api.getCampaigns,
  })
}

export function useGiftAidSummary() {
  return useQuery({
    queryKey: ['gift-aid'],
    queryFn: api.getGiftAidSummary,
  })
}

// ── AI hooks ──────────────────────────────────────────────────────────────────

export function useAIChat() {
  return useMutation({
    mutationFn: ({ message, history }: { message: string; history: any[] }) =>
      api.aiChat(message, history),
    onError: () => toast.error('AI service unavailable — check your API key'),
  })
}

export function useAITrusteeReport() {
  return useMutation({
    mutationFn: (quarter?: string) => api.aiTrusteeReport(quarter),
    onSuccess: () => toast.success('Trustee report generated'),
    onError: () => toast.error('Report generation failed'),
  })
}

export function useAIFinancialAnalysis() {
  return useMutation({
    mutationFn: (focus: string) => api.aiFinancialAnalysis(focus),
    onSuccess: () => toast.success('Analysis complete'),
    onError: () => toast.error('Analysis failed'),
  })
}
