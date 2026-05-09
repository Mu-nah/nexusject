import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard, FormInput } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'invoices' | 'suppliers' | 'aged' | 'payments' | 'po'
type InvoiceStatus = 'Pending Approval' | 'Approved' | 'Paid'

type InvoiceRecord = {
  ref: string
  supplier: string
  due: string
  amount: string
  status: InvoiceStatus
  variant: 'amber' | 'green'
}

type SupplierRecord = {
  name: string
  category: string
  terms: string
  outstanding: string
  status: string
}

const EMPTY_INVOICE: InvoiceRecord = {
  ref: '',
  supplier: '',
  due: '',
  amount: '',
  status: 'Pending Approval',
  variant: 'amber',
}

const EMPTY_SUPPLIER: SupplierRecord = {
  name: '',
  category: 'New Supplier',
  terms: 'Net 30',
  outstanding: '£0.00',
  status: 'Active',
}

const INITIAL_INVOICES: InvoiceRecord[] = [
  { ref: 'SUP-0128', supplier: 'Manchester Catering Co', due: '20 Mar 2025', amount: '£124.00', status: 'Pending Approval', variant: 'amber' },
  { ref: 'SUP-0129', supplier: 'Rochdale Venue Hire', due: '25 Mar 2025', amount: '£200.00', status: 'Approved', variant: 'green' },
  { ref: 'SUP-0130', supplier: 'BT Business', due: '01 Apr 2025', amount: '£89.50', status: 'Pending Approval', variant: 'amber' },
  { ref: 'SUP-0127', supplier: 'Paragon Print', due: '10 Mar 2025', amount: '£340.00', status: 'Paid', variant: 'green' },
  { ref: 'SUP-0126', supplier: 'Office Supplies Ltd', due: '05 Mar 2025', amount: '£67.20', status: 'Paid', variant: 'green' },
]

const INITIAL_SUPPLIERS: SupplierRecord[] = [
  { name: 'Manchester Catering Co', category: 'Catering', terms: 'Net 30', outstanding: '£124.00', status: 'Active' },
  { name: 'Rochdale Venue Hire', category: 'Facilities', terms: 'Net 30', outstanding: '£200.00', status: 'Active' },
  { name: 'BT Business', category: 'Utilities', terms: 'Net 14', outstanding: '£89.50', status: 'Active' },
  { name: 'Paragon Print', category: 'Marketing', terms: 'Net 30', outstanding: '—', status: 'Active' },
]

export default function AP() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES)
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(INITIAL_SUPPLIERS)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceRecord>(EMPTY_INVOICE)
  const [supplierForm, setSupplierForm] = useState<SupplierRecord>(EMPTY_SUPPLIER)
  const [editingInvoiceRef, setEditingInvoiceRef] = useState<string | null>(null)
  const [editingSupplierName, setEditingSupplierName] = useState<string | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status.toLowerCase().includes(filter))
  const exportPayables = () => downloadCsvFile('accounts-payable.csv', filtered)

  const openInvoiceForm = (record?: InvoiceRecord) => {
    setInvoiceForm(record ?? {
      ...EMPTY_INVOICE,
      ref: `SUP-${String(invoices.length + 131).padStart(4, '0')}`,
      due: '31 May 2026',
      amount: '£150.00',
    })
    setEditingInvoiceRef(record?.ref ?? null)
    setShowInvoiceForm(true)
  }

  const saveInvoice = () => {
    if (!invoiceForm.ref.trim() || !invoiceForm.supplier.trim() || !invoiceForm.amount.trim() || !invoiceForm.due.trim()) {
      toast.error('Complete the invoice details before saving')
      return
    }

    const next = { ...invoiceForm, variant: invoiceForm.status === 'Pending Approval' ? 'amber' : 'green' as 'amber' | 'green' }
    if (editingInvoiceRef) {
      setInvoices((current) => current.map((invoice) => invoice.ref === editingInvoiceRef ? next : invoice))
      toast.success(`Invoice ${next.ref} updated`)
    } else {
      setInvoices((current) => [next, ...current])
      toast.success('Supplier invoice logged')
    }

    setShowInvoiceForm(false)
    setEditingInvoiceRef(null)
    setInvoiceForm(EMPTY_INVOICE)
  }

  const deleteInvoice = (ref: string) => {
    setInvoices((current) => current.filter((invoice) => invoice.ref !== ref))
    toast.success(`Invoice ${ref} deleted`)
  }

  const openSupplierForm = (record?: SupplierRecord) => {
    setSupplierForm(record ?? EMPTY_SUPPLIER)
    setEditingSupplierName(record?.name ?? null)
    setShowSupplierForm(true)
  }

  const saveSupplier = () => {
    if (!supplierForm.name.trim()) {
      toast.error('Enter a supplier name first')
      return
    }

    const next = { ...supplierForm }
    if (editingSupplierName) {
      setSuppliers((current) => current.map((supplier) => supplier.name === editingSupplierName ? next : supplier))
      setInvoices((current) => current.map((invoice) => invoice.supplier === editingSupplierName ? { ...invoice, supplier: next.name } : invoice))
      toast.success('Supplier updated')
    } else {
      setSuppliers((current) => [next, ...current])
      toast.success('Supplier added')
    }

    setShowSupplierForm(false)
    setEditingSupplierName(null)
    setSupplierForm(EMPTY_SUPPLIER)
  }

  const deleteSupplier = (name: string) => {
    setSuppliers((current) => current.filter((supplier) => supplier.name !== name))
    toast.success(`Supplier ${name} deleted`)
  }

  const approveInvoice = (ref: string) => {
    setInvoices((current) => current.map((invoice) => invoice.ref === ref ? { ...invoice, status: 'Approved', variant: 'green' } : invoice))
    toast.success(`Invoice ${ref} approved`)
  }

  const runPaymentBatch = () => toast.success('Payment batch prepared')
  const createPo = () => toast.success('Purchase order draft created')

  return (
    <AppLayout
      title="AP & Suppliers"
      subtitle="Accounts Payable"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportPayables}>Export</Button>
          <Button onClick={() => openInvoiceForm()}>+ Log Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Payable" value="£413.50" change="3 invoices outstanding" icon="AP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Approval" value="£213.50" change="2 invoices" changeUp={false} icon="P" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Due This Week" value="£200.00" change="1 invoice" icon="D" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Paid YTD" value="£24,180" change="↑ 6% vs prior year" changeUp icon="£" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'invoices', label: 'Supplier Invoices' },
          { key: 'suppliers', label: 'Suppliers' },
          { key: 'aged', label: 'Aged Creditors' },
          { key: 'payments', label: 'Payment Runs' },
          { key: 'po', label: 'Purchase Orders' },
        ] as { key: Tab; label: string }[]).map((section) => (
          <button key={section.key} onClick={() => setTab(section.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === section.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === section.key ? 'var(--gold)' : 'var(--mute)', fontWeight: tab === section.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{section.label}</button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Supplier Invoices</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} style={{ background: 'var(--surface-muted)', border: '1px solid var(--line2)', color: 'var(--text)', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>
                <option value="all">All</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
              <Button onClick={() => openInvoiceForm()}>+ Log Invoice</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Reference', mono: true },
                { key: 'supplier', header: 'Supplier', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.supplier}</span> },
                { key: 'due', header: 'Due Date' },
                { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{row.amount}</span> },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {row.status === 'Pending Approval' && <Button small onClick={() => approveInvoice(row.ref)}>Approve</Button>}
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

      {tab === 'suppliers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Supplier Register</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => openSupplierForm()}>+ Add Supplier</Button>
            </div>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'name', header: 'Supplier', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.name}</span> },
                { key: 'category', header: 'Category', render: (row) => <Badge variant="slate">{row.category}</Badge> },
                { key: 'terms', header: 'Terms' },
                { key: 'outstanding', header: 'Outstanding', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: (row) => <Badge variant="green">{row.status}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button small variant="ghost" onClick={() => openSupplierForm(row as SupplierRecord)}>Edit</Button>
                      <Button small variant="ghost" onClick={() => deleteSupplier(row.name)} style={{ color: '#F87171' }}>Delete</Button>
                    </div>
                  ),
                },
              ]}
              data={suppliers}
            />
          </Panel>
        </>
      )}

      {tab === 'aged' && (
        <Panel title="Aged Creditors Analysis" titleIcon="A" iconColor="#C9A84C" action={<Badge variant="slate">DPO calculated</Badge>}>
          <DataTable
            columns={[
              { key: 'supplier', header: 'Supplier', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.supplier}</span> },
              { key: 'current', header: 'Current', align: 'right', mono: true },
              { key: 'd30', header: '31-60d', align: 'right', mono: true },
              { key: 'd60', header: '61-90d', align: 'right', mono: true },
              { key: 'total', header: 'Total', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{row.total}</span> },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Payment Runs</div>
            <Button onClick={runPaymentBatch}>Run Payment Batch</Button>
          </div>
          <Alert variant="info" icon="i">Approved invoices ready for payment. Verify bank details before executing payment run.</Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'Run Reference', mono: true },
                { key: 'date', header: 'Date' },
                { key: 'count', header: 'Invoices' },
                { key: 'total', header: 'Total', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2DCE89' }}>{row.total}</span> },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Purchase Orders</div>
            <Button onClick={createPo}>+ Create PO</Button>
          </div>
          <Alert variant="info" icon="i">3-way matching: PO → Goods Receipt → Invoice. Auto-flags mismatches for approval.</Alert>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'ref', header: 'PO Number', mono: true },
                { key: 'supplier', header: 'Supplier', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.supplier}</span> },
                { key: 'desc', header: 'Description' },
                { key: 'amount', header: 'Amount', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
              ]}
              data={[
                { ref: 'PO-0055', supplier: 'Manchester Catering Co', desc: 'Skills Workshop Catering', amount: '£124.00', status: 'Matched', variant: 'green' },
                { ref: 'PO-0056', supplier: 'Rochdale Venue Hire', desc: 'April Venue Booking', amount: '£200.00', status: 'Open', variant: 'blue' },
              ]}
            />
          </Panel>
        </>
      )}

      {showInvoiceForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>{editingInvoiceRef ? 'Edit Supplier Invoice' : 'Log Supplier Invoice'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Invoice Reference" value={invoiceForm.ref} onChange={(v) => setInvoiceForm({ ...invoiceForm, ref: v })} placeholder="SUP-0131" />
              <FormInput label="Supplier" value={invoiceForm.supplier} onChange={(v) => setInvoiceForm({ ...invoiceForm, supplier: v })} placeholder="Supplier name" />
              <FormInput label="Due Date" value={invoiceForm.due} onChange={(v) => setInvoiceForm({ ...invoiceForm, due: v })} placeholder="31 May 2026" />
              <FormInput label="Amount" value={invoiceForm.amount} onChange={(v) => setInvoiceForm({ ...invoiceForm, amount: v })} placeholder="£150.00" />
              <FormInput label="Status" as="select" value={invoiceForm.status} onChange={(v) => setInvoiceForm({ ...invoiceForm, status: v as InvoiceStatus })}>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
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

      {showSupplierForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>{editingSupplierName ? 'Edit Supplier' : 'Add Supplier'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Supplier Name" value={supplierForm.name} onChange={(v) => setSupplierForm({ ...supplierForm, name: v })} placeholder="Supplier name" />
              <FormInput label="Category" value={supplierForm.category} onChange={(v) => setSupplierForm({ ...supplierForm, category: v })} placeholder="Category" />
              <FormInput label="Terms" value={supplierForm.terms} onChange={(v) => setSupplierForm({ ...supplierForm, terms: v })} placeholder="Net 30" />
              <FormInput label="Outstanding" value={supplierForm.outstanding} onChange={(v) => setSupplierForm({ ...supplierForm, outstanding: v })} placeholder="£0.00" />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowSupplierForm(false); setEditingSupplierName(null); setSupplierForm(EMPTY_SUPPLIER) }}>Cancel</Button>
              <Button fullWidth onClick={saveSupplier}>Save Supplier</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
