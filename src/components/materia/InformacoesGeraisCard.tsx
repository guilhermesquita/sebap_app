'use client'

import React from 'react'
import MateryIcon from '@/components/ui/MateryIcon'
import { Materia } from '@/types/database'
import { formatDateBR, formatStatus } from '@/lib/utils'

interface InformacoesGeraisCardProps {
  materia: Materia
  averageGrade?: number | null
}

export const InformacoesGeraisCard: React.FC<InformacoesGeraisCardProps> = ({
  materia,
  averageGrade = 84,
}) => {
  const minGradeFormatted = materia.min_grade ? (materia.min_grade * 10).toFixed(0) : '60'
  const maxGradeFormatted = materia.max_grade ? (materia.max_grade * 10).toFixed(0) : '100'

  return (
    <div
      id="informacoes-gerais"
      className="bg-white rounded-[20px] p-6 border border-[#EDE6DE] shadow-xs flex flex-col justify-between gap-4 scroll-mt-6 h-[340px]"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[16px] font-extrabold text-[#3A332C]">
          Informações Gerais
        </h3>
        <MateryIcon name="clipboard-check" size={18} color="#7E756D" />
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2.5 text-[13px] justify-between flex-1">
        {/* Status */}
        <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0EB]">
          <span className="text-[#7E756D] font-medium">Status</span>
          <span className="px-3 py-1 rounded-full bg-[#EDE6DE] text-[#3A332C] text-[11px] font-bold uppercase">
            {formatStatus(materia.status)}
          </span>
        </div>

        {/* Mín/Max Nota */}
        <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0EB]">
          <span className="text-[#7E756D] font-medium">Mín/Max Nota</span>
          <span className="text-[#3A332C] font-extrabold text-[14px]">
            {minGradeFormatted} / {maxGradeFormatted}
          </span>
        </div>

        {/* Início */}
        <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0EB]">
          <span className="text-[#7E756D] font-medium">Início</span>
          <span className="text-[#3A332C] font-semibold">
            {materia.start_date ? formatDateBR(materia.start_date) : '—'}
          </span>
        </div>

        {/* Término */}
        <div className="flex items-center justify-between py-1.5 border-b border-[#F5F0EB]">
          <span className="text-[#7E756D] font-medium">Término</span>
          <span className="text-[#3A332C] font-semibold">
            {materia.end_date ? formatDateBR(materia.end_date) : '—'}
          </span>
        </div>

        {/* Média da Turma */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[#7E756D] font-medium">Média da Turma</span>
          <div className="flex items-center gap-1.5 text-[#3A332C] font-extrabold text-[14px]">
            <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
            <span>{averageGrade ?? 84} / {maxGradeFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InformacoesGeraisCard
