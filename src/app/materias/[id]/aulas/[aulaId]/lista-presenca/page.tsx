'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile, Aula, PresencaTarefa, Materia } from '@/types/database'
import { ChevronLeft, UserX, CheckCircle2, XCircle, Users } from 'lucide-react'
import styles from './lista.module.css'
import { Spinner } from '@/components/ui/Spinner'

type StudentRow = {
    id: string
    matricula: string
    name: string
    surname: string
    isPresent: boolean
    presencaId: string | null
}

export default function ListaPresencaPage({ params }: { params: Promise<{ id: string, aulaId: string }> }) {
    const { id, aulaId } = use(params)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [aula, setAula] = useState<Aula | null>(null)
    const [studentsData, setStudentsData] = useState<StudentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    
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

            // 2. Fetch Materia and Aula
            const { data: materiaData } = await supabase.from('materias').select('*').eq('id', id).single()
            if (materiaData) setMateria(materiaData)

            const { data: aulaData } = await supabase.from('aulas').select('*').eq('id', aulaId).single()
            if (!aulaData) return
            setAula(aulaData)

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

            // 4. Fetch Presencas for this aula
            const { data: presencasData } = await supabase
                .from('presencas_tarefas')
                .select('*')
                .eq('aula_id', aulaId)

            const presencas = presencasData || []

            // 5. Build rows
            const rows: StudentRow[] = enrolledStudents.map(student => {
                const presencaRecord = presencas.find(p => p.aluno_id === student.id)
                const isPresent = presencaRecord ? presencaRecord.presence : false

                return {
                    id: student.id,
                    matricula: student.matricula || '',
                    name: student.name,
                    surname: student.surname,
                    isPresent,
                    presencaId: presencaRecord ? presencaRecord.id : null
                }
            })

            // Sort alphabetically by name
            rows.sort((a, b) => a.name.localeCompare(b.name))

            setStudentsData(rows)
            setLoading(false)
        }

        fetchData()
    }, [id, aulaId, router, supabase])

    const handleRemovePresence = async (studentId: string) => {
        if (!confirm('Deseja realmente remover a presença deste aluno? As notas das tarefas continuarão salvas.')) return

        setActionLoading(studentId)
        
        try {
            // Check if record exists
            const { data: existingRecord } = await supabase
                .from('presencas_tarefas')
                .select('id')
                .eq('aula_id', aulaId)
                .eq('aluno_id', studentId)
                .single()

            if (existingRecord) {
                const { error } = await supabase
                    .from('presencas_tarefas')
                    .update({
                        presence: false,
                        presence_grade: 0
                    })
                    .eq('id', existingRecord.id)

                if (error) throw error
            }

            // Update local state
            setStudentsData(prev => prev.map(s => {
                if (s.id === studentId) {
                    return { ...s, isPresent: false }
                }
                return s
            }))
        } catch (error) {
            console.error('Erro ao remover presença:', error)
            alert('Erro ao remover presença.')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading || !aula) return (
        <NavLayout>
            <div className={styles.loading}>
                <Spinner size={40} />
            </div>
        </NavLayout>
    )

    const presentCount = studentsData.filter(s => s.isPresent).length
    const absentCount = studentsData.length - presentCount

    return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <button className={styles.backBtn} onClick={() => router.push(`/materias/${id}`)}>
                            <ChevronLeft size={20} /> Voltar
                        </button>
                        <h1 className={styles.title}>Lista de Presença - Aula {aula.aula_number}</h1>
                    </div>
                    
                    <div className={styles.stats}>
                        <div className={`${styles.statBadge} ${styles.present}`}>
                            <Users size={16} /> Presentes: {presentCount}
                        </div>
                        <div className={`${styles.statBadge} ${styles.absent}`}>
                            <Users size={16} /> Faltantes: {absentCount}
                        </div>
                    </div>
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
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
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
                                            {student.isPresent ? (
                                                <span className={`${styles.badge} ${styles.present}`}>
                                                    <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                                    Presente
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.absent}`}>
                                                    <XCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                                    Faltante
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {student.isPresent && (
                                                <button 
                                                    className={styles.removeBtn}
                                                    onClick={() => handleRemovePresence(student.id)}
                                                    disabled={actionLoading === student.id}
                                                    style={{ marginLeft: 'auto' }}
                                                    title="Remover Presença"
                                                >
                                                    {actionLoading === student.id ? (
                                                        <Spinner size={16} />
                                                    ) : (
                                                        <>
                                                            <UserX size={16} />
                                                            Remover
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </td>
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
