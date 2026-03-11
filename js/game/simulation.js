const AIRLINE_SETS = {
  GRU: ['TAM', 'GLO', 'AZU', 'ACA', 'AFR', 'UAL'],
  JFK: ['AAL', 'DAL', 'JBU', 'BAW', 'AFR', 'UAE'],
  LHR: ['BAW', 'VIR', 'DLH', 'AFR', 'UAE', 'AAL'],
  DXB: ['UAE', 'FDB', 'QTR', 'ETH', 'BAW', 'SVA'],
  HND: ['ANA', 'JAL', 'SKY', 'DAL', 'UAL', 'CPA'],
  FRA: ['DLH', 'UAE', 'AFR', 'BAW', 'AAL', 'THY'],
  CDG: ['AFR', 'DLH', 'BAW', 'KLM', 'UAE', 'AAL'],
  AMS: ['KLM', 'DLH', 'BAW', 'UAE', 'AAL', 'AFR']
};

const MODELS = [
  { icao: 'A320', category: 'Narrowbody', cruise: 250, approach: 165 },
  { icao: 'A321', category: 'Narrowbody', cruise: 255, approach: 168 },
  { icao: 'B738', category: 'Narrowbody', cruise: 250, approach: 162 },
  { icao: 'B77W', category: 'Heavy', cruise: 265, approach: 154 },
  { icao: 'A359', category: 'Heavy', cruise: 260, approach: 150 },
  { icao: 'B789', category: 'Heavy', cruise: 258, approach: 152 },
  { icao: 'E195', category: 'Regional', cruise: 235, approach: 145 }
];

const rankOrder = ['cadet', 'controller', 'director', 'chief'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const roundStep = (value, step) => Math.round(value / step) * step;
const angleDiff = (a, b) => {
  let d = ((b - a + 540) % 360) - 180;
  return d;
};
const normalizeHeading = (value) => (value % 360 + 360) % 360;
const pointFromPolar = (bearing, distanceNm) => {
  const rad = ((bearing - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * distanceNm, y: Math.sin(rad) * distanceNm };
};
const distanceBetweenFlights = (a, b) => {
  const pa = pointFromPolar(a.bearing, a.distanceNm);
  const pb = pointFromPolar(b.bearing, b.distanceNm);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
};

export class SimulationEngine {
  constructor({ onEvent, onRadio } = {}) {
    this.onEvent = onEvent || (() => {});
    this.onRadio = onRadio || (() => {});
    this.reset();
  }

  reset() {
    this.session = null;
    this.spawnClock = 0;
    this.idCounter = 0;
    this.radioDelay = 0;
  }

  startSession({ airport, scenario, language = 'pt', profile }) {
    this.reset();
    this.session = {
      airport,
      scenario,
      language,
      profile,
      running: true,
      elapsed: 0,
      flights: [],
      log: [],
      score: 0,
      calm: 100,
      landings: 0,
      departures: 0,
      handoffs: 0,
      warnings: 0,
      conflicts: 0,
      completed: false
    };
    this.emitSystem('session_start', this.t('sessionStart', { airport: airport.iata }));
    for (let i = 0; i < 3; i += 1) this.spawnFlight(i % 2 === 0 ? 'arrival' : 'departure');
    return this.session;
  }

  setLanguage(language) {
    if (this.session) this.session.language = language;
  }

  getState() {
    return this.session;
  }

  update(dt) {
    if (!this.session || !this.session.running || this.session.completed) return;
    const s = this.session;
    s.elapsed += dt;
    this.spawnClock += dt;

    if (this.spawnClock >= s.scenario.spawnInterval && s.flights.length < s.scenario.maxActive) {
      this.spawnClock = 0;
      this.spawnFlight(Math.random() > 0.45 ? 'arrival' : 'departure');
    }

    for (const flight of [...s.flights]) {
      this.stepFlight(flight, dt);
    }

    this.detectConflicts();

    s.flights = s.flights.filter((flight) => !flight.completed);

    if (s.elapsed >= s.scenario.duration && !s.completed) {
      s.completed = true;
      s.running = false;
      this.emitSystem('session_end', this.t('sessionEnd', { score: Math.round(s.score) }));
    }
  }

  issueCommand(flightId, rawCommand) {
    const session = this.session;
    if (!session) return { ok: false, message: 'no session' };
    const flight = session.flights.find((item) => item.id === flightId);
    if (!flight) return { ok: false, message: this.t('flightNotFound') };

    const text = rawCommand.trim();
    const upper = text.toUpperCase();
    let handled = false;
    let atcMessage = '';
    let readback = '';

    const altitudeMatch = upper.match(/(?:ALT|CLIMB|DESCEND)\s*(\d{3,5})/);
    const headingMatch = upper.match(/(?:HDG|HEADING|TURN)\s*(\d{2,3})/);
    const speedMatch = upper.match(/(?:SPD|SPEED)\s*(\d{2,3})/);

    if (altitudeMatch) {
      flight.targetAltitudeFt = clamp(roundStep(Number(altitudeMatch[1]), 500), 2000, 18000);
      handled = true;
      atcMessage = this.t('atcAltitude', { callsign: flight.callsign, altitude: flight.targetAltitudeFt });
      readback = this.t('pilotReadbackAltitude', { callsign: flight.callsign, altitude: flight.targetAltitudeFt });
      this.bumpScore(16);
    }
    if (headingMatch) {
      flight.targetHeading = normalizeHeading(Number(headingMatch[1]));
      handled = true;
      atcMessage = this.t('atcHeading', { callsign: flight.callsign, heading: String(flight.targetHeading).padStart(3, '0') });
      readback = this.t('pilotReadbackHeading', { callsign: flight.callsign, heading: String(flight.targetHeading).padStart(3, '0') });
      this.bumpScore(14);
    }
    if (speedMatch) {
      flight.targetSpeedKt = clamp(Number(speedMatch[1]), 140, 290);
      handled = true;
      atcMessage = this.t('atcSpeed', { callsign: flight.callsign, speed: flight.targetSpeedKt });
      readback = this.t('pilotReadbackSpeed', { callsign: flight.callsign, speed: flight.targetSpeedKt });
      this.bumpScore(12);
    }

    if (upper.includes('APP') || upper.includes('APPROACH')) {
      flight.clearedApproach = true;
      flight.targetHeading = this.session.airport.preferredConfig.finalBearing;
      flight.targetAltitudeFt = Math.min(flight.targetAltitudeFt, 4000);
      handled = true;
      atcMessage = this.t('atcApproach', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.arrivalRunway });
      readback = this.t('pilotReadbackApproach', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.arrivalRunway });
      this.bumpScore(24);
    }

    if (upper.includes('LAND')) {
      flight.clearedLand = true;
      handled = true;
      atcMessage = this.t('atcLand', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.arrivalRunway });
      readback = this.t('pilotReadbackLand', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.arrivalRunway });
      this.bumpScore(28);
    }

    if (upper.includes('TAXI')) {
      if (flight.phase === 'request-taxi') {
        flight.phase = 'taxi';
        flight.phaseClock = 0;
        handled = true;
        atcMessage = this.t('atcTaxi', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.departureRunway });
        readback = this.t('pilotReadbackTaxi', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.departureRunway, fix: flight.fix.name });
        this.bumpScore(14);
      }
    }

    if (upper.includes('TAKEOFF') || upper.includes('DEPART')) {
      if (flight.phase === 'ready-departure') {
        flight.phase = 'departure-roll';
        flight.phaseClock = 0;
        flight.targetHeading = this.session.airport.preferredConfig.finalBearing;
        flight.targetAltitudeFt = 5000;
        handled = true;
        atcMessage = this.t('atcTakeoff', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.departureRunway });
        readback = this.t('pilotReadbackTakeoff', { callsign: flight.callsign, runway: this.session.airport.preferredConfig.departureRunway });
        this.bumpScore(26);
      }
    }

    if (upper.includes('HANDOFF') || upper.includes('CONTACT CENTER') || upper.includes('CONTACT DEPARTURE')) {
      flight.handoffApproved = true;
      handled = true;
      atcMessage = this.t('atcHandoff', { callsign: flight.callsign });
      readback = this.t('pilotReadbackHandoff', { callsign: flight.callsign });
      this.bumpScore(18);
    }

    if (upper.includes('HOLD')) {
      flight.holding = true;
      flight.targetSpeedKt = Math.max(180, flight.targetSpeedKt - 20);
      handled = true;
      atcMessage = this.t('atcHold', { callsign: flight.callsign, fix: flight.fix.name });
      readback = this.t('pilotReadbackHold', { callsign: flight.callsign, fix: flight.fix.name });
      this.bumpScore(10);
    }

    if (!handled) {
      this.emitSystem('warning', this.t('commandUnknown'));
      return { ok: false, message: this.t('commandUnknown') };
    }

    flight.lastControllerMessage = text;
    return { ok: true, message: this.t('commandSent'), atcMessage, readback };
  }

  bumpScore(points) {
    if (!this.session) return;
    this.session.score += points;
  }

  punish(points, message) {
    if (!this.session) return;
    this.session.score = Math.max(0, this.session.score - points);
    this.session.calm = Math.max(0, this.session.calm - Math.min(18, points / 4));
    this.session.warnings += 1;
    this.emitSystem('warning', message);
  }

  emitSystem(type, message) {
    this.onEvent({ type, message, at: Date.now() });
  }

  emitRadio(side, message, flight) {
    this.onRadio({ side, message, flightId: flight?.id || null, at: Date.now() });
  }

  spawnFlight(kind = 'arrival') {
    const s = this.session;
    if (!s) return;
    const airport = s.airport;
    const arrivalFixes = airport.fixes.filter((fix) => fix.type === 'arrival');
    const departureFixes = airport.fixes.filter((fix) => fix.type === 'departure');
    const model = pick(MODELS);
    const airline = pick(AIRLINE_SETS[airport.id] || ['AAL', 'BAW', 'DLH']);
    const callsign = `${airline}${Math.floor(rand(101, 999))}`;
    const id = `FLT-${++this.idCounter}`;

    if (kind === 'arrival') {
      const fix = pick(arrivalFixes);
      const flight = {
        id,
        callsign,
        airline,
        model: model.icao,
        category: model.category,
        kind: 'arrival',
        phase: 'arrival',
        phaseClock: 0,
        altitudeFt: roundStep(rand(9000, 15000), 500),
        targetAltitudeFt: roundStep(rand(5000, 9000), 500),
        speedKt: model.cruise,
        targetSpeedKt: model.cruise - 20,
        bearing: fix.bearing + rand(-6, 6),
        distanceNm: fix.distanceNm + rand(-2, 2),
        heading: normalizeHeading(airport.preferredConfig.finalBearing + rand(-35, 35)),
        targetHeading: airport.preferredConfig.finalBearing,
        fix,
        clearedApproach: false,
        clearedLand: false,
        handoffApproved: false,
        holding: false,
        status: 'INBOUND',
        trail: [],
        colorState: 'stable',
        completed: false
      };
      s.flights.push(flight);
      this.emitRadio('pilot', this.t('pilotArrivalRequest', { callsign, fix: fix.name, altitude: flight.altitudeFt }), flight);
      return;
    }

    const fix = pick(departureFixes);
    const flight = {
      id,
      callsign,
      airline,
      model: model.icao,
      category: model.category,
      kind: 'departure',
      phase: 'request-taxi',
      phaseClock: 0,
      altitudeFt: airport.elevationFt,
      targetAltitudeFt: 5000,
      speedKt: 0,
      targetSpeedKt: 210,
      bearing: airport.preferredConfig.finalBearing,
      distanceNm: 1,
      heading: airport.preferredConfig.finalBearing,
      targetHeading: airport.preferredConfig.finalBearing,
      fix,
      clearedApproach: false,
      clearedLand: false,
      handoffApproved: false,
      holding: false,
      status: 'GND',
      trail: [],
      colorState: 'stable',
      completed: false
    };
    s.flights.push(flight);
    this.emitRadio('pilot', this.t('pilotTaxiRequest', { callsign, runway: airport.preferredConfig.departureRunway, fix: fix.name }), flight);
  }

  stepFlight(flight, dt) {
    const airport = this.session.airport;
    flight.phaseClock += dt;

    if (flight.phase === 'arrival') {
      this.stepArrival(flight, dt, airport);
    } else {
      this.stepDeparture(flight, dt, airport);
    }

    flight.trail.push({ bearing: flight.bearing, distanceNm: flight.distanceNm });
    if (flight.trail.length > 14) flight.trail.shift();
  }

  stepArrival(flight, dt, airport) {
    const centerBearing = airport.preferredConfig.finalBearing;
    const hdgTurn = angleDiff(flight.heading, flight.targetHeading);
    flight.heading = normalizeHeading(flight.heading + clamp(hdgTurn, -2.8, 2.8) * dt);
    flight.speedKt += clamp(flight.targetSpeedKt - flight.speedKt, -8, 8) * dt * 0.35;
    flight.altitudeFt += clamp(flight.targetAltitudeFt - flight.altitudeFt, -500, 500) * dt * 0.3;

    const towardCenter = angleDiff(flight.bearing, flight.heading);
    flight.bearing = normalizeHeading(flight.bearing + clamp(towardCenter, -4, 4) * dt * 0.3);
    flight.distanceNm = Math.max(0, flight.distanceNm - (flight.speedKt / 3600) * dt);

    if (flight.holding && flight.distanceNm < 20) {
      flight.bearing = normalizeHeading(flight.bearing + 18 * dt);
      flight.distanceNm = Math.max(10, flight.distanceNm);
    }

    if (!flight.clearedApproach && flight.distanceNm < 18) {
      flight.colorState = 'warning';
      if (flight.phaseClock > 70) {
        this.punish(26, this.t('warnApproachLate', { callsign: flight.callsign }));
        flight.phaseClock = 0;
      }
    }

    if (flight.clearedApproach) {
      flight.targetHeading = centerBearing;
      flight.targetSpeedKt = Math.min(flight.targetSpeedKt, 180);
      flight.targetAltitudeFt = flight.distanceNm < 10 ? 2500 : 3500;
      flight.status = 'APP';
    }

    if (flight.distanceNm <= 6) {
      flight.status = 'FINAL';
      flight.targetSpeedKt = 152;
      flight.targetAltitudeFt = 1000;
      if (flight.clearedLand && Math.abs(angleDiff(flight.heading, centerBearing)) < 18) {
        flight.phase = 'landing-roll';
        flight.phaseClock = 0;
        this.session.landings += 1;
        this.bumpScore(85);
        this.emitRadio('pilot', this.t('pilotLanding', { callsign: flight.callsign, runway: airport.preferredConfig.arrivalRunway }), flight);
      }
    }

    if (flight.distanceNm <= 1.2 && !flight.clearedLand) {
      this.punish(45, this.t('warnLandingClearanceMissing', { callsign: flight.callsign }));
      flight.completed = true;
      this.emitRadio('pilot', this.t('pilotGoAround', { callsign: flight.callsign }), flight);
    }

    if (flight.phase === 'landing-roll' && flight.phaseClock > 4) {
      flight.completed = true;
      flight.status = 'LANDED';
      this.emitSystem('landed', this.t('eventLanded', { callsign: flight.callsign }));
    }
  }

  stepDeparture(flight, dt, airport) {
    if (flight.phase === 'request-taxi') {
      flight.status = 'GND';
      if (flight.phaseClock > 75) {
        this.punish(18, this.t('warnTaxiDelay', { callsign: flight.callsign }));
        flight.phaseClock = 0;
      }
      return;
    }

    if (flight.phase === 'taxi') {
      flight.status = 'TAXI';
      if (flight.phaseClock > 18) {
        flight.phase = 'ready-departure';
        flight.phaseClock = 0;
        this.emitRadio('pilot', this.t('pilotReadyDeparture', { callsign: flight.callsign, runway: airport.preferredConfig.departureRunway }), flight);
      }
      return;
    }

    if (flight.phase === 'ready-departure') {
      flight.status = 'LINE UP';
      if (flight.phaseClock > 65) {
        this.punish(18, this.t('warnTakeoffDelay', { callsign: flight.callsign }));
        flight.phaseClock = 0;
      }
      return;
    }

    if (flight.phase === 'departure-roll') {
      flight.status = 'ROLL';
      flight.speedKt = Math.min(165, flight.speedKt + 26 * dt);
      if (flight.phaseClock > 5) {
        flight.phase = 'departure-climb';
        flight.phaseClock = 0;
        this.emitRadio('pilot', this.t('pilotAirborne', { callsign: flight.callsign, fix: flight.fix.name }), flight);
      }
      return;
    }

    if (flight.phase === 'departure-climb') {
      flight.status = 'DEP';
      flight.speedKt += clamp(flight.targetSpeedKt - flight.speedKt, -10, 10) * dt * 0.34;
      flight.altitudeFt += clamp(flight.targetAltitudeFt - flight.altitudeFt, -700, 700) * dt * 0.42;
      const hdgTurn = angleDiff(flight.heading, flight.targetHeading);
      flight.heading = normalizeHeading(flight.heading + clamp(hdgTurn, -3.5, 3.5) * dt);
      flight.bearing = normalizeHeading(flight.heading);
      flight.distanceNm += (flight.speedKt / 3600) * dt;

      if (flight.altitudeFt >= 4500 && !flight.handoffPrompted) {
        flight.handoffPrompted = true;
        this.emitRadio('pilot', this.t('pilotLeavingAirspace', { callsign: flight.callsign }), flight);
      }

      if (flight.distanceNm > airport.tmaRadiusNm - 5) {
        if (flight.handoffApproved) {
          flight.completed = true;
          this.session.departures += 1;
          this.session.handoffs += 1;
          this.bumpScore(70);
          this.emitSystem('handoff', this.t('eventHandoff', { callsign: flight.callsign }));
        } else {
          this.punish(22, this.t('warnHandoffMissing', { callsign: flight.callsign }));
          flight.completed = true;
        }
      }
    }
  }

  detectConflicts() {
    const live = this.session.flights.filter((flight) => !flight.completed && (flight.phase === 'arrival' || flight.phase === 'landing-roll' || flight.phase === 'departure-climb'));
    for (const flight of live) flight.colorState = flight.colorState === 'warning' ? 'warning' : 'stable';
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i];
        const b = live[j];
        const lateral = distanceBetweenFlights(a, b);
        const vertical = Math.abs(a.altitudeFt - b.altitudeFt);
        if (lateral < 5 && vertical < 1000) {
          a.colorState = 'conflict';
          b.colorState = 'conflict';
          if (!a.conflictLatch || !b.conflictLatch) {
            a.conflictLatch = b.conflictLatch = true;
            this.session.conflicts += 1;
            this.punish(34, this.t('warnConflict', { a: a.callsign, b: b.callsign }));
          }
        }
      }
    }
  }

  t(key, vars = {}) {
    const dict = {
      pt: {
        sessionStart: 'Operação iniciada em {{airport}}. Torre e APP ativos.',
        sessionEnd: 'Sessão encerrada. Score final {{score}}.',
        flightNotFound: 'Voo não encontrado.',
        commandUnknown: 'Comando não reconhecido. Use ALT, HDG, SPD, APP, LAND, TAXI, TAKEOFF ou HANDOFF.',
        commandSent: 'Comando transmitido.',
        atcAltitude: '{{callsign}}, desça/suba e mantenha {{altitude}} pés.',
        atcHeading: '{{callsign}}, vire proa {{heading}}.',
        atcSpeed: '{{callsign}}, mantenha {{speed}} nós.',
        atcApproach: '{{callsign}}, autorizado aproximação para pista {{runway}}.',
        atcLand: '{{callsign}}, autorizado pouso pista {{runway}}.',
        atcTaxi: '{{callsign}}, autorizado táxi para pista {{runway}}.',
        atcTakeoff: '{{callsign}}, autorizado decolagem pista {{runway}}.',
        atcHandoff: '{{callsign}}, contate setor seguinte.',
        atcHold: '{{callsign}}, entre em espera sobre {{fix}}.',
        pilotArrivalRequest: '{{callsign}}, entrando pela {{fix}}, {{altitude}} pés, solicita vetoração para aproximação.',
        pilotTaxiRequest: '{{callsign}}, posição pátio, solicita acionamento e táxi para {{runway}}, saída {{fix}}.',
        pilotReadyDeparture: '{{callsign}}, pronto para decolagem em {{runway}}.',
        pilotAirborne: '{{callsign}}, decolando, saída publicada {{fix}}.',
        pilotLeavingAirspace: '{{callsign}}, deixando espaço aéreo, solicita mudança para centro.',
        pilotLanding: '{{callsign}}, pousando em {{runway}}.',
        pilotGoAround: '{{callsign}}, sem autorização em final, arremetendo.',
        eventLanded: '{{callsign}} completou pouso com sucesso.',
        eventHandoff: '{{callsign}} transferido para o setor seguinte.',
        warnApproachLate: '{{callsign}} está sem autorização de aproximação dentro da área crítica.',
        warnLandingClearanceMissing: '{{callsign}} cruzou a curta final sem autorização de pouso.',
        warnTaxiDelay: '{{callsign}} aguardando táxi há tempo demais.',
        warnTakeoffDelay: '{{callsign}} aguardando decolagem há tempo demais.',
        warnHandoffMissing: '{{callsign}} saiu da TMA sem handoff apropriado.',
        warnConflict: 'Conflito detectado entre {{a}} e {{b}}.',
      },
      en: {
        sessionStart: 'Operation started at {{airport}}. Tower and approach are live.',
        sessionEnd: 'Session ended. Final score {{score}}.',
        flightNotFound: 'Flight not found.',
        commandUnknown: 'Unknown command. Use ALT, HDG, SPD, APP, LAND, TAXI, TAKEOFF or HANDOFF.',
        commandSent: 'Command transmitted.',
        atcAltitude: '{{callsign}}, climb/descend and maintain {{altitude}} feet.',
        atcHeading: '{{callsign}}, turn heading {{heading}}.',
        atcSpeed: '{{callsign}}, maintain {{speed}} knots.',
        atcApproach: '{{callsign}}, cleared approach runway {{runway}}.',
        atcLand: '{{callsign}}, cleared to land runway {{runway}}.',
        atcTaxi: '{{callsign}}, taxi approved runway {{runway}}.',
        atcTakeoff: '{{callsign}}, cleared for takeoff runway {{runway}}.',
        atcHandoff: '{{callsign}}, contact next sector.',
        atcHold: '{{callsign}}, hold over {{fix}}.',
        pilotArrivalRequest: '{{callsign}}, inbound via {{fix}}, {{altitude}} feet, requesting vectors for approach.',
        pilotTaxiRequest: '{{callsign}}, at stand, request startup and taxi to {{runway}}, departure {{fix}}.',
        pilotReadyDeparture: '{{callsign}}, ready for departure runway {{runway}}.',
        pilotAirborne: '{{callsign}}, airborne, published departure {{fix}}.',
        pilotLeavingAirspace: '{{callsign}}, leaving your airspace, request frequency change to center.',
        pilotLanding: '{{callsign}}, landing runway {{runway}}.',
        pilotGoAround: '{{callsign}}, no landing clearance on short final, going around.',
        eventLanded: '{{callsign}} completed landing successfully.',
        eventHandoff: '{{callsign}} transferred to the next sector.',
        warnApproachLate: '{{callsign}} is inside the critical area without approach clearance.',
        warnLandingClearanceMissing: '{{callsign}} crossed short final without landing clearance.',
        warnTaxiDelay: '{{callsign}} has been waiting too long for taxi.',
        warnTakeoffDelay: '{{callsign}} has been waiting too long for departure.',
        warnHandoffMissing: '{{callsign}} exited the TMA without a proper handoff.',
        warnConflict: 'Conflict detected between {{a}} and {{b}}.',
      }
    };
    const lang = this.session?.language || 'pt';
    let template = (dict[lang] && dict[lang][key]) || dict.pt[key] || key;
    Object.entries(vars).forEach(([name, value]) => {
      template = template.replaceAll(`{{${name}}}`, value);
    });
    return template;
  }
}

export { rankOrder };
