import React, { ButtonHTMLAttributes } from 'react'
import Image from 'next/image'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'google'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    isLoading,
    className = '',
    leftIcon,
    rightIcon,
    disabled,
    ...props
}, ref) => {
    const baseStyles = "flex items-center justify-center gap-3 px-4 h-[48px] rounded-[8px] text-captionMedium font-semibold transition-all"
    const variantStyles = {
        primary: "bg-brown-500 text-white hover:bg-brown-400",
        google: "bg-white text-brown-500 hover:bg-neutral shadow-sm"
    }

    return (
        <button
            ref={ref}
            className={`${baseStyles} ${variantStyles[variant]} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {leftIcon}
                    {children}
                    {rightIcon}
                </>
            )}
        </button>
    )
})
Button.displayName = 'Button'
