# SkyFlow Control

Build atual: **2.0.0**  
Build local: **09/03/2026 22:20:00**  
Conclusão estimada: **99%**

## Visão geral

SkyFlow Control agora usa uma estrutura mais jogável e próxima de uma operação real de ATC:

- seleção de **um aeroporto por vez** para operar como torre/radar terminal
- radar local em **SVG** com leitura circular estilo ATC
- aeroportos reais com pistas e fixes principais simplificados
- cenários operacionais focados em chegadas e saídas na TMA
- carreira local com progressão por rank
- arquitetura de conteúdo modular via `content/` para DLCs e expansões
- painel Admin local para gerenciar pacotes e importar/exportar conteúdo

## Estrutura

- `index.html` — jogo principal
- `admin.html` — painel administrativo local
- `css/` — estilos do jogo e do admin
- `js/` — core, simulação, radar e UI
- `content/` — pacotes de conteúdo e DLCs
- `assets/branding/` — identidade visual
- `build-info.json` — versão, data/hora e porcentagem de conclusão

## Como rodar localmente

### Opção simples

Abra a pasta do projeto em um servidor local estático.

Exemplo com Python:

```bash
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080/
```

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos da raiz do projeto.
3. Em **Settings > Pages**, selecione a branch principal e a pasta raiz.
4. Aguarde o deploy.
5. O jogo ficará disponível em uma URL do GitHub Pages.

## Admin local

Login padrão:

- usuário: `admin`
- senha: `tower123`

## Conteúdo modular

Cada pacote possui manifest e datasets próprios:

- `airports.json`
- `routes.json`
- `scenarios.json`

A arquitetura permite adicionar novos aeroportos ou DLCs sem alterar o core.

## Observações da build 2.0.0

Esta build substitui o antigo mapa mundial por uma abordagem mais realista e jogável:

- o jogador escolhe uma torre específica
- o radar mostra apenas a área terminal do aeroporto selecionado
- a simulação ficou mais clara para comandos rápidos em mobile e desktop
- a base está pronta para aprofundar táxi, gate, SID/STAR detalhadas e clima avançado nas próximas builds
