import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'invoices' | 'customers' | 'aged' | 'receipts' | 'credit'

const INITIAL_INVOICES = [
  { ref: 'INV-0042', customer: 'GMCA', due: '31 Mar 2025', amount: '£4,200.00', status: 'Overdue', variant: 'red' },
  { ref: 'INV-0043', customer: 'Rochdale MBC', due: '15 Apr 2025', amount: '£1,850.00', status: 'Sent', variant: 'blue' },
  { ref: 'INV-0044', customer: 'NLCF', due: '30 Apr 2025', amount: '£2,500.00', status: 'Draft', variant: 'slate' },
  { ref: 'INV-0045', customer: 'Sport England', due: '01 May 2025', amount: '£6,000.00', status: 'Sent', variant: 'blue' },
  { ref: 'INV-0041', customer: 'GMCA', due: '28 Feb 2025', amount: '£3,100.00', status: 'Paid', variant: 'green' },
]

const INITIAL_CUSTOMERS = [
  { name: 'GMCA', type: 'Public Body', outstanding: '£4,200', terms: 'Net 30', status: 'Active' },
  { name: 'Rochdale MBC', type: 'Local Authority', outstanding: '£1,850', terms: 'Net 30', status: 'Active' },
  { name: 'NLCF', type: 'Grant Funder', outstanding: '£2,500', terms: 'Net 60', status: 'Active' },
  { name: 'Sport England', type: 'Grant Funder', outstanding: '£6,000', terms: 'Net 30', status: 'Active' },
]

export default function AR() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [invoices, setInvoices] = useState(INITIAL_INVOICES)
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS)

  const filtered = filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status.toLowerCase() === filter)
  const exportAr = () => downloadCsvFile('accounts-receivable.csv', filtered)

  const addInvoice = () => {
    const ref = invoiceRef.trim() || `INV-${String(invoices.length + 46).padStart(4, '0')}`
    setInvoices((current) => [
      { ref, customer: customerName.trim() || 'New Customer', due: '30 May 2026', amount: '£1,000.00', status: 'Draft', variant: 'slate' },
      ...current,
    ])
    setInvoiceRef('')
    setCustomerName('')
    toast.success('Invoice draft created')
  }

  const addCustomer = () => {
    if (!customerName.trim()) {
      toast.error('Enter a customer name first')
      return
    }
    setCustomers((current) => [
      { name: customerName.trim(), type: 'New Customer', outstanding: '£0', terms: 'Net 30', status: 'Active' },
      ...current,
    ])
    setCustomerName('')
    toast.success('Customer added')
  }

  const recordReceipt = () => {
    toast.success('Receipt recorded against latest invoice batch')
  }

  const viewInvoice = (ref: string) => toast.success(`Opened invoice ${ref}`)

  const agedRows = useMemo(() => [
    { customer: 'GMCA', current: '—', d30: '£4,200', d60: '—', over90: '—', total: '£4,200' },
    { customer: 'Rochdale MBC', current: '£1,850', d30: '—', d60: '—', over90: '—', total: '£1,850' },
    { customer: 'NLCF', current: '£8,500', d30: '—', d60: '—', over90: '—', total: '£8,500' },
  ], [])

  return (
    <AppLayout
      title="AR & Invoicing"
      subtitle="Accounts Receivable"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportAr}>↓ Export</Button>
          <Button onClick={addInvoice}>+ New Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Outstanding" value="£14,550" change="4 invoices" icon="⊛" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Overdue" value="£4,200" change="1 invoice · 32d overdue" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Due This Month" value="£1,850" change="1 invoice" icon="◷" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Collected YTD" value="£38,200" change="↑ 22% vs prior year" changeUp icon="£" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {(['invoices', 'customers', 'aged', 'receipts', 'credit'] as Tab[]).map((section) => (
          <button key={section} onClick={() => setTab(section)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === section ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === section ? '#E8C56A' : '#5C6B84', fontWeight: tab === section ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif", textTransform: 'capitalize',
          }}>
            {section === 'aged' ? 'Aged Debtors' : section === 'credit' ? 'Credit Control' : section}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Sales Invoices</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} style={{ background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', color: '#C8D3E8', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
              <div style={{ minWidth: 150 }}><FormInput value={invoiceRef} onChange={setInvoiceRef} placeholder="Invoice ref" /></div>
              <div style={{ minWidth: 170 }}><FormInput value={customerName} onChange={setCustomerName} placeholder="Customer" /></div>
              <Button onClick={addInvoice}>+ New Invoice</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Reference', mono: true },
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.customer}</span> },
                { key: 'due', header: 'Due Date' },
                { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C8D3E8' }}>{row.amount}</span> },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
                { key: 'actions', header: '', render: (row) => <Button small variant="ghost" onClick={() => viewInvoice(row.ref)}>View</Button> },
              ]}
              data={filtered}
            />
          </Panel>
        </>
      )}

      {tab === 'customers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Customer Register</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200 }}><FormInput value={customerName} onChange={setCustomerName} placeholder="Customer name" /></div>
              <Button onClick={addCustomer}>+ Add Customer</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.name}</span> },
                { key: 'type', header: 'Type', render: (row) => <Badge variant="slate">{row.type}</Badge> },
                { key: 'outstanding', header: 'Outstanding', align: 'right', mono: true },
                { key: 'terms', header: 'Terms' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant="green">{row.status}</Badge> },
              ]}
              data={customers}
            />
          </Panel>
        </>
      )}

      {tab === 'aged' && (
        <>
          <Alert variant="warning" icon="⚡">
            <strong>DSO is 42 days</strong> — 1 invoice (£4,200) is 30+ days overdue. Credit control action recommended.
          </Alert>
          <Panel title="Aged Debtors Analysis" titleIcon="◇" iconColor="#C9A84C" action={<Badge variant="slate">DSO calculated</Badge>}>
            <DataTable
              columns={[
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.customer}</span> },
                { key: 'current', header: 'Current', align: 'right', mono: true },
                { key: 'd30', header: '31-60d', align: 'right', mono: true },
                { key: 'd60', header: '61-90d', align: 'right', mono: true },
                { key: 'over90', header: '90d+', align: 'right', mono: true },
                { key: 'total', header: 'Total', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{row.total}</span> },
              ]}
              data={agedRows}
            />
          </Panel>
        </>
      )}

      {tab === 'receipts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Receipt Allocation</div>
            <Button onClick={recordReceipt}>+ Record Receipt</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'date', header: 'Date', mono: true },
                { key: 'customer', header: 'From', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.customer}</span> },
                { key: 'ref', header: 'Invoice Ref', mono: true },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: (row) => <Badge variant="green">{row.status}</Badge> },
              ]}
              data={[
                { date: '15 Mar', customer: 'GMCA', ref: 'INV-0038', amount: '£3,800.00', status: 'Allocated' },
                { date: '10 Mar', customer: 'Sport England', ref: 'INV-0039', amount: '£5,200.00', status: 'Allocated' },
                { date: '05 Mar', customer: 'NLCF', ref: 'INV-0040', amount: '£6,400.00', status: 'Allocated' },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'credit' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Panel title="Credit Control Actions" titleIcon="⊟" iconColor="#FB8C00">
            <DataTable
              columns={[
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{row.customer}</span> },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'action', header: 'Action', render: (row) => <Badge variant={row.aVariant as any}>{row.action}</Badge> },
              ]}
              data={[
                { customer: 'GMCA', amount: '£4,200', action: 'Final Notice', aVariant: 'red' },
                { customer: 'Rochdale MBC', amount: '£1,850', action: 'Reminder', aVariant: 'amber' },
              ]}
            />
          </Panel>
          <Panel title="Chasing Schedule" titleIcon="◷" iconColor="#5E9EFF">
            {[
              { step: '1st Reminder', trigger: '7 days overdue', method: 'Email', color: '#5E9EFF' },
              { step: '2nd Reminder', trigger: '14 days overdue', method: 'Email + Phone', color: '#FB8C00' },
              { step: 'Final Notice', trigger: '30 days overdue', method: 'Formal letter', color: '#F5365C' },
            ].map((step) => (
              <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#C8D3E8' }}>{step.step}</div>
                  <div style={{ fontSize: 11, color: '#5C6B84' }}>{step.trigger} · {step.method}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </AppLayout>
  )
}
