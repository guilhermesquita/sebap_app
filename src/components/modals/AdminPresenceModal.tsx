'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase-client'
import { Profile, Aula, AulaTask } from '@/types/database'

export interface AdminPresenceModalProps {
    isOpen: boolean
    onClose: () => void
    aula: Aula | null
    materiaId: string
    aulas?: Aula[]
    allTasks?: AulaTask[]
    onSuccess?: (studentName: string) => void
}

export function AdminPresenceModal({
    isOpen,
    onClose,
    aula,
    materiaId,
    aulas = [],
    allTasks = [],
    onSuccess,
}: AdminPresenceModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [hasSearched, setHasSearched] = useState(false)

    // Step 2 State
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
    const [isPresenceChecked, setIsPresenceChecked] = useState(true)
    const [aulaTasks, setAulaTasks] = useState<AulaTask[]>([])
    const [taskGradesInput, setTaskGradesInput] = useState<{ [taskId: string]: boolean }>({})
    const [isSaving, setIsSaving] = useState(false)

    const supabase = createClient()

    // Reset state on open/close
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setSearchQuery('')
            setSearchResults([])
            setHasSearched(false)
            setSelectedStudent(null)
            setIsPresenceChecked(true)
            setTaskGradesInput({})
        }
    }, [isOpen])

    // Load tasks for current aula (or previous aula if current has none)
    useEffect(() => {
        if (isOpen && aula) {
            let tasks = allTasks.filter(t => t.aula_id === aula.id)
            if (tasks.length === 0 && aulas.length > 0) {
                const currentIndex = aulas.findIndex(a => a.id === aula.id)
                const prevAula = currentIndex > 0 ? aulas[currentIndex - 1] : null
                if (prevAula) {
                    tasks = allTasks.filter(t => t.aula_id === prevAula.id)
                }
            }
            setAulaTasks(tasks)
        }
    }, [isOpen, aula, aulas, allTasks])

    // Search students logic
    const handleSearch = async () => {
        const term = searchQuery.trim()
        if (!term) return

        setIsSearching(true)
        setHasSearched(true)

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, tendas(name)')
                .or(`matricula.ilike.%${term}%,name.ilike.%${term}%,surname.ilike.%${term}%`)
                .limit(10)

            if (!error && data) {
                setSearchResults(data)
            } else {
                setSearchResults([])
            }
        } catch {
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    // Select student and move to Step 2
    const handleSelectStudent = async (student: any) => {
        setSelectedStudent(student)
        setIsPresenceChecked(true)

        // Check if student already has existing presence for this aula
        if (aula) {
            const { data: presData } = await supabase
                .from('presencas_tarefas')
                .select('*')
                .eq('aula_id', aula.id)
                .eq('aluno_id', student.id)
                .maybeSingle()

            if (presData) {
                setIsPresenceChecked(presData.presence)
            }

            // Check existing task grades
            if (aulaTasks.length > 0) {
                const taskIds = aulaTasks.map(t => t.id)
                const { data: gradesData } = await supabase
                    .from('student_task_grades')
                    .select('*')
                    .in('task_id', taskIds)
                    .eq('aluno_id', student.id)

                const initialInput: { [taskId: string]: boolean } = {}
                aulaTasks.forEach(t => {
                    const gradeRecord = gradesData?.find(g => g.task_id === t.id)
                    initialInput[t.id] = gradeRecord ? Number(gradeRecord.grade) > 0 : false
                })
                setTaskGradesInput(initialInput)
            } else {
                setTaskGradesInput({})
            }
        }

        setStep(2)
    }

    // Confirm presence for selected student
    const handleConfirmPresence = async () => {
        if (!selectedStudent || !aula) return
        if (!isPresenceChecked) {
            alert('Por favor, marque a opção "Confirmar presença nesta aula".')
            return
        }

        setIsSaving(true)

        try {
            // 1. Upsert presence
            const { error: presError } = await supabase
                .from('presencas_tarefas')
                .upsert({
                    aula_id: aula.id,
                    aluno_id: selectedStudent.id,
                    presence: true,
                    presence_grade: aula.presence_max_grade || 0,
                }, { onConflict: 'aula_id,aluno_id' })

            if (presError) throw presError

            // 2. Auto-enroll student in materia_students
            const { error: enrollError } = await supabase
                .from('materia_students')
                .upsert({
                    materia_id: materiaId,
                    aluno_id: selectedStudent.id,
                }, { onConflict: 'materia_id,aluno_id' })

            if (enrollError) console.error('Error auto-enrolling student:', enrollError)

            // 3. Upsert task grades
            if (aulaTasks.length > 0) {
                const gradesToUpsert = aulaTasks.map(t => ({
                    task_id: t.id,
                    aluno_id: selectedStudent.id,
                    grade: taskGradesInput[t.id] ? Number(t.max_grade || 0) : 0
                }))

                const { error: gradesError } = await supabase
                    .from('student_task_grades')
                    .upsert(gradesToUpsert, { onConflict: 'task_id,aluno_id' })

                if (gradesError) throw gradesError
            }

            const studentName = `${selectedStudent.name || ''} ${selectedStudent.surname || ''}`.trim()
            if (onSuccess) onSuccess(studentName)

            onClose()
        } catch (err: any) {
            alert('Erro ao registrar presença: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const getInitials = (name?: string, surname?: string) => {
        const n = name?.trim().charAt(0) || ''
        const s = surname?.trim().charAt(0) || ''
        return (n + s).toUpperCase() || 'AL'
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            outsideCloseClick={true}
            bottomSheetOnMobile={true}
            className={`!p-6 sm:!p-8 ${step === 1 ? 'max-w-[680px]' : 'max-w-[560px]'} min-h-[60vh] sm:min-h-[480px] transition-all duration-300`}
        >
            <div className="flex flex-col gap-5 flex-1 h-full">
                {/* Step Indicator Bar */}
                <div className="flex items-center gap-1.5 justify-start">
                    <span
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            step === 1 ? 'w-6 bg-[#5C4E43]' : 'w-1.5 bg-[#D5C9BF]'
                        }`}
                    />
                    <span
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            step === 2 ? 'w-6 bg-[#5C4E43]' : 'w-1.5 bg-[#D5C9BF]'
                        }`}
                    />
                </div>

                {step === 1 ? (
                    /* Step 1: Encontrar Aluno */
                    <div className="flex flex-col gap-4 flex-1">
                        <label className="text-[12px] font-extrabold text-[#3A332C] uppercase tracking-wider">
                            ENCONTRAR ALUNO
                        </label>

                        {/* Search Input + Button */}
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex-1 min-w-0">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Digite o nome ou matrícula"
                                    containerClassName="bg-[#FFF9F8] border border-[#EBE2DA] rounded-[16px] !h-14 px-5 text-[#3A332C]"
                                    className="text-[15px] font-medium placeholder:text-[#A89C92]"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-[16px] bg-[#2C221E] text-white flex items-center justify-center hover:bg-[#42342E] transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
                                aria-label="Buscar aluno"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </button>
                        </div>

                        {/* Search Loading Container */}
                        {isSearching && (
                            <div className="bg-[#F5EFEB] rounded-[20px] p-8 mt-2 flex items-center justify-center min-h-[160px] flex-1">
                                <div className="w-9 h-9 rounded-full border-[3px] border-[#5C4E43] border-t-transparent animate-spin" />
                            </div>
                        )}

                        {/* Initial state placeholder when not yet searched */}
                        {!isSearching && !hasSearched && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-[#A89C92] gap-2 min-h-[160px]">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <p className="text-[13px] font-medium text-[#7E756D]">
                                    Digite o nome ou matrícula do aluno para buscar
                                </p>
                            </div>
                        )}

                        {/* Search Results List */}
                        {!isSearching && hasSearched && (
                            <div className="bg-[#F5EFEB] rounded-[20px] p-3.5 sm:p-4 mt-1 flex flex-col gap-2.5 max-h-[300px] overflow-y-auto">
                                {searchResults.length > 0 ? (
                                    searchResults.map((student) => {
                                        const tendaName = student.tendas?.name
                                        return (
                                            <div
                                                key={student.id}
                                                className="bg-[#EBE2DA] rounded-[16px] p-3.5 flex items-center justify-between gap-3 border border-[#E3D9CF]"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-full bg-[#F5EFEB] border border-[#DDD3CA] flex items-center justify-center font-bold text-[13px] text-[#2C221E] shrink-0 overflow-hidden">
                                                        {student.profile_image_url ? (
                                                            <img
                                                                src={student.profile_image_url}
                                                                alt={student.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span>{getInitials(student.name, student.surname)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[14px] sm:text-[15px] font-bold text-[#2C221E] truncate">
                                                            {student.name} {student.surname || ''}
                                                        </span>
                                                        <span className="text-[12px] text-[#7E756D] font-medium truncate">
                                                            Mat: {student.matricula || '---'}
                                                            {tendaName ? `  •  Tenda ${tendaName}` : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectStudent(student)}
                                                    className="w-10 h-10 rounded-[10px] bg-white border border-[#DDD3CA] flex items-center justify-center text-[#2C221E] hover:bg-[#FFF9F8] transition-colors cursor-pointer shrink-0"
                                                    title="Selecionar aluno"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M3.33334 8H12.6667M12.6667 8L8.00001 3.33334M12.6667 8L8.00001 12.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-6 text-[13px] text-[#7E756D] font-medium">
                                        Nenhum aluno encontrado com "{searchQuery}".
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Step 2: Confirm Presence for Selected Student */
                    <div className="flex flex-col gap-6">
                        {/* Selected Student Banner */}
                        {selectedStudent && (
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-full bg-[#F5EFEB] border border-[#DDD3CA] flex items-center justify-center font-bold text-[14px] text-[#2C221E] shrink-0 overflow-hidden">
                                    {selectedStudent.profile_image_url ? (
                                        <img
                                            src={selectedStudent.profile_image_url}
                                            alt={selectedStudent.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>{getInitials(selectedStudent.name, selectedStudent.surname)}</span>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h4 className="text-[15px] sm:text-[16px] font-extrabold text-[#2C221E] truncate">
                                        {selectedStudent.name} {selectedStudent.surname || ''}
                                    </h4>
                                    <span className="text-[12px] text-[#7E756D] font-medium truncate">
                                        Mat: {selectedStudent.matricula || '---'}
                                        {selectedStudent.tendas?.name ? `  •  Tenda ${selectedStudent.tendas.name}` : ''}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Section 1: PRESENÇA */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[12px] font-extrabold text-[#4D453E] tracking-wider uppercase">
                                PRESENÇA
                            </label>

                            <label className="flex items-center gap-3.5 bg-[#FFF9F8] border border-dashed border-[#E5DCD5] rounded-[18px] p-4 sm:p-5 cursor-pointer select-none hover:border-[#D5C9BF] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isPresenceChecked}
                                    onChange={(e) => setIsPresenceChecked(e.target.checked)}
                                    className="w-5 h-5 rounded-[6px] accent-[#38302A] cursor-pointer"
                                />
                                <span className="text-[15px] font-bold text-[#2C221E]">
                                    Confirmar presença nesta aula
                                </span>
                            </label>
                        </div>

                        {/* Section 2: TAREFAS/ATIVIDADES */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#4D453E] tracking-wider uppercase">
                                <span>TAREFAS/ATIVIDADES</span>
                            </div>

                            {aulaTasks.length > 0 ? (
                                <div className="flex flex-col gap-2.5">
                                    {aulaTasks.map((task) => (
                                        <label
                                            key={task.id}
                                            className="flex items-center gap-3.5 bg-[#FFF9F8] border border-dashed border-[#E5DCD5] rounded-[18px] p-4 sm:p-5 cursor-pointer select-none hover:border-[#D5C9BF] transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={taskGradesInput[task.id] || false}
                                                onChange={(e) => {
                                                    setTaskGradesInput((prev) => ({
                                                        ...prev,
                                                        [task.id]: e.target.checked,
                                                    }))
                                                }}
                                                className="w-5 h-5 rounded-[6px] accent-[#38302A] cursor-pointer"
                                            />
                                            <span className="text-[15px] font-bold text-[#2C221E] flex-1">
                                                {task.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#FFF9F8] border border-dashed border-[#E5DCD5] rounded-[18px] p-4 text-[13px] text-[#8C7A6B] italic text-center">
                                    Nenhuma tarefa associada a esta aula.
                                </div>
                            )}
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex items-center gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 h-12 rounded-[12px] border border-[#C5BCB5] bg-white text-[#38302A] text-[15px] font-bold hover:bg-[#FFF9F8] transition-colors cursor-pointer flex items-center justify-center"
                            >
                                Voltar
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmPresence}
                                disabled={isSaving || !isPresenceChecked}
                                className="flex-1 h-12 rounded-[12px] bg-[#2C221E] text-white text-[15px] font-bold hover:bg-[#42342E] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span>{isSaving ? 'Confirmando...' : 'Confirmar'}</span>
                                {!isSaving && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3.33334 8H12.6667M12.6667 8L8.00001 3.33334M12.6667 8L8.00001 12.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default AdminPresenceModal
