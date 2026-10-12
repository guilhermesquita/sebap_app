'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'

function CarregandoContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { setProfile } = useAuthStore()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [statusText, setStatusText] = useState('Verificando sua sessão...')

    useEffect(() => {
        let isMounted = true

        async function loadUserData() {
            try {
                setErrorMessage(null)
                setStatusText('Verificando sua sessão...')

                const supabase = createClient()
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    if (isMounted) {
                        router.replace('/login')
                    }
                    return
                }

                if (isMounted) {
                    setStatusText('Carregando informações do usuário...')
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError || !profile) {
                    console.error('Erro ao buscar perfil:', profileError)
                    if (isMounted) {
                        setErrorMessage('Não foi possível carregar os dados do seu perfil. Por favor, tente novamente.')
                    }
                    return
                }

                if (isMounted) {
                    setStatusText('Preparando seu ambiente...')
                    // Salva no estado global do Zustand com persistência
                    setProfile(profile)

                    // Obter destino solicitado ou ir para o dashboard
                    const rawRedirect = searchParams.get('redirectTo') || '/dashboard'
                    // Prevenir redirecionamentos abertos para URLs externas
                    const targetUrl = rawRedirect.startsWith('/') ? rawRedirect : '/dashboard'

                    // Pequeno delay suave para sensação fluida
                    setTimeout(() => {
                        router.replace(targetUrl)
                    }, 350)
                }
            } catch (err: any) {
                console.error('Erro inesperado ao carregar dados:', err)
                if (isMounted) {
                    setErrorMessage('Ocorreu um erro ao carregar seus dados. Verifique sua conexão e tente novamente.')
                }
            }
        }

        loadUserData()

        return () => {
            isMounted = false
        }
    }, [router, searchParams, setProfile])

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-[#EFE8DF] flex flex-col items-center">
                {/* Logo IBP */}
                <div className="mb-8 flex justify-center">
                    <Image
                        src="/logo/logo-ibp.webp"
                        alt="Escola da Palavra - IBP"
                        width={160}
                        height={68}
                        className="object-contain"
                        priority
                    />
                </div>

                {errorMessage ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center font-bold text-xl">
                            !
                        </div>
                        <h2 className="text-body font-bold text-brown-500">
                            Ops, algo deu errado
                        </h2>
                        <p className="text-caption text-[#736357] max-w-xs">
                            {errorMessage}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                            <Button
                                variant="google"
                                className="w-full border border-[#D0C5BB]"
                                onClick={() => router.replace('/login')}
                            >
                                Voltar ao Login
                            </Button>
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => window.location.reload()}
                            >
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-5 w-full">
                        {/* Spinner estilizado */}
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-[#EFE8DF]" />
                            <div className="w-14 h-14 rounded-full border-4 border-brown-500 border-t-transparent animate-spin" />
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                            <h2 className="text-body font-bold text-brown-500">
                                {statusText}
                            </h2>
                            <p className="text-caption text-[#8C7A6B]">
                                Aguarde um instante enquanto organizamos tudo para você.
                            </p>
                        </div>

                        {/* Barra de progresso indeterminada suave */}
                        <div className="w-full h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-brown-500 rounded-full animate-pulse w-3/4 mx-auto" />
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-8 text-[12px] text-[#A8988B] tracking-wide">
                Escola da Palavra &bull; Seminário Batista Peregrinos
            </p>
        </div>
    )
}

export default function CarregandoPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-brown-500 border-t-transparent animate-spin" />
                </div>
            }
        >
            <CarregandoContent />
        </Suspense>
    )
}
