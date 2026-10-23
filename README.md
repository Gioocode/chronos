# Chronos

Calendário pessoal e lembretes. O site tem calendário mensal, agenda, tarefas, post-its associados a datas e a área Meu espaço com Conta, Tarefas e Post-it.

## Começar pelo frontend

Pré-requisito: Node.js 20.19+ ou 22.12+ e pnpm. No Windows, abra PowerShell nesta pasta:

```powershell
pnpm install
pnpm dev
```

O Vite mostrará o endereço local para abrir no navegador. Sem login, as tarefas e os post-its ficam no navegador. Com Supabase configurado, cada pessoa sincroniza os próprios dados entre dispositivos.

## Publicação do site

O repositório `chronos` é público para permitir a publicação gratuita pelo GitHub Pages. O workflow em `.github/workflows/deploy.yml` compila o site e publica `dist` a cada push para `main`. O endereço terá o formato `https://Gioocode.github.io/chronos/`.

Os dados de demonstração não são compartilhados entre contas.

## Login e sincronização com Supabase

O app usa Supabase Auth com OAuth Google e uma linha JSON por usuário na tabela `public.user_data`. As políticas de Row Level Security (RLS) em `supabase/schema.sql` limitam leitura e escrita ao usuário autenticado. Nunca coloque a `service_role` key no site; o frontend usa somente a publishable/anon key com RLS.

Para habilitar:

1. Crie um projeto Supabase e execute `supabase/schema.sql` no SQL Editor.
2. Em Authentication → Providers, ative Google. Cadastre no Google Cloud um OAuth Client para Web; use `https://gioocode.github.io` como origem autorizada e a callback URL indicada na configuração do provedor Supabase como URI autorizada. Cole Client ID e Client Secret no Supabase.
3. Em Authentication → URL Configuration, defina Site URL e redirect permitido como `https://gioocode.github.io/chronos/`.
4. Em GitHub → Settings → Secrets and variables → Actions, crie os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto. Rode o workflow novamente para compilar o site com a configuração.
5. Para desenvolvimento local, copie `.env.example` para `.env.local` e preencha os mesmos valores.

Sem essas configurações, o botão Google informa que a integração ainda não foi ativada e o site continua funcionando em modo local. O plano grátis do Supabase pode pausar projetos inativos; consulte os limites atuais no painel do provedor.

## Avisos por e-mail

A interface apresenta a configuração de avisos, mas envio agendado ainda não está implementado. É necessário adicionar um provedor SMTP/e-mail e uma rotina backend agendada; a entrega SMTP padrão do Supabase é restrita para desenvolvimento e não serve como serviço de lembretes em produção.

## Estado das plataformas

- **Frontend:** React + TypeScript, calendário, tarefas, post-its por data e Conta.
- **Windows desktop:** ainda não implementado. A próxima etapa é integrar Tauri 2 e janelas nativas de post-it.
- **Android:** ainda não implementado. Widgets nativos precisam de um projeto Android próprio; não há integração visual que os substitua.
- **Sincronização:** Supabase Auth e persistência por usuário prontos para ativar com as configurações do projeto.

## Pré-requisitos verificados

Ambiente observado em 23/10/2026: Windows 11 (build 26100) e Node.js 24.22.1. O comando `pnpm` está disponível. Não foram encontrados Rust/Cargo, Gradle ou Android Debug Bridge (`adb`); o Java exposto no PATH parece ser um redirecionador Java 8 e não foi possível confirmar um JDK de desenvolvimento. A consulta CIM do Windows não estava acessível. Portanto, a compilação Tauri e Android não foi validada.

Para habilitar a etapa Windows, instale Rust (toolchain MSVC), Microsoft C++ Build Tools com o workload Desktop development with C++, e WebView2 Runtime. Para a etapa Android, instale Android Studio, um JDK compatível, Android SDK e Platform Tools. As versões devem ser escolhidas e conferidas contra a documentação oficial quando iniciarmos essas etapas.

## Organização

- `src/model.ts`: tarefas, compromissos, post-its e dados iniciais.
- `src/App.tsx`: calendário mensal, agenda diária, tarefas e quadro de post-its.
- `src/styles.css`: identidade visual e comportamento responsivo.
