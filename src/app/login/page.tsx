'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Toast, ToastType } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/useAuthStore'

export default function LoginPage() {
    const [cpf, setCpf] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ visible: boolean, message: string, type: ToastType }>({ visible: false, message: '', type: 'default' })
    const supabase = createClient()
    const router = useRouter()

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const { setUser } = useAuthStore()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const cleanCpf = cpf.replace(/\D/g, '')
            
            // 1. Busca o email e dados do perfil associados ao CPF ou Matrícula
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, name, cpf, tenda_id')
                .or(`cpf.eq.${cleanCpf},matricula.eq.${cleanCpf}`)
                .single()

            if (profileError || !profile) {
                throw new Error('CPF ou Matrícula não encontrados.')
            }

            // 2. Faz o login no GoTrue (Supabase Auth)
            const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: password,
            })

            if (loginError) {
                throw new Error('Senha incorreta.')
            }

            // 3. Salva os dados no estado global para acesso rápido na aplicação
            setUser({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                cpf: profile.cpf,
                tenda_id: profile.tenda_id
            })

            // Redireciona para a página intermediária de carregamento
            router.push('/carregando')
        } catch (err: any) {
            setError(err.message)
            setToast({ visible: true, message: 'Login ou senha inválidos.', type: 'error' })
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans overflow-y-auto">
            <header className="w-full flex items-center justify-between pt-6 pb-2 px-8">
                <Image src="/logo/logo-ibp.webp" alt="IBP" width={100} height={40} className="object-contain" />
                <div className="flex items-center gap-2 text-[#4D453E] font-semibold text-caption">
                    <Image src="/icons/login/clock-icon.svg" alt="Ambiente Seguro" width={16} height={16} />
                    <span>AMBIENTE SEGURO</span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="bg-background rounded-[12px] p-8 md:p-10 lg:p-12 shadow-lg w-full max-w-6xl flex flex-col items-center">
                    <div className="w-full max-w-md">
                        <div className="mb-8 text-start">
                            <p className="text-[#655D58] text-caption uppercase tracking-wider mb-2">Credenciamento</p>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1B1A] mb-2">Bem-vindo de volta</h1>
                            <p className="text-[#4D453E] text-captionMedium">Insira suas credenciais para acessar suas matérias</p>
                        </div>

                        <form onSubmit={handleLogin} className="flex flex-col gap-5">

                            <div className="flex flex-col gap-2">
                                <label className="text-brown-500 text-caption font-semibold">CPF ou Matrícula</label>
                                <Input
                                    type="text"
                                    placeholder="ex: 000.000.000-00 ou 1231433"
                                    value={cpf}
                                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                                    icon={<Image src="/icons/login-icon.svg" alt="icon" width={16} height={16} />}
                                    hasError={!!error}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-brown-500 text-caption font-semibold">Senha de Acesso</label>
                                <Input
                                    type="password"
                                    placeholder="Digite sua senha cadastrada"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<Image src="/icons/login/clock-icon.svg" alt="icon" width={13} height={13} />}
                                    hasError={!!error}
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-between mt-1">
                                <Checkbox label="Lembrar de mim" />
                                <Link href="/forgot-password" className="text-[#4D453E] text-captionMedium font-semibold hover:text-brown-500 transition-colors">
                                    Esqueceu sua senha?
                                </Link>
                            </div>

                            <Button type="submit" isLoading={loading} rightIcon={<Image src="/icons/commons/arrow-right-icon.svg" alt="icon" width={13} height={13} />} className="mt-2">
                                Entrar na plataforma
                            </Button>

                            {/* TODO: IMPLEMENTAR AUTENTICAÇÃO GOOGLE */}
                            {/* <div className="flex items-center gap-4 my-1">
                                <div className="h-px bg-[#D0C5BB] flex-1"></div>
                                <span className="text-caption text-[#8898AA] font-medium tracking-wider">OU ACESSE COM</span>
                                <div className="h-px bg-[#D0C5BB] flex-1"></div>
                            </div>

                            <Button type="button" variant="google" leftIcon={<Image src="/icons/google icon.svg" alt="icon" width={20} height={20} />} onClick={() => { }}>
                                Google
                            </Button> */}

                            <div className="flex flex-col md:flex-row items-center justify-center gap-1 mt-4 text-[#7E756D] text-caption text-center">
                                <span>Ainda não possui uma conta?</span>
                                <Link href="/register" className="text-brown-500 font-bold hover:underline">
                                    Cadastre-se gratuitamente
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="py-4 px-8 text-[#8898AA] text-caption font-medium">
                © 2026 Igreja Batista Peregrinos
            </footer>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </div>
    )
}
