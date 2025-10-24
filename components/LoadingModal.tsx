import React from 'react'

interface LoadingModalProps {
    isOpen: boolean
    message?: string
}

export default function LoadingModal({ isOpen, message = 'Loading...' }: LoadingModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-6 min-w-[320px] border border-gray-200 dark:border-gray-700 animate-scaleIn">
                {/* Modern Spinner Animation */}
                <div className="relative w-20 h-20">
                    {/* Outer rotating circle */}
                    <div className="absolute inset-0 border-4 border-emerald-200 dark:border-emerald-900/50 rounded-full"></div>
                    
                    {/* Main rotating spinner */}
                    <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 dark:border-t-emerald-400 rounded-full animate-spin"></div>
                    
                    {/* Inner pulsing dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                    </div>
                    
                    {/* Secondary rotating ring */}
                    <div className="absolute inset-0 border-4 border-transparent border-b-emerald-300 dark:border-b-emerald-600 rounded-full animate-spin-slow"></div>
                </div>
                
                {/* Message */}
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{message}</p>
                    <div className="flex items-center justify-center space-x-1">
                        <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        </div>
    )
}
