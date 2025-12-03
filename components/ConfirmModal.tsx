import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
  loading = false
}: ConfirmModalProps) {
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

  const variantColors = {
    danger: 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-red-500/30',
    warning: 'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600',
    info: 'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${variantColors[variant]} text-white font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Deleting...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
