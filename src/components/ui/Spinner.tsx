import React from 'react'

interface SpinnerProps {
    size?: number
    color?: 'white' | 'dark'
    className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
    size = 20,
    color = 'white',
    className = ''
}) => {
    return (
        <div
            className={`spinner ${color === 'dark' ? 'spinner-dark' : ''} ${className}`}
            style={{ width: size, height: size }}
        />
    )
}
