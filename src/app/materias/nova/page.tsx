'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NavLayout from '@/components/NavLayout'
import { Profile } from '@/types/database'
import styles from './nova.module.css'

export default function NovaMateriaPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        min_grade: 60,
        max_grade: 100,
        has_final_exam: false,
        final_exam_name: '',
        final_exam_description: '',
    })

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (!profileData?.role.includes('ADMIN')) {
                router.push('/dashboard')
                return
            }
            setProfile(profileData)
        }
        fetchData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const now = new Date().toISOString().split('T')[0]
            let status = 'EM_BREVE'
            if (now >= formData.start_date && now <= formData.end_date) status = 'EM_PROGRESSO'
            if (now > formData.end_date) status = 'FINALIZADO'

            // 1. Insert Subject
            const { data: materia, error: materiaError } = await supabase
                .from('materias')
                .insert({
                    name: formData.name,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    min_grade: formData.min_grade,
                    max_grade: formData.max_grade,
                    has_final_exam: formData.has_final_exam,
                    final_exam_name: formData.has_final_exam ? formData.final_exam_name : null,
                    final_exam_description: formData.has_final_exam ? formData.final_exam_description : null,
                    status: status,
                })
                .select()
                .single()

            if (materiaError) throw materiaError

            router.push('/materias')
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <NavLayout>
            <div className={styles.container}>
                <h1 className={styles.title}>Nova Matéria</h1>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label>Nome da Matéria</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Teologia Sistemática"
                        />
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.inputGroup}>
                            <label>Data de Início</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Data de Término</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.inputGroup}>
                            <label>Nota Mínima</label>
                            <input
                                type="number"
                                value={formData.min_grade}
                                onChange={e => setFormData({ ...formData, min_grade: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Nota Máxima</label>
                            <input
                                type="number"
                                value={formData.max_grade}
                                onChange={e => setFormData({ ...formData, max_grade: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>


                    <div className={styles.examSection}>
                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                checked={formData.has_final_exam}
                                onChange={e => setFormData({ ...formData, has_final_exam: e.target.checked })}
                            />
                            <span>Terá prova final?</span>
                        </label>

                        {formData.has_final_exam && (
                            <div className={styles.examFields}>
                                <div className={styles.inputGroup}>
                                    <label>Título da Prova Final</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.final_exam_name}
                                        onChange={e => setFormData({ ...formData, final_exam_name: e.target.value })}
                                        placeholder="Ex: Exame Geral de Teologia"
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Descrição da Prova (Opcional)</label>
                                    <textarea
                                        value={formData.final_exam_description}
                                        onChange={e => setFormData({ ...formData, final_exam_description: e.target.value })}
                                        placeholder="Orientações sobre a prova..."
                                        rows={3}
                                        className={styles.textarea}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancelar</button>
                        <button type="submit" disabled={loading} className={styles.submitBtn}>
                            {loading ? 'Salvando...' : 'Criar Matéria'}
                        </button>
                    </div>
                </form>
            </div>
        </NavLayout>
    )
}
