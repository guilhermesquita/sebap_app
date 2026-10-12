'use client'

import React from 'react'

export interface SegmentedControlOption<T extends string = string> {
    key: T
    label: string
    count?: number
    icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string = string> {
    options: SegmentedControlOption<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
    pill?: boolean
}

export function SegmentedControl<T extends string = string>({
    options,
    value,
    onChange,
    className = '',
    pill = false
}: SegmentedControlProps<T>) {
    return (
        <div className={`bg-white border border-[#DFD8CE] ${pill ? 'rounded-full' : 'rounded-[12px]'} p-1 flex items-center justify-between gap-1 shadow-xs ${className}`}>
            {options.map((option) => {
                const isActive = value === option.key
                return (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => onChange(option.key)}
                        className={`flex-1 lg:flex-none px-4 py-2 ${pill ? 'rounded-full' : 'rounded-[8px]'} text-[13px] font-semibold transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                            isActive
                                ? 'bg-[#38302A] text-white shadow-xs'
                                : 'text-[#595149] hover:bg-[#F5F0EB]'
                        }`}
                    >
                        {option.icon && (
                            <span className="flex-shrink-0 flex items-center justify-center">
                                {option.icon}
                            </span>
                        )}
                        <span>{option.label}</span>
                        {option.count !== undefined && ` (${option.count})`}
                    </button>
                )
            })}
        </div>
    )
}

export default SegmentedControl
