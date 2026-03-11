import React, { InputHTMLAttributes, forwardRef } from 'react'
import styles from './input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean
    errorMessage?: string
    icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ hasError, errorMessage, icon, className = '', ...props }, ref) => {
        return (
            <div className={styles.inputWrapper}>
                <div className={styles.iconWrapper}>
                    {icon && <span className={styles.icon}>{icon}</span>}
                    <input
                        ref={ref}
                        className={`${styles.input} ${hasError ? styles.hasError : ''} ${icon ? styles.withIcon : ''} ${className}`}
                        {...props}
                    />
                </div>
                {errorMessage && (
                    <span className={styles.errorMessage}>{errorMessage}</span>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
