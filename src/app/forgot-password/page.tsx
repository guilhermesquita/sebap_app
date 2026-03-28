'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import styles from '../login/login.module.css'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        })

        if (error) setError(error.message)
        else setMessage('Link de recuperação enviado para seu e-mail!')
        setLoading(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.topSection}>
                <h1 className={styles.title}>SEBAP</h1>
                <p className={styles.subtitle}>Pelo Reino e por Cristo</p>
            </div>

            <form className={styles.form} onSubmit={handleReset}>
                <h2 className={styles.formTitle}>Recuperar Senha</h2>
                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '20px' }}>
                    Insira seu e-mail para receber um link de redefinição de senha.
                </p>

                {message && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px' }}>{message}</div>}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label>E-mail</label>
                    <input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={styles.input}
                    />
                </div>

                <button type="submit" disabled={loading} className={styles.loginBtn}>
                    {loading ? 'Enviando...' : 'Enviar Link'}
                </button>

                <p className={styles.registerLink}>
                    Lembrou a senha? <Link href="/login">Voltar ao Login</Link>
                </p>
            </form>
        </div>
    )
}
