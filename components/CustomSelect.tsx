import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Option {
    value: string
    label: string
    description?: string  // Optional description field
}

interface CustomSelectProps {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    className?: string
    required?: boolean
    allowCustom?: boolean  // Allow typing custom values
    onOpenChange?: (isOpen: boolean) => void  // Callback when dropdown opens/closes
    disabled?: boolean  // Disable the select
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    required = false,
    allowCustom = false,
    onOpenChange,
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [hoveredOption, setHoveredOption] = useState<Option | null>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const optionsRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Update input value when value prop changes (for pre-filled forms)
    useEffect(() => {
        if (!isOpen) {
            if (value) {
                const option = options.find(opt => opt.value === value)
                if (option) {
                    setInputValue(option.label)
                } else {
                    // Show custom value (not in options list)
                    setInputValue(value)
                }
            } else {
                setInputValue('')
            }
        }
    }, [value, options, allowCustom, isOpen])

    // Notify parent when dropdown opens/closes
    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node
            const clickedInContainer = containerRef.current && containerRef.current.contains(target)
            const clickedInDropdown = dropdownRef.current && dropdownRef.current.contains(target)
            
            if (!clickedInContainer && !clickedInDropdown) {
                setIsOpen(false)
                // Keep the custom value or restore the selected option label
                if (!isOpen) return
                const selectedOption = options.find(opt => opt.value === value)
                if (selectedOption) {
                    setInputValue(selectedOption.label)
                } else if (value) {
                    // Keep custom value
                    setInputValue(value)
                } else {
                    setInputValue('')
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, value, options, allowCustom])

    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(0)
    }, [inputValue])

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && optionsRef.current && optionsRef.current.children[highlightedIndex]) {
            const highlightedElement = optionsRef.current.children[highlightedIndex] as HTMLElement
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [highlightedIndex, isOpen])

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width
            })
        }
    }, [isOpen])

    // Update dropdown position on scroll
    useEffect(() => {
        if (!isOpen) return
        
        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setDropdownPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                    width: rect.width
                })
            }
        }
        
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)
        
        return () => {
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen])

    // Filter options based on input value
    const filteredOptions = options.filter(option => 
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    )

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else if (highlightedIndex < filteredOptions.length - 1) {
                    setHighlightedIndex(highlightedIndex + 1)
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else if (highlightedIndex > 0) {
                    setHighlightedIndex(highlightedIndex - 1)
                }
                break
            case 'Enter':
                e.preventDefault()
                if (isOpen && filteredOptions.length > 0) {
                    const selectedOption = filteredOptions[highlightedIndex]
                    if (selectedOption) {
                        selectOption(selectedOption)
                    }
                } else if (isOpen && inputValue.trim()) {
                    // If no options match, use the custom input value
                    onChange(inputValue.trim())
                    setIsOpen(false)
                } else if (!isOpen) {
                    setIsOpen(true)
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                // Restore the selected option label or keep custom value
                const selectedOption = options.find(opt => opt.value === value)
                if (selectedOption) {
                    setInputValue(selectedOption.label)
                } else if (value) {
                    // Keep custom value
                    setInputValue(value)
                } else {
                    setInputValue('')
                }
                break
            case 'Tab':
                if (isOpen) {
                    setIsOpen(false)
                    // If there's a highlighted option, select it
                    if (filteredOptions.length > 0) {
                        const selectedOption = filteredOptions[highlightedIndex]
                        if (selectedOption) {
                            selectOption(selectedOption)
                        }
                    }
                }
                break
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        setIsOpen(true)
        setHighlightedIndex(0)
        
        // Always update the value as user types (allows custom entries)
        onChange(newValue)
    }

    const handleInputFocus = () => {
        // Clear the input value to show all options when clicking dropdown
        setInputValue('')
        setIsOpen(true)
        setHighlightedIndex(0)
    }

    const selectOption = (option: Option) => {
        onChange(option.value)
        setInputValue(option.label)
        setIsOpen(false)
    }

    const handleOptionClick = (option: Option) => {
        selectOption(option)
    }

    return (
        <div ref={containerRef} className={`custom-select ${isOpen ? 'open' : ''} ${className}`}>
            <div className="custom-select-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="custom-select-input"
                    autoComplete="off"
                    required={required}
                    disabled={disabled}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                <svg
                    className={`arrow ${isOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    onClick={() => {
                        if (isOpen) {
                            setIsOpen(false)
                        } else {
                            setIsOpen(true)
                            inputRef.current?.focus()
                        }
                    }}
                    style={{ cursor: 'pointer' }}
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

            {isOpen && typeof window !== 'undefined' && createPortal(
                <div 
                    ref={dropdownRef}
                    className="custom-select-dropdown" 
                    style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                    }}
                >
                    <div className="max-h-60 overflow-y-auto" ref={optionsRef}>
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                {inputValue.trim() ? (
                                    <div>
                                        <div className="mb-2" style={{fontSize: '0.7rem'}}>No matching options</div>
                                        <div style={{fontSize: '0.65rem'}} className="text-green-600 dark:text-green-400 font-medium">
                                            Press Enter to save: "{inputValue}"
                                        </div>
                                    </div>
                                ) : (
                                    'No options found'
                                )}
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const isSuggested = option.description === 'SUGGESTED'
                                const hasNoPhone = (option as any).noPhone
                                const hasPhone = (option as any).hasPhone
                                return (
                                <div
                                    key={option.value}
                                    className={`custom-select-option ${value === option.value ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''} ${isSuggested ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500' : ''}`}
                                    onClick={() => handleOptionClick(option)}
                                    onMouseEnter={() => {
                                        setHighlightedIndex(index)
                                        if (option.description && option.description !== 'SUGGESTED') {
                                            setHoveredOption(option)
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredOption(null)}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                >
                                    <div className="flex items-center gap-2" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                                        <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</span>
                                        {isSuggested && (
                                            <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold shadow-md flex-shrink-0" style={{fontSize: '0.65rem'}}>
                                                SUGGESTED
                                            </span>
                                        )}
                                        {hasNoPhone && (
                                            <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-bold shadow-md flex-shrink-0" style={{fontSize: '0.65rem'}}>
                                                NO PHONE NO.
                                            </span>
                                        )}
                                        {hasPhone && !isSuggested && (
                                            <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-medium shadow-sm flex-shrink-0" style={{fontSize: '0.65rem'}}>
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    {hoveredOption?.value === option.value && option.description && option.description !== 'SUGGESTED' && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-emerald-900/30 border-2 border-emerald-400 dark:border-emerald-600 rounded-lg shadow-xl p-3 text-gray-700 dark:text-gray-200 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200" style={{fontSize: '0.7rem'}}>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <span className="leading-relaxed">{option.description}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
