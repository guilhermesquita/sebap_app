'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import MateriaCard from '@/components/ui/MateriaCard'
import { Profile, Materia } from '@/types/database'
import styles from './dashboard.module.css'
import { BookOpen, Users, Award, Calendar, Info } from 'lucide-react'
import { getMateriaStatus, formatDateBR, calculateMateriaProgress } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast, ToastType } from '@/components/ui/Toast'
import useEmblaCarousel from 'embla-carousel-react'
import { useAuthStore } from '@/store/useAuthStore'

export default function DashboardPage() {
    const { profile: storedProfile } = useAuthStore()
    const [profile, setProfile] = useState<Profile | null>(storedProfile)
    const [materiasEmAndamento, setMateriasEmAndamento] = useState<any[]>([]);
    const [minhasMaterias, setMinhasMaterias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        activeSubjects: 0,
        studentsCount: 0,
        averageGrade: 0,
        frequenciaMedia: 100,
    })
    const [toast, setToast] = useState<{ visible: boolean, message: string, type: ToastType }>({ visible: false, message: '', type: 'default' })
    const supabase = createClient()
    const [emblaRef, emblaApi] = useEmblaCarousel({
        dragFree: true,
        containScroll: 'trimSnaps',
        watchDrag: true
    })

    useEffect(() => {
        if (emblaApi) {
            emblaApi.reInit()
        }
    }, [emblaApi, minhasMaterias])

    useEffect(() => {
        if (storedProfile) {
            setProfile(storedProfile)
        }
    }, [storedProfile])

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            let activeProfile = storedProfile || profile
            if (!activeProfile) {
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

                activeProfile = profileData
                setProfile(profileData)
                useAuthStore.getState().setProfile(profileData)
            }

            if (!activeProfile) {
                setLoading(false)
                return
            }

            // Fetch materias with enrollment/teaching info
            const { data: allMaterias } = await supabase
                .from('materias')
                .select(`
                    *,
                    materia_students(aluno_id),
                    materia_professors(professor_id),
                    aulas(id, date, tasks_count, is_last_aula, presence_time_ranges)
                `)

            if (allMaterias) {
                const isAdmin = activeProfile.role.includes('ADMIN')
                const isProfessor = activeProfile.role.includes('PROFESSOR')
                const isAluno = activeProfile.role.includes('ALUNO')

                let presencas: any[] = [];
                if (isAluno) {
                    const { data: pData } = await supabase
                        .from('presencas_tarefas')
                        .select('aula_id, presence, tasks_completed')
                        .eq('aluno_id', activeProfile.id);
                    presencas = pData || [];
                }

                const updatedMaterias = allMaterias.map(m => {
                    const status = getMateriaStatus(m.start_date, m.end_date);
                    const isEnrolled = m.materia_students?.some((s: any) => s.aluno_id === activeProfile.id)
                    const isTeaching = m.materia_professors?.some((p: any) => p.professor_id === activeProfile.id)
                    const aulasCount = m.aulas?.length || 0;

                    let progress = 0;
                    const isViewingAsAdminOrProf = isAdmin || isTeaching || (!isAluno && isProfessor);

                    if (isViewingAsAdminOrProf) {
                        progress = calculateMateriaProgress({
                            ...m,
                            status,
                            aulas: m.aulas || []
                        });
                    } else if (isAluno) {
                        let totalPoints = 0;
                        let pointsAcquired = 0;
                        m.aulas?.forEach((aula: any) => {
                            totalPoints += 1 + (aula.tasks_count || 0);
                            const p = presencas.find(pr => pr.aula_id === aula.id);
                            if (p) {
                                pointsAcquired += (p.presence ? 1 : 0);
                                if (p.tasks_completed && Array.isArray(p.tasks_completed)) {
                                    pointsAcquired += p.tasks_completed.filter(Boolean).length;
                                }
                            }
                        });
                        progress = totalPoints > 0 ? Math.round((pointsAcquired / totalPoints) * 100) : (status === 'FINALIZADO' ? 100 : 0);
                    } else {
                        progress = calculateMateriaProgress({
                            ...m,
                            status,
                            aulas: m.aulas || []
                        });
                    }

                    return {
                        ...m,
                        status,
                        is_enrolled: isEnrolled,
                        is_teaching: isTeaching,
                        aulasCount,
                        progress
                    }
                })

                let andamento = updatedMaterias.filter(m => m.is_active && m.status !== 'FINALIZADO');
                let minhas = [];

                if (isAdmin) {
                    minhas = updatedMaterias;
                } else {
                    minhas = updatedMaterias.filter(m => m.is_enrolled);
                }

                const activeRelevantCount = andamento.length;
                setMateriasEmAndamento(andamento);
                setMinhasMaterias(minhas);

                if (isAluno) {
                    const totalAulas = minhas.reduce((acc, m) => acc + (m.aulasCount || 0), 0);
                    const totalPresencas = presencas.filter(p => p.presence).length;
                    const frequenciaMedia = totalAulas > 0 ? Math.round((totalPresencas / totalAulas) * 100) : 100;

                    setStats(prev => ({ ...prev, activeSubjects: activeRelevantCount, frequenciaMedia }))
                } else {
                    // For Professors and Admins
                    const { count: studentsCount } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .contains('role', ['ALUNO'])

                    const allActiveCount = updatedMaterias.filter(m => m.is_active).length;

                    setStats({
                        activeSubjects: allActiveCount,
                        studentsCount: studentsCount || 0,
                        averageGrade: 0,
                        frequenciaMedia: 0
                    })
                }
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return (
        <NavLayout>
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <Skeleton width="100%" height="200px" style={{ borderRadius: '12px', flex: 1 }} />
                <div className="flex flex-col gap-4 w-full lg:w-[300px]">
                    <Skeleton width="100%" height="92px" style={{ borderRadius: '12px' }} />
                    <Skeleton width="100%" height="92px" style={{ borderRadius: '12px' }} />
                </div>
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
            <div className="px-4 lg:px-0 w-full min-w-0">

                {/* --- DESKTOP CONTENT --- */}
                <div className="hidden lg:block w-full min-w-0">
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        {/* Welcome Card */}
                        <div className="hidden lg:flex flex-1 bg-white border border-secondary rounded-[12px] p-6 relative overflow-hidden flex-col justify-between min-h-[200px]">
                            <div className="z-10">
                                <p className="text-brown-600 text-captionLarge font-light mb-1">Bom dia, {profile.name}.</p>
                                <h1 className="text-brown-500 text-headline1 lg:text-headline1 font-extrabold max-w-[900px] leading-tight">Pronto para aprofundar seus estudos?</h1>
                            </div>

                            <div className="z-10 mt-6 lg:mt-12">
                                <button
                                    className="bg-brown-500 text-white rounded-[6px] px-4 py-3 flex items-center gap-4 hover:bg-brown-400 transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(profile.matricula || '');
                                        setToast({ visible: true, message: 'Matrícula copiada', type: 'success' });
                                    }}
                                    title="Copiar Matrícula"
                                >
                                    <span className="text-caption font-semibold">Matrícula: {profile.matricula}</span>
                                    <Image src="/icons/dashboard/copy-icon.svg" alt="Copiar" width={14} height={14} />
                                </button>
                            </div>

                            {/* Watermark */}
                            <div className="absolute -bottom-1 -right-1 opacity-10 pointer-events-none select-none">
                                <Image src="/icons/dashboard/book-icon.svg" alt="" width={120} height={120} />
                            </div>
                        </div>

                        {/* Right side stats */}
                        <div className="flex flex-col gap-4 w-full lg:w-[320px]">
                            {profile.role.includes('ALUNO') && !profile.role.includes('ADMIN') ? (
                                <>
                                    {/* Frequência média */}
                                    <div className="bg-white border border-secondary rounded-[12px] p-5 flex flex-col gap-3 justify-between flex-1 min-h-[92px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#EAE1D8] flex items-center justify-center">
                                                <Image src="/icons/dashboard/student-icon.svg" alt="Frequência" width={16} height={16} />
                                            </div>
                                            <span className="text-[#4D453E] text-caption font-semibold uppercase tracking-wider">Frequência média</span>
                                        </div>
                                        <div className="flex flex-col gap-2 mt-1">
                                            <span className="text-success text-3xl font-extrabold">{stats.frequenciaMedia}%</span>
                                            <div className="w-full bg-[#EAE1D8] rounded-full h-2">
                                                <div className="bg-success h-2 rounded-full" style={{ width: `${stats.frequenciaMedia}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Minhas matérias */}
                                    <div className="bg-white border border-secondary rounded-[12px] p-5 flex flex-col gap-3 justify-between flex-1 min-h-[92px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#F3E7C9] flex items-center justify-center">
                                                <Image src="/icons/dashboard/folder-icon.svg" alt="Minhas Matérias" width={16} height={16} />
                                            </div>
                                            <span className="text-[#4D453E] text-caption font-semibold uppercase tracking-wider">Minhas matérias</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-brown-500 text-3xl font-extrabold">
                                                {minhasMaterias.length}
                                            </span>
                                            <span className="text-[#4D453E] text-captionMedium font-medium">totais</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Alunos ativos */}
                                    <div className="bg-white border border-secondary rounded-[12px] p-5 flex flex-col gap-3 justify-between flex-1 min-h-[92px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#EAE1D8] flex items-center justify-center">
                                                <Image src="/icons/dashboard/student-icon.svg" alt="Alunos" width={16} height={16} />
                                            </div>
                                            <span className="text-[#4D453E] text-caption font-semibold uppercase tracking-wider">Alunos ativos</span>
                                        </div>
                                        <span className="text-success text-3xl font-extrabold">{stats.studentsCount || 0}</span>
                                    </div>

                                    {/* Matérias registradas */}
                                    <div className="bg-white border border-secondary rounded-[12px] p-5 flex flex-col gap-3 justify-between flex-1 min-h-[92px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#F3E7C9] flex items-center justify-center">
                                                <Image src="/icons/dashboard/folder-icon.svg" alt="Matérias" width={16} height={16} />
                                            </div>
                                            <span className="text-[#4D453E] text-caption font-semibold  uppercase tracking-wider">Matérias registradas</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-brown-500 text-3xl font-extrabold">{stats.activeSubjects || 0}</span>
                                            <span className="text-[#4D453E] text-captionMedium font-medium">ativas</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {materiasEmAndamento.length > 0 && (
                        <section className="mb-10">
                            <div className="flex justify-between items-end mb-4 border-b border-[#D6C8B8] pb-2">
                                <h2 className="text-[#3A332C] text-xl font-bold">Matérias em andamento</h2>
                                <Link href="/materias" className="text-[#8C7A6B] text-[13px] hover:text-[#3A332C] transition-colors">
                                    Ver todas &gt;
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {materiasEmAndamento.map(materia => (
                                    <MateriaCard
                                        key={materia.id}
                                        materia={materia}
                                        aulasCount={materia.aulasCount || 0}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mb-10">
                        <div className="flex justify-between items-end mb-4 border-b border-[#D6C8B8] pb-2">
                            <h2 className="text-[#3A332C] text-xl font-bold">Minhas matérias</h2>
                            <Link href="/materias" className="text-[#8C7A6B] text-[13px] hover:text-[#3A332C] transition-colors">
                                Ver todas &gt;
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {minhasMaterias.length > 0 ? (
                                minhasMaterias.map(materia => {
                                    const isFinalized = materia.status === 'FINALIZADO';
                                    const canAccess = !isFinalized || materia.is_enrolled || profile.role.includes('ADMIN');
                                    return (
                                        <MateriaCard
                                            key={materia.id}
                                            materia={materia}
                                            aulasCount={materia.aulasCount || 0}
                                            disabled={!canAccess}
                                        />
                                    )
                                })
                            ) : (
                                <p className="text-[#8C7A6B] col-span-full">Nenhuma matéria encontrada.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* --- MOBILE CONTENT --- */}
                <div className="lg:hidden flex flex-col gap-6 w-full min-w-0">
                    {/* Matérias em andamento (Big Card) */}
                    {materiasEmAndamento.length > 0 && (
                        <section>
                            <div className="flex justify-between items-end mb-3 pb-2">
                                <h2 className="text-[#3A332C] text-[16px] font-bold">Matérias em andamento</h2>
                            </div>
                            <Link href={`/materias/${materiasEmAndamento[0].id}`} className="block w-full bg-white border border-secondary rounded-[12px] overflow-hidden shadow-sm">
                                <div className="relative w-full h-[140px] bg-[#EAE1D8]">
                                    <Image src={materiasEmAndamento[0].banner_url || "/banner/default_banner.webp"} alt={materiasEmAndamento[0].name} fill className="object-cover" unoptimized />
                                    <div className="absolute top-3 right-3 bg-white rounded-md px-2 py-1 shadow-sm">
                                        <span className="text-[10px] font-medium text-[#4D453E]">Nova Matéria</span>
                                    </div>
                                </div>
                                <div className="p-4 pb-5">
                                    <h3 className="text-[#3A332C] font-bold text-lg mb-4">{materiasEmAndamento[0].name}</h3>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center text-[11px] font-semibold text-[#4D453E]">
                                            <span>Progresso</span>
                                            <span className="text-black">{materiasEmAndamento[0].progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-[#EAE1D8] rounded-full h-[3px]">
                                            <div className="bg-[#4D453E] h-[3px] rounded-full" style={{ width: `${materiasEmAndamento[0].progress || 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </section>
                    )}

                    {/* Minhas matérias (Horizontal Scroll) */}
                    {minhasMaterias.length > 0 && (
                        <section className="w-full min-w-0">
                            <div className="flex justify-between items-end mb-3 pb-2">
                                <h2 className="text-[#3A332C] text-[16px] font-bold">Minhas matérias</h2>
                            </div>
                            <div className="overflow-hidden w-full select-none" ref={emblaRef}>
                                <div 
                                    className="flex gap-4 pb-4 touch-pan-y"
                                    style={{ touchAction: 'pan-y pinch-zoom' }}
                                >
                                    {minhasMaterias.map(materia => (
                                        <div key={materia.id} className="flex-[0_0_200px] min-w-0 select-none">
                                            <Link 
                                                href={`/materias/${materia.id}`} 
                                                draggable={false}
                                                className="block w-full bg-white border border-secondary rounded-[12px] p-4 flex flex-col justify-between shadow-sm min-h-[140px] select-none touch-pan-y"
                                            >
                                                <h3 className="text-[#3A332C] font-bold text-[15px] leading-tight mb-6 pointer-events-none">{materia.name}</h3>
                                                <div className="flex flex-col gap-1.5 mt-auto pointer-events-none">
                                                    <div className="flex justify-between items-center text-[10px] font-semibold text-[#4D453E]">
                                                        <span>Progresso</span>
                                                        <span className="text-black">{materia.progress || 0}%</span>
                                                    </div>
                                                    <div className="w-full bg-[#EAE1D8] rounded-full h-[3px]">
                                                        <div className="bg-[#4D453E] h-[3px] rounded-full" style={{ width: `${materia.progress || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="w-full h-[1px] bg-[#D0C5BB] my-1"></div>

                    {/* Stats List */}
                    <div className="flex flex-col gap-3 mb-6">
                        {profile.role.includes('ALUNO') && !profile.role.includes('ADMIN') ? (
                            <>
                                <div className="bg-white border border-secondary rounded-[12px] p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-[42px] h-[42px] rounded-[10px] bg-[#A89885] flex items-center justify-center">
                                            <Image src="/icons/dashboard/student-icon.svg" alt="Frequência" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[#8C7A6B] text-[12px] leading-none">Frequência média</span>
                                            <span className="text-black text-[16px] font-extrabold leading-none">{stats.frequenciaMedia}%</span>
                                        </div>
                                    </div>
                                    {/* <div className="text-[#8C7A6B] font-bold mr-2">&gt;</div> */}
                                </div>
                                <div className="bg-white border border-secondary rounded-[12px] p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-[42px] h-[42px] rounded-[10px] bg-[#A89885] flex items-center justify-center">
                                            <Image src="/icons/dashboard/folder-icon.svg" alt="Minhas Matérias" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[#8C7A6B] text-[12px] leading-none">Minhas Matérias</span>
                                            <span className="text-black text-[16px] font-extrabold leading-none">{minhasMaterias.length}</span>
                                        </div>
                                    </div>
                                    {/* <div className="text-[#8C7A6B] font-bold mr-2">&gt;</div> */}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white border border-secondary rounded-[12px] p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-[42px] h-[42px] rounded-[10px] bg-[#A89885] flex items-center justify-center">
                                            <Image src="/icons/dashboard/student-icon.svg" alt="Alunos" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[#8C7A6B] text-[12px] leading-none">Alunos ativos</span>
                                            <span className="text-black text-[16px] font-extrabold leading-none">{stats.studentsCount || 0}</span>
                                        </div>
                                    </div>
                                    {/* <div className="text-[#8C7A6B] font-bold mr-2">&gt;</div> */}
                                </div>
                                <div className="bg-white border border-secondary rounded-[12px] p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-[42px] h-[42px] rounded-[10px] bg-[#A89885] flex items-center justify-center">
                                            <Image src="/icons/dashboard/folder-icon.svg" alt="Matérias" width={20} height={20} className="brightness-0 invert" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[#8C7A6B] text-[12px] leading-none uppercase">Matérias registradas</span>
                                            <span className="text-black text-[16px] font-extrabold leading-none">{stats.activeSubjects || 0}</span>
                                        </div>
                                    </div>
                                    {/* <div className="text-[#8C7A6B] font-bold mr-2">&gt;</div> */}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <Toast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                />
            </div>
        </NavLayout>
    )
}
