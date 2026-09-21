'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, usePathname } from 'next/navigation'
import { Profile } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'

function NavItem({ href, icon, label, current }: { href: string, icon: string, label: string, current: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-brown-500 text-caption font-semibold ${current ? 'bg-neutral' : 'hover:bg-neutral/50'}`}
        >
            <Image src={icon} alt={label} width={24} height={24} />
            <span>{label}</span>
        </Link>
    )
}

function MobileNavItem({ href, iconUrl, label, current }: { href: string, iconUrl: string, label: string, current: boolean }) {
    return (
        <Link href={href} className={`flex flex-col items-center gap-1 p-2 transition-opacity ${current ? 'opacity-100' : 'opacity-70'}`}>
            <div 
                className={`w-6 h-6 ${current ? 'bg-[#FFFFFF]' : 'bg-[#9D8D7E]'}`}
                style={{
                    WebkitMaskImage: `url(${iconUrl})`,
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskImage: `url(${iconUrl})`,
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    maskSize: 'contain',
                }}
            />
            <span className={`text-caption font-semibold tracking-wide ${current ? 'text-[#FFFFFF]' : 'text-[#9D8D7E]'}`}>
                {label}
            </span>
        </Link>
    )
}

export default function NavLayout({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()

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
    }, [supabase, router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex min-h-screen bg-background relative">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-secondary p-6 fixed top-0 left-0 h-screen z-50 overflow-y-auto">
                <div className="mb-10 text-center flex justify-center">
                    <Image src="/logo/logo-ibp.webp" alt="Logo IBP" width={140} height={60} className="object-contain" priority />
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    <NavItem href="/dashboard" icon="/icons/dashboard-icon.svg" label="Dashboard" current={pathname === '/dashboard'} />
                    <NavItem href="/materias" icon="/icons/materias-icon.svg" label="Matérias" current={pathname === '/materias'} />
                    <NavItem href="/perfil" icon="/icons/perfil-icon.svg" label="Perfil" current={pathname === '/perfil'} />
                    {profile?.role.includes('ADMIN') && (
                        <NavItem href="/admin" icon="/icons/admin-icon.svg" label="Admin" current={pathname === '/admin'} />
                    )}
                </nav>

                <div className="mt-auto border-t border-[#D0C5BB] pt-4 flex flex-col gap-2">
                    <Link href="#" className="flex items-center gap-4 px-4 py-3 hover:bg-neutral/50 rounded-xl transition-colors text-[#4D453E] text-caption font-semibold">
                        <Image src="/icons/suport-icon.svg" alt="Suporte" width={24} height={24} />
                        <span>Suporte</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3 hover:bg-danger/10 rounded-xl transition-colors text-[#4D453E] text-caption font-semibold">
                        <Image src="/icons/logout-icon.svg" alt="Sair" width={24} height={24} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-[70px] px-5 bg-white border-b border-secondary flex items-center justify-between z-50">
                <Image src="/logo/logo-ibp.webp" alt="Logo IBP" width={100} height={40} className="object-contain" />
                <button onClick={handleLogout} className="p-2 rounded-full hover:bg-danger/10 transition-colors" aria-label="Sair">
                    <Image src="/icons/logout-icon.svg" alt="Sair" width={24} height={24} />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-6 pt-[100px] pb-[120px] lg:p-10 lg:pl-[320px]">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-brown-400 flex justify-around items-center z-50 px-2 shadow-2xl">
                <MobileNavItem href="/dashboard" iconUrl="/icons/inicio-icon.svg" label="Início" current={pathname === '/dashboard'} />
                <MobileNavItem href="/materias" iconUrl="/icons/materias-mobile-icon.svg" label="Matérias" current={pathname === '/materias'} />
                <MobileNavItem href="/perfil" iconUrl="/icons/perfil-mobile-icon.svg" label="Perfil" current={pathname === '/perfil'} />
                {profile?.role.includes('ADMIN') && (
                    <MobileNavItem href="/admin" iconUrl="/icons/admin-icon.svg" label="Admin" current={pathname === '/admin'} />
                )}
            </nav>
        </div>
    )
}
