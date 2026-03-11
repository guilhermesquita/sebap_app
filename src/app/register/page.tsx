'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tenda } from '@/types/database'
import { RegisterForm } from '@/components/forms/RegisterForm'
import { RegisterFormData } from '@/components/forms/RegisterForm/types'
import styles from './register.module.css'

export default function RegisterPage() {
    const [tendas, setTendas] = useState<Tenda[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchTendas() {
            const { data } = await supabase.from('tendas').select('*')
            if (data) setTendas(data)
        }
        fetchTendas()
    }, [])

    const handleRegister = async (data: RegisterFormData) => {
        setLoading(true)
        setError(null)

        try {
            const cleanCpf = data.cpf.replace(/\D/g, '')
            const cleanPhone = data.phone?.replace(/\D/g, '') || ''

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        surname: data.surname,
                        cpf: cleanCpf,
                        phone: cleanPhone,
                        is_baptized: data.is_baptized,
                        tenda_id: data.tenda_id,
                        birth_date: data.birth_date,
                        sex: data.sex,
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Falha no cadastro.')

            router.push('/login?registered=true')
        } catch (err: any) {
            if (err.message.includes('rate limit')) {
                setError('Limite de envio de e-mail atingido. Desative o "Confirm email" no painel do Supabase.')
            } else {
                setError(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Cadastro SEBAP</h1>

            <RegisterForm
                tendas={tendas}
                onSubmit={handleRegister}
                isLoading={loading}
                externalError={error}
            />

            <p className={styles.loginLink}>
                Já tem conta? <Link href="/login">Voltar para o Login</Link>
            </p>
        </div>
    )
}

