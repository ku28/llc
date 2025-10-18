import Link from 'next/link'
import { useRouter } from 'next/router'

export default function FloatingPrescriptionButton() {
    const router = useRouter()

    // Don't show on profile, prescriptions, and visits pages
    if (router.pathname === '/profile' || router.pathname === '/prescriptions' || router.pathname.startsWith('/visits')) {
        return null
    }

    return (
        <Link
            href="/prescriptions"
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-2xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 font-semibold group"
            aria-label="Create Prescription"
        >
            <svg
                className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:block">Create Prescription</span>
            <span className="sm:hidden">Prescription</span>
        </Link>
    )
}
