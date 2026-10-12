'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Tenda } from '@/types/database'
import { Contact, Phone, AtSign, GraduationCap } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'
import { MatriculaBadge } from '@/components/ui/MatriculaBadge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast } from '@/components/ui/Toast'
import { formatPhoneBR } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

export default function PerfilPage() {
    const { profile: storedProfile, setProfile: setStoredProfile } = useAuthStore()
    const [profile, setProfile] = useState<Profile | null>(storedProfile)
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [loading, setLoading] = useState(!storedProfile)
    const [saving, setSaving] = useState(false)

    // Image upload states (deferred until submit)
    const [fileToUpload, setFileToUpload] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [isImageRemoved, setIsImageRemoved] = useState(false)

    // Form states
    const [fullName, setFullName] = useState(storedProfile ? [storedProfile.name, storedProfile.surname].filter(Boolean).join(' ') : '')
    const [phone, setPhone] = useState(storedProfile?.phone ? formatPhoneBR(storedProfile.phone) : '')
    const [email, setEmail] = useState(storedProfile?.email || '')
    const [tendaId, setTendaId] = useState(storedProfile?.tenda_id || '')

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'default' }>({
        visible: false,
        message: '',
        type: 'default'
    })

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                const { data: tendasData } = await supabase
                    .from('tendas')
                    .select('*')
                    .order('name')

                if (profileData) {
                    setProfile(profileData)
                    setStoredProfile(profileData)
                    const initialFullName = [profileData.name, profileData.surname].filter(Boolean).join(' ')
                    setFullName(initialFullName)
                    setPhone(formatPhoneBR(profileData.phone))
                    setEmail(profileData.email || user.email || '')
                    setTendaId(profileData.tenda_id || '')
                } else {
                    setEmail(user.email || '')
                }

                setTendas(tendasData || [])
            } catch (err: any) {
                console.error('Erro ao carregar dados do perfil:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const showToast = (message: string, type: 'success' | 'error' | 'default' = 'default') => {
        setToast({ visible: true, message, type })
    }

    const handleFileSelect = (file: File) => {
        setFileToUpload(file)
        const previewUrl = URL.createObjectURL(file)
        setFilePreview(previewUrl)
        setIsImageRemoved(false)
    }

    const handleRemoveImage = () => {
        setFileToUpload(null)
        setFilePreview(null)
        setIsImageRemoved(true)
    }

    const handleCopyMatricula = () => {
        showToast('Matrícula copiada com sucesso!', 'success')
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return
        setSaving(true)

        try {
            let finalImageUrl: string | null = profile.profile_image_url

            // If user clicked remove image
            if (isImageRemoved) {
                finalImageUrl = null
            }

            // If user selected a new file to upload
            if (fileToUpload) {
                const fileExt = fileToUpload.name.split('.').pop() || 'png'
                const fileName = `${profile.id}/${Date.now()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, fileToUpload, { upsert: true })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath)

                finalImageUrl = publicUrl
            }

            // Split full name into name and surname
            const nameParts = fullName.trim().split(' ')
            const firstName = nameParts[0] || ''
            const surname = nameParts.slice(1).join(' ') || ''
            const cleanPhone = phone.replace(/\D/g, '')

            const { error } = await supabase
                .from('profiles')
                .update({
                    name: firstName,
                    surname: surname,
                    phone: cleanPhone || null,
                    tenda_id: tendaId || null,
                    profile_image_url: finalImageUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id)

            if (error) throw error

            const updatedProfile = {
                ...profile,
                name: firstName,
                surname: surname,
                phone: cleanPhone || null,
                tenda_id: tendaId || null,
                profile_image_url: finalImageUrl
            }

            setProfile(updatedProfile)
            setStoredProfile(updatedProfile)

            // Clear temporary upload states
            setFileToUpload(null)
            setFilePreview(null)
            setIsImageRemoved(false)

            showToast('Informações salvas com sucesso!', 'success')
        } catch (err: any) {
            showToast(err.message || 'Erro ao salvar informações', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <NavLayout>
                <div className="w-full max-w-[1000px] mx-auto p-4 sm:p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-6">
                        <Skeleton width="112px" height="112px" style={{ borderRadius: '9999px' }} />
                        <div className="flex flex-col gap-3">
                            <Skeleton width="220px" height="32px" />
                            <Skeleton width="140px" height="20px" />
                        </div>
                    </div>
                    <Skeleton width="160px" height="36px" style={{ borderRadius: '8px' }} />
                    <Skeleton width="100%" height="400px" style={{ borderRadius: '16px' }} />
                </div>
            </NavLayout>
        )
    }

    const currentDisplayImage = isImageRemoved
        ? null
        : filePreview || profile?.profile_image_url

    const formattedRole = profile?.role
        ? Array.isArray(profile.role)
            ? profile.role.join('')
            : String(profile.role)
        : 'ADMINPROFESSOR'

    return (
        <NavLayout>
            <div className="w-full max-w-[1000px] mx-auto flex flex-col gap-6 pb-12 pt-2">
                {/* 1. User Profile Header Section (No surrounding white card!) */}
                <div className="flex flex-col gap-5">
                    {/* Top Row: Avatar + Name & Subtitle */}
                    <div className="flex items-center gap-5">
                        <ProfileAvatar
                            imageUrl={currentDisplayImage}
                            name={profile?.name || 'U'}
                            onFileSelect={handleFileSelect}
                            onRemoveImage={handleRemoveImage}
                        />

                        <div className="flex flex-col items-start gap-0.5">
                            <h1 className="text-[#3A332C] text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight">
                                {[profile?.name, profile?.surname].filter(Boolean).join(' ') || 'Guilherme Mesquita'}
                            </h1>
                            <span className="text-[#8C7A6B] text-[12px] font-bold tracking-wider uppercase">
                                {formattedRole}
                            </span>
                        </div>
                    </div>

                    {/* Standalone Matricula Pill Button below Header */}
                    <div className="flex">
                        <MatriculaBadge
                            matricula={profile?.matricula}
                            onCopy={handleCopyMatricula}
                        />
                    </div>
                </div>

                {/* 2. Profile Information Form */}
                <form onSubmit={handleUpdate} className="flex flex-col mt-2">
                    {/* Section Header with Primary Sphere & #DED7CC Bottom Border Line */}
                    <SectionHeader
                        title="Informações do usuário"
                        sphereColor="bg-primary"
                        borderColor="border-[#DED7CC]"
                    />

                    {/* Inputs 2x2 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {/* Field 1: NOME COMPLETO * */}
                        <div>
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                                NOME COMPLETO <span className="text-danger">*</span>
                            </label>
                            <Input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Digite seu nome completo"
                                icon={<Contact size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                        </div>

                        {/* Field 2: TELEFONE (Optional - No Red Asterisk) */}
                        <div>
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                                TELEFONE
                            </label>
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                                placeholder="(00) 00000-0000"
                                icon={<Phone size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                        </div>

                        {/* Field 3: E-MAIL PESSOAL * */}
                        <div>
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                                E-MAIL PESSOAL <span className="text-danger">*</span>
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@exemplo.com"
                                icon={<AtSign size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                        </div>

                        {/* Field 4: SELECIONE SUA TENDA * */}
                        <div>
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                                SELECIONE SUA TENDA <span className="text-danger">*</span>
                            </label>
                            <Select
                                value={tendaId}
                                onChange={(e) => setTendaId(e.target.value)}
                                options={tendas.map((t) => ({ label: t.name, value: t.id }))}
                                placeholder="Selecione uma tenda"
                                icon={<GraduationCap size={18} className="text-[#8C7A6B]" />}
                                className="bg-[#FFF8F6] border-none h-[48px] rounded-[12px]"
                            />
                        </div>
                    </div>

                    {/* Full Width Submit Button */}
                    <Button
                        type="submit"
                        isLoading={saving}
                        disabled={saving}
                        className="w-full h-[48px] rounded-[12px] bg-[#38302A] hover:bg-brown-400 text-white font-semibold text-[14px] transition-colors cursor-pointer"
                    >
                        Salvar Informações
                    </Button>
                </form>

                {/* Toast Notification */}
                <Toast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, visible: false })}
                />
            </div>
        </NavLayout>
    )
}
