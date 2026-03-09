import {
  clamp,
  approach,
  randomRange,
  weightedPick,
  haversineKm,
  resolveFlightGeometry,
  wrappedDistance,
  projectGeoToNorm,
  generateCallsign
} from './math.js';

const pairKey = (a, b) => [a, b].sort().join(':');

export class SimulationEngine {
  constructor(content, profile, config = {}, hooks = {}) {
    this.content = content;
    this.profile = profile;
    this.config = config;
    this.hooks = hooks;
    this.scenario = null;
    this.session = null;
    this.selectedFlightId = null;
    this.flightCounter = 0;
    this.activeConflictPairs = new Set();
    this.finishedResult = null;
    this.eventLog = [];
  }

  setContent(content) {
    this.content = content;
  }

  setConfig(config) {
    this.config = config;
  }

  startScenario(scenario) {
    this.scenario = scenario;
    this.session = {
      active: true,
      paused: false,
      timeRemaining: scenario.duration || this.config.sessionDuration || 180,
      score: 180,
      calm: 100,
      landings: 0,
      conflicts: 0,
      missedApproaches: 0,
      diversions: 0,
      flights: []
    };
    this.selectedFlightId = null;
    this.finishedResult = null;
    this.activeConflictPairs.clear();
    this.eventLog = [];
    this.spawnClock = 1.2;
    this.emit('session-start', { message: `Janela iniciada: ${scenario.title}` });
  }

  pauseToggle() {
    if (!this.session) return false;
    this.session.paused = !this.session.paused;
    this.emit('command', {
      message: this.session.paused ? 'Simulação pausada.' : 'Simulação retomada.'
    });
    return this.session.paused;
  }

  emit(type, payload = {}) {
    const event = {
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      createdAt: performance.now(),
      ...payload
    };
    this.eventLog.push(event);
    this.eventLog = this.eventLog.slice(-20);
    if (typeof this.hooks.onEvent === 'function') {
      this.hooks.onEvent(event);
    }
    if (type === 'session-end' && typeof this.hooks.onSessionEnd === 'function') {
      this.hooks.onSessionEnd(event);
    }
  }

  getSelectedFlight() {
    return this.session?.flights.find((flight) => flight.id === this.selectedFlightId) || null;
  }

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
    const flight = this.getSelectedFlight();
    if (flight) {
      this.emit('command', { message: `${flight.callsign} selecionado.` });
      return flight;
    }
    return null;
  }

  commandSelected(commandName) {
    const flight = this.getSelectedFlight();
    if (!flight || !this.session?.active) {
      return false;
    }

    switch (commandName) {
      case 'altitudeUp':
        flight.targetAltitude = clamp(flight.targetAltitude + 1, 1, 5);
        break;
      case 'altitudeDown':
        flight.targetAltitude = clamp(flight.targetAltitude - 1, 1, 5);
        break;
      case 'speedUp':
        flight.targetSpeed = clamp(flight.targetSpeed + 0.15, 0.7, 1.45);
        break;
      case 'speedDown':
        flight.targetSpeed = clamp(flight.targetSpeed - 0.15, 0.65, 1.35);
        break;
      case 'vectorLeft':
        flight.desiredOffset = clamp(flight.desiredOffset - 0.25, -1.2, 1.2);
        break;
      case 'vectorRight':
        flight.desiredOffset = clamp(flight.desiredOffset + 0.25, -1.2, 1.2);
        break;
      case 'hold':
        flight.holdTimer = Math.max(flight.holdTimer, 9);
        flight.holdAngle = randomRange(0, Math.PI * 2);
        this.session.score = Math.max(0, this.session.score - 12);
        break;
      case 'priority':
        flight.priority = true;
        flight.targetSpeed = clamp(flight.targetSpeed + 0.18, 0.7, 1.5);
        break;
      default:
        return false;
    }

    this.emit('command', { message: `${flight.callsign}: comando ${commandName}.` });
    return true;
  }

  takeFinishedResult() {
    const result = this.finishedResult;
    this.finishedResult = null;
    return result;
  }

  getEligibleRoutes() {
    const routes = this.content.routes || [];
    if (!this.scenario?.preferredAirports?.length) {
      return routes;
    }
    const preferredIds = new Set(this.scenario.preferredAirports);
    const preferredRoutes = routes.filter((route) => preferredIds.has(route.from) || preferredIds.has(route.to));
    return preferredRoutes.length ? preferredRoutes : routes;
  }

  spawnFlight() {
    if (!this.session?.active) return;
    const eligibleRoutes = this.getEligibleRoutes();
    if (!eligibleRoutes.length) return;

    const route = weightedPick(eligibleRoutes, (item) => item.demand || 1);
    if (!route) return;

    const reverse = route.bidirectional && Math.random() > 0.5;
    const originId = reverse ? route.to : route.from;
    const destinationId = reverse ? route.from : route.to;
    const origin = this.content.airportsById[originId];
    const destination = this.content.airportsById[destinationId];
    if (!origin || !destination) return;

    const distanceKm = haversineKm(origin, destination);
    const maxDuration = clamp(distanceKm / 125, 56, 120);
    const cruiseAltitude = Math.round(randomRange(2, 5));

    const flight = {
      id: `flight_${++this.flightCounter}`,
      routeId: route.id,
      callsign: generateCallsign(),
      originId,
      destinationId,
      originName: origin.city,
      destinationName: destination.city,
      progress: 0,
      altitude: cruiseAltitude,
      targetAltitude: cruiseAltitude,
      speed: randomRange(0.92, 1.06),
      targetSpeed: 1,
      baseDuration: maxDuration,
      desiredOffset: randomRange(-0.18, 0.18),
      lateralOffset: randomRange(-0.1, 0.1),
      arcBias: randomRange(-0.02, 0.04),
      holdTimer: 0,
      holdAngle: 0,
      priority: false,
      conflict: false,
      warning: false,
      threatLevel: 0,
      missedApproaches: 0,
      hazardHits: [],
      unstableWarned: false
    };

    this.session.flights.push(flight);
    this.emit('flight-spawn', { message: `${flight.callsign} entrando: ${originId} → ${destinationId}` });
  }

  updateFlight(flight, dt) {
    flight.altitude = approach(flight.altitude, flight.targetAltitude, dt * 1.8);
    flight.speed = approach(flight.speed, flight.targetSpeed, dt * 0.65);
    flight.lateralOffset = approach(flight.lateralOffset, flight.desiredOffset, dt * 0.7);

    if (flight.holdTimer > 0) {
      flight.holdTimer = Math.max(0, flight.holdTimer - dt);
      flight.holdAngle += dt * 2.8;
    }

    let progressGain = (dt / flight.baseDuration) * flight.speed;
    if (flight.holdTimer > 0) {
      progressGain *= 0.18;
    }
    if (flight.priority) {
      progressGain *= 1.06;
    }
    if (flight.progress > 0.78 && flight.targetAltitude <= 2) {
      progressGain *= 1.07;
    }

    flight.progress = clamp(flight.progress + progressGain, 0, 1.02);

    const geometry = resolveFlightGeometry(flight, this.content.airportsById);
    if (geometry) {
      flight.point = geometry.point;
      flight.heading = Math.atan2(geometry.tangent.y, geometry.tangent.x);
    }

    this.applyWeatherToFlight(flight);
    this.evaluateApproach(flight);
  }

  applyWeatherToFlight(flight) {
    const weatherCells = this.scenario?.weatherCells || [];
    if (!flight.point || !weatherCells.length) return;

    weatherCells.forEach((cell) => {
      const cellPoint = projectGeoToNorm({ lat: cell.lat, lon: cell.lon });
      if (wrappedDistance(flight.point, cellPoint) < cell.radius * (0.84 + (cell.severity || 0.5) * 0.28)) {
        if (!flight.hazardHits.includes(cell.id)) {
          flight.hazardHits.push(cell.id);
          this.session.score = Math.max(0, this.session.score - 10);
          this.session.calm = Math.max(10, this.session.calm - 3);
          this.emit('warning', { message: `${flight.callsign} entrou em ${cell.label}.` });
        }
      }
    });
  }

  evaluateApproach(flight) {
    if (flight.progress > 0.82 && flight.targetAltitude > 2 && !flight.unstableWarned) {
      flight.unstableWarned = true;
      this.emit('warning', { message: `${flight.callsign} alto demais para aproximação.` });
    }

    if (flight.progress < 0.985) return;

    if (flight.targetAltitude <= 1.5) {
      this.session.landings += 1;
      this.session.score += (this.config.scorePerLanding || 135) + (flight.priority ? 12 : 0);
      this.session.calm = clamp(this.session.calm + 1.4, 0, 100);
      flight.completed = true;
      this.emit('landed', { message: `${flight.callsign} pousou com sucesso em ${flight.destinationId}.` });
      return;
    }

    if (flight.missedApproaches < 1) {
      flight.missedApproaches += 1;
      this.session.missedApproaches += 1;
      this.session.score = Math.max(0, this.session.score - 55);
      this.session.calm = Math.max(10, this.session.calm - 4);
      flight.progress = 0.88;
      flight.targetAltitude = Math.max(1, flight.targetAltitude - 1);
      flight.desiredOffset = clamp(flight.desiredOffset + randomRange(-0.4, 0.4), -1.1, 1.1);
      this.emit('warning', { message: `${flight.callsign} executou arremetida.` });
      return;
    }

    this.session.diversions += 1;
    this.session.score = Math.max(0, this.session.score - 85);
    this.session.calm = Math.max(5, this.session.calm - 8);
    flight.completed = true;
    this.emit('warning', { message: `${flight.callsign} desviado por aproximação inadequada.` });
  }

  detectConflicts() {
    if (!this.session) return;

    const flights = this.session.flights.filter((flight) => !flight.completed);
    flights.forEach((flight) => {
      flight.conflict = false;
      flight.warning = false;
      flight.threatLevel = 0;
    });

    const nextPairs = new Set();
    const conflictRadius = this.scenario?.conflictRadius || this.config.baseConflictRadius || 0.055;
    const warningDistance = this.config.softWarningDistance || 0.09;

    for (let firstIndex = 0; firstIndex < flights.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < flights.length; secondIndex += 1) {
        const a = flights[firstIndex];
        const b = flights[secondIndex];
        if (!a.point || !b.point) continue;

        const distance = wrappedDistance(a.point, b.point);
        const altitudeGap = Math.abs(a.altitude - b.altitude);
        const key = pairKey(a.id, b.id);

        if (distance < conflictRadius && altitudeGap < 0.95) {
          nextPairs.add(key);
          a.conflict = true;
          b.conflict = true;
          a.threatLevel = Math.max(a.threatLevel, 1);
          b.threatLevel = Math.max(b.threatLevel, 1);

          if (!this.activeConflictPairs.has(key)) {
            this.session.conflicts += 1;
            this.session.score = Math.max(0, this.session.score - 72);
            this.session.calm = Math.max(0, this.session.calm - 11);
            this.emit('conflict', { message: `Conflito crítico entre ${a.callsign} e ${b.callsign}.` });
          }
        } else if (distance < warningDistance && altitudeGap < 1.6) {
          a.warning = true;
          b.warning = true;
          a.threatLevel = Math.max(a.threatLevel, 0.5);
          b.threatLevel = Math.max(b.threatLevel, 0.5);
        }
      }
    }

    this.activeConflictPairs = nextPairs;
  }

  update(dt) {
    if (!this.session?.active || this.session.paused) {
      return this.getState();
    }

    this.session.timeRemaining = Math.max(0, this.session.timeRemaining - dt);
    this.spawnClock -= dt;

    const dynamicLimit = (this.scenario?.maxActive || this.config.maxFlightsBase || 6) + (this.profile?.rankId === 'director' ? 1 : 0) + (this.profile?.rankId === 'chief' ? 2 : 0);
    const intervalFactor = clamp(this.session.timeRemaining / (this.scenario?.duration || 180), 0.72, 1.15);
    const spawnInterval = (this.scenario?.spawnInterval || this.config.baseSpawnInterval || 6.2) * intervalFactor;

    if (this.spawnClock <= 0 && this.session.flights.filter((flight) => !flight.completed).length < dynamicLimit) {
      this.spawnFlight();
      this.spawnClock = spawnInterval * randomRange(0.85, 1.18);
    }

    this.session.flights.forEach((flight) => this.updateFlight(flight, dt));
    this.detectConflicts();

    this.session.flights = this.session.flights.filter((flight) => !flight.completed);
    this.session.score = Math.round(this.session.score);
    this.session.calm = clamp(this.session.calm, 0, 100);

    if (this.session.timeRemaining <= 0) {
      this.finishSession('timer');
    }

    return this.getState();
  }

  finishSession(reason = 'timer') {
    if (!this.session || !this.session.active) return;

    const score = Math.max(0, Math.round(this.session.score));
    const calm = Math.round(this.session.calm);
    const success = score >= Math.round((this.scenario?.targetScore || 900) * 0.78) && calm >= 45;
    const result = {
      reason,
      scenarioId: this.scenario?.id || '',
      scenarioTitle: this.scenario?.title || 'Sessão',
      score,
      calm,
      landings: this.session.landings,
      conflicts: this.session.conflicts,
      missedApproaches: this.session.missedApproaches,
      diversions: this.session.diversions,
      success
    };

    this.session.active = false;
    this.finishedResult = result;
    this.emit('session-end', { message: `Sessão encerrada: ${result.scenarioTitle}.`, result });
  }

  getState() {
    return {
      scenario: this.scenario,
      session: this.session,
      flights: this.session?.flights || [],
      selectedFlightId: this.selectedFlightId,
      selectedFlight: this.getSelectedFlight(),
      recentEvents: this.eventLog.slice(-6),
      weatherCells: this.scenario?.weatherCells || [],
      finishedResult: this.finishedResult
    };
  }
}