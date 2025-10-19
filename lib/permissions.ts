// Role-based permissions configuration
export const ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    STAFF: 'staff',
    RECEPTION: 'reception',
    USER: 'user'  // Patient/User role
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Define what each role can access
export const PERMISSIONS = {
    // Patient Management
    VIEW_PATIENTS: ['admin', 'doctor', 'staff', 'reception'],
    CREATE_PATIENTS: ['admin', 'doctor', 'staff', 'reception'],
    EDIT_PATIENTS: ['admin', 'doctor', 'staff', 'reception'],
    DELETE_PATIENTS: ['admin', 'doctor'],
    
    // Visits & Prescriptions
    VIEW_VISITS: ['admin', 'doctor', 'staff', 'reception', 'user'],  // Users can view their visits
    CREATE_VISITS: ['admin', 'doctor', 'staff'],
    EDIT_VISITS: ['admin', 'doctor', 'staff'],
    DELETE_VISITS: ['admin', 'doctor'],
    VIEW_PRESCRIPTIONS: ['admin', 'doctor', 'staff', 'reception', 'user'],  // Users can view their prescriptions
    CREATE_PRESCRIPTIONS: ['admin', 'doctor', 'staff'],
    EDIT_PRESCRIPTIONS: ['admin', 'doctor', 'staff'],
    DELETE_PRESCRIPTIONS: ['admin', 'doctor'],
    DISPENSE_PRESCRIPTIONS: ['admin', 'doctor', 'staff'],
    
    // Treatments
    VIEW_TREATMENTS: ['admin', 'doctor', 'staff'],
    CREATE_TREATMENTS: ['admin', 'doctor'],
    EDIT_TREATMENTS: ['admin', 'doctor'],
    DELETE_TREATMENTS: ['admin', 'doctor'],
    
    // Inventory/Products
    VIEW_PRODUCTS: ['admin', 'doctor', 'staff'],
    CREATE_PRODUCTS: ['admin', 'staff'],
    EDIT_PRODUCTS: ['admin', 'staff'],
    DELETE_PRODUCTS: ['admin'],
    ADJUST_STOCK: ['admin', 'staff'],
    
    // Accounting - Suppliers
    VIEW_SUPPLIERS: ['admin', 'staff'],
    CREATE_SUPPLIERS: ['admin', 'staff'],
    EDIT_SUPPLIERS: ['admin', 'staff'],
    DELETE_SUPPLIERS: ['admin'],
    
    // Accounting - Purchase Orders
    VIEW_PURCHASE_ORDERS: ['admin', 'staff'],
    CREATE_PURCHASE_ORDERS: ['admin', 'staff'],
    EDIT_PURCHASE_ORDERS: ['admin', 'staff'],
    DELETE_PURCHASE_ORDERS: ['admin'],
    RECEIVE_PURCHASE_ORDERS: ['admin', 'staff'],
    
    // Accounting - Invoices
    VIEW_INVOICES: ['admin', 'doctor', 'staff', 'reception'],
    CREATE_INVOICES: ['admin', 'staff', 'reception'],
    EDIT_INVOICES: ['admin', 'staff'],
    DELETE_INVOICES: ['admin'],
    RECORD_PAYMENTS: ['admin', 'staff', 'reception'],
    
    // Stock Transactions
    VIEW_STOCK_TRANSACTIONS: ['admin', 'staff'],
    CREATE_STOCK_TRANSACTIONS: ['admin', 'staff'],
    
    // Analytics & Reports
    VIEW_ANALYTICS: ['admin', 'doctor', 'staff'],
    VIEW_FINANCIAL_REPORTS: ['admin'],
    
    // User Management
    VIEW_USERS: ['admin'],
    CREATE_USERS: ['admin'],
    EDIT_USERS: ['admin'],
    DELETE_USERS: ['admin'],
    
    // Dashboard
    VIEW_DASHBOARD: ['admin', 'doctor', 'staff', 'reception'],
    VIEW_USER_DASHBOARD: ['user'],  // Patient dashboard
    VIEW_LOW_STOCK_ALERTS: ['admin', 'staff'],
    VIEW_REVENUE_METRICS: ['admin', 'doctor', 'staff'],
    
    // Appointment Requests
    VIEW_APPOINTMENT_REQUESTS: ['admin', 'doctor', 'staff', 'reception', 'user'],
    MANAGE_APPOINTMENT_REQUESTS: ['admin', 'doctor', 'staff', 'reception'],
} as const

export type Permission = keyof typeof PERMISSIONS

// Check if user has specific permission
export function hasPermission(userRole: string, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission] as readonly string[]
    return allowedRoles.includes(userRole)
}

// Check if user can access a route
export function canAccessRoute(userRole: string, route: string): boolean {
    const routePermissions: Record<string, Permission> = {
        '/dashboard': 'VIEW_DASHBOARD',
        '/user-dashboard': 'VIEW_USER_DASHBOARD',
        '/patients': 'VIEW_PATIENTS',
        '/visits': 'VIEW_VISITS',
        '/prescriptions': 'VIEW_PRESCRIPTIONS',
        '/treatments': 'VIEW_TREATMENTS',
        '/products': 'VIEW_PRODUCTS',
        '/suppliers': 'VIEW_SUPPLIERS',
        '/purchase-orders': 'VIEW_PURCHASE_ORDERS',
        '/invoices': 'VIEW_INVOICES',
        '/stock-transactions': 'VIEW_STOCK_TRANSACTIONS',
        '/analytics': 'VIEW_ANALYTICS',
        '/users': 'VIEW_USERS',
        '/requests': 'MANAGE_APPOINTMENT_REQUESTS',
        '/my-requests': 'VIEW_APPOINTMENT_REQUESTS',
    }
    
    const permission = routePermissions[route]
    if (!permission) return true // Allow access if no specific permission defined
    
    return hasPermission(userRole, permission)
}

// Get user-friendly role display name
export function getRoleDisplayName(role: string): string {
    const names: Record<string, string> = {
        admin: 'Administrator',
        doctor: 'Doctor',
        staff: 'Staff',
        reception: 'Reception',
        user: 'Patient'
    }
    return names[role] || role
}

// Get accessible routes for a role
export function getAccessibleRoutes(userRole: string): string[] {
    const allRoutes = [
        '/dashboard',
        '/user-dashboard',
        '/patients',
        '/visits',
        '/prescriptions',
        '/treatments',
        '/products',
        '/suppliers',
        '/purchase-orders',
        '/invoices',
        '/stock-transactions',
        '/analytics',
        '/users',
    ]
    
    return allRoutes.filter(route => canAccessRoute(userRole, route))
}

// Reception role restrictions summary
export const RECEPTION_RESTRICTIONS = {
    cannotAccess: [
        'Treatments (view/create/edit)',
        'Products/Inventory Management',
        'Suppliers',
        'Purchase Orders',
        'Stock Transactions',
        'Analytics & Reports',
        'User Management',
        'Financial Reports',
        'Stock Adjustments'
    ],
    canAccess: [
        'Dashboard (limited view)',
        'Patient Records (full access)',
        'View Visits (read-only)',
        'View Prescriptions (read-only)',
        'Invoices (create and view)',
        'Record Payments',
        'Schedule Appointments'
    ]
}

// User/Patient role restrictions summary
export const USER_RESTRICTIONS = {
    cannotAccess: [
        'Staff Dashboard',
        'Patient Management',
        'Create/Edit Visits',
        'Create/Edit Prescriptions',
        'Treatments',
        'Inventory/Products',
        'Suppliers',
        'Purchase Orders',
        'Invoices',
        'Stock Transactions',
        'Analytics & Reports',
        'User Management',
        'All Administrative Functions'
    ],
    canAccess: [
        'User Dashboard (personal)',
        'View Own Appointments (read-only)',
        'View Own Prescriptions (read-only)',
        'Book New Appointments',
        'View Visit History',
        'Update Profile',
        'Contact Information'
    ]
}
