import { geoToWorld, lerp } from './math.js';

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

  renderStatic() {
    if (!this.catalog) return;
    const rect = this.stage.getBoundingClientRect();
    const ctx = this.worldCanvas.getContext('2d');
    ctx.clearRect(0, 0, rect.width, rect.height);
    const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
    bg.addColorStop(0, '#0c1630');
    bg.addColorStop(1, '#08111f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const continents = [
      [[0.08, 0.18],[0.22,0.12],[0.28,0.26],[0.22,0.42],[0.15,0.38],[0.11,0.29]],
      [[0.28,0.52],[0.36,0.46],[0.4,0.67],[0.34,0.86],[0.26,0.76]],
      [[0.45,0.18],[0.58,0.16],[0.67,0.23],[0.63,0.33],[0.5,0.32]],
      [[0.48,0.36],[0.56,0.42],[0.54,0.64],[0.46,0.72],[0.42,0.51]],
      [[0.68,0.14],[0.84,0.18],[0.92,0.32],[0.88,0.48],[0.74,0.5],[0.65,0.34]],
      [[0.77,0.72],[0.86,0.74],[0.9,0.82],[0.83,0.88],[0.76,0.82]]
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    continents.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([x, y], index) => {
        const px = x * rect.width;
        const py = y * rect.height;
        if (!index) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(109,169,255,0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i += 1) {
      const y = (rect.height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    this.renderAirportMarkers();
  }

  renderAirportMarkers() {
    if (!this.catalog) return;
    const activeAirports = this.catalog.airports || [];
    for (const airport of activeAirports) {
      let button = this.airportMap.get(airport.id);
      if (!button) {
        button = document.createElement('button');
        button.className = 'airport-marker';
        button.type = 'button';
        button.innerHTML = `
          <div class="airport-miniature">
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
  }

  render(snapshot) {
    this.snapshot = snapshot;
    if (!this.catalog) return;
    const rect = this.stage.getBoundingClientRect();
    const ctx = this.fxCanvas.getContext('2d');
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const route of snapshot.routes || []) {
      const from = snapshot.airportMap[route.from];
      const to = snapshot.airportMap[route.to];
      if (!from || !to) continue;
      const a = this.project(from);
      const b = this.project(to);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const cpX = (a.x + b.x) * 0.5;
      const cpY = Math.min(a.y, b.y) - Math.abs(a.x - b.x) * 0.08;
      ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
      ctx.strokeStyle = 'rgba(109,169,255,0.16)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

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
      const a = this.project(origin);
      const b = this.project(destination);
      const x = lerp(a.x, b.x, flight.progress);
      const yCurve = Math.sin(Math.PI * flight.progress) * Math.min(42, Math.abs(a.x - b.x) * 0.12);
      const y = lerp(a.y, b.y, flight.progress) - yCurve;
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.style.transform = `translate(-50%, -50%) rotate(${flight.heading}deg)`;
      button.classList.toggle('is-selected', snapshot.selectedFlight?.id === flight.id);
      button.classList.toggle('is-conflict', Boolean(flight.conflict));
      button.classList.toggle('is-warning', Boolean(flight.warning));
      button.querySelector('.flight-tag').textContent = flight.callsign;
    }

    for (const [flightId, button] of this.flightMap.entries()) {
      if (!flightIds.has(flightId)) {
        button.remove();
        this.flightMap.delete(flightId);
      }
    }
  }
}
