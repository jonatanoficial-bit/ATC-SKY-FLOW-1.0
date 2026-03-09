import { clamp, rand } from './math.js';

const makeFlightId = () => `FLT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const makeCallsign = () => `VF${String(Math.floor(100 + Math.random() * 899))}`;

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
  }

  startScenario(scenario) {
    this.scenario = scenario;
    this.flights = [];
    this.selectedFlightId = null;
    this.finishedResult = null;
    this.time = 0;
    this.spawnTimer = 0;
    this.session = {
      score: 0,
      calm: 100,
      landings: 0,
      conflicts: 0,
      timeRemaining: scenario.duration || this.config.sessionDuration,
      scenarioTitle: scenario.title
    };
    for (let i = 0; i < Math.min(3, scenario.maxActive || 4); i += 1) this.spawnFlight();
  }

  getSpawnInterval() {
    return Math.max(2.4, this.scenario.spawnInterval || this.config.baseSpawnInterval || 5.2);
  }

  pauseToggle() {
    this.paused = !this.paused;
    return this.paused;
  }

  spawnFlight() {
    const route = this.routes[Math.floor(Math.random() * this.routes.length)];
    if (!route) return;
    const speed = rand(0.82, 1.18);
    const altitude = 260 + Math.floor(rand(0, 8)) * 10;
    const heading = rand(-18, 18);
    this.flights.push({
      id: makeFlightId(),
      callsign: makeCallsign(),
      routeId: route.id,
      originId: route.from,
      destinationId: route.to,
      progress: rand(0.02, 0.18),
      speed,
      targetAltitude: altitude,
      baseDuration: rand(65, 120) * (route.difficulty || 1),
      holdTimer: 0,
      priority: false,
      warning: false,
      conflict: false,
      heading
    });
    this.emit('flight-spawn', `Novo tráfego: ${this.flights[this.flights.length - 1].callsign}`);
  }

  emit(type, message) {
    this.hooks.onEvent?.({ type, message });
  }

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
  }

  get selectedFlight() {
    return this.flights.find((flight) => flight.id === this.selectedFlightId) || null;
  }

  commandSelected(command) {
    const flight = this.selectedFlight;
    if (!flight) return false;
    switch (command) {
      case 'altitudeUp': flight.targetAltitude = clamp(flight.targetAltitude + 10, 180, 410); break;
      case 'altitudeDown': flight.targetAltitude = clamp(flight.targetAltitude - 10, 120, 410); break;
      case 'speedUp': flight.speed = clamp(flight.speed + 0.08, 0.6, 1.5); break;
      case 'speedDown': flight.speed = clamp(flight.speed - 0.08, 0.55, 1.5); break;
      case 'vectorLeft': flight.heading -= 10; break;
      case 'vectorRight': flight.heading += 10; break;
      case 'hold': flight.holdTimer = 12; break;
      case 'priority': flight.priority = !flight.priority; break;
      default: return false;
    }
    this.session.score += 8;
    return true;
  }

  evaluateConflicts() {
    const radius = this.config.baseConflictRadius || 0.062;
    this.flights.forEach((flight) => {
      flight.conflict = false;
      flight.warning = false;
    });

    for (let i = 0; i < this.flights.length; i += 1) {
      for (let j = i + 1; j < this.flights.length; j += 1) {
        const a = this.flights[i];
        const b = this.flights[j];
        const deltaProgress = Math.abs(a.progress - b.progress);
        const sameLane = a.originId === b.originId || a.destinationId === b.destinationId || a.routeId === b.routeId;
        const altitudeGap = Math.abs(a.targetAltitude - b.targetAltitude);
        if (sameLane && deltaProgress < radius * 0.8 && altitudeGap <= 20) {
          a.conflict = true;
          b.conflict = true;
        } else if (sameLane && deltaProgress < radius * 1.45 && altitudeGap <= 40) {
          a.warning = true;
          b.warning = true;
        }
      }
    }

    const conflicts = this.flights.filter((flight) => flight.conflict).length;
    const warnings = this.flights.filter((flight) => flight.warning).length;
    if (conflicts) {
      this.session.score = Math.max(0, this.session.score - conflicts * 8);
      this.session.conflicts += conflicts * 0.025;
      this.session.calm = clamp(this.session.calm - conflicts * 0.16, 0, 100);
      this.emit('conflict', 'Conflito detectado. Separe altitude e vetoração.');
    } else if (warnings) {
      this.session.calm = clamp(this.session.calm - warnings * 0.04, 0, 100);
      this.emit('warning', 'Aproximação crítica em monitoramento.');
    } else {
      this.session.calm = clamp(this.session.calm + 0.04, 0, 100);
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
      this.spawnFlight();
    }

    for (const flight of this.flights) {
      if (flight.holdTimer > 0) {
        flight.holdTimer = Math.max(0, flight.holdTimer - dt);
        flight.progress += dt * 0.0008;
      } else {
        const priorityBoost = flight.priority ? 1.1 : 1;
        flight.progress += (dt / flight.baseDuration) * flight.speed * priorityBoost;
      }
      flight.heading += Math.sin(this.time * 1.8 + flight.progress * 10) * 0.25;
    }

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
      this.session.calm = clamp(this.session.calm + landed.length * 0.8, 0, 100);
      landed.forEach((flight) => this.emit('landed', `${flight.callsign} pousou com segurança.`));
    }

    this.evaluateConflicts();
    this.session.score += dt * 4.8;

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
