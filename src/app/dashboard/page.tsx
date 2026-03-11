'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia } from '@/types/database'
import styles from './dashboard.module.css'
import { BookOpen, Users, Award, Calendar, Info } from 'lucide-react'
import { getMateriaStatus, formatDateBR } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [materias, setMaterias] = useState<Materia[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        activeSubjects: 0,
        studentsCount: 0,
        averageGrade: 0,
    })
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError || !profileData) {
                console.error("Profile fetch error:", profileError)
                setLoading(false)
                return
            }

            setProfile(profileData)

            // Fetch materias with enrollment/teaching info
            const { data: allMaterias } = await supabase
                .from('materias')
                .select(`
                    *,
                    materia_students(aluno_id),
                    materia_professors(professor_id)
                `)

            if (allMaterias) {
                const isAdmin = profileData.role.includes('ADMIN')
                const isProfessor = profileData.role.includes('PROFESSOR')
                const isAluno = profileData.role.includes('ALUNO')

                // Update all materias with calculated status
                const updatedMaterias = allMaterias.map(m => ({
                    ...m,
                    status: getMateriaStatus(m.start_date, m.end_date)
                }))

                // Determine relevant materias (all active subjects in progress or coming soon)
                const dashboardList = updatedMaterias
                    .filter(m => m.is_active && (m.status === 'EM_PROGRESSO' || m.status === 'EM_BREVE'))
                    .map(m => {
                        const isEnrolled = (m as any).materia_students?.some((s: any) => s.aluno_id === user.id)
                        const isTeaching = (m as any).materia_professors?.some((p: any) => p.professor_id === user.id)
                        return {
                            ...m,
                            is_enrolled: isEnrolled,
                            is_teaching: isTeaching
                        }
                    })

                // For the stats card "Matérias em Progresso", count only relevant & active ones
                const activeRelevantCount = updatedMaterias.filter(m => {
                    const isEnrolled = (m as any).materia_students?.some((s: any) => s.aluno_id === user.id)
                    const isTeaching = (m as any).materia_professors?.some((p: any) => p.professor_id === user.id)
                    return m.status === 'EM_PROGRESSO' && m.is_active && (isEnrolled || isTeaching)
                }).length

                if (isAluno) {
                    setMaterias(dashboardList)
                    setStats(prev => ({ ...prev, activeSubjects: activeRelevantCount }))
                } else {
                    // For Professors and Admins
                    const { count: studentsCount } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .contains('role', ['ALUNO'])

                    setMaterias(dashboardList)
                    setStats({
                        activeSubjects: activeRelevantCount,
                        studentsCount: studentsCount || 0,
                        averageGrade: 0
                    })
                }
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return (
        <NavLayout>
            <div className={styles.header}>
                <Skeleton width="200px" height="60px" />
                <Skeleton width="100px" height="30px" />
            </div>
            <div className={styles.statsGrid}>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} width="100%" height="100px" style={{ borderRadius: '20px' }} />
                ))}
            </div>
            <section className={styles.section}>
                <Skeleton width="250px" height="30px" style={{ marginBottom: '24px' }} />
                <div className={styles.subjectList}>
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} width="100%" height="120px" style={{ borderRadius: '24px' }} />
                    ))}
                </div>
            </section>
        </NavLayout>
    )
    if (!profile) return (
        <NavLayout>
            <div className={styles.errorContainer}>
                <h2>Perfil não encontrado</h2>
                <p>Ocorreu um erro ao carregar seus dados ou seu perfil ainda não foi configurado.</p>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className={styles.logoutBtn}>Sair e tentar novamente</button>
            </div>
        </NavLayout>
    )

    return (
        <NavLayout>
            <div className={styles.header}>
                <div className={styles.welcome}>
                    <span className={styles.accentText}>Bem vindo,</span>
                    <h1 className={styles.userName}>{profile.name} {profile.surname}</h1>
                </div>
                <div className={styles.roleTag}>{profile.role.join(' & ')}</div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.blue}`}>
                        <BookOpen size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Matérias em Progresso</span>
                        <span className={styles.statValue}>{stats.activeSubjects}</span>
                    </div>
                </div>

                {!profile.role.includes('ALUNO') && (
                    <div className={styles.statCard}>
                        <div className={`${styles.iconBox} ${styles.green}`}>
                            <Users size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Alunos Matriculados</span>
                            <span className={styles.statValue}>{stats.studentsCount}</span>
                        </div>
                    </div>
                )}

                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.gold}`}>
                        <Award size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Status Acadêmico</span>
                        <span className={styles.statValue}>Regular</span>
                    </div>
                </div>
            </div>

            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Próximas Matérias</h2>
                </div>

                <div className={styles.subjectList}>
                    {materias.length > 0 ? materias.map(materia => {
                        const isFinalized = materia.status === 'FINALIZADO';
                        const isEnrolled = !!(materia.is_enrolled || materia.is_teaching);
                        const canAccess = !isFinalized || isEnrolled || profile.role.includes('ADMIN');

                        const CardContent = (
                            <div className={`${styles.subjectCard} ${!materia.is_active ? styles.inactive : ''} ${!canAccess ? styles.lockedCard : ''}`}>
                                <div className={styles.subjectHeader}>
                                    <h3 className={styles.subjectName}>
                                        {materia.name}
                                        {!materia.is_active && <span className={styles.inactiveTag}>(Desativada)</span>}
                                    </h3>
                                    <div className={styles.badgeGroup}>
                                        <span className={`${styles.statusBadge} ${styles[materia.status]}`}>
                                            {materia.status.replace('_', ' ')}
                                        </span>
                                        <span className={`${styles.enrollmentBadge} ${profile.role.includes('PROFESSOR')
                                            ? (materia.is_teaching ? styles.enrolled : styles.notEnrolled)
                                            : (materia.is_enrolled ? styles.enrolled : styles.notEnrolled)
                                            }`}>
                                            {profile.role.includes('PROFESSOR')
                                                ? (materia.is_teaching ? 'Leciona' : 'Não Leciona')
                                                : (materia.is_enrolled ? 'Matriculado' : 'Não Matriculado')
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.subjectDetails}>
                                    <div className={styles.detailItem}>
                                        <Calendar size={16} />
                                        <span>Início: {formatDateBR(materia.start_date)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <BookOpen size={16} />
                                        <span>Nota Máxima: {materia.max_grade}</span>
                                    </div>
                                </div>
                                {!canAccess && (
                                    <div className={styles.lockOverlay}>
                                        <Info size={16} />
                                        <span>Matrícula encerrada para esta matéria finalizada</span>
                                    </div>
                                )}
                            </div>
                        );

                        return canAccess ? (
                            <Link href={`/materias/${materia.id}`} key={materia.id}>
                                {CardContent}
                            </Link>
                        ) : (
                            <div key={materia.id} className={styles.disabledWrapper}>
                                {CardContent}
                            </div>
                        );
                    }) : (
                        <p className={styles.emptyMessage}>Nenhuma matéria encontrada.</p>
                    )}
                </div>
            </section>
        </NavLayout>
    )
}
