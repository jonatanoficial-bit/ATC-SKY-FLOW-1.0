import { storage } from './storage.js';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const CUSTOM_KEY = 'skyflow.customPackages.v1';
const CONFIG_KEY = 'skyflow.globalConfig.v1';

const defaultConfig = {
  defaultPilotName: 'Operador Vale',
  starterCredits: 1800,
  baseSpawnInterval: 5.2,
  baseConflictRadius: 0.062,
  sessionDuration: 180,
  scorePerLanding: 120,
  uiRefreshMs: 220
};

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
  return response.json();
};

export class ContentManager {
  constructor(basePath) {
    this.basePath = basePath;
    this.catalog = null;
    this.builtInPackages = [];
  }

  async loadCatalog() {
    const catalog = await fetchJson(`${this.basePath}/index.json`);
    const loaded = [];
    for (const item of catalog.packages) {
      const manifestPath = `${this.basePath}/${item.manifest.replace(/^\.\//, '')}`;
      const manifest = await fetchJson(manifestPath);
      const packageBase = manifestPath.split('/').slice(0, -1).join('/');
      const datasets = {
        airports: await fetchJson(`${packageBase}/${manifest.datasets.airports.replace(/^\.\//, '')}`),
        routes: await fetchJson(`${packageBase}/${manifest.datasets.routes.replace(/^\.\//, '')}`),
        scenarios: await fetchJson(`${packageBase}/${manifest.datasets.scenarios.replace(/^\.\//, '')}`)
      };
      loaded.push({ ...manifest, datasets, builtIn: true, id: manifest.id || item.id });
    }
    this.catalog = catalog;
    this.builtInPackages = loaded;
    return loaded;
  }

  getCustomPackages() {
    return storage.get(CUSTOM_KEY, []);
  }

  saveCustomPackages(packages) {
    storage.set(CUSTOM_KEY, packages);
    return packages;
  }

  upsertCustomPackage(pkg) {
    const all = this.getCustomPackages().filter((entry) => entry.id !== pkg.id);
    all.push({ ...deepClone(pkg), builtIn: false, type: pkg.type || 'custom' });
    this.saveCustomPackages(all);
    return all;
  }

  removeCustomPackage(packageId) {
    const filtered = this.getCustomPackages().filter((entry) => entry.id !== packageId);
    this.saveCustomPackages(filtered);
    return filtered;
  }

  getConfig() {
    return { ...defaultConfig, ...(storage.get(CONFIG_KEY, {}) || {}) };
  }

  saveConfig(config) {
    storage.set(CONFIG_KEY, config);
    return this.getConfig();
  }

  getAllPackages() {
    return [...this.builtInPackages, ...this.getCustomPackages()];
  }

  resolve(profile) {
    const allPackages = this.getAllPackages();
    const activeIds = new Set(profile.activePackages || ['core']);
    activeIds.add('core');
    const activePackages = allPackages.filter((pkg) => activeIds.has(pkg.id) || pkg.enabledByDefault);
    const airports = [];
    const routes = [];
    const scenarios = [];
    const airportSeen = new Set();

    for (const pkg of activePackages) {
      for (const airport of pkg.datasets.airports || []) {
        if (!airportSeen.has(airport.id)) {
          airportSeen.add(airport.id);
          airports.push({ ...airport, packageId: pkg.id, packageTitle: pkg.title });
        }
      }
    }

    for (const pkg of activePackages) {
      for (const route of pkg.datasets.routes || []) {
        routes.push({ ...route, packageId: pkg.id, packageTitle: pkg.title });
      }
      for (const scenario of pkg.datasets.scenarios || []) {
        scenarios.push({
          ...scenario,
          duration: scenario.duration || this.getConfig().sessionDuration,
          packageId: pkg.id,
          packageTitle: pkg.title
        });
      }
    }

    const packages = allPackages.map((pkg) => ({
      ...pkg,
      stats: {
        airports: pkg.datasets.airports?.length || 0,
        routes: pkg.datasets.routes?.length || 0,
        scenarios: pkg.datasets.scenarios?.length || 0
      }
    }));

    return { airports, routes, scenarios, packages, activePackages, config: this.getConfig() };
  }
}
