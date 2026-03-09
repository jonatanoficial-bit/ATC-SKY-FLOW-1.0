import { storage } from './core/storage.js';
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
  heroTargetScore: document.getElementById('heroTargetScore'),
  heroDuration: document.getElementById('heroDuration'),
  heroActivePackages: document.getElementById('heroActivePackages'),
  packageGrid: document.getElementById('packageGrid'),
  contentStatusTag: document.getElementById('contentStatusTag'),
  sfxToggle: document.getElementById('sfxToggle'),
  motionToggle: document.getElementById('motionToggle'),
  resetProfileButton: document.getElementById('resetProfileButton'),
  hudTime: document.getElementById('hudTime'),
  hudScore: document.getElementById('hudScore'),
  hudCalm: document.getElementById('hudCalm'),
  hudLandings: document.getElementById('hudLandings'),
  liveFlightsCount: document.getElementById('liveFlightsCount'),
  flightStripList: document.getElementById('flightStripList'),
  selectedFlightTitle: document.getElementById('selectedFlightTitle'),
  selectedFlightTag: document.getElementById('selectedFlightTag'),
  selectedFlightCard: document.getElementById('selectedFlightCard'),
  worldStage: document.getElementById('worldStage'),
  worldCanvas: document.getElementById('worldCanvas'),
  fxCanvas: document.getElementById('fxCanvas'),
  markerLayer: document.getElementById('markerLayer'),
  toastLayer: document.getElementById('toastLayer'),
  modalLayer: document.getElementById('modalLayer')
};

const state = {
  screen: 'dashboard',
  profile: loadProfile(),
  contentManager: new ContentManager('./content'),
  content: null,
  mapRenderer: null,
  engine: null,
  sound: null,
  activeScenarioId: null,
  currentSnapshot: null,
  uiAccumulator: 0,
  modalOpen: false
};

const showToast = (message, type = 'info') => {
  const toast = document.createElement('article');
  toast.className = `toast ${type === 'warning' ? 'warning' : type === 'danger' ? 'danger' : ''}`;
  toast.textContent = message;
  refs.toastLayer.append(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 2500);
  window.setTimeout(() => toast.remove(), 3200);
};

const switchScreen = (screenId) => {
  state.screen = screenId;
  Object.entries(refs.screens).forEach(([key, element]) => {
    element.classList.toggle('active', key === screenId);
  });
  refs.navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === screenId);
  });
};

const getAvailableScenarios = () => {
  const scenarios = state.content?.scenarios || [];
  return scenarios.filter((scenario) => packageUnlockedForProfile({ unlockRank: scenario.rankRequired }, state.profile));
};

const getSelectedScenario = () => {
  const scenarios = getAvailableScenarios();
  return scenarios.find((scenario) => scenario.id === state.activeScenarioId) || scenarios[0] || null;
};

const packageCoverStyle = (pkg) => {
  if (pkg.coverImage) {
    return `background-image: url('${pkg.coverImage}');`;
  }
  if (pkg.coverAsset) {
    return `background-image: url('${pkg.coverAsset}');`;
  }
  const accent = pkg.theme?.accent || '#72f6d5';
  const glow = pkg.theme?.glow || '#6da9ff';
  return `background-image: linear-gradient(135deg, ${accent}, ${glow});`;
};

const renderRankPill = () => {
  const { currentRank, nextRank, progress } = getRankProgress(state.profile);
  refs.rankPill.innerHTML = `
    <span>${currentRank.badge}</span>
    <span>${currentRank.name}</span>
    ${nextRank ? `<span style="opacity:.7">· ${Math.round(progress * 100)}%</span>` : ''}
  `;
};

const renderStats = () => {
  const { currentRank, nextRank, progress } = getRankProgress(state.profile);
  refs.statsGrid.innerHTML = `
    <article class="stat-surface">
      <span class="stat-label">Rank</span>
      <strong>${currentRank.name}</strong>
      <small>${nextRank ? `Próximo: ${nextRank.name}` : 'Rank máximo atingido'}</small>
    </article>
    <article class="stat-surface">
      <span class="stat-label">XP total</span>
      <strong>${state.profile.xp}</strong>
      <small>Progresso: ${Math.round(progress * 100)}%</small>
    </article>
    <article class="stat-surface">
      <span class="stat-label">Créditos</span>
      <strong>${state.profile.credits}</strong>
      <small>Economia local do operador</small>
    </article>
    <article class="stat-surface">
      <span class="stat-label">Sessões / pousos</span>
      <strong>${state.profile.sessions} / ${state.profile.totalLandings || 0}</strong>
      <small>Recorde: ${state.profile.bestScore || 0}</small>
    </article>
  `;
};

const renderScenarioGrid = () => {
  const scenarios = getAvailableScenarios();
  if (!scenarios.length) {
    refs.scenarioGrid.innerHTML = `<article class="mission-card"><h4>Nenhum cenário</h4><p class="supporting-text">Ative mais pacotes ou progrida na carreira.</p></article>`;
    return;
  }

  if (!state.activeScenarioId) {
    state.activeScenarioId = state.profile.favoriteScenarioId || scenarios[0].id;
  }

  refs.scenarioGrid.innerHTML = scenarios
    .map((scenario) => {
      const isSelected = scenario.id === state.activeScenarioId;
      return `
        <button class="mission-card ${isSelected ? 'is-selected' : ''}" type="button" data-scenario-id="${scenario.id}">
          <p class="eyebrow">${scenario.packageTitle || 'Core'}</p>
          <h4>${scenario.title}</h4>
          <p class="supporting-text">${scenario.blurb}</p>
          <div class="meta-row">
            <span>${scenario.difficulty}</span>
            <span>${scenario.maxActive} ativos</span>
            <span>Meta ${scenario.targetScore}</span>
          </div>
        </button>
      `;
    })
    .join('');

  const selectedScenario = getSelectedScenario();
  refs.selectedScenarioTag.textContent = selectedScenario ? selectedScenario.title : 'Sem cenário';
  refs.heroTargetScore.textContent = selectedScenario ? String(selectedScenario.targetScore) : '—';
  refs.heroDuration.textContent = selectedScenario ? `${selectedScenario.duration}s` : '—';
  refs.heroActivePackages.textContent = `${state.content?.activePackages?.length || 0}`;
};

const renderPackageGrid = () => {
  const packages = state.content?.packages || [];
  refs.packageGrid.innerHTML = packages
    .map((pkg) => {
      const unlocked = packageUnlockedForProfile(pkg, state.profile);
      const active = (state.profile.activePackages || []).includes(pkg.id) || pkg.enabledByDefault;
      const canToggle = unlocked && pkg.id !== 'core';
      return `
        <article class="package-card ${active ? 'is-active' : ''}">
          <div class="package-cover" style="${packageCoverStyle(pkg)}"></div>
          <div>
            <p class="eyebrow">${pkg.subtitle || pkg.type}</p>
            <h4>${pkg.title}</h4>
            <p class="supporting-text">${pkg.description}</p>
          </div>
          <div class="package-meta">
            <span>${pkg.stats.airports} aeroportos</span>
            <span>${pkg.stats.routes} rotas</span>
            <span>${pkg.stats.scenarios} cenários</span>
          </div>
          <div class="hero-actions">
            <button class="secondary-button" type="button" disabled>${pkg.unlockRank || 'cadet'}</button>
            <button
              class="primary-button"
              type="button"
              data-package-toggle="${pkg.id}"
              ${canToggle ? '' : 'disabled'}
            >
              ${active ? 'Desativar' : unlocked ? 'Ativar' : 'Bloqueado'}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderSelectedFlight = (snapshot) => {
  const flight = snapshot?.selectedFlight || null;
  if (!flight) {
    refs.selectedFlightTitle.textContent = 'Selecione um voo';
    refs.selectedFlightTag.textContent = 'Aguardando';
    refs.selectedFlightCard.innerHTML = '<p>Toque em uma aeronave ou faixa para abrir comandos operacionais.</p>';
    return;
  }

  const eta = Math.max(0, Math.round((1 - flight.progress) * flight.baseDuration / Math.max(0.65, flight.speed)));
  refs.selectedFlightTitle.textContent = flight.callsign;
  refs.selectedFlightTag.textContent = flight.conflict ? 'Conflito' : flight.warning ? 'Atenção' : 'Estável';
  refs.selectedFlightCard.innerHTML = `
    <h4>${flight.originId} → ${flight.destinationId}</h4>
    <div class="selected-grid">
      <div><span class="stat-label">Altitude</span><strong>Nível ${flight.targetAltitude}</strong></div>
      <div><span class="stat-label">Velocidade</span><strong>${flight.speed.toFixed(2)}x</strong></div>
      <div><span class="stat-label">ETA</span><strong>${eta}s</strong></div>
      <div><span class="stat-label">Estado</span><strong>${flight.priority ? 'Prioridade' : flight.holdTimer > 0 ? 'Holding' : 'Em rota'}</strong></div>
    </div>
  `;
};

const renderFlightStrips = (snapshot) => {
  const flights = [...(snapshot?.flights || [])].sort((left, right) => (right.threatLevel || 0) - (left.threatLevel || 0));
  refs.liveFlightsCount.textContent = `${flights.length} voos`;

  refs.flightStripList.innerHTML = flights
    .map((flight) => {
      const eta = Math.max(0, Math.round((1 - flight.progress) * flight.baseDuration));
      const selected = snapshot.selectedFlightId === flight.id;
      const status = flight.conflict ? 'Conflito' : flight.warning ? 'Atenção' : 'Fluxo estável';
      return `
        <button class="flight-strip ${selected ? 'is-selected' : ''}" type="button" data-flight-select="${flight.id}">
          <div class="section-head compact">
            <div>
              <p class="eyebrow">${flight.originId} → ${flight.destinationId}</p>
              <h4>${flight.callsign}</h4>
            </div>
            <span class="tiny-pill">${status}</span>
          </div>
          <div class="flight-strip-meta">
            <span>Nível ${flight.targetAltitude}</span>
            <span>ETA ${eta}s</span>
            <span>${flight.priority ? 'Priority' : flight.holdTimer > 0 ? 'Holding' : 'Normal'}</span>
          </div>
        </button>
      `;
    })
    .join('') || '<div class="selected-flight-card"><p>Nenhum tráfego no momento.</p></div>';
};

const renderContentStatus = () => {
  refs.contentStatusTag.textContent = `${state.content?.packages?.length || 0} pacotes carregados`;
};

const renderDashboard = () => {
  renderRankPill();
  renderStats();
  renderScenarioGrid();
  renderPackageGrid();
  renderContentStatus();
  refs.sfxToggle.checked = Boolean(state.profile.settings?.sfx);
  refs.motionToggle.checked = Boolean(state.profile.settings?.reducedMotion);
};

const openResultModal = (result) => {
  state.modalOpen = true;
  refs.modalLayer.hidden = false;
  refs.modalLayer.innerHTML = `
    <article class="modal-card glass-panel">
      <p class="eyebrow">Debrief da sessão</p>
      <h2>${result.scenarioTitle}</h2>
      <div class="stats-grid">
        <article class="stat-surface"><span class="stat-label">Score</span><strong>${result.score}</strong></article>
        <article class="stat-surface"><span class="stat-label">Calma</span><strong>${result.calm}</strong></article>
        <article class="stat-surface"><span class="stat-label">Pousos</span><strong>${result.landings}</strong></article>
        <article class="stat-surface"><span class="stat-label">Conflitos</span><strong>${result.conflicts}</strong></article>
      </div>
      <p class="supporting-text">${result.success ? 'Sessão bem-sucedida. Sua carreira avança e mais conteúdo pode ser liberado.' : 'Sessão concluída, mas abaixo do ideal. Ajuste altitude, vetoração e priorização para estabilizar a malha.'}</p>
      <div class="hero-actions">
        <button class="primary-button" id="closeResultButton" type="button">Voltar ao dashboard</button>
        <button class="secondary-button" id="restartSessionButton" type="button">Nova sessão</button>
      </div>
    </article>
  `;
};

const closeModal = () => {
  state.modalOpen = false;
  refs.modalLayer.hidden = true;
  refs.modalLayer.innerHTML = '';
};

const updateHud = (snapshot) => {
  refs.hudTime.textContent = formatClock(snapshot.session?.timeRemaining || 0);
  refs.hudScore.textContent = String(snapshot.session?.score || 0);
  refs.hudCalm.textContent = `${Math.round(snapshot.session?.calm || 0)}%`;
  refs.hudLandings.textContent = String(snapshot.session?.landings || 0);
  renderSelectedFlight(snapshot);
  renderFlightStrips(snapshot);
};

const reloadContent = async () => {
  await state.contentManager.loadCatalog();
  state.content = state.contentManager.resolve(state.profile);
  state.activeScenarioId = state.content.scenarios.find((scenario) => scenario.id === state.activeScenarioId)?.id || state.activeScenarioId;
  renderDashboard();
  if (state.mapRenderer) {
    state.mapRenderer.setCatalog(state.content);
  }
};

const boot = async () => {
  state.sound = new SoundEngine(Boolean(state.profile.settings?.sfx));
  state.mapRenderer = new MapRenderer({
    stage: refs.worldStage,
    worldCanvas: refs.worldCanvas,
    fxCanvas: refs.fxCanvas,
    markerLayer: refs.markerLayer,
    onSelectFlight: (flightId) => {
      if (state.engine) {
        state.engine.selectFlight(flightId);
        state.currentSnapshot = state.engine.getState();
        updateHud(state.currentSnapshot);
      }
    },
    onSelectAirport: (airport) => showToast(`${airport.iata} · ${airport.city}, ${airport.country}`)
  });

  await Promise.all([reloadContent(), state.mapRenderer.init()]);

  renderDashboard();
  state.mapRenderer.setCatalog(state.content);
  refs.pauseButton.disabled = true;

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  requestAnimationFrame(loop);
};

const startScenario = async () => {
  const scenario = getSelectedScenario();
  if (!scenario) {
    showToast('Nenhum cenário disponível.', 'warning');
    return;
  }

  await state.sound.resume();
  state.engine = new SimulationEngine(state.content, state.profile, state.content.config, {
    onEvent: (event) => {
      if (event.type === 'warning') showToast(event.message, 'warning');
      else if (event.type === 'conflict') showToast(event.message, 'danger');
      else if (event.type === 'landed') showToast(event.message);
      else if (event.type === 'flight-spawn') showToast(event.message);
      state.sound.play(event.type === 'warning' ? 'warning' : event.type);
    }
  });

  state.engine.startScenario(scenario);
  state.mapRenderer.setScenario(scenario);
  refs.pauseButton.disabled = false;
  refs.pauseButton.textContent = 'Pausar';
  switchScreen('game');
  state.currentSnapshot = state.engine.getState();
  updateHud(state.currentSnapshot);
};

const handleEndSession = async (result) => {
  refs.pauseButton.disabled = true;
  state.profile = applySessionResult(state.profile, result);
  state.profile.favoriteScenarioId = state.activeScenarioId;
  saveProfile(state.profile);
  await reloadContent();
  openResultModal(result);
};

const loop = (timestamp) => {
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = Math.min(0.05, (timestamp - state.lastFrame) / 1000);
  state.lastFrame = timestamp;

  if (state.engine) {
    state.currentSnapshot = state.engine.update(dt);
    state.mapRenderer.render(state.currentSnapshot);
    state.uiAccumulator += dt * 1000;
    if (state.uiAccumulator >= (state.content?.config?.uiRefreshMs || 220)) {
      updateHud(state.currentSnapshot);
      state.uiAccumulator = 0;
    }

    const result = state.engine.takeFinishedResult();
    if (result && !state.modalOpen) {
      handleEndSession(result);
    }
  }

  requestAnimationFrame(loop);
};

refs.navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    switchScreen(button.dataset.screen);
  });
});

refs.startScenarioButton.addEventListener('click', startScenario);
refs.openContentButton.addEventListener('click', () => switchScreen('content'));

refs.scenarioGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-scenario-id]');
  if (!button) return;
  state.activeScenarioId = button.dataset.scenarioId;
  state.profile.favoriteScenarioId = state.activeScenarioId;
  saveProfile(state.profile);
  renderScenarioGrid();
});

refs.packageGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-package-toggle]');
  if (!button) return;
  const packageId = button.dataset.packageToggle;
  const isActive = (state.profile.activePackages || []).includes(packageId);
  state.profile = togglePackageForProfile(state.profile, packageId, !isActive);
  await reloadContent();
  showToast(isActive ? 'Pacote desativado.' : 'Pacote ativado.');
});

refs.flightStripList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-flight-select]');
  if (!button || !state.engine) return;
  state.engine.selectFlight(button.dataset.flightSelect);
  state.currentSnapshot = state.engine.getState();
  updateHud(state.currentSnapshot);
});

document.getElementById('commandGrid').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-command]');
  if (!button || !state.engine) return;
  await state.sound.resume();
  const success = state.engine.commandSelected(button.dataset.command);
  if (success) {
    state.sound.play('command');
    state.currentSnapshot = state.engine.getState();
    updateHud(state.currentSnapshot);
  }
});

refs.pauseButton.addEventListener('click', () => {
  if (!state.engine) return;
  const paused = state.engine.pauseToggle();
  refs.pauseButton.textContent = paused ? 'Retomar' : 'Pausar';
});

refs.sfxToggle.addEventListener('change', () => {
  state.profile = saveProfile({
    ...state.profile,
    settings: {
      ...state.profile.settings,
      sfx: refs.sfxToggle.checked
    }
  });
  state.sound.setEnabled(refs.sfxToggle.checked);
  showToast(`Áudio ${refs.sfxToggle.checked ? 'ativado' : 'desativado'}.`);
});

refs.motionToggle.addEventListener('change', () => {
  document.documentElement.style.setProperty('scroll-behavior', refs.motionToggle.checked ? 'auto' : 'smooth');
  state.profile = saveProfile({
    ...state.profile,
    settings: {
      ...state.profile.settings,
      reducedMotion: refs.motionToggle.checked
    }
  });
});

refs.resetProfileButton.addEventListener('click', async () => {
  state.profile = resetProfile();
  await reloadContent();
  showToast('Carreira local resetada.');
});

refs.modalLayer.addEventListener('click', (event) => {
  if (event.target === refs.modalLayer) {
    closeModal();
  }
});

document.addEventListener('click', (event) => {
  if (event.target.id === 'closeResultButton') {
    closeModal();
    switchScreen('dashboard');
  }
  if (event.target.id === 'restartSessionButton') {
    closeModal();
    startScenario();
  }
});

boot().catch((error) => {
  console.error(error);
  showToast('Falha ao iniciar o jogo.', 'danger');
});