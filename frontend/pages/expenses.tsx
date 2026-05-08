import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, DataTable, Alert } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const gbp = (n: number) => `£${Number(n).toFixed(2)}`

export default function Expenses() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', filter],
    queryFn: () => api.getExpenses(filter !== 'all' ? { status: filter } : {}),
  })
  const { data: summary } = useQuery({ queryKey: ['expense-summary'], queryFn: api.getExpenseSummary })
  const { data: receipts = [] } = useQuery({ queryKey: ['receipts'], queryFn: () => api.getReceipts() })

  const uploadMutation = useMutation({
    mutationFn: api.uploadReceipt,
    onSuccess: (data) => {
      toast.success(`Receipt uploaded — OCR ${data.message}`)
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: () => toast.error('Upload failed'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) =>
      api.approveExpense(id, decision),
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

  const categoryData = [
    { category: 'Travel', amount: 840 },
    { category: 'Catering', amount: 1240 },
    { category: 'Venue', amount: 1800 },
    { category: 'Stationery', amount: 420 },
    { category: 'Equipment', amount: 380 },
    { category: 'Other', amount: 140 },
  ]

  return (
    <AppLayout
      title="Expense Management"
      subtitle="Receipt automation"
      actions={<Button onClick={() => {}}>+ Log Expense</Button>}
    >
      {summary?.pending_count > 0 && (
        <Alert variant="warning" icon="⚠">
          <strong>{summary.pending_count} receipts awaiting approval</strong> · Total: {gbp(summary.pending_amount)}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 16 }}>
        <div>
          {/* Upload zone */}
          <Panel title="Receipt Inbox — OCR Extraction" style={{ marginBottom: 16 }} action={
            <span style={{ fontSize: 12, color: '#34d399' }}>
              {receipts.length} receipts
            </span>
          }>
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? '#059669' : '#334155'}`,
                borderRadius: 12, padding: '36px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
                background: isDragActive ? 'rgba(16,185,129,0.04)' : 'transparent',
              }}
            >
              <input {...getInputProps()} />
              <div style={{ fontSize: 32, marginBottom: 12 }}>📎</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                {isDragActive ? 'Drop receipts here…' : 'Drop receipts here or click to upload'}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                JPG, PNG, PDF · AI will extract merchant, amount, date & category
              </div>
              {uploadMutation.isPending && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#34d399' }}>Uploading…</div>
              )}
            </div>

            {/* Recent OCR results */}
            {receipts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {receipts.slice(0, 3).map((r: any) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.4)', fontSize: 12,
                  }}>
                    <div style={{ width: 36, height: 36, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🧾</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.merchant ?? r.filename}</div>
                      <div style={{ color: '#64748b' }}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'} · {r.category ?? 'Uncategorised'}
                      </div>
                    </div>
                    {r.amount && <div style={{ fontFamily: 'DM Mono, monospace', color: '#34d399', fontWeight: 500 }}>{gbp(r.amount)}</div>}
                    <Badge variant={r.ocr_status === 'done' ? 'green' : r.ocr_status === 'processing' ? 'amber' : 'slate'}>
                      {r.ocr_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Expense claims table */}
          <Panel title="Expense Claims" noPadding action={
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif',
                    background: filter === f ? '#334155' : 'transparent',
                    color: filter === f ? '#f1f5f9' : '#64748b',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Claimant', 'Description', 'Category', 'Grant', 'Amount', 'Status', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #1e293b', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any) => (
                  <tr key={exp.id}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 12 }}>{exp.claimant}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(exp.expense_date).toLocaleDateString('en-GB')}</div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', color: '#cbd5e1', fontSize: 13 }}>{exp.description}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <Badge variant="blue">Expense</Badge>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748b' }}>—</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 13 }}>{gbp(exp.amount)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <Badge variant={exp.status === 'approved' ? 'green' : exp.status === 'rejected' ? 'red' : 'amber'}>
                        {exp.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      {exp.status === 'pending' && (
                        <Button
                          small
                          onClick={() => approveMutation.mutate({ id: exp.id, decision: 'approved' })}
                          disabled={approveMutation.isPending}
                        >
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => [gbp(v), '']} />
                <Bar dataKey="amount" fill="#10b981" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Quick Stats">
            {[
              ['Total claimed YTD', `£${summary?.total_approved_ytd?.toLocaleString() ?? '4,820'}`, '#e2e8f0'],
              ['Avg claim value', '£68.40', '#e2e8f0'],
              ['Pending approval', `£${summary?.pending_amount?.toFixed(2) ?? '405.10'}`, '#fbbf24'],
              ['Rejected claims', '2 (£84.20)', '#f87171'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>{label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, color }}>{val}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </AppLayout>
  )
}
