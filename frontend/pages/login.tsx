import { CSSProperties, ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const ORG_TYPES = ['Company', 'Charity / NGO', 'CIC / Nonprofit', 'School / Training Centre', 'Other']
const COUNTRIES = ['United Kingdom', 'Nigeria', 'United States', 'Ghana', 'Kenya', 'South Africa']
const CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR']

export default function Login() {
  const router = useRouter()
  const { login, register, isLoading } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('dominic@harvesttouch.org.uk')
  const [password, setPassword] = useState('Admin1234!')
  const [fullName, setFullName] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [organisationType, setOrganisationType] = useState(ORG_TYPES[0])
  const [country, setCountry] = useState(COUNTRIES[0])
  const [currency, setCurrency] = useState('GBP')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
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
            N1
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
            Nexus One
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

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </Field>

            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
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
          </form>

          {mode === 'login' && (
            <div style={{ marginTop: 18, padding: 14, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: '#5C6B84', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Demo Credentials
              </div>
              <div style={{ fontSize: 12, color: '#7A8BA8', lineHeight: 1.8 }}>
                <strong style={{ color: '#C9A84C' }}>CFO:</strong> dominic@harvesttouch.org.uk
                <br />
                <strong style={{ color: '#C9A84C' }}>Password:</strong> Admin1234!
              </div>
            </div>
          )}
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
