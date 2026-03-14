'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

export default function LoginPage() {
    const [cpf, setCpf] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Get email from profiles via CPF
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('cpf', cpf.replace(/\D/g, ''))
                .single()

            if (profileError || !profile) {
                throw new Error('CPF não encontrado.')
            }

            // 2. Sign in with email and password
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: password,
            })

            if (loginError) {
                throw new Error('Senha incorreta.')
            }

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.topSection}>
                <h1 className={styles.title}>SEBAP</h1>
                <p className={styles.subtitle}>Pelo Reino e por Cristo</p>
            </div>

            <form className={styles.form} onSubmit={handleLogin}>
                <h2 className={styles.formTitle}>Acesse sua conta</h2>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label htmlFor="cpf">CPF</label>
                    <input
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(maskCPF(e.target.value))}
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password">Senha</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={styles.input}
                    />
                </div>

                {/* TODO: IMPLEMENT FORGOT PASSWORD */}
                {/* <div className={styles.forgotPassword}>
                    <Link href="/forgot-password">Esqueceu a senha?</Link>
                </div> */}

                <button type="submit" disabled={loading} className={styles.loginBtn}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>

                <p className={styles.registerLink}>
                    Não tem uma conta? <Link href="/register">Cadastre-se</Link>
                </p>
            </form>

            <div className={styles.decoration}>
                <span className={styles.accentText}>Avante Peregrinos!</span>
            </div>
        </div>
    )
}
