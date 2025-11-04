import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from './Header'
import Footer from './Footer'
import FloatingPrescriptionButton from './FloatingPrescriptionButton'
import FloatingBookButton from './FloatingBookButton'
import LandingHeader from './LandingHeader'
import TokenSidebar from './TokenSidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tokenSidebarOpen, setTokenSidebarOpen] = useState(false)
  const landingPages = ['/', '/about', '/services', '/gallery', '/contact']
  const isLanding = landingPages.includes(router.pathname)

  useEffect(() => {
    // Fetch user to check role
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
  }, [router.pathname])

  useEffect(() => {
    // Listen for custom event from FloatingPrescriptionButton
    const handleOpenTokenSidebar = () => setTokenSidebarOpen(true)
    window.addEventListener('open-token-sidebar', handleOpenTokenSidebar)
    
    return () => {
      window.removeEventListener('open-token-sidebar', handleOpenTokenSidebar)
    }
  }, [])

  const isPatient = user?.role?.toLowerCase() === 'user'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Render a special landing header for the public routes, otherwise the app header */}
      {isLanding ? null : <Header onOpenTokenSidebar={() => setTokenSidebarOpen(true)} />}

      {isLanding ? (
        <main className="flex-1 w-full">{children}</main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <main className="py-6">{children}</main>
        </div>
      )}

      {/* Show FloatingPrescriptionButton for staff/admin/doctor/reception */}
      {!isLanding && !isPatient && <FloatingPrescriptionButton />}
      
      {/* Show FloatingBookButton for patients (user role) */}
      {!isLanding && isPatient && <FloatingBookButton />}
      
      {/* Show FloatingBookButton on landing pages */}
      {isLanding && <FloatingBookButton />}

      {/* Token Sidebar */}
      {!isLanding && !isPatient && (
        <TokenSidebar 
          isOpen={tokenSidebarOpen} 
          onClose={() => setTokenSidebarOpen(false)} 
        />
      )}

      {!isLanding && <Footer />}
    </div>
  )
}
