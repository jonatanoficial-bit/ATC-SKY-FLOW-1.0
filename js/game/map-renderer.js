const SVG_NS = "http://www.w3.org/2000/svg";

const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
};

const polarToCanvas = (bearing, distanceNm, radiusNm, size = 1000) => {
  const usable = size * 0.39;
  const clampedDistance = Math.max(0, Math.min(radiusNm, distanceNm));
  const r = (clampedDistance / radiusNm) * usable;
  const rad = ((bearing - 90) * Math.PI) / 180;
  return {
    x: size / 2 + Math.cos(rad) * r,
    y: size / 2 + Math.sin(rad) * r
  };
};

const lineFromHeading = (cx, cy, heading, length, lateral = 0) => {
  const rad = ((heading - 90) * Math.PI) / 180;
  const ortho = (heading * Math.PI) / 180;
  const dx = Math.cos(rad) * length;
  const dy = Math.sin(rad) * length;
  const ox = Math.cos(ortho) * lateral;
  const oy = Math.sin(ortho) * lateral;
  return {
    x1: cx - dx + ox,
    y1: cy - dy + oy,
    x2: cx + dx + ox,
    y2: cy + dy + oy
  };
};

const aircraftPath = 'M0,-20 L4,-8 L16,-6 L16,-1 L5,1 L2,16 L8,20 L8,24 L0,20 L-8,24 L-8,20 L-2,16 L-5,1 L-16,-1 L-16,-6 L-4,-8 Z';

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
    this.radarSvg.setAttribute('viewBox', '0 0 1000 1000');
    this.radarSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg('defs');
    const radarGlow = svg('radialGradient', { id: 'radarGlowCore', cx: '50%', cy: '50%', r: '50%' });
    radarGlow.appendChild(svg('stop', { offset: '0%', 'stop-color': '#2ef0b3', 'stop-opacity': '0.18' }));
    radarGlow.appendChild(svg('stop', { offset: '55%', 'stop-color': '#10322b', 'stop-opacity': '0.08' }));
    radarGlow.appendChild(svg('stop', { offset: '100%', 'stop-color': '#02060a', 'stop-opacity': '0' }));
    defs.appendChild(radarGlow);

    const sweep = svg('linearGradient', { id: 'sweepFade', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
    sweep.appendChild(svg('stop', { offset: '0%', 'stop-color': '#7fffd4', 'stop-opacity': '0' }));
    sweep.appendChild(svg('stop', { offset: '72%', 'stop-color': '#7fffd4', 'stop-opacity': '0.04' }));
    sweep.appendChild(svg('stop', { offset: '100%', 'stop-color': '#7fffd4', 'stop-opacity': '0.24' }));
    defs.appendChild(sweep);

    const aircraftGradient = svg('linearGradient', { id: 'planeMetalGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    aircraftGradient.appendChild(svg('stop', { offset: '0%', 'stop-color': '#f7fbff' }));
    aircraftGradient.appendChild(svg('stop', { offset: '48%', 'stop-color': '#c2d3e6' }));
    aircraftGradient.appendChild(svg('stop', { offset: '100%', 'stop-color': '#7287a2' }));
    defs.appendChild(aircraftGradient);

    const glow = svg('filter', { id: 'blipGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' });
    glow.appendChild(svg('feGaussianBlur', { stdDeviation: '4' }));
    defs.appendChild(glow);

    this.radarSvg.appendChild(defs);

    this.backgroundGroup = svg('g');
    this.routeGroup = svg('g');
    this.runwayGroup = svg('g');
    this.fixGroup = svg('g');
    this.sweepGroup = svg('g', { class: 'sweep' });
    this.trailGroup = svg('g');
    this.flightGroup = svg('g');
    this.radarSvg.append(this.backgroundGroup, this.routeGroup, this.runwayGroup, this.fixGroup, this.sweepGroup, this.trailGroup, this.flightGroup);
  }

  setAirport(airport) {
    if (!airport || this.airportId === airport.id) return;
    this.airportId = airport.id;
    this.ensureRadarShell();

    const center = this.size / 2;
    const radius = this.size * 0.39;

    this.backgroundGroup.appendChild(svg('rect', { x: 0, y: 0, width: this.size, height: this.size, fill: '#04101a' }));
    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: radius + 26, fill: '#06121c', 'fill-opacity': '0.98', stroke: '#1f5e56', 'stroke-opacity': '0.34', 'stroke-width': 2 }));
    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: radius, fill: 'url(#radarGlowCore)', stroke: '#8affc0', 'stroke-opacity': '0.28', 'stroke-width': 2 }));

    [0.2, 0.4, 0.6, 0.8, 1].forEach((step) => {
      this.backgroundGroup.appendChild(svg('circle', {
        cx: center,
        cy: center,
        r: radius * step,
        fill: 'none',
        stroke: '#69f1bf',
        'stroke-opacity': step === 1 ? '0.22' : '0.12',
        'stroke-width': step === 1 ? 2 : 1,
        'stroke-dasharray': step < 1 ? '10 12' : undefined
      }));
    });

    for (let deg = 0; deg < 360; deg += 30) {
      const edge = polarToCanvas(deg, airport.tmaRadiusNm, airport.tmaRadiusNm, this.size);
      this.backgroundGroup.appendChild(svg('line', {
        x1: center,
        y1: center,
        x2: edge.x,
        y2: edge.y,
        stroke: '#71e3c0',
        'stroke-opacity': deg % 90 === 0 ? '0.16' : '0.08',
        'stroke-width': deg % 90 === 0 ? 1.2 : 0.8
      }));
    }

    [['N', center, center - radius - 18], ['E', center + radius + 18, center + 6], ['S', center, center + radius + 28], ['W', center - radius - 18, center + 6]].forEach(([label, x, y]) => {
      const text = svg('text', { x, y, fill: '#9af6d0', 'font-size': 22, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'middle' });
      text.textContent = label;
      this.backgroundGroup.appendChild(text);
    });

    const final = airport.preferredConfig?.finalBearing ?? airport.runways?.[0]?.oppositeHeading ?? 0;
    const finalOuter = polarToCanvas(final, airport.tmaRadiusNm, airport.tmaRadiusNm, this.size);
    this.routeGroup.appendChild(svg('line', {
      x1: center,
      y1: center,
      x2: finalOuter.x,
      y2: finalOuter.y,
      stroke: '#7dc9ff',
      'stroke-opacity': '0.34',
      'stroke-width': 2.5,
      'stroke-dasharray': '16 12'
    }));

    (airport.fixes || []).forEach((fix) => {
      const p = polarToCanvas(fix.bearing, fix.distanceNm, airport.tmaRadiusNm, this.size);
      this.fixGroup.appendChild(svg('circle', {
        cx: p.x,
        cy: p.y,
        r: fix.type === 'arrival' ? 5 : 4,
        fill: fix.type === 'arrival' ? '#7bf6d0' : '#8eb9ff',
        'fill-opacity': '0.95'
      }));
      const txt = svg('text', {
        x: p.x + 10,
        y: p.y - 10,
        fill: '#d6eeff',
        'font-size': 18,
        'font-family': 'ui-monospace, monospace'
      });
      txt.textContent = fix.name;
      this.fixGroup.appendChild(txt);
      this.routeGroup.appendChild(svg('line', {
        x1: p.x,
        y1: p.y,
        x2: center,
        y2: center,
        stroke: fix.type === 'arrival' ? '#5ef5d0' : '#8ab8ff',
        'stroke-opacity': '0.12',
        'stroke-width': 1.6,
        'stroke-dasharray': fix.type === 'arrival' ? '10 12' : '4 10'
      }));
    });

    (airport.runways || []).forEach((runway, index) => {
      const line = lineFromHeading(center, center, runway.oppositeHeading, 104 + (index * 8), index === 0 ? -12 : 12);
      this.runwayGroup.appendChild(svg('line', {
        ...line,
        stroke: '#e7f1fb',
        'stroke-opacity': '0.95',
        'stroke-width': 7,
        'stroke-linecap': 'round'
      }));
      this.runwayGroup.appendChild(svg('line', {
        ...line,
        stroke: '#3a4d63',
        'stroke-opacity': '0.5',
        'stroke-width': 1.2,
        'stroke-dasharray': '12 12'
      }));
      const label = svg('text', {
        x: (line.x2 + center) / 2,
        y: (line.y2 + center) / 2 - 8,
        fill: '#ffffff',
        'font-size': 16,
        'font-family': 'ui-monospace, monospace'
      });
      label.textContent = runway.id;
      this.runwayGroup.appendChild(label);
    });

    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: 7, fill: '#e8fbff', 'fill-opacity': '0.98' }));
    this.backgroundGroup.appendChild(svg('circle', { cx: center, cy: center, r: 14, fill: 'none', stroke: '#89d9ff', 'stroke-opacity': '0.3', 'stroke-width': 1.5 }));

    const sweepPath = svg('path', {
      d: `M ${center} ${center} L ${center + radius} ${center - 18} A ${radius} ${radius} 0 0 1 ${center + radius} ${center + 18} Z`,
      fill: 'url(#sweepFade)'
    });
    this.sweepGroup.appendChild(sweepPath);
  }

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
  }

  render(airport, flights) {
    if (!airport) return;
    this.setAirport(airport);
    this.flightGroup.innerHTML = '';
    this.trailGroup.innerHTML = '';
    if (this.markerLayer) this.markerLayer.innerHTML = '';

    flights.forEach((flight) => {
      (flight.trail || []).forEach((point, index) => {
        const p = polarToCanvas(point.bearing, point.distanceNm, airport.tmaRadiusNm, this.size);
        this.trailGroup.appendChild(svg('circle', {
          cx: p.x,
          cy: p.y,
          r: Math.max(1.5, index * 0.45),
          fill: '#8af0cc',
          'fill-opacity': String(Math.max(0.08, 0.22 - index * 0.012))
        }));
      });

      const point = polarToCanvas(flight.bearing, flight.distanceNm, airport.tmaRadiusNm, this.size);
      const group = svg('g', {
        class: `svg-aircraft-marker ${flight.colorState || 'stable'} ${this.selectedFlightId === flight.id ? 'selected' : ''}`,
        transform: `translate(${point.x} ${point.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${flight.callsign} ${flight.model}`
      });
      group.style.cursor = 'pointer';

      const glowColor = flight.colorState === 'conflict' ? '#ff7373' : flight.colorState === 'warning' ? '#f6c64b' : '#61f2b0';
      group.appendChild(svg('circle', { cx: 0, cy: 0, r: 12, fill: glowColor, 'fill-opacity': '0.22', filter: 'url(#blipGlow)' }));
      group.appendChild(svg('circle', { cx: 0, cy: 0, r: 4.8, fill: '#f9fcff', 'fill-opacity': '0.98' }));
      const hit = svg('circle', { cx: 0, cy: 0, r: 28, fill: 'transparent' });
      group.appendChild(hit);
      const select = () => this.onSelectFlight?.(flight.id);
      group.addEventListener('click', select);
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
      this.flightGroup.appendChild(group);

      if (this.markerLayer) {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `aircraft-marker ${flight.colorState || 'stable'} ${this.selectedFlightId === flight.id ? 'selected' : ''}`;
        marker.style.left = `${(point.x / this.size) * 100}%`;
        marker.style.top = `${(point.y / this.size) * 100}%`;
        marker.setAttribute('aria-label', `${flight.callsign} ${flight.model}`);
        marker.innerHTML = `
          <span class="aircraft-model" style="transform: rotate(${Math.round(flight.heading)}deg)">
            <svg viewBox="-18 -18 36 36" aria-hidden="true">
              <path d="${aircraftPath}" fill="url(#planeMetalGradient)"></path>
            </svg>
          </span>
          <span class="aircraft-tag">
            <strong>${flight.callsign} · ${flight.model}</strong>
            <small>${Math.round(flight.altitudeFt)}ft · ${Math.round(flight.speedKt)}kt · ${String(Math.round(flight.heading)).padStart(3, '0')}</small>
          </span>`;
        marker.addEventListener('click', select);
        this.markerLayer.appendChild(marker);
      }
    });
  }
}
