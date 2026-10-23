# Chronos

Calendário pessoal e lembretes, começando pelo núcleo compartilhado. Esta primeira etapa traz uma interface React + TypeScript, tarefas e compromissos de demonstração, post-its editáveis e persistência local no navegador.

## Começar pelo frontend

Pré-requisito: Node.js 20.19+ ou 22.12+ e pnpm. No Windows, abra PowerShell nesta pasta:

```powershell
pnpm install
pnpm dev
```

O Vite mostrará o endereço local para abrir no navegador. As alterações de tarefas e post-its são salvas em `localStorage` neste dispositivo e neste navegador.

## Publicar no GitHub Pages

O workflow em `.github/workflows/deploy.yml` compila o site e publica a pasta `dist` no GitHub Pages quando há um push para `main`. O nome esperado para o repositório é `chronos`, pois o Vite gera caminhos para `/chronos/`. Depois de enviar os arquivos, configure **Settings → Pages → Build and deployment → Source: GitHub Actions**. O endereço terá o formato `https://SEU-USUARIO.github.io/chronos/`.

Os dados de demonstração não são compartilhados: tarefas e post-its ficam apenas no armazenamento local do navegador em que foram criados.

## Estado das plataformas

- **Frontend:** interface inicial e modelo comum em `src/model.ts`; dados locais no navegador.
- **Windows desktop:** ainda não implementado. A próxima etapa é integrar Tauri 2 e janelas nativas de post-it.
- **Android:** ainda não implementado. Widgets nativos precisam de um projeto Android próprio; não há integração visual que os substitua.
- **Sincronização:** não implementada. Os dados permanecem no dispositivo.

## Pré-requisitos verificados

Ambiente observado em 23/10/2026: Windows 11 (build 26100) e Node.js 24.22.1. O comando `pnpm` está disponível. Não foram encontrados Rust/Cargo, Gradle ou Android Debug Bridge (`adb`); o Java exposto no PATH parece ser um redirecionador Java 8 e não foi possível confirmar um JDK de desenvolvimento. A consulta CIM do Windows não estava acessível. Portanto, a compilação Tauri e Android não foi validada.

Para habilitar a etapa Windows, instale Rust (toolchain MSVC), Microsoft C++ Build Tools com o workload Desktop development with C++, e WebView2 Runtime. Para a etapa Android, instale Android Studio, um JDK compatível, Android SDK e Platform Tools. As versões devem ser escolhidas e conferidas contra a documentação oficial quando iniciarmos essas etapas.

## Organização

- `src/model.ts`: tarefas, compromissos, post-its e dados iniciais.
- `src/App.tsx`: calendário mensal, agenda diária, tarefas e quadro de post-its.
- `src/styles.css`: identidade visual e comportamento responsivo.
