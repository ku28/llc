import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import LandingHeader from '../components/LandingHeader'
import HeroSection from '../components/lastleaf/sections/hero'
import TestimonialSection from '../components/lastleaf/sections/testimonial'
import TeamSection from '../components/lastleaf/sections/team'
import BenefitsSection from '../components/lastleaf/sections/benefits'
import SponsorsSection from '../components/lastleaf/sections/sponsors'
import CommunitySection from '../components/lastleaf/sections/community'
import ContactSection from '../components/lastleaf/sections/contact'
import FooterSection from '../components/lastleaf/sections/footer'

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setUser(d.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] relative">
      <LandingHeader />
      
      {/* Edit Button - Only visible for admins */}
      {!loading && user && user.role === 'admin' && (
        <button
          onClick={() => router.push('/edit')}
          className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors font-medium text-sm"
          title="Edit Landing Page Content"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Page
        </button>
      )}
      
      <HeroSection />
      <TestimonialSection />
      <TeamSection />
      <BenefitsSection />
      <SponsorsSection />
      <CommunitySection />
      <ContactSection />
      <FooterSection />
    </main>
  )
}
