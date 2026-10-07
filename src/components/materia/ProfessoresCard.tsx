'use client'

import React from 'react'
import MateryIcon from '@/components/ui/MateryIcon'
import { Profile } from '@/types/database'

interface ProfessoresCardProps {
  professors: Profile[]
  isAdmin?: boolean
  onAddProfessor?: () => void
  onRemoveProfessor?: (professor: Profile) => void
}

export const ProfessoresCard: React.FC<ProfessoresCardProps> = ({
  professors,
  isAdmin = false,
  onAddProfessor,
  onRemoveProfessor,
}) => {
  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EDE6DE] shadow-xs flex flex-col gap-4 h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-extrabold text-[#3A332C]">
            Professores
          </h3>
          <span className="w-5 h-5 rounded-full bg-[#EDE6DE] text-[#3A332C] text-[11px] font-bold flex items-center justify-center">
            {professors.length}
          </span>
        </div>

        {isAdmin && onAddProfessor && (
          <button
            type="button"
            onClick={onAddProfessor}
            className="w-7 h-7 rounded-[8px] bg-[#38302A] text-white flex items-center justify-center hover:bg-[#52453B] transition-colors cursor-pointer"
            title="Adicionar Professor"
          >
            <span className="text-[16px] font-bold leading-none">+</span>
          </button>
        )}
      </div>

      {/* Scrollable Professors List */}
      <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-1.5 scrollbar-thin">
        {professors.length > 0 ? (
          professors.map((prof) => (
            <div
              key={prof.id}
              className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[14px] p-3 flex items-center justify-between gap-3 shrink-0"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full border border-[#EDE6DE] overflow-hidden bg-[#EDE6DE] flex items-center justify-center shrink-0">
                  {prof.profile_image_url ? (
                    <img
                      src={prof.profile_image_url}
                      alt={prof.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#3A332C] font-bold text-[14px]">
                      {prof.name?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  )}
                </div>
                <span className="text-[14px] font-bold text-[#3A332C] truncate">
                  {prof.name} {prof.surname || ''}
                </span>
              </div>

              {isAdmin && onRemoveProfessor && (
                <button
                  type="button"
                  onClick={() => onRemoveProfessor(prof)}
                  className="w-8 h-8 rounded-[8px] bg-[#FEE2E2] text-[#D92D20] flex items-center justify-center hover:bg-[#FECDCD] transition-colors cursor-pointer shrink-0"
                  title="Remover professor"
                >
                  <MateryIcon name="trash" size={13} color="#D92D20" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-[13px] text-[#8C7A6B] italic py-2">
            Nenhum professor vinculado a esta matéria.
          </p>
        )}
      </div>
    </div>
  )
}

export default ProfessoresCard
