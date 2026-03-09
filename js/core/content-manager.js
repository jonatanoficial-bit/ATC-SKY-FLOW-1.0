import { storage, STORAGE_KEYS } from './storage.js';
import { FALLBACK_CONTENT_INDEX, FALLBACK_PACKAGE_MAP, DEFAULT_GAME_CONFIG } from './fallback-content.js';

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const withStats = (pkg) => ({
  ...pkg,
  origin: pkg.origin || 'built-in',
  datasets: {
    airports: pkg.datasets?.airports || [],
    routes: pkg.datasets?.routes || [],
    scenarios: pkg.datasets?.scenarios || []
  },
  stats: {
    airports: pkg.datasets?.airports?.length || 0,
    routes: pkg.datasets?.routes?.length || 0,
    scenarios: pkg.datasets?.scenarios?.length || 0
  }
});

export class ContentManager {
  constructor(basePath = './content') {
    this.basePath = basePath;
    this.catalog = null;
    this.gameConfig = { ...DEFAULT_GAME_CONFIG };
  }

  async fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${path}`);
    }
    return response.json();
  }

  async loadBuiltInPackage(reference) {
    try {
      const manifestPath = `${this.basePath}/${String(reference.manifest || '').replace(/^\.\//, '')}`;
      const manifest = await this.fetchJson(manifestPath);
      const baseDir = manifestPath.split('/').slice(0, -1).join('/');
      const [airports, routes, scenarios] = await Promise.all([
        this.fetchJson(`${baseDir}/${manifest.entrypoints.airports.replace(/^\.\//, '')}`),
        this.fetchJson(`${baseDir}/${manifest.entrypoints.routes.replace(/^\.\//, '')}`),
        this.fetchJson(`${baseDir}/${manifest.entrypoints.scenarios.replace(/^\.\//, '')}`)
      ]);
      return withStats({
        ...manifest,
        origin: 'built-in',
        datasets: { airports, routes, scenarios }
      });
    } catch (error) {
      return withStats(clone(FALLBACK_PACKAGE_MAP[reference.id]));
    }
  }

  normalizeCustomPackage(pkg) {
    return withStats({
      type: 'dlc',
      version: pkg.version || '1.0.0',
      enabledByDefault: Boolean(pkg.enabledByDefault),
      theme: {
        accent: pkg.theme?.accent || '#72f6d5',
        glow: pkg.theme?.glow || '#6da9ff',
        surface: pkg.theme?.surface || '#0f1830'
      },
      coverAsset: pkg.coverAsset || '',
      coverImage: pkg.coverImage || '',
      unlockRank: pkg.unlockRank || 'cadet',
      subtitle: pkg.subtitle || 'Pacote customizado',
      description: pkg.description || 'Pacote criado localmente pelo painel Admin.',
      ...pkg,
      origin: 'custom',
      datasets: {
        airports: pkg.datasets?.airports || [],
        routes: pkg.datasets?.routes || [],
        scenarios: pkg.datasets?.scenarios || []
      }
    });
  }

  async loadCatalog() {
    let indexData = FALLBACK_CONTENT_INDEX;
    try {
      indexData = await this.fetchJson(`${this.basePath}/index.json`);
    } catch (error) {
      indexData = clone(FALLBACK_CONTENT_INDEX);
    }

    const builtInPackages = await Promise.all((indexData.packages || []).map((reference) => this.loadBuiltInPackage(reference)));
    const customPackages = (storage.get(STORAGE_KEYS.CUSTOM_PACKAGES, []) || []).map((pkg) => this.normalizeCustomPackage(pkg));

    this.gameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...(storage.get(STORAGE_KEYS.GAME_CONFIG, {}) || {})
    };

    this.catalog = {
      indexVersion: indexData.version || '1.0.0',
      builtInPackages,
      customPackages
    };

    return this.catalog;
  }

  getAllPackages() {
    if (!this.catalog) {
      return [];
    }
    return [...this.catalog.builtInPackages, ...this.catalog.customPackages];
  }

  resolve(profile) {
    if (!this.catalog) {
      return {
        packages: [],
        activePackages: [],
        airports: [],
        routes: [],
        scenarios: [],
        airportsById: {}
      };
    }

    const activeIds = new Set(['core', ...(profile.activePackages || [])]);
    const allPackages = this.getAllPackages();
    const activePackages = allPackages.filter((pkg) => pkg.enabledByDefault || activeIds.has(pkg.id));

    const airportsById = {};
    const airports = [];
    const routes = [];
    const scenarios = [];

    activePackages.forEach((pkg) => {
      pkg.datasets.airports.forEach((airport) => {
        const normalizedAirport = { ...airport, packageId: pkg.id };
        airportsById[airport.id] = normalizedAirport;
        airports.push(normalizedAirport);
      });

      pkg.datasets.routes.forEach((route) => {
        routes.push({ ...route, packageId: pkg.id });
      });

      pkg.datasets.scenarios.forEach((scenario) => {
        scenarios.push({
          ...scenario,
          packageId: pkg.id,
          packageTitle: pkg.title,
          theme: pkg.theme
        });
      });
    });

    return {
      packages: allPackages,
      activePackages,
      airports,
      airportsById,
      routes: routes.filter((route) => airportsById[route.from] && airportsById[route.to]),
      scenarios,
      config: { ...this.gameConfig }
    };
  }

  validateCustomPackage(pkg) {
    if (!pkg.id || !pkg.title) {
      throw new Error('Pacote precisa ter id e título.');
    }
    const idFormat = /^[a-z0-9_\-]+$/;
    if (!idFormat.test(pkg.id)) {
      throw new Error('Use apenas letras minúsculas, números, hífen ou underscore no id.');
    }
    ['airports', 'routes', 'scenarios'].forEach((key) => {
      if (!Array.isArray(pkg.datasets?.[key])) {
        throw new Error(`datasets.${key} deve ser um array.`);
      }
    });
    return true;
  }

  saveCustomPackage(pkg) {
    this.validateCustomPackage(pkg);
    const current = storage.get(STORAGE_KEYS.CUSTOM_PACKAGES, []) || [];
    const normalized = this.normalizeCustomPackage(pkg);
    const existingIndex = current.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1, normalized);
    } else {
      current.push(normalized);
    }
    storage.set(STORAGE_KEYS.CUSTOM_PACKAGES, current);
    if (this.catalog) {
      this.catalog.customPackages = current.map((item) => this.normalizeCustomPackage(item));
    }
    return normalized;
  }

  deleteCustomPackage(packageId) {
    const nextPackages = (storage.get(STORAGE_KEYS.CUSTOM_PACKAGES, []) || []).filter((pkg) => pkg.id !== packageId);
    storage.set(STORAGE_KEYS.CUSTOM_PACKAGES, nextPackages);
    if (this.catalog) {
      this.catalog.customPackages = nextPackages.map((item) => this.normalizeCustomPackage(item));
    }
  }

  exportState() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      customPackages: storage.get(STORAGE_KEYS.CUSTOM_PACKAGES, []) || [],
      gameConfig: storage.get(STORAGE_KEYS.GAME_CONFIG, {}) || {}
    };
  }

  importState(payload) {
    if (Array.isArray(payload?.customPackages)) {
      storage.set(STORAGE_KEYS.CUSTOM_PACKAGES, payload.customPackages);
    }
    if (payload?.gameConfig && typeof payload.gameConfig === 'object') {
      storage.set(STORAGE_KEYS.GAME_CONFIG, payload.gameConfig);
    }
  }

  getSampleTemplate() {
    return clone(this.normalizeCustomPackage({
      id: 'custom_global_lane',
      title: 'Custom Global Lane',
      subtitle: 'Modelo inicial',
      description: 'Base para criar uma expansão com aeroportos, rotas e cenários.',
      unlockRank: 'cadet',
      theme: {
        accent: '#72f6d5',
        glow: '#6da9ff',
        surface: '#0f1830'
      },
      datasets: {
        airports: [
          {
            id: 'MVD',
            iata: 'MVD',
            icao: 'SUMU',
            name: 'Carrasco International',
            city: 'Montevidéu',
            country: 'Uruguai',
            lat: -34.8384,
            lon: -56.0308,
            region: 'south-america',
            tier: 'medium',
            traffic: 4,
            hub: true
          }
        ],
        routes: [
          {
            id: 'MVD-GRU',
            from: 'MVD',
            to: 'GRU',
            demand: 4,
            bidirectional: true
          }
        ],
        scenarios: [
          {
            id: 'custom_lane_ops',
            packageId: 'custom_global_lane',
            title: 'Janela Local',
            rankRequired: 'cadet',
            difficulty: 'Custom',
            blurb: 'Exemplo de cenário customizado.',
            spawnInterval: 6.4,
            maxActive: 6,
            targetScore: 780,
            duration: 170,
            conflictRadius: 0.054,
            preferredAirports: ['MVD', 'GRU'],
            weatherCells: []
          }
        ]
      }
    }));
  }
}