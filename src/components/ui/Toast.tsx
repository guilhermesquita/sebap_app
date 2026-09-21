import React, { useEffect, useState } from 'react'

export type ToastType = 'error' | 'success' | 'default'

interface ToastProps {
    message: string
    type?: ToastType
    visible: boolean
    onClose: () => void
    duration?: number
}

export function Toast({ message, type = 'default', visible, onClose, duration = 3000 }: ToastProps) {
    const [render, setRender] = useState(visible)
    const [animate, setAnimate] = useState(false)

    useEffect(() => {
        if (visible) {
            setRender(true)
            const animTimer = setTimeout(() => setAnimate(true), 10) // trigger enter animation
            
            const timer = setTimeout(() => {
                onClose()
            }, duration)
            
            return () => {
                clearTimeout(animTimer)
                clearTimeout(timer)
            }
        } else {
            setAnimate(false) // trigger exit animation
            const timer = setTimeout(() => setRender(false), 300) // wait for exit animation to finish
            return () => clearTimeout(timer)
        }
    }, [visible, duration, onClose])

    if (!render) return null

    const bgColors = {
        error: 'bg-danger',
        success: 'bg-success',
        default: 'bg-primary'
    }

    return (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className={`flex items-center gap-3 px-6 py-4 rounded-[8px] shadow-xl text-white font-medium text-captionMedium ${bgColors[type]}`}>
                {type === 'error' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                )}
                {type === 'success' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                )}
                <span>{message}</span>
            </div>
        </div>
    )
}
