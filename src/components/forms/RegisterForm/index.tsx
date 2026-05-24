'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Mail, Lock, CreditCard, Phone, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { registerSchema, RegisterFormData } from './types'
import { Tenda } from '@/types/database'
import styles from '@/app/register/register.module.css'

interface RegisterFormProps {
    tendas: Tenda[]
    onSubmit: (data: RegisterFormData) => Promise<void>
    isLoading: boolean
    externalError?: string | null
}

const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .slice(0, 14)
}

const maskPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15)
}

export function RegisterForm({ tendas, onSubmit, isLoading, externalError }: RegisterFormProps) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema) as any,
        defaultValues: {
            name: '',
            surname: '',
            email: '',
            password: '',
            cpf: '',
            phone: '',
            is_baptized: false,
            tenda_id: '',
            birth_date: '',
            sex: 'Masculino',
        },
    })

    const onLocalSubmit = async (data: RegisterFormData) => {
        await onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit(onLocalSubmit)} className={styles.form} noValidate>
            {externalError && <div className={styles.errorMessage}>{externalError}</div>}

            <div className={styles.grid}>
                <div className={styles.inputGroup}>
                    <label>
                        Nome <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Input
                        {...register('name')}
                        placeholder="Ex: João"
                        icon={<User size={18} />}
                        hasError={!!errors.name}
                        errorMessage={errors.name?.message}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        Sobrenome <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Input
                        {...register('surname')}
                        placeholder="Ex: Silva"
                        icon={<User size={18} />}
                        hasError={!!errors.surname}
                        errorMessage={errors.surname?.message}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        E-mail <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Input
                        type="email"
                        {...register('email')}
                        placeholder="seu@email.com"
                        icon={<Mail size={18} />}
                        hasError={!!errors.email}
                        errorMessage={errors.email?.message}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        Senha <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Input
                        type="password"
                        {...register('password')}
                        placeholder="********"
                        icon={<Lock size={18} />}
                        hasError={!!errors.password}
                        errorMessage={errors.password?.message}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        CPF <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Controller
                        name="cpf"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                placeholder="000.000.000-00"
                                icon={<CreditCard size={18} />}
                                onChange={(e) => {
                                    const masked = maskCPF(e.target.value)
                                    field.onChange(masked)
                                }}
                                hasError={!!errors.cpf}
                                errorMessage={errors.cpf?.message}
                            />
                        )}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Telefone</label>
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                placeholder="(00) 00000-0000"
                                icon={<Phone size={18} />}
                                onChange={(e) => {
                                    const masked = maskPhone(e.target.value)
                                    field.onChange(masked)
                                }}
                                hasError={!!errors.phone}
                                errorMessage={errors.phone?.message}
                            />
                        )}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        Qual tenda você pertence? <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Select
                        {...register('tenda_id')}
                        hasError={!!errors.tenda_id}
                        errorMessage={errors.tenda_id?.message}
                    >
                        <option value="">Selecione uma tenda</option>
                        {tendas.map((tenda) => (
                            <option key={tenda.id} value={tenda.id}>
                                {tenda.name}
                            </option>
                        ))}
                    </Select>
                </div>


                <div className={styles.inputGroup}>
                    <label>
                        Data de Nascimento <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Input
                        type="date"
                        {...register('birth_date')}
                        icon={<Calendar size={18} />}
                        hasError={!!errors.birth_date}
                        errorMessage={errors.birth_date?.message}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>
                        Sexo <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <Select
                        {...register('sex')}
                        hasError={!!errors.sex}
                        errorMessage={errors.sex?.message}
                    >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </Select>
                </div>
            </div>

            <div className={styles.checkboxGroup}>
                <Controller
                    name="is_baptized"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                            label="Já é batizado?"
                            checked={value}
                            onChange={(e) => onChange(e.target.checked)}
                            {...field}
                        />
                    )}
                />
            </div>

            <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                Finalizar Cadastro
            </Button>
        </form>
    )
}
