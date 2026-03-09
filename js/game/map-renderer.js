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
    this.worldShapes = null;
    this.resize = this.resize.bind(this);
  }

  async init() {
    await this.loadWorldShapes();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  async loadWorldShapes() {
    try {
      const data = await fetch('./assets/data/world.geojson', { cache: 'force-cache' }).then((res) => res.json());
      this.worldShapes = data?.features || [];
    } catch {
      this.worldShapes = [];
    }
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
    bg.addColorStop(0, '#04101e');
    bg.addColorStop(0.48, '#082042');
    bg.addColorStop(1, '#050d17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const glowA = ctx.createRadialGradient(rect.width * 0.18, rect.height * 0.26, 20, rect.width * 0.18, rect.height * 0.26, rect.width * 0.44);
    glowA.addColorStop(0, 'rgba(114,246,213,0.15)');
    glowA.addColorStop(1, 'rgba(114,246,213,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const glowB = ctx.createRadialGradient(rect.width * 0.84, rect.height * 0.14, 10, rect.width * 0.84, rect.height * 0.14, rect.width * 0.38);
    glowB.addColorStop(0, 'rgba(109,169,255,0.16)');
    glowB.addColorStop(1, 'rgba(109,169,255,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  drawGrid(ctx, rect) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.06)';
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

  drawRadarBands(ctx, rect) {
    ctx.save();
    const centerX = rect.width * 0.5;
    const centerY = rect.height * 0.52;
    const maxRadius = Math.min(rect.width, rect.height) * 0.5;
    for (let i = 1; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * (i / 4), 0, Math.PI * 2);
      ctx.strokeStyle = i === 4 ? 'rgba(114,246,213,0.06)' : 'rgba(114,246,213,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFeatureGeometry(ctx, geometry) {
    const drawRing = (ring) => {
      ring.forEach(([lon, lat], index) => {
        const point = this.projectGeo(lat, lon);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
    };

    if (geometry.type === 'Polygon') {
      ctx.beginPath();
      geometry.coordinates.forEach((ring) => drawRing(ring));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((polygon) => {
        ctx.beginPath();
        polygon.forEach((ring) => drawRing(ring));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  drawContinents(ctx, rect) {
    ctx.save();
    const fill = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    fill.addColorStop(0, 'rgba(87, 137, 194, 0.18)');
    fill.addColorStop(1, 'rgba(37, 76, 128, 0.11)');
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(215, 236, 255, 0.10)';
    ctx.lineWidth = 0.9;

    if (this.worldShapes?.length) {
      this.worldShapes.forEach((feature) => {
        if (feature?.geometry) this.drawFeatureGeometry(ctx, feature.geometry);
      });
    }
    ctx.restore();
  }

  drawAirportLinks(ctx) {
    if (!this.catalog?.airports?.length) return;
    ctx.save();
    const airports = this.catalog.airports;
    ctx.strokeStyle = 'rgba(114, 246, 213, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < airports.length; i += 1) {
      const a = airports[i];
      const b = airports[(i + 3) % airports.length];
      if (!b) continue;
      const pa = this.project(a);
      const pb = this.project(b);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderStatic() {
    if (!this.catalog) return;
    const rect = this.stage.getBoundingClientRect();
    const ctx = this.worldCanvas.getContext('2d');
    ctx.clearRect(0, 0, rect.width, rect.height);

    this.drawWorldBackground(ctx, rect);
    this.drawGrid(ctx, rect);
    this.drawRadarBands(ctx, rect);
    this.drawContinents(ctx, rect);
    this.drawAirportLinks(ctx);
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
            <div class="airport-pulse"></div>
            <div class="airport-ring"></div>
            <div class="airport-core"></div>
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
      const curve = Math.min(72, Math.max(14, Math.abs(a.x - b.x) * 0.06));
      const cpX = (a.x + b.x) * 0.5;
      const cpY = Math.min(a.y, b.y) - curve;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
      ctx.strokeStyle = 'rgba(120, 169, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawFlightTrail(ctx, flight, origin, destination) {
    const a = this.project(origin);
    const b = this.project(destination);
    const curve = Math.min(72, Math.max(14, Math.abs(a.x - b.x) * 0.06));
    const cpX = (a.x + b.x) * 0.5;
    const cpY = Math.min(a.y, b.y) - curve;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
    ctx.strokeStyle = flight.conflict ? 'rgba(255,111,119,0.24)' : flight.warning ? 'rgba(255,177,94,0.18)' : 'rgba(114,246,213,0.12)';
    ctx.lineWidth = flight.conflict ? 1.9 : 1.2;
    ctx.setLineDash([5, 12]);
    ctx.lineDashOffset = -(flight.progress * 110);
    ctx.stroke();
    ctx.setLineDash([]);

    const point = routePoint(a, b, flight.progress, curve * 0.48 + flight.lateralOffset * 1.6);
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 14);
    glow.addColorStop(0, flight.conflict ? 'rgba(255,111,119,0.22)' : flight.warning ? 'rgba(255,177,94,0.16)' : 'rgba(114,246,213,0.14)');
    glow.addColorStop(1, 'rgba(114,246,213,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 14, 0, Math.PI * 2);
    ctx.fill();
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
            <div class="flight-vector"></div>
            <div class="flight-body-core"></div>
            <div class="flight-wing wing-a"></div>
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
      button.querySelector('.flight-tag').textContent = `${flight.callsign}`;
    }

    for (const [flightId, button] of this.flightMap.entries()) {
      if (!flightIds.has(flightId)) {
        button.remove();
        this.flightMap.delete(flightId);
      }
    }
  }
}
