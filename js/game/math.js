export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const formatClock = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const rest = String(safe % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
};
export const geoToWorld = (lat, lon, width, height) => ({
  x: ((lon + 180) / 360) * width,
  y: ((90 - lat) / 180) * height
});
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
