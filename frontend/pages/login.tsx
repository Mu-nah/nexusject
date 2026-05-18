import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const ORG_TYPES = ['Company', 'Charity / NGO', 'CIC / Nonprofit', 'School / Training Centre', 'Other']
const COUNTRIES = ['United Kingdom', 'Nigeria', 'United States', 'Ghana', 'Kenya', 'South Africa']
const CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR']

declare global {
  interface Window {
    google?: any
  }
}

export default function Login() {
  const router = useRouter()
  const { login, googleAuth, register, acceptInvite, isLoading } = useAuthStore()
  const inviteToken = typeof router.query.invite === 'string' ? router.query.invite : ''
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [organisationType, setOrganisationType] = useState(ORG_TYPES[0])
  const [country, setCountry] = useState(COUNTRIES[0])
  const [currency, setCurrency] = useState('GBP')
  const [googleReady, setGoogleReady] = useState(false)
  const [googleHovered, setGoogleHovered] = useState(false)
  const [googleFocused, setGoogleFocused] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.google?.accounts?.oauth2) {
      setGoogleReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleReady(true)
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (inviteToken) {
        await acceptInvite({ token: inviteToken, password })
        toast.success('Workspace access activated')
      } else if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back')
      } else {
        await register({
          email,
          full_name: fullName,
          password,
          organisation_name: organisationName,
          organisation_type: organisationType,
          country,
          currency,
        })
        toast.success('Workspace created successfully')
      }
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (mode === 'login' ? 'Invalid email or password' : 'Signup failed'))
    }
  }

  const handleGoogleSignIn = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = 'postmessage'

    if (!clientId) {
      toast.error('Google client ID is not configured')
      return
    }
    if (!window.google?.accounts?.oauth2) {
      toast.error('Google sign-in is still loading')
      return
    }

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: async (response: any) => {
        if (!response?.code) {
          toast.error('Google authorisation failed')
          return
        }
        try {
          await googleAuth({
            code: response.code,
            redirect_uri: redirectUri,
            organisation_name: mode === 'signup' ? organisationName : undefined,
            organisation_type: organisationType,
            country,
            currency,
          })
          toast.success(mode === 'signup' ? 'Workspace created with Google' : 'Signed in with Google')
          router.push('/dashboard')
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || 'Google sign-in failed')
        }
      },
    })

    codeClient.requestCode()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0C0F14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            'linear-gradient(#C8D3E8 1px, transparent 1px), linear-gradient(to right, #C8D3E8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 520, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontFamily: "'Instrument Serif', serif",
              fontWeight: 400,
              color: '#0C0F14',
            }}
          >
            R1
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#E8EDF5',
              letterSpacing: '-0.3px',
              fontFamily: "'Instrument Serif', serif",
            }}
          >
            Realtouch One
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#C9A84C',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            by Realtouch
          </div>
          <div style={{ fontSize: 13, color: '#5C6B84', marginTop: 10 }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your organisation workspace'}
          </div>
        </div>

        <div
          style={{
            background: '#141820',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', gap: 6, background: '#0F1420', borderRadius: 10, padding: 4, marginBottom: 22 }}>
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                disabled={!!inviteToken}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: mode === tab ? '#C9A84C' : 'transparent',
                  color: mode === tab ? '#0C0F14' : '#7A8BA8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          {inviteToken && (
            <div style={{ marginBottom: 18, padding: 12, background: 'rgba(94,158,255,0.08)', border: '1px solid rgba(94,158,255,0.2)', borderRadius: 8, color: '#C8D3E8', fontSize: 12.5 }}>
              You were invited to join an existing workspace. Set your password below to activate your account.
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {mode === 'signup' && !inviteToken && (
              <>
                <Field label="Full Name">
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required={mode === 'signup'} style={inputStyle} />
                </Field>
                <Field label="Organisation Name">
                  <input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required={mode === 'signup'} style={inputStyle} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Organisation Type">
                    <select value={organisationType} onChange={(e) => setOrganisationType(e.target.value)} style={inputStyle}>
                      {ORG_TYPES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Country">
                    <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle}>
                      {COUNTRIES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                    {CURRENCIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
              </>
            )}

            <Field label="Email Address">
              <input
                type="email"
                name="workspace-email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                name="workspace-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </Field>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '11px',
                background: '#C9A84C',
                border: 'none',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#0C0F14',
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (mode === 'login' ? 'Signing in...' : 'Creating workspace...') : (mode === 'login' ? 'Sign In' : 'Create Workspace')}
            </button>

            {!inviteToken && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 14px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize: 10.5, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Or continue with
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || !googleReady}
                  onMouseEnter={() => setGoogleHovered(true)}
                  onMouseLeave={() => setGoogleHovered(false)}
                  onFocus={() => setGoogleFocused(true)}
                  onBlur={() => setGoogleFocused(false)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: '#FFFFFF',
                    border: googleFocused ? '1px solid #8AB4F8' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#1F2937',
                    cursor: isLoading || !googleReady ? 'wait' : 'pointer',
                    opacity: isLoading || !googleReady ? 0.7 : 1,
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: googleFocused
                      ? '0 0 0 3px rgba(66,133,244,0.18), 0 1px 2px rgba(15,23,42,0.1)'
                      : googleHovered
                        ? '0 2px 6px rgba(15,23,42,0.12)'
                        : '0 1px 2px rgba(15,23,42,0.08)',
                    transform: googleHovered && !isLoading && googleReady ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <GoogleLogo />
                  </span>
                  <span>
                    {googleReady ? (mode === 'login' ? 'Sign in with Google' : 'Sign up with Google') : 'Loading Google...'}
                  </span>
                </button>
              </>
            )}
          </form>

        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label
        style={{
          display: 'block',
          fontSize: 10.5,
          fontWeight: 600,
          color: '#5C6B84',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 5,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.18 3.56-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.07.72-2.44 1.16-4.07 1.16-3.13 0-5.78-2.11-6.72-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.37-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0 7.31 0 3.27 2.69 1.27 6.62l4.01 3.09c.94-2.85 3.59-4.94 6.72-4.94Z"
      />
    </svg>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#1C2230',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 12.5,
  color: '#E8EDF5',
  fontFamily: "'Instrument Sans', sans-serif",
  outline: 'none',
}
