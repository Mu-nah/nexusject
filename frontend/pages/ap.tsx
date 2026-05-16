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

const gbp = (value: number) => `GBP ${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const parseAmount = (value: string) => Number((value || '').replace(/[^0-9.-]/g, '')) || 0

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
  outstanding: 'GBP 0.00',
  status: 'Active',
}

export default function AP() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [filter, setFilter] = useState('all')
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceRecord>(EMPTY_INVOICE)
  const [supplierForm, setSupplierForm] = useState<SupplierRecord>(EMPTY_SUPPLIER)
  const [editingInvoiceRef, setEditingInvoiceRef] = useState<string | null>(null)
  const [editingSupplierName, setEditingSupplierName] = useState<string | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status.toLowerCase().includes(filter))
  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'Pending Approval')
  const approvedInvoices = invoices.filter((invoice) => invoice.status === 'Approved')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid')
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'Paid')
  const totalPayable = openInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const pendingApprovalTotal = pendingInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const approvedTotal = approvedInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)
  const paidYtd = paidInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0)

  const exportPayables = () => {
    downloadCsvFile('accounts-payable.csv', filtered)
    toast.success('Accounts payable export downloaded')
  }

  const openInvoiceForm = (record?: InvoiceRecord) => {
    setInvoiceForm(record ?? {
      ...EMPTY_INVOICE,
      ref: `SUP-${String(invoices.length + 1).padStart(4, '0')}`,
      due: new Date().toLocaleDateString('en-GB'),
      amount: 'GBP 0.00',
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
      subtitle="Accounts payable"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={exportPayables}>Export</Button>
          <Button onClick={() => openInvoiceForm()}>+ Log Invoice</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Payable" value={gbp(totalPayable)} change={openInvoices.length > 0 ? `${openInvoices.length} invoices outstanding` : 'No unpaid invoices'} icon="AP" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Pending Approval" value={gbp(pendingApprovalTotal)} change={pendingInvoices.length > 0 ? `${pendingInvoices.length} invoices awaiting review` : 'Nothing awaiting approval'} changeUp={false} icon="P" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="Approved to Pay" value={gbp(approvedTotal)} change={approvedInvoices.length > 0 ? `${approvedInvoices.length} invoices ready for payment` : 'No approved payment batch'} icon="D" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Paid YTD" value={gbp(paidYtd)} change={paidInvoices.length > 0 ? `${paidInvoices.length} invoices marked paid` : 'No paid invoices recorded'} changeUp={paidYtd > 0} icon="GBP" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
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
              emptyMessage="No supplier invoices recorded yet"
            />
          </Panel>
        </>
      )}

      {tab === 'suppliers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Supplier Register</div>
            <Button onClick={() => openSupplierForm()}>+ Add Supplier</Button>
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
              emptyMessage="No suppliers recorded yet"
            />
          </Panel>
        </>
      )}

      {tab === 'aged' && (
        <Panel title="Aged Creditors Analysis" titleIcon="A" iconColor="#C9A84C" action={<Badge variant="slate">Workspace view</Badge>}>
          {openInvoices.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--mute2)' }}>No unpaid invoices yet, so there is no aged creditors analysis to display.</div>
          ) : (
            <DataTable
              columns={[
                { key: 'supplier', header: 'Supplier', render: (row) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{row.supplier}</span> },
                { key: 'current', header: 'Current', align: 'right', mono: true },
                { key: 'd30', header: '31-60d', align: 'right', mono: true },
                { key: 'd60', header: '61-90d', align: 'right', mono: true },
                { key: 'total', header: 'Total', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#C9A84C' }}>{row.total}</span> },
              ]}
              data={openInvoices.map((invoice) => ({
                supplier: invoice.supplier,
                current: invoice.amount,
                d30: '-',
                d60: '-',
                total: invoice.amount,
              }))}
            />
          )}
        </Panel>
      )}

      {tab === 'payments' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Payment Runs</div>
            <Button onClick={runPaymentBatch}>Run Payment Batch</Button>
          </div>
          <Alert variant="info" icon="i">Approved invoices will appear here once they are ready for a payment batch.</Alert>
          <Panel noPadding>
            {approvedInvoices.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12.5, color: 'var(--mute2)' }}>No approved invoices are ready for a payment run yet.</div>
            ) : (
              <DataTable
                columns={[
                  { key: 'ref', header: 'Run Reference', mono: true },
                  { key: 'date', header: 'Date' },
                  { key: 'count', header: 'Invoices' },
                  { key: 'total', header: 'Total', align: 'right', render: (row) => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2DCE89' }}>{row.total}</span> },
                  { key: 'status', header: 'Status', render: (row) => <Badge variant={row.variant as any}>{row.status}</Badge> },
                ]}
                data={[{
                  ref: `PAY-${String(approvedInvoices.length).padStart(4, '0')}`,
                  date: new Date().toLocaleDateString('en-GB'),
                  count: String(approvedInvoices.length),
                  total: gbp(approvedTotal),
                  status: 'Ready',
                  variant: 'amber',
                }]}
              />
            )}
          </Panel>
        </>
      )}

      {tab === 'po' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>Purchase Orders</div>
            <Button onClick={createPo}>+ Create PO</Button>
          </div>
          <Alert variant="info" icon="i">Purchase orders are not seeded anymore. This workspace will show only the POs you actually create.</Alert>
          <Panel noPadding>
            <div style={{ padding: 16, fontSize: 12.5, color: 'var(--mute2)' }}>No purchase orders have been created from this workspace yet.</div>
          </Panel>
        </>
      )}

      {showInvoiceForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>{editingInvoiceRef ? 'Edit Supplier Invoice' : 'Log Supplier Invoice'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <FormInput label="Invoice Reference" value={invoiceForm.ref} onChange={(v) => setInvoiceForm({ ...invoiceForm, ref: v })} placeholder="SUP-0001" />
              <FormInput label="Supplier" value={invoiceForm.supplier} onChange={(v) => setInvoiceForm({ ...invoiceForm, supplier: v })} placeholder="Supplier name" />
              <FormInput label="Due Date" value={invoiceForm.due} onChange={(v) => setInvoiceForm({ ...invoiceForm, due: v })} placeholder="DD/MM/YYYY" />
              <FormInput label="Amount" value={invoiceForm.amount} onChange={(v) => setInvoiceForm({ ...invoiceForm, amount: v })} placeholder="GBP 150.00" />
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
              <FormInput label="Outstanding" value={supplierForm.outstanding} onChange={(v) => setSupplierForm({ ...supplierForm, outstanding: v })} placeholder="GBP 0.00" />
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
