'use client'

import React from 'react'
import Modal, { ModalProps } from './Modal'

export interface StepModalProps extends Omit<ModalProps, 'children'> {
    currentStep: number
    totalSteps: number
    children: React.ReactNode
}

export function StepIndicator({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) {
    return (
        <div className="flex items-center gap-1.5 mb-5">
            {Array.from({ length: totalSteps }).map((_, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                return (
                    <span
                        key={stepNumber}
                        className={`transition-all duration-300 ${
                            isActive
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
    ...props
}) => {
    return (
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
    )
}

export default StepModal
