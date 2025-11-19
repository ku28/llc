import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Link from 'next/link'

interface UserDashboardData {
    user: any
    upcomingAppointments: any[]
    recentPrescriptions: any[]
    visitHistory: any[]
    stats: {
        totalVisits: number
        upcomingAppointments: number
        activePrescriptions: number
    }
}

export default function UserDashboard() {
    const router = useRouter()
    const [data, setData] = useState<UserDashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuthAndFetchData()
    }, [])

    async function checkAuthAndFetchData() {
        try {
            // Check authentication
            const authRes = await fetch('/api/auth/me')
            const authData = await authRes.json()

            if (!authData.user) {
                router.push('/login')
                return
            }

            // If user is staff/admin/doctor/reception, redirect to main dashboard
            if (authData.user.role?.toLowerCase() !== 'user') {
                router.push('/dashboard')
                return
            }

            // Fetch user-specific data
            await fetchUserData(authData.user)
        } catch (err) {
            console.error('Error checking auth:', err)
            router.push('/login')
        }
    }

    async function fetchUserData(user: any) {
        try {
            setLoading(true)

            // Fetch user's appointments (visits)
            const visitsRes = await fetch('/api/visits')
            const visits = await visitsRes.json()

            // Fetch user's prescriptions
            const prescriptionsRes = await fetch('/api/prescriptions')
            const prescriptions = await prescriptionsRes.json()

            // Filter data for current user (by email or phone)
            const userVisits = visits.filter((v: any) =>
                v.patient?.email === user.email || v.patient?.phone === user.phone
            )

            const userPrescriptions = prescriptions.filter((p: any) =>
                p.patient?.email === user.email || p.patient?.phone === user.phone
            )

            // Calculate upcoming appointments (visits with future dates)
            const now = new Date()
            const upcoming = userVisits.filter((v: any) => {
                if (!v.patient?.nextVisit) return false
                return new Date(v.patient.nextVisit) > now
            }).sort((a: any, b: any) =>
                new Date(a.patient.nextVisit).getTime() - new Date(b.patient.nextVisit).getTime()
            )

            // Get recent prescriptions (last 5)
            const recent = userPrescriptions
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)

            // Get visit history (sorted by date, most recent first)
            const history = userVisits
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)

            setData({
                user,
                upcomingAppointments: upcoming,
                recentPrescriptions: recent,
                visitHistory: history,
                stats: {
                    totalVisits: userVisits.length,
                    upcomingAppointments: upcoming.length,
                    activePrescriptions: userPrescriptions.length
                }
            })
        } catch (error) {
            console.error('Error fetching user data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !data) {
        return (
                <div className="py-6 text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-brand rounded-full" />
                    <p className="mt-4 text-muted">Loading your dashboard...</p>
                </div>
        )
    }

    return (
            <div className="py-6 space-y-6">
                {/* Welcome Header */}
                <div className="card bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Welcome back, {data.user.name}! 👋</h1>
                            <p className="text-muted">Here's an overview of your health journey with Last Leaf Care</p>
                        </div>
                        <span className="text-6xl">🍃</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted mb-1">Total Visits</p>
                                <p className="text-3xl font-bold">{data.stats.totalVisits}</p>
                            </div>
                            <span className="text-5xl">🏥</span>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted mb-1">Upcoming Appointments</p>
                                <p className="text-3xl font-bold">{data.stats.upcomingAppointments}</p>
                            </div>
                            <span className="text-5xl">📅</span>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted mb-1">Prescriptions</p>
                                <p className="text-3xl font-bold">{data.stats.activePrescriptions}</p>
                            </div>
                            <span className="text-5xl">💊</span>
                        </div>
                    </div>
                </div>

                {/* Upcoming Appointments */}
                <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                    <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span>📅</span>
                            <span>Upcoming Appointments</span>
                        </h2>
                        <Link
                            href="/user-signup"
                            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-green-600 transition-all text-sm"
                        >
                            Book New Appointment
                        </Link>
                    </div>
                    {data.upcomingAppointments.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="text-6xl mb-4 block">📆</span>
                            <p className="text-muted mb-4">No upcoming appointments scheduled</p>
                            <Link
                                href="/user-signup"
                                className="inline-block px-6 py-3 bg-brand text-white rounded-lg hover:bg-green-600 transition-all"
                            >
                                Schedule an Appointment
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.upcomingAppointments.map((visit: any) => (
                                <div key={visit.id} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-lg">Next Visit Scheduled</p>
                                            <p className="text-sm text-muted">OPD No: {visit.opdNo}</p>
                                        </div>
                                        <p className="text-brand font-bold">
                                            {new Date(visit.patient.nextVisit).toLocaleDateString('en-IN', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Prescriptions */}
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <span>💊</span>
                                <span>Recent Prescriptions</span>
                            </h2>
                            <Link
                                href="/prescriptions"
                                className="text-brand text-sm hover:underline"
                            >
                                View All →
                            </Link>
                        </div>
                        {data.recentPrescriptions.length === 0 ? (
                            <p className="text-muted text-sm text-center py-8">No prescriptions found</p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentPrescriptions.map((prescription: any) => (
                                    <Link
                                        key={prescription.id}
                                        href={`/prescriptions`}
                                        className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-medium">Prescription #{prescription.id}</p>
                                            <span className="text-xs text-muted">
                                                {new Date(prescription.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted">
                                            {prescription.items?.length || 0} medication(s)
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Visit History */}
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <span>🏥</span>
                                <span>Visit History</span>
                            </h2>
                            <Link
                                href="/visits"
                                className="text-brand text-sm hover:underline"
                            >
                                View All →
                            </Link>
                        </div>
                        {data.visitHistory.length === 0 ? (
                            <p className="text-muted text-sm text-center py-8">No visit history</p>
                        ) : (
                            <div className="space-y-2">
                                {data.visitHistory.map((visit: any) => (
                                    <div
                                        key={visit.id}
                                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-medium">OPD {visit.opdNo}</p>
                                            <span className="text-xs text-muted">
                                                {new Date(visit.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {visit.chiefComplaint && (
                                            <p className="text-sm text-muted line-clamp-1">{visit.chiefComplaint}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                    <div className="relative">
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Link
                            href="/user-signup"
                            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:shadow-md transition-all text-center"
                        >
                            <span className="text-3xl block mb-2">📅</span>
                            <span className="text-sm font-medium">Book Appointment</span>
                        </Link>
                        <Link
                            href="/prescriptions"
                            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:shadow-md transition-all text-center"
                        >
                            <span className="text-3xl block mb-2">💊</span>
                            <span className="text-sm font-medium">View Prescriptions</span>
                        </Link>
                        <Link
                            href="/visits"
                            className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:shadow-md transition-all text-center"
                        >
                            <span className="text-3xl block mb-2">🏥</span>
                            <span className="text-sm font-medium">Visit History</span>
                        </Link>
                        <Link
                            href="/profile"
                            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:shadow-md transition-all text-center"
                        >
                            <span className="text-3xl block mb-2">👤</span>
                            <span className="text-sm font-medium">My Profile</span>
                        </Link>
                    </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 dark:from-gray-900 dark:via-green-950/20 dark:to-emerald-950/20 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 via-transparent to-emerald-500/5 pointer-events-none rounded-xl"></div>
                    <div className="relative">
                    <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📞</span>
                            <div>
                                <p className="text-sm text-muted">Call Us</p>
                                <p className="font-semibold">+91-9915066777</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📧</span>
                            <div>
                                <p className="text-sm text-muted">Email</p>
                                <p className="font-semibold">lastleafcare@gmail.com</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📍</span>
                            <div>
                                <p className="text-sm text-muted">Visit Us</p>
                                <p className="font-semibold">Royal Heights, Faridkot</p>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
    )
}
