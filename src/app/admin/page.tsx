'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import NavLayout from '@/components/NavLayout'
import { Profile, Tenda, UserRole } from '@/types/database'
import { Shield, Users, MapPin, Edit, Save, Trash2, Plus, Search } from 'lucide-react'
import styles from './admin.module.css'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'tendas'>('users')
    const [users, setUsers] = useState<Profile[]>([])
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [loading, setLoading] = useState(true)
    const [newTenda, setNewTenda] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!profile?.role.includes('ADMIN')) {
                window.location.href = '/dashboard'
                return
            }

            const { data: usersData } = await supabase.from('profiles').select('*').order('name')
            const { data: tendasData } = await supabase.from('tendas').select('*').order('name')

            setUsers(usersData || [])
            setTendas(tendasData || [])
            setLoading(false)
        }
        fetchData()
    }, [])

    const handleRoleChange = async (userId: string, roles: UserRole[]) => {
        const { error } = await supabase.from('profiles').update({ role: roles }).eq('id', userId)
        if (error) alert(error.message)
        else {
            setUsers(users.map(u => u.id === userId ? { ...u, role: roles } : u))
        }
    }

    const handleAddTenda = async () => {
        if (!newTenda) return
        const { data, error } = await supabase.from('tendas').insert({ name: newTenda }).select().single()
        if (error) alert(error.message)
        else {
            setTendas([...tendas, data])
            setNewTenda('')
        }
    }

    const handleDeleteTenda = async (id: string) => {
        const { error } = await supabase.from('tendas').delete().eq('id', id)
        if (error) alert(error.message)
        else setTendas(tendas.filter(t => t.id !== id))
    }

    if (loading) return (
        <NavLayout>
            <div className={styles.header}>
                <Skeleton width="300px" height="40px" style={{ marginBottom: '24px' }} />
                <div className={styles.tabsSkeleton}>
                    <Skeleton width="120px" height="40px" />
                    <Skeleton width="120px" height="40px" />
                </div>
            </div>
            <div className={styles.searchWrapper}>
                <Skeleton width="100%" height="45px" style={{ borderRadius: '12px', maxWidth: '400px' }} />
            </div>
            <div className={styles.tableSkeleton}>
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} width="100%" height="60px" style={{ marginBottom: '12px' }} />
                ))}
            </div>
        </NavLayout>
    )

    return (
        <NavLayout>
            <div className={styles.header}>
                <h1 className={styles.title}>Painel Administrativo</h1>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} /> Usuários
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'tendas' ? styles.active : ''}`}
                        onClick={() => setActiveTab('tendas')}
                    >
                        <MapPin size={18} /> Tendas
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                <div className={styles.usersContainer}>
                    <div className={styles.searchWrapper}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome ou matrícula..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Matrícula</th>
                                    <th>Role Atual</th>
                                    <th>Alterar Roles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users
                                    .filter(user => {
                                        const search = searchTerm.toLowerCase();
                                        return (
                                            user.name?.toLowerCase().includes(search) ||
                                            user.surname?.toLowerCase().includes(search) ||
                                            user.matricula?.toLowerCase().includes(search)
                                        );
                                    })
                                    .map(user => {
                                        const roleKey = user.role.sort().join(',');
                                        return (
                                            <tr key={user.id}>
                                                <td>{user.name} {user.surname}</td>
                                                <td className={styles.mono}>{user.matricula}</td>
                                                <td><span className={styles.roleTag}>{user.role.join(' & ')}</span></td>
                                                <td>
                                                    <select
                                                        value={roleKey}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            handleRoleChange(user.id, val.split(',') as UserRole[]);
                                                        }}
                                                        className={styles.roleSelect}
                                                    >
                                                        <option value="ALUNO">Somente Aluno</option>
                                                        <option value="PROFESSOR">Somente Professor</option>
                                                        <option value="ADMIN,PROFESSOR">ADMIN & PROFESSOR</option>
                                                        <option value="ADMIN,ALUNO">ADMIN & ALUNO</option>
                                                        <option value="ADMIN">Somente ADMIN</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className={styles.mobileUserList}>
                        {users
                            .filter(user => {
                                const search = searchTerm.toLowerCase();
                                return (
                                    user.name?.toLowerCase().includes(search) ||
                                    user.surname?.toLowerCase().includes(search) ||
                                    user.matricula?.toLowerCase().includes(search)
                                );
                            })
                            .map(user => {
                                const roleKey = user.role.sort().join(',');
                                return (
                                    <div key={user.id} className={styles.userCard}>
                                        <div className={styles.userCardHeader}>
                                            <div className={styles.userInfo}>
                                                <h3 className={styles.userName}>{user.name} {user.surname}</h3>
                                                <span className={styles.userMatricula}>{user.matricula}</span>
                                            </div>
                                            <span className={styles.roleTag}>{user.role.join(' & ')}</span>
                                        </div>
                                        <div className={styles.userCardActions}>
                                            <label>Alterar Role:</label>
                                            <select
                                                value={roleKey}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    handleRoleChange(user.id, val.split(',') as UserRole[]);
                                                }}
                                                className={styles.roleSelect}
                                            >
                                                <option value="ALUNO">Somente Aluno</option>
                                                <option value="PROFESSOR">Somente Professor</option>
                                                <option value="ADMIN,PROFESSOR">ADMIN & PROFESSOR</option>
                                                <option value="ADMIN,ALUNO">ADMIN & ALUNO</option>
                                                <option value="ADMIN">Somente ADMIN</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ) : (
                <div className={styles.tendaSection}>
                    <div className={styles.addTendaBox}>
                        <input
                            type="text"
                            placeholder="Nome da nova tenda..."
                            value={newTenda}
                            onChange={e => setNewTenda(e.target.value)}
                        />
                        <button onClick={handleAddTenda} className={styles.addTendaBtn}>
                            <Plus size={20} /> Adicionar
                        </button>
                    </div>

                    <div className={styles.tendaList}>
                        {tendas.map(tenda => (
                            <div key={tenda.id} className={styles.tendaCard}>
                                <span>{tenda.name}</span>
                                <button onClick={() => handleDeleteTenda(tenda.id)} className={styles.deleteBtn}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </NavLayout>
    )
}
