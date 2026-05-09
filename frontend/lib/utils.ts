// ── Currency formatting ───────────────────────────────────────────────────────

export const formatGBP = (amount: number, decimals = 0): string =>
  `£${Math.abs(amount).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${amount < 0 ? ' CR' : ''}`

export const formatGBP2 = (amount: number): string =>
  `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatPct = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`

export const formatMono = (amount: number): string =>
  amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })

// ── Date formatting ───────────────────────────────────────────────────────────

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

export const formatMonth = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

export const isOverdue = (iso: string): boolean => daysUntil(iso) < 0

export const currentTaxYear = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const isAfterApril6 = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
  return isAfterApril6 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`
}

// ── UK validation helpers ─────────────────────────────────────────────────────

export const isValidNI = (ni: string): boolean =>
  /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i.test(ni.replace(/\s/g, ''))

export const isValidSortCode = (code: string): boolean =>
  /^\d{2}-\d{2}-\d{2}$/.test(code)

export const isValidTaxCode = (code: string): boolean =>
  /^\d{1,4}[LMNPTY]$/i.test(code.trim()) || ['BR', 'D0', 'D1', 'NT', '0T', 'K'].some(c => code.startsWith(c))

export const formatSortCode = (code: string): string => {
  const digits = code.replace(/\D/g, '')
  return digits.length === 6
    ? `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`
    : code
}

// ── Financial calculations ────────────────────────────────────────────────────

export const calcCashRunway = (cashBalance: number, monthlyBurn: number): number | null => {
  if (!monthlyBurn || monthlyBurn <= 0) return null
  return Math.round((cashBalance / monthlyBurn) * 10) / 10
}

export const calcUtilisationPct = (spent: number, budget: number): number =>
  budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0

export const calcGiftAid = (donationAmount: number): number =>
  Math.round(donationAmount * 0.25 * 100) / 100

export const calcVolunteerValue = (hours: number, hourlyRate = 15.60): number =>
  Math.round(hours * hourlyRate * 100) / 100

// ── Status helpers ────────────────────────────────────────────────────────────

export type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate'

export const utilisationBadge = (pct: number): BadgeVariant => {
  if (pct > 95) return 'red'
  if (pct > 80) return 'amber'
  return 'green'
}

export const utilisationColor = (pct: number): string => {
  if (pct > 95) return '#ef4444'
  if (pct > 80) return '#f59e0b'
  return '#10b981'
}

export const deadlineBadge = (daysRemaining: number): BadgeVariant => {
  if (daysRemaining < 0) return 'red'
  if (daysRemaining <= 14) return 'red'
  if (daysRemaining <= 45) return 'amber'
  return 'green'
}

export const deadlineLabel = (daysRemaining: number): string => {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d overdue`
  if (daysRemaining === 0) return 'Due today'
  if (daysRemaining === 1) return 'Due tomorrow'
  if (daysRemaining <= 7) return `${daysRemaining}d`
  return `${daysRemaining}d`
}

export const contractTypeLabel = (type: string): string => ({
  full_time: 'FT',
  part_time: 'PT',
  casual: 'CAS',
  volunteer: 'VOL',
}[type] ?? type)

export const roleLabel = (role: string): string => ({
  cfo: 'CFO',
  finance_manager: 'Finance Manager',
  programme_manager: 'Programme Manager',
  hr_manager: 'HR',
  compliance_manager: 'Compliance',
  admin: 'Administrator',
  viewer: 'Viewer',
}[role] ?? role)

// ── Array helpers ─────────────────────────────────────────────────────────────

export const sumBy = <T>(arr: T[], key: keyof T): number =>
  arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

export const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> =>
  arr.reduce((acc, item) => {
    const k = String(item[key])
    return { ...acc, [k]: [...(acc[k] ?? []), item] }
  }, {} as Record<string, T[]>)
