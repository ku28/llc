import React from 'react'
import Header from './Header'
import Footer from './Footer'
import Link from 'next/link'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Header />

      <div className="max-w-6xl mx-auto px-4">
        <main className="py-6">{children}</main>
      </div>

      <Footer />
    </div>
  )
}
