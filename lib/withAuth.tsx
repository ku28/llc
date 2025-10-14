import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

// Higher-order component to protect pages - REQUIRES AUTHENTICATION
export function withAuth(Component: any, allowedRoles: string[] = []) {
    return function ProtectedPage(props: any) {
        const router = useRouter()
        const [user, setUser] = useState<any>(null)
        const [loading, setLoading] = useState(true)

        useEffect(() => {
            async function checkAuth() {
                try {
                    const res = await fetch('/api/auth/me')
                    const data = await res.json()
                    
                    if (!data.user) {
                        // Not logged in - ALWAYS redirect to login
                        router.push('/login')
                        return
                    }

                    // Check if user has required role (if roles specified)
                    if (allowedRoles.length > 0 && !allowedRoles.includes(data.user.role)) {
                        // Not authorized for this page
                        alert(`Access Denied: This page requires ${allowedRoles.join(' or ')} role.`)
                        router.push('/dashboard')
                        return
                    }

                    setUser(data.user)
                } catch (error) {
                    console.error('Auth check failed:', error)
                    router.push('/login')
                } finally {
                    setLoading(false)
                }
            }

            checkAuth()
        }, [router])

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-brand rounded-full" />
                        <p className="mt-4 text-muted">Loading...</p>
                    </div>
                </div>
            )
        }

        if (!user) {
            return null // Redirecting...
        }

        return <Component {...props} user={user} />
    }
}

// Specific role requirements
export function requireAdmin(Component: any) {
    return withAuth(Component, ['admin'])
}

export function requireDoctorOrAdmin(Component: any) {
    return withAuth(Component, ['admin', 'doctor'])
}

export function requireStaffOrAbove(Component: any) {
    return withAuth(Component, ['admin', 'doctor', 'staff'])
}

// Check if user can access a route (client-side)
export function canAccessRoute(userRole: string, route: string): boolean {
    const restrictedRoutes: Record<string, string[]> = {
        '/treatments': ['admin', 'doctor', 'staff'],
        '/products': ['admin', 'doctor', 'staff'],
        '/suppliers': ['admin', 'staff'],
        '/purchase-orders': ['admin', 'staff'],
        '/stock-transactions': ['admin', 'staff'],
        '/analytics': ['admin', 'doctor', 'staff'],
        '/users': ['admin'],
    }

    const allowedRoles = restrictedRoutes[route]
    if (!allowedRoles) return true // No restriction
    
    return allowedRoles.includes(userRole)
}
