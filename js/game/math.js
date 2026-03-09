export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (from, to, t) => from + (to - from) * t;
export const approach = (value, target, delta) => {
  if (value < target) return Math.min(target, value + delta);
  if (value > target) return Math.max(target, value - delta);
  return target;
};
export const randomRange = (min, max) => Math.random() * (max - min) + min;

export const weightedPick = (items, weightResolver = () => 1) => {
  const safeItems = items.filter(Boolean);
  if (!safeItems.length) return null;
  const total = safeItems.reduce((sum, item) => sum + Math.max(0.0001, Number(weightResolver(item)) || 0), 0);
  let cursor = Math.random() * total;
  for (const item of safeItems) {
    cursor -= Math.max(0.0001, Number(weightResolver(item)) || 0);
    if (cursor <= 0) {
      return item;
    }
  }
  return safeItems[safeItems.length - 1];
};

export const haversineKm = (a, b) => {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const latA = toRad(a.lat);
  const latB = toRad(b.lat);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(value));
};

export const projectGeoToNorm = ({ lat, lon }) => ({
  x: ((lon + 180 + 360) % 360) / 360,
  y: clamp((90 - lat) / 180, 0.02, 0.98)
});

export const wrapPoint = (point) => ({
  x: ((point.x % 1) + 1) % 1,
  y: point.y
});

export const getWrappedEndpoints = (startPoint, endPoint) => {
  let x0 = startPoint.x;
  let x1 = endPoint.x;
  const deltaX = x1 - x0;
  if (Math.abs(deltaX) > 0.5) {
    if (deltaX > 0) {
      x0 += 1;
    } else {
      x1 += 1;
    }
  }
  return [
    { x: x0, y: startPoint.y },
    { x: x1, y: endPoint.y }
  ];
};

export const buildControlPoint = (startPoint, endPoint, lateralOffset = 0, arcBias = 0) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const mid = {
    x: (startPoint.x + endPoint.x) * 0.5,
    y: (startPoint.y + endPoint.y) * 0.5
  };
  const perpendicular = {
    x: -dy / distance,
    y: dx / distance
  };
  const curvature = clamp(distance * 0.45, 0.025, 0.14) + arcBias;
  return {
    x: mid.x + perpendicular.x * (curvature + lateralOffset * 0.045),
    y: mid.y + perpendicular.y * (curvature + lateralOffset * 0.045)
  };
};

export const bezierPoint = (startPoint, endPoint, controlPoint, t) => {
  const inverseT = 1 - t;
  return {
    x: inverseT * inverseT * startPoint.x + 2 * inverseT * t * controlPoint.x + t * t * endPoint.x,
    y: inverseT * inverseT * startPoint.y + 2 * inverseT * t * controlPoint.y + t * t * endPoint.y
  };
};

export const bezierTangent = (startPoint, endPoint, controlPoint, t) => ({
  x: 2 * (1 - t) * (controlPoint.x - startPoint.x) + 2 * t * (endPoint.x - controlPoint.x),
  y: 2 * (1 - t) * (controlPoint.y - startPoint.y) + 2 * t * (endPoint.y - controlPoint.y)
});

export const wrappedDistance = (pointA, pointB) => {
  const deltaX = Math.abs(pointA.x - pointB.x);
  const safeDx = Math.min(deltaX, 1 - deltaX);
  return Math.hypot(safeDx, pointA.y - pointB.y);
};

export const resolveFlightGeometry = (flight, airportsById) => {
  const origin = airportsById[flight.originId];
  const destination = airportsById[flight.destinationId];
  if (!origin || !destination) {
    return null;
  }
  const [startPoint, endPoint] = getWrappedEndpoints(projectGeoToNorm(origin), projectGeoToNorm(destination));
  const controlPoint = buildControlPoint(startPoint, endPoint, flight.lateralOffset || 0, flight.arcBias || 0);
  const progress = clamp(flight.progress, 0, 1);
  const basePoint = bezierPoint(startPoint, endPoint, controlPoint, progress);
  const tangent = bezierTangent(startPoint, endPoint, controlPoint, progress);

  let point = basePoint;
  if (flight.holdTimer > 0) {
    const orbitRadius = 0.011;
    const orbitAngle = (flight.holdAngle || 0) + (flight.progress * Math.PI * 10);
    point = {
      x: basePoint.x + Math.cos(orbitAngle) * orbitRadius,
      y: basePoint.y + Math.sin(orbitAngle) * orbitRadius
    };
  }

  return {
    point: wrapPoint(point),
    tangent,
    controlPoint,
    startPoint,
    endPoint
  };
};

export const sampleFlightCurve = (flight, airportsById, steps = 28) => {
  const origin = airportsById[flight.originId];
  const destination = airportsById[flight.destinationId];
  if (!origin || !destination) return [];
  const [startPoint, endPoint] = getWrappedEndpoints(projectGeoToNorm(origin), projectGeoToNorm(destination));
  const controlPoint = buildControlPoint(startPoint, endPoint, flight.lateralOffset || 0, flight.arcBias || 0);
  const points = [];
  for (let index = 0; index <= steps; index += 1) {
    points.push(wrapPoint(bezierPoint(startPoint, endPoint, controlPoint, index / steps)));
  }
  return points;
};

export const normToScreen = (point, width, height, padding = 0) => ({
  x: padding + point.x * (width - padding * 2),
  y: padding + point.y * (height - padding * 2)
});

const callsignPrefixes = ['ATC', 'ORB', 'JET', 'SKY', 'AUR', 'NEX', 'GLO'];

export const generateCallsign = () => {
  const prefix = callsignPrefixes[Math.floor(Math.random() * callsignPrefixes.length)];
  return `${prefix} ${Math.floor(randomRange(120, 988))}`;
};

export const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainderSeconds = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainderSeconds}`;
};