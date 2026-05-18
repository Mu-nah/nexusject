import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, Panel, StatCard } from '@/components/ui'
import api from '@/lib/api'

type Tab = 'claims' | 'mileage'

const money = (n: number) => `GBP ${Number(n || 0).toFixed(2)}`

// HMRC AMAP rates 2026-27
const AMAP_RATES = {
  car:        { label: 'Car / Van', first: 0.45, after: 0.25, threshold: 10000 },
  motorcycle: { label: 'Motorcycle', first: 0.24, after: 0.24, threshold: Infinity },
  bicycle:    { label: 'Bicycle', first: 0.20, after: 0.20, threshold: Infinity },
}
type VehicleType = keyof typeof AMAP_RATES
const PASSENGER_RATE = 0.05

function calcMileage(miles: number, vehicleType: VehicleType, ytdMilesBefore: number, passengers: number) {
  const rate = AMAP_RATES[vehicleType]
  const firstMilesAvailable = Math.max(0, rate.threshold - ytdMilesBefore)
  const firstMiles = Math.min(miles, firstMilesAvailable)
  const afterMiles = Math.max(0, miles - firstMilesAvailable)
  const basePay = firstMiles * rate.first + afterMiles * rate.after
  const passengerPay = miles * PASSENGER_RATE * passengers
  return { basePay, passengerPay, total: basePay + passengerPay, firstMiles, afterMiles }
}

interface MileageEntry {
  id: number; date: string; claimant: string; journey: string
  miles: number; vehicleType: VehicleType; passengers: number
  amount: number; status: 'Pending' | 'Approved' | 'Rejected'
}


export default function Expenses() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('claims')
  const [filter, setFilter] = useState('all')
  // Mileage calculator state
  const [calcMiles, setCalcMiles] = useState(0)
  const [calcVehicle, setCalcVehicle] = useState<VehicleType>('car')
  const [calcYtdMiles, setCalcYtdMiles] = useState(0)
  const [calcPassengers, setCalcPassengers] = useState(0)
  const [mileageLog, setMileageLog] = useState<MileageEntry[]>([])
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logJourney, setLogJourney] = useState('')
  const [logClaimant, setLogClaimant] = useState('')

  const calcResult = useMemo(() => calcMileage(calcMiles, calcVehicle, calcYtdMiles, calcPassengers), [calcMiles, calcVehicle, calcYtdMiles, calcPassengers])

  const addMileageEntry = () => {
    if (!logJourney.trim() || calcMiles <= 0) { toast.error('Enter journey and miles'); return }
    const entry: MileageEntry = {
      id: mileageLog.length + 100,
      date: logDate,
      claimant: logClaimant || 'You',
      journey: logJourney,
      miles: calcMiles,
      vehicleType: calcVehicle,
      passengers: calcPassengers,
      amount: calcResult.total,
      status: 'Pending',
    }
    setMileageLog(prev => [entry, ...prev])
    setLogJourney('')
    toast.success(`Mileage claim logged — ${money(calcResult.total)}`)
  }

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', filter],
    queryFn: () => api.getExpenses(filter !== 'all' ? { status: filter } : {}),
  })
  const { data: summary } = useQuery({ queryKey: ['expense-summary'], queryFn: api.getExpenseSummary })
  const { data: receipts = [] } = useQuery({ queryKey: ['receipts'], queryFn: () => api.getReceipts() })

  const uploadMutation = useMutation({
    mutationFn: api.uploadReceipt,
    onSuccess: (data) => {
      toast.success(`Receipt uploaded - OCR ${data.message}`)
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: () => toast.error('Upload failed'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) => api.approveExpense(id, decision),
    onSuccess: (_, { decision }) => {
      toast.success(`Expense ${decision}`)
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expense-summary'] })
    },
    onError: () => toast.error('Action failed'),
  })

  const onDrop = useCallback((files: File[]) => {
    files.forEach((file) => uploadMutation.mutate(file))
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
  })

  const expenses = expensesData?.items ?? []
  const rejectedExpenses = expenses.filter((expense: any) => expense.status === 'rejected')
  const avgClaimValue = expenses.length ? expenses.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0) / expenses.length : 0
  const categoryData = receipts
    .filter((receipt: any) => receipt.category && receipt.amount)
    .reduce((acc: Array<{ category: string; amount: number }>, receipt: any) => {
      const existing = acc.find((item) => item.category === receipt.category)
      if (existing) {
        existing.amount += Number(receipt.amount || 0)
      } else {
        acc.push({ category: receipt.category, amount: Number(receipt.amount || 0) })
      }
      return acc
    }, [])

  return (
    <AppLayout title="Expense Management" subtitle="Receipt automation · HMRC mileage" actions={<Button onClick={() => {}}>+ Log Expense</Button>}>
      {!expenses.length && !receipts.length && tab === 'claims' && (
        <Alert variant="info" icon="i">This workspace has no expense claims or receipt uploads yet.</Alert>
      )}
      {summary?.pending_count > 0 && tab === 'claims' && (
        <Alert variant="warning" icon="!"><strong>{summary.pending_count} receipts awaiting approval</strong> | Total: {money(summary.pending_amount)}</Alert>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap', marginTop: 8 }}>
        {([{ key: 'claims', label: 'Expense Claims' }, { key: 'mileage', label: 'Mileage Calculator' }] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5, background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent', color: tab === t.key ? 'var(--gold)' : 'var(--mute)', fontWeight: tab === t.key ? 600 : 400, fontFamily: "'Instrument Sans', sans-serif" }}>{t.label}</button>
        ))}
      </div>

      {tab === 'claims' && <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <div>
          <Panel
            title="Receipt Inbox - OCR Extraction"
            style={{ marginBottom: 16 }}
            action={<span style={{ fontSize: 12, color: '#34d399' }}>{receipts.length} receipts</span>}
          >
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? '#059669' : '#334155'}`,
                borderRadius: 12,
                padding: '36px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isDragActive ? 'rgba(16,185,129,0.04)' : 'transparent',
              }}
            >
              <input {...getInputProps()} />
              <div style={{ fontSize: 32, marginBottom: 12 }}>Upload</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                {isDragActive ? 'Drop receipts here...' : 'Drop receipts here or click to upload'}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>JPG, PNG, PDF | AI will extract merchant, amount, date and category</div>
              {uploadMutation.isPending && <div style={{ marginTop: 12, fontSize: 12, color: '#34d399' }}>Uploading...</div>}
            </div>

            {receipts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {receipts.slice(0, 3).map((receipt: any) => (
                  <div
                    key={receipt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(51,65,85,0.4)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ width: 36, height: 36, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>FILE</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{receipt.merchant ?? receipt.filename}</div>
                      <div style={{ color: '#64748b' }}>{receipt.date ? new Date(receipt.date).toLocaleDateString('en-GB') : '-'} | {receipt.category ?? 'Uncategorised'}</div>
                    </div>
                    {receipt.amount && <div style={{ fontFamily: 'DM Mono, monospace', color: '#34d399', fontWeight: 500 }}>{money(receipt.amount)}</div>}
                    <Badge variant={receipt.ocr_status === 'done' ? 'green' : receipt.ocr_status === 'processing' ? 'amber' : 'slate'}>{receipt.ocr_status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Expense Claims"
            noPadding
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'pending', 'approved', 'rejected'].map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                      background: filter === value ? '#334155' : 'transparent',
                      color: filter === value ? '#f1f5f9' : '#64748b',
                    }}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            }
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Claimant', 'Description', 'Category', 'Grant', 'Amount', 'Status', 'Action'].map((heading) => (
                    <th key={heading} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #1e293b', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense: any) => (
                  <tr key={expense.id}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 12 }}>{expense.claimant}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(expense.expense_date).toLocaleDateString('en-GB')}</div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', color: '#cbd5e1', fontSize: 13 }}>{expense.description}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}><Badge variant="blue">Expense</Badge></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748b' }}>-</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 13 }}>{money(expense.amount)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <Badge variant={expense.status === 'approved' ? 'green' : expense.status === 'rejected' ? 'red' : 'amber'}>{expense.status}</Badge>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      {expense.status === 'pending' && (
                        <Button small onClick={() => approveMutation.mutate({ id: expense.id, decision: 'approved' })} disabled={approveMutation.isPending}>
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div>
          <Panel title="Spend by Category" style={{ marginBottom: 16 }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `GBP ${v}`} />
                  <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => [money(v), '']} />
                  <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#64748b' }}>
                Category spend will appear after receipts are uploaded and categorised.
              </div>
            )}
          </Panel>

          <Panel title="Quick Stats">
            {[
              ['Total claimed YTD', `${summary?.total_approved_ytd?.toLocaleString() ?? '0'}`, '#e2e8f0'],
              ['Avg claim value', money(avgClaimValue), '#e2e8f0'],
              ['Pending approval', money(summary?.pending_amount ?? 0), '#fbbf24'],
              ['Rejected claims', `${rejectedExpenses.length} (${money(rejectedExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0))})`, '#f87171'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>{label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, color }}>{value}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>}

      {tab === 'mileage' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Mileage Claimed" value={`${mileageLog.reduce((s, e) => s + e.miles, 0).toLocaleString()} mi`} change="this financial year" accentColor="#C9A84C" />
            <StatCard label="Total Reimbursement" value={money(mileageLog.reduce((s, e) => s + e.amount, 0))} change="all claims" accentColor="#2DCE89" />
            <StatCard label="Pending Claims" value={String(mileageLog.filter(e => e.status === 'Pending').length)} change={money(mileageLog.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0))} accentColor="#FB8C00" />
            <StatCard label="HMRC Rate (Car)" value="45p / 25p" change="per mile (first 10k / after)" accentColor="#5E9EFF" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginBottom: 14 }}>
            <Panel title="HMRC Mileage Calculator" titleIcon="MI" iconColor="#C9A84C">
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>Vehicle Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.entries(AMAP_RATES) as [VehicleType, typeof AMAP_RATES.car][]).map(([k, v]) => (
                    <button key={k} onClick={() => setCalcVehicle(k)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${calcVehicle === k ? '#C9A84C' : 'var(--line)'}`, background: calcVehicle === k ? 'rgba(201,168,76,0.12)' : 'var(--surface-muted)', color: calcVehicle === k ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }}>{v.label}</button>
                  ))}
                </div>
              </div>

              {(['Miles Driven', 'YTD Miles (before this trip)', 'Passengers'] as const).map((label, i) => {
                const vals = [calcMiles, calcYtdMiles, calcPassengers]
                const setters = [setCalcMiles, setCalcYtdMiles, setCalcPassengers]
                return (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type="number" min="0" value={vals[i]} onChange={(e) => setters[i](Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
                  </div>
                )
              })}

              <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />

              <div style={{ padding: '12px 14px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Calculation Result</div>
                {[
                  ['Miles @ first rate', `${calcResult.firstMiles} mi × ${(AMAP_RATES[calcVehicle].first * 100).toFixed(0)}p`, money(calcResult.firstMiles * AMAP_RATES[calcVehicle].first)],
                  ...(calcResult.afterMiles > 0 ? [['Miles @ reduced rate', `${calcResult.afterMiles} mi × ${(AMAP_RATES[calcVehicle].after * 100).toFixed(0)}p`, money(calcResult.afterMiles * AMAP_RATES[calcVehicle].after)]] : []),
                  ...(calcPassengers > 0 ? [['Passenger supplement', `${calcMiles} mi × 5p × ${calcPassengers}`, money(calcResult.passengerPay)]] : []),
                ].map(([label, detail, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--text)' }}>{label} <span style={{ color: 'var(--mute)', fontSize: 11 }}>({detail})</span></span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700 }}>
                  <span style={{ color: 'var(--heading)', fontSize: 14 }}>HMRC Approved Amount</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: '#C9A84C' }}>{money(calcResult.total)}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Log Mileage Claim" titleIcon="LG" iconColor="#5E9EFF">
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>Claimant</label>
                <input value={logClaimant} onChange={(e) => setLogClaimant(e.target.value)} placeholder="Your name" style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'Instrument Sans', sans-serif", fontSize: 12.5 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 5 }}>Journey Description</label>
                <input value={logJourney} onChange={(e) => setLogJourney(e.target.value)} placeholder="e.g. Office → Partner site (Bristol)" style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'Instrument Sans', sans-serif", fontSize: 12.5 }} />
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: 'var(--mute)' }}>Amount from calculator</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#C9A84C' }}>{money(calcResult.total)}</span>
              </div>
              <Button fullWidth onClick={addMileageEntry} disabled={calcMiles <= 0 || !logJourney.trim()}>Log Mileage Claim</Button>

              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>HMRC AMAP Rates 2026-27</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11.5 }}>
                  {[
                    ['Cars / Vans', '45p (first 10,000 mi)', '25p (after)'],
                    ['Motorcycles', '24p per mile', ''],
                    ['Bicycles', '20p per mile', ''],
                    ['Passenger', '+5p per passenger', ''],
                  ].map(([type, rate, after]) => (
                    <>
                      <span key={`${type}-t`} style={{ color: 'var(--heading)', fontWeight: 500 }}>{type}</span>
                      <span key={`${type}-r`} style={{ color: '#C9A84C', fontFamily: "'JetBrains Mono', monospace" }}>{rate}</span>
                      <span key={`${type}-a`} style={{ color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>{after}</span>
                    </>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Mileage Log" titleIcon="ML" iconColor="#C9A84C" noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Date', 'Claimant', 'Journey', 'Miles', 'Vehicle', 'Passengers', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mileageLog.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute)', fontSize: 11.5 }}>{new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)' }}>{e.claimant}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--mute)', maxWidth: 200 }}>{e.journey}</td>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{e.miles}</td>
                      <td style={{ padding: '12px 14px' }}><Badge variant="blue">{AMAP_RATES[e.vehicleType].label}</Badge></td>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--mute)' }}>{e.passengers || '—'}</td>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{money(e.amount)}</td>
                      <td style={{ padding: '12px 14px' }}><Badge variant={e.status === 'Approved' ? 'green' : e.status === 'Rejected' ? 'red' : 'amber'}>{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
