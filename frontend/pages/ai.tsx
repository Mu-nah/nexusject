import { useState, useRef, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'

interface Message { role: 'user' | 'assistant'; content: string }

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

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 10, maxWidth: 800, alignSelf: isUser ? 'flex-end' : 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 3,
        background: isUser ? '#232C3E' : 'linear-gradient(135deg, #C9A84C, #F5D98A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, color: isUser ? '#C8D3E8' : '#0C0F14',
      }}>{isUser ? 'DO' : 'AI'}</div>
      <div style={{
        padding: '11px 15px', borderRadius: 12, maxWidth: 640, lineHeight: 1.65, fontSize: 13,
        background: isUser ? '#C9A84C' : '#141820',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
        color: isUser ? '#0C0F14' : '#E8EDF5',
        fontWeight: isUser ? 500 : 400,
        borderTopLeftRadius: isUser ? 12 : 3,
        borderTopRightRadius: isUser ? 3 : 12,
      }}>
        {msg.content.split('\n').map((line, i) => {
          if (line.startsWith('**') && line.endsWith('**')) {
            return <div key={i} style={{ fontWeight: 600, color: isUser ? '#0C0F14' : '#E8EDF5', marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
          }
          if (line.startsWith('·')) {
            return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, color: isUser ? 'rgba(12,15,20,0.8)' : '#7A8BA8' }}>{line}</div>
          }
          if (line === '') return <div key={i} style={{ height: 8 }} />
          const parts = line.split(/(\*\*.*?\*\*)/g)
          return (
            <div key={i} style={{ marginBottom: 2 }}>
              {parts.map((part, j) =>
                part.startsWith('**') ? (
                  <strong key={j} style={{ color: isUser ? '#0C0F14' : '#E8EDF5' }}>{part.replace(/\*\*/g, '')}</strong>
                ) : part
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #F5D98A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#0C0F14', flexShrink: 0 }}>AI</div>
      <div style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '3px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 5, height: 5, background: '#C9A84C', borderRadius: '50%',
            animation: `typing 1.2s infinite ${delay}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Good day. I'm your **Nexus One AI** — I have full context across Finance, HR, Operations, Compliance, and Governance for Harvest Touch CIC.

**I'm currently tracking:**
· NLCF grant report due in **13 days** — 4 activities still need cost coding
· March payroll run due in **6 days** — 2 timesheets not submitted
· Cash runway is **10.8 months** at current burn rate
· Digital Inclusion programme is at **93% of budget** with below-target beneficiary numbers

Ask me anything about finances, HR, grants, compliance, or operations.`,
  }])
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
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `I'm temporarily unable to connect to the AI service. Please check your API key configuration in .env.\n\nError: ${err.message}`,
      }])
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
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 10 }}>
          {/* Quick chips */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
            {QUICK_CHIPS.map((chip) => (
              <div
                key={chip}
                onClick={() => send(chip)}
                style={{
                  padding: '5px 11px', background: '#141820', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, fontSize: 11.5, color: '#7A8BA8', cursor: 'pointer',
                  transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                  e.currentTarget.style.color = '#E8C56A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#7A8BA8'
                }}
              >{chip}</div>
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
              placeholder="Ask anything about Harvest Touch finances…"
              rows={1}
              style={{
                flex: 1, background: '#141820', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                padding: '11px 14px', fontSize: 13, color: '#E8EDF5',
                fontFamily: "'Instrument Sans', sans-serif", resize: 'none', minHeight: 42,
                maxHeight: 110, outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={isLoading || !input.trim()}
              style={{
                width: 42, height: 42, background: input.trim() ? '#C9A84C' : '#1C2230',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: input.trim() ? '#0C0F14' : '#5C6B84',
                transition: 'all 0.15s', flexShrink: 0,
                opacity: isLoading ? 0.4 : 1,
              }}
            >➤</button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
