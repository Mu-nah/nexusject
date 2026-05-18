import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_CHIPS = [
  'What is our cash runway and burn rate?',
  'Draft a grant progress report for our largest active grant',
  'Full compliance summary — what is due in the next 90 days?',
  'What HR and payroll actions are outstanding this month?',
  'Prepare a trustee financial report for the current quarter',
  'Forecast our income and expenditure for the next 3 months',
  'Analyse our programme costs and cost per beneficiary',
  'Summarise our full grant portfolio — spend vs awarded',
  'Are we at risk of any HMRC penalties or filing deadlines?',
  'Check our payroll — any NMW/NLW compliance issues?',
  'What Gift Aid is claimable and how do we submit to HMRC?',
  'Review our UKVI sponsor licence — any reporting duties due?',
  'Explain our VAT position and MTD obligations',
  'Draft a management accounts commentary for the board',
  'What budget variances require attention this month?',
  'Summarise our GDPR compliance status and open DSARs',
]

const buildInitialMessage = (organisation?: string) => `# Hello

Welcome to **Realtouch IQ** — your AI co-pilot for **${organisation || 'your workspace'}**.

I have live access to your workspace data and expert knowledge across all Realtouch One modules. Ask me anything about:

- **Finance** — cash flow, burn rate, budget variances, cashflow forecasts, VAT & MTD
- **Grants & Programmes** — portfolio status, utilisation, funder reports, cost per beneficiary
- **Payroll & HR** — payroll calculations, NMW compliance, statutory pay, RTI obligations
- **Compliance** — HMRC deadlines, Companies House filings, Charity Commission returns, ICO/GDPR
- **UKVI & Sponsorship** — sponsor licence, CoS management, reporting duties, RTW compliance
- **Governance** — trustee reports, CIC annual report, conflict of interest, board packs

Use the quick prompts below or type your own question. I give specific £ figures, legal citations, and actionable recommendations.`

function renderInline(text: string, isUser: boolean): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          style={{
            color: isUser ? 'var(--ink-inverse)' : 'var(--heading)',
            fontWeight: 700,
          }}
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function normaliseAssistantMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/^\s*#+\s*$/gm, '')
    .replace(/^\s{0,3}(#{1,6})([^ #\n])/gm, '$1 $2')
    .replace(/^\s*[-*]\s*\*\*(.+?)\*\*:\s*(.+)$/gm, '- **$1:** $2')
    .replace(/^\s*(\d+)\.\s*(.+)$/gm, '$1. $2')
    .trim()
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

function renderAssistantContent(content: string): ReactNode[] {
  const lines = normaliseAssistantMarkdown(content).split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      i += 1
      continue
    }

    if (line === '---') {
      elements.push(
        <hr
          key={`hr-${i}`}
          style={{ border: 0, borderTop: '1px solid var(--line2)', margin: '16px 0' }}
        />
      )
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
              margin: '12px 0 16px',
              border: '1px solid var(--line2)',
              borderRadius: 10,
              background: 'var(--bg2)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
              <thead>
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: 10.5,
                        color: 'var(--mute)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--line2)',
                      }}
                    >
                      {renderInline(cell, false)}
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
                          padding: '10px 12px',
                          fontSize: 12.5,
                          color: 'var(--text)',
                          borderTop: rowIndex > 0 ? '1px solid var(--line)' : 'none',
                          verticalAlign: 'top',
                        }}
                      >
                        {renderInline(cell, false)}
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
      elements.push(
        <div
          key={`h1-${i}`}
          style={{
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 700,
            color: 'var(--heading)',
            marginBottom: 10,
          }}
        >
          {renderInline(line.slice(2), false)}
        </div>
      )
      i += 1
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <div
          key={`h2-${i}`}
          style={{
            fontSize: 16,
            lineHeight: 1.3,
            fontWeight: 700,
            color: 'var(--heading)',
            margin: '16px 0 8px',
          }}
        >
          {renderInline(line.slice(3), false)}
        </div>
      )
      i += 1
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <div
          key={`h3-${i}`}
          style={{
            fontSize: 14,
            lineHeight: 1.35,
            fontWeight: 700,
            color: 'var(--heading)',
            margin: '14px 0 6px',
          }}
        >
          {renderInline(line.slice(4), false)}
        </div>
      )
      i += 1
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i += 1
      }

      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '8px 0 14px 18px', padding: 0, color: 'var(--text)' }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} style={{ marginBottom: 8, lineHeight: 1.7 }}>
              {renderInline(item, false)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }

      elements.push(
        <div
          key={`quote-${i}`}
          style={{
            margin: '12px 0 16px',
            padding: '12px 14px',
            borderLeft: '3px solid var(--gold)',
            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <div key={quoteIndex} style={{ lineHeight: 1.7 }}>
              {renderInline(quoteLine, false)}
            </div>
          ))}
        </div>
      )
      continue
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*] /, ''))
        i += 1
      }

      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '8px 0 14px 18px', padding: 0, color: 'var(--text)' }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} style={{ marginBottom: 6, lineHeight: 1.7 }}>
              {renderInline(item, false)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^(warning|note|summary|status|recommendation|next steps?)\s*:/i.test(line)) {
      const [label, ...rest] = line.split(':')
      elements.push(
        <div
          key={`callout-${i}`}
          style={{
            margin: '12px 0 16px',
            padding: '12px 14px',
            borderLeft: '3px solid var(--gold)',
            background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          <strong style={{ color: 'var(--heading)' }}>{label.trim()}:</strong>{' '}
          {renderInline(rest.join(':').trim(), false)}
        </div>
      )
      i += 1
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const current = lines[i].trim()
      if (
        !current ||
        current === '---' ||
        current.startsWith('#') ||
        current.startsWith('|') ||
        current.startsWith('>') ||
        /^[-*] /.test(current)
      ) {
        break
      }
      paragraphLines.push(current)
      i += 1
    }

    elements.push(
      <div
        key={`p-${i}`}
        style={{
          marginBottom: 10,
          lineHeight: 1.75,
          color: 'var(--text)',
        }}
      >
        {renderInline(paragraphLines.join(' '), false)}
      </div>
    )
  }

  return elements
}

function MessageBubble({ msg, userInitials }: { msg: Message; userInitials: string }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        maxWidth: 900,
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 3,
          background: isUser ? 'var(--surface-strong)' : 'linear-gradient(135deg, #C9A84C, #F5D98A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: isUser ? 'var(--text)' : 'var(--ink-inverse)',
        }}
      >
        {isUser ? userInitials : 'AI'}
      </div>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 16,
          maxWidth: 720,
          lineHeight: 1.65,
          fontSize: 13,
          background: isUser ? 'var(--gold)' : 'var(--bg2)',
          border: isUser ? 'none' : '1px solid var(--line2)',
          color: isUser ? 'var(--ink-inverse)' : 'var(--text)',
          fontWeight: isUser ? 500 : 400,
          borderTopLeftRadius: isUser ? 16 : 5,
          borderTopRightRadius: isUser ? 5 : 16,
          boxShadow: isUser ? 'none' : 'var(--shadow)',
        }}
      >
        {isUser ? <div style={{ lineHeight: 1.7 }}>{renderInline(msg.content, true)}</div> : <div>{renderAssistantContent(msg.content)}</div>}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ink-inverse)',
          flexShrink: 0,
        }}
      >
        AI
      </div>
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--line2)',
          borderRadius: '3px 12px 12px 12px',
          padding: '10px 14px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {[0, 0.2, 0.4].map((delay, index) => (
          <div
            key={index}
            style={{
              width: 5,
              height: 5,
              background: 'var(--gold)',
              borderRadius: '50%',
              animation: `typing 1.2s infinite ${delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { user } = useAuthStore()
  const userInitials = useMemo(
    () =>
      user?.full_name
        ?.split(' ')
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'ME',
    [user?.full_name]
  )
  const initialMessage = useMemo(() => buildInitialMessage(user?.organisation), [user?.organisation])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 0) return current
      return [{ role: 'assistant', content: initialMessage }]
    })
  }, [initialMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const send = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || isLoading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      const res = await api.aiChat(msg, history)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `## Connection issue

I'm temporarily unable to connect to the AI service. Please check your API key configuration in .env.

**Error:** ${err.message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="Realtouch IQ" subtitle="AI Co-Pilot — Live workspace intelligence">
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { opacity: 0.2; }
          30% { opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 104px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
          {messages.map((msg, index) => <MessageBubble key={index} msg={msg} userInitials={userInitials} />)}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
            {QUICK_CHIPS.map((chip) => (
              <div
                key={chip}
                onClick={() => send(chip)}
                style={{
                  padding: '5px 11px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--line2)',
                  borderRadius: 20,
                  fontSize: 11.5,
                  color: 'var(--mute)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                  e.currentTarget.style.color = 'var(--gold)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line2)'
                  e.currentTarget.style.color = 'var(--mute)'
                }}
              >
                {chip}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={`Ask anything about ${user?.organisation || 'your workspace'}...`}
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg2)',
                border: '1px solid var(--line2)',
                borderRadius: 8,
                padding: '11px 14px',
                fontSize: 13,
                color: 'var(--text)',
                fontFamily: "'Instrument Sans', sans-serif",
                resize: 'none',
                minHeight: 42,
                maxHeight: 110,
                outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={isLoading || !input.trim()}
              style={{
                width: 42,
                height: 42,
                background: input.trim() ? 'var(--gold)' : 'var(--surface-muted)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: input.trim() ? 'var(--ink-inverse)' : 'var(--mute)',
                transition: 'all 0.15s',
                flexShrink: 0,
                opacity: isLoading ? 0.4 : 1,
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
