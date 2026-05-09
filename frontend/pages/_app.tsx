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
        <link rel="icon" href="/favicon.ico" />
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
