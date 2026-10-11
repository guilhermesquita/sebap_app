'use client'

import React, { ReactNode, useEffect } from 'react'

export interface ModalProps {
    isOpen: boolean
    onClose: () => void
    outsideCloseClick?: boolean
    title?: string
    children: ReactNode
    className?: string
    showCloseButton?: boolean
    bottomSheetOnMobile?: boolean
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    outsideCloseClick = false,
    title,
    children,
    className = '',
    showCloseButton = false,
    bottomSheetOnMobile = false,
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && outsideCloseClick) {
            onClose()
        }
    }

    const hasCustomMaxWidth = className.includes('max-w')

    return (
        <div
            className={`fixed inset-0 z-[100] flex ${
                bottomSheetOnMobile
                    ? 'items-end sm:items-center p-0 sm:p-4'
                    : 'items-center justify-center p-4'
            } justify-center bg-[#090909]/70 backdrop-blur-xs transition-opacity animate-fadeIn`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-[#FFFFFF] ${
                    bottomSheetOnMobile
                        ? 'rounded-t-[32px] rounded-b-none sm:rounded-[28px] animate-slideUp sm:animate-scaleUp'
                        : 'rounded-[24px] animate-scaleUp'
                } shadow-2xl w-full ${hasCustomMaxWidth ? '' : 'max-w-[540px]'} max-h-[90vh] overflow-y-auto relative p-6 sm:p-8 flex flex-col ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {bottomSheetOnMobile && (
                    <div className="w-12 h-1.5 rounded-full bg-[#E5DDD4] mx-auto mb-4 sm:hidden shrink-0" />
                )}
                {title && (
                    <h3 className="text-[#3A332C] text-lg font-bold mb-4">{title}</h3>
                )}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-[#8C7A6B] hover:text-[#3A332C] transition-colors p-2 rounded-full"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}

export default Modal
