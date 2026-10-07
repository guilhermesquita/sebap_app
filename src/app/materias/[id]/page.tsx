'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia, Aula, PresencaTarefa, StudentTaskGrade, AulaTask } from '@/types/database'
import { getMateriaStatus } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search } from 'lucide-react'

import MateryIcon from '@/components/ui/MateryIcon'
import MateriaBanner from '@/components/materia/MateriaBanner'
import AulaCard from '@/components/materia/AulaCard'
import InformacoesGeraisCard from '@/components/materia/InformacoesGeraisCard'
import ProfessoresCard from '@/components/materia/ProfessoresCard'
import MinhasNotasCard from '@/components/materia/MinhasNotasCard'
import CreateOrEditMaterialModal from '@/components/modals/CreateOrEditMaterialModal'

export default function MateriaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [aulas, setAulas] = useState<Aula[]>([])
    const [presencas, setPresencas] = useState<PresencaTarefa[]>([])
    const [professors, setProfessors] = useState<Profile[]>([])
    const [isProfessorOfSubject, setIsProfessorOfSubject] = useState(false)
    const [isEnrolled, setIsEnrolled] = useState(false)
    const [enrollLoading, setEnrollLoading] = useState(false)
    const [loading, setLoading] = useState(true)

    // Edit Materia Modal
    const [isEditMateriaModalOpen, setIsEditMateriaModalOpen] = useState(false)

    // Delete Aula Modal States
    const [aulaToDelete, setAulaToDelete] = useState<Aula | null>(null)
    const [aulaDeleteInput, setAulaDeleteInput] = useState('')
    const [isDeletingAula, setIsDeletingAula] = useState(false)

    // Remove Professor Modal States
    const [professorToRemove, setProfessorToRemove] = useState<Profile | null>(null)
    const [isRemovingProfessor, setIsRemovingProfessor] = useState(false)

    // Sorting state
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

    // Professor Management States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Student grades states
    const [studentTaskGrades, setStudentTaskGrades] = useState<StudentTaskGrade[]>([])
    const [allTasks, setAllTasks] = useState<AulaTask[]>([])
    const [finalExamGrade, setFinalExamGrade] = useState<number | null>(null)
    const [submittingPresence, setSubmittingPresence] = useState<string | null>(null)

    // Student presence modal
    const [presenceModalOpen, setPresenceModalOpen] = useState(false)
    const [presenceAula, setPresenceAula] = useState<Aula | null>(null)
    const [previousTasksForPresence, setPreviousTasksForPresence] = useState<AulaTask[]>([])
    const [studentTaskGradesInput, setStudentTaskGradesInput] = useState<{ [taskId: string]: boolean }>({})
    const [studentFinalGradeInput, setStudentFinalGradeInput] = useState<number>(0)

    const fetchProfessors = async () => {
        const { data: profs } = await supabase
            .from('materia_professors')
            .select('profiles(*)')
            .eq('materia_id', id)

        if (profs) {
            const profData = profs.map((p: any) => p.profiles) as Profile[]
            setProfessors(profData)
            const { data: { user } } = await supabase.auth.getUser()
            if (user && profData.some(p => p.id === user.id)) {
                setIsProfessorOfSubject(true)
            }
        }
    }

    const fetchMateriaData = async () => {
        const { data: materiaData } = await supabase
            .from('materias')
            .select('*')
            .eq('id', id)
            .single()

        if (materiaData) {
            materiaData.status = getMateriaStatus(materiaData.start_date, materiaData.end_date)
            setMateria(materiaData)
        }
    }

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            setProfile(profileData)

            // Check Enrollment
            const { data: enrollment } = await supabase
                .from('materia_students')
                .select('*')
                .eq('materia_id', id)
                .eq('aluno_id', user.id)
                .maybeSingle()
            setIsEnrolled(!!enrollment)

            // Fetch Materia
            await fetchMateriaData()
            await fetchProfessors()

            // Fetch Aulas
            const { data: aulasData } = await supabase
                .from('aulas')
                .select('*')
                .eq('materia_id', id)
                .order('aula_number', { ascending: true })
            setAulas(aulasData || [])

            // Fetch Tasks, Presencas, Task Grades, and Final Exam Grade for user
            if (aulasData && aulasData.length > 0) {
                const aulaIds = aulasData.map(a => a.id)

                // Fetch Tasks
                const { data: tasksData } = await supabase
                    .from('aula_tasks')
                    .select('*')
                    .in('aula_id', aulaIds)
                setAllTasks(tasksData || [])

                // Fetch Presencas for student
                const { data: presData } = await supabase
                    .from('presencas_tarefas')
                    .select('*')
                    .eq('aluno_id', user.id)
                    .in('aula_id', aulaIds)
                setPresencas(presData || [])

                // Fetch Task Grades for student
                if (tasksData && tasksData.length > 0) {
                    const taskIds = tasksData.map(t => t.id)
                    const { data: gradesData } = await supabase
                        .from('student_task_grades')
                        .select('*')
                        .eq('aluno_id', user.id)
                        .in('task_id', taskIds)
                    setStudentTaskGrades(gradesData || [])
                } else {
                    setStudentTaskGrades([])
                }
            } else {
                setAllTasks([])
                setPresencas([])
                setStudentTaskGrades([])
            }

            // Fetch Final Exam Grade for student
            const { data: finalData } = await supabase
                .from('notas_finais')
                .select('final_exam_grade')
                .eq('materia_id', id)
                .eq('aluno_id', user.id)
                .maybeSingle()

            if (finalData && finalData.final_exam_grade !== null && finalData.final_exam_grade !== undefined) {
                setFinalExamGrade(Number(finalData.final_exam_grade))
            } else {
                setFinalExamGrade(null)
            }

            setLoading(false)
        }
        fetchData()
    }, [id])

    const searchProfessors = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 3) {
            setSearchResults([])
            return
        }

        setIsSearching(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .contains('role', ['PROFESSOR'])
            .or(`name.ilike.%${query}%,surname.ilike.%${query}%,matricula.ilike.%${query}%`)
            .limit(5)

        setSearchResults(data || [])
        setIsSearching(false)
    }

    const addProfessor = async (professorId: string) => {
        const { error } = await supabase
            .from('materia_professors')
            .insert({
                materia_id: id,
                professor_id: professorId
            })

        if (error) {
            alert('Erro ao adicionar professor: ' + error.message)
        } else {
            await fetchProfessors()
            setIsModalOpen(false)
            setSearchQuery('')
            setSearchResults([])
        }
    }

    const confirmRemoveProfessor = async () => {
        if (!professorToRemove) return
        setIsRemovingProfessor(true)

        const { error } = await supabase
            .from('materia_professors')
            .delete()
            .eq('materia_id', id)
            .eq('professor_id', professorToRemove.id)

        if (error) {
            alert('Erro ao remover professor: ' + error.message)
        } else {
            await fetchProfessors()
            setProfessorToRemove(null)
        }
        setIsRemovingProfessor(false)
    }

    const confirmDeleteAula = async () => {
        if (!aulaToDelete) return
        setIsDeletingAula(true)

        const { error } = await supabase.from('aulas').delete().eq('id', aulaToDelete.id)
        if (error) {
            alert('Erro ao deletar aula: ' + error.message)
        } else {
            setAulas(prev => prev.filter(a => a.id !== aulaToDelete.id))
            setAulaToDelete(null)
            setAulaDeleteInput('')
        }
        setIsDeletingAula(false)
    }

    const openPresenceModal = (aula: Aula) => {
        setPresenceAula(aula)
        const currentIndex = aulas.findIndex(a => a.id === aula.id)
        const prevAula = currentIndex > 0 ? aulas[currentIndex - 1] : null

        if (prevAula) {
            const tasks = allTasks.filter(t => t.aula_id === prevAula.id)
            setPreviousTasksForPresence(tasks)
            const initialGrades: { [key: string]: boolean } = {}
            tasks.forEach(t => initialGrades[t.id] = false)
            setStudentTaskGradesInput(initialGrades)
        } else {
            setPreviousTasksForPresence([])
            setStudentTaskGradesInput({})
        }

        setStudentFinalGradeInput(0)
        setPresenceModalOpen(true)
    }

    const confirmPresence = async () => {
        if (!profile || !presenceAula) return
        setSubmittingPresence(presenceAula.id)

        try {
            const { error: presError } = await supabase
                .from('presencas_tarefas')
                .upsert({
                    aula_id: presenceAula.id,
                    aluno_id: profile.id,
                    presence: true,
                    presence_grade: presenceAula.presence_max_grade || 0,
                }, { onConflict: 'aula_id,aluno_id' })

            if (presError) throw presError

            if (previousTasksForPresence.length > 0) {
                const gradesToUpsert = previousTasksForPresence.map(t => ({
                    task_id: t.id,
                    aluno_id: profile.id,
                    grade: studentTaskGradesInput[t.id] ? t.max_grade : 0
                }))

                const { error: gradesError } = await supabase
                    .from('student_task_grades')
                    .upsert(gradesToUpsert, { onConflict: 'task_id,aluno_id' })

                if (gradesError) throw gradesError
            }

            if (presenceAula.is_last_aula && materia?.has_final_exam) {
                const { error: gradeError } = await supabase
                    .from('notas_finais')
                    .upsert({
                        materia_id: id,
                        aluno_id: profile.id,
                        final_exam_grade: studentFinalGradeInput,
                    }, { onConflict: 'materia_id,aluno_id' })

                if (gradeError) throw gradeError
            }

            alert('Presença e notas confirmadas com sucesso!')
            window.location.reload()
        } catch (err: any) {
            alert('Erro ao dar presença/notas: ' + err.message)
        } finally {
            setSubmittingPresence(null)
            setPresenceModalOpen(false)
            setPresenceAula(null)
        }
    }

    if (loading) {
        return (
            <NavLayout>
                <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
                    <Skeleton className="w-full h-[280px] rounded-[24px]" />
                    <Skeleton className="w-full h-[60px] rounded-[16px]" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <Skeleton className="w-full h-[180px] rounded-[20px]" />
                            <Skeleton className="w-full h-[180px] rounded-[20px]" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <Skeleton className="w-full h-[220px] rounded-[20px]" />
                            <Skeleton className="w-full h-[180px] rounded-[20px]" />
                        </div>
                    </div>
                </div>
            </NavLayout>
        )
    }

    if (!materia) {
        return (
            <NavLayout>
                <div className="p-8 text-center text-[#3A332C] font-bold text-lg">
                    Matéria não encontrada.
                </div>
            </NavLayout>
        )
    }

    // Role checks & View Mode determination (strictly based on user role)
    const isAdminView = !!(profile?.role?.includes('ADMIN') || isProfessorOfSubject)

    // Grade Calculations for Student view
    const totalTasksPossibleNum = allTasks.reduce((acc, t) => acc + Number(t.max_grade || 0), 0)

    const materiaPresenceMax = Number(materia.presence_max_grade || 0)
    const aulasPresenceSum = aulas.reduce((acc, a) => acc + Number(a.presence_max_grade || 0), 0)
    const totalPresencePossibleNum = materiaPresenceMax > 0 ? materiaPresenceMax : aulasPresenceSum

    // Task grades earned by student
    const totalTasksEarned = studentTaskGrades.reduce((acc, g) => acc + Number(g.grade || 0), 0)

    // Presencas earned by student
    const studentPresencasTrue = presencas.filter(p => p.presence === true)
    let totalPresenceEarned = 0
    if (aulas.length > 0) {
        const sumPresenceGrades = studentPresencasTrue.reduce((acc, p) => acc + Number(p.presence_grade || 0), 0)
        if (sumPresenceGrades > 0) {
            totalPresenceEarned = sumPresenceGrades
        } else {
            totalPresenceEarned = (studentPresencasTrue.length / aulas.length) * totalPresencePossibleNum
        }
    }
    totalPresenceEarned = Math.min(totalPresencePossibleNum, Math.max(0, totalPresenceEarned))

    const hasFinalExam = !!materia.has_final_exam
    const finalExamRaw = finalExamGrade !== null && finalExamGrade !== undefined ? Number(finalExamGrade) : 0
    const tookFinalExam = finalExamGrade !== null && finalExamGrade !== undefined
    const finalExamMax = Number(materia.final_exam_max_grade) || 10.0
    const materiaMaxGrade = Number(materia.max_grade) || 10.0

    const rawMaxTotal = totalTasksPossibleNum + totalPresencePossibleNum + (hasFinalExam ? finalExamMax : 0)
    const rawEarnedTotal = totalTasksEarned + totalPresenceEarned + (hasFinalExam && tookFinalExam ? finalExamRaw : 0)

    let finalGradeTotal = 0
    if (rawMaxTotal > 0) {
        finalGradeTotal = (rawEarnedTotal / rawMaxTotal) * materiaMaxGrade
    } else {
        finalGradeTotal = rawEarnedTotal
    }
    finalGradeTotal = Math.min(materiaMaxGrade, Math.max(0, finalGradeTotal))

    let studentStatusFinal: 'Aprovado' | 'Reprovado' | 'Em Andamento' = 'Em Andamento'
    if (finalGradeTotal >= (materia.min_grade || 6.0)) {
        studentStatusFinal = 'Aprovado'
    } else if (materia.status === 'FINALIZADO') {
        studentStatusFinal = 'Reprovado'
    } else {
        studentStatusFinal = 'Em Andamento'
    }

    const sortedAulas = [...aulas].sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.aula_number - b.aula_number
        } else {
            return b.aula_number - a.aula_number
        }
    })

    const formattedAulaNum = aulaToDelete ? String(aulaToDelete.aula_number).padStart(2, '0') : ''
    const expectedAulaConfirmText = `AULA ${formattedAulaNum}`
    const isDeleteAulaConfirmed = aulaToDelete
        ? (aulaDeleteInput.trim().toUpperCase() === expectedAulaConfirmText ||
            aulaDeleteInput.trim().toUpperCase() === `AULA ${aulaToDelete.aula_number}`)
        : false

    return (
        <NavLayout>
            <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
                {/* Banner Section */}
                <MateriaBanner
                    materia={materia}
                    isAdmin={isAdminView}
                    onEdit={isAdminView ? () => setIsEditMateriaModalOpen(true) : undefined}
                    onNewAula={isAdminView ? () => router.push(`/materias/${id}/nova-aula`) : undefined}
                    onVerNotas={isAdminView ? () => router.push(`/materias/${id}/notas`) : undefined}
                />

                {/* Aulas Section */}
                <section className="flex flex-col gap-5">
                    {/* Aulas Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[22px] font-extrabold text-[#3A332C] tracking-tight">
                                Aulas
                            </h2>
                            <span className="px-3 py-1 rounded-full bg-[#EDE6DE] text-[#3A332C] text-[12px] font-bold">
                                {aulas.length} {aulas.length === 1 ? 'Aula Registrada' : 'Aulas Registradas'}
                            </span>
                        </div>

                        {/* Interactive Sort Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className="px-3.5 py-2 rounded-[12px] bg-white border border-[#EDE6DE] text-[#4D453E] text-[13px] font-bold flex items-center gap-2 hover:bg-[#FFF8F6] active:scale-98 transition-all cursor-pointer shadow-2xs"
                            >
                                <MateryIcon name="filter" size={14} color="#4D453E" />
                                <span>{sortOrder === 'asc' ? 'Ordem Cronológica' : 'Mais Recentes'}</span>
                                <svg
                                    width="10"
                                    height="6"
                                    viewBox="0 0 10 6"
                                    fill="none"
                                    className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`}
                                >
                                    <path d="M1 1L5 5L9 1" stroke="#4D453E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {isSortMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsSortMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#EDE6DE] rounded-[14px] shadow-lg z-20 overflow-hidden py-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSortOrder('asc')
                                                setIsSortMenuOpen(false)
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold flex items-center justify-between hover:bg-[#FFF8F6] transition-colors cursor-pointer ${sortOrder === 'asc' ? 'text-[#38302A] bg-[#FFF8F6]' : 'text-[#7E756D]'
                                                }`}
                                        >
                                            <span>Ordem Cronológica</span>
                                            {sortOrder === 'asc' && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#38302A]" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSortOrder('desc')
                                                setIsSortMenuOpen(false)
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold flex items-center justify-between hover:bg-[#FFF8F6] transition-colors cursor-pointer ${sortOrder === 'desc' ? 'text-[#38302A] bg-[#FFF8F6]' : 'text-[#7E756D]'
                                                }`}
                                        >
                                            <span>Mais Recentes</span>
                                            {sortOrder === 'desc' && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#38302A]" />
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Aulas Cards List */}
                    <div className="flex flex-col gap-4">
                        {sortedAulas.length > 0 ? (
                            sortedAulas.map((aula: Aula) => {
                                const aulaTasks = allTasks.filter((t) => t.aula_id === aula.id)

                                return (
                                    <AulaCard
                                        key={aula.id}
                                        aula={aula}
                                        isAdmin={isAdminView}
                                        tasks={aulaTasks}
                                        presencas={presencas}
                                        currentUserId={profile?.id}
                                        onEditAula={(a) => router.push(`/materias/${id}/aulas/${a.id}/editar`)}
                                        onDeleteAula={(aula) => {
                                            setAulaToDelete(aula)
                                            setAulaDeleteInput('')
                                        }}
                                        onVerLista={(a) => router.push(`/materias/${id}/aulas/${a.id}/lista-presenca`)}
                                        onLancarPresenca={
                                            isAdminView
                                                ? (a) => router.push(`/materias/${id}/aulas/${a.id}/presenca`)
                                                : openPresenceModal
                                        }
                                        onAnexarNota={(a) => router.push(`/materias/${id}/aulas/${a.id}/editar`)}
                                    />
                                )
                            })
                        ) : (
                            <div className="bg-white rounded-[20px] p-8 text-center text-[#7E756D] border border-[#EDE6DE]">
                                Nenhuma aula registrada nesta matéria ainda.
                            </div>
                        )}
                    </div>
                </section>

                {/* Bottom Two Columns Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {isAdminView ? (
                        <>
                            {/* Admin View: Left = Informações Gerais, Right = Professores */}
                            <InformacoesGeraisCard materia={materia} averageGrade={84} />
                            <ProfessoresCard
                                professors={professors}
                                isAdmin={isAdminView}
                                onAddProfessor={() => setIsModalOpen(true)}
                                onRemoveProfessor={(prof) => setProfessorToRemove(prof)}
                            />
                        </>
                    ) : (
                        <>
                            {/* Student View: Left = Professores, Right = Minhas Notas */}
                            <ProfessoresCard professors={professors} />
                            <MinhasNotasCard
                                totalGrade={finalGradeTotal}
                                maxTotalGrade={materiaMaxGrade}
                                tarefasGrade={totalTasksEarned}
                                maxTarefasGrade={totalTasksPossibleNum}
                                presencasGrade={totalPresenceEarned}
                                maxPresencasGrade={totalPresencePossibleNum}
                                hasFinalExam={hasFinalExam}
                                provaFinalGrade={finalExamRaw}
                                maxProvaFinalGrade={finalExamMax}
                                statusFinal={studentStatusFinal}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Modal Editar Matéria (CreateOrEditMaterialModal) */}
            <CreateOrEditMaterialModal
                isOpen={isEditMateriaModalOpen}
                onClose={() => setIsEditMateriaModalOpen(false)}
                initialData={materia}
                onSuccess={() => {
                    fetchMateriaData()
                }}
            />

            {/* Modal Adicionar Professor */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSearchQuery('')
                    setSearchResults([])
                }}
                outsideCloseClick={true}
                title="Adicionar Professor"
            >
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-[#FFF8F6] border border-[#EDE6DE] rounded-[12px] px-4 py-3 text-[#3A332C] text-[14px] outline-none focus:border-[#38302A]"
                            placeholder="Buscar por nome ou matrícula..."
                            value={searchQuery}
                            onChange={(e) => searchProfessors(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                        {isSearching ? (
                            <p className="text-[13px] text-[#7E756D] text-center py-4">Buscando...</p>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(result => {
                                const isAlreadyAdded = professors.some(p => p.id === result.id)
                                return (
                                    <div key={result.id} className="bg-[#FFF8F6] rounded-[12px] p-3 flex items-center justify-between border border-[#EDE6DE]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-[#EDE6DE] overflow-hidden bg-[#EDE6DE] flex items-center justify-center shrink-0 font-bold text-[#3A332C] text-[13px]">
                                                {result.profile_image_url ? (
                                                    <img
                                                        src={result.profile_image_url}
                                                        alt={`${result.name} ${result.surname || ''}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>
                                                        {result.name?.charAt(0).toUpperCase() || 'P'}
                                                        {result.surname?.charAt(0).toUpperCase() || ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-[#3A332C]">{result.name} {result.surname}</span>
                                                <span className="text-[11px] text-[#8C7A6B]">Matrícula: {result.matricula}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isAlreadyAdded}
                                            onClick={() => addProfessor(result.id)}
                                            className="px-3 py-1.5 rounded-[8px] bg-[#38302A] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#52453B] transition-colors cursor-pointer shrink-0"
                                        >
                                            {isAlreadyAdded ? 'Já Adicionado' : 'Adicionar'}
                                        </button>
                                    </div>
                                )
                            })
                        ) : searchQuery.length >= 3 ? (
                            <p className="text-[13px] text-[#7E756D] text-center py-4">Nenhum professor encontrado.</p>
                        ) : (
                            <p className="text-[13px] text-[#7E756D] text-center py-4">Digite pelo menos 3 caracteres.</p>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Lançar Presença Aluno */}
            <Modal
                isOpen={presenceModalOpen}
                onClose={() => {
                    setPresenceModalOpen(false)
                    setPresenceAula(null)
                }}
                outsideCloseClick={true}
                title={`Registrar Presença - AULA ${presenceAula?.aula_number}`}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-[#7E756D] text-[13px]">
                        Ao confirmar a presença, garanta também marcar as tarefas que você executou.
                    </p>

                    {presenceAula && aulas.findIndex(a => a.id === presenceAula.id) > 0 && (
                        <div className="flex flex-col gap-3">
                            <h4 className="font-bold text-[#3A332C] text-[14px]">
                                Lançar Tarefas da Aula Anterior (Aula {aulas[aulas.findIndex(a => a.id === presenceAula.id) - 1]?.aula_number})
                            </h4>
                            {previousTasksForPresence.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {previousTasksForPresence.map(task => (
                                        <label key={task.id} className="flex justify-between items-center bg-[#FFF8F6] p-3 rounded-[12px] border border-[#EDE6DE] cursor-pointer select-none">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={studentTaskGradesInput[task.id] || false}
                                                    onChange={e => {
                                                        setStudentTaskGradesInput(prev => ({ ...prev, [task.id]: e.target.checked }))
                                                    }}
                                                    className="w-5 h-5 accent-[#38302A] cursor-pointer"
                                                />
                                                <span className="font-bold text-[#3A332C] text-[13px]">{task.name}</span>
                                            </div>
                                            <span className="text-[12px] font-bold text-[#3A332C] bg-[#EDE6DE] px-2.5 py-1 rounded-[6px]">
                                                + {task.max_grade} pts
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[#8C7A6B] text-[12px] italic">
                                    Nenhuma tarefa cadastrada na aula anterior.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={confirmPresence}
                        disabled={submittingPresence === presenceAula?.id}
                        className="w-full py-3.5 px-4 rounded-[12px] bg-[#38302A] text-white font-bold text-[14px] hover:bg-[#52453B] transition-colors disabled:opacity-50 cursor-pointer mt-2"
                    >
                        {submittingPresence ? 'Processando...' : 'Confirmar Presença e Notas'}
                    </button>
                </div>
            </Modal>

            {/* Modal Confirmação Deletar Aula */}
            <Modal
                isOpen={!!aulaToDelete}
                onClose={() => {
                    setAulaToDelete(null)
                    setAulaDeleteInput('')
                }}
                outsideCloseClick={true}
                className="!rounded-[32px] !p-8 sm:!p-10 max-w-[700px]"
            >
                {aulaToDelete && (
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-[#382B22] text-2xl sm:text-[26px] font-extrabold leading-snug">
                            Você tem certeza que quer deletar essa aula?
                        </h3>

                        <p className="text-[#A3968A] text-[13px] sm:text-[16px] mt-2.5 max-w-[500px] leading-relaxed font-normal">
                            Ao remover essa aula, todas as suas aulas, materiais e presenças serão removidas!
                        </p>

                        <p className="w-full text-left text-[#382B22] text-[11px] sm:text-[14px] font-bold tracking-wider uppercase mt-7 mb-3">
                            PARA CONFIRMAR, ESCREVA “{expectedAulaConfirmText}” NO CAMPO ABAIXO
                        </p>

                        <Input
                            type="text"
                            value={aulaDeleteInput}
                            onChange={(e) => setAulaDeleteInput(e.target.value)}
                            placeholder=""
                            containerClassName="bg-[#FFF5F3] border border-[#F0A89C] h-14"
                            className="text-center font-bold text-[#382B22] text-[15px] uppercase"
                            autoFocus
                        />

                        <Button
                            type="button"
                            disabled={!isDeleteAulaConfirmed}
                            isLoading={isDeletingAula}
                            onClick={confirmDeleteAula}
                            className="w-full  mt-4 bg-[#2C221E] text-white text-[15px] font-bold hover:bg-[#42342E]"
                        >
                            Deletar aula
                        </Button>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!professorToRemove}
                onClose={() => setProfessorToRemove(null)}
                outsideCloseClick={true}
                className="!rounded-[28px] !p-8 max-w-[440px]"
            >
                {professorToRemove && (
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-[#382B22] text-xl sm:text-[22px] font-extrabold leading-snug">
                            Você tem certeza que quer remover este professor?
                        </h3>

                        <p className="text-[#8C7A6B] text-[13px] sm:text-[14px] mt-2.5 leading-relaxed font-medium">
                            <span className="font-bold text-[#382B22]">{professorToRemove.name} {professorToRemove.surname || ''}</span> deixará de ter acesso ao gerenciamento desta matéria.
                        </p>

                        <div className="flex items-center gap-3 w-full mt-6">
                            <button
                                type="button"
                                onClick={() => setProfessorToRemove(null)}
                                className="flex-1 py-3 px-4 rounded-[12px] border border-[#EDE6DE] bg-white text-[#4D453E] font-bold text-[14px] hover:bg-[#FFF8F6] transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <Button
                                type="button"
                                isLoading={isRemovingProfessor}
                                onClick={confirmRemoveProfessor}
                                className="flex-1 h-[46px] !rounded-[12px] bg-[#D92D20] text-white font-bold text-[14px] hover:bg-[#B91C1C]"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </NavLayout>
    )
}
