'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'
import { getMateriaStatus, calculateMateriaProgress } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import SegmentedControl from '@/components/ui/SegmentedControl'
import MateriaCard from '@/components/ui/MateriaCard'
import CreateMateriaModal from '@/components/modals/CreateMateriaModal'
import { useAuthStore } from '@/store/useAuthStore'

export default function MateriasPage() {
    const { profile: storedProfile } = useAuthStore()
    const [profile, setProfile] = useState<Profile | null>(storedProfile)
    const [materias, setMaterias] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'EM_ANDAMENTO' | 'FINALIZADO'>('ALL')
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (storedProfile) {
            setProfile(storedProfile)
        }
    }, [storedProfile])

    const fetchData = async () => {
        setLoading(true)

        let activeProfile = storedProfile || profile
        if (!activeProfile) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (!profileData) {
                setLoading(false)
                return
            }

            activeProfile = profileData
            setProfile(profileData)
            useAuthStore.getState().setProfile(profileData)
        }

        if (!activeProfile) {
            setLoading(false)
            return
        }

        const isAdmin = activeProfile.role.includes('ADMIN')
        const isAluno = activeProfile.role.includes('ALUNO')

        const { data: allMaterias } = await supabase
            .from('materias')
            .select(`
                *,
                materia_students(aluno_id),
                materia_professors(
                    professor_id,
                    profiles:professor_id(id, name, surname)
                ),
                aulas(id, date, tasks_count, is_last_aula, presence_time_ranges)
            `)
            .order('created_at', { ascending: false })

        if (allMaterias) {
            let presencas: any[] = []
            let studentGrades: any[] = []
            let allAulaTasks: any[] = []
            let allAulas: any[] = []
            let finalExams: any[] = []

            if (isAluno) {
                const { data: pData } = await supabase.from('presencas_tarefas').select('*').eq('aluno_id', activeProfile.id)
                const { data: gData } = await supabase.from('student_task_grades').select('*').eq('aluno_id', activeProfile.id)
                const { data: tData } = await supabase.from('aula_tasks').select('id, aula_id, max_grade')
                const { data: aData } = await supabase.from('aulas').select('id, materia_id, presence_max_grade')
                const { data: fData } = await supabase.from('notas_finais').select('*').eq('aluno_id', activeProfile.id)

                presencas = pData || []
                studentGrades = gData || []
                allAulaTasks = tData || []
                allAulas = aData || []
                finalExams = fData || []
            }

            const processedMaterias = allMaterias.map(m => {
                const status = getMateriaStatus(m.start_date, m.end_date)
                const isEnrolled = m.materia_students?.some((s: any) => s.aluno_id === activeProfile.id)
                const isTeaching = m.materia_professors?.some((p: any) => p.professor_id === activeProfile.id)
                const aulasCount = m.aulas?.length || 0

                let progress = 0
                let isApproved = false

                const isViewingAsAdminOrProf = isAdmin || isTeaching || (!isAluno && activeProfile.role.includes('PROFESSOR'))

                if (isViewingAsAdminOrProf) {
                    progress = calculateMateriaProgress({
                        ...m,
                        status,
                        aulas: m.aulas || []
                    })
                } else if (isAluno) {
                    let totalPoints = 0
                    let pointsAcquired = 0
                    m.aulas?.forEach((aula: any) => {
                        totalPoints += 1 + (aula.tasks_count || 0)
                        const p = presencas.find(pr => pr.aula_id === aula.id)
                        if (p) {
                            pointsAcquired += (p.presence ? 1 : 0)
                            if (p.tasks_completed && Array.isArray(p.tasks_completed)) {
                                pointsAcquired += p.tasks_completed.filter(Boolean).length
                            }
                        }
                    })
                    progress = totalPoints > 0 ? Math.round((pointsAcquired / totalPoints) * 100) : (status === 'FINALIZADO' ? 100 : 0)

                    const materiaAulas = allAulas.filter(a => a.materia_id === m.id)
                    const aulaIds = materiaAulas.map(a => a.id)
                    const materiaTasks = allAulaTasks.filter(t => aulaIds.includes(t.aula_id))

                    const tasksEarned = studentGrades.filter(g => materiaTasks.some(mt => mt.id === g.task_id))
                        .reduce((acc, g) => acc + Number(g.grade), 0)

                    const maxPresence = Number(m.presence_max_grade || 0)
                    const attendedAulas = presencas.filter(p => aulaIds.includes(p.aula_id) && p.presence === true).length
                    const presenceEarned = materiaAulas.length > 0 ? (attendedAulas / materiaAulas.length) * maxPresence : 0

                    const finalExamEntry = finalExams.find(f => f.materia_id === m.id)

                    let totalGradeRaw = 0
                    if (finalExamEntry && finalExamEntry.total_grade !== null) {
                        totalGradeRaw = Number(finalExamEntry.total_grade || 0)
                    } else {
                        totalGradeRaw = tasksEarned + presenceEarned
                    }
                    isApproved = totalGradeRaw >= (m.min_grade || 7)
                } else {
                    progress = calculateMateriaProgress({
                        ...m,
                        status,
                        aulas: m.aulas || []
                    })
                }

                return {
                    ...m,
                    status,
                    is_enrolled: isEnrolled,
                    is_teaching: isTeaching,
                    aulasCount,
                    progress,
                    is_approved: isApproved
                }
            })

            setMaterias(processedMaterias)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])


    const toggleMateriaActive = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
        e.preventDefault()
        e.stopPropagation()

        const { error } = await supabase
            .from('materias')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) {
            alert('Erro ao atualizar status da matéria')
        } else {
            setMaterias(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m))
        }
    }

    if (loading) return (
        <NavLayout>
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
                <Skeleton width="100%" height="48px" style={{ borderRadius: '12px', maxWidth: '500px' }} />
                <Skeleton width="280px" height="48px" style={{ borderRadius: '10px' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} width="100%" height="180px" style={{ borderRadius: '12px' }} />
                ))}
            </div>
        </NavLayout>
    )

    const isAdmin = profile?.role?.includes('ADMIN')
    const isAluno = profile?.role?.includes('ALUNO') && !isAdmin

    const roleFilteredMaterias = materias.filter(m => {
        if (isAdmin) return true
        if (isAluno) return m.is_enrolled && m.is_active
        return m.is_active
    })

    const searchLower = search.toLowerCase().trim()
    const searchFiltered = roleFilteredMaterias.filter(m => {
        if (!searchLower) return true
        const nameMatch = m.name?.toLowerCase().includes(searchLower)
        const profMatch = m.materia_professors?.some((mp: any) => {
            const fullName = `${mp.profiles?.name || ''} ${mp.profiles?.surname || ''}`.toLowerCase()
            return fullName.includes(searchLower)
        })
        return nameMatch || profMatch
    })

    const countTodas = searchFiltered.length
    const countEmAndamento = searchFiltered.filter(m => m.status !== 'FINALIZADO').length
    const countConcluidas = searchFiltered.filter(m => m.status === 'FINALIZADO').length

    const inProgressMaterias = searchFiltered.filter(m => m.status !== 'FINALIZADO')
    const finalizedMaterias = searchFiltered.filter(m => m.status === 'FINALIZADO')

    return (
        <NavLayout>
            {/* Top Control Bar: Search Input & Segmented Control */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
                {/* Search Input using generic UI Input */}
                <div className="flex-1 max-w-xl">
                    <Input
                        type="text"
                        placeholder="Buscar por título, professor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={
                            <Image
                                src="/icons/commons/search-icon.svg"
                                alt="Search"
                                width={20}
                                height={20}
                                className="flex-shrink-0 opacity-70 lg:opacity-100"
                            />
                        }
                        containerClassName="border border-[#DFD8CE] shadow-sm focus-within:border-[#38302A] h-[48px]"
                        containerStyle={{ borderRadius: '12px' }}
                    />
                </div>

                {/* Segmented Control using generic UI SegmentedControl */}
                <SegmentedControl<'ALL' | 'EM_ANDAMENTO' | 'FINALIZADO'>
                    options={[
                        { key: 'ALL', label: 'Todas', count: countTodas },
                        { key: 'EM_ANDAMENTO', label: 'Em Andamento', count: countEmAndamento },
                        { key: 'FINALIZADO', label: 'Concluídas', count: countConcluidas },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="w-full lg:w-auto self-stretch lg:self-auto"
                />
            </div>

            {/* Admin: Nova Matéria button */}
            {isAdmin && (
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full lg:w-auto inline-flex items-center justify-center bg-[#38302A] text-white font-semibold text-[14px] px-8 py-3 rounded-[8px] hover:bg-brown-400 transition-colors shadow-sm cursor-pointer"
                    >
                        Nova Matéria
                    </button>
                </div>
            )}

            {/* Section: Matérias em andamento */}
            {(statusFilter === 'ALL' || statusFilter === 'EM_ANDAMENTO') && (
                <section className="mb-10">
                    <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-[#DED7CC]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block"></span>
                        <h2 className="text-[#3A332C] text-[16px] lg:text-[18px] font-bold">Matérias em andamento</h2>
                        <span className="bg-[#8898AA]/50 text-[#2563EB] text-[11px] lg:text-[12px] font-semibold px-2.5 py-0.5 rounded-full ml-1">
                            {inProgressMaterias.length} {inProgressMaterias.length === 1 ? 'matéria' : 'matérias'}
                        </span>
                    </div>

                    {inProgressMaterias.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inProgressMaterias.map((materia) => (
                                <MateriaCard
                                    key={materia.id}
                                    materia={materia}
                                    aulasCount={materia.aulasCount || 0}
                                    showProgress={true}
                                    progress={materia.progress || 0}
                                    topBadge={
                                        isAdmin ? (
                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${materia.is_active ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                                                    {materia.is_active ? 'Ativada' : 'Desativada'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleMateriaActive(e, materia.id, materia.is_active)}
                                                    className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center shadow-sm hover:bg-[#F5F0EB] transition-colors"
                                                    title={materia.is_active ? "Desativar Matéria" : "Ativar Matéria"}
                                                >
                                                    <Image
                                                        src={materia.is_active ? '/icons/commons/open-eye-icon.svg' : '/icons/commons/close-eye-icon.svg'}
                                                        alt={materia.is_active ? 'Ativada' : 'Desativada'}
                                                        width={16}
                                                        height={16}
                                                    />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-[6px] px-2.5 py-1 shadow-sm">
                                                <span className="text-[11px] font-medium text-[#4D453E]">
                                                    {materia.aulasCount || 0} {(materia.aulasCount || 0) === 1 ? 'aula' : 'aulas'}
                                                </span>
                                            </div>
                                        )
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#8C7A6B] text-[14px]">Nenhuma matéria em andamento encontrada.</p>
                    )}
                </section>
            )}

            {/* Section: Matérias finalizadas */}
            {(statusFilter === 'ALL' || statusFilter === 'FINALIZADO') && (
                <section className="mb-10">
                    <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-[#DED7CC]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block"></span>
                        <h2 className="text-[#3A332C] text-[16px] lg:text-[18px] font-bold">Matérias finalizadas</h2>
                        <span className="bg-[#D1FAE5] text-[#065F46] text-[11px] lg:text-[12px] font-semibold px-2.5 py-0.5 rounded-full ml-1">
                            {finalizedMaterias.length} finalizadas
                        </span>
                    </div>

                    {finalizedMaterias.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {finalizedMaterias.map((materia) => (
                                <MateriaCard
                                    key={materia.id}
                                    materia={materia}
                                    aulasCount={materia.aulasCount || 0}
                                    showProgress={true}
                                    progress={materia.progress || 0}
                                    topBadge={
                                        isAdmin ? (
                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${materia.is_active ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                                                    {materia.is_active ? 'Ativada' : 'Desativada'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleMateriaActive(e, materia.id, materia.is_active)}
                                                    className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center shadow-sm hover:bg-[#F5F0EB] transition-colors"
                                                    title={materia.is_active ? "Desativar Matéria" : "Ativar Matéria"}
                                                >
                                                    <Image
                                                        src={materia.is_active ? '/icons/commons/open-eye-icon.svg' : '/icons/commons/close-eye-icon.svg'}
                                                        alt={materia.is_active ? 'Ativada' : 'Desativada'}
                                                        width={16}
                                                        height={16}
                                                    />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-[6px] px-2.5 py-1 shadow-sm">
                                                <span className={`text-[11px] font-bold ${materia.is_enrolled === false
                                                    ? 'text-[#7E756D]'
                                                    : materia.is_approved ? 'text-[#059669]' : 'text-[#E05E5A]'
                                                    }`}>
                                                    {materia.is_enrolled === false
                                                        ? 'Não Matriculado'
                                                        : materia.is_approved ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            </div>
                                        )
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#8C7A6B] text-[14px]">Nenhuma matéria finalizada encontrada.</p>
                    )}
                </section>
            )}

            {/* Create Materia Modal */}
            <CreateMateriaModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
            />
        </NavLayout>
    )
}
