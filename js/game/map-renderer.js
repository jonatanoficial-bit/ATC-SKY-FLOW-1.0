import { geoToWorld } from './math.js';

const routePoint = (start, end, progress, curve = 0) => {
  const baseX = start.x + (end.x - start.x) * progress;
  const baseY = start.y + (end.y - start.y) * progress;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const arc = Math.sin(Math.PI * progress) * curve;
  return {
    x: baseX + nx * arc,
    y: baseY + ny * arc
  };
};

const WORLD_POLYGONS = [
  [[-169, 72], [-140, 70], [-120, 62], [-110, 55], [-98, 49], [-84, 30], [-97, 15], [-107, 21], [-117, 27], [-126, 36], [-136, 50], [-154, 58]],
  [[-82, 12], [-76, 8], [-72, -5], [-68, -18], [-63, -30], [-58, -41], [-53, -53], [-44, -55], [-37, -42], [-38, -22], [-48, -5], [-61, 7]],
  [[-10, 71], [11, 70], [38, 63], [60, 55], [85, 55], [110, 48], [136, 50], [158, 60], [178, 53], [165, 40], [126, 24], [108, 8], [80, 7], [60, 26], [40, 35], [18, 38], [4, 52], [-6, 57]],
  [[-17, 36], [6, 37], [26, 30], [34, 17], [40, 4], [34, -17], [22, -34], [10, -35], [2, -27], [-8, -8], [-14, 10]],
  [[113, -12], [126, -16], [139, -21], [151, -28], [154, -38], [144, -43], [130, -37], [118, -27]],
  [[-52, 82], [-36, 80], [-28, 75], [-40, 70], [-56, 72], [-63, 77]]
];

export class MapRenderer {
  constructor({ stage, worldCanvas, fxCanvas, markerLayer, onSelectFlight, onSelectAirport }) {
    this.stage = stage;
    this.worldCanvas = worldCanvas;
    this.fxCanvas = fxCanvas;
    this.markerLayer = markerLayer;
    this.onSelectFlight = onSelectFlight;
    this.onSelectAirport = onSelectAirport;
    this.catalog = null;
    this.snapshot = null;
    this.flightMap = new Map();
    this.airportMap = new Map();
    this.resize = this.resize.bind(this);
  }

  async init() {
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  setCatalog(catalog) {
    this.catalog = catalog;
    this.renderStatic();
  }

  setScenario() {}

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    [this.worldCanvas, this.fxCanvas].forEach((canvas) => {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    this.renderStatic();
    if (this.snapshot) this.render(this.snapshot);
  }

  project(airport) {
    const rect = this.stage.getBoundingClientRect();
    return geoToWorld(airport.lat, airport.lon, rect.width, rect.height);
  }

  projectGeo(lat, lon) {
    const rect = this.stage.getBoundingClientRect();
    return geoToWorld(lat, lon, rect.width, rect.height);
  }

  drawWorldBackground(ctx, rect) {
    const bg = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    bg.addColorStop(0, '#061122');
    bg.addColorStop(0.55, '#0a1b37');
    bg.addColorStop(1, '#08111f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const glowA = ctx.createRadialGradient(rect.width * 0.18, rect.height * 0.24, 20, rect.width * 0.18, rect.height * 0.24, rect.width * 0.42);
    glowA.addColorStop(0, 'rgba(114,246,213,0.16)');
    glowA.addColorStop(1, 'rgba(114,246,213,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const glowB = ctx.createRadialGradient(rect.width * 0.84, rect.height * 0.12, 10, rect.width * 0.84, rect.height * 0.12, rect.width * 0.36);
    glowB.addColorStop(0, 'rgba(109,169,255,0.18)');
    glowB.addColorStop(1, 'rgba(109,169,255,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  drawGrid(ctx, rect) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let lon = -150; lon <= 150; lon += 30) {
      const p = this.projectGeo(0, lon);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, rect.height);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const p = this.projectGeo(lat, 0);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(rect.width, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawContinents(ctx) {
    ctx.save();
    WORLD_POLYGONS.forEach((polygon) => {
      ctx.beginPath();
      polygon.forEach(([lon, lat], index) => {
        const point = this.projectGeo(lat, lon);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, this.stage.clientWidth, this.stage.clientHeight);
      fill.addColorStop(0, 'rgba(122, 170, 220, 0.12)');
      fill.addColorStop(1, 'rgba(62, 101, 156, 0.08)');
      ctx.fillStyle = fill;
      ctx.strokeStyle = 'rgba(196, 226, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  renderStatic() {
    if (!this.catalog) return;
    const rect = this.stage.getBoundingClientRect();
    const ctx = this.worldCanvas.getContext('2d');
    ctx.clearRect(0, 0, rect.width, rect.height);

    this.drawWorldBackground(ctx, rect);
    this.drawGrid(ctx, rect);
    this.drawContinents(ctx);
    this.renderAirportMarkers();
  }

  renderAirportMarkers() {
    if (!this.catalog) return;
    const activeAirports = this.catalog.airports || [];
    const liveIds = new Set(activeAirports.map((airport) => airport.id));
    for (const airport of activeAirports) {
      let button = this.airportMap.get(airport.id);
      if (!button) {
        button = document.createElement('button');
        button.className = 'airport-marker';
        button.type = 'button';
        button.innerHTML = `
          <div class="airport-miniature">
            <div class="airport-ring"></div>
            <div class="airport-platform"></div>
            <div class="airport-terminal"></div>
            <div class="airport-tower"></div>
            <div class="airport-beacon"></div>
          </div>
          <div class="airport-label"></div>
        `;
        button.addEventListener('click', () => this.onSelectAirport(airport));
        this.markerLayer.appendChild(button);
        this.airportMap.set(airport.id, button);
      }
      const point = this.project(airport);
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.querySelector('.airport-label').textContent = airport.iata;
      button.style.setProperty('--airport-glow', String(airport.traffic || 1));
    }

    for (const [airportId, button] of this.airportMap.entries()) {
      if (!liveIds.has(airportId)) {
        button.remove();
        this.airportMap.delete(airportId);
      }
    }
  }

  drawRoutes(ctx, snapshot) {
    for (const route of snapshot.routes || []) {
      const from = snapshot.airportMap[route.from];
      const to = snapshot.airportMap[route.to];
      if (!from || !to) continue;
      const a = this.project(from);
      const b = this.project(to);
      const curve = Math.min(60, Math.max(16, Math.abs(a.x - b.x) * 0.08));
      const cpX = (a.x + b.x) * 0.5;
      const cpY = Math.min(a.y, b.y) - curve;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
      ctx.strokeStyle = 'rgba(120, 169, 255, 0.12)';
      ctx.lineWidth = 1.15;
      ctx.stroke();
    }
  }

  drawFlightTrail(ctx, flight, origin, destination) {
    const a = this.project(origin);
    const b = this.project(destination);
    const curve = Math.min(60, Math.max(16, Math.abs(a.x - b.x) * 0.08));
    const cpX = (a.x + b.x) * 0.5;
    const cpY = Math.min(a.y, b.y) - curve;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
    ctx.strokeStyle = flight.conflict ? 'rgba(255,111,119,0.26)' : flight.warning ? 'rgba(255,177,94,0.24)' : 'rgba(114,246,213,0.16)';
    ctx.lineWidth = flight.conflict ? 2.1 : 1.5;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -(flight.progress * 140);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  render(snapshot) {
    this.snapshot = snapshot;
    if (!this.catalog) return;
    const rect = this.stage.getBoundingClientRect();
    const ctx = this.fxCanvas.getContext('2d');
    ctx.clearRect(0, 0, rect.width, rect.height);

    this.drawRoutes(ctx, snapshot);

    const flightIds = new Set();
    for (const flight of snapshot.flights || []) {
      flightIds.add(flight.id);
      let button = this.flightMap.get(flight.id);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'flight-marker';
        button.innerHTML = `
          <div class="flight-body-shell">
            <div class="flight-glow"></div>
            <div class="flight-body-core"></div>
            <div class="flight-wing wing-a"></div>
            <div class="flight-wing wing-b"></div>
            <div class="flight-tail"></div>
          </div>
          <div class="flight-tag"></div>
        `;
        button.addEventListener('click', () => this.onSelectFlight(flight.id));
        this.markerLayer.appendChild(button);
        this.flightMap.set(flight.id, button);
      }
      const origin = snapshot.airportMap[flight.originId];
      const destination = snapshot.airportMap[flight.destinationId];
      if (!origin || !destination) continue;

      this.drawFlightTrail(ctx, flight, origin, destination);
      const point = this.projectGeo(flight.worldY, flight.worldX);
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.transform = `translate(-50%, -50%) rotate(${flight.heading}deg)`;
      button.classList.toggle('is-selected', snapshot.selectedFlight?.id === flight.id);
      button.classList.toggle('is-conflict', Boolean(flight.conflict));
      button.classList.toggle('is-warning', Boolean(flight.warning));
      button.querySelector('.flight-tag').textContent = `${flight.callsign} · FL${Math.round(flight.altitude)}`;
    }

    for (const [flightId, button] of this.flightMap.entries()) {
      if (!flightIds.has(flightId)) {
        button.remove();
        this.flightMap.delete(flightId);
      }
    }
  }
}
