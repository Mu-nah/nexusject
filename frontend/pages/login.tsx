import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function Login() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('dominic@harvesttouch.org.uk')
  const [password, setPassword] = useState('Admin1234!')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welcome back, Dominic')
      router.push('/dashboard')
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0C0F14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Instrument Sans', sans-serif",
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(#C8D3E8 1px, transparent 1px), linear-gradient(to right, #C8D3E8 1px, transparent 1px)',
        backgroundSize: '32px 32px', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22,
            fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: '#0C0F14',
          }}>N¹</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.3px', fontFamily: "'Instrument Serif', serif" }}>
            Nexus One
          </div>
          <div style={{ fontSize: 10, color: '#C9A84C', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
            by Realtouch
          </div>
          <div style={{ fontSize: 13, color: '#5C6B84', marginTop: 10 }}>
            Harvest Touch CIC · Enterprise Platform
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: '#141820', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: 28,
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 13 }}>
              <label style={{
                display: 'block', fontSize: 10.5, fontWeight: 600, color: '#5C6B84',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#E8EDF5',
                  fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{
                display: 'block', fontSize: 10.5, fontWeight: 600, color: '#5C6B84',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#E8EDF5',
                  fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '11px', background: '#C9A84C',
                border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                color: '#0C0F14', cursor: isLoading ? 'wait' : 'pointer',
                fontFamily: "'Instrument Sans', sans-serif", transition: 'background 0.15s',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 18, padding: 14, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: '#5C6B84', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo Credentials</div>
            <div style={{ fontSize: 12, color: '#7A8BA8', lineHeight: 1.8 }}>
              <strong style={{ color: '#C9A84C' }}>CFO:</strong> dominic@harvesttouch.org.uk<br />
              <strong style={{ color: '#C9A84C' }}>Password:</strong> Admin1234!
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11.5, color: '#2D3A52', fontFamily: "'JetBrains Mono', monospace" }}>
          Nexus One v1.0 · Realtouch Global Ventures Ltd
        </div>
      </div>
    </div>
  )
}
