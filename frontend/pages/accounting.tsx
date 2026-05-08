import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { StatCard, Panel, Badge, Button, DataTable, FormInput } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const gbp = (n: number) => {
  const abs = Math.abs(Number(n))
  const formatted = abs.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `-£${formatted}` : `£${formatted}`
}

type Tab = 'accounts' | 'journal' | 'bank'

const TYPE_BADGE: Record<string, any> = {
  asset: 'green', liability: 'red', equity: 'violet', income: 'blue', expense: 'amber',
}

export default function Accounting() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('accounts')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ code: '', name: '', account_type: 'asset', description: '' })

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts', typeFilter],
    queryFn: () => api.getAccounts(typeFilter !== 'all' ? typeFilter : undefined),
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
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed'),
  })

  const entries = journalData?.items ?? []
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
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Trial Balance</Button>
          <Button onClick={() => setShowNewAccount(true)}>+ New Account</Button>
        </div>
      }
    >
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Assets"    value={gbp(summary?.total_cash ?? 94820)}                          change="Cash + receivables"        accentColor="#10b981" />
        <StatCard label="Net Assets"      value={gbp((summary?.total_cash ?? 94820) - 10500)}               change="Assets minus liabilities"  accentColor="#3b82f6" />
        <StatCard label="Income YTD"      value={gbp(summary?.income_ytd ?? 156200)}                        change="↑ 22.8%" changeUp          accentColor="#8b5cf6" />
        <StatCard label="Expenditure YTD" value={gbp(summary?.expenses_ytd ?? 71880)}                       change="Against budget"            accentColor="#f59e0b" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#1e293b', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif',
              background: tab === t.id ? '#334155' : 'transparent',
              color: tab === t.id ? '#f1f5f9' : '#64748b',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Chart of Accounts */}
      {tab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['asset', 'liability', 'income', 'expense'].map((type) => {
            const filtered = accounts.filter((a: any) => a.account_type === type)
            return (
              <Panel
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                titleIcon={type === 'asset' ? '◈' : type === 'liability' ? '◎' : type === 'income' ? '↑' : '↓'}
                iconColor={type === 'asset' ? '#34d399' : type === 'liability' ? '#f87171' : type === 'income' ? '#34d399' : '#fbbf24'}
              >
                {filtered.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: 12, padding: '8px 0' }}>No {type} accounts</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filtered.map((acc: any, i: number) => (
                      <div key={acc.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 0', fontSize: 13,
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(51,65,85,0.4)' : 'none',
                      }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#475569', minWidth: 36 }}>{acc.code}</span>
                          <span style={{ color: '#cbd5e1' }}>{acc.name}</span>
                        </div>
                        <span style={{
                          fontFamily: 'DM Mono, monospace', fontWeight: 500,
                          color: acc.balance >= 0 ? '#34d399' : '#f87171',
                        }}>{gbp(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {/* Journal Entries */}
      {tab === 'journal' && (
        <Panel title="Journal Entries" noPadding action={
          <Button small>+ Post Entry</Button>
        }>
          <DataTable
            columns={[
              { key: 'reference', header: 'Ref', mono: true, render: (r) => <span style={{ color: '#34d399' }}>{r.reference}</span> },
              { key: 'date', header: 'Date', mono: true, render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) },
              { key: 'description', header: 'Description', render: (r) => <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.description}</span> },
              { key: 'source', header: 'Source', render: (r) => <Badge variant="slate">{r.source ?? 'manual'}</Badge> },
              { key: 'total_debit', header: 'Debit', align: 'right', mono: true, render: (r) => `£${Number(r.total_debit).toLocaleString()}` },
              { key: 'total_credit', header: 'Credit', align: 'right', mono: true, render: (r) => `£${Number(r.total_credit).toLocaleString()}` },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'posted' ? 'green' : r.status === 'voided' ? 'red' : 'amber'}>{r.status}</Badge> },
            ]}
            data={entries}
            emptyMessage="No journal entries posted yet"
          />
        </Panel>
      )}

      {/* Bank Reconciliation */}
      {tab === 'bank' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {bankAccounts.map((bank: any) => (
            <Panel key={bank.id} title={bank.account_name} titleIcon="⊞" iconColor="#60a5fa">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: '#34d399', letterSpacing: '-0.02em' }}>
                    {gbp(bank.balance)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                    {bank.bank_name} · Last synced: {bank.last_synced ? new Date(bank.last_synced).toLocaleDateString('en-GB') : 'Never'}
                  </div>
                </div>
                <Button small variant="ghost">Sync</Button>
              </div>
              <Button fullWidth variant="ghost">View Transactions →</Button>
            </Panel>
          ))}
          {bankAccounts.length === 0 && (
            <Panel title="No bank accounts">
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                Connect your bank account to enable reconciliation
              </div>
              <Button fullWidth>+ Add Bank Account</Button>
            </Panel>
          )}
        </div>
      )}

      {/* New Account Modal */}
      {showNewAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>New Account</div>
            <FormInput label="Account Code" value={newAccount.code} onChange={(v) => setNewAccount({ ...newAccount, code: v })} placeholder="e.g. 5001" />
            <FormInput label="Account Name" value={newAccount.name} onChange={(v) => setNewAccount({ ...newAccount, name: v })} placeholder="e.g. Staff Training Costs" />
            <FormInput label="Type" value={newAccount.account_type} onChange={(v) => setNewAccount({ ...newAccount, account_type: v })} as="select">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </FormInput>
            <FormInput label="Description (optional)" value={newAccount.description} onChange={(v) => setNewAccount({ ...newAccount, description: v })} placeholder="Brief description…" />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => setShowNewAccount(false)}>Cancel</Button>
              <Button
                fullWidth
                onClick={() => createAccountMutation.mutate(newAccount)}
                disabled={!newAccount.code || !newAccount.name || createAccountMutation.isPending}
              >
                {createAccountMutation.isPending ? 'Creating…' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
