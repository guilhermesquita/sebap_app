'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile, Aula, Materia, AulaTask, StudentTaskGrade } from '@/types/database'
import { Search, UserCheck, XCircle, CheckCircle, Save, ChevronLeft, Award, ClipboardList } from 'lucide-react'
import styles from './presenca.module.css'

export default function LançarPresençaPage({ params }: { params: Promise<{ id: string, aulaId: string }> }) {
    const { id, aulaId } = use(params)
    const [aula, setAula] = useState<Aula | null>(null)
    const [matricula, setMatricula] = useState('')
    const [aluno, setAluno] = useState<Profile | null>(null)
    const [searchError, setSearchError] = useState(false)
    const [loadingSearch, setLoadingSearch] = useState(false)
    const [presence, setPresence] = useState(true)
    const [saving, setSaving] = useState(false)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [finalGrade, setFinalGrade] = useState<number>(0)

    // New states for tasks
    const [previousTasks, setPreviousTasks] = useState<AulaTask[]>([])
    const [taskDone, setTaskDone] = useState<{ [taskId: string]: boolean }>({})

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchInitialData() {
            // 1. Fetch current aula
            const { data: aulaData } = await supabase.from('aulas').select('*').eq('id', aulaId).single()
            if (aulaData) {
                setAula(aulaData)

                // 2. Fetch Materia
                const { data: materiaData } = await supabase.from('materias').select('*').eq('id', id).single()
                setMateria(materiaData)

                // 3. Fetch tasks from PREVIOUS aula
                if (aulaData.aula_number > 1) {
                    const { data: prevAula } = await supabase
                        .from('aulas')
                        .select('id')
                        .eq('materia_id', id)
                        .eq('aula_number', aulaData.aula_number - 1)
                        .single()

                    if (prevAula) {
                        const { data: tasks } = await supabase
                            .from('aula_tasks')
                            .select('*')
                            .eq('aula_id', prevAula.id)

                        setPreviousTasks(tasks || [])
                    }
                }
            }
        }
        fetchInitialData()
    }, [aulaId, id])

    const buscarAluno = async () => {
        if (!matricula) return
        setLoadingSearch(true)
        setSearchError(false)
        setAluno(null)

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('matricula', matricula.toUpperCase())
            .single()

        if (error || !data) {
            setSearchError(true)
        } else {
            setAluno(data)

            // Check if already has presence
            const { data: presData } = await supabase
                .from('presencas_tarefas')
                .select('*')
                .eq('aula_id', aulaId)
                .eq('aluno_id', data.id)
                .single()

            if (presData) {
                setPresence(presData.presence)
            } else {
                setPresence(true)
            }

            // Fetch existing task grades
            if (previousTasks.length > 0) {
                const { data: grades } = await supabase
                    .from('student_task_grades')
                    .select('*')
                    .in('task_id', previousTasks.map(t => t.id))
                    .eq('aluno_id', data.id)

                const newTaskDone: { [taskId: string]: boolean } = {}
                previousTasks.forEach(t => {
                    const g = grades?.find(grade => grade.task_id === t.id)
                    newTaskDone[t.id] = g ? Number(g.grade) > 0 : false
                })
                setTaskDone(newTaskDone)
            }

            // Check if already has final exam grade if it's last aula
            if (aula?.is_last_aula) {
                const { data: notaData } = await supabase
                    .from('notas_finais')
                    .select('final_exam_grade')
                    .eq('materia_id', id)
                    .eq('aluno_id', data.id)
                    .single()
                if (notaData) {
                    setFinalGrade(Number(notaData.final_exam_grade))
                } else {
                    setFinalGrade(0)
                }
            }
        }
        setLoadingSearch(false)
    }

    const handleSave = async () => {
        if (!aluno || !aula) return
        setSaving(true)

        try {
            // 1. Enrollment logic: if it's the first lesson, add to materia_students
            if (aula.aula_number === 1) {
                const { error: enrollError } = await supabase
                    .from('materia_students')
                    .upsert({
                        materia_id: id,
                        aluno_id: aluno.id
                    }, { onConflict: 'materia_id,aluno_id' })

                if (enrollError) throw enrollError
            }

            // 2. Save Presence and Presence Grade
            const { error: presError } = await supabase
                .from('presencas_tarefas')
                .upsert({
                    aula_id: aulaId,
                    aluno_id: aluno.id,
                    presence: presence,
                    presence_grade: presence ? (aula.presence_max_grade || 0) : 0,
                }, { onConflict: 'aula_id,aluno_id' })

            if (presError) throw presError

            // 3. Save Task Grades
            if (previousTasks.length > 0) {
                const gradesToUpsert = previousTasks.map(t => ({
                    task_id: t.id,
                    aluno_id: aluno.id,
                    grade: taskDone[t.id] ? t.max_grade : 0
                }))

                const { error: gradesError } = await supabase
                    .from('student_task_grades')
                    .upsert(gradesToUpsert, { onConflict: 'task_id,aluno_id' })

                if (gradesError) throw gradesError
            }

            // 4. Save Final Exam Grade if last aula
            if (aula.is_last_aula && materia?.has_final_exam) {
                const { error: gradeError } = await supabase
                    .from('notas_finais')
                    .upsert({
                        materia_id: id,
                        aluno_id: aluno.id,
                        final_exam_grade: finalGrade,
                    }, { onConflict: 'materia_id,aluno_id' })

                if (gradeError) throw gradeError
            }

            // Success feedback
            alert(aula.aula_number === 1
                ? 'Presença registrada e aluno matriculado na matéria!'
                : 'Lançamento concluído com sucesso!')

            // Reset for next student
            setMatricula('')
            setAluno(null)
            setSearchError(false)
            setTaskDone({})
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSaving(false)
        }
    }



    if (!aula) return <div className={styles.loading}>Carregando aula...</div>

    return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ChevronLeft size={20} /> Voltar
                    </button>
                    <h1 className={styles.title}>Lançar Presença - AULA {aula.aula_number}</h1>
                </div>

                <div className={styles.searchSection}>
                    <div className={styles.inputGroup}>
                        <label>Matrícula do Aluno</label>
                        <div className={styles.searchBar}>
                            <input
                                type="text"
                                value={matricula}
                                onChange={e => setMatricula(e.target.value)}
                                placeholder="Ex: SB-2026-1234"
                                onKeyPress={e => e.key === 'Enter' && buscarAluno()}
                            />
                            <button onClick={buscarAluno} disabled={loadingSearch} className={styles.searchBtn}>
                                {loadingSearch ? '...' : <Search size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {searchError && (
                    <div className={styles.errorBanner}>
                        <XCircle size={24} />
                        <span>Nenhum aluno encontrado com a matrícula {matricula}.</span>
                    </div>
                )}

                {aluno && (
                    <div className={styles.alunoCard}>
                        <div className={styles.alunoInfo}>
                            <div className={styles.avatar}>
                                <UserCheck size={32} />
                            </div>
                            <div className={styles.nameGroup}>
                                <h3 className={styles.alunoName}>{aluno.name} {aluno.surname}</h3>
                                <p className={styles.alunoMatricula}>{aluno.matricula}</p>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <div className={styles.attendanceCheck}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={presence}
                                        onChange={e => setPresence(e.target.checked)}
                                    />
                                    <span>Presença nesta aula {aula.presence_max_grade > 0 && `(+${aula.presence_max_grade} pts)`}</span>
                                </label>
                            </div>

                            {previousTasks.length > 0 && (
                                <div className={styles.tasksSection}>
                                    <h4 className={styles.sectionSubtitle}>
                                        <ClipboardList size={18} /> Tarefas da Aula Anterior (AULA {aula.aula_number - 1})
                                    </h4>
                                    <div className={styles.tasksListColumn}>
                                        {previousTasks.map((task) => (
                                            <div key={task.id} className={styles.taskGradeRow} style={{ padding: '16px 20px' }}>
                                                <label className={styles.checkboxLabel} style={{ width: '100%' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={taskDone[task.id] || false}
                                                        onChange={e => setTaskDone({ ...taskDone, [task.id]: e.target.checked })}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                        <span className={styles.taskLabel} style={{ fontSize: '1.125rem' }}>{task.name}</span>
                                                        <span className={styles.taskMaxGrade} style={{ background: 'var(--primary-cream)', padding: '4px 12px', borderRadius: '12px', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
                                                            + {task.max_grade} pts
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aula.is_last_aula && materia?.has_final_exam && (
                                <div className={styles.finalExamSection}>
                                    <h4 className={styles.sectionSubtitle}>
                                        <Award size={18} /> Nota da Prova Final: {materia.final_exam_name}
                                    </h4>
                                    <div className={styles.gradeInputGroup}>
                                        <input
                                            type="number"
                                            value={finalGrade}
                                            onChange={e => {
                                                let val = parseFloat(e.target.value) || 0
                                                if (val > (materia?.max_grade || 0)) val = materia?.max_grade || 0
                                                if (val < 0) val = 0
                                                setFinalGrade(val)
                                            }}
                                            min="0"
                                            max={materia.max_grade}
                                            placeholder="Nota..."
                                        />
                                        <span className={styles.maxGradeLabel}>/ {materia.max_grade}</span>
                                    </div>
                                </div>
                            )}

                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                                <Save size={20} /> {saving ? 'Salvando...' : 'Confirmar Lançamento'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </NavLayout>
    )
}
