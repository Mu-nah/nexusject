import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, DataTable, Alert, StatCard } from '@/components/ui'

type Tab = 'returns' | 'transactions' | 'settings'

const RETURNS = [
  { period: 'Q4 2024 (Jan–Mar 2025)', due: '07 May 2025', vatDue: '£1,240.00', status: 'Due', variant: 'amber' },
  { period: 'Q3 2024 (Oct–Dec 2024)', due: '07 Feb 2025', vatDue: '£980.00', status: 'Filed', variant: 'green' },
  { period: 'Q2 2024 (Jul–Sep 2024)', due: '07 Nov 2024', vatDue: '£1,100.00', status: 'Filed', variant: 'green' },
  { period: 'Q1 2024 (Apr–Jun 2024)', due: '07 Aug 2024', vatDue: '£860.00', status: 'Filed', variant: 'green' },
]

const VAT_TX = [
  { date: '15 Mar', description: 'NLCF Grant Disbursement', type: 'Income', rate: 'Exempt', vat: '—', net: '£15,000' },
  { date: '14 Mar', description: 'Staff Salaries', type: 'Expense', rate: 'Exempt', vat: '—', net: '£4,850' },
  { date: '12 Mar', description: 'Skills Workshop Catering', type: 'Expense', rate: 'Standard 20%', vat: '£20.67', net: '£103.33' },
  { date: '10 Mar', description: 'Online Donation', type: 'Income', rate: 'Exempt', vat: '—', net: '£250' },
  { date: '08 Mar', description: 'Venue Hire', type: 'Expense', rate: 'Standard 20%', vat: '£33.33', net: '£166.67' },
]

export default function VAT() {
  const [tab, setTab] = useState<Tab>('returns')
  const [rateFilter, setRateFilter] = useState('All Rates')

  return (
    <AppLayout
      title="VAT & MTD"
      subtitle="Making Tax Digital"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Export</Button>
          <Button>⬆ Submit to HMRC</Button>
        </div>
      }
    >
      <Alert variant="gold" icon="⚡">
        <strong>Making Tax Digital (MTD) for VAT:</strong> All VAT-registered businesses must file digitally via MTD-compatible software. Nexus One is MTD-compliant via the HMRC VAT API.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="VAT Registration" value="Registered" change="VAT No: GB 123 456 789" icon="%" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Current Period VAT" value="£1,240" change="Q4 2024 — due 07 May" changeUp={false} icon="!" accentColor="#FB8C00" iconBg="rgba(251,140,0,0.12)" />
        <StatCard label="VAT Scheme" value="Standard" change="Quarterly periods" icon="◉" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
        <StatCard label="MTD Status" value="Connected" change="HMRC API active" changeUp icon="✓" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'returns', label: 'VAT Returns' },
          { key: 'transactions', label: 'VAT Transactions' },
          { key: 'settings', label: 'VAT Settings' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12.5,
            background: 'none', borderBottom: tab === t.key ? '2px solid #C9A84C' : '2px solid transparent',
            color: tab === t.key ? '#E8C56A' : '#5C6B84', fontWeight: tab === t.key ? 600 : 400,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'returns' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
          <Panel title="VAT Returns Log" titleIcon="≡" iconColor="#C9A84C">
            <DataTable
              columns={[
                { key: 'period', header: 'Period', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.period}</span> },
                { key: 'due', header: 'Due Date' },
                { key: 'vatDue', header: 'VAT Due', align: 'right', mono: true },
                { key: 'status', header: 'Status', render: r => <Badge variant={r.variant as any}>{r.status}</Badge> },
              ]}
              data={RETURNS}
            />
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title="Current Period Summary" titleIcon="◈" iconColor="#C9A84C" action={<Badge variant="amber">Q4 2024</Badge>}>
              {[
                { label: 'VAT on Sales (Output)', value: '£1,890.00', color: '#2DCE89' },
                { label: 'VAT on Purchases (Input)', value: '£650.00', color: '#F5365C' },
                { label: 'Net VAT Due', value: '£1,240.00', color: '#C9A84C' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                  <span style={{ color: '#7A8BA8' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                <Button style={{ width: '100%', justifyContent: 'center' }}>📐 Calculate VAT Return</Button>
                <Button variant="ghost" style={{ width: '100%', justifyContent: 'center' }}>⬆ Submit to HMRC via MTD</Button>
              </div>
            </Panel>

            <Panel title="VAT Registration Details" titleIcon="◎" iconColor="#5E9EFF">
              {[
                { label: 'VAT Number', value: 'GB 123 456 789' },
                { label: 'Registration Date', value: '01 Apr 2022' },
                { label: 'Scheme', value: 'Standard Rate' },
                { label: 'Period', value: 'Quarterly (Apr)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                  <span style={{ color: '#5C6B84' }}>{row.label}</span>
                  <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#E8EDF5' }}>VAT Transaction Ledger</div>
            <select value={rateFilter} onChange={e => setRateFilter(e.target.value)} style={{
              background: '#1C2230', border: '1px solid rgba(255,255,255,0.08)', color: '#C8D3E8',
              borderRadius: 7, padding: '6px 12px', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif",
            }}>
              <option>All Rates</option>
              <option>Standard (20%)</option>
              <option>Reduced (5%)</option>
              <option>Zero (0%)</option>
              <option>Exempt</option>
            </select>
          </div>
          <Panel noPadding>
            <DataTable
              columns={[
                { key: 'date', header: 'Date', mono: true },
                { key: 'description', header: 'Description', render: r => <span style={{ fontWeight: 500, color: '#E8EDF5' }}>{r.description}</span> },
                { key: 'type', header: 'Type', render: r => <Badge variant={r.type === 'Income' ? 'green' : 'slate'}>{r.type}</Badge> },
                { key: 'rate', header: 'VAT Rate' },
                { key: 'vat', header: 'VAT Amount', align: 'right', mono: true },
                { key: 'net', header: 'Net', align: 'right', mono: true },
              ]}
              data={VAT_TX}
            />
          </Panel>
        </>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="VAT Scheme" titleIcon="◉" iconColor="#C9A84C">
            {[
              { label: 'Current Scheme', value: 'Standard Rate', badge: 'Active' },
              { label: 'Return Frequency', value: 'Quarterly' },
              { label: 'Accounting Basis', value: 'Invoice (Accruals)' },
              { label: 'MTD Integration', value: 'HMRC API Connected' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12.5 }}>
                <span style={{ color: '#7A8BA8' }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#C8D3E8', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.value}</span>
                  {row.badge && <Badge variant="green">{row.badge}</Badge>}
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="VAT Rates Reference" titleIcon="%" iconColor="#5E9EFF">
            {[
              { rate: 'Standard Rate', pct: '20%', desc: 'Most goods and services', color: '#C9A84C' },
              { rate: 'Reduced Rate', pct: '5%', desc: 'Domestic fuel, child car seats', color: '#FB8C00' },
              { rate: 'Zero Rate', pct: '0%', desc: 'Food, children\'s clothing', color: '#5E9EFF' },
              { rate: 'Exempt', pct: '—', desc: 'Charity income, welfare services', color: '#2DCE89' },
            ].map(row => (
              <div key={row.rate} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: row.color, fontFamily: "'JetBrains Mono', monospace", width: 36, flexShrink: 0 }}>{row.pct}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#C8D3E8' }}>{row.rate}</div>
                  <div style={{ fontSize: 11, color: '#5C6B84' }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </AppLayout>
  )
}
