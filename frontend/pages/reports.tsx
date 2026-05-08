import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, Alert } from '@/components/ui'
import { useRouter } from 'next/router'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type ReportType = 'trustee' | 'grant' | 'charity_commission' | 'management_accounts' | null

interface GeneratedReport {
  type: string
  title: string
  narrative: string
  generated_at: string
}

const REPORTS = [
  {
    id: 'trustee' as ReportType,
    icon: '📊',
    title: 'Trustee Financial Report',
    description: 'Quarterly summary for board meeting. Includes income, expenditure, reserves, and risk register.',
    badge: 'Quarterly',
    badgeVariant: 'blue' as const,
    aiPowered: true,
  },
  {
    id: 'grant' as ReportType,
    icon: '📋',
    title: 'Grant Funder Report',
    description: 'Narrative + financial breakdown for NLCF, GMCA, or Rochdale SLA. Pre-filled from live data.',
    badge: 'Due soon',
    badgeVariant: 'red' as const,
    aiPowered: true,
  },
  {
    id: 'charity_commission' as ReportType,
    icon: '🏛',
    title: 'Charity Commission AR',
    description: 'Annual return data export in Charity Commission format. Includes income, spending, and governance.',
    badge: 'Annual',
    badgeVariant: 'slate' as const,
    aiPowered: true,
  },
  {
    id: 'management_accounts' as ReportType,
    icon: '📈',
    title: 'Management Accounts',
    description: 'Monthly P&L, balance sheet, and cash flow statement for internal management use.',
    badge: 'Monthly',
    badgeVariant: 'amber' as const,
    aiPowered: false,
  },
]

export default function Reports() {
  const router = useRouter()
  const [generating, setGenerating] = useState<ReportType>(null)
  const [report, setReport] = useState<GeneratedReport | null>(null)

  const generate = async (type: ReportType) => {
    if (!type) return
    setGenerating(type)
    setReport(null)
    try {
      let result: any
      if (type === 'trustee') {
        result = await api.aiTrusteeReport()
        setReport({ type, title: 'Trustee Financial Report', narrative: result.narrative, generated_at: result.generated_at })
      } else if (type === 'grant') {
        router.push('/ai')
        toast.success('Redirecting to AI assistant for grant report…')
        return
      } else {
        result = await api.aiFinancialAnalysis(type === 'management_accounts' ? 'general' : 'grants')
        setReport({ type, title: REPORTS.find(r => r.id === type)?.title ?? 'Report', narrative: result.analysis, generated_at: result.generated_at })
      }
      toast.success('Report generated successfully')
    } catch {
      toast.error('Report generation failed — check your AI API key')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <AppLayout title="Financial Reports" subtitle="AI-generated">
      <Alert variant="success" icon="✦">
        AI can auto-generate Charity Commission reports, trustee financial summaries, and funder reports. All reports are pre-filled from live data.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {REPORTS.map((r) => (
          <Panel key={r.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 14 }}>{r.title}</div>
                  <Badge variant={r.badgeVariant}>{r.badge}</Badge>
                  {r.aiPowered && <Badge variant="green">AI ✦</Badge>}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
                  {r.description}
                </div>
                <Button
                  onClick={() => generate(r.id)}
                  disabled={generating === r.id}
                  style={{ minWidth: 160 }}
                >
                  {generating === r.id ? 'Generating…' : r.aiPowered ? `Generate with AI ✦` : 'Generate Report'}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Generated report display */}
      {report && (
        <Panel title={report.title} titleIcon="✦" iconColor="#34d399" action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button small variant="ghost" onClick={() => {
              const blob = new Blob([report.narrative], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.txt`
              a.click()
            }}>↓ Download</Button>
            <Button small onClick={() => router.push('/ai')}>Refine with AI ✦</Button>
          </div>
        }>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <Badge variant="green">AI Generated</Badge>
            <Badge variant="slate">{new Date(report.generated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Badge>
          </div>
          <div style={{
            background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 10,
            padding: '20px 24px', fontSize: 13, lineHeight: 1.8, color: '#cbd5e1',
            whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {report.narrative}
          </div>
        </Panel>
      )}

      {/* Previous reports */}
      <Panel title="Report History" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { name: 'Trustee Q3 Financial Report', date: '01 Jan 2025', type: 'Trustee', size: '2.4 KB' },
            { name: 'NLCF Interim Report — Oct 2024', date: '28 Oct 2024', type: 'Grant', size: '4.1 KB' },
            { name: 'Management Accounts — Sep 2024', date: '05 Oct 2024', type: 'Management', size: '1.8 KB' },
          ].map((rep, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', fontSize: 13,
              borderBottom: i < 2 ? '1px solid rgba(51,65,85,0.3)' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{rep.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{rep.date} · {rep.size}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge variant="slate">{rep.type}</Badge>
                <Button small variant="ghost">↓ Download</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </AppLayout>
  )
}
