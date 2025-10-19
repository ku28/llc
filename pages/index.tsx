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
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <LandingHeader />
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
