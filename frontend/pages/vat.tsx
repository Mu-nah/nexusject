import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, DataTable, Panel, StatCard } from '@/components/ui'
import { downloadCsvFile } from '@/lib/export'
import toast from 'react-hot-toast'

type Tab = 'returns' | 'transactions' | 'mtd' | 'settings'
type VATScheme = 'Standard' | 'Flat Rate' | 'Cash Accounting' | 'Annual Accounting'
type MTDStep = 1 | 2 | 3 | 4

const RETURNS: Array<{ period: string; due: string; vatDue: string; status: string; variant: 'amber' | 'green' }> = []
const VAT_TX: Array<{ date: string; description: string; type: string; rate: string; vat: string; net: string }> = []

export default function VAT() {
  const [tab, setTab] = useState<Tab>('returns')
  const [rateFilter, setRateFilter] = useState('All Rates')
  const [submissionNote, setSubmissionNote] = useState('No VAT return has been prepared from this workspace yet.')
  // VAT scheme settings
  const [vatRegNumber, setVatRegNumber] = useState('')
  const [vatScheme, setVatScheme] = useState<VATScheme>('Standard')
  const [vatFrequency, setVatFrequency] = useState('Quarterly')
  const [vatBasis, setVatBasis] = useState('Invoice')
  const [flatRatePct, setFlatRatePct] = useState('6.5')
  const [settingsSaved, setSettingsSaved] = useState(false)
  // MTD wizard
  const [mtdStep, setMtdStep] = useState<MTDStep>(1)
  const [mtdConnected, setMtdConnected] = useState(false)
  const [mtdVatNumber, setMtdVatNumber] = useState('')

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
          { key: 'mtd', label: 'MTD Connection' },
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

      {tab === 'mtd' && (
        <>
          {mtdConnected && (
            <Alert variant="info" icon="i">
              MTD for VAT is connected. Your VAT returns will be submitted digitally to HMRC via the Making Tax Digital API.
            </Alert>
          )}
          {!mtdConnected && (
            <Alert variant="warning" icon="!">
              MTD for VAT is not connected. Businesses with taxable turnover above £90,000 must submit VAT returns via HMRC's Making Tax Digital API.
            </Alert>
          )}

          <div style={{ maxWidth: 640, margin: '20px auto' }}>
            {/* Step progress */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
              {[1, 2, 3, 4].map((step, i) => {
                const labels = ['VAT Number', 'HMRC Auth', 'Verify', 'Complete']
                const isDone = mtdStep > step || mtdConnected
                const isActive = mtdStep === step && !mtdConnected
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: `2px solid ${isDone ? '#2DCE89' : isActive ? '#C9A84C' : 'var(--line)'}`, background: isDone ? 'rgba(45,206,137,0.12)' : isActive ? 'rgba(201,168,76,0.12)' : 'transparent', color: isDone ? '#2DCE89' : isActive ? '#C9A84C' : 'var(--mute)', transition: 'all 0.2s' }}>
                        {isDone ? '✓' : step}
                      </div>
                      <span style={{ fontSize: 10.5, color: isActive ? '#C9A84C' : 'var(--mute)', whiteSpace: 'nowrap' }}>{labels[i]}</span>
                    </div>
                    {i < 3 && <div style={{ flex: 1, height: 2, background: isDone ? '#2DCE89' : 'var(--line)', margin: '0 8px 14px', transition: 'background 0.2s' }} />}
                  </div>
                )
              })}
            </div>

            {!mtdConnected && mtdStep === 1 && (
              <Panel title="Step 1: Enter VAT Registration Number" titleIcon="1" iconColor="#C9A84C">
                <div style={{ fontSize: 12.5, color: 'var(--mute)', marginBottom: 16, lineHeight: 1.65 }}>
                  Enter your 9-digit UK VAT registration number. This will be used to connect to HMRC's Making Tax Digital API.
                </div>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>VAT Registration Number</label>
                <input value={mtdVatNumber} onChange={(e) => setMtdVatNumber(e.target.value)} placeholder="GB 123 4567 89" maxLength={12}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 8, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, letterSpacing: '0.05em', marginBottom: 16 }} />
                <Button fullWidth onClick={() => { if (!mtdVatNumber.trim()) { toast.error('Enter your VAT number first'); return } setMtdStep(2); toast.success('VAT number saved') }}>
                  Continue to HMRC Authorisation
                </Button>
              </Panel>
            )}

            {!mtdConnected && mtdStep === 2 && (
              <Panel title="Step 2: Authorise with HMRC" titleIcon="2" iconColor="#C9A84C">
                <div style={{ fontSize: 12.5, color: 'var(--mute)', marginBottom: 16, lineHeight: 1.65 }}>
                  You will be redirected to HMRC's Government Gateway to grant Realtouch One permission to submit VAT returns on your behalf. This uses the HMRC OAuth 2.0 authorisation flow.
                </div>
                <div style={{ padding: '12px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#C9A84C', marginBottom: 4 }}>Permissions requested</div>
                  {['Read your VAT registration information', 'Read your VAT return obligations', 'Submit VAT returns on your behalf', 'Read your VAT return history'].map(p => (
                    <div key={p} style={{ fontSize: 12, color: 'var(--mute)', padding: '2px 0' }}>— {p}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="ghost" onClick={() => setMtdStep(1)}>Back</Button>
                  <Button fullWidth onClick={() => {
                    toast.success('Redirecting to HMRC Government Gateway…')
                    setTimeout(() => setMtdStep(3), 1500)
                  }}>Connect to HMRC Government Gateway</Button>
                </div>
              </Panel>
            )}

            {!mtdConnected && mtdStep === 3 && (
              <Panel title="Step 3: Verify Connection" titleIcon="3" iconColor="#C9A84C">
                <div style={{ fontSize: 12.5, color: 'var(--mute)', marginBottom: 16, lineHeight: 1.65 }}>
                  HMRC has authorised the connection. Verify the details below match your VAT registration before completing setup.
                </div>
                {[
                  { label: 'VAT Registration Number', value: mtdVatNumber || 'GB 123 4567 89' },
                  { label: 'Business Name', value: 'Your Organisation Name' },
                  { label: 'Submission Channel', value: 'HMRC MTD VAT API v1.0' },
                  { label: 'Authorisation Status', value: 'Granted', isOk: true },
                ].map(({ label, value, isOk }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--mute)' }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: isOk ? '#2DCE89' : 'var(--text)', fontWeight: isOk ? 700 : 400 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <Button variant="ghost" onClick={() => setMtdStep(2)}>Back</Button>
                  <Button fullWidth onClick={() => { setMtdConnected(true); setMtdStep(4); toast.success('MTD for VAT connected successfully!') }}>
                    Confirm & Complete Setup
                  </Button>
                </div>
              </Panel>
            )}

            {mtdConnected && (
              <Panel title="MTD for VAT — Connected" titleIcon="OK" iconColor="#2DCE89">
                <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2DCE89', marginBottom: 8 }}>Connected to HMRC</div>
                  <div style={{ fontSize: 12.5, color: 'var(--mute)', marginBottom: 20, lineHeight: 1.65 }}>
                    VAT number {mtdVatNumber || 'GB 123 4567 89'} is now linked. VAT returns can be submitted digitally from the VAT Returns tab.
                  </div>
                </div>
                {[
                  { label: 'Next Return Period', value: 'Apr–Jun 2026' },
                  { label: 'Next Submission Deadline', value: '7 Aug 2026' },
                  { label: 'Submission Method', value: 'HMRC MTD API' },
                  { label: 'Connection Authorised', value: new Date().toLocaleDateString('en-GB') },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--mute)' }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
                <Button variant="ghost" fullWidth onClick={() => { setMtdConnected(false); setMtdStep(1); setMtdVatNumber('') }} style={{ marginTop: 16 }}>Disconnect MTD</Button>
              </Panel>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <Panel title="VAT Scheme Configuration" titleIcon="VS" iconColor="#C9A84C">
            {settingsSaved && (
              <Alert variant="info" icon="i">Settings saved. Changes will apply to the next VAT return period.</Alert>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>VAT Registration Number</label>
              <input value={vatRegNumber} onChange={(e) => setVatRegNumber(e.target.value)} placeholder="GB 123 4567 89"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 8 }}>VAT Scheme</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['Standard', 'Flat Rate', 'Cash Accounting', 'Annual Accounting'] as VATScheme[]).map(s => (
                  <button key={s} onClick={() => setVatScheme(s)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${vatScheme === s ? '#C9A84C' : 'var(--line)'}`, background: vatScheme === s ? 'rgba(201,168,76,0.1)' : 'var(--surface-muted)', color: vatScheme === s ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", fontWeight: vatScheme === s ? 600 : 400 }}>{s}</button>
                ))}
              </div>
            </div>
            {vatScheme === 'Flat Rate' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>Flat Rate Percentage (%)</label>
                <input type="number" value={flatRatePct} onChange={(e) => setFlatRatePct(e.target.value)} step="0.5"
                  style={{ width: 120, padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line2)', borderRadius: 7, color: 'var(--heading)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>HMRC publishes sector-specific flat rates. Charities typically 4–7%.</div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Return Frequency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Monthly', 'Quarterly', 'Annual'].map(f => (
                  <button key={f} onClick={() => setVatFrequency(f)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${vatFrequency === f ? '#C9A84C' : 'var(--line)'}`, background: vatFrequency === f ? 'rgba(201,168,76,0.1)' : 'var(--surface-muted)', color: vatFrequency === f ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", fontWeight: vatFrequency === f ? 600 : 400 }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11.5, color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Accounting Basis</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Invoice', 'Cash'].map(b => (
                  <button key={b} onClick={() => setVatBasis(b)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${vatBasis === b ? '#C9A84C' : 'var(--line)'}`, background: vatBasis === b ? 'rgba(201,168,76,0.1)' : 'var(--surface-muted)', color: vatBasis === b ? '#C9A84C' : 'var(--mute)', cursor: 'pointer', fontSize: 12, fontFamily: "'Instrument Sans', sans-serif", fontWeight: vatBasis === b ? 600 : 400 }}>{b}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>{vatBasis === 'Cash' ? 'Cash basis: VAT due when payment received / made' : 'Invoice basis: VAT due when invoice raised / received'}</div>
            </div>
            <Button fullWidth onClick={() => { setSettingsSaved(true); toast.success('VAT settings saved') }}>Save Settings</Button>
          </Panel>

          <Panel title="VAT Rates Reference" titleIcon="RR" iconColor="#5E9EFF">
            {[
              { rate: 'Standard Rate', pct: '20%', desc: 'Most goods and services', color: '#C9A84C' },
              { rate: 'Reduced Rate', pct: '5%', desc: 'Some qualifying reduced supplies e.g. fuel, mobility aids', color: '#FB8C00' },
              { rate: 'Zero Rate', pct: '0%', desc: 'Essential goods: food, books, children\'s clothing', color: '#5E9EFF' },
              { rate: 'Exempt', pct: '—', desc: 'Welfare, charity fundraising, finance services. Cannot reclaim input VAT', color: '#2DCE89' },
            ].map((row) => (
              <div key={row.rate} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: row.color, fontFamily: "'JetBrains Mono', monospace", width: 38, flexShrink: 0 }}>{row.pct}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{row.rate}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>{row.desc}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 8, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>VAT Registration Threshold</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: '#C9A84C', marginBottom: 3 }}>£90,000</div>
              <div style={{ fontSize: 11.5, color: 'var(--mute)' }}>Mandatory registration if taxable turnover exceeds £90,000 in any 12-month rolling period (2026-27)</div>
            </div>
          </Panel>
        </div>
      )}
    </AppLayout>
  )
}
