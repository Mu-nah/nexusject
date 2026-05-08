import AppLayout from '@/components/layout/AppLayout'
import { Panel, Badge, Button, Alert, StatCard } from '@/components/ui'

export default function GDPR() {
  return (
    <AppLayout
      title="GDPR & Data"
      subtitle="UK GDPR / DPA 2018"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost">↓ Data Export</Button>
          <Button>+ Log DSAR</Button>
        </div>
      }
    >
      <Alert variant="error" icon="⚠">
        <strong>GDPR MODULE — Phase 2 Build.</strong> UK GDPR / DPA 2018 compliance infrastructure partially implemented. ICO registration, consent management, DSAR workflow, and data retention required.
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="ICO Registration" value="Pending" change="Register at ico.org.uk" changeUp={false} icon="🔒" accentColor="#F5365C" iconBg="rgba(245,54,92,0.12)" />
        <StatCard label="Open DSARs" value="0" change="30-day deadline applies" icon="≡" accentColor="#2DCE89" iconBg="rgba(45,206,137,0.12)" />
        <StatCard label="Data Subjects" value="347" change="Donors + beneficiaries" icon="⊞" accentColor="#C9A84C" iconBg="rgba(201,168,76,0.12)" />
        <StatCard label="Consent Rate" value="68%" change="Gift Aid opt-in" icon="✓" accentColor="#5E9EFF" iconBg="rgba(94,158,255,0.12)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 18 }}>
        {[
          {
            title: 'ICO Registration',
            icon: '🔴',
            status: 'Not registered',
            statusColor: '#F5365C',
            desc: 'Register at ico.org.uk — annual fee £40–£2,900 based on organisation size.',
            action: 'Register with ICO →',
            actionVariant: 'primary' as const,
          },
          {
            title: 'Consent Management',
            icon: '🟡',
            status: 'Partial',
            statusColor: '#FB8C00',
            desc: 'Gift Aid boolean exists. Consent date, withdrawal mechanism, and marketing consent not implemented.',
            action: 'Build Consent Manager',
            actionVariant: 'ghost' as const,
          },
          {
            title: 'Data Subject Rights',
            icon: '🔴',
            status: 'Not implemented',
            statusColor: '#F5365C',
            desc: 'DSAR workflow (30-day deadline), Right to Erasure, data portability — all outstanding.',
            action: 'Implement DSAR Workflow',
            actionVariant: 'ghost' as const,
          },
        ].map(card => (
          <Panel key={card.title}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: card.statusColor, marginBottom: 6 }}>{card.status}</div>
            <div style={{ fontSize: 11.5, color: '#7A8BA8', marginBottom: 14, lineHeight: 1.6 }}>{card.desc}</div>
            <Button variant={card.actionVariant} small>{card.action}</Button>
          </Panel>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="Data Retention Schedule" titleIcon="≡" iconColor="#C9A84C">
          {[
            { category: 'Employee Records', retention: '6 years after leaving', basis: 'Legal obligation' },
            { category: 'Donor Records', retention: '7 years', basis: 'Gift Aid / HMRC' },
            { category: 'Beneficiary Records', retention: '7 years', basis: 'Safeguarding' },
            { category: 'Financial Records', retention: '7 years', basis: 'Companies Act' },
            { category: 'CCTV Footage', retention: '30 days', basis: 'GDPR proportionality' },
            { category: 'Email Correspondence', retention: '3 years', basis: 'Business need' },
          ].map(row => (
            <div key={row.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
              <div>
                <div style={{ color: '#C8D3E8', fontWeight: 500 }}>{row.category}</div>
                <div style={{ color: '#5C6B84', fontSize: 11 }}>{row.basis}</div>
              </div>
              <Badge variant="slate">{row.retention}</Badge>
            </div>
          ))}
        </Panel>

        <Panel title="GDPR Compliance Roadmap" titleIcon="◷" iconColor="#5E9EFF">
          {[
            { phase: 'Phase 1 (Complete)', items: ['Gift Aid consent boolean', 'Supabase Row Level Security', 'Basic audit logging'], done: true },
            { phase: 'Phase 2 (Month 1)', items: ['ICO registration', 'Consent management UI', 'DSAR workflow (30-day)'], done: false },
            { phase: 'Phase 3 (Month 2)', items: ['Data portability export', 'Right to erasure workflow', 'Privacy notice generator'], done: false },
          ].map(p => (
            <div key={p.phase} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: p.done ? '#2DCE89' : '#5C6B84', fontSize: 11 }}>{p.done ? '✓' : '○'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.done ? '#2DCE89' : '#C8D3E8' }}>{p.phase}</span>
              </div>
              {p.items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 14px', fontSize: 11.5, color: '#5C6B84' }}>
                  <span style={{ color: p.done ? '#2DCE89' : '#5C6B84' }}>{p.done ? '✓' : '·'}</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </Panel>
      </div>
    </AppLayout>
  )
}
