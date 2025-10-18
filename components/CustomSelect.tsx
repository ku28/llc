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
    allowCustom?: boolean  // Allow typing custom values
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    required = false,
    allowCustom = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const optionsRef = useRef<HTMLDivElement>(null)

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

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
        setIsOpen(true)
        // Clear input if no value is selected (so placeholder shows properly)
        if (!value) {
            setInputValue('')
        }
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
        <div ref={containerRef} className={`custom-select ${className}`}>
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

            {isOpen && (
                <div className="custom-select-dropdown">
                    <div className="max-h-60 overflow-y-auto" ref={optionsRef}>
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                {inputValue.trim() ? (
                                    <div>
                                        <div className="mb-2">No matching options</div>
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            Press Enter to save: "{inputValue}"
                                        </div>
                                    </div>
                                ) : (
                                    'No options found'
                                )}
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    className={`custom-select-option ${value === option.value ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
                                    onClick={() => handleOptionClick(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
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
