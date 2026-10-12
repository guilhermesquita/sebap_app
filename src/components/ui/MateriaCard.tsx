'use client';
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

interface MateriaCardProps {
    materia: {
        id: string;
        name: string;
        banner_url?: string | null;
        is_active?: boolean;
        [key: string]: any;
    };
    aulasCount?: number;
    disabled?: boolean;
    showProgress?: boolean;
    progress?: number;
    topBadge?: React.ReactNode;
}

export default function MateriaCard({
    materia,
    aulasCount = 0,
    disabled = false,
    showProgress = false,
    progress = 0,
    topBadge
}: MateriaCardProps) {
    const [imgError, setImgError] = useState(false)
    
    // Obter URL do banner
    const bannerUrl = materia.banner_url || '/banner/default_banner.webp';
    const isInactive = materia.is_active === false;

    const CardContent = (
        <div className={`
            flex flex-col rounded-[12px] overflow-hidden border border-secondary bg-[#F8F5F1]
            transition-all duration-300 relative h-full
            ${disabled 
                ? 'opacity-60 grayscale cursor-not-allowed' 
                : isInactive
                ? 'opacity-70 cursor-pointer hover:shadow-md'
                : 'cursor-pointer hover:shadow-xl hover:scale-[1.02]'
            }
        `}>
            {/* Banner Image */}
            <div className="relative w-full h-[120px] bg-[#EAE1D8] overflow-hidden">
                <Image
                    src={imgError ? "/banner/default_banner.webp" : bannerUrl}
                    alt={materia.name}
                    fill
                    className={`object-cover scale-125 ${isInactive ? 'opacity-60' : ''}`}
                    onError={() => setImgError(true)}
                    unoptimized
                />
                
                {/* Top Badge */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {topBadge !== undefined ? (
                        topBadge
                    ) : (
                        <div className="bg-white rounded-md px-2.5 py-1 shadow-sm">
                            <span className="text-[12px] font-medium text-[#4D453E]">
                                {aulasCount} {aulasCount === 1 ? 'aula' : 'aulas'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 bg-white flex-1 flex flex-col justify-between min-h-[72px]">
                <h3 className={`font-semibold text-[15px] leading-tight line-clamp-2 ${isInactive ? 'text-[#C0B7AD]' : 'text-[#3A332C]'}`}>
                    {materia.name}
                </h3>

                {showProgress && (
                    <div className="flex flex-col gap-1.5 mt-3">
                        <div className={`flex justify-between items-center text-[11px] font-semibold ${isInactive ? 'text-[#C0B7AD]' : 'text-[#4D453E]'}`}>
                            <span>Progresso</span>
                            <span className={isInactive ? 'text-[#C0B7AD]' : 'text-black font-extrabold'}>{progress}%</span>
                        </div>
                        <div className="w-full bg-[#EAE1D8] rounded-full h-[4px]">
                            <div className={`${isInactive ? 'bg-[#C0B7AD]' : 'bg-[#3A332C]'} h-[4px] rounded-full`} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )

    if (disabled) {
        return <div className="w-full h-full">{CardContent}</div>
    }

    return (
        <Link href={`/materias/${materia.id}`} className="w-full block h-full">
            {CardContent}
        </Link>
    )
}

