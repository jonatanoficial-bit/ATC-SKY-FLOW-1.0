import { projectGeoToNorm, normToScreen, resolveFlightGeometry, sampleFlightCurve } from './math.js';

export class MapRenderer {
  constructor({ stage, worldCanvas, fxCanvas, markerLayer, onSelectFlight = () => {}, onSelectAirport = () => {} }) {
    this.stage = stage;
    this.worldCanvas = worldCanvas;
    this.fxCanvas = fxCanvas;
    this.markerLayer = markerLayer;
    this.onSelectFlight = onSelectFlight;
    this.onSelectAirport = onSelectAirport;
    this.worldContext = worldCanvas.getContext('2d');
    this.fxContext = fxCanvas.getContext('2d');
    this.airportElements = new Map();
    this.flightElements = new Map();
    this.content = null;
    this.scenario = null;
    this.worldData = null;
    this.padding = 18;
    this.width = 0;
    this.height = 0;
    this.deviceRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.needsBackground = true;
  }

  async init() {
    await this.loadWorldData();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async loadWorldData() {
    try {
      const response = await fetch('./assets/data/world.geojson', { cache: 'force-cache' });
      if (!response.ok) throw new Error('map');
      this.worldData = await response.json();
    } catch (error) {
      this.worldData = null;
    }
  }

  resize() {
    const bounds = this.stage.getBoundingClientRect();
    this.width = Math.max(320, bounds.width);
    this.height = Math.max(260, bounds.height);
    this.padding = Math.max(14, this.width * 0.02);

    [this.worldCanvas, this.fxCanvas].forEach((canvas) => {
      canvas.width = Math.floor(this.width * this.deviceRatio);
      canvas.height = Math.floor(this.height * this.deviceRatio);
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
    });

    this.worldContext.setTransform(this.deviceRatio, 0, 0, this.deviceRatio, 0, 0);
    this.fxContext.setTransform(this.deviceRatio, 0, 0, this.deviceRatio, 0, 0);

    this.positionAirportMarkers();
    this.needsBackground = true;
  }

  setCatalog(content) {
    this.content = content;
    this.syncAirportMarkers();
    this.needsBackground = true;
  }

  setScenario(scenario) {
    this.scenario = scenario;
    this.needsBackground = true;
  }

  getThemeColor(name, fallback) {
    return this.scenario?.theme?.[name] || fallback;
  }

  projectAirport(airport) {
    return normToScreen(projectGeoToNorm(airport), this.width, this.height, this.padding);
  }

  positionAirportMarkers() {
    if (!this.content?.airports?.length) return;
    this.content.airports.forEach((airport) => {
      const element = this.airportElements.get(airport.id);
      if (!element) return;
      const point = this.projectAirport(airport);
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    });
  }

  createAirportMarker(airport) {
    const button = document.createElement('button');
    button.className = 'airport-marker';
    button.type = 'button';
    button.dataset.airportId = airport.id;
    button.innerHTML = `
      <span class="airport-miniature">
        <span class="airport-platform"></span>
        <span class="airport-terminal"></span>
        <span class="airport-tower"></span>
        <span class="airport-beacon"></span>
      </span>
      <span class="airport-label">${airport.iata}</span>
    `;
    button.addEventListener('click', () => this.onSelectAirport(airport));
    this.markerLayer.append(button);
    this.airportElements.set(airport.id, button);
    return button;
  }

  syncAirportMarkers() {
    const activeIds = new Set((this.content?.airports || []).map((airport) => airport.id));
    [...this.airportElements.keys()].forEach((airportId) => {
      if (!activeIds.has(airportId)) {
        this.airportElements.get(airportId)?.remove();
        this.airportElements.delete(airportId);
      }
    });

    (this.content?.airports || []).forEach((airport) => {
      const element = this.airportElements.get(airport.id) || this.createAirportMarker(airport);
      element.style.setProperty('--airport-glow', airport.tier === 'mega' ? '1' : '0.65');
      const point = this.projectAirport(airport);
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    });
  }

  createFlightMarker(flight) {
    const button = document.createElement('button');
    button.className = 'flight-marker';
    button.type = 'button';
    button.dataset.flightId = flight.id;
    button.innerHTML = `
      <span class="flight-body-shell">
        <span class="flight-body-core"></span>
        <span class="flight-tail"></span>
        <span class="flight-glow"></span>
      </span>
      <span class="flight-tag">${flight.callsign}</span>
    `;
    button.addEventListener('click', () => this.onSelectFlight(flight.id));
    this.markerLayer.append(button);
    this.flightElements.set(flight.id, button);
    return button;
  }

  drawBackground() {
    const ctx = this.worldContext;
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#07101f');
    gradient.addColorStop(0.5, '#0c1830');
    gradient.addColorStop(1, '#071421');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const aurora = ctx.createRadialGradient(this.width * 0.18, this.height * 0.16, 10, this.width * 0.18, this.height * 0.16, this.width * 0.7);
    aurora.addColorStop(0, 'rgba(109, 169, 255, 0.18)');
    aurora.addColorStop(0.38, 'rgba(114, 246, 213, 0.11)');
    aurora.addColorStop(1, 'rgba(6, 12, 24, 0)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();
    this.drawStars();
    this.drawContinents();
    this.drawWeatherOverlay();
    this.drawEdgeGlow();

    this.needsBackground = false;
  }

  drawStars() {
    const ctx = this.worldContext;
    for (let index = 0; index < 90; index += 1) {
      const x = (index * 97) % this.width;
      const y = (index * 67) % this.height;
      const radius = (index % 3 === 0 ? 1.4 : 0.7);
      ctx.beginPath();
      ctx.fillStyle = index % 4 === 0 ? 'rgba(124, 246, 213, 0.18)' : 'rgba(255, 255, 255, 0.12)';
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGrid() {
    const ctx = this.worldContext;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

    for (let lon = -150; lon <= 150; lon += 30) {
      const x = this.padding + ((lon + 180) / 360) * (this.width - this.padding * 2);
      ctx.beginPath();
      ctx.moveTo(x, this.padding);
      ctx.lineTo(x, this.height - this.padding);
      ctx.stroke();
    }

    for (let lat = -60; lat <= 60; lat += 30) {
      const y = this.padding + ((90 - lat) / 180) * (this.height - this.padding * 2);
      ctx.beginPath();
      ctx.moveTo(this.padding, y);
      ctx.lineTo(this.width - this.padding, y);
      ctx.stroke();
    }
  }

  drawContinents() {
    const ctx = this.worldContext;
    ctx.save();
    ctx.fillStyle = 'rgba(77, 111, 163, 0.17)';
    ctx.strokeStyle = 'rgba(151, 205, 255, 0.15)';
    ctx.lineWidth = 1.2;

    if (this.worldData?.features?.length) {
      this.worldData.features.forEach((feature) => {
        const geometry = feature.geometry;
        if (!geometry) return;
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        polygons.forEach((polygon) => {
          polygon.forEach((ring) => {
            ctx.beginPath();
            ring.forEach((coordinate, index) => {
              const point = normToScreen(
                { x: ((coordinate[0] + 180 + 360) % 360) / 360, y: (90 - coordinate[1]) / 180 },
                this.width,
                this.height,
                this.padding
              );
              const previous = index > 0 ? ring[index - 1] : null;
              if (previous && Math.abs(previous[0] - coordinate[0]) > 170) {
                ctx.moveTo(point.x, point.y);
              } else if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        });
      });
    } else {
      const fallbackBlobs = [
        [0.12, 0.38, 0.18, 0.18],
        [0.31, 0.32, 0.2, 0.22],
        [0.56, 0.28, 0.24, 0.18],
        [0.8, 0.55, 0.17, 0.15]
      ];
      fallbackBlobs.forEach(([x, y, w, h]) => {
        ctx.beginPath();
        ctx.ellipse(this.padding + x * (this.width - this.padding * 2), this.padding + y * (this.height - this.padding * 2), w * this.width * 0.4, h * this.height * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  drawWeatherOverlay() {
    const ctx = this.worldContext;
    const weatherCells = this.scenario?.weatherCells || [];
    weatherCells.forEach((cell) => {
      const center = normToScreen(projectGeoToNorm({ lat: cell.lat, lon: cell.lon }), this.width, this.height, this.padding);
      const radius = cell.radius * Math.min(this.width, this.height) * 8.2;
      const gradient = ctx.createRadialGradient(center.x, center.y, 4, center.x, center.y, radius);
      gradient.addColorStop(0, 'rgba(255, 181, 94, 0.20)');
      gradient.addColorStop(0.45, 'rgba(255, 143, 95, 0.12)');
      gradient.addColorStop(1, 'rgba(255, 143, 95, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawEdgeGlow() {
    const ctx = this.worldContext;
    const glow = ctx.createLinearGradient(0, 0, this.width, this.height);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glow.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.width - 1, this.height - 1);
  }

  drawDynamic(state) {
    const ctx = this.fxContext;
    ctx.clearRect(0, 0, this.width, this.height);

    state.flights.forEach((flight) => {
      const points = sampleFlightCurve(flight, this.content.airportsById, 36);
      if (!points.length) return;

      ctx.beginPath();
      points.forEach((point, index) => {
        const screenPoint = normToScreen(point, this.width, this.height, this.padding);
        if (index === 0) {
          ctx.moveTo(screenPoint.x, screenPoint.y);
        } else {
          ctx.lineTo(screenPoint.x, screenPoint.y);
        }
      });

      const selected = state.selectedFlightId === flight.id;
      ctx.lineWidth = selected ? 2.8 : 1.3;
      ctx.strokeStyle = flight.conflict
        ? 'rgba(255, 109, 109, 0.92)'
        : selected
          ? 'rgba(124, 246, 213, 0.92)'
          : 'rgba(130, 184, 255, 0.35)';
      ctx.stroke();

      const currentGeometry = resolveFlightGeometry(flight, this.content.airportsById);
      if (currentGeometry) {
        const currentPoint = normToScreen(currentGeometry.point, this.width, this.height, this.padding);
        if (flight.conflict) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 109, 109, 0.2)';
          ctx.lineWidth = 8;
          ctx.arc(currentPoint.x, currentPoint.y, 13, 0, Math.PI * 2);
          ctx.stroke();
        } else if (flight.warning) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 205, 112, 0.18)';
          ctx.lineWidth = 5;
          ctx.arc(currentPoint.x, currentPoint.y, 11, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    this.syncFlightMarkers(state.flights, state.selectedFlightId);
  }

  syncFlightMarkers(flights, selectedFlightId) {
    const liveIds = new Set(flights.map((flight) => flight.id));
    [...this.flightElements.keys()].forEach((flightId) => {
      if (!liveIds.has(flightId)) {
        this.flightElements.get(flightId)?.remove();
        this.flightElements.delete(flightId);
      }
    });

    flights.forEach((flight) => {
      const geometry = resolveFlightGeometry(flight, this.content.airportsById);
      if (!geometry) return;
      const point = normToScreen(geometry.point, this.width, this.height, this.padding);
      const element = this.flightElements.get(flight.id) || this.createFlightMarker(flight);
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
      element.style.transform = `translate(-50%, -50%) rotate(${flight.heading || 0}rad)`;
      element.classList.toggle('is-selected', selectedFlightId === flight.id);
      element.classList.toggle('is-conflict', Boolean(flight.conflict));
      element.classList.toggle('is-warning', Boolean(flight.warning));
      element.querySelector('.flight-tag').textContent = flight.callsign;
    });
  }

  render(state) {
    if (!this.content) return;
    if (this.needsBackground) {
      this.drawBackground();
      this.positionAirportMarkers();
    }
    this.drawDynamic(state);
  }
}