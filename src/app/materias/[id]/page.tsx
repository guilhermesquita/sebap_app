'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia, Aula, PresencaTarefa, StudentTaskGrade, AulaTask } from '@/types/database'
import { ChevronRight, FileText, Link as LinkIcon, CheckCircle, XCircle, Plus, ClipboardList, Info, Award, Edit, Search, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import styles from './detail.module.css'
import { getMateriaStatus, formatStatus, formatDateBR } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'

export default function MateriaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [aulas, setAulas] = useState<Aula[]>([])
    const [presencas, setPresencas] = useState<PresencaTarefa[]>([])
    const [professors, setProfessors] = useState<Profile[]>([])
    const [isProfessorOfSubject, setIsProfessorOfSubject] = useState(false)
    const [isEnrolled, setIsEnrolled] = useState(false)
    const [enrollLoading, setEnrollLoading] = useState(false)
    const [loading, setLoading] = useState(true)

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

    const supabase = createClient()

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
            const { data: materiaData } = await supabase
                .from('materias')
                .select('*')
                .eq('id', id)
                .single()

            if (materiaData) {
                materiaData.status = getMateriaStatus(materiaData.start_date, materiaData.end_date)
                setMateria(materiaData)
                await fetchProfessors()
            }

            // Fetch Aulas
            const { data: aulasData } = await supabase
                .from('aulas')
                .select('*')
                .eq('materia_id', id)
                .order('aula_number', { ascending: true })
            setAulas(aulasData || [])

            // Fetch Tasks for the whole materia
            if (aulasData && aulasData.length > 0) {
                const { data: tasksData } = await supabase
                    .from('aula_tasks')
                    .select('*')
                    .in('aula_id', aulasData.map(a => a.id))
                setAllTasks(tasksData || [])
            }

            // Fetch Presencas and Grades if student
            if (profileData?.role.includes('ALUNO')) {
                const { data: presData } = await supabase
                    .from('presencas_tarefas')
                    .select('*')
                    .eq('aluno_id', user.id)
                    .in('aula_id', aulasData?.map(a => a.id) || [])
                setPresencas(presData || [])

                // Fetch task grades
                const { data: gradesData } = await supabase
                    .from('student_task_grades')
                    .select('*')
                    .eq('aluno_id', user.id)
                setStudentTaskGrades(gradesData || [])

                // Fetch final exam grade
                const { data: finalData } = await supabase
                    .from('notas_finais')
                    .select('final_exam_grade')
                    .eq('materia_id', id)
                    .eq('aluno_id', user.id)
                    .single()
                if (finalData) setFinalExamGrade(Number(finalData.final_exam_grade))
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

    const removeProfessor = async (professorId: string) => {
        if (!confirm('Tem certeza que deseja remover este professor da matéria?')) return

        const { error } = await supabase
            .from('materia_professors')
            .delete()
            .eq('materia_id', id)
            .eq('professor_id', professorId)

        if (error) {
            alert('Erro ao remover professor: ' + error.message)
        } else {
            await fetchProfessors()
        }
    }

    const enrollInMateria = async () => {
        if (!profile) return
        setEnrollLoading(true)
        const { error } = await supabase
            .from('materia_students')
            .insert({
                materia_id: id,
                aluno_id: profile.id
            })

        if (error) {
            alert('Erro ao se matricular: ' + error.message)
        } else {
            setIsEnrolled(true)
            // Trigger a refresh or just update state
            window.location.reload() // Reload to fetch all data correctly (grades, etc)
        }
        setEnrollLoading(false)
    }

    const isPresenceOpen = (aula: Aula) => {
        if (!aula.presence_time_ranges || aula.presence_time_ranges.length === 0) return false;

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (aula.date !== today) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        return aula.presence_time_ranges.some(range => {
            if (!range.start || !range.end) return false;
            const [startH, startM] = range.start.split(':').map(Number);
            const [endH, endM] = range.end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        });
    }

    const isPresenceFinished = (aula: Aula) => {
        if (!aula.date) return false;

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (aula.date < today) return true;
        if (aula.date > today) return false;

        // Today: check if last window has passed
        if (!aula.presence_time_ranges || aula.presence_time_ranges.length === 0) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const lastWindowEnd = Math.max(...aula.presence_time_ranges.map(range => {
            const [h, m] = (range.end || "00:00").split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        }));

        return currentMinutes > lastWindowEnd;
    }

    const openPresenceModal = (aula: Aula) => {
        setPresenceAula(aula);

        // Find previous tasks using chronological order
        const currentIndex = aulas.findIndex(a => a.id === aula.id);
        const prevAula = currentIndex > 0 ? aulas[currentIndex - 1] : null;

        if (prevAula) {
            const tasks = allTasks.filter(t => t.aula_id === prevAula.id);
            setPreviousTasksForPresence(tasks);
            const initialGrades: { [key: string]: boolean } = {};
            tasks.forEach(t => initialGrades[t.id] = false);
            setStudentTaskGradesInput(initialGrades);
        } else {
            setPreviousTasksForPresence([]);
            setStudentTaskGradesInput({});
        }

        setStudentFinalGradeInput(0);
        setPresenceModalOpen(true);
    }

    const confirmPresence = async () => {
        if (!profile || !presenceAula) return;
        setSubmittingPresence(presenceAula.id);

        try {
            const { error: presError } = await supabase
                .from('presencas_tarefas')
                .upsert({
                    aula_id: presenceAula.id,
                    aluno_id: profile.id,
                    presence: true,
                    presence_grade: presenceAula.presence_max_grade || 0,
                }, { onConflict: 'aula_id,aluno_id' })

            if (presError) throw presError;

            if (previousTasksForPresence.length > 0) {
                const gradesToUpsert = previousTasksForPresence.map(t => ({
                    task_id: t.id,
                    aluno_id: profile.id,
                    grade: studentTaskGradesInput[t.id] ? t.max_grade : 0
                }));

                const { error: gradesError } = await supabase
                    .from('student_task_grades')
                    .upsert(gradesToUpsert, { onConflict: 'task_id,aluno_id' });

                if (gradesError) throw gradesError;
            }

            if (presenceAula.is_last_aula && materia?.has_final_exam) {
                const { error: gradeError } = await supabase
                    .from('notas_finais')
                    .upsert({
                        materia_id: id,
                        aluno_id: profile.id,
                        final_exam_grade: studentFinalGradeInput,
                    }, { onConflict: 'materia_id,aluno_id' });

                if (gradeError) throw gradeError;
            }

            alert('Presença e notas confirmadas com sucesso!');
            window.location.reload();
        } catch (err: any) {
            alert('Erro ao dar presença/notas: ' + err.message);
        } finally {
            setSubmittingPresence(null);
            setPresenceModalOpen(false);
            setPresenceAula(null);
        }
    }

    if (loading) return (
        <NavLayout>
            <Skeleton className={styles.bannerSkeleton} />
            <div className={styles.header}>
                <div className={styles.materiaInfo}>
                    <Skeleton width="300px" height="50px" style={{ marginBottom: '10px' }} />
                    <Skeleton width="150px" height="20px" />
                </div>
            </div>
            <div className={styles.contentGrid}>
                <div className={styles.aulasSection}>
                    <Skeleton width="200px" height="30px" style={{ marginBottom: '32px' }} />
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} width="100%" height="200px" style={{ marginBottom: '24px', borderRadius: '28px' }} />
                    ))}
                </div>
                <div className={styles.sideInfo}>
                    <Skeleton width="100%" height="300px" style={{ borderRadius: '28px' }} />
                    <Skeleton width="100%" height="200px" style={{ borderRadius: '28px' }} />
                </div>
            </div>
        </NavLayout>
    )
    if (!materia) return <div className={styles.error}>Matéria não encontrada.</div>

    const isAdmin = profile?.role.includes('ADMIN');
    const canManageAulas = isAdmin || isProfessorOfSubject;
    const isStudent = profile?.role.includes('ALUNO');

    // Calculate Grades
    const totalTasksPossible = allTasks.reduce((acc, t) => acc + Number(t.max_grade), 0)
    const totalPresencePossible = aulas.reduce((acc, a) => acc + Number(a.presence_max_grade || 0), 0)

    const totalTasksPossibleNum = isNaN(totalTasksPossible) ? 0 : totalTasksPossible
    const totalPresencePossibleNum = isNaN(totalPresencePossible) ? 0 : totalPresencePossible

    const totalTasksEarned = studentTaskGrades
        .filter(g => allTasks.some(t => t.id === g.task_id))
        .reduce((acc, g) => acc + Number(g.grade), 0)

    const totalPresenceEarned = presencas.reduce((acc, p) => acc + Number(p.presence_grade || 0), 0)

    const finalGradeTotal = totalTasksEarned + totalPresenceEarned + (finalExamGrade || 0)
    const totalPointsPossible = totalTasksPossibleNum + totalPresencePossibleNum

    return (
        <NavLayout>
            {materia.banner_url && (
                <div className={styles.bannerContainer}>
                    <img
                        src={materia.banner_url}
                        alt={`${materia.name} banner`}
                        className={styles.banner}
                    />
                </div>
            )}
            <div className={styles.header}>
                <div className={styles.materiaInfo}>
                    <h1 className={styles.title}>{materia.name}</h1>
                    <div className={styles.statusGroup}>
                        <p className={styles.status}>Status: <strong>{materia.status.replace('_', ' ')}</strong></p>
                        {isStudent && !isEnrolled && (
                            <span className={styles.notEnrolledBadge}>Você não está matriculado</span>
                        )}
                    </div>
                    {materia.description && <p className={styles.description}>{materia.description}</p>}
                    {isStudent && !isEnrolled && materia.status !== 'FINALIZADO' && (
                        <button
                            className={styles.enrollBtn}
                            onClick={enrollInMateria}
                            disabled={enrollLoading}
                        >
                            {enrollLoading ? 'Processando...' : 'Quero me matricular'}
                        </button>
                    )}
                    {isStudent && !isEnrolled && materia.status === 'FINALIZADO' && (
                        <p className={styles.noticeFinalized}>
                            Matrículas encerradas para esta matéria finalizada.
                        </p>
                    )}
                </div>
                {canManageAulas && (
                    <div className={styles.headerActions}>
                        <Link href={`/materias/${id}/editar-materia`} className={styles.editSubjectBtn} title="Editar Matéria">
                            <Edit size={20} /> Editar
                        </Link>
                        <Link href={`/materias/${id}/nova-aula`} className={styles.addAulaBtn}>
                            <Plus size={20} /> Nova Aula
                        </Link>
                    </div>
                )}
            </div>

            <div className={styles.contentGrid}>
                <section className={styles.aulasSection}>
                    <h2 className={styles.sectionTitle}>Aulas</h2>
                    {!isEnrolled && isStudent ? (
                        <div className={styles.lockedSection}>
                            <Info size={48} />
                            <h3>Conteúdo Bloqueado</h3>
                            {materia.status === 'FINALIZADO' ? (
                                <p>Esta matéria já foi finalizada e o acesso é restrito apenas a alunos que estavam matriculados.</p>
                            ) : (
                                <>
                                    <p>Você precisa estar matriculado nesta matéria para acessar o cronograma de aulas e materiais.</p>
                                    <button
                                        className={styles.enrollBtnLarge}
                                        onClick={enrollInMateria}
                                        disabled={enrollLoading}
                                    >
                                        {enrollLoading ? 'Processando...' : 'Quero me matricular'}
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.aulasList}>
                            {aulas.length > 0 ? aulas.map(aula => {
                                const presenca = presencas.find(p => p.aula_id === aula.id)
                                const aulaTasks = allTasks.filter(t => t.aula_id === aula.id)

                                return (
                                    <div key={aula.id} className={styles.aulaCard}>
                                        <div className={styles.aulaHeader}>
                                            <div className={styles.aulaTitleGroup}>
                                                <h3 className={styles.aulaTitle}>AULA {aula.aula_number} {aula.is_last_aula && '(ÚLTIMA)'}</h3>
                                                <span className={styles.aulaDate}>{formatDateBR(aula.date)}</span>
                                            </div>
                                            {canManageAulas ? (
                                                <div className={styles.aulaActions}>
                                                    <Link href={`/materias/${id}/aulas/${aula.id}/editar`} className={styles.editBtn} title="Editar Aula">
                                                        <Edit size={18} />
                                                    </Link>
                                                    <Link href={`/materias/${id}/aulas/${aula.id}/presenca`} className={styles.presenceBtn}>
                                                        <ClipboardList size={18} /> Lançar Presença
                                                    </Link>
                                                </div>
                                            ) : (
                                                presenca?.presence ? (
                                                    <span className={styles.checked}><CheckCircle size={18} /> Presente</span>
                                                ) : isPresenceOpen(aula) ? (
                                                    <button
                                                        className={styles.givePresenceBtn}
                                                        onClick={() => openPresenceModal(aula)}
                                                        disabled={submittingPresence === aula.id}
                                                    >
                                                        <Clock size={16} /> Dar Presença
                                                    </button>
                                                ) : isPresenceFinished(aula) ? (
                                                    <span className={styles.absent}><XCircle size={18} /> Faltante</span>
                                                ) : null
                                            )}
                                        </div>

                                        <div className={styles.aulaContent}>
                                            <div className={styles.aulaDescription}>
                                                {aulaTasks.length > 0 && (
                                                    <p className={styles.tasksSummary}>
                                                        Tarefas atribuídas: <strong>{aulaTasks.length}</strong> (Vale {aulaTasks.reduce((acc, t: any) => acc + Number(t.max_grade), 0)} pts)
                                                    </p>
                                                )}
                                            </div>

                                            {(aula.uploads?.length > 0 || aula.links?.length > 0) && (
                                                <div className={styles.resourcesGrid}>
                                                    {aula.uploads?.length > 0 && (
                                                        <div className={styles.resources}>
                                                            <h4 className={styles.resourceTitle}>Materiais</h4>
                                                            <div className={styles.resourceList}>
                                                                {aula.uploads.map((url, i) => {
                                                                    const urlParts = url.split('/')
                                                                    const rawName = urlParts[urlParts.length - 1]
                                                                    const fileName = rawName.split('_').slice(0, -1).join('_') || 'Material'
                                                                    const fileExt = rawName.split('.').pop()

                                                                    return (
                                                                        <a href={url} key={i} target="_blank" className={styles.resourceLink}>
                                                                            <FileText size={16} /> {decodeURIComponent(fileName)}.{fileExt}
                                                                        </a>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {aula.links?.length > 0 && (
                                                        <div className={styles.resources}>
                                                            <h4 className={styles.resourceTitle}>Links Úteis</h4>
                                                            <div className={styles.resourceList}>
                                                                {aula.links.map((link, i) => (
                                                                    <a href={link} key={i} target="_blank" className={styles.resourceLink}>
                                                                        <LinkIcon size={16} /> Link Externo
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }) : (
                                <p className={styles.empty}>Nenhuma aula cadastrada ainda.</p>
                            )}
                        </div>
                    )}
                </section>

                <aside className={styles.sideInfo}>
                    <div className={styles.infoCard}>
                        <h3 className={styles.infoTitle}>Informações Gerais</h3>
                        <div className={styles.infoItem}>
                            <span>Status</span>
                            <span className={`${styles.badge} ${styles[materia.status]}`}>
                                {formatStatus(materia.status)}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span>Min/Max Nota</span>
                            <strong>{materia.min_grade} / {materia.max_grade}</strong>
                        </div>
                        <div className={styles.infoItem}>
                            <span>Início</span>
                            <strong>{formatDateBR(materia.start_date)}</strong>
                        </div>
                        <div className={styles.infoItem}>
                            <span>Término</span>
                            <strong>{formatDateBR(materia.end_date)}</strong>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.profHeader}>
                            <h3 className={styles.infoTitle}>Professores</h3>
                            {isAdmin && (
                                <button className={styles.addProfBtn} onClick={() => setIsModalOpen(true)} title="Adicionar Professor">
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>
                        <div className={styles.professorList}>
                            {professors.map(p => (
                                <div key={p.id} className={styles.profItem}>
                                    <div className={styles.profInfo}>
                                        <div className={styles.profAvatar}>
                                            {p.profile_image_url ? (
                                                <img src={p.profile_image_url} alt={`${p.name} ${p.surname}`} />
                                            ) : (
                                                <>{p.name[0]}{p.surname[0]}</>
                                            )}
                                        </div>
                                        <div className={styles.profName}>
                                            {p.name} {p.surname}
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button className={styles.removeProfBtn} onClick={() => removeProfessor(p.id)} title="Remover Professor">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {professors.length === 0 && <p className={styles.emptySmall}>Sem professores atribuídos.</p>}
                        </div>
                    </div>

                    {materia.has_final_exam && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.infoTitle}>
                                <Award size={20} className={styles.examIcon} /> Prova Final
                            </h3>
                            <div className={styles.examInfo}>
                                <strong>{materia.final_exam_name}</strong>
                                {materia.final_exam_description && (
                                    <p className={styles.examDesc}>{materia.final_exam_description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {!canManageAulas && (
                        <div className={styles.gradesCard}>
                            <h3 className={styles.gradeTitle}>Minhas Notas</h3>
                            <div className={styles.gradeCircle}>
                                <span className={styles.gradeValue}>{finalGradeTotal.toFixed(1)}</span>
                                <span className={styles.gradeLabel}>Total</span>
                            </div>
                            <div className={styles.gradeMeta}>
                                <div className={styles.metaItem}>
                                    <span>Tarefas</span>
                                    <span>{totalTasksEarned.toFixed(1)} / {totalTasksPossibleNum.toFixed(1)}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span>Presenças</span>
                                    <span>{totalPresenceEarned.toFixed(1)} / {totalPresencePossibleNum.toFixed(1)}</span>
                                </div>
                                {materia.has_final_exam && (
                                    <div className={styles.metaItem}>
                                        <span>Prova Final</span>
                                        <span>{(finalExamGrade || 0).toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                            {finalGradeTotal >= materia.min_grade ? (
                                <p className={styles.approvedNotice}>Parabéns! Você atingiu a média.</p>
                            ) : materia.status === 'FINALIZADO' ? (
                                <p className={styles.failedNotice}>Infelizmente você não atingiu a média.</p>
                            ) : null}
                        </div>
                    )}
                </aside>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSearchQuery('')
                    setSearchResults([])
                }}
                title="Adicionar Professor"
            >
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputWrapper}>
                        <Search className={styles.searchIcon} size={20} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Buscar por nome ou matrícula..."
                            value={searchQuery}
                            onChange={(e) => searchProfessors(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className={styles.resultList}>
                        {isSearching ? (
                            <p className={styles.emptySearch}>Buscando...</p>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(result => {
                                const isAlreadyAdded = professors.some(p => p.id === result.id)
                                return (
                                    <div key={result.id} className={styles.resultItem}>
                                        <div className={styles.resultProfile}>
                                            <div className={styles.resultAvatar}>
                                                {result.profile_image_url ? (
                                                    <img src={result.profile_image_url} alt={`${result.name} ${result.surname}`} />
                                                ) : (
                                                    <>{result.name[0]}{result.surname[0]}</>
                                                )}
                                            </div>
                                            <div className={styles.resultDetails}>
                                                <span className={styles.resultName}>{result.name} {result.surname}</span>
                                                <span className={styles.resultMatricula}>Matrícula: {result.matricula}</span>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.addBtnSmall}
                                            disabled={isAlreadyAdded}
                                            onClick={() => addProfessor(result.id)}
                                        >
                                            {isAlreadyAdded ? 'Já Adicionado' : 'Adicionar'}
                                        </button>
                                    </div>
                                )
                            })
                        ) : searchQuery.length >= 3 ? (
                            <p className={styles.emptySearch}>Nenhum professor encontrado.</p>
                        ) : (
                            <p className={styles.emptySearch}>Digite pelo menos 3 caracteres.</p>
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={presenceModalOpen}
                onClose={() => {
                    setPresenceModalOpen(false);
                    setPresenceAula(null);
                }}
                title={`Registrar Presença - AULA ${presenceAula?.aula_number}`}
            >
                <div className={styles.searchContainer}>
                    <p style={{ color: 'var(--primary-taupe)', marginBottom: '16px' }}>
                        Ao confirmar a presença, garanta também marcar as tarefas que você executou.
                    </p>

                    {presenceAula && aulas.findIndex(a => a.id === presenceAula.id) > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '12px' }}>
                                Lançar Tarefas da Aula Anterior (Aula {aulas[aulas.findIndex(a => a.id === presenceAula.id) - 1]?.aula_number})
                            </h4>
                            {previousTasksForPresence.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {previousTasksForPresence.map(task => (
                                        <label key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '16px', borderRadius: '12px', cursor: 'pointer', border: '2px solid var(--primary-cream)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={studentTaskGradesInput[task.id] || false}
                                                    onChange={e => {
                                                        setStudentTaskGradesInput(prev => ({ ...prev, [task.id]: e.target.checked }));
                                                    }}
                                                    style={{ width: '24px', height: '24px', accentColor: 'var(--primary-dark)', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '1rem' }}>{task.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--primary-dark)', fontWeight: 'bold', background: 'var(--primary-cream)', padding: '4px 12px', borderRadius: '8px' }}>+ {task.max_grade} pts</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--primary-taupe)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    Nenhuma tarefa cadastrada na aula anterior.
                                </p>
                            )}
                        </div>
                    )}

                    {presenceAula?.is_last_aula && materia?.has_final_exam && (
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '12px' }}>Lançar Nota da Prova Final</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '12px', borderRadius: '12px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>{materia?.final_exam_name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        max={materia?.max_grade}
                                        step="any"
                                        value={studentFinalGradeInput}
                                        onChange={e => {
                                            let val = parseFloat(e.target.value) || 0;
                                            if (val > (materia?.max_grade || 0)) val = materia?.max_grade || 0;
                                            setStudentFinalGradeInput(val);
                                        }}
                                        className={styles.searchInput}
                                        style={{ width: '80px', padding: '8px', textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--primary-taupe)' }}>/ {materia?.max_grade}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={confirmPresence}
                        disabled={submittingPresence === presenceAula?.id}
                        style={{
                            background: 'var(--primary-tan)',
                            color: 'var(--primary-dark)',
                            padding: '16px',
                            borderRadius: '16px',
                            fontWeight: 800,
                            fontSize: '1rem',
                            border: 'none',
                            cursor: submittingPresence ? 'not-allowed' : 'pointer',
                            width: '100%',
                            transition: 'all 0.2s',
                            opacity: submittingPresence ? 0.7 : 1
                        }}
                    >
                        {submittingPresence ? 'Processando...' : 'Confirmar Presença e Notas'}
                    </button>
                </div>
            </Modal>
        </NavLayout>
    )
}
