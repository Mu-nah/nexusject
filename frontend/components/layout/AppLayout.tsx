import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { ReactNode, useEffect, useMemo, useState } from 'react'

const NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/dashboard', icon: '◈' },
      { label: 'AI Intelligence',     href: '/ai',        icon: '✦', badge: 'Live', badgeGold: true },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Accounting',          href: '/accounting', icon: '⊞', expandKey: 'accounting' },
      { label: 'Chart of Accounts',   href: '/accounting', icon: '·', indent: true },
      { label: 'Journal Entries',     href: '/accounting', icon: '·', indent: true },
      { label: 'Bank Reconciliation', href: '/accounting', icon: '·', indent: true },
      { label: 'Expenses',            href: '/expenses',   icon: '⊟', badge: '4', badgeRed: true },
      { label: 'Donations',           href: '/donations',  icon: '♡' },
      { label: 'Financial Reports',   href: '/reports',    icon: '≡' },
      { label: 'AR & Invoicing',      href: '/ar',         icon: '⊛' },
      { label: 'AP & Suppliers',      href: '/ap',         icon: '⊜' },
      { label: 'VAT & MTD',           href: '/vat',        icon: '%' },
      { label: 'Budgets & FP&A',      href: '/budgets',    icon: '◫' },
      { label: 'Cash Flow Forecast',  href: '/cashflow',   icon: '⟳' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Grant Management', href: '/grants',     icon: '⊕', badge: '3', badgeGold: true },
      { label: 'Programmes',       href: '/programmes', icon: '◉' },
    ],
  },
  {
    section: 'People & HR',
    items: [
      { label: 'Payroll',           href: '/payroll',     icon: '↻' },
      { label: 'HR Management',     href: '/hr',          icon: '⊞' },
      { label: 'Volunteers',        href: '/volunteers',  icon: '♡' },
      { label: 'Rota & Timesheets', href: '/rota',        icon: '◷' },
      { label: 'UKVI & Sponsorship',href: '/ukvi',        icon: '◎', badge: '!', badgeRed: true },
    ],
  },
  {
    section: 'Compliance & Governance',
    items: [
      { label: 'Compliance Hub', href: '/compliance', icon: '◎', badge: '6', badgeRed: true },
      { label: 'GDPR & Data',    href: '/gdpr',       icon: '🔒' },
      { label: 'Governance',     href: '/governance', icon: '🏛' },
      { label: 'Security & 2FA', href: '/security',   icon: '🛡' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Admin Portal', href: '/admin', icon: '⚙', badge: 'SA', badgeGold: true },
    ],
  },
]

interface Props {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
}

export default function AppLayout({ children, title, subtitle, actions }: Props) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [period, setPeriod] = useState<'MTD' | 'QTD' | 'YTD'>('YTD')
  const navHrefs = useMemo(
    () => Array.from(new Set(NAV.flatMap((section) => section.items.map((item: any) => item.href)))),
    []
  )

  useEffect(() => {
    navHrefs.forEach((href) => {
      router.prefetch(href).catch(() => undefined)
    })
  }, [navHrefs, router])

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'DO'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0C0F14' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 256, background: '#141820', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 200, overflowX: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 16px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
              borderRadius: 7, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15,
              color: '#0C0F14', fontFamily: "'Instrument Serif', serif", flexShrink: 0,
            }}>N¹</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.3px' }}>
                Nexus One
              </div>
              <div style={{ fontSize: 10, color: '#C9A84C', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                by Realtouch
              </div>
            </div>
          </div>
        </div>

        {/* Org pill */}
        <div style={{
          margin: '9px 12px', background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <div style={{ width: 7, height: 7, background: '#2DCE89', borderRadius: '50%', boxShadow: '0 0 6px #2DCE89', flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, fontWeight: 500, color: '#E8EDF5', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {user?.organisation ?? 'Workspace'}
          </div>
          <span style={{ fontSize: 9, color: '#5C6B84' }}>⌄</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ paddingTop: 4 }}>
              <div style={{
                fontSize: 9.5, fontWeight: 600, color: '#5C6B84',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '10px 16px 4px', fontFamily: "'JetBrains Mono', monospace",
              }}>{section}</div>
              {items.map((item: any) => {
                const isActive = router.pathname === item.href && !item.indent
                const badgeStyle: React.CSSProperties = item.badgeRed
                  ? { background: 'rgba(245,54,92,0.12)', color: '#F5365C' }
                  : { background: 'rgba(201,168,76,0.12)', color: '#E8C56A' }

                return (
                  <Link key={item.label + item.href} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: item.indent ? '6px 10px 6px 38px' : '7px 10px 7px 16px',
                      margin: '1px 8px', borderRadius: 7,
                      cursor: 'pointer',
                      color: item.indent ? '#5C6B84' : (isActive ? '#E8C56A' : '#7A8BA8'),
                      background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: item.indent ? 12 : 12.5,
                      transition: 'all 0.12s', position: 'relative',
                    }}>
                      {isActive && !item.indent && (
                        <div style={{
                          position: 'absolute', left: -8, top: 6, bottom: 6,
                          width: 3, background: '#C9A84C', borderRadius: '0 3px 3px 0',
                        }} />
                      )}
                      {!item.indent && (
                        <span style={{ width: 16, fontSize: 13, flexShrink: 0, opacity: isActive ? 1 : 0.8, textAlign: 'center' }}>
                          {item.icon}
                        </span>
                      )}
                      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span style={{
                          ...badgeStyle,
                          fontSize: 9.5, fontWeight: 600, padding: '2px 6px',
                          borderRadius: 10, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
                        }}>{item.badge}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer' }}
          >
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 600,
              color: '#0C0F14', flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#E8EDF5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name ?? 'Dominic Ogbuagu'}
              </div>
              <div style={{ fontSize: 10, color: '#C9A84C', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                {user?.role?.replace('_', ' ') ?? 'Super Admin · CFO'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{
          height: 60, background: '#141820', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 10.5, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                {subtitle}
              </div>
            )}
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '6px 12px', width: 220,
          }}>
            <span style={{ color: '#5C6B84', fontSize: 13 }}>⌕</span>
            <input
              type="text"
              placeholder="Search Nexus One…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#C8D3E8', fontSize: 12.5, width: '100%',
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            />
          </div>

          {/* Period toggles */}
          <div style={{ display: 'flex', gap: 2, background: '#1C2230', borderRadius: 8, padding: 3 }}>
            {(['MTD', 'QTD', 'YTD'] as const).map((p) => (
              <div
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                  background: period === p ? '#232C3E' : 'transparent',
                  color: period === p ? '#E8EDF5' : '#5C6B84',
                  fontFamily: "'Instrument Sans', sans-serif",
                  transition: '0.12s',
                }}>{p}</div>
            ))}
          </div>

          {/* Theme toggle placeholder */}
          <div style={{
            width: 52, height: 26, background: '#232C3E', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 13, cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', padding: 3, flexShrink: 0,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#C9A84C',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>🌙</div>
          </div>

          {actions}

          {/* Notifications */}
          <div style={{
            width: 34, height: 34, background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14, color: '#7A8BA8', position: 'relative', flexShrink: 0,
          }}>
            🔔
            <div style={{
              position: 'absolute', top: 6, right: 6, width: 6, height: 6,
              background: '#F5365C', borderRadius: '50%', border: '1.5px solid #141820',
            }} />
          </div>

          {/* New Entry */}
          <button
            style={{
              background: '#C9A84C', color: '#0C0F14', fontSize: 12.5, fontWeight: 500,
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              border: 'none', fontFamily: "'Instrument Sans', sans-serif", flexShrink: 0,
            }}
          >+ New Entry</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 22, overflowY: 'auto', background: '#0C0F14' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
