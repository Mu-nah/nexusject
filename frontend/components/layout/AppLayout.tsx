import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import { Moon, Sun } from 'lucide-react'

import api from '@/lib/api'
import { DashboardPeriodMode, useAuthStore, useUiStore } from '@/lib/store'

type ModuleKey = 'finance' | 'operations' | 'people_hr' | 'compliance' | 'system' | 'overview'
type SidebarBadgeTone = 'gold' | 'red'
type SidebarBadgeKind = 'count' | 'status'

type SidebarBadge = {
  label: string
  tone: SidebarBadgeTone
  kind: SidebarBadgeKind
}

type NavItem = {
  label: string
  href: string
  icon: string
  module: ModuleKey
  badge?: SidebarBadge
  adminOnly?: boolean
}

type NavSection = {
  section: string
  module: ModuleKey
  items: NavItem[]
}

const createCountBadge = (count: number, tone: SidebarBadgeTone = 'gold'): SidebarBadge | undefined =>
  count > 0 ? { label: String(count), tone, kind: 'count' } : undefined

const createStatusBadge = (label: string, tone: SidebarBadgeTone = 'gold'): SidebarBadge => ({
  label,
  tone,
  kind: 'status',
})

const BASE_NAV: NavSection[] = [
  {
    section: 'Overview',
    module: 'overview',
    items: [
      { label: 'Executive Dashboard', href: '/dashboard', icon: 'O', module: 'overview' },
      { label: 'Realtouch IQ', href: '/ai', icon: 'AI', module: 'overview', badge: createStatusBadge('Live') },
    ],
  },
  {
    section: 'Finance',
    module: 'finance',
    items: [
      { label: 'Accounting', href: '/accounting', icon: 'AC', module: 'finance' },
      { label: 'Expenses', href: '/expenses', icon: 'EX', module: 'finance' },
      { label: 'Donations', href: '/donations', icon: 'DN', module: 'finance' },
      { label: 'Financial Reports', href: '/reports', icon: 'FR', module: 'finance' },
      { label: 'AR & Invoicing', href: '/ar', icon: 'AR', module: 'finance' },
      { label: 'AP & Suppliers', href: '/ap', icon: 'AP', module: 'finance' },
      { label: 'VAT & MTD', href: '/vat', icon: 'VT', module: 'finance' },
      { label: 'Budgets & FP&A', href: '/budgets', icon: 'BD', module: 'finance' },
      { label: 'Cash Flow Forecast', href: '/cashflow', icon: 'CF', module: 'finance' },
    ],
  },
  {
    section: 'Operations',
    module: 'operations',
    items: [
      { label: 'Grant Management', href: '/grants', icon: 'GR', module: 'operations' },
      { label: 'Programmes', href: '/programmes', icon: 'PR', module: 'operations' },
      { label: 'Project Management', href: '/projects', icon: 'PM', module: 'operations' },
    ],
  },
  {
    section: 'People & HR',
    module: 'people_hr',
    items: [
      { label: 'Payroll', href: '/payroll', icon: 'PY', module: 'people_hr' },
      { label: 'HR Management', href: '/hr', icon: 'HR', module: 'people_hr' },
      { label: 'Volunteers', href: '/volunteers', icon: 'VO', module: 'people_hr' },
      { label: 'Rota & Timesheets', href: '/rota', icon: 'RT', module: 'people_hr' },
      { label: 'Sponsorship', href: '/ukvi', icon: 'SP', module: 'people_hr' },
    ],
  },
  {
    section: 'Compliance & Governance',
    module: 'compliance',
    items: [
      { label: 'Compliance Hub', href: '/compliance', icon: 'CP', module: 'compliance' },
      { label: 'GDPR & Data', href: '/gdpr', icon: 'GD', module: 'compliance' },
      { label: 'Governance', href: '/governance', icon: 'GV', module: 'compliance' },
      { label: 'Security & 2FA', href: '/security', icon: 'SC', module: 'compliance' },
    ],
  },
]

interface Props {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
}

const normalizeModules = (modules?: string[]) => {
  const list = modules?.filter(Boolean) ?? []
  return new Set(list.length ? list : ['finance', 'operations', 'people_hr', 'compliance'])
}

const roleLabel = (role?: string) => {
  if (!role) return 'viewer'
  return role === 'owner' ? 'admin' : role.replace(/_/g, ' ')
}

export default function AppLayout({ children, title, subtitle, actions }: Props) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { dashboardPeriodMode, setDashboardPeriodMode } = useUiStore()
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isPhone, setIsPhone] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const isWorkspaceAdmin = user?.role === 'owner' || user?.role === 'admin'
  const allowedModules = normalizeModules(user?.module_access)

  const { data: expenseSummary } = useQuery({
    queryKey: ['layout-expense-summary'],
    queryFn: api.getExpenseSummary,
    enabled: allowedModules.has('finance'),
    staleTime: 30000,
  })
  const { data: grantsSummary } = useQuery({
    queryKey: ['layout-grants-summary'],
    queryFn: api.getGrantsSummary,
    enabled: allowedModules.has('operations'),
    staleTime: 30000,
  })
  const { data: accessMonitor } = useQuery({
    queryKey: ['layout-access-monitor'],
    queryFn: api.getAccessMonitor,
    enabled: isWorkspaceAdmin,
    staleTime: 30000,
  })
  const { data: ukviWorkspace } = useQuery({
    queryKey: ['layout-ukvi-workspace'],
    queryFn: api.getUkviWorkspace,
    enabled: allowedModules.has('people_hr'),
    staleTime: 30000,
  })
  const adminPendingInvites = Number(accessMonitor?.summary?.pending_invites ?? 0)
  const workspaceAdminBadge = createCountBadge(adminPendingInvites)

  const navSections = useMemo(() => {
    const pendingExpenses = Number(expenseSummary?.pending_count ?? 0)
    const activeGrants = Number(grantsSummary?.active_grants ?? 0)
    const urgentCompliance = 0
    const ukviDuties = Array.isArray(ukviWorkspace?.duties) ? ukviWorkspace.duties : []
    const ukviWorkers = Array.isArray(ukviWorkspace?.workers) ? ukviWorkspace.workers : []
    const ukviActionCount =
      ukviDuties.filter((item: any) => item?.status === 'Due' || item?.status === 'Overdue').length +
      ukviWorkers.filter((item: any) => item?.rtw === 'Due Soon' || item?.rtw === 'Expired').length

    const sections = BASE_NAV
      .filter((section) => section.module === 'overview' || allowedModules.has(section.module))
      .map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (item.href === '/expenses') {
            return {
              ...item,
              badge: createCountBadge(pendingExpenses, 'red'),
            }
          }
          if (item.href === '/grants') {
            return {
              ...item,
              badge: createCountBadge(activeGrants),
            }
          }
          if (item.href === '/compliance') {
            return {
              ...item,
              badge: createCountBadge(urgentCompliance, 'red'),
            }
          }
          if (item.href === '/ukvi') {
            return {
              ...item,
              badge: createCountBadge(ukviActionCount, 'red'),
            }
          }
          return item
        }),
      }))

    return sections
  }, [allowedModules, expenseSummary?.pending_count, grantsSummary?.active_grants, ukviWorkspace?.duties, ukviWorkspace?.workers])

  const navItems = useMemo(() => navSections.flatMap((section) => section.items), [navSections])

  useEffect(() => {
    const syncViewport = () => {
      const width = window.innerWidth
      const phone = width < 760
      const tablet = width < 1360
      const compact = window.innerWidth < 1120
      setIsPhone(phone)
      setIsTablet(tablet)
      setIsCompact(compact)
      if (!compact) setSidebarOpen(false)
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const attrTheme = document.documentElement.getAttribute('data-theme')
    if (attrTheme === 'light' || attrTheme === 'dark') {
      setTheme(attrTheme)
      return
    }
    const storedTheme = window.localStorage.getItem('nexus-theme')
    if (storedTheme === 'light' || storedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', storedTheme)
      setTheme(storedTheme)
      return
    }
    document.documentElement.setAttribute('data-theme', 'dark')
    setTheme('dark')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !theme) return
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('nexus-theme', theme)
  }, [theme])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const active = nav.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return
    const navRect = nav.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    if (activeRect.top < navRect.top || activeRect.bottom > navRect.bottom) {
      nav.scrollTop += activeRect.top - navRect.top - (nav.clientHeight - active.clientHeight) / 2
    }
  }, [router.pathname])

  useEffect(() => {
    const clearNavigation = () => setIsNavigating(false)
    router.events.on('routeChangeComplete', clearNavigation)
    router.events.on('routeChangeError', clearNavigation)
    return () => {
      router.events.off('routeChangeComplete', clearNavigation)
      router.events.off('routeChangeError', clearNavigation)
    }
  }, [router.events])

  const initials =
    user?.full_name
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
    if (isNavigating || router.pathname === href) {
      setSearch('')
      setSearchOpen(false)
      setSidebarOpen(false)
      return
    }
    setIsNavigating(true)
    setSearch('')
    setSearchOpen(false)
    setSidebarOpen(false)
    try {
      await router.push(href)
    } finally {
      setIsNavigating(false)
    }
  }

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (quickResults[0]) {
      await goToSearchResult(quickResults[0].href)
    }
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  const periodOptions: Array<{ value: DashboardPeriodMode; label: string }> = [
    { value: 'normal', label: 'Normal' },
    { value: 'wtd', label: 'WTD' },
    { value: 'qtd', label: 'QTD' },
    { value: 'ytd', label: 'YTD' },
  ]
  const sidebarWidth = isPhone ? 244 : 256
  const sidebarHiddenOffset = -(sidebarWidth + 16)
  const navRowPadding = isPhone ? '7px 9px 7px 14px' : '7px 10px 7px 16px'
  const navRowGap = isPhone ? 8 : 9
  const navRowMargin = isPhone ? '1px 6px' : '1px 8px'
  const navLabelFontSize = isPhone ? 12 : 12.5
  const navIconWidth = isPhone ? 20 : 22
  const renderSidebarBadge = (badge?: SidebarBadge) => {
    if (!badge) return null
    const isCountBadge = badge.kind === 'count'
    const badgeStyle = badge.tone === 'red'
      ? { background: 'var(--red-bg)', color: 'var(--red)' }
      : { background: 'var(--gold-bg)', color: 'var(--gold2)' }

    return (
      <span
        style={{
          ...badgeStyle,
          fontSize: isCountBadge ? 9.5 : 9,
          fontWeight: 700,
          height: isCountBadge ? 20 : 18,
          padding: isCountBadge ? '2px 6px' : '1px 8px',
          borderRadius: 999,
          fontFamily: isCountBadge ? "'JetBrains Mono', monospace" : 'inherit',
          flexShrink: 0,
          minWidth: isCountBadge ? 20 : 'auto',
          maxWidth: isCountBadge ? (isPhone ? 28 : 32) : 56,
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: isCountBadge ? 'normal' : '0.01em',
        }}
      >
        {badge.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {isCompact && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 190 }}
        />
      )}

      <aside
        style={{
          width: sidebarWidth,
          background: 'var(--bg2)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: isCompact ? (sidebarOpen ? 0 : sidebarHiddenOffset) : 0,
          bottom: 0,
          zIndex: 200,
          overflowX: 'hidden',
          transition: 'left 0.2s ease, background-color 0.2s ease',
        }}
      >
        <div style={{ padding: '16px 16px 13px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, var(--gold), var(--gold3))',
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                color: 'var(--ink-inverse)',
                fontFamily: "'Instrument Serif', serif",
                flexShrink: 0,
              }}
            >
              R1
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--heading)', letterSpacing: '-0.3px' }}>Realtouch One</div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--gold)',
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
            margin: '9px 12px 6px',
            background: 'var(--bg3)',
            border: '1px solid var(--line)',
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
              background: 'var(--green)',
              borderRadius: '50%',
              boxShadow: '0 0 6px var(--green)',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: 'var(--heading)',
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.organisation ?? 'Workspace'}
          </div>
          <span style={{ fontSize: 9, color: 'var(--mute)' }}>V</span>
        </div>

        <nav ref={navRef} style={{ flex: 1, padding: '4px 0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navSections.map(({ section, items }) => (
            <div key={section} style={{ paddingTop: 4 }}>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: 'var(--mute)',
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

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    prefetch={false}
                    style={{ textDecoration: 'none' }}
                    onClick={(event) => {
                      if (router.pathname === item.href || isNavigating) {
                        event.preventDefault()
                        setSidebarOpen(false)
                        return
                      }
                      setIsNavigating(true)
                      setSidebarOpen(false)
                    }}
                  >
                    <div
                      data-active={isActive ? 'true' : 'false'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: navRowGap,
                        padding: navRowPadding,
                        margin: navRowMargin,
                        borderRadius: 7,
                        cursor: 'pointer',
                        color: isActive ? 'var(--gold2)' : 'var(--mute2)',
                        background: isActive ? 'var(--surface-hover)' : 'transparent',
                        fontWeight: isActive ? 500 : 400,
                        fontSize: navLabelFontSize,
                        transition: 'all 0.12s ease',
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
                            background: 'var(--gold)',
                            borderRadius: '0 3px 3px 0',
                          }}
                        />
                      )}
                      <span
                        style={{
                          width: navIconWidth,
                          minWidth: navIconWidth,
                          fontSize: 10,
                          flexShrink: 0,
                          opacity: isActive ? 1 : 0.9,
                          textAlign: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.label}</span>
                      {renderSidebarBadge(item.badge)}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
          <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--line)' }}>
            <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: 'linear-gradient(135deg, var(--gold), var(--gold3))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-inverse)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name ?? 'Workspace User'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                {roleLabel(user?.role)}
              </div>
            </div>
            </div>
            {isWorkspaceAdmin && (
              <Link href="/admin" style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    color: router.pathname === '/admin' ? 'var(--gold2)' : 'var(--mute2)',
                  }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--heading)' }}>Workspace Admin</div>
                      <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {adminPendingInvites > 0 ? 'Users, access, invites' : 'Users and access'}
                      </div>
                    </div>
                    {renderSidebarBadge(workspaceAdminBadge)}
                  </div>
                </Link>
              )}
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: isCompact ? 0 : sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div
          style={{
            minHeight: 60,
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            padding: isPhone ? '12px 14px' : '12px 22px',
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
                  border: '1px solid var(--line2)',
                  background: 'var(--bg3)',
                  color: 'var(--heading)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                MENU
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--heading)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 10.5, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPhone
                ? '1fr'
                : isCompact
                  ? 'minmax(0, 1fr) auto'
                  : isTablet
                    ? 'minmax(220px, 1fr) auto auto'
                    : 'minmax(240px, 280px) auto auto',
              alignItems: 'center',
              gap: 10,
              marginLeft: 'auto',
              width: isCompact ? '100%' : 'auto',
            }}
          >
            <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
              <form onSubmit={handleSearchSubmit}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg3)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '6px 12px',
                  }}
                >
                  <span style={{ color: 'var(--mute)', fontSize: 13 }}>GO</span>
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
                      color: 'var(--text)',
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
                    background: 'var(--bg2)',
                    border: '1px solid var(--line2)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
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
                        color: 'var(--heading)',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 12.5 }}>{item.label}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--mute)', fontFamily: "'JetBrains Mono', monospace" }}>{item.href}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isPhone ? 'space-between' : 'flex-start',
                gap: 10,
                minWidth: 0,
                width: isPhone ? '100%' : 'auto',
                overflowX: isPhone ? 'auto' : 'visible',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 4,
                  background: 'var(--bg3)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  flexWrap: 'nowrap',
                  minWidth: 0,
                  flex: isPhone ? 1 : '0 1 auto',
                  overflowX: 'auto',
                }}
              >
                {periodOptions.map((option) => {
                  const active = dashboardPeriodMode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDashboardPeriodMode(option.value)}
                      style={{
                        border: 'none',
                        background: active ? 'var(--gold)' : 'transparent',
                        color: active ? 'var(--ink-inverse)' : 'var(--mute2)',
                        borderRadius: 8,
                        padding: isPhone ? '8px 8px' : isCompact ? '8px 9px' : '8px 10px',
                        fontSize: isPhone ? 11 : 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'Instrument Sans', sans-serif",
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                style={{
                  width: 42,
                  height: 42,
                  minWidth: 42,
                  borderRadius: 12,
                  border: '1px solid var(--line2)',
                  background: 'var(--bg3)',
                  color: 'var(--heading)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === null ? null : theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: isPhone ? 'stretch' : isCompact ? 'flex-end' : 'flex-end',
                minWidth: 0,
                width: isPhone ? '100%' : 'auto',
              }}
            >
              {actions}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: isCompact ? 14 : 22, overflowY: 'auto', background: 'var(--bg)' }}>{children}</div>
      </main>
    </div>
  )
}
