import { useEffect } from 'react'

interface StatusModalProps {
    isOpen: boolean
    status: 'loading' | 'success' | 'error'
    message: string
    onClose: () => void
    autoClose?: boolean
}

export default function StatusModal({
    isOpen,
    status,
    message,
    onClose,
    autoClose = true
}: StatusModalProps) {
    useEffect(() => {
        if (isOpen && status === 'success' && autoClose) {
            const timer = setTimeout(() => {
                onClose()
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isOpen, status, autoClose, onClose])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-6 min-w-[320px] max-w-md border border-gray-200 dark:border-gray-700 animate-scaleIn">
                {/* Status Icon */}
                <div className="relative w-20 h-20">
                    {status === 'loading' && (
                        <>
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
                        </>
                    )}

                    {status === 'success' && (
                        <div className="relative w-20 h-20 animate-scale-check">
                            {/* Circle background */}
                            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full"></div>

                            {/* Animated checkmark */}
                            <svg
                                className="absolute inset-0 w-20 h-20 text-green-600 dark:text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                    className="animate-draw-check"
                                />
                            </svg>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="relative w-20 h-20 animate-shake">
                            {/* Circle background */}
                            <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full"></div>

                            {/* X mark */}
                            <svg
                                className="absolute inset-0 w-20 h-20 text-red-600 dark:text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Message */}
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {status === 'loading' && 'Processing...'}
                        {status === 'success' && 'Success!'}
                        {status === 'error' && 'Error'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {message}
                    </p>
                </div>

                {/* Close button for error state */}
                {status === 'error' && (
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-gray-200 font-medium transition-colors"
                    >
                        Close
                    </button>
                )}
            </div>

            <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-check {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes draw-check {
          0% {
            stroke-dasharray: 0, 100;
          }
          100% {
            stroke-dasharray: 100, 100;
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-scale-check {
          animation: scale-check 0.5s ease-out;
        }
        
        .animate-draw-check {
          stroke-dasharray: 100;
          animation: draw-check 0.5s ease-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-out;
        }
        
        .animate-spin-slow {
          animation: spin 3s linear infinite reverse;
        }
      `}</style>
        </div>
    )
}
