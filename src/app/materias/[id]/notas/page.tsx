'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia, Aula, AulaTask } from '@/types/database'
import { ChevronLeft, ChevronRight, Download, Search, ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import Pagination from '@/components/ui/Pagination'

interface StudentGradeRow {
    id: string
    name: string
    surname: string
    matricula: string
    tendaName: string
    tasksEarned: number
    presenceEarned: number
    finalExamGrade: number
    tookFinalExam: boolean
    totalGrade: number
    isApproved: boolean
}

type SortOption = 'nome_asc' | 'nome_desc' | 'nota_desc' | 'nota_asc'

const sortLabels: Record<SortOption, string> = {
    nome_asc: 'Alfabética (A–Z)',
    nome_desc: 'Alfabética (Z–A)',
    nota_desc: 'Maior Nota',
    nota_asc: 'Menor Nota',
}

export default function NotasMateriaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [materia, setMateria] = useState<Materia | null>(null)
    const [allTasks, setAllTasks] = useState<AulaTask[]>([])
    const [studentsData, setStudentsData] = useState<StudentGradeRow[]>([])
    const [loading, setLoading] = useState(true)

    // Filter, Search, Sort & Pagination States
    const [statusFilter, setStatusFilter] = useState<'todos' | 'aprovados' | 'reprovados'>('todos')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortOption, setSortOption] = useState<SortOption>('nome_asc')
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 1. Fetch Profile and check permissions (Admin or Professor of this Materia)
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (!profileData) return

            const isAdmin = profileData.role.includes('ADMIN')

            const { data: profAssignment } = await supabase
                .from('materia_professors')
                .select('*')
                .eq('materia_id', id)
                .eq('professor_id', user.id)
                .maybeSingle()

            if (!isAdmin && !profAssignment) {
                router.push(`/materias/${id}`)
                return
            }

            // 2. Fetch Materia
            const { data: materiaData } = await supabase
                .from('materias')
                .select('*')
                .eq('id', id)
                .single()

            if (!materiaData) return
            setMateria(materiaData)

            // 3. Fetch Aulas
            const { data: aulasData } = await supabase
                .from('aulas')
                .select('*')
                .eq('materia_id', id)
                .order('aula_number', { ascending: true })

            const aulaList: Aula[] = aulasData || []
            const aulaIds = aulaList.map(a => a.id)

            // 4. Fetch Tasks
            let tasksList: AulaTask[] = []
            if (aulaIds.length > 0) {
                const { data: tasksData } = await supabase
                    .from('aula_tasks')
                    .select('*')
                    .in('aula_id', aulaIds)
                tasksList = tasksData || []
            }
            setAllTasks(tasksList)
            const taskIds = tasksList.map(t => t.id)

            // 5. Fetch enrolled students with Tenda joined
            const { data: enrolledData } = await supabase
                .from('materia_students')
                .select('profiles(*, tendas(name))')
                .eq('materia_id', id)

            if (!enrolledData || enrolledData.length === 0) {
                setStudentsData([])
                setLoading(false)
                return
            }

            const enrolledStudents: any[] = enrolledData
                .map(e => e.profiles)
                .filter(Boolean)

            // 6. Fetch Presencas
            let presencasData: any[] = []
            if (aulaIds.length > 0) {
                const { data: presData } = await supabase
                    .from('presencas_tarefas')
                    .select('*')
                    .in('aula_id', aulaIds)
                presencasData = presData || []
            }

            // 7. Fetch Task Grades
            let taskGradesData: any[] = []
            if (taskIds.length > 0) {
                const { data: tgData } = await supabase
                    .from('student_task_grades')
                    .select('*')
                    .in('task_id', taskIds)
                taskGradesData = tgData || []
            }

            // 8. Fetch Final Exams
            const { data: finalExamsData } = await supabase
                .from('notas_finais')
                .select('*')
                .eq('materia_id', id)

            // Calculate Max Points
            const materiaPresenceMax = Number(materiaData.presence_max_grade || 0)
            const aulasPresenceSum = aulaList.reduce((acc, a) => acc + Number(a.presence_max_grade || 0), 0)
            const maxPresence = materiaPresenceMax > 0 ? materiaPresenceMax : aulasPresenceSum

            const minRequiredGrade = Number(materiaData.min_grade || 6.0)

            // 9. Process Student Rows with Real Calculations
            const rows: StudentGradeRow[] = enrolledStudents.map(student => {
                const studentTasks = taskGradesData.filter(t => t.aluno_id === student.id)
                const tasksEarned = studentTasks.reduce((acc, t) => acc + Number(t.grade || 0), 0)

                const studentPresencas = presencasData.filter(p => p.aluno_id === student.id && p.presence === true)
                let presenceEarned = 0
                if (aulaList.length > 0) {
                    const sumPresenceGrades = studentPresencas.reduce((acc, p) => acc + Number(p.presence_grade || 0), 0)
                    if (sumPresenceGrades > 0) {
                        presenceEarned = sumPresenceGrades
                    } else {
                        presenceEarned = (studentPresencas.length / aulaList.length) * maxPresence
                    }
                }
                presenceEarned = Math.min(maxPresence, Math.max(0, presenceEarned))

                const finalExamRecord = finalExamsData?.find(f => f.aluno_id === student.id)
                const finalExamGrade = finalExamRecord && finalExamRecord.final_exam_grade !== null && finalExamRecord.final_exam_grade !== undefined
                    ? Number(finalExamRecord.final_exam_grade)
                    : 0
                const tookFinalExam = finalExamRecord && finalExamRecord.final_exam_grade !== null && finalExamRecord.final_exam_grade !== undefined

                const totalGrade = tasksEarned + presenceEarned + (materiaData.has_final_exam && tookFinalExam ? finalExamGrade : 0)

                const isApproved = totalGrade >= minRequiredGrade

                const tendaName = student.tendas?.name || ''

                return {
                    id: student.id,
                    name: student.name || '',
                    surname: student.surname || '',
                    matricula: student.matricula || '',
                    tendaName,
                    tasksEarned,
                    presenceEarned,
                    finalExamGrade,
                    tookFinalExam: !!tookFinalExam,
                    totalGrade,
                    isApproved,
                }
            })

            setStudentsData(rows)
            setLoading(false)
        }

        fetchData()
    }, [id, router, supabase])

    // Weight and Max values from live data
    const maxTasks = useMemo(() => {
        return allTasks.reduce((acc, t) => acc + Number(t.max_grade || 0), 0)
    }, [allTasks])

    const maxPresence = useMemo(() => {
        return Number(materia?.presence_max_grade || 0)
    }, [materia])

    const maxFinalExam = useMemo(() => {
        return materia?.has_final_exam ? Number(materia.final_exam_max_grade || 0) : 0
    }, [materia])

    const maxTotalPossible = useMemo(() => {
        return maxTasks + maxPresence + maxFinalExam
    }, [maxTasks, maxPresence, maxFinalExam])

    const minGrade = Number(materia?.min_grade || 6.0)

    // Aggregate Real Metrics for the Top Header Card
    const { mediaGeral, taxaAprovacao, aprovadosCount, reprovadosCount, maiorNota, menorNota, maxNotasCount } = useMemo(() => {
        const total = studentsData.length
        if (total === 0) {
            return {
                mediaGeral: 0,
                taxaAprovacao: 0,
                aprovadosCount: 0,
                reprovadosCount: 0,
                maiorNota: 0,
                menorNota: 0,
                maxNotasCount: 0,
            }
        }

        const sum = studentsData.reduce((acc, s) => acc + s.totalGrade, 0)
        const avg = sum / total

        const aprovados = studentsData.filter(s => s.isApproved).length
        const reprovados = total - aprovados
        const aprovRate = (aprovados / total) * 100

        const grades = studentsData.map(s => s.totalGrade)
        const max = Math.max(...grades)
        const min = Math.min(...grades)

        const countMax = studentsData.filter(s => s.totalGrade === max).length

        return {
            mediaGeral: avg,
            taxaAprovacao: aprovRate,
            aprovadosCount: aprovados,
            reprovadosCount: reprovados,
            maiorNota: max,
            menorNota: min,
            maxNotasCount: countMax,
        }
    }, [studentsData])

    // Filter and Sort Students List
    const filteredStudents = useMemo(() => {
        return studentsData
            .filter(student => {
                // Status Filter
                if (statusFilter === 'aprovados' && !student.isApproved) return false
                if (statusFilter === 'reprovados' && student.isApproved) return false

                // Search Query Filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim()
                    const fullName = `${student.name} ${student.surname}`.toLowerCase()
                    const mat = student.matricula.toLowerCase()
                    const tenda = student.tendaName.toLowerCase()
                    if (!fullName.includes(q) && !mat.includes(q) && !tenda.includes(q)) {
                        return false
                    }
                }

                return true
            })
            .sort((a, b) => {
                if (sortOption === 'nome_asc') {
                    const nameA = `${a.name} ${a.surname}`.trim()
                    const nameB = `${b.name} ${b.surname}`.trim()
                    return nameA.localeCompare(nameB)
                }
                if (sortOption === 'nome_desc') {
                    const nameA = `${a.name} ${a.surname}`.trim()
                    const nameB = `${b.name} ${b.surname}`.trim()
                    return nameB.localeCompare(nameA)
                }
                if (sortOption === 'nota_desc') {
                    return b.totalGrade - a.totalGrade
                }
                if (sortOption === 'nota_asc') {
                    return a.totalGrade - b.totalGrade
                }
                return 0
            })
    }, [studentsData, statusFilter, searchQuery, sortOption])

    // Pagination calculations
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1
    const startItem = filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, filteredStudents.length)

    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredStudents.slice(start, start + itemsPerPage)
    }, [filteredStudents, currentPage, itemsPerPage])

    // CSV Export matching real dataset
    const exportToCSV = () => {
        if (!materia) return

        let csv = 'Matricula;Nome;Tenda;Tarefas;Presencas'
        if (materia.has_final_exam) {
            csv += ';Prova Final'
        }
        csv += ';Nota Final;Situacao\n'

        studentsData.forEach(s => {
            const fullName = `${s.name} ${s.surname}`.trim()
            const tasksStr = s.tasksEarned.toFixed(1).replace('.', ',')
            const presStr = s.presenceEarned.toFixed(1).replace('.', ',')
            const examStr = s.tookFinalExam ? s.finalExamGrade.toFixed(1).replace('.', ',') : '-'
            const totalStr = s.totalGrade.toFixed(1).replace('.', ',')
            const statusStr = s.isApproved ? 'Aprovado' : 'Reprovado'

            csv += `${s.matricula};${fullName};${s.tendaName || '-'};${tasksStr};${presStr}`
            if (materia.has_final_exam) {
                csv += `;${examStr}`
            }
            csv += `;${totalStr};${statusStr}\n`
        })

        const bom = '\uFEFF'
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const safeName = materia.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        link.download = `notas_${safeName}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const formatGrade = (val: number) => val.toFixed(1).replace('.', ',')

    if (loading || !materia) {
        return (
            <NavLayout>
                <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4">
                    <Skeleton className="w-full h-[140px] rounded-[24px]" />
                    <Skeleton className="w-full h-[60px] rounded-[16px]" />
                    <Skeleton className="w-full h-[450px] rounded-[20px]" />
                </div>
            </NavLayout>
        )
    }

    return (
        <NavLayout>
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16 pt-2">
                {/* Top Action Bar (Voltar & Exportar CSV) */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => router.push(`/materias/${id}`)}
                        className="px-4 py-2 rounded-full bg-white border border-[#EDE6DE] text-[#3A332C] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#FFF8F6] active:scale-98 transition-all cursor-pointer shadow-2xs"
                    >
                        <ChevronLeft size={16} />
                        <span>Voltar</span>
                    </button>

                    <button
                        type="button"
                        onClick={exportToCSV}
                        className="px-4 py-2.5 rounded-[12px] bg-[#1E5638] text-white text-[13px] font-bold flex items-center gap-2 hover:bg-[#16432B] active:scale-98 transition-all cursor-pointer shadow-xs"
                    >
                        <Download size={16} />
                        <span>Exportar (.csv)</span>
                    </button>
                </div>

                {/* Main Title & Real Metrics Card */}
                <div className="w-full bg-white rounded-[24px] p-6 sm:p-8 border border-[#EDE6DE] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left: Materia Name Title */}
                    <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#1E1915] tracking-tight">
                        Notas — {materia.name}
                    </h1>

                    {/* Right: Metrics Container */}
                    <div className="w-full lg:w-auto bg-[#FAF7F4] border border-[#EFE7E1] rounded-[20px] p-4 sm:p-5 flex items-center divide-x divide-[#E5DCD5] flex-wrap sm:flex-nowrap gap-y-4 shadow-2xs justify-between sm:justify-start">
                        {/* MÉDIA GERAL */}
                        <div className="px-3 sm:px-5 flex flex-col gap-0.5 first:pl-2">
                            <span className="text-[11px] font-extrabold text-[#8C7A6B] uppercase tracking-wider">
                                MÉDIA GERAL
                            </span>
                            <span className="text-[22px] sm:text-[24px] font-extrabold text-[#1E1915] leading-tight">
                                {formatGrade(mediaGeral)}
                            </span>
                            <span className={`text-[11px] font-bold ${mediaGeral >= minGrade ? 'text-[#027A48]' : 'text-[#D92D20]'}`}>
                                {mediaGeral >= minGrade ? 'Meta atingida' : 'Abaixo da meta'}
                            </span>
                        </div>

                        {/* APROVAÇÃO */}
                        <div className="px-3 sm:px-5 flex flex-col gap-0.5">
                            <span className="text-[11px] font-extrabold text-[#8C7A6B] uppercase tracking-wider">
                                APROVAÇÃO
                            </span>
                            <span className="text-[22px] sm:text-[24px] font-extrabold text-[#027A48] leading-tight">
                                {taxaAprovacao.toFixed(1).replace('.', ',')}%
                            </span>
                            <span className="text-[11px] font-medium text-[#8C7A6B]">
                                {aprovadosCount} {aprovadosCount === 1 ? 'aluno' : 'alunos'}
                            </span>
                        </div>

                        {/* MAIOR NOTA */}
                        <div className="px-3 sm:px-5 flex flex-col gap-0.5">
                            <span className="text-[11px] font-extrabold text-[#8C7A6B] uppercase tracking-wider">
                                MAIOR NOTA
                            </span>
                            <span className="text-[22px] sm:text-[24px] font-extrabold text-[#1E1915] leading-tight">
                                {formatGrade(maiorNota)}
                            </span>
                            <span className="text-[11px] font-medium text-[#8C7A6B]">
                                {maxNotasCount} {maxNotasCount === 1 ? 'nota máx.' : 'notas máx.'}
                            </span>
                        </div>

                        {/* MENOR NOTA */}
                        <div className="px-3 sm:px-5 flex flex-col gap-0.5 last:pr-2">
                            <span className="text-[11px] font-extrabold text-[#8C7A6B] uppercase tracking-wider">
                                MENOR NOTA
                            </span>
                            <span className="text-[22px] sm:text-[24px] font-extrabold text-[#D92D20] leading-tight">
                                {formatGrade(menorNota)}
                            </span>
                            <span className="text-[11px] font-medium text-[#D92D20]">
                                {reprovadosCount} {reprovadosCount === 1 ? 'reprovado' : 'reprovados'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs, Search & Sort Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-wrap">
                    {/* Status Tabs */}
                    <SegmentedControl<'todos' | 'aprovados' | 'reprovados'>
                        options={[
                            { key: 'todos', label: 'Todos', count: studentsData.length },
                            { key: 'aprovados', label: 'Aprovados' },
                            { key: 'reprovados', label: 'Reprovados' },
                        ]}
                        value={statusFilter}
                        onChange={(val) => {
                            setStatusFilter(val)
                            setCurrentPage(1)
                        }}
                        pill={true}
                        className="self-start"
                    />

                    {/* Search & Sort Controls */}
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                        {/* Search Input using Project Input component */}
                        <div className="w-full sm:w-[280px]">
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                                placeholder="Buscar nome ou matrícula..."
                                icon={<Search size={16} className="text-[#8C7A6B]" />}
                                containerClassName="bg-white border border-[#EDE6DE] rounded-full !h-[40px] px-4"
                                className="text-[13px] placeholder:text-[#8C7A6B]"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className="px-4 py-2 rounded-full bg-white border border-[#EDE6DE] text-[#4D453E] text-[13px] font-medium flex items-center gap-2 hover:bg-[#FFF8F6] transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                                <span>Ordenar: {sortLabels[sortOption]}</span>
                                <ChevronDown size={14} className={`text-[#8C7A6B] transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSortMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsSortMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#EDE6DE] rounded-[14px] shadow-lg z-20 overflow-hidden py-1">
                                        {(Object.keys(sortLabels) as SortOption[]).map(key => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setSortOption(key)
                                                    setIsSortMenuOpen(false)
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold flex items-center justify-between hover:bg-[#FFF8F6] transition-colors cursor-pointer ${
                                                    sortOption === key ? 'text-[#38302A] bg-[#FFF8F6]' : 'text-[#7E756D]'
                                                }`}
                                            >
                                                <span>{sortLabels[key]}</span>
                                                {sortOption === key && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#38302A]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="w-full bg-white rounded-[20px] border border-[#EDE6DE] shadow-xs overflow-hidden flex flex-col">
                    {/* Horizontal scroll container with scrollbar hidden */}
                    <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <table className="w-full text-left border-collapse min-w-[780px]">
                            <thead>
                                <tr className="border-b border-[#F5F0EB] bg-[#FAF8F5]">
                                    <th className="py-3.5 px-6"></th>
                                    <th className="py-3.5 px-4 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider">
                                        MATRÍCULA
                                    </th>
                                    <th className="py-3.5 px-4 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider">
                                        TAREFAS ({maxTasks.toFixed(0)} PTS)
                                    </th>
                                    <th className="py-3.5 px-4 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider">
                                        PRESENÇAS ({maxPresence.toFixed(0)} PTS)
                                    </th>
                                    {materia.has_final_exam && (
                                        <th className="py-3.5 px-4 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider">
                                            PROVA FINAL ({maxFinalExam.toFixed(0)} PTS)
                                        </th>
                                    )}
                                    <th className="py-3.5 px-4 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider">
                                        NOTA FINAL
                                    </th>
                                    <th className="py-3.5 px-6 text-[#8C7A6B] text-[11px] font-extrabold uppercase tracking-wider text-right">
                                        SITUAÇÃO
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F0EB]">
                                {paginatedStudents.length > 0 ? (
                                    paginatedStudents.map((row) => (
                                        <tr key={row.id} className="hover:bg-[#FFF9F8] transition-colors">
                                            {/* ALUNO */}
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#1E1915] text-[14px]">
                                                        {row.name} {row.surname || ''}
                                                    </span>
                                                    {row.tendaName && (
                                                        <span className="text-[#8C7A6B] text-[12px] font-medium mt-0.5">
                                                            Tenda: {row.tendaName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* MATRÍCULA */}
                                            <td className="py-4 px-4 text-[#7E756D] text-[14px] font-medium">
                                                {row.matricula || '---'}
                                            </td>

                                            {/* TAREFAS */}
                                            <td className="py-4 px-4 text-[#4D453E] text-[14px] font-medium">
                                                {formatGrade(row.tasksEarned)}
                                            </td>

                                            {/* PRESENÇAS */}
                                            <td className="py-4 px-4 text-[#4D453E] text-[14px] font-medium">
                                                {formatGrade(row.presenceEarned)}
                                            </td>

                                            {/* PROVA FINAL */}
                                            {materia.has_final_exam && (
                                                <td className="py-4 px-4 text-[#4D453E] text-[14px] font-medium">
                                                    {row.tookFinalExam ? formatGrade(row.finalExamGrade) : '-'}
                                                </td>
                                            )}

                                            {/* NOTA FINAL */}
                                            <td className="py-4 px-4">
                                                <span className={`text-[15px] font-extrabold ${
                                                    row.totalGrade >= (maxTotalPossible || 100) && maxTotalPossible > 0
                                                        ? 'text-[#027A48]'
                                                        : row.totalGrade < minGrade
                                                        ? 'text-[#D92D20]'
                                                        : 'text-[#1E1915]'
                                                }`}>
                                                    {formatGrade(row.totalGrade)}
                                                </span>
                                            </td>

                                            {/* SITUAÇÃO */}
                                            <td className="py-4 px-6 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold ${
                                                    row.isApproved
                                                        ? 'bg-[#E6F7ED] text-[#027A48]'
                                                        : 'bg-[#FEE2E2] text-[#D92D20]'
                                                }`}>
                                                    {row.isApproved ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={materia.has_final_exam ? 7 : 6}
                                            className="py-12 text-center text-[#8C7A6B] text-[14px]"
                                        >
                                            Nenhum aluno encontrado com os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer / Pagination Component */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        showItemsPerPage={false}
                        infoText={
                            <span className="text-[13px] text-[#8C7A6B] font-medium">
                                Exibindo <strong className="text-[#1E1915]">{startItem}</strong> a <strong className="text-[#1E1915]">{endItem}</strong> de <strong className="text-[#1E1915]">{filteredStudents.length}</strong> alunos matriculados
                            </span>
                        }
                        className="py-4 px-6 border-t border-[#EDE6DE]"
                    />
                </div>
            </div>
        </NavLayout>
    )
}
