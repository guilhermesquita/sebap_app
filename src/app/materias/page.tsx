'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia } from '@/types/database'
import Link from 'next/link'
import styles from './materias.module.css'
import { Plus, Search, Filter, Eye, EyeOff } from 'lucide-react'
import { getMateriaStatus, formatStatus, formatDateBR } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

export default function MateriasPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [materias, setMaterias] = useState<Materia[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setProfile(profileData)

            let materiasQuery = supabase
                .from('materias')
                .select('*')
                .order('created_at', { ascending: false })

            // Filter for students/professors who are not admins
            if (!profileData.role.includes('ADMIN')) {
                if (profileData.role.includes('ALUNO')) {
                    const { data: studentMaterias } = await supabase
                        .from('materia_students')
                        .select('materia_id')
                        .eq('aluno_id', user.id)

                    const enrolledIds = studentMaterias?.map(sm => sm.materia_id) || []
                    materiasQuery = materiasQuery.in('id', enrolledIds)
                } else if (profileData.role.includes('PROFESSOR')) {
                    const { data: profMaterias } = await supabase
                        .from('materia_professors')
                        .select('materia_id')
                        .eq('professor_id', user.id)

                    const assignedIds = profMaterias?.map(pm => pm.materia_id) || []
                    materiasQuery = materiasQuery.in('id', assignedIds)
                }
            }

            const { data } = await materiasQuery

            if (data) {
                // If student, fetch all data for grade calculation
                let studentGrades: any[] = []
                let studentPresences: any[] = []
                let allAulaTasks: any[] = []
                let allAulas: any[] = []
                let finalExams: any[] = []

                if (profileData.role.includes('ALUNO')) {
                    const { data: gData } = await supabase.from('student_task_grades').select('*').eq('aluno_id', user.id)
                    const { data: pData } = await supabase.from('presencas_tarefas').select('*').eq('aluno_id', user.id)
                    const { data: tData } = await supabase.from('aula_tasks').select('id, aula_id, max_grade')
                    const { data: aData } = await supabase.from('aulas').select('id, materia_id, presence_max_grade')
                    const { data: fData } = await supabase.from('notas_finais').select('*').eq('aluno_id', user.id)

                    studentGrades = gData || []
                    studentPresences = pData || []
                    allAulaTasks = tData || []
                    allAulas = aData || []
                    finalExams = fData || []
                }

                const updated = data.map(m => {
                    const status = getMateriaStatus(m.start_date, m.end_date)

                    if (profileData.role.includes('ALUNO')) {
                        const materiaAulas = allAulas.filter(a => a.materia_id === m.id)
                        const aulaIds = materiaAulas.map(a => a.id)
                        const materiaTasks = allAulaTasks.filter(t => aulaIds.includes(t.aula_id))

                        const tasksEarned = studentGrades.filter(g => materiaTasks.some(mt => mt.id === g.task_id))
                            .reduce((acc, g) => acc + Number(g.grade), 0)

                        const presenceEarned = studentPresences.filter(p => aulaIds.includes(p.aula_id))
                            .reduce((acc, p) => acc + Number(p.presence_grade || 0), 0)

                        const finalExamGrade = Number(finalExams.find(f => f.materia_id === m.id)?.final_exam_grade || 0)

                        const totalGrade = tasksEarned + presenceEarned + finalExamGrade

                        return {
                            ...m,
                            status,
                            current_grade: totalGrade,
                            is_approved: totalGrade >= m.min_grade
                        }
                    }

                    return {
                        ...m,
                        status
                    }
                })
                setMaterias(updated)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const filteredMaterias = materias.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter

        const isAdmin = profile?.role.includes('ADMIN')
        const matchesActive = isAdmin ? true : m.is_active

        return matchesSearch && matchesStatus && matchesActive
    })

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
            setMaterias(materias.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m))
        }
    }

    if (loading) return (
        <NavLayout>
            <div className={styles.header}>
                <Skeleton width="200px" height="40px" />
            </div>
            <div className={styles.controls}>
                <Skeleton width="100%" height="50px" style={{ borderRadius: '16px' }} />
            </div>
            <div className={styles.materiasGrid}>
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} width="100%" height="150px" style={{ borderRadius: '24px' }} />
                ))}
            </div>
        </NavLayout>
    )

    return (
        <NavLayout>
            <div className={styles.header}>
                <h1 className={styles.title}>Matérias</h1>
                {profile?.role.includes('ADMIN') && (
                    <Link href="/materias/nova" className={styles.addBtn}>
                        <Plus size={20} /> Nova Matéria
                    </Link>
                )}
            </div>

            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Pesquisar matéria..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.filterWrapper}>
                    <Filter size={20} className={styles.filterIcon} />
                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todas</option>
                        <option value="EM_PROGRESSO">Em Progresso</option>
                        <option value="EM_BREVE">Em Breve</option>
                        <option value="FINALIZADO">Finalizado</option>
                    </select>
                </div>
            </div>

            <div className={styles.materiasGrid}>
                {filteredMaterias.map(materia => (
                    <Link href={`/materias/${materia.id}`} key={materia.id} className={`${styles.materiaCard} ${!materia.is_active ? styles.inactive : ''}`}>
                        <div className={styles.materiaStatus}>
                            <span className={`${styles.badge} ${styles[materia.status]}`}>
                                {materia.status.replace('_', ' ')}
                            </span>
                            {!materia.is_active && <span className={styles.inactiveBadge}>Desativada</span>}

                            {profile?.role.includes('ADMIN') && (
                                <button
                                    className={`${styles.toggleBtn} ${materia.is_active ? styles.btnActive : styles.btnInactive}`}
                                    onClick={(e) => toggleMateriaActive(e, materia.id, materia.is_active)}
                                    title={materia.is_active ? "Desativar Matéria" : "Ativar Matéria"}
                                >
                                    {materia.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            )}
                        </div>
                        <h3 className={styles.materiaName}>{materia.name}</h3>
                        <div className={styles.materiaMeta}>
                            <span>{formatDateBR(materia.start_date)}</span>
                            <span className={styles.separator}>•</span>
                            <span>Nota Máx: {materia.max_grade}</span>
                        </div>

                        {profile?.role.includes('ALUNO') && materia.current_grade !== undefined && (
                            <div className={styles.materiaGrade}>
                                <div className={styles.gradeInfo}>
                                    <span className={styles.gradeLabel}>Nota Atual</span>
                                    <span className={styles.gradeValue}>{materia.current_grade.toFixed(1)}</span>
                                </div>
                                {materia.status === 'FINALIZADO' && (
                                    <span className={`${styles.approvalBadge} ${materia.is_approved ? styles.approved : styles.reproved}`}>
                                        {materia.is_approved ? 'Aprovado' : 'Reprovado'}
                                    </span>
                                )}
                            </div>
                        )}
                    </Link>
                ))}
                {filteredMaterias.length === 0 && (
                    <p className={styles.empty}>Nenhuma matéria encontrada.</p>
                )}
            </div>
        </NavLayout>
    )
}
