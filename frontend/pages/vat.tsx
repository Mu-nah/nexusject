import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'returns' | 'transactions' | 'settings'

const RETURNS: Array<{ period: string; due: string; vatDue: string; status: string; variant: 'amber' | 'green' }> = []
const VAT_TX: Array<{ date: string; description: string; type: string; rate: string; vat: string; net: string }> = []

export default function VAT() {
  const [tab, setTab] = useState<Tab>('returns')
  const [rateFilter, setRateFilter] = useState('All Rates')
  const [submissionNote, setSubmissionNote] = useState('No VAT return has been prepared from this workspace yet.')

  const filteredTransactions = useMemo(() => {
    if (rateFilter === 'All Rates') return VAT_TX
    return VAT_TX.filter((row) => row.rate === rateFilter)
  }, [rateFilter])

  const exportVat = () => {
    downloadCsvFile('vat-transactions.csv', filteredTransactions)
    toast.success('VAT export downloaded')
  }

  return (
    <AppLayout
      title="VAT and MTD"
      subtitle="Making Tax Digital"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={exportVat}>Export</Button>
          <Button onClick={() => {
            setSubmissionNote('No VAT submission was created because this workspace does not yet have VAT return data.')
            toast.success('VAT submission check completed')
          }}>Submit to HMRC</Button>
        </div>
      }
    >
      <Alert variant="info" icon="%">
        This page now reflects only VAT data saved for the current workspace. No sample VAT figures are preloaded.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="VAT Registration" value="Not recorded" change="Add your VAT registration details when applicable" icon="VAT" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Current Period VAT" value="GBP 0.00" change="No current VAT return calculated" changeUp={false} icon="DUE" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="VAT Scheme" value="Not set" change="No VAT scheme configured yet" icon="SCH" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="MTD Status" value="Not connected" change="HMRC integration not configured" changeUp={false} icon="OK" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {([
          { key: 'returns', label: 'VAT Returns' },
          { key: 'transactions', label: 'VAT Transactions' },
          { key: 'settings', label: 'VAT Settings' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              background: 'none',
              borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
              color: tab === t.key ? 'var(--gold)' : 'var(--mute)',
              fontWeight: tab === t.key ? 600 : 400,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'returns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <Panel title="VAT Returns Log" titleIcon="VR" iconColor="#C9A84C">
            {RETURNS.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--mute2)' }}>No VAT return periods have been recorded for this workspace.</div>
            ) : (
              <DataTable
                columns={[
                  { key: 'period', header: 'Period', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.period}</span> },
                  { key: 'due', header: 'Due Date' },
                  { key: 'vatDue', header: 'VAT Due', align: 'right', mono: true },
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.variant}>{r.status}</Badge> },
                ]}
                data={RETURNS}
              />
            )}
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title="Current Period Summary" titleIcon="CP" iconColor="#C9A84C">
              {[
                { label: 'VAT on Sales (Output)', value: 'GBP 0.00', color: '#2DCE89' },
                { label: 'VAT on Purchases (Input)', value: 'GBP 0.00', color: '#F5365C' },
                { label: 'Net VAT Due', value: 'GBP 0.00', color: '#C9A84C' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--mute)' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </Panel>

            <Panel title="Submission Status" titleIcon="SS" iconColor="#5E9EFF">
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.8 }}>{submissionNote}</div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--heading)' }}>VAT Transaction Ledger</div>
            <select
              value={rateFilter}
              onChange={(e) => setRateFilter(e.target.value)}
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--line2)',
                color: 'var(--text)',
                borderRadius: 7,
                padding: '6px 12px',
                fontSize: 12,
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            >
              <option>All Rates</option>
              <option>Standard 20%</option>
              <option>Reduced 5%</option>
              <option>Zero 0%</option>
              <option>Exempt</option>
            </select>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'date', header: 'Date', mono: true },
                { key: 'description', header: 'Description', render: (r) => <span style={{ fontWeight: 500, color: 'var(--heading)' }}>{r.description}</span> },
                { key: 'type', header: 'Type', render: (r) => <Badge variant={r.type === 'Income' ? 'green' : 'slate'}>{r.type}</Badge> },
                { key: 'rate', header: 'VAT Rate' },
                { key: 'vat', header: 'VAT Amount', align: 'right', mono: true },
                { key: 'net', header: 'Net', align: 'right', mono: true },
              ]}
              data={filteredTransactions}
              emptyMessage="No VAT transactions recorded yet"
            />
          </Panel>
        </>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Panel title="VAT Scheme" titleIcon="VS" iconColor="#C9A84C">
            {[
              { label: 'Current Scheme', value: 'Not set', badge: 'Pending' },
              { label: 'Return Frequency', value: 'Not recorded' },
              { label: 'Accounting Basis', value: 'Not recorded' },
              { label: 'MTD Integration', value: 'Not connected' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--mute)' }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.value}</span>
                  {row.badge && <Badge variant="amber">{row.badge}</Badge>}
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="VAT Rates Reference" titleIcon="RR" iconColor="#5E9EFF">
            {[
              { rate: 'Standard Rate', pct: '20%', desc: 'Most goods and services', color: '#C9A84C' },
              { rate: 'Reduced Rate', pct: '5%', desc: 'Some qualifying reduced supplies', color: '#FB8C00' },
              { rate: 'Zero Rate', pct: '0%', desc: 'Some qualifying zero-rated supplies', color: '#5E9EFF' },
              { rate: 'Exempt', pct: '-', desc: 'Some welfare, finance, or charity income', color: '#2DCE89' },
            ].map((row) => (
              <div key={row.rate} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: row.color, fontFamily: "'JetBrains Mono', monospace", width: 36, flexShrink: 0 }}>{row.pct}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{row.rate}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </AppLayout>
  )
}
