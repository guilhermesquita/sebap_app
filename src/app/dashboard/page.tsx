'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia } from '@/types/database'
import styles from './dashboard.module.css'
import { BookOpen, Users, Award, Calendar } from 'lucide-react'
import { getMateriaStatus } from '@/lib/utils'
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

            // Fetch materias
            const { data: allMaterias } = await supabase.from('materias').select('*')

            if (allMaterias) {
                // Update all materias with calculated status
                const updatedMaterias = allMaterias.map(m => ({
                    ...m,
                    status: getMateriaStatus(m.start_date, m.end_date)
                }))

                const isAdmin = profileData.role.includes('ADMIN')

                // For ADMIN, show all. For others, show only active.
                const visibleMaterias = isAdmin
                    ? updatedMaterias
                    : updatedMaterias.filter(m => m.is_active)

                if (profileData.role.includes('ALUNO')) {
                    const active = visibleMaterias.filter(m => m.status === 'EM_PROGRESSO')
                    setMaterias(active)
                    setStats(prev => ({ ...prev, activeSubjects: active.length }))
                } else {
                    const { count: studentsCount } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .contains('role', ['ALUNO'])

                    setMaterias(visibleMaterias)
                    setStats({
                        activeSubjects: visibleMaterias.filter(m => m.status === 'EM_PROGRESSO').length,
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
                    {materias.length > 0 ? materias.map(materia => (
                        <Link href={`/materias/${materia.id}`} key={materia.id} className={`${styles.subjectCard} ${!materia.is_active ? styles.inactive : ''}`}>
                            <div className={styles.subjectHeader}>
                                <h3 className={styles.subjectName}>
                                    {materia.name}
                                    {!materia.is_active && <span className={styles.inactiveTag}>(Desativada)</span>}
                                </h3>
                                <span className={`${styles.statusBadge} ${styles[materia.status]}`}>
                                    {materia.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className={styles.subjectDetails}>
                                <div className={styles.detailItem}>
                                    <Calendar size={16} />
                                    <span>Início: {new Date(materia.start_date!).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <BookOpen size={16} />
                                    <span>Nota Máxima: {materia.max_grade}</span>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <p className={styles.emptyMessage}>Nenhuma matéria encontrada.</p>
                    )}
                </div>
            </section>
        </NavLayout>
    )
}
