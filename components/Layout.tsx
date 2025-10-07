import React from 'react'
import Header from './Header'
import Footer from './Footer'
import Link from 'next/link'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 flex gap-6">
        <nav className="w-64 sticky top-4 py-4">
          <ul className="space-y-2">
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/">Dashboard</Link></li>
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/patients">Patients</Link></li>
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/treatments">Treatments</Link></li>
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/products">Inventory</Link></li>
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/visits">Visits</Link></li>
            <li><Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/users">Users</Link></li>
          </ul>
        </nav>

        <main className="flex-1 py-6">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
