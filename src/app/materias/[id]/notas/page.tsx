'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia } from '@/types/database'
import { ChevronLeft, Download, UserCheck, CheckCircle2, XCircle } from 'lucide-react'
import styles from './notas.module.css'
import { Spinner } from '@/components/ui/Spinner'

type StudentGradeRow = {
    id: string
    matricula: string
    name: string
    surname: string
    totalGrade: number
    tookFinalExam: boolean
}

export default function NotasMateriaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [studentsData, setStudentsData] = useState<StudentGradeRow[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch Profile and check permissions
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (!profileData) return

            const isAdmin = profileData.role.includes('ADMIN')
            
            const { data: profAssignment } = await supabase
                .from('materia_professors')
                .select('*')
                .eq('materia_id', id)
                .eq('professor_id', user.id)
                .single()

            if (!isAdmin && !profAssignment) {
                router.push(`/materias/${id}`)
                return
            }

            // 2. Fetch Materia
            const { data: materiaData } = await supabase.from('materias').select('*').eq('id', id).single()
            if (!materiaData) return
            setMateria(materiaData)

            // 3. Fetch enrolled students
            const { data: enrolledData } = await supabase
                .from('materia_students')
                .select('profiles(*)')
                .eq('materia_id', id)

            if (!enrolledData || enrolledData.length === 0) {
                setStudentsData([])
                setLoading(false)
                return
            }

            const enrolledStudents = enrolledData.map(e => e.profiles as unknown as Profile).filter(Boolean)

            // 4. Fetch Aulas
            const { data: aulasData } = await supabase
                .from('aulas')
                .select('*')
                .eq('materia_id', id)
            
            const aulaIds = aulasData?.map(a => a.id) || []

            // 5. Fetch Presencas
            let presencasData: any[] = []
            if (aulaIds.length > 0) {
                const { data } = await supabase
                    .from('presencas_tarefas')
                    .select('*')
                    .in('aula_id', aulaIds)
                presencasData = data || []
            }

            // 6. Fetch Tasks
            let tasksData: any[] = []
            let taskIds: string[] = []
            if (aulaIds.length > 0) {
                const { data: tasks } = await supabase
                    .from('aula_tasks')
                    .select('*')
                    .in('aula_id', aulaIds)
                tasksData = tasks || []
                taskIds = tasksData.map(t => t.id)
            }

            // 7. Fetch Task Grades
            let taskGradesData: any[] = []
            if (taskIds.length > 0) {
                const { data } = await supabase
                    .from('student_task_grades')
                    .select('*')
                    .in('task_id', taskIds)
                taskGradesData = data || []
            }

            // 8. Fetch Final Exams
            const { data: finalExamsData } = await supabase
                .from('notas_finais')
                .select('*')
                .eq('materia_id', id)

            // 9. Calculate totals per student
            const rows: StudentGradeRow[] = enrolledStudents.map(student => {
                // Presence grades
                const studentPresencas = presencasData.filter(p => p.aluno_id === student.id)
                const presencasTotal = studentPresencas.reduce((acc, p) => acc + Number(p.presence_grade || 0), 0)

                // Task grades
                const studentTasks = taskGradesData.filter(t => t.aluno_id === student.id)
                const tasksTotal = studentTasks.reduce((acc, t) => acc + Number(t.grade || 0), 0)

                // Final Exam
                const finalExam = finalExamsData?.find(f => f.aluno_id === student.id)
                const finalExamRaw = finalExam ? Number(finalExam.final_exam_grade || 0) : 0
                const tookFinalExam = !!finalExam

                let totalGrade = 0
                if (materiaData.has_final_exam && tookFinalExam) {
                    totalGrade = finalExamRaw
                } else {
                    totalGrade = presencasTotal + tasksTotal
                }

                return {
                    id: student.id,
                    matricula: student.matricula || '',
                    name: student.name,
                    surname: student.surname,
                    totalGrade: Math.min(totalGrade, materiaData.max_grade), // Cap at max grade just in case
                    tookFinalExam
                }
            })

            // Sort alphabetically by name
            rows.sort((a, b) => a.name.localeCompare(b.name))

            setStudentsData(rows)
            setLoading(false)
        }

        fetchData()
    }, [id, router, supabase])

    const exportToCSV = () => {
        if (!materia) return

        // Create CSV header
        let csvContent = "Matricula;Nome;Nota Final;Fez Prova Final?\n"

        // Add rows
        studentsData.forEach(row => {
            const fullName = `${row.name} ${row.surname}`.trim()
            const tookExamStr = row.tookFinalExam ? 'Sim' : 'Nao'
            const formattedGrade = row.totalGrade.toFixed(2).replace('.', ',') // Format for PT-BR
            
            csvContent += `${row.matricula};${fullName};${formattedGrade};${tookExamStr}\n`
        })

        // Add BOM for Excel UTF-8 support
        const bom = "\uFEFF"
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
        
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        
        // Clean up materia name for filename
        const safeName = materia.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        link.setAttribute("download", `notas_${safeName}.csv`)
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading || !materia) return (
        <NavLayout>
            <div className={styles.loading}>
                <Spinner size={40} />
            </div>
        </NavLayout>
    )

    return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <button className={styles.backBtn} onClick={() => router.push(`/materias/${id}`)}>
                            <ChevronLeft size={20} /> Voltar
                        </button>
                        <h1 className={styles.title}>Notas - {materia.name}</h1>
                    </div>
                    
                    <button className={styles.exportBtn} onClick={exportToCSV}>
                        <Download size={20} /> Exportar (.csv)
                    </button>
                </div>

                <div className={styles.tableCard}>
                    {studentsData.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--primary-taupe)', padding: '20px' }}>
                            Nenhum aluno matriculado nesta matéria.
                        </p>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Aluno</th>
                                    <th>Matrícula</th>
                                    <th>Nota Final</th>
                                    {materia.has_final_exam && <th>Prova Final</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {studentsData.map(student => (
                                    <tr key={student.id}>
                                        <td>
                                            <div className={styles.alunoName}>
                                                <div className={styles.avatar}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                {student.name} {student.surname}
                                            </div>
                                        </td>
                                        <td>{student.matricula}</td>
                                        <td>
                                            <span className={styles.gradeValue}>
                                                {student.totalGrade.toFixed(1).replace('.', ',')}
                                            </span>
                                        </td>
                                        {materia.has_final_exam && (
                                            <td>
                                                {student.tookFinalExam ? (
                                                    <span className={`${styles.badge} ${styles.done}`}>
                                                        <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                                        Realizada
                                                    </span>
                                                ) : (
                                                    <span className={`${styles.badge} ${styles.missing}`}>
                                                        <XCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </NavLayout>
    )
}
