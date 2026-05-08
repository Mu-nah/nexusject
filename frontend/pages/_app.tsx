import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Head from 'next/head'
import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,     // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>Nexus One — Realtouch Enterprise Platform</title>
        <meta name="description" content="AI-powered financial operating system for Harvest Touch CIC" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141820',
            color: '#E8EDF5',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#2DCE89', secondary: '#0C0F14' } },
          error: { iconTheme: { primary: '#F5365C', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
