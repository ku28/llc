import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function TasksPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [tasks, setTasks] = useState<any[]>([])

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => {
                setUser(d.user)
                setLoading(false)
                
                // Redirect if not receptionist
                if (d.user?.role !== 'receptionist') {
                    router.push('/dashboard')
                }
            })
            .catch(() => {
                setLoading(false)
                router.push('/login')
            })
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!user || user.role !== 'receptionist') {
        return null
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                    Tasks
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your daily tasks and to-dos</p>
            </div>

            <div className="grid gap-4">
                {/* Daily Checklist Card */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Daily Checklist
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <input type="checkbox" id="task1" className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                            <label htmlFor="task1" className="flex-1 text-gray-700 dark:text-gray-300 cursor-pointer">
                                Review new patient registrations
                            </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <input type="checkbox" id="task2" className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                            <label htmlFor="task2" className="flex-1 text-gray-700 dark:text-gray-300 cursor-pointer">
                                Assign doctors to new patients
                            </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <input type="checkbox" id="task3" className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                            <label htmlFor="task3" className="flex-1 text-gray-700 dark:text-gray-300 cursor-pointer">
                                Update patient contact information
                            </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <input type="checkbox" id="task4" className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                            <label htmlFor="task4" className="flex-1 text-gray-700 dark:text-gray-300 cursor-pointer">
                                Manage token queue
                            </label>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => router.push('/patients')}
                            className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">Register Patient</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Add new patient</div>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => router.push('/patients')}
                            className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">Find Patient</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Search records</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Today's Summary Card */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Today's Summary
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-3xl font-bold text-emerald-600 mb-1">0</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">New Patients</div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-3xl font-bold text-blue-600 mb-1">0</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Registrations</div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Updated Records</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
