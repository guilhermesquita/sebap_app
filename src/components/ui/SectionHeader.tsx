import React from 'react'

interface SectionHeaderProps {
    title: string
    sphereColor?: string
    borderColor?: string
    className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    sphereColor = 'bg-primary',
    borderColor = 'border-[#DED7CC]',
    className = ''
}) => {
    return (
        <div className={`w-full mb-6 ${className}`}>
            <div className="flex items-center gap-2.5 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${sphereColor} inline-block flex-shrink-0`} />
                <h2 className="text-[#3A332C] text-[16px] font-bold tracking-tight">
                    {title}
                </h2>
            </div>
            <div className={`w-full border-b ${borderColor}`} />
        </div>
    )
}

export default SectionHeader
