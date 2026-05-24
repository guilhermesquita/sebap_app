import React, { InputHTMLAttributes, forwardRef } from 'react'
import styles from './checkbox.module.css'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string
    hasError?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, hasError, className = '', ...props }, ref) => {
        return (
            <label className={`${styles.checkboxWrapper} ${hasError ? styles.hasError : ''} ${className}`}>
                <div className={styles.checkboxContainer}>
                    <input
                        type="checkbox"
                        ref={ref}
                        className={styles.hiddenInput}
                        {...props}
                    />
                    <span className={styles.checkmark}></span>
                </div>
                <span className={styles.label}>{label}</span>
            </label>
        )
    }
)

Checkbox.displayName = 'Checkbox'
