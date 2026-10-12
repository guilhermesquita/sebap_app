'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Tenda, UserRole } from '@/types/database'
import { Users, MapPin, Search, RotateCcw, Plus, Trash2 } from 'lucide-react'
import { resetStudentPassword } from './actions'
import { Skeleton } from '@/components/ui/Skeleton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Toast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/useAuthStore'

export default function AdminPage() {
    const { profile, isAdmin } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'users' | 'tendas'>('users')
    const [users, setUsers] = useState<Profile[]>([])
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [loadingUsers, setLoadingUsers] = useState(false)

    // Pagination & Search States (Server-side)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(30)
    const [totalUsers, setTotalUsers] = useState(0)

    const [newTenda, setNewTenda] = useState('')
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'default' }>({
        visible: false,
        message: '',
        type: 'default'
    })

    // Delete Tenda Modal States
    const [tendaToDelete, setTendaToDelete] = useState<Tenda | null>(null)
    const [showDeleteTendaModal, setShowDeleteTendaModal] = useState(false)
    const [deletingTenda, setDeletingTenda] = useState(false)

    const supabase = createClient()

    // 1. Initial Permission Check & Tendas Fetch
    useEffect(() => {
        async function initAdmin() {
            try {
                if (profile && !isAdmin) {
                    window.location.href = '/dashboard'
                    return
                }

                if (!profile) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return

                    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                    if (!userProfile?.role?.includes('ADMIN')) {
                        window.location.href = '/dashboard'
                        return
                    }
                    useAuthStore.getState().setProfile(userProfile)
                }

                const { data: tendasData } = await supabase.from('tendas').select('*').order('name')
                setTendas(tendasData || [])
            } catch (err: any) {
                console.error('Erro na inicialização admin:', err)
            } finally {
                setInitialLoading(false)
            }
        }
        initAdmin()
    }, [profile, isAdmin, supabase])

    // 2. Debounce Search Term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
            setPage(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // 3. Supabase Server-side Paginated Query
    useEffect(() => {
        async function fetchUsers() {
            if (activeTab !== 'users' || initialLoading) return
            setLoadingUsers(true)
            try {
                let query = supabase
                    .from('profiles')
                    .select('*', { count: 'exact' })

                if (debouncedSearch.trim()) {
                    const term = `%${debouncedSearch.trim()}%`
                    query = query.or(`name.ilike.${term},surname.ilike.${term},matricula.ilike.${term}`)
                }

                const from = (page - 1) * itemsPerPage
                const to = from + itemsPerPage - 1

                const { data, count, error } = await query
                    .order('name', { ascending: true })
                    .range(from, to)

                if (error) throw error

                setUsers(data || [])
                setTotalUsers(count || 0)
            } catch (err: any) {
                console.error('Erro ao carregar usuários:', err)
            } finally {
                setLoadingUsers(false)
            }
        }
        fetchUsers()
    }, [page, itemsPerPage, debouncedSearch, activeTab, initialLoading])

    const showToast = (message: string, type: 'success' | 'error' | 'default' = 'default') => {
        setToast({ visible: true, message, type })
    }

    const handleRoleChange = async (userId: string, roles: UserRole[]) => {
        const { error } = await supabase.from('profiles').update({ role: roles }).eq('id', userId)
        if (error) {
            showToast(error.message, 'error')
        } else {
            setUsers(users.map(u => u.id === userId ? { ...u, role: roles } : u))
            showToast('Role do usuário atualizada com sucesso!', 'success')
        }
    }

    const handleAddTenda = async () => {
        if (!newTenda.trim()) return
        const { data, error } = await supabase.from('tendas').insert({ name: newTenda.trim() }).select().single()
        if (error) {
            showToast(error.message, 'error')
        } else {
            setTendas([...tendas, data])
            setNewTenda('')
            showToast('Tenda adicionada com sucesso!', 'success')
        }
    }

    const handleRequestDeleteTenda = (tenda: Tenda) => {
        setTendaToDelete(tenda)
        setShowDeleteTendaModal(true)
    }

    const handleConfirmDeleteTenda = async () => {
        if (!tendaToDelete) return
        setDeletingTenda(true)

        try {
            // Check if there are profiles linked to this tenda
            const { count, error: countError } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('tenda_id', tendaToDelete.id)

            if (countError) throw countError

            if (count && count > 0) {
                setShowDeleteTendaModal(false)
                setTendaToDelete(null)
                showToast(
                    `Não é possível excluir a tenda "${tendaToDelete.name}" pois existem ${count} usuário(s) vinculado(s) a ela. Remova ou altere a tenda dos usuários antes de excluir.`,
                    'error'
                )
                return
            }

            // Perform deletion
            const { error: deleteError } = await supabase
                .from('tendas')
                .delete()
                .eq('id', tendaToDelete.id)

            if (deleteError) {
                if (deleteError.code === '23503' || deleteError.message.includes('foreign key')) {
                    setShowDeleteTendaModal(false)
                    setTendaToDelete(null)
                    showToast(
                        `Não é possível excluir a tenda "${tendaToDelete.name}" pois existem usuários vinculados a ela.`,
                        'error'
                    )
                    return
                }
                throw deleteError
            }

            setTendas(tendas.filter(t => t.id !== tendaToDelete.id))
            setShowDeleteTendaModal(false)
            setTendaToDelete(null)
            showToast(`Tenda "${tendaToDelete.name}" excluída com sucesso!`, 'success')
        } catch (err: any) {
            showToast(err.message || 'Erro ao excluir tenda', 'error')
        } finally {
            setDeletingTenda(false)
        }
    }

    const handleResetPassword = async (userId: string, userName: string) => {
        if (!confirm(`Tem certeza que deseja resetar a senha de ${userName} para "senha123"?`)) return

        try {
            await resetStudentPassword(userId)
            showToast(`Senha de ${userName} resetada para "senha123"`, 'success')
        } catch (error: any) {
            showToast(error.message || 'Erro ao resetar senha', 'error')
        }
    }

    if (initialLoading) {
        return (
            <NavLayout>
                <div className="w-full max-w-[1200px] mx-auto p-4 flex flex-col gap-6">
                    <Skeleton width="300px" height="40px" />
                    <Skeleton width="220px" height="44px" style={{ borderRadius: '12px' }} />
                    <Skeleton width="100%" height="450px" style={{ borderRadius: '20px' }} />
                </div>
            </NavLayout>
        )
    }

    const totalPages = Math.ceil(totalUsers / itemsPerPage) || 1

    return (
        <NavLayout>
            <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6 pb-12 pt-2">
                {/* Header & SegmentedControl Tabs */}
                <div className="flex flex-col items-start gap-4">
                    <h1 className="text-[#3A332C] text-[28px] sm:text-[32px] font-extrabold leading-tight tracking-tight">
                        Painel Administrativo
                    </h1>
                    <SegmentedControl<'users' | 'tendas'>
                        options={[
                            { key: 'users', label: 'Usuários', icon: <Users size={16} /> },
                            { key: 'tendas', label: 'Tendas', icon: <MapPin size={16} /> },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                        className="self-start"
                    />
                </div>

                {activeTab === 'users' ? (
                    <div className="flex flex-col gap-5">
                        {/* Search Input using Generic Input Component */}
                        <div className="w-full sm:w-[380px]">
                            <Input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Pesquisar por nome ou matrícula..."
                                icon={<Search size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-white border border-[#DFD8CE] focus-within:border-[#38302A] h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                        </div>

                        {/* Main Table Card matching reference design */}
                        <div className="w-full bg-white rounded-[20px] p-6 shadow-xs border border-[#EDE6DE] flex flex-col gap-5">
                            {/* Table */}
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-[#EDE6DE]">
                                            <th className="py-3 px-4 text-[#3A332C] text-[11px] font-bold tracking-wider uppercase">
                                                NOME
                                            </th>
                                            <th className="py-3 px-4 text-[#3A332C] text-[11px] font-bold tracking-wider uppercase">
                                                MATRÍCULA
                                            </th>
                                            <th className="py-3 px-4 text-[#3A332C] text-[11px] font-bold tracking-wider uppercase">
                                                ROLE ATUAL
                                            </th>
                                            <th className="py-3 px-4 text-[#3A332C] text-[11px] font-bold tracking-wider uppercase">
                                                ALTERAR ROLES
                                            </th>
                                            <th className="py-3 px-4 text-[#3A332C] text-[11px] font-bold tracking-wider uppercase text-center">
                                                AÇÕES
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingUsers ? (
                                            Array.from({ length: 5 }).map((_, idx) => (
                                                <tr key={idx} className="border-b border-[#F5F0EB]">
                                                    <td className="py-4 px-4"><Skeleton width="180px" height="24px" /></td>
                                                    <td className="py-4 px-4"><Skeleton width="90px" height="24px" /></td>
                                                    <td className="py-4 px-4"><Skeleton width="70px" height="24px" /></td>
                                                    <td className="py-4 px-4"><Skeleton width="140px" height="32px" /></td>
                                                    <td className="py-4 px-4 text-center"><Skeleton width="32px" height="32px" className="mx-auto" /></td>
                                                </tr>
                                            ))
                                        ) : users.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-[#8C7A6B] text-[14px]">
                                                    Nenhum usuário encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => {
                                                const roleKey = Array.isArray(user.role) ? [...user.role].sort().join(',') : ''
                                                const fullName = [user.name, user.surname].filter(Boolean).join(' ')

                                                return (
                                                    <tr key={user.id} className="border-b border-[#F5F0EB] hover:bg-[#FFF8F6] transition-colors">
                                                        {/* NOME with User Avatar */}
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-[#EAE3D9] overflow-hidden flex items-center justify-center flex-shrink-0 border border-[#EDE6DE]">
                                                                    {user.profile_image_url ? (
                                                                        <img src={user.profile_image_url} alt={fullName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-[#3A332C] font-extrabold text-[13px]">
                                                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-semibold text-[#3A332C] text-[14px]">
                                                                    {fullName}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* MATRÍCULA */}
                                                        <td className="py-4 px-4 font-extrabold text-[#3A332C] text-[14px]">
                                                            {user.matricula}
                                                        </td>

                                                        {/* ROLE ATUAL */}
                                                        <td className="py-4 px-4 text-[12px] font-bold text-[#595149] uppercase">
                                                            {Array.isArray(user.role) ? user.role.join(' & ') : '-'}
                                                        </td>

                                                        {/* ALTERAR ROLES */}
                                                        <td className="py-4 px-4">
                                                            <select
                                                                value={roleKey}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    handleRoleChange(user.id, val.split(',') as UserRole[])
                                                                }}
                                                                className="bg-[#FFF8F6] border border-[#DFD8CE] rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#3A332C] outline-none focus:border-[#38302A] cursor-pointer"
                                                            >
                                                                <option value="ALUNO">Somente Aluno</option>
                                                                <option value="PROFESSOR">Somente Professor</option>
                                                                <option value="ADMIN,PROFESSOR">ADMIN & PROFESSOR</option>
                                                                <option value="ADMIN,ALUNO">ADMIN & ALUNO</option>
                                                                <option value="ADMIN">Somente ADMIN</option>
                                                            </select>
                                                        </td>

                                                        {/* AÇÕES */}
                                                        <td className="py-4 px-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleResetPassword(user.id, fullName)}
                                                                className="w-9 h-9 rounded-full bg-[#FFF8F6] border border-[#DFD8CE] flex items-center justify-center text-[#595149] hover:bg-[#38302A] hover:text-white transition-colors cursor-pointer mx-auto shadow-xs active:scale-95"
                                                                title="Resetar Senha"
                                                            >
                                                                <RotateCcw size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Component at Bottom of Table */}
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={totalUsers}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setPage}
                                onItemsPerPageChange={(newCount) => {
                                    setItemsPerPage(newCount)
                                    setPage(1)
                                }}
                                itemsPerPageOptions={[30, 50, 80]}
                            />
                        </div>
                    </div>
                ) : (
                    /* Tendas Section */
                    <div className="w-full bg-white rounded-[20px] p-6 shadow-xs border border-[#EDE6DE] flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Nome da nova tenda..."
                                value={newTenda}
                                onChange={(e) => setNewTenda(e.target.value)}
                                className="flex-1 bg-[#FFF8F6] border border-[#DFD8CE] rounded-[12px] h-[48px] px-4 text-[#3A332C] placeholder:text-[#8C7A6B] text-[14px] outline-none focus:border-[#38302A]"
                            />
                            <button
                                type="button"
                                onClick={handleAddTenda}
                                className="h-[48px] px-5 rounded-[12px] bg-[#38302A] hover:bg-brown-400 text-white font-semibold text-[14px] flex items-center gap-2 transition-colors cursor-pointer flex-shrink-0"
                            >
                                <Plus size={18} /> Adicionar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {tendas.map((tenda) => (
                                <div
                                    key={tenda.id}
                                    className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[12px] p-4 flex items-center justify-between gap-3 shadow-xs"
                                >
                                    <span className="font-bold text-[#3A332C] text-[14px] truncate">
                                        {tenda.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestDeleteTenda(tenda)}
                                        className="w-8 h-8 rounded-full bg-white text-danger hover:bg-[#FEE2E2] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 shadow-xs border border-[#EDE6DE]"
                                        title="Excluir tenda"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delete Tenda Confirmation Modal */}
                <Modal
                    isOpen={showDeleteTendaModal}
                    onClose={() => {
                        if (!deletingTenda) {
                            setShowDeleteTendaModal(false)
                            setTendaToDelete(null)
                        }
                    }}
                    outsideCloseClick={!deletingTenda}
                    className="max-w-[440px]"
                >
                    <div className="flex flex-col items-center text-center py-2">
                        <h3 className="text-[#3A332C] text-[18px] font-bold mb-3">
                            Excluir Tenda
                        </h3>
                        <p className="text-[#595149] text-[14px] font-medium mb-6">
                            Tem certeza que deseja excluir a tenda{' '}
                            <strong className="text-[#3A332C]">"{tendaToDelete?.name}"</strong>?
                        </p>

                        <div className="flex items-center gap-3 w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteTendaModal(false)
                                    setTendaToDelete(null)
                                }}
                                disabled={deletingTenda}
                                className="flex-1 py-3 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteTenda}
                                disabled={deletingTenda}
                                className="flex-1 py-3 px-4 rounded-[10px] bg-danger text-white font-semibold text-[14px] hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {deletingTenda ? 'Excluindo...' : 'Sim, excluir'}
                            </button>
                        </div>
                    </div>
                </Modal>

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
