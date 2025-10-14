import { useState, useRef, useEffect } from 'react'

interface Option {
    value: string
    label: string
}

interface CustomSelectProps {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    className?: string
    required?: boolean
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    required = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery('') // Clear search when closing
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [isOpen])

    const selectedOption = options.find(opt => opt.value === value)
    const displayText = selectedOption ? selectedOption.label : placeholder

    // Filter options based on search query
    const filteredOptions = options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div ref={containerRef} className={`custom-select ${className}`}>
            <div
                className="custom-select-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={!selectedOption ? 'placeholder' : ''}>{displayText}</span>
                <svg
                    className={`arrow ${isOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                >
                    <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {/* Search Input */}
                    <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="🔍 Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option.value}
                                    className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                        setSearchQuery('')
                                    }}
                                >
                                    {value === option.value && <span className="checkmark">✓ </span>}
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
