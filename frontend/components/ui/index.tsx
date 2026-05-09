import { ReactNode, CSSProperties, MouseEventHandler } from 'react'
import toast from 'react-hot-toast'
import { downloadPageSummary } from '@/lib/export'

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeUp?: boolean
  accentColor?: string
  icon?: string
  iconBg?: string
}

export function StatCard({ label, value, change, changeUp, accentColor = '#C9A84C', icon, iconBg }: StatCardProps) {
  return (
    <div style={{
      background: '#141820', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
      padding: '16px 18px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: accentColor,
      }} />
      {icon && (
        <div style={{
          position: 'absolute', top: 14, right: 14, width: 32, height: 32,
          borderRadius: 7, background: iconBg ?? 'rgba(201,168,76,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>{icon}</div>
      )}
      <div style={{
        fontSize: 10.5, fontWeight: 500, color: '#5C6B84',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        fontFamily: "'JetBrains Mono', monospace", marginBottom: 7,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Instrument Serif', serif", fontSize: 24,
        fontWeight: 600, color: '#E8EDF5', letterSpacing: '-0.04em',
      }}>{value}</div>
      {change && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11.5, marginTop: 5,
          color: changeUp === undefined ? '#5C6B84' : changeUp ? '#2DCE89' : '#F5365C',
        }}>{change}</div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────
interface PanelProps {
  title?: string
  titleIcon?: string
  iconColor?: string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
  style?: CSSProperties
}

export function Panel({ title, titleIcon, iconColor = '#C9A84C', action, children, noPadding, style }: PanelProps) {
  return (
    <div style={{
      background: '#141820', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, overflow: 'hidden', ...style,
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, color: '#E8EDF5' }}>
            {titleIcon && <span style={{ color: iconColor }}>{titleIcon}</span>}
            {title}
          </div>
          {action}
        </div>
      )}
      <div style={noPadding ? undefined : { padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'gold' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate'

const BADGE_STYLES: Record<BadgeVariant, CSSProperties> = {
  gold:   { background: 'rgba(201,168,76,0.12)',  color: '#E8C56A' },
  green:  { background: 'rgba(45,206,137,0.12)',  color: '#2DCE89' },
  amber:  { background: 'rgba(251,140,0,0.12)',   color: '#FB8C00' },
  red:    { background: 'rgba(245,54,92,0.12)',   color: '#F5365C' },
  blue:   { background: 'rgba(94,158,255,0.12)',  color: '#5E9EFF' },
  violet: { background: 'rgba(179,136,255,0.12)', color: '#B388FF' },
  slate:  { background: '#232C3E',                color: '#7A8BA8' },
}

export function Badge({ children, variant = 'slate' }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 20,
      fontSize: 10.5, fontWeight: 600,
      ...BADGE_STYLES[variant],
    }}>{children}</span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  variant?: 'primary' | 'default' | 'ghost' | 'success' | 'danger'
  disabled?: boolean
  fullWidth?: boolean
  small?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
}

export function Button({ children, onClick, variant = 'primary', disabled, fullWidth, small, type = 'button', style }: ButtonProps) {
  const textLabel =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.map((child) => (typeof child === 'string' ? child : '')).join(' ').trim()
        : ''

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (disabled) return
    if (onClick) {
      onClick(event)
      return
    }
    if (type === 'submit') return

    const label = textLabel.toLowerCase()
    if (label.includes('export')) {
      const rawPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\//g, '-') : 'workspace'
      const fileBase = rawPath.replace(/^-+/, '') || 'workspace'
      downloadPageSummary(
        `${fileBase}-export.txt`,
        document.title || 'Workspace Export',
        [
          `Page: ${window.location.pathname}`,
          'This export was generated from the current workspace screen.',
          'A richer structured export for this module is still being connected.',
        ]
      )
      toast.success('Page export downloaded')
      return
    }

    if (label.includes('new') || label.includes('add') || label.includes('submit') || label.includes('change password') || label.includes('log')) {
      toast('This workflow is being connected next.')
      return
    }

    toast('This action is being connected next.')
  }

  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: small ? '5px 10px' : '7px 14px',
    borderRadius: 8, fontSize: small ? 12 : 12.5, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, border: 'none',
    fontFamily: "'Instrument Sans', sans-serif", transition: 'all 0.15s',
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth ? 'center' : undefined,
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: '#C9A84C', color: '#0C0F14' },
    default: { background: '#C9A84C', color: '#0C0F14' },
    ghost:   { background: 'transparent', color: '#7A8BA8', border: '1px solid rgba(255,255,255,0.08)' },
    success: { background: 'rgba(45,206,137,0.12)', color: '#2DCE89', border: '1px solid rgba(45,206,137,0.3)' },
    danger:  { background: 'rgba(245,54,92,0.12)',  color: '#F5365C', border: '1px solid rgba(245,54,92,0.3)' },
  }
  return (
    <button type={type} onClick={handleClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ── DataTable ─────────────────────────────────────────────────────────────────
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({ columns, data, emptyMessage = 'No records found' }: DataTableProps<T>) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{
                textAlign: (col.align ?? 'left') as any,
                fontSize: 10.5, fontWeight: 600, color: '#5C6B84',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontFamily: "'JetBrains Mono', monospace", background: '#141820',
                whiteSpace: 'nowrap',
              }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '32px 16px', textAlign: 'center',
                color: '#5C6B84', fontSize: 13,
              }}>{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} style={{ transition: 'background 0.1s' }}>
                {columns.map((col) => (
                  <td key={col.key} style={{
                    padding: '11px 14px',
                    borderBottom: i < data.length - 1 ? '1px solid rgba(45,58,82,0.3)' : 'none',
                    fontSize: 12.5, color: '#C8D3E8', textAlign: (col.align ?? 'left') as any,
                    fontFamily: col.mono ? "'JetBrains Mono', monospace" : undefined,
                    whiteSpace: col.mono ? 'nowrap' : undefined,
                  }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = '#C9A84C', height = 5 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ height, background: '#232C3E', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: 10, transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
type AlertVariant = 'warning' | 'success' | 'info' | 'error' | 'gold'

const ALERT_STYLES: Record<AlertVariant, CSSProperties> = {
  gold:    { background: 'rgba(201,168,76,0.08)',  border: '1px solid rgba(201,168,76,0.2)', color: '#E8C56A', borderLeft: '3px solid #C9A84C' },
  warning: { background: 'rgba(251,140,0,0.08)',   border: '1px solid rgba(251,140,0,0.2)',  color: '#FB8C00' },
  success: { background: 'rgba(45,206,137,0.08)',  border: '1px solid rgba(45,206,137,0.2)', color: '#2DCE89' },
  info:    { background: 'rgba(94,158,255,0.08)',  border: '1px solid rgba(94,158,255,0.2)', color: '#5E9EFF' },
  error:   { background: 'rgba(245,54,92,0.08)',   border: '1px solid rgba(245,54,92,0.2)',  color: '#F5365C' },
}

export function Alert({ children, variant = 'gold', icon }: { children: ReactNode; variant?: AlertVariant; icon?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 14px', borderRadius: 8, fontSize: 12.5, marginBottom: 14, lineHeight: 1.5,
      ...ALERT_STYLES[variant],
    }}>
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </div>
  )
}

// ── FormInput ─────────────────────────────────────────────────────────────────
interface FormInputProps {
  label?: string
  value?: string | number
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  as?: 'input' | 'select' | 'textarea'
  children?: ReactNode
  style?: CSSProperties
}

export function FormInput({ label, value, onChange, placeholder, type = 'text', as = 'input', children, style }: FormInputProps) {
  const inputStyle: CSSProperties = {
    width: '100%', background: '#1C2230', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#E8EDF5',
    fontFamily: "'Instrument Sans', sans-serif", outline: 'none', ...style,
  }
  return (
    <div style={{ marginBottom: 13 }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 10.5, fontWeight: 600, color: '#5C6B84',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 5, fontFamily: "'JetBrains Mono', monospace",
        }}>{label}</label>
      )}
      {as === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >{children}</select>
      ) : as === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid rgba(201,168,76,0.2)`,
      borderTop: `2px solid #C9A84C`,
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }} />
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      {icon && <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 500, color: '#7A8BA8', marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: '#5C6B84' }}>{description}</div>}
    </div>
  )
}
