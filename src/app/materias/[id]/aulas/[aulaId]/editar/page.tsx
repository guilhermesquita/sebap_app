'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile, Materia, AulaTask } from '@/types/database'
import { ChevronLeft, Save, Plus, Trash2, Info, Calendar, BookOpen, Link as LinkIcon, FileUp, AlertCircle, UserCheck, Clock } from 'lucide-react'
import styles from '../../../nova-aula/nova-aula.module.css'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

export default function EditarAulaPage({ params }: { params: Promise<{ id: string, aulaId: string }> }) {
    const { id, aulaId } = use(params)
    const [materia, setMateria] = useState<Materia | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [allocatedGradeOthers, setAllocatedGradeOthers] = useState(0)
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'success' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    })

    const [formData, setFormData] = useState({
        date: '',
        is_last_aula: false,
        presence_max_grade: 0,
        presence_time_ranges: [] as { start: string, end: string }[],
        tasks: [] as { id?: string, name: string, max_grade: number }[],
        links: [] as string[],
    })
    const [existingUploads, setExistingUploads] = useState<string[]>([])
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (!profileData) return;
            setProfile(profileData)

            // Fetch Aula
            const { data: aulaData, error: aulaErr } = await supabase
                .from('aulas')
                .select('*')
                .eq('id', aulaId)
                .single()

            if (aulaErr || !aulaData) {
                router.push(`/materias/${id}`)
                return
            }

            // Fetch Tasks
            const { data: tasksData } = await supabase
                .from('aula_tasks')
                .select('*')
                .eq('aula_id', aulaId)

            setFormData({
                date: aulaData.date,
                is_last_aula: aulaData.is_last_aula,
                presence_max_grade: Number(aulaData.presence_max_grade || 0),
                presence_time_ranges: aulaData.presence_time_ranges || [],
                tasks: (tasksData || []).map(t => ({ id: t.id, name: t.name, max_grade: Number(t.max_grade) })),
                links: aulaData.links || [],
            })
            setExistingUploads(aulaData.uploads || [])

            // Fetch Materia
            const { data: materiaData } = await supabase.from('materias').select('*').eq('id', id).single()
            setMateria(materiaData)

            // Fetch Allocated Grade from OTHER aulas
            const { data: otherAulas } = await supabase
                .from('aulas')
                .select('id, presence_max_grade')
                .eq('materia_id', id)
                .neq('id', aulaId)

            let sum = 0;
            if (otherAulas && otherAulas.length > 0) {
                const otherIds = otherAulas.map(a => a.id)
                const { data: otherTasks } = await supabase
                    .from('aula_tasks')
                    .select('max_grade')
                    .in('aula_id', otherIds)

                sum = (otherTasks?.reduce((acc, t) => acc + Number(t.max_grade), 0) || 0) +
                    (otherAulas.reduce((acc, a) => acc + Number(a.presence_max_grade || 0), 0))
            }
            setAllocatedGradeOthers(sum)

            const isAdmin = profileData.role.includes('ADMIN');
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
            setLoading(false)
        }
        fetchData()
    }, [id, aulaId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const currentTasksGrade = formData.is_last_aula ? 0 : formData.tasks.reduce((acc, t) => acc + Number(t.max_grade), 0)
            const currentPresenceGrade = Number(formData.presence_max_grade)
            const totalGradeAfter = allocatedGradeOthers + currentTasksGrade + currentPresenceGrade

            if (totalGradeAfter > (materia?.max_grade || 100)) {
                throw new Error(`A soma das notas (${totalGradeAfter}) ultrapassa a nota máxima da matéria (${materia?.max_grade}).`)
            }

            // Upload New Files
            const uploadedUrls: string[] = [...existingUploads]
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop()
                const baseName = file.name.replace(`.${fileExt}`, '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
                const fileName = `${baseName}_${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('aula-materials')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('aula-materials')
                    .getPublicUrl(filePath)

                uploadedUrls.push(publicUrl)
            }

            // Update Aula
            const { error: aulaError } = await supabase
                .from('aulas')
                .update({
                    date: formData.date,
                    is_last_aula: formData.is_last_aula,
                    presence_max_grade: currentPresenceGrade,
                    presence_time_ranges: formData.presence_time_ranges,
                    tasks_count: formData.is_last_aula ? 0 : formData.tasks.length,
                    tasks_max_grade: currentTasksGrade,
                    links: formData.links.filter(l => l.trim() !== ''),
                    uploads: uploadedUrls,
                })
                .eq('id', aulaId)

            if (aulaError) throw aulaError

            // Sync Tasks
            // 1. Delete tasks not in formData
            const currentTaskIds = formData.tasks.map(t => t.id).filter(Boolean) as string[]
            await supabase.from('aula_tasks').delete().eq('aula_id', aulaId).not('id', 'in', `(${currentTaskIds.join(',')})`)

            // 2. Update/Insert tasks
            if (!formData.is_last_aula && formData.tasks.length > 0) {
                for (const task of formData.tasks) {
                    if (task.id) {
                        await supabase.from('aula_tasks').update({
                            name: task.name,
                            max_grade: task.max_grade
                        }).eq('id', task.id)
                    } else {
                        await supabase.from('aula_tasks').insert({
                            aula_id: aulaId,
                            name: task.name,
                            max_grade: task.max_grade
                        })
                    }
                }
            } else if (formData.is_last_aula) {
                await supabase.from('aula_tasks').delete().eq('aula_id', aulaId)
            }

            router.push(`/materias/${id}`)
        } catch (err: any) {
            setModal({ isOpen: true, title: 'Erro', message: err.message, type: 'alert' })
        } finally {
            setSaving(false)
        }
    }

    const addTask = () => setFormData({ ...formData, tasks: [...formData.tasks, { name: '', max_grade: 0 }] })
    const removeTask = (index: number) => {
        const newTasks = formData.tasks.filter((_, i) => i !== index)
        setFormData({ ...formData, tasks: newTasks })
    }

    const addTimeRange = () => setFormData({ ...formData, presence_time_ranges: [...formData.presence_time_ranges, { start: '', end: '' }] })
    const removeTimeRange = (index: number) => {
        const newRanges = formData.presence_time_ranges.filter((_, i) => i !== index)
        setFormData({ ...formData, presence_time_ranges: newRanges })
    }

    const removeExistingUpload = (url: string) => {
        setExistingUploads(existingUploads.filter(u => u !== url))
    }

    if (loading || !materia) return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Skeleton width="150px" height="24px" style={{ marginBottom: '16px' }} />
                    <Skeleton width="300px" height="40px" />
                </div>
                <div className={styles.formSkeleton}>
                    <Skeleton width="100%" height="400px" />
                </div>
            </div>
        </NavLayout>
    )

    const currentTasksTotal = formData.is_last_aula ? 0 : formData.tasks.reduce((acc, t) => acc + Number(t.max_grade), 0)
    const currentPresenceTotal = Number(formData.presence_max_grade)
    const totalAllocated = allocatedGradeOthers + currentTasksTotal + currentPresenceTotal
    const percentage = (totalAllocated / materia.max_grade) * 100
    const remainingBudget = materia.max_grade - allocatedGradeOthers

    return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ChevronLeft size={20} /> Voltar
                    </button>
                    <h1 className={styles.title}>Editar Aula</h1>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.grid}>
                        <div className={styles.inputGroup}>
                            <label><Calendar size={18} /> Data da Aula</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label><AlertCircle size={18} /> Tipo de Aula</label>
                            <div
                                className={`${styles.checkboxCard} ${formData.is_last_aula ? styles.active : ''}`}
                                onClick={() => setFormData({ ...formData, is_last_aula: !formData.is_last_aula })}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.is_last_aula}
                                    onChange={() => { }}
                                />
                                <div className={styles.checkboxText}>
                                    <h4>Esta é a última aula</h4>
                                    <p>Não haverá tarefas para a aula seguinte.</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label><UserCheck size={18} /> Nota da Presença</label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={formData.presence_max_grade}
                                onChange={e => setFormData({ ...formData, presence_max_grade: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.sectionTitle}><Clock size={20} /> Horários para dar presença</h3>
                            <button type="button" onClick={addTimeRange} className={styles.addBtn}>
                                <Plus size={16} /> Novo Horário
                            </button>
                        </div>
                        <div className={styles.taskList}>
                            {formData.presence_time_ranges.map((range, i) => (
                                <div key={i} className={styles.taskCard}>
                                    <div className={styles.taskInputs}>
                                        <div className={styles.taskInputGroup}>
                                            <label>Horário Inicial (ex: 17:00)</label>
                                            <input
                                                type="time"
                                                value={range.start}
                                                required
                                                onChange={e => {
                                                    const newRanges = [...formData.presence_time_ranges]
                                                    newRanges[i].start = e.target.value
                                                    setFormData({ ...formData, presence_time_ranges: newRanges })
                                                }}
                                            />
                                        </div>
                                        <div className={styles.taskInputGroup}>
                                            <label>Horário Final (ex: 19:00)</label>
                                            <input
                                                type="time"
                                                value={range.end}
                                                required
                                                onChange={e => {
                                                    const newRanges = [...formData.presence_time_ranges]
                                                    newRanges[i].end = e.target.value
                                                    setFormData({ ...formData, presence_time_ranges: newRanges })
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeTimeRange(i)} className={styles.removeTaskBtn} title="Remover Horário">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            {formData.presence_time_ranges.length === 0 && (
                                <p className={styles.emptyText} style={{ marginBottom: '16px' }}>Nenhum horário definido. A presença só poderá ser dada pelo professor.</p>
                            )}
                        </div>
                    </div>

                    {!formData.is_last_aula && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}><BookOpen size={20} /> Tarefas / Atividades</h3>
                                <button type="button" onClick={addTask} className={styles.addBtn}>
                                    <Plus size={16} /> Nova Tarefa
                                </button>
                            </div>

                            <div className={styles.budgetCard}>
                                <div className={styles.budgetHeader}>
                                    <span className={styles.budgetText}>Distribuição de Notas da Matéria</span>
                                    <span className={styles.budgetNumbers}>
                                        {totalAllocated.toFixed(1)} / {materia.max_grade} pts
                                    </span>
                                </div>
                                <div className={styles.progressBarContainer}>
                                    <div
                                        className={`${styles.progressBar} ${percentage > 90 ? styles.warning : ''} ${percentage > 100 ? styles.danger : ''}`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                                <span className={styles.budgetText} style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    {remainingBudget > 0
                                        ? `Ainda restam ${Math.max(0, remainingBudget - currentTasksTotal - currentPresenceTotal).toFixed(1)} pontos para distribuir.`
                                        : 'Todos os pontos da matéria foram distribuídos.'}
                                </span>
                            </div>

                            <div className={styles.taskList}>
                                {formData.tasks.map((task, i) => (
                                    <div key={i} className={styles.taskCard}>
                                        <div className={styles.taskInputs}>
                                            <div className={styles.taskInputGroup}>
                                                <label>Nome da Tarefa</label>
                                                <input
                                                    type="text"
                                                    value={task.name}
                                                    required
                                                    onChange={e => {
                                                        const newTasks = [...formData.tasks]
                                                        newTasks[i].name = e.target.value
                                                        setFormData({ ...formData, tasks: newTasks })
                                                    }}
                                                />
                                            </div>
                                            <div className={`${styles.taskInputGroup} ${styles.gradeInputGroup}`}>
                                                <label>Nota Máxima</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={task.max_grade}
                                                    required
                                                    onChange={e => {
                                                        const newTasks = [...formData.tasks]
                                                        newTasks[i].max_grade = parseFloat(e.target.value) || 0
                                                        setFormData({ ...formData, tasks: newTasks })
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeTask(i)} className={styles.removeTaskBtn}>
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.resourcesGrid}>
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}><LinkIcon size={20} /> Links de Apoio</h3>
                                <button type="button" onClick={() => setFormData({ ...formData, links: [...formData.links, ''] })} className={styles.addBtn}>
                                    <Plus size={16} /> Adicionar
                                </button>
                            </div>
                            <div className={styles.linkList}>
                                {formData.links.map((link, i) => (
                                    <div key={i} className={styles.linkItem}>
                                        <input
                                            type="url"
                                            value={link}
                                            onChange={e => {
                                                const newLinks = [...formData.links]
                                                newLinks[i] = e.target.value
                                                setFormData({ ...formData, links: newLinks })
                                            }}
                                        />
                                        <button type="button" onClick={() => {
                                            const newLinks = formData.links.filter((_, idx) => idx !== i)
                                            setFormData({ ...formData, links: newLinks })
                                        }} className={styles.removeBtn}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}><FileUp size={20} /> Materiais (Arquivos)</h3>
                                <input type="file" multiple id="file-upload" hidden onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
                                <label htmlFor="file-upload" className={styles.addBtn} style={{ cursor: 'pointer' }}>
                                    <Plus size={16} /> Enviar Novos
                                </label>
                            </div>
                            <div className={styles.linkList}>
                                {existingUploads.map((url, i) => {
                                    const urlParts = url.split('/')
                                    const rawName = urlParts[urlParts.length - 1]
                                    const fileName = rawName.split('_').slice(0, -1).join('_') || 'Material'
                                    const fileExt = rawName.split('.').pop()
                                    return (
                                        <div key={`existing-${i}`} className={styles.linkItem}>
                                            <div className={styles.fileName}>
                                                {decodeURIComponent(fileName)}.{fileExt} (Existente)
                                            </div>
                                            <button type="button" onClick={() => removeExistingUpload(url)} className={styles.removeBtn}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )
                                })}
                                {selectedFiles.map((file, i) => (
                                    <div key={`new-${i}`} className={styles.linkItem}>
                                        <div className={`${styles.fileName} ${styles.new}`}>
                                            {file.name} (Novo)
                                        </div>
                                        <button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className={styles.removeBtn}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" disabled={saving} className={styles.saveBtn}>
                            {saving ? <Spinner size={22} /> : <Save size={22} />}
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>

                <Modal
                    isOpen={modal.isOpen}
                    onClose={() => setModal({ ...modal, isOpen: false })}
                    title={modal.title}
                    type={modal.type}
                >
                    <p>{modal.message}</p>
                </Modal>
            </div>
        </NavLayout>
    )
}
