import { clamp, rand } from './math.js';

const AIRLINES = ['AZU', 'GLO', 'TAM', 'BAW', 'AAL', 'UAL', 'DLH', 'AFR', 'UAE', 'ANA', 'JAL'];

const bearingToCenterDelta = (bearing, heading) => {
  const ideal = (bearing + 180) % 360;
  let delta = ((ideal - heading + 540) % 360) - 180;
  return delta;
};

const headingToPoint = (fromBearing, toBearing) => {
  const ideal = (toBearing - fromBearing + 360) % 360;
  return ideal;
};

const nmBetween = (a, b) => {
  const ax = Math.cos(((a.bearing - 90) * Math.PI) / 180) * a.distanceNm;
  const ay = Math.sin(((a.bearing - 90) * Math.PI) / 180) * a.distanceNm;
  const bx = Math.cos(((b.bearing - 90) * Math.PI) / 180) * b.distanceNm;
  const by = Math.sin(((b.bearing - 90) * Math.PI) / 180) * b.distanceNm;
  return Math.hypot(ax - bx, ay - by);
};

export class SimulationEngine {
  constructor({ onEvent }) {
    this.onEvent = onEvent;
    this.reset();
  }

  reset() {
    this.airport = null;
    this.scenario = null;
    this.config = null;
    this.flights = [];
    this.time = 0;
    this.spawnTimer = 0;
    this.sequence = 0;
    this.paused = false;
    this.resultDelivered = false;
    this.session = {
      score: 0,
      calm: 100,
      landings: 0,
      conflicts: 0,
      warnings: 0,
      timeRemaining: 0,
      status: 'idle'
    };
    this.eventCooldowns = new Map();
  }

  emit(type, message, cooldown = 2.5) {
    const now = this.time;
    const key = `${type}:${message}`;
    const nextAllowed = this.eventCooldowns.get(key) || 0;
    if (now < nextAllowed) return;
    this.eventCooldowns.set(key, now + cooldown);
    this.onEvent?.({ type, message, time: now });
  }

  start({ airport, scenario, config }) {
    this.reset();
    this.airport = airport;
    this.scenario = scenario;
    this.config = config;
    this.session.timeRemaining = scenario.duration || config.sessionDuration;
    this.session.status = 'running';
    this.spawnFlight('arrival');
    this.spawnFlight('arrival');
    if ((airport.traffic || 1) > 1.15) this.spawnFlight('departure');
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  nextCallsign() {
    const prefix = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    return `${prefix}${Math.floor(rand(101, 989))}`;
  }

  chooseRunway() {
    const list = this.airport.runways || [];
    return list[Math.floor(Math.random() * list.length)] || { id: '09/27', heading: 90, oppositeHeading: 270 };
  }

  spawnFlight(kind = 'arrival') {
    const runway = this.chooseRunway();
    const fixList = (this.airport.fixes || []).filter((fix) => (kind === 'arrival' ? fix.type !== 'departure' : fix.type !== 'arrival'));
    const fix = fixList[Math.floor(Math.random() * fixList.length)] || { name: 'GATE', bearing: rand(0, 359), distanceNm: this.airport.tmaRadiusNm || 60, type: kind };
    const routeIn = kind === 'arrival';
    const id = `F${++this.sequence}`;
    this.flights.push({
      id,
      callsign: this.nextCallsign(),
      kind,
      state: routeIn ? 'inbound' : 'outbound',
      bearing: routeIn ? fix.bearing : runway.heading,
      distanceNm: routeIn ? Math.min((this.airport.tmaRadiusNm || 60) - rand(2, 6), fix.distanceNm || 58) : rand(2.2, 4.2),
      altitudeFt: routeIn ? rand(6000, 14000) : rand(2500, 5000),
      targetAltitudeFt: routeIn ? rand(3000, 7000) : rand(7000, 13000),
      speedKt: routeIn ? rand(190, 250) : rand(170, 220),
      targetSpeedKt: routeIn ? rand(180, 220) : rand(200, 240),
      heading: routeIn ? (fix.bearing + 180 + rand(-14, 14) + 360) % 360 : (runway.heading + rand(-10, 10) + 360) % 360,
      targetHeading: routeIn ? runway.heading : fix.bearing,
      runway,
      fix,
      holdMode: false,
      cleared: false,
      warning: false,
      conflict: false,
      trail: []
    });
  }

  issueCommand(command, flightId) {
    const flight = this.flights.find((item) => item.id === flightId);
    if (!flight) return null;
    if (command === 'altitudeUp') flight.targetAltitudeFt = clamp(flight.targetAltitudeFt + 1000, 2000, 18000);
    if (command === 'altitudeDown') flight.targetAltitudeFt = clamp(flight.targetAltitudeFt - 1000, 1000, 18000);
    if (command === 'speedUp') flight.targetSpeedKt = clamp(flight.targetSpeedKt + 20, 160, 300);
    if (command === 'speedDown') flight.targetSpeedKt = clamp(flight.targetSpeedKt - 20, 140, 280);
    if (command === 'vectorLeft') {
      flight.holdMode = false;
      flight.targetHeading = (flight.targetHeading - 15 + 360) % 360;
    }
    if (command === 'vectorRight') {
      flight.holdMode = false;
      flight.targetHeading = (flight.targetHeading + 15) % 360;
    }
    if (command === 'hold') flight.holdMode = !flight.holdMode;
    if (command === 'priority') {
      flight.cleared = true;
      flight.holdMode = false;
      flight.targetAltitudeFt = clamp(flight.targetAltitudeFt - 2000, 1500, 12000);
      flight.targetSpeedKt = clamp(flight.targetSpeedKt - 15, 150, 240);
    }
    this.session.score += 8;
    this.emit('command', `${flight.callsign} recebeu novo comando.`, 0.35);
    return flight;
  }

  updateFlight(flight, dt) {
    if (flight.holdMode) {
      flight.targetHeading = (flight.targetHeading + 22 * dt) % 360;
    } else if (flight.kind === 'arrival' && !flight.cleared && flight.distanceNm < 18) {
      flight.targetHeading = flight.runway.heading;
      flight.targetAltitudeFt = clamp(flight.targetAltitudeFt - 450 * dt, 1800, 5000);
    }

    let turnDelta = ((flight.targetHeading - flight.heading + 540) % 360) - 180;
    flight.heading = (flight.heading + clamp(turnDelta, -28 * dt, 28 * dt) + 360) % 360;
    flight.altitudeFt += clamp(flight.targetAltitudeFt - flight.altitudeFt, -750 * dt, 750 * dt);
    flight.speedKt += clamp(flight.targetSpeedKt - flight.speedKt, -24 * dt, 24 * dt);

    const travel = (flight.speedKt / 3600) * dt;
    if (flight.kind === 'arrival') {
      const idealDelta = bearingToCenterDelta(flight.bearing, flight.heading);
      flight.bearing = (flight.bearing - clamp(idealDelta * 0.04, -3.5 * dt, 3.5 * dt) + 360) % 360;
      flight.distanceNm = Math.max(0, flight.distanceNm - travel * clamp(1.05 - Math.abs(idealDelta) / 180, 0.3, 1.25));
      if (flight.distanceNm < 12 && !flight.cleared && Math.abs(((flight.runway.heading - flight.heading + 540) % 360) - 180) < 18) {
        flight.cleared = true;
        this.emit('info', `${flight.callsign} estabelecido no eixo final ${flight.runway.id}.`, 4.5);
      }
      if (flight.cleared) {
        flight.targetAltitudeFt = clamp(flight.targetAltitudeFt - 850 * dt, 1200, 3500);
      }
      if (flight.distanceNm < 1.5 && flight.altitudeFt < 2200 && Math.abs(((flight.runway.heading - flight.heading + 540) % 360) - 180) < 12) {
        flight.landed = true;
      }
    } else {
      const desired = flight.fix?.bearing ?? flight.targetHeading;
      const steer = ((desired - flight.heading + 540) % 360) - 180;
      flight.targetHeading = desired;
      flight.bearing = (flight.bearing + clamp(steer * 0.04 + 2.8 * dt, -3.5 * dt, 3.5 * dt) + 360) % 360;
      flight.distanceNm += travel * 0.94;
      if (flight.distanceNm > (this.airport.tmaRadiusNm || 60) + 3) {
        flight.departed = true;
      }
    }

    flight.warning = false;
    flight.conflict = false;
    flight.trail.push({ bearing: flight.bearing, distanceNm: flight.distanceNm });
    if (flight.trail.length > 10) flight.trail.shift();
  }

  evaluateConflicts() {
    let warnings = 0;
    let conflicts = 0;
    for (let i = 0; i < this.flights.length; i += 1) {
      for (let j = i + 1; j < this.flights.length; j += 1) {
        const a = this.flights[i];
        const b = this.flights[j];
        const dist = nmBetween(a, b);
        const alt = Math.abs(a.altitudeFt - b.altitudeFt);
        if (dist < 3 && alt < 1000) {
          a.conflict = true;
          b.conflict = true;
          conflicts += 1;
        } else if (dist < 5 && alt < 1500) {
          a.warning = true;
          b.warning = true;
          warnings += 1;
        }
      }
    }

    if (conflicts > 0) {
      this.session.score = Math.max(0, this.session.score - conflicts * 18);
      this.session.conflicts += conflicts;
      this.session.calm = clamp(this.session.calm - conflicts * 0.7, 0, 100);
      this.emit('conflict', 'Separação crítica em monitoramento.', 3.4);
    } else if (warnings > 0) {
      this.session.warnings += warnings * 0.25;
      this.session.calm = clamp(this.session.calm - warnings * 0.12, 0, 100);
      this.emit('warning', 'Aproximação abaixo do ideal monitorada.', 6.2);
    } else {
      this.session.calm = clamp(this.session.calm + 0.06, 0, 100);
    }
  }

  getSpawnInterval() {
    const base = this.scenario.spawnInterval || this.config.baseSpawnInterval || 5.2;
    const trafficFactor = 1 / (this.airport.traffic || 1);
    return clamp(base * trafficFactor, 2.8, 8.5);
  }

  update(dt) {
    if (!this.airport || !this.scenario) return this.getState();
    if (this.paused || this.session.status !== 'running') return this.getState();

    this.time += dt;
    this.spawnTimer += dt;
    this.session.timeRemaining = Math.max(0, this.session.timeRemaining - dt);

    if (this.spawnTimer >= this.getSpawnInterval() && this.flights.length < (this.scenario.maxActive || 7)) {
      this.spawnTimer = 0;
      this.spawnFlight(Math.random() > 0.28 ? 'arrival' : 'departure');
    }

    this.flights.forEach((flight) => this.updateFlight(flight, dt));
    this.evaluateConflicts();

    const landed = this.flights.filter((flight) => flight.landed);
    const departed = this.flights.filter((flight) => flight.departed);
    if (landed.length) {
      this.session.landings += landed.length;
      this.session.score += landed.length * (this.config.scorePerLanding || 120);
      this.session.calm = clamp(this.session.calm + landed.length * 0.85, 0, 100);
      this.emit('landed', `${landed.length} pouso(s) concluído(s) com segurança.`, 1.2);
    }
    if (departed.length) {
      this.session.score += departed.length * 55;
    }

    this.flights = this.flights.filter((flight) => !flight.landed && !flight.departed && flight.distanceNm <= (this.airport.tmaRadiusNm || 60) + 6);

    if (this.session.timeRemaining <= 0 && !this.resultDelivered) {
      this.session.status = 'completed';
      this.resultDelivered = true;
      this.emit('success', 'Janela concluída. Debriefing disponível.', 0.5);
    }

    return this.getState();
  }

  getState() {
    return {
      airport: this.airport,
      scenario: this.scenario,
      flights: this.flights.map((flight) => ({ ...flight })),
      session: { ...this.session }
    };
  }
}
