import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

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

const EMPTY_INVOICE: InvoiceRecord = {
  ref: '',
  customer: '',
  due: '',
  amount: '',
  status: 'Draft',
  variant: 'slate',
}

const EMPTY_CUSTOMER: CustomerRecord = {
  name: '',
  type: 'New Customer',
  outstanding: '£0',
  terms: 'Net 30',
  status: 'Active',
}

const INITIAL_INVOICES: InvoiceRecord[] = [
  { ref: 'INV-0042', customer: 'GMCA', due: '31 Mar 2025', amount: '£4,200.00', status: 'Overdue', variant: 'red' },
  { ref: 'INV-0043', customer: 'Rochdale MBC', due: '15 Apr 2025', amount: '£1,850.00', status: 'Sent', variant: 'blue' },
  { ref: 'INV-0044', customer: 'NLCF', due: '30 Apr 2025', amount: '£2,500.00', status: 'Draft', variant: 'slate' },
  { ref: 'INV-0045', customer: 'Sport England', due: '01 May 2025', amount: '£6,000.00', status: 'Sent', variant: 'blue' },
  { ref: 'INV-0041', customer: 'GMCA', due: '28 Feb 2025', amount: '£3,100.00', status: 'Paid', variant: 'green' },
]

const INITIAL_CUSTOMERS: CustomerRecord[] = [
  { name: 'GMCA', type: 'Public Body', outstanding: '£4,200', terms: 'Net 30', status: 'Active' },
  { name: 'Rochdale MBC', type: 'Local Authority', outstanding: '£1,850', terms: 'Net 30', status: 'Active' },
  { name: 'NLCF', type: 'Grant Funder', outstanding: '£2,500', terms: 'Net 60', status: 'Active' },
  { name: 'Sport England', type: 'Grant Funder', outstanding: '£6,000', terms: 'Net 30', status: 'Active' },
]

const invoiceVariant = (status: InvoiceStatus): InvoiceRecord['variant'] =>
  status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : status === 'Sent' ? 'blue' : 'slate'

export default function AR() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES)
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceRecord>(EMPTY_INVOICE)
  const [customerForm, setCustomerForm] = useState<CustomerRecord>(EMPTY_CUSTOMER)
  const [editingInvoiceRef, setEditingInvoiceRef] = useState<string | null>(null)
  const [editingCustomerName, setEditingCustomerName] = useState<string | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status.toLowerCase() === filter)
  const exportAr = () => downloadCsvFile('accounts-receivable.csv', filtered)

  const openInvoiceForm = (record?: InvoiceRecord) => {
    setInvoiceForm(record ?? {
      ...EMPTY_INVOICE,
      ref: `INV-${String(invoices.length + 46).padStart(4, '0')}`,
      due: '30 May 2026',
      amount: '£1,000.00',
    })
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
      setInvoices((current) => current.map((invoice) => invoice.ref === editingInvoiceRef ? next : invoice))
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
      setCustomers((current) => current.map((customer) => customer.name === editingCustomerName ? next : customer))
      setInvoices((current) => current.map((invoice) => invoice.customer === editingCustomerName ? { ...invoice, customer: next.name } : invoice))
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

  const recordReceipt = () => {
    toast.success('Receipt recorded against latest invoice batch')
  }

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
          <Button variant="ghost" onClick={exportAr}>Export</Button>
          <Button onClick={() => openInvoiceForm()}>+ New Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Outstanding" value="£14,550" change="4 invoices" icon="AR" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Overdue" value="£4,200" change="1 invoice · 32d overdue" changeUp={false} icon="!" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Due This Month" value="£1,850" change="1 invoice" icon="D" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
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
              <Button onClick={() => openInvoiceForm()}>+ New Invoice</Button>
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>Customer Register</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => openCustomerForm()}>+ Add Customer</Button>
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
          <Alert variant="warning" icon="⚡">
            <strong>DSO is 42 days</strong> — 1 invoice (£4,200) is 30+ days overdue. Credit control action recommended.
          </Alert>
          <Panel title="Aged Debtors Analysis" titleIcon="A" iconColor="#C9A84C" action={<Badge variant="slate">DSO calculated</Badge>}>
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
          <Panel title="Credit Control Actions" titleIcon="C" iconColor="#FB8C00">
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
          <Panel title="Chasing Schedule" titleIcon="S" iconColor="#5E9EFF">
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

      {showInvoiceForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>{editingInvoiceRef ? 'Edit Invoice' : 'Create Invoice'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Invoice Reference" value={invoiceForm.ref} onChange={(v) => setInvoiceForm({ ...invoiceForm, ref: v })} placeholder="INV-0046" />
              <FormInput label="Customer" value={invoiceForm.customer} onChange={(v) => setInvoiceForm({ ...invoiceForm, customer: v })} placeholder="Customer name" />
              <FormInput label="Due Date" value={invoiceForm.due} onChange={(v) => setInvoiceForm({ ...invoiceForm, due: v })} placeholder="30 May 2026" />
              <FormInput label="Amount" value={invoiceForm.amount} onChange={(v) => setInvoiceForm({ ...invoiceForm, amount: v })} placeholder="£1,000.00" />
              <FormInput label="Status" as="select" value={invoiceForm.status} onChange={(v) => setInvoiceForm({ ...invoiceForm, status: v as InvoiceStatus })}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>{editingCustomerName ? 'Edit Customer' : 'Add Customer'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Customer Name" value={customerForm.name} onChange={(v) => setCustomerForm({ ...customerForm, name: v })} placeholder="Customer name" />
              <FormInput label="Type" value={customerForm.type} onChange={(v) => setCustomerForm({ ...customerForm, type: v })} placeholder="Customer type" />
              <FormInput label="Outstanding" value={customerForm.outstanding} onChange={(v) => setCustomerForm({ ...customerForm, outstanding: v })} placeholder="£0" />
              <FormInput label="Terms" value={customerForm.terms} onChange={(v) => setCustomerForm({ ...customerForm, terms: v })} placeholder="Net 30" />
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
