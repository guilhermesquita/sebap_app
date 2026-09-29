'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export interface DatePickerProps {
    value: string // Format: YYYY-MM-DD
    onChange: (value: string) => void // Returns YYYY-MM-DD
    placeholder?: string
    disabled?: boolean
    className?: string
    hasError?: boolean
    minDate?: string // Format: YYYY-MM-DD
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = 'dd/mm/aaaa',
    disabled = false,
    className = '',
    hasError = false,
    minDate,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Calculate fixed position for Portal popover
    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const popoverWidth = 310
            let left = rect.left
            if (left + popoverWidth > window.innerWidth - 16) {
                left = Math.max(16, window.innerWidth - popoverWidth - 16)
            }
            let top = rect.bottom + 6
            // If popover goes past bottom of viewport, position above input if space permits
            if (top + 320 > window.innerHeight && rect.top - 320 > 0) {
                top = rect.top - 320
            }
            setCoords({ top, left })
        }
    }

    useEffect(() => {
        if (isOpen) {
            updatePosition()
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition, true)
        }
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen])

    // Helper functions for date math without timezone issues
    const parseISODate = (val: string): Date | null => {
        if (!val) return null
        const parts = val.split('-')
        if (parts.length !== 3) return null
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        const d = new Date(year, month, day)
        return isNaN(d.getTime()) ? null : d
    }

    const selectedDate = parseISODate(value)
    const minDateObj = parseISODate(minDate || '')

    const isDateDisabled = (targetYear: number, targetMonth: number, targetDay: number) => {
        if (!minDateObj) return false
        const target = new Date(targetYear, targetMonth, targetDay)
        const minTarget = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate())
        return target < minTarget
    }

    const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date())

    useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate)
        }
    }, [value])

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                popoverRef.current &&
                !popoverRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const formatDisplay = (val: string) => {
        const d = parseISODate(val)
        if (!d) return ''
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    }

    const toISODateString = (year: number, month: number, day: number) => {
        const yStr = String(year)
        const mStr = String(month + 1).padStart(2, '0')
        const dStr = String(day).padStart(2, '0')
        return `${yStr}-${mStr}-${dStr}`
    }

    // Calendar grid calculations
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const prevMonthDays: number[] = []
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        prevMonthDays.push(daysInPrevMonth - i)
    }

    const currentMonthDays: number[] = []
    for (let i = 1; i <= daysInMonth; i++) {
        currentMonthDays.push(i)
    }

    const totalGridCells = prevMonthDays.length + currentMonthDays.length
    const nextMonthDays: number[] = []
    const remainingCells = (42 - totalGridCells) % 7 === 0 ? 42 - totalGridCells : (Math.ceil(totalGridCells / 7) * 7) - totalGridCells
    for (let i = 1; i <= remainingCells; i++) {
        nextMonthDays.push(i)
    }

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation()
        setViewDate(new Date(year, month - 1, 1))
    }

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation()
        setViewDate(new Date(year, month + 1, 1))
    }

    const handleSelectDay = (dayNum: number, targetMonth: 'prev' | 'current' | 'next') => {
        let selectedYear = year
        let selectedMonth = month

        if (targetMonth === 'prev') {
            selectedMonth -= 1
            if (selectedMonth < 0) {
                selectedMonth = 11
                selectedYear -= 1
            }
        } else if (targetMonth === 'next') {
            selectedMonth += 1
            if (selectedMonth > 11) {
                selectedMonth = 0
                selectedYear += 1
            }
        }

        const iso = toISODateString(selectedYear, selectedMonth, dayNum)
        onChange(iso)
        setIsOpen(false)
    }

    const isToday = (dayNum: number) => {
        const today = new Date()
        return (
            today.getDate() === dayNum &&
            today.getMonth() === month &&
            today.getFullYear() === year
        )
    }

    const isSelected = (dayNum: number) => {
        if (!selectedDate) return false
        return (
            selectedDate.getDate() === dayNum &&
            selectedDate.getMonth() === month &&
            selectedDate.getFullYear() === year
        )
    }

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Input Trigger */}
            <div
                onClick={() => {
                    if (!disabled) setIsOpen(!isOpen)
                }}
                className={`flex items-center justify-between bg-[#FFF8F6] rounded-[12px] h-[48px] px-4 cursor-pointer select-none transition-colors border ${
                    hasError ? 'border-danger' : isOpen ? 'border-[#38302A]' : 'border-transparent hover:border-[#DFD8CE]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            >
                <span className={`text-[14px] ${value ? 'text-[#3A332C] font-medium' : 'text-[#8C7A6B]'}`}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
                <CalendarIcon size={18} className="text-[#8C7A6B] flex-shrink-0" />
            </div>

            {/* Calendar Popover via Portal */}
            {isOpen && mounted && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        zIndex: 999999,
                    }}
                    className="w-[310px] bg-white border border-[#DFD8CE] rounded-[20px] shadow-2xl p-4 animate-scaleUp"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3A332C] hover:bg-[#FFF8F6] transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-[#3A332C] font-bold text-[14px]">
                            {MONTH_NAMES[month]} {year}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3A332C] hover:bg-[#FFF8F6] transition-colors cursor-pointer"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Weekdays Row */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {WEEKDAYS.map((wd) => (
                            <span key={wd} className="text-[#8C7A6B] text-[11px] font-bold">
                                {wd}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Prev Month Days */}
                        {prevMonthDays.map((d) => {
                            let prevMonth = month - 1
                            let prevYear = year
                            if (prevMonth < 0) {
                                prevMonth = 11
                                prevYear -= 1
                            }
                            const disabledDay = isDateDisabled(prevYear, prevMonth, d)
                            return (
                                <button
                                    key={`prev-${d}`}
                                    type="button"
                                    disabled={disabledDay}
                                    onClick={() => !disabledDay && handleSelectDay(d, 'prev')}
                                    className={`h-9 w-9 rounded-full text-[13px] text-[#D0C5BB] flex items-center justify-center ${
                                        disabledDay
                                            ? 'opacity-30 cursor-not-allowed pointer-events-none'
                                            : 'hover:bg-[#FFF8F6] cursor-pointer'
                                    }`}
                                >
                                    {d}
                                </button>
                            )
                        })}

                        {/* Current Month Days */}
                        {currentMonthDays.map((d) => {
                            const active = isSelected(d)
                            const today = isToday(d)
                            const disabledDay = isDateDisabled(year, month, d)
                            return (
                                <button
                                    key={`current-${d}`}
                                    type="button"
                                    disabled={disabledDay}
                                    onClick={() => !disabledDay && handleSelectDay(d, 'current')}
                                    className={`h-9 w-9 rounded-full text-[13px] font-semibold flex items-center justify-center transition-all ${
                                        disabledDay
                                            ? 'text-[#D0C5BB] opacity-30 cursor-not-allowed pointer-events-none'
                                            : active
                                            ? 'bg-[#38302A] text-white shadow-xs cursor-pointer'
                                            : today
                                            ? 'bg-[#FFF8F6] text-[#38302A] border border-[#38302A] cursor-pointer'
                                            : 'text-[#3A332C] hover:bg-[#FFF8F6] cursor-pointer'
                                    }`}
                                >
                                    {d}
                                </button>
                            )
                        })}

                        {/* Next Month Days */}
                        {nextMonthDays.map((d) => {
                            let nextMonth = month + 1
                            let nextYear = year
                            if (nextMonth > 11) {
                                nextMonth = 0
                                nextYear += 1
                            }
                            const disabledDay = isDateDisabled(nextYear, nextMonth, d)
                            return (
                                <button
                                    key={`next-${d}`}
                                    type="button"
                                    disabled={disabledDay}
                                    onClick={() => !disabledDay && handleSelectDay(d, 'next')}
                                    className={`h-9 w-9 rounded-full text-[13px] text-[#D0C5BB] flex items-center justify-center ${
                                        disabledDay
                                            ? 'opacity-30 cursor-not-allowed pointer-events-none'
                                            : 'hover:bg-[#FFF8F6] cursor-pointer'
                                    }`}
                                >
                                    {d}
                                </button>
                            )
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default DatePicker
