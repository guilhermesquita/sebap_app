const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Replace state
content = content.replace(
    "const [materias, setMaterias] = useState<Materia[]>([])",
    "const [materiasEmAndamento, setMateriasEmAndamento] = useState<any[]>([])\n    const [minhasMaterias, setMinhasMaterias] = useState<any[]>([])"
);

// Replace query
content = content.replace(
    "materia_professors(professor_id)",
    "materia_professors(professor_id),\n                    aulas(count)"
);

// Replace data processing logic
const processingLogicOld = `                // Determine relevant materias (all active subjects in progress or coming soon)
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
                }`;

const processingLogicNew = `                // Determine relevant materias
                const mappedMaterias = updatedMaterias.map(m => {
                    const isEnrolled = m.materia_students?.some((s: any) => s.aluno_id === user.id)
                    const isTeaching = m.materia_professors?.some((p: any) => p.professor_id === user.id)
                    return {
                        ...m,
                        is_enrolled: isEnrolled,
                        is_teaching: isTeaching,
                        aulasCount: m.aulas && m.aulas[0] && m.aulas[0].count !== undefined ? m.aulas[0].count : 0
                    }
                })

                let andamento = [];
                let minhas = [];

                if (isAdmin) {
                    andamento = mappedMaterias.filter(m => m.is_active && m.status !== 'FINALIZADO');
                    minhas = mappedMaterias;
                } else {
                    andamento = mappedMaterias.filter(m => m.is_active && m.status !== 'FINALIZADO' && m.is_enrolled);
                    minhas = mappedMaterias.filter(m => m.is_enrolled);
                }

                // For the stats card "Matérias em Progresso", count only relevant & active ones
                const activeRelevantCount = andamento.length;

                setMateriasEmAndamento(andamento);
                setMinhasMaterias(minhas);

                if (isAluno) {
                    setStats(prev => ({ ...prev, activeSubjects: activeRelevantCount }))
                } else {
                    // For Professors and Admins
                    const { count: studentsCount } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .contains('role', ['ALUNO'])

                    setStats({
                        activeSubjects: activeRelevantCount,
                        studentsCount: studentsCount || 0,
                        averageGrade: 0
                    })
                }`;

content = content.replace(processingLogicOld, processingLogicNew);

// Replace JSX
const jsxOld = `            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Próximas Matérias</h2>
                </div>

                <div className={styles.subjectList}>
                    {materias.length > 0 ? materias.map(materia => {
                        const isFinalized = materia.status === 'FINALIZADO';
                        const isEnrolled = !!(materia.is_enrolled || materia.is_teaching);
                        const canAccess = !isFinalized || isEnrolled || profile.role.includes('ADMIN');

                        const CardContent = (
                            <div className={\`\${styles.subjectCard} \${!materia.is_active ? styles.inactive : ''} \${!canAccess ? styles.lockedCard : ''}\`}>
                                <div className={styles.subjectHeader}>
                                    <h3 className={styles.subjectName}>
                                        {materia.name}
                                        {!materia.is_active && <span className={styles.inactiveTag}>(Desativada)</span>}
                                    </h3>
                                    <div className={styles.badgeGroup}>
                                        <span className={\`\${styles.statusBadge} \${styles[materia.status]}\`}>
                                            {materia.status.replace('_', ' ')}
                                        </span>
                                        <span className={\`\${styles.enrollmentBadge} \${profile.role.includes('PROFESSOR')
                                            ? (materia.is_teaching ? styles.enrolled : styles.notEnrolled)
                                            : (materia.is_enrolled ? styles.enrolled : styles.notEnrolled)
                                            }\`}>
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
                            <Link href={\`/materias/\${materia.id}\`} key={materia.id}>
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
            </section>`;

const jsxNew = `            {materiasEmAndamento.length > 0 && (
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
            </section>`;

content = content.replace(jsxOld, jsxNew);

// Need to import MateriaCard
content = content.replace("import NavLayout from '@/components/NavLayout'", "import NavLayout from '@/components/NavLayout'\nimport MateriaCard from '@/components/ui/MateriaCard'");

fs.writeFileSync('src/app/dashboard/page.tsx', content);
