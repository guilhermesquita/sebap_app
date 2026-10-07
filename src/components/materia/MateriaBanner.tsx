'use client'

import React from 'react'
import MateryIcon from '@/components/ui/MateryIcon'
import { Materia } from '@/types/database'
import { formatStatus } from '@/lib/utils'

interface MateriaBannerProps {
  materia: Materia
  isAdmin?: boolean
  onEdit?: () => void
  onNewAula?: () => void
  onVerNotas?: () => void
}

export const MateriaBanner: React.FC<MateriaBannerProps> = ({
  materia,
  isAdmin = false,
  onEdit,
  onNewAula,
  onVerNotas,
}) => {
  const handleScrollToInfos = () => {
    const el = document.getElementById('informacoes-gerais')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const defaultBanner = '/images/materia-banner-default.jpg'
  const bannerImage = materia.banner_url || defaultBanner

  return (
    <div className="relative w-full rounded-[24px] overflow-hidden p-6 md:p-8 min-h-[300px] flex flex-col justify-end shadow-lg bg-[#2E241C] text-white">
      {/* Background Image with Dark Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={bannerImage}
          alt={materia.name}
          className="w-full h-full object-cover opacity-35"
          onError={(e) => {
            // Fallback if image load fails
            (e.target as HTMLImageElement).src = defaultBanner
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#251D17] via-[#2E241C]/80 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col gap-3">
        {/* Status Pill Badge */}
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#53463B]/80 text-[#ECE6E0] backdrop-blur-xs border border-white/10">
            {formatStatus(materia.status)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight text-white tracking-tight">
          {materia.name}
        </h1>

        {/* Description */}
        {materia.description && (
          <p className="text-[13px] md:text-[14px] text-[#E0D8D0] font-normal leading-relaxed max-w-4xl opacity-90 mb-2">
            {materia.description}
          </p>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-2">
          {/* Ver Notas Button (Only for Admin / Professor) */}
          {isAdmin && onVerNotas && (
            <button
              type="button"
              onClick={onVerNotas}
              className="px-4 py-2.5 rounded-[12px] bg-white text-[#3A332C] text-[13px] font-semibold flex items-center gap-2 hover:bg-[#F5F0EB] transition-colors shadow-xs cursor-pointer"
            >
              <MateryIcon name="group" size={16} color="#3A332C" />
              <span>Ver Notas</span>
            </button>
          )}

          {/* Editar Button (Only for Admin / Professor) */}
          {isAdmin && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2.5 rounded-[12px] bg-[#43382F]/90 border border-[#685A4D] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#52453B] transition-colors cursor-pointer"
            >
              <MateryIcon name="edit" size={15} color="#FFFFFF" />
              <span>Editar</span>
            </button>
          )}

          {/* Infos. da matéria Button (Smooth Scroll - Only for Admin / Professor) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleScrollToInfos}
              className="px-4 py-2.5 rounded-[12px] bg-[#43382F]/90 border border-[#685A4D] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#52453B] transition-colors cursor-pointer"
            >
              <MateryIcon name="clipboard-check" size={15} color="#FFFFFF" />
              <span>Infos. da matéria</span>
            </button>
          )}

          {/* + Nova Aula Button (for Admin / Prof) */}
          {isAdmin && onNewAula && (
            <button
              type="button"
              onClick={onNewAula}
              className="px-4 py-2.5 rounded-[12px] bg-[#F1D7B8] text-[#2C2117] text-[13px] font-bold flex items-center gap-2 hover:bg-[#E7C7A2] transition-colors shadow-xs cursor-pointer ml-auto"
            >
              <MateryIcon name="new" size={12} color="#2C2117" />
              <span>Nova Aula</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MateriaBanner
