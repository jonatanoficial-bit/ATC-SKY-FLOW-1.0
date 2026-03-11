import { MapRenderer } from './game/map-renderer.js';
import { SimulationEngine, rankOrder } from './game/simulation.js';

const refs = {
  screens: {
    dashboard: document.getElementById('dashboardScreen'),
    game: document.getElementById('gameScreen'),
    content: document.getElementById('contentScreen')
  },
  navButtons: [...document.querySelectorAll('[data-screen]')],
  airportGrid: document.getElementById('airportGrid'),
  airportCountTag: document.getElementById('airportCountTag'),
  scenarioGrid: document.getElementById('scenarioGrid'),
  selectedScenarioTag: document.getElementById('selectedScenarioTag'),
  startScenarioButton: document.getElementById('startScenarioButton'),
  openContentButton: document.getElementById('openContentButton'),
  pauseButton: document.getElementById('pauseButton'),
  rankPill: document.getElementById('rankPill'),
  heroAirport: document.getElementById('heroAirport'),
  heroAirportMeta: document.getElementById('heroAirportMeta'),
  heroScenario: document.getElementById('heroScenario'),
  heroScenarioMeta: document.getElementById('heroScenarioMeta'),
  hudTime: document.getElementById('hudTime'),
  hudScore: document.getElementById('hudScore'),
  hudCalm: document.getElementById('hudCalm'),
  hudLandings: document.getElementById('hudLandings'),
  hudHandoffs: document.getElementById('hudHandoffs'),
  selectedAirportTitle: document.getElementById('selectedAirportTitle'),
  selectedAirportTag: document.getElementById('selectedAirportTag'),
  airportBrief: document.getElementById('airportBrief'),
  radioLog: document.getElementById('radioLog'),
  liveFlightsCount: document.getElementById('liveFlightsCount'),
  flightStripList: document.getElementById('flightStripList'),
  selectedFlightTitle: document.getElementById('selectedFlightTitle'),
  selectedFlightTag: document.getElementById('selectedFlightTag'),
  selectedFlightCard: document.getElementById('selectedFlightCard'),
  quickCommandGrid: document.getElementById('quickCommandGrid'),
  commandGroups: document.getElementById('commandGroups'),
  commandPadHint: document.getElementById('commandPadHint'),
  buildChip: document.getElementById('buildChip'),
  completionChip: document.getElementById('completionChip'),
  buildHud: document.getElementById('buildHud'),
  toastLayer: document.getElementById('toastLayer'),
  worldStage: document.getElementById('worldStage'),
  radarSvg: document.getElementById('radarSvg'),
  markerLayer: document.getElementById('markerLayer'),
  languageToggle: document.getElementById('languageToggle'),
  statsGrid: document.getElementById('statsGrid')
};

const dictionary = {
  pt: {
    premiumLabel: 'Simulação ATC premium',
    pause: 'Pausar',
    towerSelectEyebrow: 'Seleção de torre',
    heroTitle: 'Escolha um aeroporto principal e opere apenas a TMA local como um controlador real.',
    heroText: 'Entre em serviço em um hub real, receba chamadas em estilo máquina de escrever, coordene táxi, decolagem, aproximação e saída do espaço aéreo com radar local inspirado em ATC real.',
    startOperation: 'Iniciar operação',
    manageContent: 'Gerenciar conteúdo',
    activeAirport: 'Aeroporto ativo',
    activeScenario: 'Janela',
    realismMode: 'Modo',
    realismValue: 'Radar local + rádio bilíngue',
    majorAirports: 'Aeroportos principais',
    chooseTower: 'Escolha a torre que você vai operar',
    operationWindows: 'Janelas operacionais',
    chooseIntensity: 'Escolha a intensidade da sessão',
    liveOperation: 'Operação em andamento',
    time: 'Tempo',
    score: 'Score',
    calm: 'Calma',
    landings: 'Pousos',
    handoffs: 'Handoffs',
    stable: 'Estável',
    attention: 'Atenção',
    conflict: 'Conflito',
    selectedTower: 'Torre selecionada',
    radioFeed: 'Rádio / CPDLC simplificado',
    liveComms: 'Mensagens ao vivo',
    activeTraffic: 'Tráfego ativo',
    flightStrips: 'Flight strips',
    directControl: 'Controle direto',
    selectFlight: 'Selecione um voo',
    tapFlightHint: 'Toque em uma faixa ou contato radar para abrir comandos da aeronave.',
    mobileAtcPad: 'Painel ATC mobile-first',
    tapCommands: 'Comandos por toque',
    dashboard: 'Dashboard',
    operation: 'Operação',
    content: 'Conteúdo',
    low: 'baixo',
    activeFlights: '{{count}} voos',
    rankNames: { cadet: 'Cadete', controller: 'Controlador', director: 'Diretor', chief: 'Chief ATC' },
    rankLabel: '{{rank}} • XP {{xp}}',
    statsSessions: 'Sessões',
    statsCredits: 'Créditos',
    statsBest: 'Melhor score',
    statsCompletion: 'Conclusão média',
    selectedScenarioFallback: 'Base',
    towerTag: '{{icao}} · TMA {{tma}}nm',
    airportBrief1: 'Pistas ativas: {{arr}} ARR / {{dep}} DEP',
    airportBrief2: 'Freq.: TWR {{tower}} · APP {{app}} · GND {{ground}}',
    airportBrief3: 'TA {{alt}}ft · Elev. {{elev}}ft · {{tz}}',
    airportBrief4: 'Chegadas: {{arrfix}} · Saídas: {{depfix}}',
    stripStatus: '{{status}} · {{alt}}ft · {{spd}}kt',
    noSession: 'Sem sessão',
    commandSentToast: 'Mensagem transmitida',
    sessionComplete: 'Sessão concluída',
    welcomeRadio: 'Selecione uma torre, escolha uma janela e assuma a posição.',
    stripArrival: 'Chegada',
    stripDeparture: 'Saída'
  },
  en: {
    premiumLabel: 'Premium ATC simulation',
    pause: 'Pause',
    towerSelectEyebrow: 'Tower selection',
    heroTitle: 'Choose a major airport and operate only the local TMA like a real controller.',
    heroText: 'Go on position at a real hub, receive typewriter-style calls, coordinate taxi, departure, approach and airspace exit with a local radar inspired by real ATC displays.',
    startOperation: 'Start operation',
    manageContent: 'Manage content',
    activeAirport: 'Active airport',
    activeScenario: 'Window',
    realismMode: 'Mode',
    realismValue: 'Local radar + bilingual radio',
    majorAirports: 'Major airports',
    chooseTower: 'Choose the tower you will operate',
    operationWindows: 'Operational windows',
    chooseIntensity: 'Choose session intensity',
    liveOperation: 'Live operation',
    time: 'Time',
    score: 'Score',
    calm: 'Calm',
    landings: 'Landings',
    handoffs: 'Handoffs',
    stable: 'Stable',
    attention: 'Attention',
    conflict: 'Conflict',
    selectedTower: 'Selected tower',
    radioFeed: 'Radio / simplified CPDLC',
    liveComms: 'Live messages',
    activeTraffic: 'Active traffic',
    flightStrips: 'Flight strips',
    directControl: 'Direct control',
    selectFlight: 'Select a flight',
    tapFlightHint: 'Tap a strip or radar contact to open aircraft controls.',
    mobileAtcPad: 'Mobile-first ATC pad',
    tapCommands: 'Tap commands',
    dashboard: 'Dashboard',
    operation: 'Operation',
    content: 'Content',
    low: 'low',
    activeFlights: '{{count}} flights',
    rankNames: { cadet: 'Cadet', controller: 'Controller', director: 'Director', chief: 'Chief ATC' },
    rankLabel: '{{rank}} • XP {{xp}}',
    statsSessions: 'Sessions',
    statsCredits: 'Credits',
    statsBest: 'Best score',
    statsCompletion: 'Average completion',
    selectedScenarioFallback: 'Base',
    towerTag: '{{icao}} · TMA {{tma}}nm',
    airportBrief1: 'Active runways: {{arr}} ARR / {{dep}} DEP',
    airportBrief2: 'Freq.: TWR {{tower}} · APP {{app}} · GND {{ground}}',
    airportBrief3: 'TA {{alt}}ft · Elev. {{elev}}ft · {{tz}}',
    airportBrief4: 'Arrivals: {{arrfix}} · Departures: {{depfix}}',
    stripStatus: '{{status}} · {{alt}}ft · {{spd}}kt',
    noSession: 'No session',
    commandSentToast: 'Message transmitted',
    sessionComplete: 'Session complete',
    welcomeRadio: 'Select a tower, choose a window and go on position.',
    stripArrival: 'Arrival',
    stripDeparture: 'Departure'
  }
};

const storageKey = 'skyflow-control-profile-v2';
const defaultProfile = {
  xp: 0,
  credits: 0,
  sessions: 0,
  bestScore: 0,
  completionAverage: 0,
  language: 'pt',
  unlockedRank: 'cadet'
};


async function clearLegacyCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('skyflow-cache')).map((key) => caches.delete(key)));
    }
  } catch {}
}

const state = {
  profile: loadProfile(),
  airports: [],
  scenarios: [],
  selectedAirportId: null,
  selectedScenarioId: null,
  selectedFlightId: null,
  activeScreen: 'dashboard',
  buildInfo: null,
  sessionApplied: false,
  lastFrame: 0
};

const renderer = new MapRenderer({
  stage: refs.worldStage,
  radarSvg: refs.radarSvg,
  markerLayer: refs.markerLayer,
  onSelectFlight: (flightId) => {
    state.selectedFlightId = flightId;
    renderFlightSelection();
  }
});

const simulation = new SimulationEngine({
  onEvent: (event) => {
    pushToast(event.message);
    if (event.type === 'session_end' && !state.sessionApplied) {
      applySessionResult();
    }
  },
  onRadio: (entry) => appendRadioEntry(entry)
});

function loadProfile() {
  try {
    return { ...defaultProfile, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
  } catch {
    return { ...defaultProfile };
  }
}

function saveProfile() {
  localStorage.setItem(storageKey, JSON.stringify(state.profile));
}

function t(key, vars = {}) {
  const lang = state.profile.language;
  let value = dictionary[lang][key] || dictionary.pt[key] || key;
  if (typeof value === 'object') return value;
  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{{${name}}}`, replacement);
  });
  return value;
}

function currentAirport() {
  return state.airports.find((airport) => airport.id === state.selectedAirportId) || null;
}

function currentScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.selectedScenarioId) || null;
}

function currentSession() {
  return simulation.getState();
}

function currentFlight() {
  return currentSession()?.flights?.find((flight) => flight.id === state.selectedFlightId) || null;
}

function getCurrentRank() {
  const xp = state.profile.xp;
  if (xp >= 4200) return 'chief';
  if (xp >= 2600) return 'director';
  if (xp >= 1200) return 'controller';
  return 'cadet';
}

function airportUnlocked(airport) {
  const currentIndex = rankOrder.indexOf(getCurrentRank());
  return currentIndex >= rankOrder.indexOf(airport.unlockRank || 'cadet');
}

function setScreen(screenId) {
  state.activeScreen = screenId;
  Object.entries(refs.screens).forEach(([key, screen]) => screen.classList.toggle('active', key === screenId));
  refs.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.screen === screenId));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function pushToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  refs.toastLayer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function applyTranslations() {
  document.documentElement.lang = state.profile.language === 'pt' ? 'pt-BR' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });
  if (state.buildInfo) {
    refs.buildHud.textContent = `Build ${state.buildInfo.version} • ${state.buildInfo.buildLocal} • ${state.profile.language === 'pt' ? 'Conclusão' : 'Completion'} ${state.buildInfo.completion}`;
    refs.completionChip.textContent = `${state.profile.language === 'pt' ? 'Conclusão' : 'Completion'}: ${state.buildInfo.completion}`;
  }
}

async function loadData() {
  const [airports, scenarios] = await Promise.all([
    fetch('./content/core/airports.json').then((res) => res.json()),
    fetch('./content/core/scenarios.json').then((res) => res.json())
  ]);
  state.airports = airports;
  state.scenarios = scenarios;
  state.selectedAirportId = airports.find(airportUnlocked)?.id || airports[0]?.id || null;
  state.selectedScenarioId = scenarios[0]?.id || null;
}

async function renderBuildInfo() {
  try {
    const info = await fetch('./build-info.json', { cache: 'no-store' }).then((res) => res.json());
    state.buildInfo = info;
    refs.buildChip.textContent = `Build ${info.version} • ${info.buildLocal}`;
    refs.completionChip.textContent = `${state.profile.language === 'pt' ? 'Conclusão' : 'Completion'}: ${info.completion}`;
    refs.buildHud.textContent = `Build ${info.version} • ${info.buildLocal} • ${state.profile.language === 'pt' ? 'Conclusão' : 'Completion'} ${info.completion}`;
  } catch {
    refs.buildChip.textContent = 'Build local';
    refs.completionChip.textContent = '--';
    refs.buildHud.textContent = 'Build local';
  }
}

function renderStats() {
  const rank = getCurrentRank();
  refs.rankPill.textContent = t('rankLabel', { rank: dictionary[state.profile.language].rankNames[rank], xp: state.profile.xp });
  refs.statsGrid.innerHTML = [
    [t('statsSessions'), state.profile.sessions],
    [t('statsCredits'), state.profile.credits],
    [t('statsBest'), state.profile.bestScore],
    [t('statsCompletion'), `${state.profile.completionAverage || 0}%`]
  ]
    .map(([label, value]) => `<article class="hero-stat-card"><span class="stat-label">${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderAirports() {
  const airports = state.airports.filter(airportUnlocked);
  refs.airportCountTag.textContent = `${airports.length}`;
  refs.airportGrid.innerHTML = airports
    .map((airport) => {
      const selected = airport.id === state.selectedAirportId;
      return `
        <button class="airport-card ${selected ? 'selected' : ''}" data-airport-id="${airport.id}" type="button">
          <div class="airport-head">
            <div>
              <div class="airport-code">${airport.iata}</div>
              <div class="airport-meta">${airport.icao} · ${airport.city}, ${airport.country}</div>
            </div>
            <span class="tiny-pill">${airport.trafficLabel}</span>
          </div>
          <p class="airport-description">${airport.description}</p>
          <div class="airport-tags">
            <span class="tiny-pill">${airport.runways[0].id}</span>
            <span class="tiny-pill">${airport.runways[1].id}</span>
            <span class="tiny-pill">TMA ${airport.tmaRadiusNm}nm</span>
          </div>
        </button>
      `;
    })
    .join('');
  refs.airportGrid.querySelectorAll('[data-airport-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedAirportId = button.dataset.airportId;
      renderAll();
    });
  });
}

function renderScenarios() {
  const available = state.scenarios.filter((scenario) => rankOrder.indexOf(getCurrentRank()) >= rankOrder.indexOf(scenario.rankRequired || 'cadet'));
  refs.selectedScenarioTag.textContent = currentScenario()?.difficulty || t('selectedScenarioFallback');
  refs.scenarioGrid.innerHTML = available
    .map((scenario) => `
      <button class="scenario-card ${scenario.id === state.selectedScenarioId ? 'selected' : ''}" data-scenario-id="${scenario.id}" type="button">
        <div class="scenario-head">
          <strong class="scenario-title">${scenario.title}</strong>
          <span class="tiny-pill">${scenario.difficulty}</span>
        </div>
        <p>${scenario.blurb}</p>
        <div class="airport-tags">
          <span class="tiny-pill">${scenario.duration}s</span>
          <span class="tiny-pill">MAX ${scenario.maxActive}</span>
          <span class="tiny-pill">${scenario.targetScore} pts</span>
        </div>
      </button>
    `)
    .join('');
  refs.scenarioGrid.querySelectorAll('[data-scenario-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedScenarioId = button.dataset.scenarioId;
      renderAll();
    });
  });
}

function renderHero() {
  const airport = currentAirport();
  const scenario = currentScenario();
  refs.heroAirport.textContent = airport ? `${airport.iata} · ${airport.name}` : '—';
  refs.heroAirportMeta.textContent = airport ? `${airport.icao} · ${airport.city}` : '—';
  refs.heroScenario.textContent = scenario?.title || '—';
  refs.heroScenarioMeta.textContent = scenario ? `${scenario.difficulty} · ${scenario.duration}s` : '—';
}

function renderAirportBrief() {
  const airport = currentAirport();
  if (!airport) return;
  refs.selectedAirportTitle.textContent = `${airport.name}`;
  refs.selectedAirportTag.textContent = t('towerTag', { icao: airport.icao, tma: airport.tmaRadiusNm });
  const arrivals = airport.fixes.filter((fix) => fix.type === 'arrival').map((fix) => fix.name).join(' · ');
  const departures = airport.fixes.filter((fix) => fix.type === 'departure').map((fix) => fix.name).join(' · ');
  refs.airportBrief.innerHTML = [
    t('airportBrief1', { arr: airport.preferredConfig.arrivalRunway, dep: airport.preferredConfig.departureRunway }),
    t('airportBrief2', { tower: airport.frequencies.tower, app: airport.frequencies.approach, ground: airport.frequencies.ground }),
    t('airportBrief3', { alt: airport.transitionAltitudeFt, elev: airport.elevationFt, tz: airport.timezone }),
    t('airportBrief4', { arrfix: arrivals, depfix: departures })
  ].map((line) => `<div class="airport-brief-item">${line}</div>`).join('');
}

function renderSession() {
  const session = currentSession();
  const airport = currentAirport();
  renderer.render(airport, session?.flights || [], state.profile.language);
  refs.liveFlightsCount.textContent = t('activeFlights', { count: session?.flights?.length || 0 });
  refs.hudTime.textContent = formatTime(session?.elapsed || 0);
  refs.hudScore.textContent = Math.round(session?.score || 0);
  refs.hudCalm.textContent = `${Math.round(session?.calm || 100)}%`;
  refs.hudLandings.textContent = session?.landings || 0;
  refs.hudHandoffs.textContent = session?.handoffs || 0;
  renderFlightStrips();
  renderFlightSelection();
}

function renderFlightStrips() {
  const session = currentSession();
  const flights = session?.flights || [];
  refs.flightStripList.innerHTML = flights.map((flight) => `
    <button class="flight-strip ${flight.id === state.selectedFlightId ? 'selected' : ''}" data-flight-id="${flight.id}" type="button">
      <div class="flight-strip-head">
        <strong>${flight.callsign}</strong>
        <span class="tiny-pill">${flight.kind === 'arrival' ? t('stripArrival') : t('stripDeparture')}</span>
      </div>
      <div class="flight-strip-row">${flight.model} · ${flight.fix.name} · ${flight.colorState.toUpperCase()}</div>
      <div class="flight-strip-row">${t('stripStatus', { status: flight.status, alt: Math.round(flight.altitudeFt), spd: Math.round(flight.speedKt) })}</div>
    </button>
  `).join('');
  refs.flightStripList.querySelectorAll('[data-flight-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedFlightId = button.dataset.flightId;
      renderer.selectFlight(state.selectedFlightId);
      renderFlightSelection();
      renderFlightStrips();
    });
  });
}

function quickCommandsForFlight(flight) {
  if (!flight) return [];
  const groups = [];
  if (flight.kind === 'arrival') {
    groups.push({ title: state.profile.language === 'pt' ? 'Altitude' : 'Altitude', buttons: [
      { label: state.profile.language === 'pt' ? 'Descer 5000' : 'Descend 5000', command: 'ALT 5000', tone: 'primary' },
      { label: state.profile.language === 'pt' ? 'Descer 3000' : 'Descend 3000', command: 'ALT 3000' },
      { label: state.profile.language === 'pt' ? 'Manter 7000' : 'Maintain 7000', command: 'ALT 7000' }
    ]});
    groups.push({ title: state.profile.language === 'pt' ? 'Vetoração' : 'Vectoring', buttons: [
      { label: state.profile.language === 'pt' ? 'Curva esquerda' : 'Turn left', command: `HDG ${String((Math.round(flight.heading) + 330) % 360).padStart(3,'0')}` },
      { label: state.profile.language === 'pt' ? 'Rumo final' : 'Final heading', command: `HDG ${String(Math.round(currentAirport()?.preferredConfig?.finalBearing || flight.heading)).padStart(3,'0')}`, tone: 'primary' },
      { label: state.profile.language === 'pt' ? 'Curva direita' : 'Turn right', command: `HDG ${String((Math.round(flight.heading) + 30) % 360).padStart(3,'0')}` }
    ]});
    groups.push({ title: state.profile.language === 'pt' ? 'Ação' : 'Actions', buttons: [
      { label: 'APP', sub: state.profile.language === 'pt' ? 'Autorizar aproximação' : 'Clear approach', command: 'APP', tone: 'primary' },
      { label: 'LAND', sub: state.profile.language === 'pt' ? 'Autorizar pouso' : 'Clear to land', command: 'LAND', tone: 'primary' },
      { label: 'HOLD', sub: state.profile.language === 'pt' ? 'Entrar em espera' : 'Enter hold', command: 'HOLD', tone: 'alert' }
    ]});
  } else {
    groups.push({ title: state.profile.language === 'pt' ? 'Solo' : 'Ground', buttons: [
      { label: 'TAXI', sub: state.profile.language === 'pt' ? 'Táxi autorizado' : 'Taxi approved', command: 'TAXI', tone: 'primary' },
      { label: 'HOLD', sub: state.profile.language === 'pt' ? 'Mantenha posição' : 'Hold position', command: 'HOLD' },
      { label: state.profile.language === 'pt' ? 'Subir 5000' : 'Climb 5000', command: 'ALT 5000' }
    ]});
    groups.push({ title: state.profile.language === 'pt' ? 'Partida' : 'Departure', buttons: [
      { label: 'TAKEOFF', sub: state.profile.language === 'pt' ? 'Autorizar decolagem' : 'Cleared takeoff', command: 'TAKEOFF', tone: 'primary' },
      { label: state.profile.language === 'pt' ? 'Rumo saída' : 'SID heading', command: `HDG ${String(Math.round(currentAirport()?.preferredConfig?.finalBearing || flight.heading)).padStart(3,'0')}` },
      { label: 'HANDOFF', sub: state.profile.language === 'pt' ? 'Transferir setor' : 'Transfer sector', command: 'HANDOFF', tone: 'alert' }
    ]});
  }
  groups.push({ title: state.profile.language === 'pt' ? 'Velocidade' : 'Speed', buttons: [
    { label: state.profile.language === 'pt' ? '180 nós' : '180 knots', command: 'SPD 180' },
    { label: state.profile.language === 'pt' ? '210 nós' : '210 knots', command: 'SPD 210' },
    { label: state.profile.language === 'pt' ? '230 nós' : '230 knots', command: 'SPD 230' }
  ]});
  return groups;
}

function renderFlightSelection() {
  const flight = currentFlight();
  renderer.selectFlight(flight?.id || null);
  if (!flight) {
    refs.selectedFlightTitle.textContent = t('selectFlight');
    refs.selectedFlightTag.textContent = '—';
    refs.selectedFlightCard.innerHTML = `<p>${t('tapFlightHint')}</p>`;
    refs.quickCommandGrid.innerHTML = '';
    if (refs.commandGroups) refs.commandGroups.innerHTML = '';
    if (refs.commandPadHint) refs.commandPadHint.textContent = 'ATC PAD';
    return;
  }
  refs.selectedFlightTitle.textContent = `${flight.callsign} · ${flight.model}`;
  refs.selectedFlightTag.textContent = `${flight.kind.toUpperCase()} · ${flight.status}`;
  if (refs.commandPadHint) refs.commandPadHint.textContent = `${flight.callsign} · ${flight.phase}`;
  refs.selectedFlightCard.innerHTML = `
    <div class="flight-detail-grid">
      <div><span>ICAO</span><strong>${flight.model}</strong></div>
      <div><span>ALT</span><strong>${Math.round(flight.altitudeFt)} ft</strong></div>
      <div><span>SPD</span><strong>${Math.round(flight.speedKt)} kt</strong></div>
      <div><span>HDG</span><strong>${Math.round(flight.heading).toString().padStart(3, '0')}</strong></div>
      <div><span>FIX</span><strong>${flight.fix.name}</strong></div>
      <div><span>PHASE</span><strong>${flight.phase}</strong></div>
    </div>
  `;
  const groups = quickCommandsForFlight(flight);
  refs.quickCommandGrid.innerHTML = groups.flatMap((group) => group.buttons).slice(0, 6)
    .map((item) => `<button class="command-button ${item.tone || ''}" type="button" data-quick-command="${item.command}">${item.label}${item.sub ? `<span class="mini">${item.sub}</span>` : ''}</button>`)
    .join('');
  refs.quickCommandGrid.querySelectorAll('[data-quick-command]').forEach((button) => {
    button.addEventListener('click', () => sendCommand(button.dataset.quickCommand));
  });
  if (refs.commandGroups) {
    refs.commandGroups.innerHTML = groups.map((group) => `
      <div class="command-group">
        <h4>${group.title}</h4>
        <div class="command-grid-mobile">
          ${group.buttons.map((item) => `<button class="command-button dual ${item.tone || ''}" type="button" data-pad-command="${item.command}">${item.label}${item.sub ? `<span class="mini">${item.sub}</span>` : ''}</button>`).join('')}
        </div>
      </div>
    `).join('');
    refs.commandGroups.querySelectorAll('[data-pad-command]').forEach((button) => {
      button.addEventListener('click', () => sendCommand(button.dataset.padCommand));
    });
  }
}

const typewriterQueue = [];
let typewriterBusy = false;

function appendRadioEntry(entry) {
  typewriterQueue.push(entry);
  if (!typewriterBusy) processTypewriterQueue();
}

function processTypewriterQueue() {
  const next = typewriterQueue.shift();
  if (!next) {
    typewriterBusy = false;
    return;
  }
  typewriterBusy = true;
  const line = document.createElement('div');
  line.className = `radio-line ${next.side}`;
  const stamp = document.createElement('small');
  stamp.textContent = next.side === 'pilot' ? 'PILOT' : next.side === 'atc' ? 'ATC' : 'SYS';
  const body = document.createElement('div');
  body.textContent = '';
  line.appendChild(stamp);
  line.appendChild(body);
  refs.radioLog.prepend(line);
  const text = next.message;
  let index = 0;
  const charDelay = next.side === 'pilot' ? 34 : next.side === 'atc' ? 24 : 18;
  const timer = setInterval(() => {
    body.textContent += text[index] || '';
    index += 1;
    if (index >= text.length) {
      clearInterval(timer);
      refs.radioLog.scrollTop = 0;
      setTimeout(processTypewriterQueue, next.side === 'system' ? 320 : 1100 + Math.min(900, text.length * 12));
    }
  }, charDelay);
}

function sendCommand(commandText) {
  const flight = currentFlight();
  if (!flight) return;
  const text = (commandText || '').trim();
  if (!text) return;
  const result = simulation.issueCommand(flight.id, text);
  if (result.ok) {
    appendRadioEntry({ side: 'atc', message: result.atcMessage || `${flight.callsign}, ${text}` });
    if (result.readback) appendRadioEntry({ side: 'pilot', message: result.readback });
    pushToast(t('commandSentToast'));
  } else {
    pushToast(result.message);
  }
}

function startSession() {
  const airport = currentAirport();
  const scenario = currentScenario();
  if (!airport || !scenario) return;
  state.sessionApplied = false;
  state.selectedFlightId = null;
  refs.radioLog.innerHTML = '';
  appendRadioEntry({ side: 'system', message: t('welcomeRadio') });
  simulation.startSession({ airport, scenario, language: state.profile.language, profile: state.profile });
  refs.pauseButton.disabled = false;
  refs.pauseButton.textContent = t('pause');
  setScreen('game');
  renderAirportBrief();
  renderSession();
}

function applySessionResult() {
  const session = currentSession();
  if (!session || state.sessionApplied) return;
  state.sessionApplied = true;
  state.profile.sessions += 1;
  state.profile.xp += Math.round(session.score * 0.45 + session.landings * 14 + session.handoffs * 10);
  state.profile.credits += Math.round(session.score * 0.2 + session.landings * 5);
  state.profile.bestScore = Math.max(state.profile.bestScore, Math.round(session.score));
  const completion = Math.round((session.score / currentScenario().targetScore) * 100);
  state.profile.completionAverage = Math.round(((state.profile.completionAverage * Math.max(0, state.profile.sessions - 1)) + completion) / state.profile.sessions);
  state.profile.unlockedRank = getCurrentRank();
  saveProfile();
  renderStats();
  renderAirports();
  pushToast(t('sessionComplete'));
}

function loop(ts) {
  if (!state.lastFrame) state.lastFrame = ts;
  const dt = Math.min(0.05, (ts - state.lastFrame) / 1000) * 0.58;
  state.lastFrame = ts;
  simulation.setLanguage(state.profile.language);
  simulation.update(dt);
  renderSession();
  if (currentSession()?.completed && !state.sessionApplied) applySessionResult();
  requestAnimationFrame(loop);
}

function wireEvents() {
  refs.navButtons.forEach((button) => button.addEventListener('click', () => setScreen(button.dataset.screen)));
  refs.startScenarioButton.addEventListener('click', startSession);
  refs.openContentButton.addEventListener('click', () => setScreen('content'));
  refs.languageToggle.addEventListener('click', () => {
    state.profile.language = state.profile.language === 'pt' ? 'en' : 'pt';
    saveProfile();
    applyTranslations();
    renderBuildInfo();
    renderAll();
  });
  refs.pauseButton.addEventListener('click', () => {
    const session = currentSession();
    if (!session) return;
    session.running = !session.running;
    refs.pauseButton.textContent = session.running ? t('pause') : (state.profile.language === 'pt' ? 'Continuar' : 'Resume');
  });
}

function renderAll() {
  applyTranslations();
  renderStats();
  renderAirports();
  renderScenarios();
  renderHero();
  renderAirportBrief();
  renderSession();
}

async function init() {
  await clearLegacyCaches();
  await loadData();
  await renderBuildInfo();
  wireEvents();
  renderAll();
  requestAnimationFrame(loop);
}

init();
