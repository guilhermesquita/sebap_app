import React, { InputHTMLAttributes, forwardRef } from 'react'
import Image from 'next/image'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string | React.ReactNode
    hasError?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, hasError, className = '', ...props }, ref) => {
        return (
            <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
                <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                    <input
                        type="checkbox"
                        ref={ref}
                        className="peer sr-only"
                        {...props}
                    />
                    <div className={`w-full h-full rounded border border-[#000000] bg-transparent peer-checked:bg-[#231C14] peer-checked:border-[#231C14] transition-colors flex items-center justify-center ${hasError ? 'border-danger' : ''}`}>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                        <Image
                            src="/icons/commons/check-icon.svg"
                            alt="check"
                            width={12}
                            height={12}
                        />
                    </div>
                </div>
                {label && (
                    <span className="text-[#4D453E] text-captionMedium select-none">
                        {label}
                    </span>
                )}
            </label>
        )
    }
)

Checkbox.displayName = 'Checkbox'
