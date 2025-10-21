import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function FloatingPrescriptionButton() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        // Fetch user to check role
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUser(data.user))
            .catch(() => setUser(null))
    }, [])

    // Don't show on profile, prescriptions, visits pages or the public landing page '/'
    if (
        router.pathname === '/' ||
        router.pathname === '/profile' ||
        router.pathname === '/prescriptions' ||
        router.pathname.startsWith('/visits')
    ) {
        return null
    }

    // Don't show for user role (patients)
    if (user?.role?.toLowerCase() === 'user') {
        return null
    }

    return (
        <Link
            href="/prescriptions"
            className="fixed bottom-6 right-6 z-40 flex items-center justify-center group-hover:gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-2xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 font-semibold group overflow-hidden w-14 h-14 hover:w-auto hover:px-6 hover:py-4"
            aria-label="Create Prescription"
        >
            <svg
                className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="whitespace-nowrap opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-xs transition-all duration-300 overflow-hidden">Create Prescription</span>
        </Link>
    )
}
