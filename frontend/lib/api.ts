import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { DashboardPeriodMode } from '@/lib/store'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    })

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('erp_token') : null
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('erp_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )

    // Bind instance methods so they remain safe when passed directly to React Query.
    const proto = Object.getPrototypeOf(this) as Record<string, unknown>
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue
      const value = (this as Record<string, unknown>)[key]
      if (typeof value === 'function') {
        ;(this as Record<string, unknown>)[key] = value.bind(this)
      }
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const form = new FormData()
    form.append('username', email)
    form.append('password', password)
    const res = await this.client.post('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    localStorage.setItem('erp_token', res.data.access_token)
    return res.data
  }

  async googleAuth(data: {
    code: string
    redirect_uri?: string
    organisation_name?: string
    organisation_type?: string
    country?: string
    currency?: string
  }) {
    const res = await this.client.post('/auth/google', data)
    localStorage.setItem('erp_token', res.data.access_token)
    return res.data
  }

  async register(data: {
    email: string
    full_name: string
    password: string
    organisation_name: string
    organisation_type: string
    country: string
    currency: string
  }) {
    const res = await this.client.post('/auth/register', data)
    localStorage.setItem('erp_token', res.data.access_token)
    return res.data
  }

  async acceptInvite(data: { token: string; password: string }) {
    const res = await this.client.post('/auth/accept-invite', data)
    localStorage.setItem('erp_token', res.data.access_token)
    return res.data
  }

  async getMe() {
    return (await this.client.get('/auth/me')).data
  }

  async listAdminUsers(params?: { invited_by_me?: boolean }) {
    return (await this.client.get('/admin/users', { params })).data
  }

  async getWorkspace() {
    return (await this.client.get('/admin/workspace')).data
  }

  async updateWorkspace(data: {
    name?: string
    legal_type?: string
    charity_number?: string
    companies_house_number?: string
    address?: string
    email?: string
    phone?: string
    country?: string
    currency?: string
  }) {
    return (await this.client.patch('/admin/workspace', data)).data
  }

  async listWorkspaceInvites() {
    return (await this.client.get('/admin/invites')).data
  }

  async getAccessMonitor() {
    return (await this.client.get('/admin/access-monitor')).data
  }

  async cleanupWorkspaceDemoData() {
    return (await this.client.post('/admin/workspace/cleanup-demo-data')).data
  }

  async inviteWorkspaceUser(data: { email: string; full_name: string; role: string; module_access?: string[] }) {
    return (await this.client.post('/admin/users/invite', data)).data
  }

  async updateWorkspaceUserAccess(userId: number, data: { role?: string; is_active?: boolean; module_access?: string[] }) {
    return (await this.client.patch(`/admin/users/${userId}/access`, data)).data
  }

  logout() {
    localStorage.removeItem('erp_token')
    window.location.href = '/login'
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  async getFinancialSummary(periodMode: DashboardPeriodMode = 'normal') {
    return (await this.client.get('/dashboard/financial-summary', { params: { period_mode: periodMode } })).data
  }

  async getCashflow(months = 12) {
    return (await this.client.get(`/dashboard/cashflow?months=${months}`)).data
  }

  async getGrantsDashboard() {
    return (await this.client.get('/dashboard/grants')).data
  }

  async getProgrammeCosts() {
    return (await this.client.get('/dashboard/programme-cost')).data
  }

  async getDonationsDashboard(periodMode: DashboardPeriodMode = 'normal') {
    return (await this.client.get('/dashboard/donations', { params: { period_mode: periodMode } })).data
  }

  async getPlanningCashflow() {
    return (await this.client.get('/planning/cashflow')).data
  }

  async getPlanningBudgets() {
    return (await this.client.get('/planning/budgets')).data
  }

  async getVolunteersWorkspace() {
    return (await this.client.get('/ops/volunteers')).data
  }

  async createVolunteer(data: any) {
    return (await this.client.post('/ops/volunteers', data)).data
  }

  async updateVolunteer(id: number, data: any) {
    return (await this.client.put(`/ops/volunteers/${id}`, data)).data
  }

  async createVolunteerHours(data: any) {
    return (await this.client.post('/ops/volunteer-hours', data)).data
  }

  async updateVolunteerHours(id: number, data: any) {
    return (await this.client.put(`/ops/volunteer-hours/${id}`, data)).data
  }

  async getGovernanceWorkspace() {
    return (await this.client.get('/ops/governance')).data
  }

  async createTrustee(data: any) {
    return (await this.client.post('/ops/governance/trustees', data)).data
  }

  async updateTrustee(id: number, data: any) {
    return (await this.client.put(`/ops/governance/trustees/${id}`, data)).data
  }

  async getUkviWorkspace() {
    return (await this.client.get('/ops/ukvi')).data
  }

  async createUkviWorker(data: any) {
    return (await this.client.post('/ops/ukvi/workers', data)).data
  }

  async updateUkviWorker(id: number, data: any) {
    return (await this.client.put(`/ops/ukvi/workers/${id}`, data)).data
  }

  async createUkviCos(data: any) {
    return (await this.client.post('/ops/ukvi/cos', data)).data
  }

  async updateUkviCos(id: number, data: any) {
    return (await this.client.put(`/ops/ukvi/cos/${id}`, data)).data
  }

  async reportUkviDuty(id: number, note?: string) {
    return (await this.client.post(`/ops/ukvi/duties/${id}/report`, null, { params: note ? { note } : undefined })).data
  }

  async getHrWorkspace() {
    return (await this.client.get('/ops/hr')).data
  }

  async approveHrLeave(id: number) {
    return (await this.client.post(`/ops/hr/leave/${id}/approve`)).data
  }

  async renewHrRtw(id: number) {
    return (await this.client.post(`/ops/hr/rtw/${id}/renew`)).data
  }

  async createHrReview(data: any) {
    return (await this.client.post('/ops/hr/reviews', data)).data
  }

  async createHrContract(data: any) {
    return (await this.client.post('/ops/hr/contracts', data)).data
  }

  // ── Accounting ──────────────────────────────────────────────────────────────
  async getAccounts(type?: string) {
    const q = type ? `?account_type=${type}` : ''
    return (await this.client.get(`/accounting/accounts${q}`)).data
  }

  async createAccount(data: any) {
    return (await this.client.post('/accounting/accounts', data)).data
  }

  async getTransactions(params?: any) {
    return (await this.client.get('/accounting/transactions', { params })).data
  }

  async createTransaction(data: any) {
    return (await this.client.post('/accounting/transactions', data)).data
  }

  async createJournalEntry(data: any) {
    return (await this.client.post('/accounting/journal-entry', data)).data
  }

  async getJournalEntries(params?: any) {
    return (await this.client.get('/accounting/journal-entries', { params })).data
  }

  async getBankAccounts() {
    return (await this.client.get('/accounting/bank-accounts')).data
  }

  async getAccountingSummary() {
    return (await this.client.get('/accounting/summary')).data
  }

  // ── Expenses ────────────────────────────────────────────────────────────────
  async uploadReceipt(file: File) {
    const form = new FormData()
    form.append('file', file)
    return (await this.client.post('/expenses/receipts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data
  }

  async getReceipts(status?: string) {
    const q = status ? `?status=${status}` : ''
    return (await this.client.get(`/expenses/receipts${q}`)).data
  }

  async getExpenses(params?: any) {
    return (await this.client.get('/expenses', { params })).data
  }

  async createExpense(data: any) {
    return (await this.client.post('/expenses', data)).data
  }

  async approveExpense(id: number, decision: string, notes?: string) {
    return (await this.client.post(`/expenses/${id}/approve`, { decision, notes })).data
  }

  async getExpenseSummary() {
    return (await this.client.get('/expenses/summary')).data
  }

  // ── Payroll ─────────────────────────────────────────────────────────────────
  async getEmployees(activeOnly = true) {
    return (await this.client.get(`/payroll/employees?active_only=${activeOnly}`)).data
  }

  async createEmployee(data: any) {
    return (await this.client.post('/payroll/employees', data)).data
  }

  async runPayroll(data: any) {
    return (await this.client.post('/payroll/run', data)).data
  }

  async getPayrollRuns() {
    return (await this.client.get('/payroll/runs')).data
  }

  async getPayslips(employeeId: number) {
    return (await this.client.get(`/payroll/payslips/${employeeId}`)).data
  }

  async downloadPayslipPdf(employeeId: number, runId: number) {
    return await this.client.get(`/payroll/payslip/${employeeId}/${runId}/pdf`, {
      responseType: 'blob'
    })
  }

  async getPayrollSummary() {
    return (await this.client.get('/payroll/summary')).data
  }

  // ── Grants ──────────────────────────────────────────────────────────────────
  async getGrants(status?: string) {
    const q = status ? `?status=${status}` : ''
    return (await this.client.get(`/grants${q}`)).data
  }

  async createGrant(data: any) {
    return (await this.client.post('/grants', data)).data
  }

  async getGrantSpending(id: number) {
    return (await this.client.get(`/grants/${id}/spending`)).data
  }

  async allocateGrant(id: number, data: any) {
    return (await this.client.post(`/grants/${id}/allocate`, data)).data
  }

  async generateAiGrantReport(id: number, periodStart: string, periodEnd: string) {
    return (await this.client.post(`/grants/${id}/ai-report?period_start=${periodStart}&period_end=${periodEnd}`)).data
  }

  async getProgrammes() {
    return (await this.client.get('/grants/programmes/list')).data
  }

  async createProgramme(data: {
    name: string
    description?: string
    total_budget?: number
    target_participants?: number
    start_date?: string
    end_date?: string
  }) {
    return (await this.client.post('/grants/programmes', data)).data
  }

  async getGrantsSummary() {
    return (await this.client.get('/grants/summary')).data
  }

  // ── Donations ───────────────────────────────────────────────────────────────
  async getDonors(params?: any) {
    return (await this.client.get('/donations/donors', { params })).data
  }

  async createDonor(data: any) {
    return (await this.client.post('/donations/donors', data)).data
  }

  async getDonations(params?: any) {
    return (await this.client.get('/donations', { params })).data
  }

  async createDonation(data: any) {
    return (await this.client.post('/donations', data)).data
  }

  async getCampaigns() {
    return (await this.client.get('/donations/campaigns')).data
  }

  async getGiftAidSummary() {
    return (await this.client.get('/donations/gift-aid/summary')).data
  }

  // ── AI ──────────────────────────────────────────────────────────────────────
  async aiChat(message: string, history: Array<{role: string; content: string}> = []) {
    return (await this.client.post('/ai/assistant', {
      message,
      conversation_history: history,
    }, { timeout: 90000 })).data
  }

  async aiFinancialAnalysis(focus: string = 'general') {
    return (await this.client.post('/ai/financial-analysis', { focus }, { timeout: 90000 })).data
  }

  async aiCashflowForecast(monthsAhead: number = 6) {
    return (await this.client.post('/ai/cashflow-forecast', { months_ahead: monthsAhead }, { timeout: 90000 })).data
  }

  async aiGrantReport(grantId: number, periodStart: string, periodEnd: string) {
    return (await this.client.post('/ai/grant-report', {
      grant_id: grantId,
      period_start: periodStart,
      period_end: periodEnd,
    }, { timeout: 90000 })).data
  }

  async aiTrusteeReport(quarter?: string) {
    return (await this.client.post(`/ai/trustee-report${quarter ? `?quarter=${quarter}` : ''}`, {}, { timeout: 90000 })).data
  }

  async aiProgrammeCostAnalysis(programmeId: number) {
    return (await this.client.post('/ai/programme-cost-analysis', { programme_id: programmeId })).data
  }

  async listReports() {
    return (await this.client.get('/reports', { timeout: 90000 })).data
  }

  async getReport(reportId: number) {
    return (await this.client.get(`/reports/${reportId}`)).data
  }

  async deleteReport(reportId: number) {
    return (await this.client.delete(`/reports/${reportId}`)).data
  }

  async getSharedReport(shareToken: string, email?: string) {
    return (await this.client.get(`/reports/shared/${shareToken}`, {
      params: email ? { email } : undefined,
    })).data
  }

  async downloadSharedReportPdf(shareToken: string, email?: string) {
    return await this.client.get(`/reports/shared/${shareToken}/pdf`, {
      params: email ? { email } : undefined,
      responseType: 'blob',
    })
  }

  async createShareLink(reportId: number, data?: { access_mode?: 'anyone_with_link' | 'specific_email'; allowed_email?: string }) {
    return (await this.client.post(`/reports/${reportId}/share`, data ?? {})).data
  }

  async emailShareReport(reportId: number, data: { email: string; recipient_name?: string; access_mode?: 'anyone_with_link' | 'specific_email' }) {
    return (await this.client.post(`/reports/${reportId}/email-share`, data)).data
  }

  async downloadReportPdf(reportId: number) {
    return await this.client.get(`/reports/${reportId}/pdf`, {
      responseType: 'blob',
    })
  }
}

export const api = new ApiClient()
export default api
