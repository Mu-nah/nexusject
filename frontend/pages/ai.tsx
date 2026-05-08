import { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_CHIPS = [
  'What is our cash runway?',
  'Draft the NLCF interim grant report',
  'Give me a full compliance summary',
  'What HR actions are outstanding?',
  'Prepare trustee financial report',
  'Forecast next quarter income',
  'Analyse our programme costs',
  'Summarise our grant portfolio status',
]

function renderInline(text: string, isUser: boolean): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          style={{
            color: isUser ? '#0C0F14' : '#F8FAFC',
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
  const lines = content.replace(/\r\n/g, '\n').split('\n')
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
          style={{ border: 0, borderTop: '1px solid rgba(122,139,168,0.2)', margin: '16px 0' }}
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
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              background: '#101620',
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
                        color: '#7A8BA8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                          color: '#E8EDF5',
                          borderTop: rowIndex > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
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
            color: '#F8FAFC',
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
            color: '#F8FAFC',
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
            color: '#E8EDF5',
            margin: '14px 0 6px',
          }}
        >
          {renderInline(line.slice(4), false)}
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
        <div
          key={`quote-${i}`}
          style={{
            margin: '12px 0 16px',
            padding: '12px 14px',
            borderLeft: '3px solid #C9A84C',
            background: 'rgba(201,168,76,0.08)',
            borderRadius: 8,
            color: '#F8FAFC',
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
        <ul key={`ul-${i}`} style={{ margin: '8px 0 14px 18px', padding: 0, color: '#C8D3E8' }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} style={{ marginBottom: 6, lineHeight: 1.7 }}>
              {renderInline(item, false)}
            </li>
          ))}
        </ul>
      )
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
          color: '#E8EDF5',
        }}
      >
        {renderInline(paragraphLines.join(' '), false)}
      </div>
    )
  }

  return elements
}

function MessageBubble({ msg }: { msg: Message }) {
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
          background: isUser ? '#232C3E' : 'linear-gradient(135deg, #C9A84C, #F5D98A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: isUser ? '#C8D3E8' : '#0C0F14',
        }}
      >
        {isUser ? 'DO' : 'AI'}
      </div>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          maxWidth: 720,
          lineHeight: 1.65,
          fontSize: 13,
          background: isUser ? '#C9A84C' : '#141820',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          color: isUser ? '#0C0F14' : '#E8EDF5',
          fontWeight: isUser ? 500 : 400,
          borderTopLeftRadius: isUser ? 12 : 3,
          borderTopRightRadius: isUser ? 3 : 12,
        }}
      >
        {isUser ? (
          <div style={{ lineHeight: 1.7 }}>{renderInline(msg.content, true)}</div>
        ) : (
          <div>{renderAssistantContent(msg.content)}</div>
        )}
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
          color: '#0C0F14',
          flexShrink: 0,
        }}
      >
        AI
      </div>
      <div
        style={{
          background: '#141820',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '3px 12px 12px 12px',
          padding: '10px 14px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              background: '#C9A84C',
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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Hello! 👋

Welcome to **Nexus One AI**. I have full context across Finance, HR, Operations, Compliance, and Governance for Harvest Touch CIC.

---

## Quick Snapshot - 08 May 2026

| Metric | Status |
| --- | --- |
| Total Funds | **GBP 94,820** |
| Cash (Current Account) | **GBP 64,320** |
| Cash Runway | **17.2 months** |
| Active Staff | **4 employees** |

## Items Needing Attention

- NLCF grant report due soon
- Payroll submission is approaching deadline
- Digital Inclusion programme is near full budget utilisation

Ask me anything about finances, HR, grants, compliance, or operations.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    <AppLayout title="AI Intelligence" subtitle="Overview / AI Intelligence">
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { opacity: 0.2; }
          30% { opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 104px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
            {QUICK_CHIPS.map((chip) => (
              <div
                key={chip}
                onClick={() => send(chip)}
                style={{
                  padding: '5px 11px',
                  background: '#141820',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20,
                  fontSize: 11.5,
                  color: '#7A8BA8',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                  e.currentTarget.style.color = '#E8C56A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#7A8BA8'
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
              placeholder="Ask anything about Harvest Touch finances..."
              rows={1}
              style={{
                flex: 1,
                background: '#141820',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '11px 14px',
                fontSize: 13,
                color: '#E8EDF5',
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
                background: input.trim() ? '#C9A84C' : '#1C2230',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: input.trim() ? '#0C0F14' : '#5C6B84',
                transition: 'all 0.15s',
                flexShrink: 0,
                opacity: isLoading ? 0.4 : 1,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
