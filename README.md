# Chronos

Calendário pessoal com agenda, tarefas e post-its associados a datas. A área Meu espaço reúne Conta, Tarefas e Post-it.

## Executar localmente

Pré-requisitos: Node.js 20.19+ ou 22.12+ e pnpm. No PowerShell, nesta pasta:

```powershell
pnpm install
pnpm dev
```

Tarefas, compromissos, post-its, perfil e preferências de lembrete são salvos no armazenamento local do navegador. No momento, não há criação de conta, login ou sincronização entre dispositivos. Os avisos por e-mail ainda não são enviados; a tela guarda apenas sua preferência.

## Publicação

O workflow em `.github/workflows/deploy.yml` compila o site e publica `dist` no GitHub Pages a cada push para `main`. O endereço é `https://Gioocode.github.io/chronos/`.

## Estado das plataformas

- **Frontend:** React + TypeScript, calendário diário, mensal e anual, tarefas, post-its e perfil local.
- **Windows desktop:** ainda não implementado.
- **Android:** ainda não implementado.
- **Conta online e sincronização:** fora do escopo desta etapa.
