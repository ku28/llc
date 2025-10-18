import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { useToast } from '../hooks/useToast'
import ToastNotification from '../components/ToastNotification'

type TabType = 'overview' | 'edit' | 'security' | 'account'

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('overview')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isClosingDialog, setIsClosingDialog] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me')
            const data = await res.json()

            if (data.user) {
                setUser(data.user)
                setName(data.user.name || '')
                setEmail(data.user.email || '')
                setProfileImage(data.user.profileImage || null)
            } else {
                router.push('/login')
            }
        } catch (err) {
            console.error('Failed to fetch user:', err)
            showError('Failed to load profile')
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            showWarning('Name is required')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            })

            const data = await res.json()

            if (res.ok) {
                setUser(data.user)
                showSuccess('Profile updated successfully')
                // Trigger header refresh
                window.dispatchEvent(new Event('user-login'))
            } else {
                showError(data.error || 'Failed to update profile')
            }
        } catch (err) {
            console.error('Update failed:', err)
            showError('An error occurred while updating profile')
        } finally {
            setSaving(false)
        }
    }

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError('Please upload an image file')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Image size should be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('image', file)

            console.log('Uploading file:', file.name, file.size, file.type)

            const res = await fetch('/api/auth/upload-profile-image', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            console.log('Upload response:', data)

            if (res.ok) {
                setProfileImage(data.imageUrl)
                setUser({ ...user, profileImage: data.imageUrl })
                showSuccess('Profile picture updated successfully')
                // Trigger header refresh
                window.dispatchEvent(new Event('user-login'))
            } else {
                const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
                console.error('Upload error:', errorMsg)
                showError(errorMsg || 'Failed to upload image')
            }
        } catch (err) {
            console.error('Upload failed:', err)
            showError('An error occurred while uploading image')
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveProfileImage = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/auth/remove-profile-image', {
                method: 'DELETE'
            })

            const data = await res.json()

            if (res.ok) {
                setProfileImage(null)
                setUser({ ...user, profileImage: null })
                showSuccess('Profile picture removed')
                // Trigger header refresh
                window.dispatchEvent(new Event('user-login'))
            } else {
                showError(data.error || 'Failed to remove image')
            }
        } catch (err) {
            console.error('Remove failed:', err)
            showError('An error occurred while removing image')
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentPassword) {
            showWarning('Current password is required')
            return
        }

        if (!newPassword || newPassword.length < 6) {
            showWarning('New password must be at least 6 characters')
            return
        }

        if (newPassword !== confirmPassword) {
            showWarning('Passwords do not match')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            })

            const data = await res.json()

            if (res.ok) {
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                showSuccess('Password changed successfully')
            } else {
                showError(data.error || 'Failed to change password')
            }
        } catch (err) {
            console.error('Password change failed:', err)
            showError('An error occurred while changing password')
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/')
        } catch (err) {
            console.error('Logout failed:', err)
            router.push('/')
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            showWarning('Please type DELETE to confirm')
            return
        }

        setDeleting(true)
        try {
            const res = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })

            const data = await res.json()

            if (res.ok) {
                showSuccess('Account deleted successfully. Redirecting...')
                setTimeout(() => {
                    router.push('/')
                }, 2000)
            } else {
                showError(data.error || 'Failed to delete account')
                setDeleting(false)
            }
        } catch (err) {
            console.error('Delete account failed:', err)
            showError('An error occurred while deleting account')
            setDeleting(false)
        }
    }

    const closeDeleteDialog = () => {
        setIsClosingDialog(true)
        setTimeout(() => {
            setShowDeleteDialog(false)
            setIsClosingDialog(false)
            setDeleteConfirmText('')
        }, 200)
    }

    const sidebarItems = [
        { id: 'overview' as TabType, label: 'Overview', icon: '👤' },
        { id: 'edit' as TabType, label: 'Edit Profile', icon: '✏️' },
        { id: 'security' as TabType, label: 'Security', icon: '🔒' },
        { id: 'account' as TabType, label: 'Account', icon: '⚙️' }
    ]

    if (loading) {
        return (
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
        )
    }

    return (
        <>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Profile Settings</h1>

                    {/* Mobile Tabs */}
                    <div className="md:hidden mb-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                            <div className="flex gap-1 p-2 min-w-max">
                                {sidebarItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap text-sm ${
                                            activeTab === item.id
                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        {/* Desktop Sidebar */}
                        <div className="hidden md:block w-64 flex-shrink-0">
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sticky top-24 border border-gray-200 dark:border-gray-700">
                                <nav className="space-y-1">
                                    {sidebarItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                                                activeTab === item.id
                                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 font-medium'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md'
                                            }`}
                                        >
                                            <span className="text-xl">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            {activeTab === 'overview' && (
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Profile Overview</h2>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200 dark:border-gray-700">
                                        <div className="relative">
                                            {profileImage ? (
                                                <img 
                                                    src={profileImage} 
                                                    alt="Profile" 
                                                    className="w-32 h-32 rounded-2xl object-cover border-4 border-gray-200 dark:border-gray-700 shadow-xl"
                                                />
                                            ) : (
                                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700 shadow-xl">
                                                    <span className="text-5xl font-bold text-white">
                                                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                            )}
                                            <label 
                                                htmlFor="profile-image-upload-overview" 
                                                className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                                                title="Upload profile picture"
                                            >
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <input
                                                    id="profile-image-upload-overview"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleProfileImageUpload}
                                                    className="hidden"
                                                    disabled={uploading}
                                                />
                                            </label>
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-bold mb-1">{user?.name || 'User'}</h3>
                                            <p className="text-muted mb-3">{user?.email}</p>
                                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200 border border-green-300 dark:border-green-700">
                                                {user?.role}
                                            </span>
                                            {profileImage && (
                                                <div className="mt-3">
                                                    <button
                                                        onClick={handleRemoveProfileImage}
                                                        disabled={saving}
                                                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 hover:underline"
                                                    >
                                                        Remove profile picture
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="text-xs sm:text-sm font-medium text-muted mb-1 sm:mb-2">Full Name</h4>
                                            <p className="text-base sm:text-lg font-semibold break-words">{user?.name || 'Not set'}</p>
                                        </div>
                                        <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="text-xs sm:text-sm font-medium text-muted mb-1 sm:mb-2">Email Address</h4>
                                            <p className="text-base sm:text-lg font-semibold break-all">{user?.email}</p>
                                        </div>
                                        <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="text-xs sm:text-sm font-medium text-muted mb-1 sm:mb-2">Role</h4>
                                            <p className="text-base sm:text-lg font-semibold capitalize">{user?.role}</p>
                                        </div>
                                        <div className="p-4 sm:p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 mb-1 sm:mb-2">Account Status</h4>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                Active
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && (
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Edit Profile</h2>
                                    
                                    <form onSubmit={handleUpdateProfile} className="max-w-2xl space-y-4 sm:space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                                placeholder="Enter your name"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                                placeholder="Enter your email"
                                                required
                                            />
                                            <p className="mt-2 text-xs text-muted bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                                💡 We'll send verification email if you change your email address.
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium transform hover:scale-105 text-sm sm:text-base"
                                            >
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setName(user?.name || '')
                                                    setEmail(user?.email || '')
                                                }}
                                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Security Settings</h2>
                                    
                                    <div className="max-w-2xl">
                                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm sm:text-base">
                                            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">🔒 Change Password</h3>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">Keep your account secure by using a strong password</p>
                                        </div>
                                        <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
                                            <div>
                                                <label className="block text-sm font-semibold mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                                    placeholder="Enter current password"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold mb-2">New Password</label>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                                    placeholder="Enter new password (min 6 characters)"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium transform hover:scale-105 text-sm sm:text-base"
                                            >
                                                {saving ? 'Changing...' : 'Change Password'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'account' && (
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Account Settings</h2>
                                    
                                    <div className="space-y-3 sm:space-y-4 max-w-2xl">
                                        <div className="p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl shadow-md hover:shadow-lg transition-all">
                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2 text-base sm:text-lg">
                                                        <span className="text-xl">🚪</span> Logout
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">Sign out from your current session safely</p>
                                                </div>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg font-medium transform hover:scale-105 text-sm sm:text-base"
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 sm:p-6 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl shadow-md hover:shadow-lg transition-all">
                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2 text-base sm:text-lg">
                                                        <span className="text-xl">⚠️</span> Delete Account
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowDeleteDialog(true)}
                                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium transform hover:scale-105 text-sm sm:text-base"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete Account Confirmation Dialog */}
                {showDeleteDialog && (
                    <div 
                        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${
                            isClosingDialog ? 'dialog-overlay-exit' : 'dialog-overlay-enter'
                        }`}
                        onClick={closeDeleteDialog}
                    >
                        <div 
                            className={`bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full mx-4 p-6 sm:p-8 shadow-2xl border border-gray-200 dark:border-gray-700 ${
                                isClosingDialog ? 'dialog-content-exit' : 'dialog-content-enter'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center border-2 border-red-300 dark:border-red-700 flex-shrink-0">
                                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Delete Account</h3>
                                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">This action cannot be undone</p>
                                </div>
                            </div>

                            <div className="mb-4 sm:mb-6">
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                    Are you sure you want to delete your account? This will permanently remove all your data and cannot be reversed.
                                </p>
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 font-semibold">
                                    Type <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-mono">DELETE</span> to confirm:
                                </p>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full p-2.5 sm:p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 transition-all text-sm sm:text-base"
                                    placeholder="Type DELETE"
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
                                >
                                    {deleting ? 'Deleting...' : 'Delete Account'}
                                </button>
                                <button
                                    onClick={closeDeleteDialog}
                                    disabled={deleting}
                                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-all shadow-md hover:shadow-lg font-semibold text-sm sm:text-base"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    )
}
