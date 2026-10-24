# Chronos

Calendário pessoal com agenda, tarefas e post-its associados a datas. A área Meu espaço reúne Conta, Tarefas e Post-it.

## Executar localmente

Pré-requisitos: Node.js 20.19+ ou 22.12+ e pnpm. No PowerShell, nesta pasta:

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` para habilitar cadastro por e-mail, login e sincronização. Sem essas configurações, o app continua no modo local. Nunca use a chave `service_role`/secret no frontend.

## Publicação

O workflow em `.github/workflows/deploy.yml` compila o site e publica `dist` no GitHub Pages a cada push para `main`. No GitHub, abra **Settings → Secrets and variables → Actions** e crie os segredos `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com o URL do projeto e a chave publicável/anon do Supabase. O cadastro usa confirmação por e-mail; a URL do site e os redirects devem estar permitidos em **Supabase → Authentication → URL Configuration**. O endereço é `https://Gioocode.github.io/chronos/`.

Os dados do app são armazenados na tabela `public.user_data`, com RLS habilitado e políticas que limitam cada linha ao usuário autenticado correspondente. A tabela precisa estar criada no projeto Supabase.

## Estado das plataformas

- **Frontend:** React + TypeScript, calendário diário, mensal e anual, tarefas, post-its, perfil e login por e-mail.
- **Windows desktop:** ainda não implementado.
- **Android:** ainda não implementado.
- **Lembretes enviados por e-mail:** ainda não implementados; a autenticação por e-mail não envia notificações de tarefas.
