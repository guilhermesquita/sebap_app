import { z } from 'zod'

export const registerSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    surname: z.string().min(1, 'Sobrenome é obrigatório'),
    email: z.string().email('Formato de e-mail inválido').min(1, 'E-mail é obrigatório'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    cpf: z.string()
        .min(1, 'CPF é obrigatório')
        .refine(val => val.replace(/\D/g, '').length === 11, 'CPF deve ter 11 dígitos'),
    phone: z.string().optional(),
    tenda_id: z.string().min(1, 'Selecione uma tenda'),
    birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
    sex: z.enum(['Masculino', 'Feminino']),
    is_baptized: z.boolean(),
})

export type RegisterFormData = z.infer<typeof registerSchema>
