import { ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'

type NavItem = {
  label: string
  href: string
  icon: string
  badge?: string
  badgeGold?: boolean
  badgeRed?: boolean
}

type NavSection = {
  section: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/dashboard', icon: '◇' },
      { label: 'AI Intelligence', href: '/ai', icon: '✦', badge: 'Live', badgeGold: true },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Accounting', href: '/accounting', icon: '⊞' },
      { label: 'Expenses', href: '/expenses', icon: '⊟', badge: '4', badgeRed: true },
      { label: 'Donations', href: '/donations', icon: '♡' },
      { label: 'Financial Reports', href: '/reports', icon: '≡' },
      { label: 'AR & Invoicing', href: '/ar', icon: '⊛' },
      { label: 'AP & Suppliers', href: '/ap', icon: '⊜' },
      { label: 'VAT & MTD', href: '/vat', icon: '%' },
      { label: 'Budgets & FP&A', href: '/budgets', icon: '◫' },
      { label: 'Cash Flow Forecast', href: '/cashflow', icon: '⟳' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Grant Management', href: '/grants', icon: '⊕', badge: '3', badgeGold: true },
      { label: 'Programmes', href: '/programmes', icon: '◉' },
    ],
  },
  {
    section: 'People & HR',
    items: [
      { label: 'Payroll', href: '/payroll', icon: '↻' },
      { label: 'HR Management', href: '/hr', icon: '⊠' },
      { label: 'Volunteers', href: '/volunteers', icon: '♡' },
      { label: 'Rota & Timesheets', href: '/rota', icon: '◷' },
      { label: 'UKVI & Sponsorship', href: '/ukvi', icon: '◎', badge: '!', badgeRed: true },
    ],
  },
  {
    section: 'Compliance & Governance',
    items: [
      { label: 'Compliance Hub', href: '/compliance', icon: '◎', badge: '6', badgeRed: true },
      { label: 'GDPR & Data', href: '/gdpr', icon: '▣' },
      { label: 'Governance', href: '/governance', icon: '⌘' },
      { label: 'Security & 2FA', href: '/security', icon: '▦' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Workspace Admin', href: '/admin', icon: '⚙', badge: 'SA', badgeGold: true },
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
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = useMemo(() => NAV.flatMap((section) => section.items), [])

  useEffect(() => {
    const syncViewport = () => {
      const compact = window.innerWidth < 1120
      setIsCompact(compact)
      if (!compact) setSidebarOpen(false)
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const initials = user?.full_name
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'DO'

  const quickResults = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return []
    return navItems
      .filter((item) => item.label.toLowerCase().includes(needle) || item.href.toLowerCase().includes(needle))
      .slice(0, 6)
  }, [navItems, search])

  const goToSearchResult = async (href: string) => {
    setSearch('')
    setSearchOpen(false)
    await router.push(href)
  }

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (quickResults[0]) {
      await goToSearchResult(quickResults[0].href)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0C0F14' }}>
      {isCompact && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,18,0.72)', zIndex: 190 }}
        />
      )}
      <aside
        style={{
          width: 256,
          background: '#141820',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          position: isCompact ? 'fixed' : 'fixed',
          top: 0,
          left: isCompact ? (sidebarOpen ? 0 : -272) : 0,
          bottom: 0,
          zIndex: 200,
          overflowX: 'hidden',
          transition: 'left 0.2s ease',
        }}
      >
        <div style={{ padding: '16px 16px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                color: '#0C0F14',
                fontFamily: "'Instrument Serif', serif",
                flexShrink: 0,
              }}
            >
              N1
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.3px' }}>
                Nexus One
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#C9A84C',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                by Realtouch
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: '9px 12px',
            background: '#1C2230',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '8px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              background: '#2DCE89',
              borderRadius: '50%',
              boxShadow: '0 0 6px #2DCE89',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: '#E8EDF5',
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.organisation ?? 'Workspace'}
          </div>
          <span style={{ fontSize: 9, color: '#5C6B84' }}>⌄</span>
        </div>

        <nav style={{ flex: 1, padding: '4px 0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ paddingTop: 4 }}>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: '#5C6B84',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '10px 16px 4px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {section}
              </div>
              {items.map((item) => {
                const isActive = router.pathname === item.href
                const badgeStyle = item.badgeRed
                  ? { background: 'rgba(245,54,92,0.12)', color: '#F5365C' }
                  : { background: 'rgba(201,168,76,0.12)', color: '#E8C56A' }

                return (
                  <Link key={`${item.label}-${item.href}`} href={item.href} prefetch={false} style={{ textDecoration: 'none' }} onClick={() => setSidebarOpen(false)}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '7px 10px 7px 16px',
                        margin: '1px 8px',
                        borderRadius: 7,
                        cursor: 'pointer',
                        color: isActive ? '#E8C56A' : '#7A8BA8',
                        background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                        fontWeight: isActive ? 500 : 400,
                        fontSize: 12.5,
                        transition: 'all 0.12s',
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            left: -8,
                            top: 6,
                            bottom: 6,
                            width: 3,
                            background: '#C9A84C',
                            borderRadius: '0 3px 3px 0',
                          }}
                        />
                      )}
                      <span style={{ width: 16, fontSize: 13, flexShrink: 0, opacity: isActive ? 1 : 0.8, textAlign: 'center' }}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            ...badgeStyle,
                            fontSize: 9.5,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            flexShrink: 0,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: 'linear-gradient(135deg, #C9A84C, #F5D98A)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: '#0C0F14',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#E8EDF5',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.full_name ?? 'Dominic Ogbuagu'}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#C9A84C',
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                }}
              >
                {user?.role?.replace('_', ' ') ?? 'owner'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: isCompact ? 0 : 256, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div
          style={{
            minHeight: 60,
            background: '#141820',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            padding: '12px 22px',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
            {isCompact && (
              <button
                onClick={() => setSidebarOpen((value) => !value)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#1C2230',
                  color: '#E8EDF5',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ☰
              </button>
            )}
            <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 10.5, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                {subtitle}
              </div>
            )}
          </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap', width: isCompact ? '100%' : 'auto' }}>
            <div style={{ position: 'relative', width: isCompact ? '100%' : 260, flex: isCompact ? '1 1 100%' : undefined }}>
              <form onSubmit={handleSearchSubmit}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#1C2230',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: '6px 12px',
                  }}
                >
                  <span style={{ color: '#5C6B84', fontSize: 13 }}>⌕</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                    placeholder="Jump to a page..."
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#C8D3E8',
                      fontSize: 12.5,
                      width: '100%',
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  />
                </div>
              </form>

              {searchOpen && quickResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: '#141820',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
                    zIndex: 20,
                  }}
                >
                  {quickResults.map((item) => (
                    <button
                      key={`${item.href}-${item.label}`}
                      onMouseDown={() => goToSearchResult(item.href)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#E8EDF5',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 12.5 }}>{item.label}</span>
                        <span style={{ fontSize: 10.5, color: '#5C6B84', fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.href}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {actions}
          </div>
        </div>

        <div style={{ flex: 1, padding: isCompact ? 14 : 22, overflowY: 'auto', background: '#0C0F14' }}>{children}</div>
      </main>
    </div>
  )
}
