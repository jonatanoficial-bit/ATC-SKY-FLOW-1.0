# SkyFlow Control

Build atual: **2.1.0**  
Conclusão estimada: **99%**

## Visão geral
SkyFlow Control é um simulador ATC mobile-first em HTML, CSS e JavaScript puro. Nesta build, o foco saiu do mapa mundial e passou para uma operação mais realista: o jogador escolhe um aeroporto principal e opera apenas a TMA local, com radar em SVG, comunicações estilo máquina de escrever, carreira, conteúdo modular e suporte a português e inglês.

## O que há nesta build
- seleção de aeroportos principais do mundo com ICAO/IATA reais
- radar local em SVG com fixes, pistas e TMA por aeroporto
- miniaturas visuais de aeronaves inspiradas em modelos reais ICAO
- chegadas e saídas separadas
- rádio / CPDLC simplificado com mensagens estilo typewriter
- comandos ATC digitados ou por atalhos rápidos
- interface bilíngue PT/EN
- estrutura pronta para GitHub Pages
- área Admin mantida para evolução do conteúdo

## Aeroportos incluídos
- SBGR / GRU — São Paulo Guarulhos
- KJFK / JFK — New York JFK
- EGLL / LHR — London Heathrow
- OMDB / DXB — Dubai International
- RJTT / HND — Tokyo Haneda
- EDDF / FRA — Frankfurt
- LFPG / CDG — Paris Charles de Gaulle
- EHAM / AMS — Amsterdam Schiphol

## Como rodar localmente
Como o projeto usa módulos ES, rode em servidor local.

### Opção 1 — Python
```bash
python -m http.server 8080
```
Depois abra:
```text
http://localhost:8080
```

### Opção 2 — VS Code Live Server
Abra a pasta do projeto e use a extensão Live Server.

## Como publicar no GitHub Pages
1. Suba o conteúdo deste projeto para um repositório GitHub.
2. Em **Settings > Pages**, configure a branch principal e a pasta raiz.
3. Aguarde a publicação.
4. Como o projeto é estático e inclui `.nojekyll`, ele é compatível com GitHub Pages.

## Estrutura principal
```text
/assets              logos, ícones e dados auxiliares
/content/core        aeroportos e cenários base
/content/dlc_*       espaço para expansões modulares
/css                 tokens e estilos
/js/game             simulação e radar
/js/admin            área administrativa
build-info.json      versão, data/hora e progresso da build
```

## Comandos ATC aceitos
- `ALT 5000`
- `HDG 270`
- `SPD 180`
- `APP`
- `LAND`
- `TAXI`
- `TAKEOFF`
- `HANDOFF`
- `HOLD`

## Observações importantes
- Os aeroportos, frequências, pistas, fixes e lógica operacional foram simplificados para manter a jogabilidade.
- A base foi desenhada para futura expansão com STAR/SID mais detalhadas, vento, ocupação de pista, separação por wake turbulence e integração com backend.
- O Admin atual continua local/static-first e pronto para evoluir.
