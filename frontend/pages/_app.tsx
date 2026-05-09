import type { AppProps } from 'next/app'
import Head from 'next/head'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>Nexus One - Realtouch Enterprise Platform</title>
        <meta
          name="description"
          content="AI-powered financial operating system for Harvest Touch CIC"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg2)',
            color: 'var(--heading)',
            border: '1px solid var(--line2)',
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
