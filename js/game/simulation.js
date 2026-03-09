import { clamp, rand, distance } from './math.js';

const makeFlightId = () => `FLT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const makeCallsign = () => `VF${String(Math.floor(100 + Math.random() * 899))}`;

const routePosition = (route, progress, lateral = 0) => {
  const curve = route.curve ?? 0.14;
  const baseX = route.start.x + (route.end.x - route.start.x) * progress;
  const baseY = route.start.y + (route.end.y - route.start.y) * progress;
  const dx = route.end.x - route.start.x;
  const dy = route.end.y - route.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const arc = Math.sin(Math.PI * progress) * curve * length;
  return {
    x: baseX + nx * (arc + lateral),
    y: baseY + ny * (arc + lateral)
  };
};

export class SimulationEngine {
  constructor(content, profile, config, hooks = {}) {
    this.content = content;
    this.profile = profile;
    this.config = config;
    this.hooks = hooks;
    this.routes = content.routes || [];
    this.airports = content.airports || [];
    this.airportMap = Object.fromEntries(this.airports.map((airport) => [airport.id, airport]));
    this.flights = [];
    this.selectedFlightId = null;
    this.finishedResult = null;
    this.paused = false;
    this.time = 0;
    this.spawnTimer = 0;
    this.session = null;
    this.eventCooldown = new Map();
  }

  startScenario(scenario) {
    this.scenario = scenario;
    this.flights = [];
    this.selectedFlightId = null;
    this.finishedResult = null;
    this.time = 0;
    this.spawnTimer = 0;
    this.eventCooldown.clear();
    this.session = {
      score: 0,
      calm: 100,
      landings: 0,
      conflicts: 0,
      warnings: 0,
      commands: 0,
      efficiency: 100,
      timeRemaining: scenario.duration || this.config.sessionDuration,
      scenarioTitle: scenario.title
    };
    const initialFlights = Math.min(Math.max(2, Math.floor((scenario.maxActive || 4) * 0.5)), 4);
    for (let i = 0; i < initialFlights; i += 1) this.spawnFlight(true);
  }

  getSpawnInterval() {
    const base = this.scenario.spawnInterval || this.config.baseSpawnInterval || 6.4;
    const pressure = this.session ? clamp((100 - this.session.calm) / 100, 0, 0.25) : 0;
    return Math.max(3.25, base + pressure * 1.2);
  }

  pauseToggle() {
    this.paused = !this.paused;
    return this.paused;
  }

  emit(type, message, throttleSeconds = 0) {
    const now = this.time;
    const cooldownKey = `${type}:${message}`;
    const nextAllowed = this.eventCooldown.get(cooldownKey) || 0;
    if (throttleSeconds > 0 && now < nextAllowed) return;
    if (throttleSeconds > 0) this.eventCooldown.set(cooldownKey, now + throttleSeconds);
    this.hooks.onEvent?.({ type, message });
  }

  buildRouteState(route) {
    const origin = this.airportMap[route.from];
    const destination = this.airportMap[route.to];
    const dx = (destination?.lon || 0) - (origin?.lon || 0);
    const dy = (destination?.lat || 0) - (origin?.lat || 0);
    return {
      id: route.id,
      from: route.from,
      to: route.to,
      difficulty: route.difficulty || 1,
      start: { x: origin?.lon || 0, y: origin?.lat || 0 },
      end: { x: destination?.lon || 0, y: destination?.lat || 0 },
      curve: clamp(Math.abs(dx) * 0.06, 4, 18) * (dy > 0 ? -1 : 1)
    };
  }

  spawnFlight(isInitial = false) {
    const route = this.routes[Math.floor(Math.random() * this.routes.length)];
    if (!route) return;
    const routeState = this.buildRouteState(route);
    const altitude = 250 + Math.floor(rand(0, 12)) * 10;
    const speed = rand(0.82, 1.08);
    const progress = isInitial ? rand(0.06, 0.24) : rand(0.01, 0.08);
    const lateralOffset = rand(-2.2, 2.2);
    this.flights.push({
      id: makeFlightId(),
      callsign: makeCallsign(),
      routeId: route.id,
      originId: route.from,
      destinationId: route.to,
      progress,
      speed,
      targetAltitude: altitude,
      altitude,
      verticalSpeed: 0,
      baseDuration: rand(82, 132) * (route.difficulty || 1),
      holdTimer: 0,
      lateralOffset,
      lateralVelocity: rand(-0.25, 0.25),
      priority: false,
      warning: false,
      conflict: false,
      justWarned: false,
      heading: rand(-9, 9),
      routeState
    });
    this.emit('flight-spawn', `Novo tráfego: ${this.flights[this.flights.length - 1].callsign}`, 1.25);
  }

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
  }

  get selectedFlight() {
    return this.flights.find((flight) => flight.id === this.selectedFlightId) || null;
  }

  commandSelected(command) {
    const flight = this.selectedFlight;
    if (!flight || !this.session) return false;
    switch (command) {
      case 'altitudeUp':
        flight.targetAltitude = clamp(flight.targetAltitude + 20, 180, 410);
        break;
      case 'altitudeDown':
        flight.targetAltitude = clamp(flight.targetAltitude - 20, 140, 410);
        break;
      case 'speedUp':
        flight.speed = clamp(flight.speed + 0.06, 0.68, 1.35);
        break;
      case 'speedDown':
        flight.speed = clamp(flight.speed - 0.06, 0.62, 1.35);
        break;
      case 'vectorLeft':
        flight.lateralVelocity = clamp(flight.lateralVelocity - 0.55, -2.4, 2.4);
        break;
      case 'vectorRight':
        flight.lateralVelocity = clamp(flight.lateralVelocity + 0.55, -2.4, 2.4);
        break;
      case 'hold':
        flight.holdTimer = 14;
        break;
      case 'priority':
        flight.priority = !flight.priority;
        break;
      default:
        return false;
    }
    this.session.commands += 1;
    this.session.score += 10;
    this.emit('command', `${flight.callsign} recebeu novo comando.`, 0.55);
    return true;
  }

  updateFlight(flight, dt) {
    const priorityBoost = flight.priority ? 1.1 : 1;
    const altitudeDelta = flight.targetAltitude - flight.altitude;
    flight.verticalSpeed = clamp(altitudeDelta * 0.18, -28, 28);
    flight.altitude = clamp(flight.altitude + flight.verticalSpeed * dt, 120, 420);

    if (flight.holdTimer > 0) {
      flight.holdTimer = Math.max(0, flight.holdTimer - dt);
      flight.progress += dt * 0.0012;
      flight.lateralOffset += Math.sin(this.time * 2.5 + flight.progress * 14) * dt * 1.4;
    } else {
      flight.progress += (dt / flight.baseDuration) * flight.speed * priorityBoost;
      flight.lateralOffset = clamp(flight.lateralOffset + flight.lateralVelocity * dt, -14, 14);
      flight.lateralVelocity *= 0.96;
    }

    const pos = routePosition(flight.routeState, flight.progress, flight.lateralOffset);
    const nextPos = routePosition(flight.routeState, Math.min(1, flight.progress + 0.01), flight.lateralOffset + flight.lateralVelocity);
    flight.worldX = pos.x;
    flight.worldY = pos.y;
    flight.heading = (Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x) * 180 / Math.PI) + 90;
  }

  evaluateConflicts() {
    const conflictDistance = 10.5;
    const warningDistance = 18.5;
    let conflictCount = 0;
    let warningCount = 0;

    this.flights.forEach((flight) => {
      flight.conflict = false;
      flight.warning = false;
      flight.justWarned = false;
    });

    for (let i = 0; i < this.flights.length; i += 1) {
      for (let j = i + 1; j < this.flights.length; j += 1) {
        const a = this.flights[i];
        const b = this.flights[j];
        const planarDistance = distance({ x: a.worldX, y: a.worldY }, { x: b.worldX, y: b.worldY });
        const altitudeGap = Math.abs(a.altitude - b.altitude);
        const sameRegion = a.originId === b.originId || a.destinationId === b.destinationId || a.routeId === b.routeId;
        const separationBias = sameRegion ? 1 : 0.88;

        if (planarDistance <= conflictDistance * separationBias && altitudeGap <= 12) {
          a.conflict = true;
          b.conflict = true;
        } else if (planarDistance <= warningDistance * separationBias && altitudeGap <= 28) {
          a.warning = true;
          b.warning = true;
        }
      }
    }

    this.flights.forEach((flight) => {
      if (flight.conflict) conflictCount += 1;
      else if (flight.warning) {
        warningCount += 1;
        if (!flight.justWarned) flight.justWarned = true;
      }
    });

    if (conflictCount > 0) {
      this.session.score = Math.max(0, this.session.score - conflictCount * 12 * 0.5);
      this.session.conflicts += conflictCount * 0.08;
      this.session.calm = clamp(this.session.calm - conflictCount * 0.28, 0, 100);
      this.emit('conflict', 'Conflito detectado. Aplique separação por altitude ou vetoração.', 2.2);
    } else if (warningCount > 0) {
      this.session.warnings += warningCount * 0.03;
      this.session.calm = clamp(this.session.calm - warningCount * 0.06, 0, 100);
      this.emit('warning', 'Tráfego em aproximação crítica sob monitoramento.', 3.2);
    } else {
      this.session.calm = clamp(this.session.calm + 0.075, 0, 100);
    }
  }

  update(dt) {
    if (!this.session) return this.getState();
    if (this.paused) return this.getState();

    this.time += dt;
    this.session.timeRemaining = Math.max(0, this.session.timeRemaining - dt);
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.getSpawnInterval() && this.flights.length < (this.scenario.maxActive || 6)) {
      this.spawnTimer = 0;
      this.spawnFlight(false);
    }

    this.flights.forEach((flight) => this.updateFlight(flight, dt));

    const landed = [];
    this.flights = this.flights.filter((flight) => {
      if (flight.progress >= 1) {
        landed.push(flight);
        return false;
      }
      return true;
    });

    if (landed.length) {
      this.session.landings += landed.length;
      this.session.score += landed.length * (this.config.scorePerLanding || 120);
      this.session.calm = clamp(this.session.calm + landed.length * 1.1, 0, 100);
      landed.forEach((flight) => this.emit('landed', `${flight.callsign} pousou com segurança.`, 0.85));
    }

    this.evaluateConflicts();
    this.session.score += dt * (3.2 + this.session.calm * 0.016);
    this.session.efficiency = clamp(70 + this.session.calm * 0.3 + this.session.landings * 0.5 - this.session.conflicts * 4, 0, 100);

    if (this.session.timeRemaining <= 0) {
      this.finishedResult = {
        scenarioTitle: this.scenario.title,
        score: Math.round(this.session.score),
        calm: Math.round(this.session.calm),
        landings: this.session.landings,
        conflicts: Math.round(this.session.conflicts),
        success: this.session.score >= (this.scenario.targetScore || 800)
      };
      this.session = null;
    }

    return this.getState();
  }

  getState() {
    return {
      session: this.session,
      routes: this.routes,
      flights: this.flights,
      airportMap: this.airportMap,
      selectedFlight: this.selectedFlight
    };
  }

  takeFinishedResult() {
    const result = this.finishedResult;
    this.finishedResult = null;
    return result;
  }
}
