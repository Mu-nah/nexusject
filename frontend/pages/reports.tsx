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
  narrative?: string
  share_access_mode?: 'anyone_with_link' | 'specific_email'
  allowed_email?: string | null
  created_at: string
  share_token?: string
}

const REPORTS = [
  {
    id: 'trustee' as ReportType,
    icon: 'CHART',
    title: 'Trustee Financial Report',
    description: 'Quarterly summary for board meeting. Includes income, expenditure, reserves, and risk register.',
    badge: 'Quarterly',
    badgeVariant: 'blue' as const,
    aiPowered: true,
  },
  {
    id: 'grant' as ReportType,
    icon: 'GRANT',
    title: 'Grant Funder Report',
    description: 'Narrative plus financial breakdown for NLCF, GMCA, or Rochdale SLA. Pre-filled from live data.',
    badge: 'Due soon',
    badgeVariant: 'red' as const,
    aiPowered: true,
  },
  {
    id: 'charity_commission' as ReportType,
    icon: 'AR',
    title: 'Charity Commission AR',
    description: 'Annual return-style governance and grants review generated from workspace data.',
    badge: 'Annual',
    badgeVariant: 'slate' as const,
    aiPowered: true,
  },
  {
    id: 'management_accounts' as ReportType,
    icon: 'MA',
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

function parseMetaSegments(line: string): Array<{ label: string; value: string }> {
  const markdownMatches = Array.from(line.matchAll(/\*\*([^*]+?):\*\*\s*([^*]+?)(?=\s+\*\*[^*]+?:\*\*|$)/g))
  if (markdownMatches.length >= 2) {
    return markdownMatches.map((match) => ({
      label: match[1].trim(),
      value: match[2].trim(),
    }))
  }

  const plainMatches = Array.from(line.matchAll(/([A-Za-z][A-Za-z /&()-]+?):\s*([^:]+?)(?=\s+[A-Za-z][A-Za-z /&()-]+?:|$)/g))
  if (plainMatches.length >= 2) {
    return plainMatches.map((match) => ({
      label: match[1].trim(),
      value: match[2].trim(),
    }))
  }

  return []
}

function buildPreviewMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const preview = lines.slice(0, 18).join('\n').trim()
  return lines.length > 18 ? `${preview}\n\n...` : preview
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
    if (line.startsWith('#')) {
      const headingText = line.replace(/^#+\s*/, '')
      elements.push(
        <h3
          key={`hx-${i}`}
          style={{ fontSize: 15, lineHeight: 1.35, color: '#e2e8f0', margin: '20px 0 10px', fontWeight: 700 }}
        >
          {renderInline(headingText)}
        </h3>
      )
      i += 1
      continue
    }

    const metaSegments = parseMetaSegments(line)
    if (metaSegments.length >= 2) {
      elements.push(
        <div
          key={`meta-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
            margin: '10px 0 22px',
          }}
        >
          {metaSegments.map((segment, segmentIndex) => (
            <div
              key={segmentIndex}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(51,65,85,0.6)',
                background: 'rgba(15,23,42,0.82)',
              }}
            >
              <div style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{segment.label}</div>
              <div style={{ fontSize: 13.5, color: '#e2e8f0', lineHeight: 1.6 }}>{renderInline(segment.value)}</div>
            </div>
          ))}
        </div>
      )
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
    if (paragraphLines.length === 0) {
      elements.push(<p key={`fallback-${i}`} style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.85, color: '#cbd5e1' }}>{renderInline(line)}</p>)
      i += 1
      continue
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
  const [shareAccessMode, setShareAccessMode] = useState<'anyone_with_link' | 'specific_email'>('anyone_with_link')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState<WorkspaceReport | null>(null)
  const [loadingReportId, setLoadingReportId] = useState<number | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<number | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [sharedAccessEmail, setSharedAccessEmail] = useState('')
  const [sharedAccessRequired, setSharedAccessRequired] = useState(false)
  const [sharedAccessError, setSharedAccessError] = useState('')
  const [isLoadingShared, setIsLoadingShared] = useState(false)
  const [hasAuthToken, setHasAuthToken] = useState(false)

  const shareQuery = typeof router.query.shared === 'string' ? router.query.shared : ''
  const sharedEmailQuery = typeof router.query.email === 'string' ? router.query.email : ''

  const previewNarrative = useMemo(
    () => buildPreviewMarkdown(report?.narrative || ''),
    [report?.id, report?.narrative]
  )

  const previewElements = useMemo(
    () => renderMarkdownReport(previewNarrative),
    [previewNarrative]
  )

  const fullReportElements = useMemo(
    () => renderMarkdownReport(report?.narrative || ''),
    [report?.id, report?.narrative]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasAuthToken(Boolean(window.localStorage.getItem('erp_token')))
  }, [])

  useEffect(() => {
    if (sharedEmailQuery) {
      setSharedAccessEmail(sharedEmailQuery)
    }
  }, [sharedEmailQuery])

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const items = await api.listReports()
      setHistory(items)
      if (!report && items.length > 0 && !shareQuery) {
        const fullReport = await api.getReport(items[0].id)
        setReport(fullReport)
        setShareAccessMode(fullReport.share_access_mode === 'specific_email' ? 'specific_email' : 'anyone_with_link')
        setShareEmail(fullReport.allowed_email || '')
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const selectReport = async (reportId: number, options?: { openViewer?: boolean }) => {
    setLoadingReportId(reportId)
    try {
      const fullReport = await api.getReport(reportId)
      setReport(fullReport)
      setShareAccessMode(fullReport.share_access_mode === 'specific_email' ? 'specific_email' : 'anyone_with_link')
      setShareEmail(fullReport.allowed_email || '')
      if (options?.openViewer) {
        setViewerOpen(true)
      }
    } catch {
      toast.error('Could not open report')
    } finally {
      setLoadingReportId(null)
    }
  }

  useEffect(() => {
    if (shareQuery && !hasAuthToken) return
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareQuery, hasAuthToken])

  useEffect(() => {
    if (!shareQuery) return
    setIsLoadingShared(true)
    setSharedAccessError('')
    setSharedAccessRequired(false)
    api.getSharedReport(shareQuery, sharedEmailQuery || undefined)
      .then((shared) => {
        setReport(shared)
        setShareAccessMode(shared.share_access_mode === 'specific_email' ? 'specific_email' : 'anyone_with_link')
        setShareEmail(shared.allowed_email || '')
        setViewerOpen(true)
      })
      .catch((error) => {
        const detail = error?.response?.data?.detail
        if (detail === 'email_required') {
          setSharedAccessRequired(true)
          return
        }
        if (detail === 'email_not_allowed') {
          setSharedAccessRequired(true)
          setSharedAccessError('This shared report is restricted to a specific email address.')
          return
        }
        toast.error('Shared report not found')
      })
      .finally(() => setIsLoadingShared(false))
  }, [shareQuery, sharedEmailQuery])

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
        setViewerOpen(true)
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

  const openShareDialog = (target: WorkspaceReport) => {
    setShareTarget(target)
    setShareAccessMode(target.share_access_mode === 'specific_email' ? 'specific_email' : 'anyone_with_link')
    setShareEmail(target.allowed_email || '')
    setShareModalOpen(true)
  }

  const handleShare = async (reportId: number) => {
    if (shareAccessMode === 'specific_email' && !shareEmail.trim()) {
      toast.error('Enter the allowed email address first')
      return
    }
    try {
      const res = await api.createShareLink(reportId, {
        access_mode: shareAccessMode,
        allowed_email: shareAccessMode === 'specific_email' ? shareEmail.trim() : undefined,
      })
      const shareUrl = res.share_url || `${window.location.origin}/reports?shared=${res.share_token}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success(shareAccessMode === 'specific_email' ? 'Restricted share link copied' : 'Share link copied')
      setShareModalOpen(false)
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
        access_mode: shareAccessMode,
      })
      toast.success(res.sent ? 'Report emailed successfully' : 'SMTP not configured - email not sent')
      setShareModalOpen(false)
    } catch {
      toast.error('Email share failed')
    }
  }

  const handleSharedAccessSubmit = async () => {
    if (!shareQuery || !sharedAccessEmail.trim()) {
      setSharedAccessError('Enter the allowed email address to open this shared report.')
      return
    }

    setIsLoadingShared(true)
    setSharedAccessError('')
    try {
      const shared = await api.getSharedReport(shareQuery, sharedAccessEmail.trim())
      setReport(shared)
      setViewerOpen(true)
      await router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, shared: shareQuery, email: sharedAccessEmail.trim() },
        },
        undefined,
        { shallow: true }
      )
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      setSharedAccessError(
        detail === 'email_not_allowed'
          ? 'That email does not have access to this shared report.'
          : 'The shared report could not be opened.'
      )
    } finally {
      setIsLoadingShared(false)
    }
  }

  const handleDeleteReport = async (reportId: number) => {
    const confirmed = typeof window === 'undefined' ? false : window.confirm('Delete this saved report from workspace history?')
    if (!confirmed) return

    setDeletingReportId(reportId)
    try {
      await api.deleteReport(reportId)
      const nextHistory = history.filter((item) => item.id !== reportId)
      setHistory(nextHistory)
      if (report?.id === reportId) {
        setReport(null)
        setViewerOpen(false)
        if (nextHistory.length > 0) {
          const fallback = await api.getReport(nextHistory[0].id)
          setReport(fallback)
        }
      }
      toast.success('Report deleted')
    } catch {
      toast.error('Could not delete report')
    } finally {
      setDeletingReportId(null)
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

  const visibleHistory = useMemo(
    () => (showAllHistory ? filteredHistory : filteredHistory.slice(0, 5)),
    [filteredHistory, showAllHistory]
  )

  return (
    <AppLayout title="Financial Reports" subtitle="Workspace library">
      <Alert variant="success" icon="AI">
        AI-generated reports are saved to the workspace library. Open them in the report viewer, share them, download PDF copies, or remove older versions from history.
      </Alert>

      {shareQuery && sharedAccessRequired && !report && (
        <Panel style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Restricted Shared Report</div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 14 }}>
            This report is limited to a specific email address. Enter that email to open the shared document.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 10 }}>
            <input
              value={sharedAccessEmail}
              onChange={(e) => setSharedAccessEmail(e.target.value)}
              placeholder="Allowed email address"
              style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
            />
            <Button onClick={handleSharedAccessSubmit} disabled={isLoadingShared}>
              {isLoadingShared ? 'Checking...' : 'Open Shared Report'}
            </Button>
          </div>
          {sharedAccessError && <div style={{ fontSize: 12.5, color: '#f87171', marginTop: 10 }}>{sharedAccessError}</div>}
        </Panel>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {REPORTS.map((r) => (
          <Panel key={r.id} style={{ position: 'relative', overflow: 'hidden', minHeight: 184 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(201,168,76,0.12), transparent 40%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
              <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8C56A', fontSize: 12, fontWeight: 700 }}>
                {r.icon}
              </div>
              <div style={{ flex: 1, minHeight: 124, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 16 }}>{r.title}</div>
                  <Badge variant={r.badgeVariant}>{r.badge}</Badge>
                  {r.aiPowered && <Badge variant="green">Workspace AI</Badge>}
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 18, flex: 1 }}>{r.description}</div>
                <Button onClick={() => generate(r.id)} disabled={generating === r.id} style={{ alignSelf: 'flex-start', paddingInline: 16 }}>
                  {generating === r.id ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'start' }}>
        <Panel title="Saved History" titleIcon="LIB" iconColor="#E8C56A">
          <div style={{ fontSize: 12, color: '#7A8BA8', marginBottom: 10 }}>{historyLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, period, or type..."
              style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
{visibleHistory.map((rep) => {
                const isActive = report?.id === rep.id
                return (
                  <div
                    key={rep.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 12,
                      width: '100%',
                      padding: 14,
                      background: isActive ? 'rgba(201,168,76,0.1)' : '#10141d',
                      border: isActive ? '1px solid rgba(201,168,76,0.38)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => selectReport(rep.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          selectReport(rep.id)
                        }
                      }}
                      style={{ minWidth: 0, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{rep.title}</div>
                        <Badge variant="slate">{rep.report_type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        {new Date(rep.created_at).toLocaleDateString('en-GB')} | {rep.period_label || rep.report_type}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Button small variant="ghost" onClick={() => selectReport(rep.id, { openViewer: true })}>
                        {loadingReportId === rep.id ? 'Opening...' : 'Open Viewer'}
                      </Button>
                      <Button small variant="ghost" onClick={() => handleDownloadPdf(rep.id)}>PDF</Button>
                      <Button small variant="ghost" onClick={() => openShareDialog(rep)}>Share</Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep.id)}
                        disabled={deletingReportId === rep.id}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          border: '1px solid rgba(245,54,92,0.28)',
                          background: 'rgba(245,54,92,0.1)',
                          color: '#F5365C',
                          cursor: 'pointer',
                          opacity: deletingReportId === rep.id ? 0.5 : 1,
                        }}
                        aria-label="Delete report"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredHistory.length > 5 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAllHistory((value) => !value)}
                  style={{ justifyContent: 'center', marginTop: 4 }}
                >
                  {showAllHistory ? 'Show less' : `View more (${filteredHistory.length - 5})`}
                </Button>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Viewer Preview" titleIcon="VIEW" iconColor="#34d399">
          {report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{report.title}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant="green">Saved to Workspace</Badge>
                    <Badge variant="slate">{report.report_type.replace(/_/g, ' ')}</Badge>
                    {report.period_label && <Badge variant="blue">{report.period_label}</Badge>}
                  </div>
                </div>
                <Button onClick={() => setViewerOpen(true)}>
                  Open Viewer
                </Button>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(10,15,26,0.9), rgba(10,15,26,0.7))', border: '1px solid rgba(30,41,59,0.9)', borderRadius: 18, padding: '24px 26px', minHeight: 320, maxHeight: 560, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(10,15,26,1) 100%)', pointerEvents: 'none' }} />
                <div style={{ maxHeight: 500, overflowY: 'auto', overflowX: 'hidden', opacity: 0.95, paddingRight: 4 }}>
                  {previewElements}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748b' }}>Select a saved report to preview it here or open the full report viewer.</div>
          )}
        </Panel>
      </div>

      {shareModalOpen && shareTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 230, padding: 18 }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#0b1120', border: '1px solid rgba(51,65,85,0.82)', borderRadius: 22, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.88)' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Share Report</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>{shareTarget.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141820', color: '#cbd5e1', cursor: 'pointer', fontSize: 16 }}
              >
                X
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, padding: 22 }}>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                Choose who can open this report before copying the link or emailing it.
              </div>
              <select
                value={shareAccessMode}
                onChange={(e) => setShareAccessMode(e.target.value as 'anyone_with_link' | 'specific_email')}
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              >
                <option value="anyone_with_link">Anyone with link</option>
                <option value="specific_email">Specific email only</option>
              </select>
              <input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Recipient name"
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              />
              <input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder={shareAccessMode === 'specific_email' ? 'Allowed / recipient email' : 'Recipient email (optional for link)'}
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setShareModalOpen(false)}>Cancel</Button>
                <Button variant="ghost" onClick={() => handleShare(shareTarget.id)}>Copy Share Link</Button>
                <Button onClick={() => handleEmailShare(shareTarget.id)}>Email PDF</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerOpen && report && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 220, padding: 18 }}>
          <div style={{ width: '100%', maxWidth: 1280, background: '#0b1120', border: '1px solid rgba(51,65,85,0.82)', borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto auto 1fr', maxHeight: 'calc(100vh - 36px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.88)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>{report.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button small variant="ghost" onClick={() => openShareDialog(report)}>Share</Button>
                <Button small variant="ghost" onClick={() => handleDownloadPdf(report.id)}>Download PDF</Button>
                <Button small onClick={() => router.push('/ai')}>Refine with AI</Button>
                <button
                  type="button"
                  onClick={() => setViewerOpen(false)}
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#141820', color: '#cbd5e1', cursor: 'pointer', fontSize: 18 }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, padding: '16px 22px', borderBottom: '1px solid rgba(51,65,85,0.35)', background: '#0f172a' }}>
              <select
                value={shareAccessMode}
                onChange={(e) => setShareAccessMode(e.target.value as 'anyone_with_link' | 'specific_email')}
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              >
                <option value="anyone_with_link">Anyone with link</option>
                <option value="specific_email">Specific email only</option>
              </select>
              <input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Recipient name"
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              />
              <input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder={shareAccessMode === 'specific_email' ? 'Allowed / recipient email' : 'Recipient email'}
                style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E8EDF5' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => handleEmailShare(report.id)}>Email PDF</Button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '26px 28px 32px', background: 'linear-gradient(180deg, #08101d 0%, #0b1220 100%)', fontFamily: 'Instrument Sans, sans-serif' }}>
              <div style={{ maxWidth: 980, margin: '0 auto', background: '#0b1322', border: '1px solid rgba(51,65,85,0.55)', borderRadius: 20, padding: 'clamp(18px, 3vw, 30px)', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
                {fullReportElements}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
