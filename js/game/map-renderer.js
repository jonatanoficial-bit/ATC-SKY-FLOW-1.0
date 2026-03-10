const svg = (tag, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};

const polarToCanvas = (bearing, distanceNm, radiusNm, size = 1000) => {
  const usable = size * 0.39;
  const r = (distanceNm / radiusNm) * usable;
  const rad = ((bearing - 90) * Math.PI) / 180;
  return {
    x: size / 2 + Math.cos(rad) * r,
    y: size / 2 + Math.sin(rad) * r
  };
};

export class MapRenderer {
  constructor({ stage, radarSvg, markerLayer, onSelectFlight }) {
    this.stage = stage;
    this.radarSvg = radarSvg;
    this.markerLayer = markerLayer;
    this.onSelectFlight = onSelectFlight;
    this.selectedFlightId = null;
    this.airportId = null;
    this.size = 1000;
    this.ensureRadarShell();
  }

  ensureRadarShell() {
    this.radarSvg.innerHTML = '';
    const defs = svg('defs');
    const grad = svg('radialGradient', { id: 'radarGlow' });
    grad.appendChild(svg('stop', { offset: '0%', 'stop-color': 'rgba(36,255,170,0.13)' }));
    grad.appendChild(svg('stop', { offset: '75%', 'stop-color': 'rgba(12,22,28,0.02)' }));
    grad.appendChild(svg('stop', { offset: '100%', 'stop-color': 'rgba(0,0,0,0)' }));
    defs.appendChild(grad);
    this.radarSvg.appendChild(defs);

    this.backgroundGroup = svg('g');
    this.routeGroup = svg('g');
    this.runwayGroup = svg('g');
    this.fixGroup = svg('g');
    this.trailGroup = svg('g');
    this.radarSvg.appendChild(this.backgroundGroup);
    this.radarSvg.appendChild(this.routeGroup);
    this.radarSvg.appendChild(this.runwayGroup);
    this.radarSvg.appendChild(this.fixGroup);
    this.radarSvg.appendChild(this.trailGroup);
  }

  setAirport(airport) {
    if (!airport || this.airportId === airport.id) return;
    this.airportId = airport.id;
    this.ensureRadarShell();
    const center = this.size / 2;
    const radius = this.size * 0.39;

    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: radius + 26, fill: 'rgba(10,20,28,0.88)', stroke: 'rgba(113,226,192,0.12)', 'stroke-width': 2 }));
    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: radius, fill: 'url(#radarGlow)', stroke: 'rgba(114,255,191,0.32)', 'stroke-width': 2 }));

    [0.25, 0.5, 0.75, 1].forEach((step) => {
      this.backgroundGroup.appendChild(svg('circle', {
        cx: center,
        cy: center,
        r: radius * step,
        fill: 'none',
        stroke: 'rgba(95,231,169,0.16)',
        'stroke-dasharray': step < 1 ? '12 10' : '0',
        'stroke-width': step === 1 ? 2 : 1.2
      }));
    });

    this.backgroundGroup.appendChild(svg('line', { x1: center, y1: center - radius, x2: center, y2: center + radius, stroke: 'rgba(95,231,169,0.12)', 'stroke-width': 1 }));
    this.backgroundGroup.appendChild(svg('line', { x1: center - radius, y1: center, x2: center + radius, y2: center, stroke: 'rgba(95,231,169,0.12)', 'stroke-width': 1 }));

    [['N', center, center - radius - 16], ['E', center + radius + 10, center], ['S', center, center + radius + 24], ['W', center - radius - 18, center]].forEach(([label, x, y]) => {
      const text = svg('text', { x, y, fill: '#88f0bf', 'font-size': 24, 'font-family': 'monospace', 'text-anchor': 'middle' });
      text.textContent = label;
      this.backgroundGroup.appendChild(text);
    });

    airport.fixes.forEach((fix) => {
      const p = polarToCanvas(fix.bearing, fix.distanceNm, airport.tmaRadiusNm, this.size);
      this.fixGroup.appendChild(svg('circle', { cx: p.x, cy: p.y, r: 5.5, fill: fix.type === 'arrival' ? '#5ef5d0' : '#8ab8ff' }));
      const txt = svg('text', { x: p.x + 12, y: p.y - 8, fill: '#d6eeff', 'font-size': 22, 'font-family': 'monospace' });
      txt.textContent = fix.name;
      this.fixGroup.appendChild(txt);
      this.routeGroup.appendChild(svg('line', {
        x1: center, y1: center, x2: p.x, y2: p.y,
        stroke: fix.type === 'arrival' ? 'rgba(86,255,188,0.16)' : 'rgba(123,171,255,0.16)',
        'stroke-width': 1.4,
        'stroke-dasharray': '8 12'
      }));
    });

    airport.runways.forEach((runway, index) => {
      const heading = runway.oppositeHeading;
      const length = 90 + index * 6;
      const rad = ((heading - 90) * Math.PI) / 180;
      const dx = Math.cos(rad) * length;
      const dy = Math.sin(rad) * length;
      const offset = index === 0 ? -10 : 10;
      const orthoRad = ((heading) * Math.PI) / 180;
      const ox = Math.cos(orthoRad) * offset;
      const oy = Math.sin(orthoRad) * offset;
      this.runwayGroup.appendChild(svg('line', {
        x1: center - dx + ox,
        y1: center - dy + oy,
        x2: center + dx + ox,
        y2: center + dy + oy,
        stroke: '#d7e7f6',
        'stroke-width': 6,
        'stroke-linecap': 'round'
      }));
      const label = svg('text', {
        x: center + dx * 0.55 + ox,
        y: center + dy * 0.55 + oy - 8,
        fill: '#eff7ff',
        'font-size': 18,
        'font-family': 'monospace'
      });
      label.textContent = runway.id;
      this.runwayGroup.appendChild(label);
    });
  }

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
  }

  render(airport, flights, language = 'pt') {
    if (!airport) return;
    this.setAirport(airport);
    this.markerLayer.innerHTML = '';
    this.trailGroup.innerHTML = '';

    flights.forEach((flight) => {
      flight.trail?.forEach((point, index) => {
        const p = polarToCanvas(point.bearing, point.distanceNm, airport.tmaRadiusNm, this.size);
        this.trailGroup.appendChild(svg('circle', {
          cx: p.x,
          cy: p.y,
          r: Math.max(1.2, index / 4),
          fill: 'rgba(132, 243, 204, 0.18)'
        }));
      });

      const point = polarToCanvas(flight.bearing, flight.distanceNm, airport.tmaRadiusNm, this.size);
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `aircraft-marker ${flight.colorState || 'stable'} ${this.selectedFlightId === flight.id ? 'selected' : ''}`;
      marker.style.left = `${(point.x / this.size) * 100}%`;
      marker.style.top = `${(point.y / this.size) * 100}%`;
      marker.innerHTML = `
        <span class="aircraft-model" style="transform: rotate(${flight.heading}deg)">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="planeMetal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f7fbff"></stop>
                <stop offset="45%" stop-color="#b8cae0"></stop>
                <stop offset="100%" stop-color="#6d819b"></stop>
              </linearGradient>
            </defs>
            <path fill="url(#planeMetal)" d="M29 3h6l5 15 13 5v4l-13 3-4 12 9 7v4l-12-3-5 11h-2l-2-11-12 3v-4l9-7-4-12-13-3v-4l13-5z"></path>
          </svg>
        </span>
        <span class="aircraft-tag">
          <strong>${flight.callsign}</strong>
          <small>${flight.model} · ${Math.round(flight.altitudeFt)}ft · ${Math.round(flight.speedKt)}kt</small>
          <small>${flight.status}</small>
        </span>
      `;
      marker.addEventListener('click', () => this.onSelectFlight?.(flight.id));
      this.markerLayer.appendChild(marker);
    });
  }
}
