import React, { InputHTMLAttributes, forwardRef, useState } from 'react'
import Image from 'next/image'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean
    errorMessage?: string
    icon?: React.ReactNode
    textSize?: 'smallCaption' | 'caption' | 'captionMedium'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ hasError, errorMessage, icon, textSize = 'captionMedium', type, className = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false)
        const isPassword = type === 'password'
        const currentType = isPassword && showPassword ? 'text' : type

        const sizeClasses = {
            smallCaption: 'text-smallCaption',
            caption: 'text-caption',
            captionMedium: 'text-captionMedium',
        }

        return (
            <div className="flex flex-col gap-1 w-full">
                <div className={`flex items-center bg-white rounded-[8px] px-4 py-3 h-[48px] w-full transition-colors ${hasError ? 'border-2 border-danger' : 'border border-transparent'} ${className}`}>
                    {icon && (
                        <div className="mr-3 flex-shrink-0 flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        type={currentType}
                        className={`flex-1 bg-transparent outline-none border-none text-brown-500 placeholder:text-[#7E756D] ${sizeClasses[textSize]}`}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="ml-3 flex-shrink-0 focus:outline-none flex items-center justify-center"
                        >
                            <Image
                                src={showPassword ? '/icons/commons/close-eye-icon.svg' : '/icons/commons/open-eye-icon.svg'}
                                alt={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                                width={20}
                                height={20}
                            />
                        </button>
                    )}
                </div>
                {errorMessage && (
                    <span className="text-danger text-smallCaption font-medium ml-1">{errorMessage}</span>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
