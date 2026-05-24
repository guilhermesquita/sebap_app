---
trigger: always_on
---

# Rule: Criação de Formulários

## Visão Geral
Sempre que for solicitada a criação de um formulário, siga **obrigatoriamente** todas as diretrizes abaixo. Sem exceções.

---

## 1. Biblioteca de Formulário
- Utilize sempre **React Hook Form** (`react-hook-form`) para gerenciamento de estado e validação do formulário.
- Nunca use `useState` isolado para controlar campos de formulário.
- Registre os campos com `register` ou `Controller` (para componentes controlados).

```ts
import { useForm, Controller } from 'react-hook-form'
```

---

## 2. Componentes Genéricos (UI Kit)
Sempre utilize os componentes genéricos do projeto para renderizar os campos. Os componentes esperados são:

| Campo       | Componente esperado |
|-------------|----------------------|
| Texto/Email/Senha | `<Input />`   |
| Botão de ação     | `<Button />`  |
| Caixa de seleção  | `<Checkbox />`|
| Lista suspensa    | `<Select />`  |
| Opção única       | `<RadioBox />`|

### ⚠️ Se algum desses componentes não existir no projeto:
> Interrompa e avise o usuário antes de continuar:
> *"O componente `<NomeDoComponente />` não foi encontrado no projeto. Deseja que eu o crie antes de prosseguir com o formulário?"*

Só continue após confirmação ou criação do componente.

---

## 3. Validação dos Campos

### 3.1 Campos Obrigatórios
- Todo campo obrigatório deve:
  - Receber a prop `required` (ou equivalente do componente).
  - Exibir um indicador visual — utilizar asterisco vermelho `*` no label do campo.

```tsx
<label>
  Nome <span style={{ color: 'var(--color-danger)' }}>*</span>
</label>
```

### 3.2 Exibição de Erros
- Quando um campo tiver erro de validação, ele deve:
  1. **Receber borda na cor `danger`** (ex: `border-color: var(--color-danger)` ou classe equivalente do projeto como `border-danger`, `is-invalid`, etc.).
  2. **Exibir uma mensagem de erro** logo abaixo do campo, descritiva e em português.

```tsx
// Exemplo de uso com React Hook Form
const { register, formState: { errors } } = useForm()

<Input
  {...register('email', { required: 'E-mail é obrigatório' })}
  hasError={!!errors.email}  // ou className={errors.email ? 'input-error' : ''}
/>
{errors.email && (
  <span className="error-message">{errors.email.message}</span>
)}
```

### 3.3 Padrão de Props de Erro nos Componentes
Ao usar os componentes genéricos, passe sempre:
- `hasError` (boolean) → ativa a borda danger no componente
- `errorMessage` (string) → exibe a mensagem abaixo do campo

> Se os componentes genéricos ainda não suportarem essas props, solicite ao usuário que as adicione antes de prosseguir.

---

## 4. Estrutura Esperada de um Formulário

```tsx
import { useForm, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

type FormData = {
  nome: string
  email: string
}

export function ExemploForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      <div>
        <label>
          Nome <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <Input
          {...register('nome', { required: 'Nome é obrigatório' })}
          hasError={!!errors.nome}
          errorMessage={errors.nome?.message}
        />
      </div>

      <div>
        <label>
          E-mail <span style={{ color: 'var(--color-danger)' }}>*</span>
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

      <Button type="submit">Enviar</Button>

    </form>
  )
}
```

---

## 5. Checklist antes de entregar o formulário

Antes de finalizar, confirme:

- [ ] React Hook Form está sendo usado
- [ ] Todos os campos usam componentes genéricos do projeto
- [ ] Campos obrigatórios têm o `*` vermelho no label
- [ ] Campos com erro exibem borda na cor `danger`
- [ ] Mensagem de erro descritiva aparece abaixo de cada campo inválido
- [ ] O `<Button />` genérico foi usado para submissão
- [ ] Não foi usado `useState` para controlar valores dos campos

---

## Referências
- [React Hook Form Docs](https://react-hook-form.com/)
- [React Hook Form + Controller](https://react-hook-form.com/docs/usecontroller/controller)