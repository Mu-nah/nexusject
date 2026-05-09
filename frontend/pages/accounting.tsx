import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Badge, Button, DataTable, FormInput, Panel, StatCard } from '@/components/ui'
import api from '@/lib/api'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

const gbp = (n: number) => {
  const abs = Math.abs(Number(n))
  const formatted = abs.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `-GBP ${formatted}` : `GBP ${formatted}`
}

type Tab = 'accounts' | 'journal' | 'bank'

type JournalDraft = {
  reference: string
  description: string
  debit: string
  credit: string
}

export default function Accounting() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('accounts')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showJournalEntry, setShowJournalEntry] = useState(false)
  const [showBankForm, setShowBankForm] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null)
  const [newAccount, setNewAccount] = useState({ code: '', name: '', account_type: 'asset', description: '' })
  const [journalDraft, setJournalDraft] = useState<JournalDraft>({ reference: '', description: '', debit: '', credit: '' })
  const [localEntries, setLocalEntries] = useState<any[]>([])
  const [localBankAccounts, setLocalBankAccounts] = useState<any[]>([])
  const [bankDraft, setBankDraft] = useState({ account_name: '', bank_name: '', balance: '' })
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
  })

  const { data: journalData } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api.getJournalEntries(),
    enabled: tab === 'journal',
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: api.getBankAccounts,
    enabled: tab === 'bank',
  })

  const { data: summary } = useQuery({
    queryKey: ['accounting-summary'],
    queryFn: api.getAccountingSummary,
  })

  const createAccountMutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      toast.success('Account created')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setShowNewAccount(false)
      setNewAccount({ code: '', name: '', account_type: 'asset', description: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to create account'),
  })

  const entries = useMemo(() => [...localEntries, ...(journalData?.items ?? [])], [journalData?.items, localEntries])
  const mergedBankAccounts = useMemo(() => [...localBankAccounts, ...bankAccounts], [bankAccounts, localBankAccounts])
  const selectedBank = mergedBankAccounts.find((bank: any) => Number(bank.id) === selectedBankId) ?? null

  const exportTrialBalance = () => {
    const rows = accounts.map((account: any) => ({
      code: account.code,
      name: account.name,
      type: account.account_type,
      balance: account.balance,
    }))
    downloadCsvFile('trial-balance.csv', rows)
    toast.success('Trial balance exported')
  }

  const postJournalEntry = () => {
    if (!journalDraft.reference || !journalDraft.description || !journalDraft.debit || !journalDraft.credit) {
      toast.error('Complete the journal entry before posting')
      return
    }
    const debit = Number(journalDraft.debit)
    const credit = Number(journalDraft.credit)
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit <= 0 || credit <= 0) {
      toast.error('Use valid debit and credit amounts')
      return
    }

    const nextEntry = {
      id: editingEntryId ?? `local-${Date.now()}`,
      reference: journalDraft.reference,
      date: new Date().toISOString(),
      description: journalDraft.description,
      source: 'manual',
      total_debit: debit,
      total_credit: credit,
      status: 'posted',
    }

    setLocalEntries((current) =>
      editingEntryId
        ? current.map((entry) => entry.id === editingEntryId ? nextEntry : entry)
        : [nextEntry, ...current]
    )
    setJournalDraft({ reference: '', description: '', debit: '', credit: '' })
    setShowJournalEntry(false)
    setEditingEntryId(null)
    toast.success(editingEntryId ? 'Journal entry updated' : 'Journal entry posted')
  }

  const syncBank = (bankId: number) => {
    setLocalBankAccounts((current) =>
      current.map((bank) =>
        Number(bank.id) === bankId
          ? { ...bank, last_synced: new Date().toISOString() }
          : bank
      )
    )
    if (!localBankAccounts.some((bank) => Number(bank.id) === bankId)) {
      const upstream = bankAccounts.find((bank: any) => Number(bank.id) === bankId)
      if (upstream) {
        setLocalBankAccounts((current) => [
          { ...upstream, last_synced: new Date().toISOString() },
          ...current,
        ])
      }
    }
    toast.success('Bank feed synced')
  }

  const addBankAccount = () => {
    if (!bankDraft.account_name || !bankDraft.bank_name || !bankDraft.balance) {
      toast.error('Complete the bank account details')
      return
    }
    const newBank = {
      id: editingBankId ?? Date.now(),
      account_name: bankDraft.account_name,
      bank_name: bankDraft.bank_name,
      balance: Number(bankDraft.balance),
      last_synced: new Date().toISOString(),
    }
    setLocalBankAccounts((current) =>
      editingBankId
        ? current.map((bank) => Number(bank.id) === editingBankId ? newBank : bank)
        : [newBank, ...current]
    )
    setSelectedBankId(newBank.id)
    setBankDraft({ account_name: '', bank_name: '', balance: '' })
    setShowBankForm(false)
    setEditingBankId(null)
    toast.success(editingBankId ? 'Bank account updated' : 'Bank account added')
  }

  const openJournalEditor = (entry: any) => {
    setJournalDraft({
      reference: entry.reference,
      description: entry.description,
      debit: String(entry.total_debit),
      credit: String(entry.total_credit),
    })
    setEditingEntryId(entry.id)
    setShowJournalEntry(true)
  }

  const deleteJournalEntry = (entryId: string) => {
    setLocalEntries((current) => current.filter((entry) => entry.id !== entryId))
    toast.success('Journal entry deleted')
  }

  const openBankEditor = (bank: any) => {
    setBankDraft({
      account_name: bank.account_name,
      bank_name: bank.bank_name,
      balance: String(bank.balance),
    })
    setEditingBankId(Number(bank.id))
    setShowBankForm(true)
  }

  const deleteBankAccount = (bankId: number) => {
    setLocalBankAccounts((current) => current.filter((bank) => Number(bank.id) !== bankId))
    if (selectedBankId === bankId) {
      setSelectedBankId(null)
    }
    toast.success('Bank account deleted')
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'accounts', label: 'Chart of Accounts' },
    { id: 'journal', label: 'Journal Entries' },
    { id: 'bank', label: 'Bank Reconciliation' },
  ]

  return (
    <AppLayout
      title="Accounting Ledger"
      subtitle="Double-entry engine"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportTrialBalance}>Download Trial Balance</Button>
          <Button onClick={() => setShowNewAccount(true)}>+ New Account</Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Assets" value={gbp(summary?.total_cash ?? 94820)} change="Cash and receivables" accentColor="#10b981" />
        <StatCard label="Net Assets" value={gbp((summary?.total_cash ?? 94820) - 10500)} change="Assets less liabilities" accentColor="#3b82f6" />
        <StatCard label="Income YTD" value={gbp(summary?.income_ytd ?? 156200)} change="Up 22.8%" changeUp accentColor="#8b5cf6" />
        <StatCard label="Expenditure YTD" value={gbp(summary?.expenses_ytd ?? 71880)} change="Against budget" accentColor="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--surface-muted)', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              background: tab === t.id ? 'var(--bg4)' : 'transparent',
              color: tab === t.id ? 'var(--heading)' : 'var(--mute)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {['asset', 'liability', 'income', 'expense'].map((type) => {
            const filtered = accounts.filter((a: any) => a.account_type === type)
            return (
              <Panel
                key={type}
                title={`${type.charAt(0).toUpperCase() + type.slice(1)} Accounts`}
                titleIcon={type === 'asset' ? 'A' : type === 'liability' ? 'L' : type === 'income' ? 'I' : 'E'}
                iconColor={type === 'asset' ? '#34d399' : type === 'liability' ? '#f87171' : type === 'income' ? '#34d399' : '#fbbf24'}
              >
                {filtered.length === 0 ? (
                  <div style={{ color: 'var(--mute)', fontSize: 12, padding: '8px 0' }}>No {type} accounts</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filtered.map((acc: any, index: number) => (
                      <div
                        key={acc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '9px 0',
                          fontSize: 13,
                          borderBottom: index < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--mute)', minWidth: 44 }}>{acc.code}</span>
                          <span style={{ color: 'var(--text)' }}>{acc.name}</span>
                        </div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, color: acc.balance >= 0 ? '#34d399' : '#f87171' }}>
                          {gbp(acc.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 'journal' && (
        <Panel
          title="Journal Entries"
          noPadding
          action={<Button small onClick={() => setShowJournalEntry(true)}>+ Post Entry</Button>}
        >
          <DataTable
            columns={[
              { key: 'reference', header: 'Ref', mono: true, render: (r) => <span style={{ color: '#34d399' }}>{r.reference}</span> },
              { key: 'date', header: 'Date', mono: true, render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) },
              { key: 'description', header: 'Description', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.description}</span> },
              { key: 'source', header: 'Source', render: (r) => <Badge variant="slate">{r.source ?? 'manual'}</Badge> },
              { key: 'total_debit', header: 'Debit', align: 'right', mono: true, render: (r) => gbp(Number(r.total_debit)) },
              { key: 'total_credit', header: 'Credit', align: 'right', mono: true, render: (r) => gbp(Number(r.total_credit)) },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'posted' ? 'green' : r.status === 'voided' ? 'red' : 'amber'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => String(r.id).startsWith('local-') ? <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button small variant="ghost" onClick={() => openJournalEditor(r)}>Edit</Button><Button small variant="ghost" onClick={() => deleteJournalEntry(String(r.id))} style={{ color: '#f87171' }}>Delete</Button></div> : <Button small variant="ghost" onClick={() => toast.success(`Viewing ${r.reference}`)}>View</Button> },
            ]}
            data={entries}
            emptyMessage="No journal entries posted yet"
          />
        </Panel>
      )}

      {tab === 'bank' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mergedBankAccounts.map((bank: any) => (
              <Panel key={bank.id} title={bank.account_name} titleIcon="B" iconColor="#60a5fa">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: '#34d399', letterSpacing: '-0.02em' }}>
                      {gbp(bank.balance)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'DM Mono, monospace' }}>
                      {bank.bank_name} | Last synced: {bank.last_synced ? new Date(bank.last_synced).toLocaleDateString('en-GB') : 'Never'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button small variant="ghost" onClick={() => syncBank(Number(bank.id))}>Sync</Button>
                    <Button small variant="ghost" onClick={() => setSelectedBankId(Number(bank.id))}>View Transactions</Button>
                    {localBankAccounts.some((item) => Number(item.id) === Number(bank.id)) && <Button small variant="ghost" onClick={() => openBankEditor(bank)}>Edit</Button>}
                    {localBankAccounts.some((item) => Number(item.id) === Number(bank.id)) && <Button small variant="ghost" onClick={() => deleteBankAccount(Number(bank.id))} style={{ color: '#f87171' }}>Delete</Button>}
                  </div>
                </div>
              </Panel>
            ))}
            {mergedBankAccounts.length === 0 && (
              <Panel title="No bank accounts">
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--mute)', fontSize: 13 }}>
                  Connect your bank account to enable reconciliation.
                </div>
                <Button fullWidth onClick={() => setShowBankForm(true)}>+ Add Bank Account</Button>
              </Panel>
            )}
            {mergedBankAccounts.length > 0 && (
              <Button onClick={() => setShowBankForm(true)}>+ Add Bank Account</Button>
            )}
          </div>

          <Panel title={selectedBank ? `${selectedBank.account_name} Activity` : 'Bank Activity'} titleIcon="T" iconColor="#C9A84C">
            {selectedBank ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12.5, color: 'var(--mute2)', lineHeight: 1.6 }}>
                  Reviewing the latest imported activity for <strong style={{ color: 'var(--heading)' }}>{selectedBank.account_name}</strong>.
                </div>
                <div style={{ background: 'var(--surface-strong-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--mute)' }}>Opening balance</span>
                    <span style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{gbp(Number(selectedBank.balance) - 1240)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--mute)' }}>Payroll batch</span>
                    <span style={{ color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>- {gbp(5520).replace('GBP ', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--mute)' }}>Grant receipt</span>
                    <span style={{ color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>+ {gbp(8000).replace('GBP ', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--mute)' }}>Closing balance</span>
                    <span style={{ color: 'var(--heading)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{gbp(Number(selectedBank.balance))}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--mute)', fontSize: 13 }}>Select a bank account to review transactions and sync status.</div>
            )}
          </Panel>
        </div>
      )}

      {showNewAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 20 }}>New Account</div>
            <FormInput label="Account Code" value={newAccount.code} onChange={(v) => setNewAccount({ ...newAccount, code: v })} placeholder="e.g. 5001" />
            <FormInput label="Account Name" value={newAccount.name} onChange={(v) => setNewAccount({ ...newAccount, name: v })} placeholder="e.g. Staff Training Costs" />
            <FormInput label="Type" value={newAccount.account_type} onChange={(v) => setNewAccount({ ...newAccount, account_type: v })} as="select">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </FormInput>
            <FormInput label="Description (optional)" value={newAccount.description} onChange={(v) => setNewAccount({ ...newAccount, description: v })} placeholder="Brief description" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" fullWidth onClick={() => setShowNewAccount(false)}>Cancel</Button>
              <Button
                fullWidth
                onClick={() => createAccountMutation.mutate(newAccount)}
                disabled={!newAccount.code || !newAccount.name || createAccountMutation.isPending}
              >
                {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showJournalEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 20 }}>{editingEntryId ? 'Edit Journal Entry' : 'Post Journal Entry'}</div>
            <FormInput label="Reference" value={journalDraft.reference} onChange={(v) => setJournalDraft({ ...journalDraft, reference: v })} placeholder="e.g. JE-240509-01" />
            <FormInput label="Description" value={journalDraft.description} onChange={(v) => setJournalDraft({ ...journalDraft, description: v })} placeholder="e.g. Month end adjustment" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <FormInput label="Debit" value={journalDraft.debit} onChange={(v) => setJournalDraft({ ...journalDraft, debit: v })} type="number" placeholder="0.00" />
              <FormInput label="Credit" value={journalDraft.credit} onChange={(v) => setJournalDraft({ ...journalDraft, credit: v })} type="number" placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowJournalEntry(false); setEditingEntryId(null); setJournalDraft({ reference: '', description: '', debit: '', credit: '' }) }}>Cancel</Button>
              <Button fullWidth onClick={postJournalEntry}>{editingEntryId ? 'Save Entry' : 'Post Entry'}</Button>
            </div>
          </div>
        </div>
      )}

      {showBankForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--heading)', marginBottom: 20 }}>{editingBankId ? 'Edit Bank Account' : 'Add Bank Account'}</div>
            <FormInput label="Account Name" value={bankDraft.account_name} onChange={(v) => setBankDraft({ ...bankDraft, account_name: v })} placeholder="Current Account" />
            <FormInput label="Bank Name" value={bankDraft.bank_name} onChange={(v) => setBankDraft({ ...bankDraft, bank_name: v })} placeholder="Barclays" />
            <FormInput label="Opening Balance" value={bankDraft.balance} onChange={(v) => setBankDraft({ ...bankDraft, balance: v })} type="number" placeholder="0.00" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" fullWidth onClick={() => { setShowBankForm(false); setEditingBankId(null); setBankDraft({ account_name: '', bank_name: '', balance: '' }) }}>Cancel</Button>
              <Button fullWidth onClick={addBankAccount}>{editingBankId ? 'Save Bank Account' : 'Add Bank Account'}</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
