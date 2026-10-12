'use client'

import React from 'react'

interface MinhasNotasCardProps {
  totalGrade?: number
  maxTotalGrade?: number
  tarefasGrade?: number
  maxTarefasGrade?: number
  presencasGrade?: number
  maxPresencasGrade?: number
  hasFinalExam?: boolean
  provaFinalGrade?: number
  maxProvaFinalGrade?: number
  statusFinal?: 'Aprovado' | 'Reprovado' | 'Em Andamento'
  onDownloadReport?: () => void
}

export const MinhasNotasCard: React.FC<MinhasNotasCardProps> = ({
  totalGrade = 0,
  maxTotalGrade = 10.0,
  tarefasGrade = 0,
  maxTarefasGrade = 0,
  presencasGrade = 0,
  maxPresencasGrade = 0,
  hasFinalExam = false,
  provaFinalGrade = 0,
  maxProvaFinalGrade = 10.0,
  statusFinal = 'Em Andamento',
  onDownloadReport,
}) => {
  // Gauge math
  const percentage = Math.min(100, Math.max(0, (totalGrade / (maxTotalGrade || 10)) * 100))
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="bg-[#261E18] text-white rounded-[24px] p-6 shadow-md border border-[#3D3128] flex flex-col justify-between gap-4 h-[340px]">
      {/* Card Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-[20px] font-extrabold text-white leading-tight">
            Minhas Notas
          </h3>
          <p className="text-[12px] text-[#A6998E] font-medium">
            Registro Oficial de Desempenho
          </p>
        </div>

        {/* <button
          type="button"
          onClick={onDownloadReport}
          className="p-2 text-[#A6998E] hover:text-white transition-colors cursor-pointer"
          title="Baixar Registro de Notas"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2V11M8 11L4.5 7.5M8 11L11.5 7.5M2 14H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button> */}
      </div>

      {/* Main Gauge + Breakdown Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] items-center gap-5 flex-1">
        {/* Left Side: Circular Gauge */}
        <div className="flex flex-col items-center justify-center relative w-[105px] h-[105px] mx-auto sm:mx-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#3D3128"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Active Arc Progress */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#E8C7A0"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[22px] font-extrabold text-white leading-none tracking-tight">
              {totalGrade.toFixed(1)}
            </span>
            <span className="text-[9px] font-bold text-[#A6998E] tracking-widest uppercase mt-0.5">
              TOTAL
            </span>
          </div>
        </div>

        {/* Right Side: Score Category Bars */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Tarefas */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#D4C6B9] font-medium">Tarefas</span>
              <span className="font-extrabold text-white">
                {tarefasGrade.toFixed(1)} <span className="text-[#8C7D70] font-semibold">/ {maxTarefasGrade.toFixed(1)}</span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#3D3128] overflow-hidden">
              <div
                className="h-full bg-[#E8C7A0] rounded-full transition-all duration-500"
                style={{ width: `${maxTarefasGrade > 0 ? Math.min(100, (tarefasGrade / maxTarefasGrade) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Presenças */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#D4C6B9] font-medium">Presenças</span>
              <span className="font-extrabold text-white">
                {presencasGrade.toFixed(1)} <span className="text-[#8C7D70] font-semibold">/ {maxPresencasGrade.toFixed(1)}</span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#3D3128] overflow-hidden">
              <div
                className="h-full bg-[#E8C7A0] rounded-full transition-all duration-500"
                style={{ width: `${maxPresencasGrade > 0 ? Math.min(100, (presencasGrade / maxPresencasGrade) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Prova Final (Exibida se a matéria tiver prova final) */}
          {hasFinalExam && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#D4C6B9] font-medium">Prova Final</span>
                <span className="font-extrabold text-white">
                  {provaFinalGrade.toFixed(1)} <span className="text-[#8C7D70] font-semibold">/ {maxProvaFinalGrade.toFixed(1)}</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#3D3128] overflow-hidden">
                <div
                  className="h-full bg-[#E8C7A0] rounded-full transition-all duration-500"
                  style={{ width: `${maxProvaFinalGrade > 0 ? Math.min(100, (provaFinalGrade / maxProvaFinalGrade) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Final Status */}
      <div className="pt-2.5 border-t border-[#3D3128] flex items-center justify-center sm:justify-start gap-2 text-[12px] font-bold shrink-0">
        <span
          className={`w-2 h-2 rounded-full ${statusFinal === 'Aprovado'
              ? 'bg-[#12B76A]'
              : statusFinal === 'Reprovado'
                ? 'bg-[#D92D20]'
                : 'bg-[#F79009]'
            }`}
        />
        <span className="text-[#E0D5C9]">
          Status Final: <span className="text-white">{statusFinal}</span>
        </span>
      </div>
    </div>
  )
}

export default MinhasNotasCard
