import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'
import ContactSection from '../components/lastleaf/sections/contact'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <LandingHeader />
      <ContactSection />
      <Footer />
    </div>
  )
}
