import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = 'invoices' | 'suppliers' | 'aged' | 'payments' | 'po'

const SUP_INVOICES = [
  { ref: 'SUP-0128', supplier: 'Manchester Catering Co', due: '20 Mar 2025', amount: '£124.00', status: 'Pending Approval', variant: 'amber' },
  { ref: 'SUP-0129', supplier: 'Rochdale Venue Hire', due: '25 Mar 2025', amount: '£200.00', status: 'Approved', variant: 'green' },
  { ref: 'SUP-0130', supplier: 'BT Business', due: '01 Apr 2025', amount: '£89.50', status: 'Pending Approval', variant: 'amber' },
  { ref: 'SUP-0127', supplier: 'Paragon Print', due: '10 Mar 2025', amount: '£340.00', status: 'Paid', variant: 'green' },
  { ref: 'SUP-0126', supplier: 'Office Supplies Ltd', due: '05 Mar 2025', amount: '£67.20', status: 'Paid', variant: 'green' },
]

const SUPPLIERS = [
  { name: 'Manchester Catering Co', category: 'Catering', terms: 'Net 30', outstanding: '£124.00', status: 'Active' },
  { name: 'Rochdale Venue Hire', category: 'Facilities', terms: 'Net 30', outstanding: '£200.00', status: 'Active' },
  { name: 'BT Business', category: 'Utilities', terms: 'Net 14', outstanding: '£89.50', status: 'Active' },
  { name: 'Paragon Print', category: 'Marketing', terms: 'Net 30', outstanding: '—', status: 'Active' },
]

export default function AP() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? SUP_INVOICES : SUP_INVOICES.filter(i => i.status.toLowerCase().includes(filter))

  return (
    <AppLayout
      title="AP & Suppliers"
      subtitle="Accounts Payable"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>+ Log Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Payable" value="£413.50" change="3 invoices outstanding" icon="⊜" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Approval" value="£213.50" change="2 invoices" changeUp={false} icon="⊟" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Due This Week" value="£200.00" change="1 invoice" icon="◷" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Paid YTD" value="£24,180" change="↑ 6% vs prior year" changeUp icon="£" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'invoices', label: 'Supplier Invoices' },
          { key: 'suppliers', label: 'Suppliers' },
          { key: 'aged', label: 'Aged Creditors' },
          { key: 'payments', label: 'Payment Runs' },
          { key: 'po', label: 'Purchase Orders' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Supplier Invoices</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{
                background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', color: '#C8D3E8',
                borderRadius: 7, padding: '6px 12px', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif",
              }}>
                <option value="all">All</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
              <Button>+ Log Invoice</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Reference', mono: true },
                { key: 'supplier', header: 'Supplier', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.supplier}</span> },
                { key: 'due', header: 'Due Date' },
                { key: 'amount', header: 'Amount', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{r.amount}</span> },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.variant as any}>{r.status}</Badge> },
                { key: 'actions', header: '', render: (r) => r.status === 'Pending Approval'
                  ? <Button small>Approve</Button>
                  : <Button small variant="ghost">View</Button>
                },
              ]}
              data={filtered}
            />
          </Panel>
        </>
      )}

      {tab === 'suppliers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Supplier Register</div>
            <Button>+ Add Supplier</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Supplier', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.name}</span> },
                { key: 'category', header: 'Category', render: r => <Badge variant="slate">{r.category}</Badge> },
                { key: 'terms', header: 'Terms' },
                { key: 'outstanding', header: 'Outstanding', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: r => <Badge variant="green">{r.status}</Badge> },
              ]}
              data={SUPPLIERS}
            />
          </Panel>
        </>
      )}

      {tab === 'aged' && (
        <Panel title="Aged Creditors Analysis" titleIcon="◈" iconColor="#C9A84C" action={<Badge variant="slate">DPO calculated</Badge>}>
          <DataTable
            columns={[
              { key: 'supplier', header: 'Supplier', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.supplier}</span> },
              { key: 'current', header: 'Current', align: 'right', mono: true },
              { key: 'd30', header: '31–60d', align: 'right', mono: true },
              { key: 'd60', header: '61–90d', align: 'right', mono: true },
              { key: 'total', header: 'Total', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{r.total}</span> },
            ]}
            data={[
              { supplier: 'Manchester Catering Co', current: '£124.00', d30: '—', d60: '—', total: '£124.00' },
              { supplier: 'Rochdale Venue Hire', current: '£200.00', d30: '—', d60: '—', total: '£200.00' },
              { supplier: 'BT Business', current: '£89.50', d30: '—', d60: '—', total: '£89.50' },
            ]}
          />
        </Panel>
      )}

      {tab === 'payments' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Payment Runs</div>
            <Button>▶ Run Payment Batch</Button>
          </div>
          <Alert variant="info" icon="ℹ">Approved invoices ready for payment. Verify bank details before executing payment run.</Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Run Reference', mono: true },
                { key: 'date', header: 'Date' },
                { key: 'count', header: 'Invoices' },
                { key: 'total', header: 'Total', align: 'right', render: r => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2DCE89' }}>{r.total}</span> },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.variant as any}>{r.status}</Badge> },
              ]}
              data={[
                { ref: 'PAY-0022', date: '01 Mar 2025', count: '5', total: '£1,248.00', status: 'Completed', variant: 'green' },
                { ref: 'PAY-0021', date: '01 Feb 2025', count: '4', total: '£892.50', status: 'Completed', variant: 'green' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'po' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Purchase Orders</div>
            <Button>+ Create PO</Button>
          </div>
          <Alert variant="info" icon="ℹ">3-way matching: PO → Goods Receipt → Invoice. Auto-flags mismatches for approval.</Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'PO Number', mono: true },
                { key: 'supplier', header: 'Supplier', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.supplier}</span> },
                { key: 'desc', header: 'Description' },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.variant as any}>{r.status}</Badge> },
              ]}
              data={[
                { ref: 'PO-0055', supplier: 'Manchester Catering Co', desc: 'Skills Workshop Catering', amount: '£124.00', status: 'Matched', variant: 'green' },
                { ref: 'PO-0056', supplier: 'Rochdale Venue Hire', desc: 'April Venue Booking', amount: '£200.00', status: 'Open', variant: 'blue' },
              ]}
            />
          </Panel>
        </>
      )}
    </AppLayout>
  )
}
