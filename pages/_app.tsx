import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Layout from '../components/Layout'

export default function App({ Component, pageProps }: AppProps) {
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

      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
