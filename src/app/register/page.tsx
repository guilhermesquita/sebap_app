'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Select } from '@/components/ui/Select'
import { Toast, ToastType } from '@/components/ui/Toast'
import { Tenda } from '@/types/database'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [cpf, setCpf] = useState('')
    const [email, setEmail] = useState('')
    const [tenda, setTenda] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isBatizado, setIsBatizado] = useState(false)

    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ visible: boolean, message: string, type: ToastType }>({ visible: false, message: '', type: 'default' })
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchTendas() {
            const { data } = await supabase.from('tendas').select('*')
            if (data) setTendas(data)
        }
        fetchTendas()
    }, [])

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setFieldErrors({})

        try {
            const cleanCpf = cpf.replace(/\D/g, '')

            // 1. Validar campos vazios
            const newFieldErrors: Record<string, boolean> = {}
            if (!name.trim()) newFieldErrors.name = true
            if (!cleanCpf) newFieldErrors.cpf = true
            if (!email.trim()) newFieldErrors.email = true
            if (!tenda) newFieldErrors.tenda = true
            if (!password) newFieldErrors.password = true
            if (!confirmPassword) newFieldErrors.confirmPassword = true

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors)
                throw new Error('Preencha todos os campos obrigatórios.')
            }

            // 2. Validar formato do email
            if (!validateEmail(email)) {
                setFieldErrors({ email: true })
                throw new Error('Email Inválido')
            }

            // 3. Validar senhas
            if (password !== confirmPassword) {
                setFieldErrors({ password: true, confirmPassword: true })
                throw new Error('As senhas não coincidem')
            }
            if (password.length < 8) {
                setFieldErrors({ password: true })
                throw new Error('A senha deve ter no mínimo 8 caracteres.')
            }

            // 4. Verificar se CPF já existe
            const { data: existingCpf } = await supabase
                .from('profiles')
                .select('id')
                .eq('cpf', cleanCpf)
                .maybeSingle()

            if (existingCpf) {
                setFieldErrors({ cpf: true })
                throw new Error('CPF já registrado')
            }

            // 5. Verificar se Email já existe
            const { data: existingEmail } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle()

            if (existingEmail) {
                setFieldErrors({ email: true })
                throw new Error('Email já registrado')
            }

            // 6. Cadastrar no Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        surname: '',
                        cpf: cleanCpf,
                        is_baptized: isBatizado,
                        tenda_id: tenda,
                        birth_date: null,
                    }
                }
            })

            if (authError) {
                let msg = authError.message
                if (msg.includes('rate limit')) {
                    msg = 'Limite de envio de e-mail atingido. Desative o "Confirm email" no painel do Supabase.'
                }
                throw new Error(msg)
            }
            if (!authData.user) throw new Error('Falha no cadastro.')

            setToast({ visible: true, message: 'Cadastro realizado com sucesso!', type: 'success' })
            setTimeout(() => {
                router.push('/login?registered=true')
            }, 2000)
        } catch (err: any) {
            setToast({ visible: true, message: err.message || 'Erro ao realizar cadastro', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans overflow-y-auto">
            <header className="w-full flex items-center justify-between pt-6 pb-2 px-8">
                <Image src="/logo/logo-ibp.webp" alt="IBP" width={100} height={40} className="object-contain" />
                <div className="flex items-center gap-2 text-[#4D453E] font-semibold text-caption">
                    <Image src="/icons/login/clock-icon.svg" alt="Ambiente Seguro" width={16} height={16} />
                    <span className="hidden md:inline">AMBIENTE SEGURO</span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="bg-background rounded-[12px] p-8 md:p-10 lg:p-12 shadow-lg w-full max-w-5xl flex flex-col items-center">
                    <div className="w-full">
                        <div className="mb-8 text-start md:text-left">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1B1A] mb-2">Crie sua conta</h1>
                            <p className="text-[#4D453E] text-captionMedium">Inicie sua jornada de aprofundamento e estudos bíblicos.</p>
                        </div>

                        <form onSubmit={handleRegister} className="flex flex-col gap-6" noValidate>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                {/* Coluna 1 / Nome */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">Nome Completo <span className="text-danger">*</span></label>
                                    <Input
                                        type="text"
                                        placeholder="ex: Gabriel da Silva"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        icon={<Image src="/icons/login-icon.svg" alt="icon" width={16} height={16} />}
                                        hasError={fieldErrors.name}
                                        required
                                    />
                                </div>

                                {/* Coluna 2 / CPF */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">CPF <span className="text-danger">*</span></label>
                                    <Input
                                        type="text"
                                        placeholder="ex: 000.000.000-00"
                                        value={cpf}
                                        onChange={(e) => setCpf(maskCPF(e.target.value))}
                                        icon={<Image src="/icons/login/cpf-icon.svg" alt="icon" width={16} height={16} />}
                                        hasError={fieldErrors.cpf}
                                        required
                                    />
                                </div>

                                {/* Coluna 1 / Email */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">E-mail pessoal <span className="text-danger">*</span></label>
                                    <Input
                                        type="email"
                                        placeholder="gabriel@instituicao.edu.br"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        icon={<Image src="/icons/login/email-icon-sebap.svg" alt="icon" width={16} height={16} />}
                                        hasError={fieldErrors.email}
                                        required
                                    />
                                </div>

                                {/* Coluna 2 / Tenda */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">Selecione sua tenda <span className="text-danger">*</span></label>
                                    <Select
                                        value={tenda}
                                        onChange={(e) => setTenda(e.target.value)}
                                        icon={<Image src="/icons/login/tenda-icon.svg" alt="icon" width={16} height={16} />}
                                        hasError={fieldErrors.tenda}
                                        options={tendas.map(t => ({ label: t.name, value: t.id }))}
                                        placeholder="Selecione..."
                                        required
                                    />
                                </div>

                                {/* Coluna 1 / Criar Senha */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">Criar Senha <span className="text-danger">*</span></label>
                                    <Input
                                        type="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        icon={<Image src="/icons/login/clock-icon.svg" alt="icon" width={13} height={13} />}
                                        hasError={fieldErrors.password}
                                        required
                                        minLength={8}
                                    />
                                </div>

                                {/* Coluna 2 / Confirmar Senha */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-brown-500 text-caption font-semibold uppercase tracking-wider">Confirmar Senha <span className="text-danger">*</span></label>
                                    <Input
                                        type="password"
                                        placeholder="Repita sua senha"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        icon={<Image src="/icons/login/confirm-password-icon.svg" alt="icon" width={16} height={16} />}
                                        hasError={fieldErrors.confirmPassword}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-2">
                                <Checkbox
                                    label="Sou batizado"
                                    checked={isBatizado}
                                    onChange={(e) => setIsBatizado(e.target.checked)}
                                />
                            </div>

                            <div className="flex flex-col items-center mt-2 w-full gap-4">
                                <Button type="submit" isLoading={loading} rightIcon={<Image src="/icons/commons/arrow-right-icon.svg" alt="icon" width={13} height={13} />} className="w-full">
                                    <span className="hidden md:inline">Criar minha conta</span>
                                    <span className="md:hidden">Cadastrar e Começar Estudos</span>
                                </Button>

                                <div className="text-center text-[#7E756D] text-caption mt-2">
                                    Já possui conta?{' '}
                                    <Link href="/login" className="text-brown-500 font-bold hover:underline">
                                        Fazer login <span className="inline-block translate-y-[2px]"><Image src="/icons/commons/arrow-right-icon.svg" alt="arrow" width={10} height={10} /></span>
                                    </Link>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            </main>

            <footer className="py-4 px-8 text-[#8898AA] text-caption font-medium hidden md:block">
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
