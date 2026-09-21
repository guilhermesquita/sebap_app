'use client'

import React, { SelectHTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    hasError?: boolean
    errorMessage?: string
    icon?: React.ReactNode
    options?: { label: string; value: string | number }[]
    textSize?: 'smallCaption' | 'caption' | 'captionMedium'
    placeholder?: string
    onChange?: (e: { target: { value: string } }) => void
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ hasError, errorMessage, icon, options = [], textSize = 'captionMedium', className = '', value, onChange, placeholder = 'Selecione...', ...props }, ref) => {
        const [isOpen, setIsOpen] = useState(false)
        const containerRef = useRef<HTMLDivElement>(null)

        const sizeClasses = {
            smallCaption: 'text-smallCaption',
            caption: 'text-caption',
            captionMedium: 'text-captionMedium',
        }

        // Click outside to close
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        const selectedOption = options.find(opt => String(opt.value) === String(value))

        return (
            <div className="flex flex-col gap-1 w-full" ref={containerRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative flex items-center bg-white rounded-[8px] px-4 h-[48px] w-full transition-colors cursor-pointer select-none ${hasError ? 'border-2 border-danger' : 'border border-transparent'} ${className}`}
                >
                    {icon && (
                        <div className="mr-3 flex-shrink-0 flex items-center justify-center">
                            {icon}
                        </div>
                    )}

                    <div className={`flex-1 truncate ${!selectedOption ? 'text-[#7E756D]' : 'text-brown-500'} ${sizeClasses[textSize]}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </div>

                    <div className={`ml-3 flex-shrink-0 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        <Image
                            src="/icons/commons/arrow-down.svg"
                            alt="Abrir"
                            width={10}
                            height={6}
                        />
                    </div>

                    {/* Custom Dropdown Options */}
                    <div className={`absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-[8px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] border border-neutral py-2 z-50 max-h-[250px] overflow-y-auto transition-all duration-200 origin-top [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D0C5BB] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#AA9E90] ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'}`}>
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onChange?.({ target: { value: String(opt.value) } })
                                    setIsOpen(false)
                                }}
                                className={`px-4 py-3 hover:bg-background cursor-pointer text-brown-500 transition-colors ${sizeClasses[textSize]} ${String(value) === String(opt.value) ? 'bg-background font-semibold' : ''}`}
                            >
                                {opt.label}
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className={`px-4 py-3 text-[#7E756D] ${sizeClasses[textSize]}`}>
                                Nenhuma opção disponível
                            </div>
                        )}                    </div>
                </div>
                {errorMessage && (
                    <span className="text-danger text-smallCaption font-medium ml-1">{errorMessage}</span>
                )}
            </div>
        )
    }
)

Select.displayName = 'Select'
