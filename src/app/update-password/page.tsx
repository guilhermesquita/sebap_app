'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import styles from '../login/login.module.css'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError(error.message)
        } else {
            setMessage('Senha atualizada com sucesso! Redirecionando para o login...')
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        }
        setLoading(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.topSection}>
                <h1 className={styles.title}>SEBAP</h1>
                <p className={styles.subtitle}>Pelo Reino e por Cristo</p>
            </div>

            <form className={styles.form} onSubmit={handleUpdate}>
                <h2 className={styles.formTitle}>Nova Senha</h2>
                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '20px' }}>
                    Digite sua nova senha abaixo.
                </p>

                {message && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px' }}>{message}</div>}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label>Nova Senha</label>
                    <input
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Confirmar Senha</label>
                    <input
                        type="password"
                        placeholder="********"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={styles.input}
                    />
                </div>

                <button type="submit" disabled={loading} className={styles.loginBtn}>
                    {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
            </form>
        </div>
    )
}
