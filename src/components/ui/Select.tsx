import React, { SelectHTMLAttributes, forwardRef } from 'react'
import styles from './select.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    hasError?: boolean
    errorMessage?: string
    options?: { label: string; value: string | number }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ hasError, errorMessage, options, children, className = '', ...props }, ref) => {
        return (
            <div className={styles.selectWrapper}>
                <select
                    ref={ref}
                    className={`${styles.select} ${hasError ? styles.hasError : ''} ${className}`}
                    {...props}
                >
                    {children || (
                        options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))
                    )}
                </select>
                {errorMessage && (
                    <span className={styles.errorMessage}>{errorMessage}</span>
                )}
            </div>
        )
    }
)

Select.displayName = 'Select'
