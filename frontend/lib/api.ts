import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

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

  async listAdminUsers() {
    return (await this.client.get('/admin/users')).data
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

  async inviteWorkspaceUser(data: { email: string; full_name: string; role: string }) {
    return (await this.client.post('/admin/users/invite', data)).data
  }

  logout() {
    localStorage.removeItem('erp_token')
    window.location.href = '/login'
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  async getFinancialSummary() {
    return (await this.client.get('/dashboard/financial-summary')).data
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

  async getDonationsDashboard() {
    return (await this.client.get('/dashboard/donations')).data
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
    return (await this.client.get('/reports')).data
  }

  async getReport(reportId: number) {
    return (await this.client.get(`/reports/${reportId}`)).data
  }

  async getSharedReport(shareToken: string) {
    return (await this.client.get(`/reports/shared/${shareToken}`)).data
  }

  async createShareLink(reportId: number) {
    return (await this.client.post(`/reports/${reportId}/share`)).data
  }

  async emailShareReport(reportId: number, data: { email: string; recipient_name?: string }) {
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
