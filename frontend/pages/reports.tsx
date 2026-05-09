import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Alert, Badge, Button, Panel } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type ReportType = 'trustee' | 'grant' | 'charity_commission' | 'management_accounts' | null

interface WorkspaceReport {
  id: number
  title: string
  report_type: string
  period_label?: string | null
  narrative: string
  created_at: string
  share_token?: string
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
    description: 'Narrative plus financial breakdown for NLCF, GMCA, or Rochdale SLA. Pre-filled from live data.',
    badge: 'Due soon',
    badgeVariant: 'red' as const,
    aiPowered: true,
  },
  {
    id: 'charity_commission' as ReportType,
    icon: '🏛',
    title: 'Charity Commission AR',
    description: 'Annual return-style governance and grants review generated from workspace data.',
    badge: 'Annual',
    badgeVariant: 'slate' as const,
    aiPowered: true,
  },
  {
    id: 'management_accounts' as ReportType,
    icon: '📈',
    title: 'Management Accounts',
    description: 'Monthly financial summary for internal management use, saved to the workspace history.',
    badge: 'Monthly',
    badgeVariant: 'amber' as const,
    aiPowered: true,
  },
]

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} style={{ color: '#f8fafc', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function isDividerRow(line: string): boolean {
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line.trim())
}

function renderMarkdownReport(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      i += 1
      continue
    }

    if (line === '---') {
      elements.push(<hr key={`hr-${i}`} style={{ border: 0, borderTop: '1px solid rgba(148,163,184,0.18)', margin: '24px 0' }} />)
      i += 1
      continue
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i += 1
      }

      const rows = tableLines
        .filter((tableLine, index) => index !== 1 || !isDividerRow(tableLine))
        .map(parseTableRow)

      if (rows.length > 0) {
        const [header, ...body] = rows
        elements.push(
          <div
            key={`table-${i}`}
            style={{
              overflowX: 'auto',
              margin: '18px 0 24px',
              border: '1px solid rgba(51,65,85,0.65)',
              borderRadius: 12,
              background: 'rgba(10,15,26,0.82)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        fontSize: 11,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(51,65,85,0.65)',
                        background: 'rgba(15,23,42,0.92)',
                      }}
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#cbd5e1',
                          borderTop: rowIndex > 0 ? '1px solid rgba(51,65,85,0.35)' : 'none',
                          verticalAlign: 'top',
                        }}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${i}`} style={{ fontSize: 28, lineHeight: 1.15, color: '#f8fafc', margin: '0 0 18px', fontWeight: 700, letterSpacing: '-0.03em' }}>{renderInline(line.slice(2))}</h1>)
      i += 1
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${i}`} style={{ fontSize: 20, lineHeight: 1.25, color: '#f8fafc', margin: '28px 0 12px', fontWeight: 700 }}>{renderInline(line.slice(3))}</h2>)
      i += 1
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} style={{ fontSize: 16, lineHeight: 1.3, color: '#e2e8f0', margin: '22px 0 10px', fontWeight: 700 }}>{renderInline(line.slice(4))}</h3>)
      i += 1
      continue
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      elements.push(
        <blockquote key={`quote-${i}`} style={{ margin: '18px 0', padding: '14px 16px', borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: 10, color: '#f8fafc' }}>
          {quoteLines.map((quoteLine, quoteIndex) => <div key={quoteIndex} style={{ lineHeight: 1.7 }}>{renderInline(quoteLine)}</div>)}
        </blockquote>
      )
      continue
    }

    if (/^- /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^- /, ''))
        i += 1
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '10px 0 18px 18px', padding: 0, color: '#cbd5e1' }}>
          {items.map((item, itemIndex) => <li key={itemIndex} style={{ marginBottom: 8, lineHeight: 1.7 }}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const current = lines[i].trim()
      if (!current || current === '---' || current.startsWith('#') || current.startsWith('|') || current.startsWith('>') || /^- /.test(current)) {
        break
      }
      paragraphLines.push(current)
      i += 1
    }
    elements.push(<p key={`p-${i}`} style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.85, color: '#cbd5e1' }}>{renderInline(paragraphLines.join(' '))}</p>)
  }

  return elements
}

export default function Reports() {
  const router = useRouter()
  const [generating, setGenerating] = useState<ReportType>(null)
  const [history, setHistory] = useState<WorkspaceReport[]>([])
  const [report, setReport] = useState<WorkspaceReport | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [shareEmail, setShareEmail] = useState('')
  const [shareName, setShareName] = useState('')

  const shareQuery = typeof router.query.shared === 'string' ? router.query.shared : ''

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const items = await api.listReports()
      setHistory(items)
      if (!report && items.length > 0 && !shareQuery) {
        setReport(items[0])
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!shareQuery) return
    api.getSharedReport(shareQuery)
      .then((shared) => setReport(shared))
      .catch(() => toast.error('Shared report not found'))
  }, [shareQuery])

  const generate = async (type: ReportType) => {
    if (!type) return
    setGenerating(type)
    try {
      let saved: WorkspaceReport | null = null
      if (type === 'trustee') {
        const result = await api.aiTrusteeReport()
        saved = result.report
      } else if (type === 'grant') {
        const result = await api.aiFinancialAnalysis('grants')
        saved = result.report
      } else {
        const focus = type === 'management_accounts' ? 'general' : 'grants'
        const result = await api.aiFinancialAnalysis(focus)
        saved = result.report
      }

      if (saved) {
        setReport(saved)
        toast.success('Report saved to workspace')
        await loadHistory()
      }
    } catch {
      toast.error('Report generation failed - check your AI API key')
    } finally {
      setGenerating(null)
    }
  }

  const handleDownloadPdf = async (reportId: number) => {
    try {
      const res = await api.downloadReportPdf(reportId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(report?.title || 'workspace-report').replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF download failed')
    }
  }

  const handleShare = async (reportId: number) => {
    try {
      const res = await api.createShareLink(reportId)
      const shareUrl = `${window.location.origin}/reports?shared=${res.share_token}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied')
    } catch {
      toast.error('Share link could not be created')
    }
  }

  const handleEmailShare = async (reportId: number) => {
    if (!shareEmail.trim()) {
      toast.error('Enter an email address first')
      return
    }
    try {
      const res = await api.emailShareReport(reportId, {
        email: shareEmail.trim(),
        recipient_name: shareName.trim(),
      })
      toast.success(res.sent ? 'Report emailed successfully' : 'SMTP not configured - email not sent')
    } catch {
      toast.error('Email share failed')
    }
  }

  const historyLabel = useMemo(() => {
    if (isLoadingHistory) return 'Loading workspace reports...'
    if (history.length === 0) return 'No saved reports yet'
    return `${history.length} saved workspace reports`
  }, [history.length, isLoadingHistory])

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesType = filterType === 'all' || item.report_type === filterType
      const needle = search.trim().toLowerCase()
      const matchesSearch =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        (item.period_label || '').toLowerCase().includes(needle) ||
        item.report_type.toLowerCase().includes(needle)
      return matchesType && matchesSearch
    })
  }, [filterType, history, search])

  return (
    <AppLayout title="Financial Reports" subtitle="Workspace library">
      <Alert variant="success" icon="✦">
        AI-generated reports are now saved to the organisation workspace, can be downloaded as formatted PDFs, and can be shared with an internal workspace link.
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
                  {r.aiPowered && <Badge variant="green">Workspace AI</Badge>}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>{r.description}</div>
                <Button onClick={() => generate(r.id)} disabled={generating === r.id} style={{ minWidth: 180 }}>
                  {generating === r.id ? 'Generating...' : 'Generate and Save'}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {report && (
        <Panel
          title={report.title}
          titleIcon="✦"
          iconColor="#34d399"
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button small variant="ghost" onClick={() => handleShare(report.id)}>Copy Share Link</Button>
              <Button small variant="ghost" onClick={() => handleDownloadPdf(report.id)}>Download PDF</Button>
              <Button small onClick={() => router.push('/ai')}>Refine with AI</Button>
            </div>
          }
        >
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="green">Saved to Workspace</Badge>
            <Badge variant="slate">{report.report_type.replace(/_/g, ' ')}</Badge>
            {report.period_label && <Badge variant="blue">{report.period_label}</Badge>}
            <Badge variant="slate">
              {new Date(report.created_at).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 14 }}>
            <input
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              placeholder="Recipient name"
              style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5' }}
            />
            <input
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="Recipient email"
              style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5' }}
            />
            <Button onClick={() => handleEmailShare(report.id)}>Email PDF</Button>
          </div>
          <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 14, padding: '24px 28px', maxHeight: 680, overflowY: 'auto', fontFamily: 'Instrument Sans, sans-serif' }}>
            {renderMarkdownReport(report.narrative)}
          </div>
        </Panel>
      )}

      <Panel title="Workspace Report History" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: '#7A8BA8', marginBottom: 10 }}>{historyLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 10, marginBottom: 14 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by title, period, or type..."
            style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5' }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5' }}
          >
            <option value="all">All report types</option>
            <option value="trustee">Trustee</option>
            <option value="grant">Grant</option>
            <option value="management_accounts">Management accounts</option>
            <option value="grants">Grant analysis</option>
          </select>
        </div>
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: '#64748b' }}>Generate your first workspace report to start building the shared library.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredHistory.map((rep, i) => (
              <div
                key={rep.id}
                onClick={() => setReport(rep)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: i < filteredHistory.length - 1 ? '1px solid rgba(51,65,85,0.3)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{rep.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {new Date(rep.created_at).toLocaleDateString('en-GB')} - {rep.period_label || rep.report_type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="slate">{rep.report_type.replace(/_/g, ' ')}</Badge>
                  <Button small variant="ghost" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(rep.id) }}>PDF</Button>
                  <Button small variant="ghost" onClick={(e) => { e.stopPropagation(); handleShare(rep.id) }}>Share</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  )
}
