import {
  loadProfile,
  saveProfile,
  applySessionResult,
  getRankProgress,
  packageUnlockedForProfile,
  togglePackageForProfile,
  resetProfile
} from './core/profile-manager.js';
import { ContentManager } from './core/content-manager.js';
import { MapRenderer } from './game/map-renderer.js';
import { SimulationEngine } from './game/simulation.js';
import { SoundEngine } from './game/audio.js';
import { formatClock } from './game/math.js';

const refs = {
  screens: {
    dashboard: document.getElementById('dashboardScreen'),
    game: document.getElementById('gameScreen'),
    content: document.getElementById('contentScreen')
  },
  navButtons: [...document.querySelectorAll('[data-screen]')],
  rankPill: document.getElementById('rankPill'),
  startScenarioButton: document.getElementById('startScenarioButton'),
  openContentButton: document.getElementById('openContentButton'),
  pauseButton: document.getElementById('pauseButton'),
  statsGrid: document.getElementById('statsGrid'),
  scenarioGrid: document.getElementById('scenarioGrid'),
  selectedScenarioTag: document.getElementById('selectedScenarioTag'),
  airportGrid: document.getElementById('airportGrid'),
  airportCountTag: document.getElementById('airportCountTag'),
  heroAirport: document.getElementById('heroAirport'),
  heroScenario: document.getElementById('heroScenario'),
  heroActivePackages: document.getElementById('heroActivePackages'),
  hudTime: document.getElementById('hudTime'),
  hudScore: document.getElementById('hudScore'),
  hudCalm: document.getElementById('hudCalm'),
  hudLandings: document.getElementById('hudLandings'),
  liveFlightsCount: document.getElementById('liveFlightsCount'),
  flightStripList: document.getElementById('flightStripList'),
  selectedFlightTitle: document.getElementById('selectedFlightTitle'),
  selectedFlightTag: document.getElementById('selectedFlightTag'),
  selectedFlightCard: document.getElementById('selectedFlightCard'),
  selectedAirportTitle: document.getElementById('selectedAirportTitle'),
  selectedAirportTag: document.getElementById('selectedAirportTag'),
  airportBrief: document.getElementById('airportBrief'),
  alertStack: document.getElementById('alertStack'),
  commandButtons: [...document.querySelectorAll('[data-command]')],
  packageGrid: document.getElementById('packageGrid'),
  contentStatusTag: document.getElementById('contentStatusTag'),
  resetProfileButton: document.getElementById('resetProfileButton'),
  sfxToggle: document.getElementById('sfxToggle'),
  motionToggle: document.getElementById('motionToggle'),
  worldStage: document.getElementById('worldStage'),
  radarSvg: document.getElementById('radarSvg'),
  markerLayer: document.getElementById('markerLayer'),
  buildChip: document.getElementById('buildChip'),
  completionChip: document.getElementById('completionChip'),
  toastLayer: document.getElementById('toastLayer')
};

const state = {
  profile: loadProfile(),
  catalog: null,
  selectedScenarioId: null,
  selectedAirportId: null,
  selectedFlightId: null,
  activeScreen: 'dashboard',
  activeSession: null,
  alerts: [],
  packageData: [],
  buildInfo: null,
  resultApplied: false
};

const contentManager = new ContentManager('./content');
const audioEngine = new SoundEngine(state.profile.settings?.sfx !== false);
const renderer = new MapRenderer({
  stage: refs.worldStage,
  radarSvg: refs.radarSvg,
  markerLayer: refs.markerLayer,
  onSelectFlight: (flightId) => {
    state.selectedFlightId = flightId;
    renderer.selectFlight(flightId);
    renderSelectedFlight();
  }
});
const simulation = new SimulationEngine({
  onEvent: (event) => {
    state.alerts = [event, ...state.alerts].slice(0, 8);
    if (event.type === 'conflict') audioEngine.play('conflict');
    else if (event.type === 'warning') audioEngine.play('warning');
    else if (event.type === 'landed') audioEngine.play('landed');
    else audioEngine.play('command');
    renderAlerts();
    pushToast(event.message);
  }
});

const airportUnlockedForProfile = (airport) => {
  const rankOrder = ['cadet', 'controller', 'director', 'chief'];
  const current = getRankProgress(state.profile).currentRank.id;
  const need = airport.unlockRank || 'cadet';
  return rankOrder.indexOf(current) >= rankOrder.indexOf(need);
};

const setScreen = (screenId) => {
  state.activeScreen = screenId;
  Object.entries(refs.screens).forEach(([key, element]) => {
    element.classList.toggle('active', key === screenId);
  });
  refs.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.screen === screenId));
};

const selectedAirport = () => state.catalog?.airports?.find((airport) => airport.id === state.selectedAirportId) || null;
const selectedScenario = () => state.catalog?.scenarios?.find((scenario) => scenario.id === state.selectedScenarioId) || null;
const selectedFlight = () => state.activeSession?.flights?.find((flight) => flight.id === state.selectedFlightId) || null;

const pushToast = (message) => {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  refs.toastLayer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

const renderBuildInfo = async () => {
  try {
    const info = await fetch('./build-info.json', { cache: 'no-store' }).then((res) => res.json());
    state.buildInfo = info;
    refs.buildChip.textContent = `Build ${info.version} • ${info.buildLocal}`;
    refs.completionChip.textContent = `Conclusão: ${info.completion}`;
  } catch {
    refs.buildChip.textContent = 'Build local indisponível';
    refs.completionChip.textContent = 'Conclusão: --';
  }
};

const renderStats = () => {
  const progress = getRankProgress(state.profile);
  const next = progress.nextRank?.name || 'Máximo';
  const cards = [
    { label: 'Rank', value: progress.currentRank.name, meta: `Próximo: ${next}` },
    { label: 'XP total', value: state.profile.xp, meta: `Progresso: ${Math.round(progress.progress * 100)}%` },
    { label: 'Créditos', value: state.profile.credits, meta: 'Economia local do operador' },
    { label: 'Sessões / pousos', value: `${state.profile.sessions} / ${state.profile.totalLandings}`, meta: `Recorde: ${state.profile.bestScore}` }
  ];
  refs.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="hero-stat-card">
          <span class="stat-label">${card.label}</span>
          <strong>${card.value}</strong>
          <small class="small-label">${card.meta}</small>
        </article>
      `
    )
    .join('');
  refs.rankPill.textContent = `${progress.currentRank.badge} ${progress.currentRank.name} • ${Math.round(progress.progress * 100)}%`;
};

const renderScenarios = () => {
  const current = selectedScenario();
  refs.heroScenario.textContent = current?.title || 'Selecione uma janela';
  refs.selectedScenarioTag.textContent = current?.difficulty || 'Pronto';
  refs.scenarioGrid.innerHTML = state.catalog.scenarios
    .map((scenario) => {
      const locked = !airportUnlockedForProfile({ unlockRank: scenario.rankRequired || 'cadet' });
      return `
        <button class="scenario-card ${scenario.id === state.selectedScenarioId ? 'selected' : ''} ${locked ? 'locked' : ''}" data-scenario-id="${scenario.id}" type="button" ${locked ? 'disabled' : ''}>
          <div class="scenario-head">
            <strong class="scenario-title">${scenario.title}</strong>
            <span class="tiny-pill">${scenario.difficulty}</span>
          </div>
          <p>${scenario.blurb}</p>
          <div class="scenario-tags">
            <span class="tiny-pill">Meta ${scenario.targetScore}</span>
            <span class="tiny-pill">${scenario.duration}s</span>
            <span class="tiny-pill">Máx ${scenario.maxActive} voos</span>
          </div>
        </button>
      `;
    })
    .join('');
  refs.scenarioGrid.querySelectorAll('[data-scenario-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedScenarioId = button.dataset.scenarioId;
      renderScenarios();
      updateHero();
    });
  });
};

const renderAirports = () => {
  const airports = state.catalog.airports.filter((airport) => airportUnlockedForProfile(airport));
  refs.airportCountTag.textContent = `${airports.length} torres`;
  refs.airportGrid.innerHTML = airports
    .map((airport) => {
      const selected = airport.id === state.selectedAirportId;
      const runwayText = (airport.runways || []).map((runway) => runway.id).join(' • ');
      return `
        <button class="airport-card ${selected ? 'selected' : ''}" data-airport-id="${airport.id}" type="button">
          <div class="airport-head">
            <div>
              <div class="airport-code">${airport.iata}</div>
              <div class="airport-meta">${airport.name} • ${airport.city}, ${airport.country}</div>
            </div>
            <span class="tiny-pill">${airport.trafficLabel || 'Hub'}</span>
          </div>
          <div class="airport-tags">
            <span class="tiny-pill">${airport.icao}</span>
            <span class="tiny-pill">TMA ${airport.tmaRadiusNm}nm</span>
            <span class="tiny-pill">${runwayText}</span>
          </div>
          <div class="airport-fixes">
            ${(airport.fixes || []).slice(0, 4).map((fix) => `<span class="tiny-pill">${fix.name}</span>`).join('')}
          </div>
        </button>
      `;
    })
    .join('');
  refs.airportGrid.querySelectorAll('[data-airport-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedAirportId = button.dataset.airportId;
      state.profile.selectedAirportId = state.selectedAirportId;
      saveProfile(state.profile);
      renderAirports();
      updateHero();
      renderAirportBrief(selectedAirport());
    });
  });
};

const renderAirportBrief = (airport) => {
  if (!airport) {
    refs.selectedAirportTitle.textContent = 'Aguardando seleção';
    refs.selectedAirportTag.textContent = 'TMA';
    refs.airportBrief.innerHTML = '<div class="airport-brief-item"><p>Selecione uma torre para carregar o radar local e os dados operacionais.</p></div>';
    return;
  }
  refs.selectedAirportTitle.textContent = `${airport.icao} • ${airport.name}`;
  refs.selectedAirportTag.textContent = `${airport.tmaRadiusNm}nm`;
  refs.airportBrief.innerHTML = `
    <div class="airport-brief-item"><strong>${airport.city}, ${airport.country}</strong><p>${airport.description || 'Radar terminal com chegadas e saídas reais simplificadas.'}</p></div>
    <div class="airport-brief-item"><strong>Pistas</strong><p>${airport.runways.map((runway) => `${runway.id} (${runway.heading}°)`).join(' • ')}</p></div>
    <div class="airport-brief-item"><strong>Fixos principais</strong><p>${airport.fixes.map((fix) => `${fix.name} ${fix.type === 'arrival' ? 'ARR' : fix.type === 'departure' ? 'DEP' : 'MIX'}`).join(' • ')}</p></div>
  `;
};

const renderPackages = () => {
  refs.heroActivePackages.textContent = `${state.catalog.activePackages.length}`;
  refs.packageGrid.innerHTML = state.catalog.packages
    .map((pkg) => {
      const active = state.profile.activePackages?.includes(pkg.id) || pkg.id === 'core';
      const unlocked = packageUnlockedForProfile(pkg, state.profile);
      return `
        <article class="package-card ${unlocked ? '' : 'locked'}">
          <div class="section-head compact">
            <div>
              <strong>${pkg.title}</strong>
              <p>${pkg.description}</p>
            </div>
            <span class="tiny-pill">${pkg.version || '1.0.0'}</span>
          </div>
          <div class="package-tags">
            <span class="tiny-pill">${pkg.stats.airports} aeroportos</span>
            <span class="tiny-pill">${pkg.stats.scenarios} cenários</span>
            <span class="tiny-pill">${pkg.type}</span>
          </div>
          <footer>
            <span class="small-label">Rank: ${pkg.unlockRank || 'cadet'}</span>
            <button class="secondary-button" data-package-id="${pkg.id}" ${pkg.id === 'core' || !unlocked ? 'disabled' : ''}>${active ? 'Desativar' : 'Ativar'}</button>
          </footer>
        </article>
      `;
    })
    .join('');

  refs.packageGrid.querySelectorAll('[data-package-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const packageId = button.dataset.packageId;
      const enabled = !(state.profile.activePackages || []).includes(packageId);
      state.profile = togglePackageForProfile(state.profile, packageId, enabled);
      refreshCatalog();
    });
  });
};

const renderAlerts = () => {
  refs.alertStack.innerHTML = state.alerts.length
    ? state.alerts
        .map(
          (alert) => `<article class="alert-item ${alert.type}"><strong>${alert.type.toUpperCase()}</strong><p>${alert.message}</p></article>`
        )
        .join('')
    : '<article class="alert-item"><strong>Radar pronto</strong><p>Sem alertas no momento.</p></article>';
};

const renderSelectedFlight = () => {
  const flight = selectedFlight();
  refs.commandButtons.forEach((button) => (button.disabled = !flight));
  if (!flight) {
    refs.selectedFlightTitle.textContent = 'Selecione um voo';
    refs.selectedFlightTag.textContent = 'Aguardando';
    refs.selectedFlightCard.innerHTML = '<p>Toque em uma faixa ou contato radar para abrir comandos da aeronave.</p>';
    renderer.selectFlight(null);
    return;
  }
  refs.selectedFlightTitle.textContent = flight.callsign;
  refs.selectedFlightTag.textContent = `${flight.kind === 'arrival' ? 'ARR' : 'DEP'} • ${flight.runway.id}`;
  refs.selectedFlightCard.innerHTML = `
    <strong>${flight.callsign}</strong>
    <p>${flight.kind === 'arrival' ? 'Chegada' : 'Saída'} via ${flight.fix?.name || 'vetoração local'}</p>
    <p>ALT alvo ${Math.round(flight.targetAltitudeFt)}ft • SPD alvo ${Math.round(flight.targetSpeedKt)}kt • HDG ${Math.round(flight.targetHeading)}°</p>
    <small>${flight.holdMode ? 'Holding ativo' : flight.cleared ? 'Aproximação priorizada' : 'Monitoramento padrão'}</small>
  `;
  renderer.selectFlight(flight.id);
};

const renderFlightStrips = () => {
  const flights = state.activeSession?.flights || [];
  refs.liveFlightsCount.textContent = `${flights.length} voos`;
  refs.flightStripList.innerHTML = flights.length
    ? flights
        .map(
          (flight) => `
            <button class="flight-strip ${flight.id === state.selectedFlightId ? 'selected' : ''}" type="button" data-flight-id="${flight.id}">
              <div class="flight-strip-top">
                <strong>${flight.callsign}</strong>
                <span class="tiny-pill">${flight.kind === 'arrival' ? 'ARR' : 'DEP'}</span>
              </div>
              <div class="flight-strip-tags">
                <span class="tiny-pill">FL${String(Math.round(flight.altitudeFt / 100)).padStart(3, '0')}</span>
                <span class="tiny-pill">${Math.round(flight.speedKt)}KT</span>
                <span class="tiny-pill">HDG ${Math.round(flight.heading)}°</span>
              </div>
              <small>${flight.fix?.name || 'Vector'} • ${flight.runway.id}</small>
            </button>
          `
        )
        .join('')
    : '<div class="airport-brief-item"><p>Nenhum tráfego ativo.</p></div>';
  refs.flightStripList.querySelectorAll('[data-flight-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedFlightId = button.dataset.flightId;
      renderFlightStrips();
      renderSelectedFlight();
    });
  });
};

const updateHero = () => {
  const airport = selectedAirport();
  const scenario = selectedScenario();
  refs.heroAirport.textContent = airport ? `${airport.icao} • ${airport.city}` : 'Selecione uma torre';
  refs.heroScenario.textContent = scenario?.title || 'Selecione uma janela';
};

const renderGame = () => {
  const session = state.activeSession?.session;
  const airport = state.activeSession?.airport;
  if (!session || !airport) return;
  refs.hudTime.textContent = formatClock(session.timeRemaining);
  refs.hudScore.textContent = Math.round(session.score);
  refs.hudCalm.textContent = `${Math.round(session.calm)}%`;
  refs.hudLandings.textContent = session.landings;
  renderFlightStrips();
  renderSelectedFlight();
  renderAirportBrief(airport);
  renderer.render(state.activeSession);

  if (session.status === 'completed' && !state.resultApplied) {
    state.profile = applySessionResult(state.profile, {
      score: Math.round(session.score),
      landings: session.landings,
      conflicts: session.conflicts,
      calm: Math.round(session.calm)
    });
    state.resultApplied = true;
    renderStats();
    renderPackages();
    renderAirports();
    pushToast('Resultado aplicado na carreira local.');
  }
};

const refreshCatalog = async () => {
  const packages = await contentManager.loadCatalog();
  state.packageData = packages;
  state.catalog = contentManager.resolve(state.profile);
  state.selectedScenarioId = state.selectedScenarioId || state.catalog.scenarios[0]?.id || null;
  state.selectedAirportId = state.selectedAirportId || state.profile.selectedAirportId || state.catalog.airports[0]?.id || null;
  renderStats();
  renderScenarios();
  renderAirports();
  renderPackages();
  updateHero();
  renderAirportBrief(selectedAirport());
};

const startOperation = async () => {
  const airport = selectedAirport();
  const scenario = selectedScenario();
  if (!airport || !scenario) {
    pushToast('Selecione um aeroporto e um cenário antes de iniciar.');
    return;
  }
  await audioEngine.resume();
  state.alerts = [];
  state.selectedFlightId = null;
  state.resultApplied = false;
  simulation.start({ airport, scenario, config: state.catalog.config });
  renderer.setScenario({ airport });
  refs.pauseButton.disabled = false;
  refs.pauseButton.textContent = 'Pausar';
  state.activeSession = simulation.getState();
  renderAlerts();
  renderGame();
  setScreen('game');
};

const bindEvents = () => {
  refs.navButtons.forEach((button) => {
    button.addEventListener('click', () => setScreen(button.dataset.screen));
  });

  refs.startScenarioButton.addEventListener('click', startOperation);
  refs.openContentButton.addEventListener('click', () => setScreen('content'));
  refs.pauseButton.addEventListener('click', () => {
    const paused = simulation.togglePause();
    refs.pauseButton.textContent = paused ? 'Retomar' : 'Pausar';
  });
  refs.resetProfileButton.addEventListener('click', () => {
    state.profile = resetProfile();
    state.selectedAirportId = null;
    refreshCatalog();
    pushToast('Carreira local resetada.');
  });
  refs.sfxToggle.checked = state.profile.settings?.sfx !== false;
  refs.motionToggle.checked = state.profile.settings?.reducedMotion === true;
  refs.sfxToggle.addEventListener('change', (event) => {
    state.profile.settings.sfx = event.target.checked;
    audioEngine.setEnabled(event.target.checked);
    saveProfile(state.profile);
  });
  refs.motionToggle.addEventListener('change', (event) => {
    state.profile.settings.reducedMotion = event.target.checked;
    saveProfile(state.profile);
    document.documentElement.style.setProperty('--motion-scale', event.target.checked ? '0' : '1');
  });

  refs.commandButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!state.selectedFlightId) return;
      simulation.issueCommand(button.dataset.command, state.selectedFlightId);
      state.activeSession = simulation.getState();
      renderGame();
    });
  });
};

const loop = (last = performance.now()) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  const session = simulation.update(dt);
  if (session?.airport) {
    state.activeSession = session;
    if (!state.selectedFlightId || !session.flights.some((flight) => flight.id === state.selectedFlightId)) {
      state.selectedFlightId = session.flights[0]?.id || null;
    }
    renderGame();
  }
  requestAnimationFrame(() => loop(now));
};

const init = async () => {
  bindEvents();
  await renderer.init();
  await renderBuildInfo();
  await refreshCatalog();
  renderAlerts();
  renderSelectedFlight();
  loop();
};

init();
