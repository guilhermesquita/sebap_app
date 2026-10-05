'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (itemsPerPage: number) => void
    itemsPerPageOptions?: number[]
    className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    itemsPerPageOptions = [30, 50, 80],
    className = ''
}) => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    // Generate visible page numbers
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (currentPage > 3) pages.push('...')

            const start = Math.max(2, currentPage - 1)
            const end = Math.min(totalPages - 1, currentPage + 1)

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i)
            }

            if (currentPage < totalPages - 2) pages.push('...')
            pages.push(totalPages)
        }
        return pages
    }

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EDE6DE] text-[13px] text-[#595149] ${className}`}>
            {/* Info Text & Items Per Page Selector */}
            <div className="flex flex-wrap items-center gap-4">
                <span>
                    Mostrando <strong className="text-[#3A332C]">{startItem}</strong> - <strong className="text-[#3A332C]">{endItem}</strong> de <strong className="text-[#3A332C]">{totalItems}</strong> registros
                </span>

                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#8C7A6B]">Por página:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="bg-[#FFF8F6] border border-[#DFD8CE] rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-[#3A332C] outline-none focus:border-[#38302A] cursor-pointer"
                    >
                        {itemsPerPageOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="w-8 h-8 rounded-[8px] border border-[#DFD8CE] bg-white flex items-center justify-center text-[#595149] hover:bg-[#F5F0EB] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Página Anterior"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                        return (
                            <span key={`dots-${index}`} className="px-2 text-[#8C7A6B]">
                                ...
                            </span>
                        )
                    }

                    const pageNum = page as number
                    const isActive = pageNum === currentPage

                    return (
                        <button
                            key={pageNum}
                            type="button"
                            onClick={() => onPageChange(pageNum)}
                            className={`w-8 h-8 rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                                isActive
                                    ? 'bg-[#38302A] text-white shadow-xs'
                                    : 'bg-white border border-[#DFD8CE] text-[#595149] hover:bg-[#F5F0EB]'
                            }`}
                        >
                            {pageNum}
                        </button>
                    )
                })}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="w-8 h-8 rounded-[8px] border border-[#DFD8CE] bg-white flex items-center justify-center text-[#595149] hover:bg-[#F5F0EB] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Próxima Página"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    )
}

export default Pagination
