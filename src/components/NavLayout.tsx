'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import Link from 'next/link'
import { Home, BookOpen, User, Settings, LogOut } from 'lucide-react'
import styles from './nav.module.css'
import { Skeleton } from './ui/Skeleton'

export default function NavLayout({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) setProfile(data)
        }
        getProfile()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className={styles.layout}>
            {/* Desktop Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h1 className={styles.logo}>SEBAP</h1>
                    {profile ? (
                        <p className={styles.registration}>Matrícula: {profile.matricula}</p>
                    ) : (
                        <Skeleton width="100px" height="14px" style={{ marginTop: '5px' }} />
                    )}
                </div>

                <nav className={styles.nav}>
                    <Link href="/dashboard" className={styles.navItem}>
                        <Home size={20} /> Dashboard
                    </Link>
                    <Link href="/materias" className={styles.navItem}>
                        <BookOpen size={20} /> Matérias
                    </Link>
                    <Link href="/perfil" className={styles.navItem}>
                        <User size={20} /> Meu Perfil
                    </Link>
                    {profile?.role.includes('ADMIN') && (
                        <Link href="/admin" className={styles.navItem}>
                            <Settings size={20} /> Painel Admin
                        </Link>
                    )}
                </nav>

                <button onClick={handleLogout} className={styles.logoutBtn}>
                    <LogOut size={20} /> Sair
                </button>
            </aside>

            {/* Mobile Header */}
            <header className={styles.mobileHeader}>
                <h1 className={styles.mobileLogo}>SEBAP</h1>
                <button onClick={handleLogout} className={styles.mobileLogoutBtn} aria-label="Sair">
                    <LogOut size={24} />
                </button>
            </header>

            {/* Main Content */}
            <main className={styles.content}>
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className={styles.bottomNav}>
                <Link href="/dashboard" className={styles.bottomNavItem}><Home size={24} /></Link>
                <Link href="/materias" className={styles.bottomNavItem}><BookOpen size={24} /></Link>
                <Link href="/perfil" className={styles.bottomNavItem}><User size={24} /></Link>
                {profile?.role.includes('ADMIN') && (
                    <Link href="/admin" className={styles.bottomNavItem}><Settings size={24} /></Link>
                )}
            </nav>
        </div>
    )
}
