# Skill: create-form

## Objetivo
Ensina o agente a criar um formulário completo no projeto, do zero, seguindo todos os padrões definidos.

---

## Pré-requisitos — Verifique antes de começar

Antes de escrever qualquer código, confirme a existência dos seguintes componentes no projeto:

```
src/components/ui/Input.tsx      ✅ ou ❌
src/components/ui/Button.tsx     ✅ ou ❌
src/components/ui/Select.tsx     ✅ ou ❌
src/components/ui/Checkbox.tsx   ✅ ou ❌
src/components/ui/RadioBox.tsx   ✅ ou ❌
```

> Se algum não existir: informe ao usuário e consulte a Skill `create-generic-component`
> antes de continuar.

---

## Passo 1 — Identifique os campos do formulário

Extraia do pedido do usuário:
- Nome do formulário (ex: `LoginForm`, `CadastroUsuarioForm`)
- Lista de campos com seus tipos e se são obrigatórios
- Ação do submit (o que acontece ao enviar?)

Monte uma tabela mental antes de codar:

| Campo      | Tipo        | Componente   | Obrigatório |
|------------|-------------|--------------|-------------|
| nome       | text        | `<Input />`  | Sim         |
| email      | email       | `<Input />`  | Sim         |
| perfil     | select      | `<Select />` | Sim         |
| ativo      | checkbox    | `<Checkbox/>`| Não         |

---

## Passo 2 — Crie o arquivo do formulário

Siga a estrutura de pastas do projeto. Se não houver convenção definida, use:

```
src/
  components/
    forms/
      NomeDoForm/
        index.tsx         ← componente do formulário
        types.ts          ← tipagem dos dados (FormData)
        validation.ts     ← regras de validação separadas (opcional, para forms grandes)
```

---

## Passo 3 — Defina o tipo FormData

Sempre em arquivo separado `types.ts` ou no topo do componente se for simples:

```ts
// types.ts
export type NomeDoFormData = {
  nome: string
  email: string
  perfil: string
  ativo: boolean
}
```

---

## Passo 4 — Monte o componente com React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import type { NomeDoFormData } from './types'

export function NomeDoForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NomeDoFormData>({
    defaultValues: {
      nome: '',
      email: '',
      perfil: '',
      ativo: false,
    },
  })

  const onSubmit = async (data: NomeDoFormData) => {
    // lógica de envio
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* Campo: Nome */}
      <div>
        <label>
          Nome <span className="text-danger">*</span>
        </label>
        <Input
          {...register('nome', { required: 'Nome é obrigatório' })}
          hasError={!!errors.nome}
          errorMessage={errors.nome?.message}
        />
      </div>

      {/* Campo: Email */}
      <div>
        <label>
          E-mail <span className="text-danger">*</span>
        </label>
        <Input
          type="email"
          {...register('email', {
            required: 'E-mail é obrigatório',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Formato de e-mail inválido',
            },
          })}
          hasError={!!errors.email}
          errorMessage={errors.email?.message}
        />
      </div>

      {/* Campo: Select (usar Controller para componentes controlados) */}
      <div>
        <label>
          Perfil <span className="text-danger">*</span>
        </label>
        <Controller
          name="perfil"
          control={control}
          rules={{ required: 'Perfil é obrigatório' }}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { label: 'Admin', value: 'admin' },
                { label: 'Usuário', value: 'user' },
              ]}
              hasError={!!errors.perfil}
              errorMessage={errors.perfil?.message}
            />
          )}
        />
      </div>

      {/* Campo: Checkbox (sem obrigatoriedade) */}
      <div>
        <Controller
          name="ativo"
          control={control}
          render={({ field }) => (
            <Checkbox
              {...field}
              label="Usuário ativo"
              checked={field.value}
            />
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Salvar'}
      </Button>

    </form>
  )
}
```

---

## Passo 5 — Padrão de props de erro nos componentes genéricos

Todo componente genérico deve receber e tratar:

| Prop           | Tipo      | Comportamento esperado                          |
|----------------|-----------|-------------------------------------------------|
| `hasError`     | boolean   | Aplica `border-color: var(--color-danger)`      |
| `errorMessage` | string    | Exibe mensagem vermelha abaixo do campo         |
| `required`     | boolean   | Exibe `*` no label interno (se o componente gerenciar o label) |

---

## Passo 6 — Checklist final

Antes de entregar, confirme:

- [ ] `useForm` do React Hook Form está sendo usado
- [ ] Campos controlados (Select, Checkbox, Radio) usam `Controller`
- [ ] Campos com texto usam `register`
- [ ] Todos os campos usam componentes genéricos (`Input`, `Button`, etc.)
- [ ] Campos obrigatórios têm `*` vermelho no label
- [ ] `hasError` e `errorMessage` estão sendo passados para cada campo
- [ ] O botão de submit usa `<Button />` com estado `isSubmitting`
- [ ] O `<form>` tem `noValidate` para desabilitar a validação nativa do browser
- [ ] O tipo `FormData` está definido