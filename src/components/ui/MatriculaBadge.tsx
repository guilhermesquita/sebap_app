'use client'

import React from 'react'
import Image from 'next/image'

interface MatriculaBadgeProps {
    matricula?: string
    onCopy?: () => void
    className?: string
}

export const MatriculaBadge: React.FC<MatriculaBadgeProps> = ({ matricula, onCopy, className = '' }) => {
    const handleCopy = () => {
        if (matricula) {
            navigator.clipboard.writeText(matricula)
            if (onCopy) onCopy()
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`bg-[#31271C] text-white rounded-[8px] px-4 py-2.5 flex items-center gap-3 text-[13px] font-semibold hover:bg-[#423526] transition-colors cursor-pointer active:scale-95 shadow-xs ${className}`}
            title="Copiar Matrícula"
        >
            <span>Matricula: {matricula || '---'}</span>
            <Image
                src="/icons/dashboard/copy-icon.svg"
                alt="Copiar"
                width={14}
                height={14}
                className="opacity-90 flex-shrink-0"
            />
        </button>
    )
}

export default MatriculaBadge
