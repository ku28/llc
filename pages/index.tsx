import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import LandingHeader from '../components/LandingHeader'
import HeroSection from '../components/lastleaf/sections/hero'
import ServicesSection from '../components/lastleaf/sections/services'
import AchievementsSection from '../components/lastleaf/sections/achievements'
import BenefitsSection from '../components/lastleaf/sections/benefits'
import OurVideosSection from '../components/lastleaf/sections/our-videos'
import SpecialitiesSection from '../components/lastleaf/sections/specialities'
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
          className="fixed top-4 right-4 z-[9999] flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900/80 dark:bg-gray-900/30 backdrop-blur-md text-white rounded-full shadow-xl transition-all duration-300 font-semibold text-xs sm:text-sm border border-gray-700/50 dark:border-white/20 hover:bg-green-500/90 dark:hover:bg-green-500/20 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] hover:scale-110"
          title="Edit Landing Page Content"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="hidden sm:inline">Edit Page</span>
          <span className="sm:hidden">Edit</span>
        </button>
      )}
      
      <HeroSection />
      <ServicesSection />
      <AchievementsSection />
      <BenefitsSection />
      <OurVideosSection />
      <SpecialitiesSection />
      <ContactSection />
      <FooterSection />
    </main>
  )
}
