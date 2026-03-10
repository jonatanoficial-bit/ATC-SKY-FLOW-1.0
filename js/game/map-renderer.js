const SVG_NS = 'http://www.w3.org/2000/svg';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const polarToRadar = (bearingDeg, distanceNm, radiusNm) => {
  const t = clamp(distanceNm / radiusNm, 0, 1);
  const angle = ((bearingDeg - 90) * Math.PI) / 180;
  const radial = 420 * t;
  return {
    x: 500 + Math.cos(angle) * radial,
    y: 500 + Math.sin(angle) * radial
  };
};

const linePoint = (x, y, angleDeg, distance) => {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance
  };
};

export class MapRenderer {
  constructor({ stage, radarSvg, markerLayer, onSelectFlight }) {
    this.stage = stage;
    this.radarSvg = radarSvg;
    this.markerLayer = markerLayer;
    this.onSelectFlight = onSelectFlight;
    this.markerMap = new Map();
    this.selectedFlightId = null;
    this.airport = null;
    this.radiusNm = 60;
  }

  async init() {
    this.radarSvg.innerHTML = '';
  }

  setScenario({ airport }) {
    this.airport = airport;
    this.radiusNm = airport?.tmaRadiusNm || 60;
    this.renderStatic();
  }

  setCatalog() {}

  selectFlight(flightId) {
    this.selectedFlightId = flightId;
    for (const [id, marker] of this.markerMap.entries()) {
      marker.querySelector('.flight-tag')?.classList.toggle('selected', id === flightId);
    }
  }

  renderStatic() {
    this.radarSvg.innerHTML = '';
    if (!this.airport) return;

    const add = (tag, attrs, parent = this.radarSvg) => {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
      parent.appendChild(el);
      return el;
    };

    add('defs');
    add('circle', { cx: 500, cy: 500, r: 446, fill: 'rgba(7,15,28,0.96)', stroke: 'rgba(121,185,255,0.18)', 'stroke-width': 4 });

    for (let i = 1; i <= 5; i += 1) {
      add('circle', {
        cx: 500,
        cy: 500,
        r: 446 * (i / 5),
        fill: 'none',
        stroke: i === 5 ? 'rgba(116,247,214,0.22)' : 'rgba(116,247,214,0.10)',
        'stroke-width': 1.5
      });
    }

    [0, 45, 90, 135].forEach((angle) => {
      const a = linePoint(500, 500, angle, 446);
      const b = linePoint(500, 500, angle + 180, 446);
      add('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'rgba(124,179,255,0.12)', 'stroke-width': 1.5 });
    });

    add('text', { x: 500, y: 52, class: 'radar-label', 'text-anchor': 'middle' }).textContent = 'N';
    add('text', { x: 948, y: 505, class: 'radar-label', 'text-anchor': 'middle' }).textContent = 'E';
    add('text', { x: 500, y: 968, class: 'radar-label', 'text-anchor': 'middle' }).textContent = 'S';
    add('text', { x: 52, y: 505, class: 'radar-label', 'text-anchor': 'middle' }).textContent = 'W';

    const sweepGroup = add('g', { class: 'sweep' });
    add('path', {
      d: 'M500,500 L500,54 A446,446 0 0 1 661,84 Z',
      fill: 'rgba(118,247,214,0.10)'
    }, sweepGroup);

    (this.airport.fixes || []).forEach((fix) => {
      const point = polarToRadar(fix.bearing, fix.distanceNm, this.radiusNm);
      add('circle', { cx: point.x, cy: point.y, r: 4.5, fill: 'rgba(127,197,255,0.75)' });
      add('text', { x: point.x + 9, y: point.y - 10, class: 'fix-label' }).textContent = fix.name;
      add('path', {
        d: `M500,500 L${point.x},${point.y}`,
        class: fix.type === 'arrival' ? 'approach-line' : 'route-line'
      });
    });

    (this.airport.runways || []).forEach((runway) => {
      const half = runway.visualLength || 52;
      const start = linePoint(500, 500, runway.heading + 180, half);
      const end = linePoint(500, 500, runway.heading, half);
      add('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, class: 'runway-line' });
      const labelA = linePoint(500, 500, runway.heading, half + 24);
      const labelB = linePoint(500, 500, runway.heading + 180, half + 24);
      add('text', { x: labelA.x, y: labelA.y, class: 'fix-label', 'text-anchor': 'middle' }).textContent = runway.id.split('/')[0];
      add('text', { x: labelB.x, y: labelB.y, class: 'fix-label', 'text-anchor': 'middle' }).textContent = runway.id.split('/')[1];
    });

    add('circle', { cx: 500, cy: 500, r: 7, class: 'center-dot' });
    add('text', { x: 500, y: 540, class: 'radar-label', 'text-anchor': 'middle' }).textContent = this.airport.icao;
  }

  projectFlight(flight) {
    return polarToRadar(flight.bearing, flight.distanceNm, this.radiusNm);
  }

  render(snapshot) {
    if (!snapshot?.airport) return;
    if (snapshot.airport.id !== this.airport?.id) {
      this.setScenario({ airport: snapshot.airport });
    }

    const liveIds = new Set(snapshot.flights.map((flight) => flight.id));
    snapshot.flights.forEach((flight) => {
      const point = this.projectFlight(flight);
      let marker = this.markerMap.get(flight.id);
      if (!marker) {
        marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'flight-marker';
        marker.innerHTML = `
          <span class="flight-marker-core"></span>
          <span class="flight-tag"><strong></strong><small></small></span>
        `;
        marker.addEventListener('click', () => this.onSelectFlight(flight.id));
        this.markerLayer.appendChild(marker);
        this.markerMap.set(flight.id, marker);
      }

      marker.style.left = `${point.x / 10}%`;
      marker.style.top = `${point.y / 10}%`;
      marker.classList.toggle('warning', !!flight.warning);
      marker.classList.toggle('conflict', !!flight.conflict);
      marker.querySelector('strong').textContent = flight.callsign;
      marker.querySelector('small').textContent = `FL${String(Math.round(flight.altitudeFt / 100)).padStart(3, '0')} • ${Math.round(flight.speedKt)}KT`;
      marker.querySelector('.flight-tag').classList.toggle('selected', flight.id === this.selectedFlightId);
      marker.style.zIndex = flight.conflict ? '4' : flight.warning ? '3' : '2';
    });

    for (const [id, marker] of this.markerMap.entries()) {
      if (!liveIds.has(id)) {
        marker.remove();
        this.markerMap.delete(id);
      }
    }
  }
}
