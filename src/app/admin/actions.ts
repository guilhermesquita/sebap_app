'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function resetStudentPassword(userId: string) {
    const cookieStore = await cookies()

    // 1. Create a normal client to check the current user's role
    const supabaseClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
        throw new Error('Não autorizado')
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile?.role.includes('ADMIN')) {
        throw new Error('Acesso negado: Somente administradores podem resetar senhas.')
    }

    // 2. Create admin client to reset password
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.')
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: 'senha123' }
    )

    if (error) {
        throw new Error(`Erro ao resetar senha: ${error.message}`)
    }

    return { success: true }
}
