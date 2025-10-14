import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Layout from '../components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  
  // Pages that don't require authentication
  const publicPages = ['/login', '/signup']
  const isPublicPage = publicPages.includes(router.pathname)

  useEffect(() => {
    // Skip auth check for public pages
    if (isPublicPage) {
      setAuthChecked(true)
      return
    }

    // Check authentication for all other pages
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (!data.user) {
          // Not authenticated - redirect to login
          router.push('/login')
          return
        }
        
        setAuthChecked(true)
      } catch (err) {
        // Error checking auth - redirect to login
        router.push('/login')
      }
    }

    checkAuth()
  }, [router.pathname, isPublicPage, router])

  return (
    <>
      <Head>
        <title>LLC ERP</title>
        {/* Prefer a PNG file (browsers reliably show PNG); keep .ico for legacy */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        {/* Apple touch icon fallback */}
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* Fallback small PNG data URI in case the .ico doesn't surface due to cache or server issues */}
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAKUlEQVR4AWP4z8DAwMjI+P///xkYGBgYGRgYGBgYGBgYAAAs6QFQz5lXJwAAAABJRU5ErkJggg==" type="image/png" sizes="16x16" />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      {/* Prevent theme flash by setting theme before React hydrates */}
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            })();
          `,
        }}
      />

      <Layout>
        {/* Only render component after auth check (or if public page) */}
        {(authChecked || isPublicPage) ? (
          <Component {...pageProps} />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
              <p className="text-muted">Checking authentication...</p>
            </div>
          </div>
        )}
      </Layout>
    </>
  )
}
