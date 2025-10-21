import { useState } from 'react'
import { useRouter } from 'next/router'
import BookingModal from './BookingModal'

export default function FloatingBookButton() {
  const router = useRouter()
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Don't show on profile page
  if (router.pathname === '/profile') {
    return null
  }

  return (
    <>
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
      <button
        onClick={() => setIsBookingModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center group-hover:gap-3 bg-brand text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-semibold group overflow-hidden w-14 h-14 hover:w-auto hover:px-5 hover:py-3"
        aria-label="Book Appointment"
      >
        <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="whitespace-nowrap opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-xs transition-all duration-300 overflow-hidden">Book Appointment</span>
      </button>
    </>
  )
}
