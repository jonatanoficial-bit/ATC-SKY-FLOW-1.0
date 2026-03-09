# SkyFlow Control

SkyFlow Control é um jogo web mobile-first em HTML, CSS e JavaScript puro que simula controle de tráfego aéreo com mapa mundial estilizado, aeroportos reais, progressão de carreira, conteúdo modular e painel Admin local.

## O que vem nesta entrega

- jogo funcional com mapa do mundo, aeroportos reais e malha aérea dinâmica
- layout mobile-first com suporte completo para desktop
- visual premium com glassmorphism, microinterações e HUD estilo produto AAA
- sistema de carreira local com XP, créditos, ranks e recordes
- arquitetura modular de conteúdo via `content/` com manifests JSON
- DLCs built-in e suporte a pacotes customizados salvos em `localStorage`
- painel Admin local em `admin.html` para criar, editar, remover, exportar e importar pacotes
- estrutura pronta para GitHub Pages
- service worker e `manifest.webmanifest` para experiência mais próxima de app

## Credenciais padrão do Admin

- usuário: `admin`
- senha: `tower123`

As credenciais são locais e podem ser alteradas no próprio painel Admin.

## Estrutura do projeto

```text
skyflow-control/
├── admin.html
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── README.md
├── assets/
│   ├── branding/
│   └── data/
├── content/
│   ├── index.json
│   ├── core/
│   ├── dlc_north_atlantic/
│   └── dlc_pacific_horizons/
├── css/
│   ├── tokens.css
│   ├── styles.css
│   └── admin.css
└── js/
    ├── app.js
    ├── admin/
    ├── core/
    └── game/
```

## Como rodar localmente

Como o jogo carrega manifests e datasets JSON, o ideal é servir o projeto por HTTP local.

### Opção 1: Python

```bash
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080
```

### Opção 2: VS Code Live Server

Abra a pasta do projeto e use a extensão Live Server.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta para a branch principal.
3. No GitHub, entre em **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch principal e a pasta `/root`.
6. Salve.
7. Aguarde o GitHub Pages publicar a URL.

Tudo está com caminhos relativos, então a estrutura já está pronta para publicação estática.

## Como jogar

1. Abra `index.html` pelo servidor local ou pela URL publicada.
2. Escolha um briefing na tela inicial.
3. Toque em **Iniciar janela**.
4. Selecione um voo pelo mapa ou pela lista de flight strips.
5. Use os comandos:
   - `ALT +` e `ALT −`
   - `SPD +` e `SPD −`
   - `Vetor ◀` e `Vetor ▶`
   - `Holding`
   - `Prioridade`
6. Mantenha separação entre aeronaves e reduza altitude antes da aproximação final.
7. Ao fim da sessão, o debrief atualiza a carreira local.

## Sistema de conteúdo e DLC

O core do jogo não precisa ser alterado para expandir conteúdo.

### Como funciona

- `content/index.json` lista os pacotes disponíveis.
- cada pacote tem um `manifest.json`
- cada manifesto aponta para:
  - `airports.json`
  - `routes.json`
  - `scenarios.json`
- o `ContentManager` resolve pacotes ativos e mistura tudo em tempo de execução
- o perfil do jogador guarda quais pacotes estão ativos
- pacotes customizados criados pelo Admin são salvos em `localStorage`

### Built-in incluídos

- `core`
- `dlc_north_atlantic`
- `dlc_pacific_horizons`

## Painel Admin

Abra `admin.html`.

### O que dá para fazer

- login local
- ativar e desativar pacotes no perfil atual
- clonar DLC built-in para criar variações
- criar pacote custom do zero
- editar datasets JSON de aeroportos, rotas e cenários
- subir cover image opcional para o pacote
- exportar um pacote individual
- exportar o estado completo do Admin
- importar estado completo ou pacote isolado
- alterar as regras globais locais do jogo
- trocar as credenciais locais do painel

## Modelo de pacote custom

Cada pacote segue esta estrutura lógica:

```json
{
  "id": "custom_global_lane",
  "title": "Custom Global Lane",
  "subtitle": "Expansão personalizada",
  "version": "1.0.0",
  "unlockRank": "cadet",
  "description": "Pacote criado no Admin.",
  "theme": {
    "accent": "#72f6d5",
    "glow": "#6da9ff",
    "surface": "#0f1830"
  },
  "datasets": {
    "airports": [],
    "routes": [],
    "scenarios": []
  }
}
```

## Próximos passos fáceis de adicionar

- backend real para autenticação e persistência multiusuário
- ranking online
- economia mais profunda de carreira
- eventos ao vivo por região
- meteorologia mais complexa
- miniaturas 3D reais em WebGL
- campanhas guiadas por narrativas
- replay operacional e heatmaps

## Observações técnicas

- projeto feito sem frameworks
- usa apenas HTML, CSS e JavaScript vanilla
- dados de progresso e Admin ficam em `localStorage`
- há fallback de conteúdo embutido para reduzir risco em ambientes onde o fetch local falhar
- o service worker faz cache local dos assets principais

## Licença sugerida

Se desejar publicar no GitHub, recomendo adicionar uma licença MIT.
