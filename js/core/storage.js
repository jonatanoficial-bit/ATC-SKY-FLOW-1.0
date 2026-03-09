const memory = new Map();

const hasLocalStorage = () => {
  try {
    const key = '__skyflow_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const safeGet = (key) => {
  if (hasLocalStorage()) return window.localStorage.getItem(key);
  return memory.get(key) ?? null;
};

const safeSet = (key, value) => {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return value;
  }
  memory.set(key, value);
  return value;
};

const safeRemove = (key) => {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }
  memory.delete(key);
};

export const storage = {
  get(key, fallback = null) {
    const raw = safeGet(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    return safeSet(key, JSON.stringify(value));
  },
  remove: safeRemove,
  getRaw: safeGet,
  setRaw: safeSet
};
