'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, usePathname } from 'next/navigation'
import { Profile } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'
import { Toast } from '@/components/ui/Toast'

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

function MobileHeader({ profile, onLogout, onCopyMatricula }: { profile: Profile | null, onLogout: () => void, onCopyMatricula: () => void }) {
    const handleCopy = () => {
        if (profile?.matricula) {
            navigator.clipboard.writeText(profile.matricula)
            onCopyMatricula()
        }
    }

    return (
        <header className="lg:hidden sticky top-0 left-0 right-0 w-full bg-brown-400 p-5 pt-8 pb-6 flex flex-col gap-4 shadow-md rounded-b-[24px] z-40 mb-2">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[#D0C5BB] text-[13px] font-light">Olá,</p>
                    <h1 className="text-white text-[24px] font-extrabold leading-tight">
                        {profile?.name || 'Usuário'}
                    </h1>
                </div>

                <div className="w-12 h-12 rounded-full border-2 border-[#D0C5BB] overflow-hidden bg-neutral flex items-center justify-center flex-shrink-0">
                    {profile?.profile_image_url ? (
                        <img src={profile.profile_image_url} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-brown-500 font-bold text-lg">
                            {profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="bg-[#382B1F] text-white rounded-[10px] px-3.5 py-2 flex items-center gap-3 border border-[#55402A] hover:bg-[#2E2319] active:scale-95 transition-all cursor-pointer shadow-xs"
                    title="Copiar Matrícula"
                >
                    <span className="text-[13px] font-semibold">
                        Matricula: {profile?.matricula || '---'}
                    </span>
                    <Image src="/icons/dashboard/copy-icon.svg" alt="Copiar" width={14} height={14} className="opacity-90" />
                </button>

                <button
                    type="button"
                    onClick={onLogout}
                    className="w-10 h-10 rounded-full bg-danger flex items-center justify-center hover:bg-danger/80 active:scale-95 transition-all cursor-pointer shadow-sm"
                    title="Sair"
                >
                    <div
                        className="w-5 h-5 bg-[#FFFAF6]"
                        style={{
                            WebkitMaskImage: 'url(/icons/logout-icon.svg)',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            WebkitMaskSize: 'contain',
                            maskImage: 'url(/icons/logout-icon.svg)',
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            maskSize: 'contain',
                        }}
                    />
                </button>
            </div>
        </header>
    )
}

export default function NavLayout({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'default' }>({
        visible: false,
        message: '',
        type: 'default'
    })

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

    const handleCopyMatricula = () => {
        setToast({ visible: true, message: 'Matrícula copiada com sucesso!', type: 'success' })
    }

    return (
        <div className="flex min-h-screen bg-background relative w-full max-w-[100vw] overflow-x-hidden">
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

            {/* Main Content */}
            <main className="flex-1 min-w-0 lg:pl-[280px] flex flex-col min-h-screen">
                {/* Mobile Header (rendered on all pages) */}
                <MobileHeader
                    profile={profile}
                    onLogout={handleLogout}
                    onCopyMatricula={handleCopyMatricula}
                />

                {/* Desktop Header */}
                <header className="hidden lg:flex sticky top-0 h-[80px] bg-white border-b border-[#D0C5BB] z-40 items-center justify-end px-10 gap-6 w-full">
                    <Link
                        href="/perfil"
                        aria-label="Configurações">
                        <div
                            className="w-6 h-6 bg-[#1B1309] hover:bg-brown-500 transition-colors"
                            style={{
                                WebkitMaskImage: `url(/icons/admin-icon.svg)`,
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                WebkitMaskSize: 'contain',
                                maskImage: `url(/icons/admin-icon.svg)`,
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                maskSize: 'contain',
                            }}
                        />
                    </Link>
                    <div className="w-10 h-10 rounded-full border-[3px] border-neutral flex items-center justify-center bg-white overflow-hidden text-center">
                        {profile?.profile_image_url ? (
                            <img src={profile.profile_image_url} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[#1B1309] font-extrabold text-captionMedium translate-y-[1px]">
                                {profile?.name?.charAt(0).toUpperCase() || 'A'}
                            </span>
                        )}
                    </div>
                </header>

                <div className="flex-1 min-w-0 pb-[120px] pt-2 px-4 lg:pt-10 lg:px-12 lg:pb-12">
                    {children}
                </div>
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

            {/* Global Toast for NavLayout (e.g. mobile matricula copy) */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, visible: false })}
            />
        </div>
    )
}
