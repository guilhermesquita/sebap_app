'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Tenda } from '@/types/database'
import { Camera, Save, UserCircle, Loader2 } from 'lucide-react'
import styles from './perfil.module.css'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

export default function PerfilPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<Profile>>({})
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'success' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    })
    const [uploading, setUploading] = useState(false)

    const supabase = createClient()

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1')
    }

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            const { data: tendasData } = await supabase.from('tendas').select('*').order('name')

            if (profile) {
                setProfile(profile)
                setFormData({
                    ...profile,
                    phone: profile.phone ? maskPhone(profile.phone) : ''
                })
            }
            setTendas(tendasData || [])
            setLoading(false)
        }
        fetchData()
    }, [])

    const showAlert = (title: string, message: string, type: 'alert' | 'success' | 'info' = 'info') => {
        setModal({ isOpen: true, title, message, type })
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !profile) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile.id}/${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile with new image URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_image_url: publicUrl })
                .eq('id', profile.id)

            if (updateError) throw updateError

            setProfile({ ...profile, profile_image_url: publicUrl })
            showAlert('Sucesso', 'Imagem de perfil atualizada!', 'success')
        } catch (err: any) {
            showAlert('Erro', err.message, 'alert')
        } finally {
            setUploading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return
        setSaving(true)

        try {
            const cleanPhone = formData.phone?.replace(/\D/g, '') || ''

            const { error } = await supabase
                .from('profiles')
                .update({
                    name: formData.name,
                    surname: formData.surname,
                    phone: cleanPhone,
                    church_years: formData.church_years,
                    tenda_id: formData.tenda_id,
                    birth_date: formData.birth_date,
                    sex: formData.sex,
                })
                .eq('id', profile.id)

            if (error) throw error
            showAlert('Sucesso', 'Perfil atualizado com sucesso!', 'success')
        } catch (err: any) {
            showAlert('Erro', err.message, 'alert')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Skeleton width="200px" height="40px" />
                    <Skeleton width="120px" height="30px" />
                </div>
                <div className={styles.formSkeleton}>
                    <Skeleton width="100%" height="400px" style={{ borderRadius: '24px' }} />
                </div>
            </div>
        </NavLayout>
    )

    return (
        <NavLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Meu Perfil</h1>
                    <span className={styles.matriculaTag}>Matrícula: {profile?.matricula}</span>
                </div>

                <form className={styles.form} onSubmit={handleUpdate}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarBox}>
                            {uploading ? (
                                <div className={styles.avatarLoading}>
                                    <Spinner color="dark" size={40} />
                                </div>
                            ) : profile?.profile_image_url ? (
                                <img src={profile.profile_image_url} alt="Profile" className={styles.avatarImg} />
                            ) : (
                                <UserCircle size={120} className={styles.avatarPlaceholder} />
                            )}
                            <label className={styles.editAvatarBtn}>
                                <Camera size={20} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    hidden
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div className={styles.avatarInfo}>
                            <h2 className={styles.profileName}>{profile?.name} {profile?.surname}</h2>
                            <p className={styles.profileRole}>{profile?.role}</p>
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.inputGroup}>
                            <label>Nome</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Sobrenome</label>
                            <input
                                type="text"
                                value={formData.surname || ''}
                                onChange={e => setFormData({ ...formData, surname: e.target.value })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Telefone</label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Ano de Igreja</label>
                            <input
                                type="number"
                                value={formData.church_years || 0}
                                onChange={e => setFormData({ ...formData, church_years: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Qual tenda você pertence?</label>
                            <select
                                value={formData.tenda_id || ''}
                                onChange={e => setFormData({ ...formData, tenda_id: e.target.value })}
                            >
                                <option value="">Selecione uma tenda</option>
                                {tendas.map(tenda => (
                                    <option key={tenda.id} value={tenda.id}>{tenda.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Sexo</label>
                            <select
                                value={formData.sex || ''}
                                onChange={e => setFormData({ ...formData, sex: e.target.value })}
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" disabled={saving} className={styles.saveBtn}>
                            {saving ? <Spinner size={20} /> : <Save size={20} />}
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
