'use client'

import React from 'react'

export interface SegmentedControlOption<T extends string = string> {
    key: T
    label: string
    count?: number
}

interface SegmentedControlProps<T extends string = string> {
    options: SegmentedControlOption<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
}

export function SegmentedControl<T extends string = string>({
    options,
    value,
    onChange,
    className = ''
}: SegmentedControlProps<T>) {
    return (
        <div className={`bg-white border border-[#DFD8CE] rounded-[10px] p-1 flex items-center justify-between gap-1 shadow-sm ${className}`}>
            {options.map((option) => {
                const isActive = value === option.key
                return (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => onChange(option.key)}
                        className={`flex-1 lg:flex-none px-3.5 py-2 lg:py-1.5 rounded-[8px] text-[12px] lg:text-[13px] font-medium transition-all text-center ${
                            isActive
                                ? 'bg-[#38302A] text-white shadow-sm'
                                : 'text-[#595149] hover:bg-[#F5F0EB]'
                        }`}
                    >
                        {option.label}
                        {option.count !== undefined && ` (${option.count})`}
                    </button>
                )
            })}
        </div>
    )
}

export default SegmentedControl
