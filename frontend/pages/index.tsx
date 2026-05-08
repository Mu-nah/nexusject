import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'

export default function Index() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [user, router])

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #059669, #34d399)',
          borderRadius: 12,
        }} />
        <div style={{ fontSize: 13, color: '#64748b' }}>Loading Realtouch ERP…</div>
      </div>
    </div>
  )
}
