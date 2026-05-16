import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'

type Tab = 'invoices' | 'customers' | 'aged' | 'receipts' | 'credit'
type InvoiceStatus = 'Draft' | 'Sent' | 'Overdue' | 'Paid'

type InvoiceRecord = {
  ref: string
  customer: string
  due: string
  amount: string
  status: InvoiceStatus
  variant: 'slate' | 'blue' | 'red' | 'green'
}

type CustomerRecord = {
  name: string
  type: string
  outstanding: string
  terms: string
  status: string
}

type ReceiptAllocationRow = {
  date: string
  customer: string
  ref: string
  amount: string
  status: string
}

type CreditActionRow = {
  customer: string
  amount: string
  action: string
  aVariant: 'amber' | 'red' | 'green' | 'blue' | 'slate'
}

const money = (value: number) =>
  `GBP ${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const EMPTY_INVOICE: InvoiceRecord = { ref: '', customer: '', due: '', amount: '', status: 'Draft', variant: 'slate' }
const EMPTY_CUSTOMER: CustomerRecord = { name: '', type: 'New Customer', outstanding: 'GBP 0', terms: 'Net 30', status: 'Active' }

const invoiceVariant = (status: InvoiceStatus): InvoiceRecord['variant'] =>
  status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : status === 'Sent' ? 'blue' : 'slate'

const parseAmount = (value: string) => Number(value.replace(/[^0-9.-]/g, '') || 0)

export default function AR() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceRecord>(EMPTY_INVOICE)
  const [customerForm, setCustomerForm] = useState<CustomerRecord>(EMPTY_CUSTOMER)
  const [editingInvoiceRef, setEditingInvoiceRef] = useState<string | null>(null)
  const [editingCustomerName, setEditingCustomerName] = useState<string | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status.toLowerCase() === filter)
  const exportAr = () => downloadCsvFile('accounts-receivable.csv', filtered)

  const outstandingInvoices = invoices.filter((invoice) => invoice.status !== 'Paid')
  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'Overdue')
  const sentInvoices = invoices.filter((invoice) => invoice.status === 'Sent')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid')

  const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const dueThisMonth = sentInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const collectedYtd = paidInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)

  const openInvoiceForm = (record?: InvoiceRecord) => {
    setInvoiceForm(record ?? { ...EMPTY_INVOICE, ref: `INV-${String(invoices.length + 1).padStart(4, '0')}`, due: '30 May 2026', amount: 'GBP 1,000.00' })
    setEditingInvoiceRef(record?.ref ?? null)
    setShowInvoiceForm(true)
  }

  const saveInvoice = () => {
    if (!invoiceForm.ref.trim() || !invoiceForm.customer.trim() || !invoiceForm.amount.trim() || !invoiceForm.due.trim()) {
      toast.error('Complete the invoice details before saving')
      return
    }

    const next = { ...invoiceForm, variant: invoiceVariant(invoiceForm.status) }
    if (editingInvoiceRef) {
      setInvoices((current) => current.map((invoice) => (invoice.ref === editingInvoiceRef ? next : invoice)))
      toast.success(`Invoice ${next.ref} updated`)
    } else {
      setInvoices((current) => [next, ...current])
      toast.success('Invoice saved')
    }

    setShowInvoiceForm(false)
    setEditingInvoiceRef(null)
    setInvoiceForm(EMPTY_INVOICE)
  }

  const deleteInvoice = (ref: string) => {
    setInvoices((current) => current.filter((invoice) => invoice.ref !== ref))
    toast.success(`Invoice ${ref} deleted`)
  }

  const openCustomerForm = (record?: CustomerRecord) => {
    setCustomerForm(record ?? EMPTY_CUSTOMER)
    setEditingCustomerName(record?.name ?? null)
    setShowCustomerForm(true)
  }

  const saveCustomer = () => {
    if (!customerForm.name.trim()) {
      toast.error('Enter a customer name first')
      return
    }

    const next = { ...customerForm }
    if (editingCustomerName) {
      setCustomers((current) => current.map((customer) => (customer.name === editingCustomerName ? next : customer)))
      setInvoices((current) => current.map((invoice) => (invoice.customer === editingCustomerName ? { ...invoice, customer: next.name } : invoice)))
      toast.success('Customer updated')
    } else {
      setCustomers((current) => [next, ...current])
      toast.success('Customer added')
    }

    setShowCustomerForm(false)
    setEditingCustomerName(null)
    setCustomerForm(EMPTY_CUSTOMER)
  }

  const deleteCustomer = (name: string) => {
    setCustomers((current) => current.filter((customer) => customer.name !== name))
    toast.success(`Customer ${name} deleted`)
  }

  const agedRows = useMemo(() => {
    const grouped = new Map<string, { customer: string; current: number; d30: number; d60: number; over90: number; total: number }>()
    outstandingInvoices.forEach((invoice) => {
      const amount = parseAmount(invoice.amount)
      const existing = grouped.get(invoice.customer) ?? { customer: invoice.customer, current: 0, d30: 0, d60: 0, over90: 0, total: 0 }
      if (invoice.status === 'Overdue') {
        existing.d30 += amount
      } else {
        existing.current += amount
      }
      existing.total += amount
      grouped.set(invoice.customer, existing)
    })
    return Array.from(grouped.values()).map((row) => ({
      customer: row.customer,
      current: row.current ? money(row.current) : '-',
      d30: row.d30 ? money(row.d30) : '-',
      d60: row.d60 ? money(row.d60) : '-',
      over90: row.over90 ? money(row.over90) : '-',
      total: money(row.total),
    }))
  }, [outstandingInvoices])

  const receiptRows: ReceiptAllocationRow[] = []
  const creditRows: CreditActionRow[] = overdueInvoices.map((invoice) => ({
    customer: invoice.customer,
    amount: invoice.amount,
    action: 'Reminder',
    aVariant: 'amber',
  }))

  return (
    <AppLayout
      title="AR & Invoicing"
      subtitle="Accounts Receivable"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportAr}>Export</Button>
          <Button onClick={() => openInvoiceForm()}>+ New Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Outstanding" value={money(totalOutstanding)} change={`${outstandingInvoices.length} invoices`} icon="AR" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Overdue" value={money(overdueTotal)} change={`${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? '' : 's'} overdue`} changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Due This Month" value={money(dueThisMonth)} change={`${sentInvoices.length} invoice${sentInvoices.length === 1 ? '' : 's'}`} icon="D" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="Collected YTD" value={money(collectedYtd)} change={collectedYtd > 0 ? 'Collected from paid invoices' : 'No receipts recorded yet'} changeUp={collectedYtd > 0} icon="GBP" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {!invoices.length && !customers.length && (
        <Alert variant="info" icon="i">
          This workspace has no invoices or customers yet. Create your first invoice to start tracking receivables.
        </Alert>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {(['invoices', 'customers', 'aged', 'receipts', 'credit'] as Tab[]).map((section) => (
          <button
            key={section}
            onClick={() => setTab(section)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              background: 'none',
              borderBottom: tab === section ? '2px solid #C9A84C' : '2px solid transparent',
              color: tab === section ? 'var(--gold)' : 'var(--mute)',
              fontWeight: tab === section ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {section === 'aged' ? 'Aged Debtors' : section === 'credit' ? 'Credit Control' : section}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Sales Invoices</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line2)', color: 'var(--text)', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
              <Button onClick={() => openInvoiceForm()}>+ New Invoice</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Reference', mono: true },
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.customer}</span> },
                { key: 'due', header: 'Due Date' },
                { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{row.amount}</span> },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button small variant="ghost" onClick={() => openInvoiceForm(row as InvoiceRecord)}>Edit</Button>
                      <Button small variant="ghost" onClick={() => deleteInvoice(row.ref)} style={{ color: '#F87171' }}>Delete</Button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
            />
          </Panel>
        </>
      )}

      {tab === 'customers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Customer Register</div>
            <Button onClick={() => openCustomerForm()}>+ Add Customer</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.name}</span> },
                { key: 'type', header: 'Type', render: (row) => <Badge variant="slate">{row.type}</Badge> },
                { key: 'outstanding', header: 'Outstanding', align: 'right', mono: true },
                { key: 'terms', header: 'Terms' },
                { key: 'status', header: 'Status', render: (row) => <Badge variant="green">{row.status}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button small variant="ghost" onClick={() => openCustomerForm(row as CustomerRecord)}>Edit</Button>
                      <Button small variant="ghost" onClick={() => deleteCustomer(row.name)} style={{ color: '#F87171' }}>Delete</Button>
                    </div>
                  ),
                },
              ]}
              data={customers}
            />
          </Panel>
        </>
      )}

      {tab === 'aged' && (
        <>
          <Alert variant={agedRows.length ? 'warning' : 'info'} icon={agedRows.length ? '!' : 'i'}>
            {agedRows.length ? <strong>Overdue receivables need follow-up.</strong> : <strong>No open receivables yet.</strong>} {agedRows.length ? 'Review credit control actions below.' : 'Aged debtor analysis will appear once invoices are raised.'}
          </Alert>
          <Panel title="Aged Debtors Analysis" titleIcon="A" iconColor="#C9A84C" action={<Badge variant="slate">{agedRows.length ? 'DSO calculated' : 'Awaiting data'}</Badge>}>
            <DataTable
              columns={[
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.customer}</span> },
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Receipt Allocation</div>
            <Button onClick={() => toast.success('Receipt recording will connect to live AR workflows next')}>+ Record Receipt</Button>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'date', header: 'Date', mono: true },
                { key: 'customer', header: 'From', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.customer}</span> },
                { key: 'ref', header: 'Invoice Ref', mono: true },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: (row) => <Badge variant="green">{row.status}</Badge> },
              ]}
              data={receiptRows}
            />
          </Panel>
        </>
      )}

      {tab === 'credit' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Panel title="Credit Control Actions" titleIcon="C" iconColor="#FB8C00">
            <DataTable
              columns={[
                { key: 'customer', header: 'Customer', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.customer}</span> },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'action', header: 'Action', render: (row) => <Badge variant={row.aVariant as any}>{row.action}</Badge> },
              ]}
              data={creditRows}
            />
          </Panel>
          <Panel title="Chasing Schedule" titleIcon="S" iconColor="#5E9EFF">
            {[
              { step: '1st Reminder', trigger: '7 days overdue', method: 'Email', color: '#5E9EFF' },
              { step: '2nd Reminder', trigger: '14 days overdue', method: 'Email + Phone', color: '#FB8C00' },
              { step: 'Final Notice', trigger: '30 days overdue', method: 'Formal letter', color: '#F5365C' },
            ].map((step) => (
              <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{step.step}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{step.trigger} | {step.method}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {showInvoiceForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 20 }}>{editingInvoiceRef ? 'Edit Invoice' : 'Create Invoice'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Invoice Reference" value={invoiceForm.ref} onChange={(value) => setInvoiceForm({ ...invoiceForm, ref: value })} placeholder="INV-0001" />
              <FormInput label="Customer" value={invoiceForm.customer} onChange={(value) => setInvoiceForm({ ...invoiceForm, customer: value })} placeholder="Customer name" />
              <FormInput label="Due Date" value={invoiceForm.due} onChange={(value) => setInvoiceForm({ ...invoiceForm, due: value })} placeholder="30 May 2026" />
              <FormInput label="Amount" value={invoiceForm.amount} onChange={(value) => setInvoiceForm({ ...invoiceForm, amount: value })} placeholder="GBP 1,000.00" />
              <FormInput label="Status" as="select" value={invoiceForm.status} onChange={(value) => setInvoiceForm({ ...invoiceForm, status: value as InvoiceStatus })}>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Overdue">Overdue</option>
                <option value="Paid">Paid</option>
              </FormInput>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowInvoiceForm(false); setEditingInvoiceRef(null); setInvoiceForm(EMPTY_INVOICE) }}>Cancel</Button>
              <Button fullWidth onClick={saveInvoice}>Save Invoice</Button>
            </div>
          </div>
        </div>
      )}

      {showCustomerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 20 }}>{editingCustomerName ? 'Edit Customer' : 'Add Customer'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Customer Name" value={customerForm.name} onChange={(value) => setCustomerForm({ ...customerForm, name: value })} placeholder="Customer name" />
              <FormInput label="Type" value={customerForm.type} onChange={(value) => setCustomerForm({ ...customerForm, type: value })} placeholder="Customer type" />
              <FormInput label="Outstanding" value={customerForm.outstanding} onChange={(value) => setCustomerForm({ ...customerForm, outstanding: value })} placeholder="GBP 0" />
              <FormInput label="Terms" value={customerForm.terms} onChange={(value) => setCustomerForm({ ...customerForm, terms: value })} placeholder="Net 30" />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowCustomerForm(false); setEditingCustomerName(null); setCustomerForm(EMPTY_CUSTOMER) }}>Cancel</Button>
              <Button fullWidth onClick={saveCustomer}>Save Customer</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
