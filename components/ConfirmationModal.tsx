import React from 'react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmationModal({ 
    isOpen, 
    title, 
    message, 
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm, 
    onCancel,
    type = 'warning'
}: ConfirmationModalProps) {
    if (!isOpen) return null

    const colorClasses = {
        danger: {
            icon: 'text-red-500',
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800'
        },
        warning: {
            icon: 'text-yellow-500',
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
            button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-700 dark:hover:bg-yellow-800'
        },
        info: {
            icon: 'text-blue-500',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800'
        }
    }

    const colors = colorClasses[type]

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 animate-scaleIn">
                {/* Icon */}
                <div className="flex items-center justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                        <svg className={`w-8 h-8 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                    {message}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 ${colors.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
