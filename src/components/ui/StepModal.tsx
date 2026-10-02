'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import Modal, { ModalProps } from './Modal'

export interface StepModalProps extends Omit<ModalProps, 'children'> {
    currentStep: number
    totalSteps: number
    children: React.ReactNode
    onBackStep?: () => void
    mobileFooter?: React.ReactNode
    onCloseClick?: () => void
}

export function StepIndicator({
    currentStep,
    totalSteps,
    className = 'mb-5'
}: {
    currentStep: number
    totalSteps: number
    className?: string
}) {
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {Array.from({ length: totalSteps }).map((_, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                return (
                    <span
                        key={stepNumber}
                        className={`transition-all duration-300 ${isActive
                            ? 'w-6 h-1.5 rounded-full bg-[#55402A]'
                            : 'w-1.5 h-1.5 rounded-full bg-[#D9D9D9]'
                            }`}
                        aria-label={`Passo ${stepNumber}`}
                    />
                )
            })}
        </div>
    )
}

export const StepModal: React.FC<StepModalProps> = ({
    isOpen,
    onClose,
    outsideCloseClick = false,
    currentStep,
    totalSteps,
    children,
    className = '',
    onBackStep,
    mobileFooter,
    onCloseClick,
    ...props
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

    const handleExit = () => {
        if (onCloseClick) {
            onCloseClick()
        } else {
            onClose()
        }
    }

    return (
        <>
            {/* Desktop Modal (Centered) - Unchanged */}
            <div className="hidden md:block">
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    outsideCloseClick={outsideCloseClick}
                    className={className}
                    {...props}
                >
                    <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
                    {children}
                </Modal>
            </div>

            {/* Mobile Bottom Modal (Bottom Sheet) */}
            <div className="block md:hidden">
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-[#090909]/70 backdrop-blur-xs transition-opacity animate-fadeIn"
                    onClick={handleBackdropClick}
                >
                    <div
                        className="w-full max-h-[92vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col relative animate-slideUp shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header (Cream Background) */}
                        <div className="bg-[#FFF8F6] pt-3 pb-3.5 px-6 flex flex-col border-b border-[#EDE6DE] flex-shrink-0">
                            {/* Drag Handle Bar */}
                            <div className="w-[54px] h-[5px] rounded-full bg-[#E5DDD4] mx-auto mb-3" />

                            {/* Header Content Row */}
                            <div className="flex items-center justify-between">
                                <StepIndicator
                                    currentStep={currentStep}
                                    totalSteps={totalSteps}
                                    className="mb-0"
                                />

                                {/* Action Button */}
                                {currentStep === 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleExit}
                                        className="p-1.5 text-[#7E756D] hover:text-[#3A332C] transition-colors cursor-pointer"
                                        aria-label="Sair"
                                    >
                                        <Image
                                            src="/icons/commons/exit-icon.svg"
                                            alt="Sair"
                                            width={20}
                                            height={20}
                                        />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onBackStep}
                                        style={{ border: '2.5px solid #55402A', borderRadius: '10px' }}
                                        className="w-9 h-9 bg-white flex items-center justify-center text-[#7E766D] hover:bg-[#55402A] hover:text-white active:scale-95 transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md"
                                        aria-label="Voltar"
                                        title="Voltar ao passo anterior"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 14 14"
                                            fill="currentColor"
                                            className="group-hover:-translate-x-0.5 transition-transform duration-200"
                                        >
                                            <path d="M3.52067 6.16666L13.6665 6.16666V7.83333L3.52067 7.83333L8.18734 12.5L6.99984 13.6667L0.333171 7L6.99984 0.333331L8.18734 1.5L3.52067 6.16666Z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Body (White Background #FFFFFF) */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#FFFFFF] flex flex-col gap-4">
                            {children}
                        </div>

                        {/* Mobile Footer (White Background #FFFFFF) */}
                        {mobileFooter && (
                            <div className="px-6 pb-6 pt-2 bg-[#FFFFFF] flex-shrink-0 w-full">
                                {mobileFooter}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default StepModal
