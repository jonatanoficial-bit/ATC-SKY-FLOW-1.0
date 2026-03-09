export const STORAGE_KEYS = {
  PROFILE: 'skyflow.profile.v1',
  ADMIN: 'skyflow.admin.v1',
  CUSTOM_PACKAGES: 'skyflow.customPackages.v1',
  GAME_CONFIG: 'skyflow.gameConfig.v1'
};

const memoryStore = new Map();

const canUseLocalStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch (error) {
    return false;
  }
};

const parseJson = (raw, fallbackValue) => {
  if (raw === null || raw === undefined || raw === '') {
    return fallbackValue;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
};

export const storage = {
  get(key, fallbackValue = null) {
    if (canUseLocalStorage()) {
      return parseJson(localStorage.getItem(key), fallbackValue);
    }
    return memoryStore.has(key) ? memoryStore.get(key) : fallbackValue;
  },

  set(key, value) {
    if (canUseLocalStorage()) {
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
    memoryStore.set(key, value);
    return value;
  },

  remove(key) {
    if (canUseLocalStorage()) {
      localStorage.removeItem(key);
      return;
    }
    memoryStore.delete(key);
  },

  update(key, updater, fallbackValue = {}) {
    const previous = this.get(key, fallbackValue);
    const nextValue = typeof updater === 'function' ? updater(previous) : updater;
    return this.set(key, nextValue);
  }
};

export const createDownload = (filename, objectPayload) => {
  const blob = new Blob([JSON.stringify(objectPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo'));
    reader.readAsText(file, 'utf-8');
  });

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao carregar imagem'));
    reader.readAsDataURL(file);
  });