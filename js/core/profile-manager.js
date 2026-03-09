import { storage, STORAGE_KEYS } from './storage.js';

export const RANKS = [
  { id: 'cadet', name: 'Cadete Global', minXp: 0, badge: 'C1', maxActiveBonus: 0, salaryMultiplier: 1 },
  { id: 'controller', name: 'Oficial de Torre', minXp: 950, badge: 'T2', maxActiveBonus: 1, salaryMultiplier: 1.12 },
  { id: 'director', name: 'Diretor de Fluxo', minXp: 2600, badge: 'D3', maxActiveBonus: 2, salaryMultiplier: 1.26 },
  { id: 'chief', name: 'Chief Network', minXp: 5200, badge: 'N4', maxActiveBonus: 3, salaryMultiplier: 1.42 }
];

const DEFAULT_PROFILE = {
  pilotName: 'Comandante Atlas',
  xp: 0,
  credits: 1800,
  sessions: 0,
  bestScore: 0,
  totalLandings: 0,
  activePackages: ['core'],
  favoriteScenarioId: 'core_atlantic_window',
  settings: {
    sfx: true,
    reducedMotion: false
  }
};

const rankOrder = RANKS.reduce((accumulator, rank, index) => {
  accumulator[rank.id] = index;
  return accumulator;
}, {});

const unique = (values = []) => [...new Set((values || []).filter(Boolean))];

export const getRankById = (rankId) => RANKS.find((rank) => rank.id === rankId) || RANKS[0];

export const getRankForXp = (xp = 0) =>
  [...RANKS].reverse().find((rank) => xp >= rank.minXp) || RANKS[0];

export const getRankProgress = (profile) => {
  const currentRank = getRankForXp(profile.xp);
  const currentIndex = RANKS.findIndex((rank) => rank.id === currentRank.id);
  const nextRank = RANKS[currentIndex + 1] || null;
  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progress: 1
    };
  }
  const segment = nextRank.minXp - currentRank.minXp;
  const progress = segment <= 0 ? 1 : Math.min(1, Math.max(0, (profile.xp - currentRank.minXp) / segment));
  return { currentRank, nextRank, progress };
};

export const normalizeProfile = (rawProfile = {}) => {
  const merged = {
    ...DEFAULT_PROFILE,
    ...rawProfile,
    settings: {
      ...DEFAULT_PROFILE.settings,
      ...(rawProfile.settings || {})
    }
  };

  merged.activePackages = unique(['core', ...(merged.activePackages || [])]);
  const rank = getRankForXp(merged.xp);
  merged.rankId = rank.id;
  merged.rankLabel = rank.name;
  return merged;
};

export const loadProfile = () => normalizeProfile(storage.get(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE));

export const saveProfile = (profile) => {
  const cleanProfile = normalizeProfile(profile);
  storage.set(STORAGE_KEYS.PROFILE, cleanProfile);
  return cleanProfile;
};

export const resetProfile = () => saveProfile(DEFAULT_PROFILE);

export const isRankUnlocked = (requiredRankId = 'cadet', profile) => {
  const currentRank = getRankForXp(profile.xp);
  return rankOrder[currentRank.id] >= (rankOrder[requiredRankId] ?? 0);
};

export const togglePackageForProfile = (profile, packageId, shouldEnable) => {
  const nextPackages = new Set(profile.activePackages || []);
  if (shouldEnable) {
    nextPackages.add(packageId);
  } else if (packageId !== 'core') {
    nextPackages.delete(packageId);
  }
  return saveProfile({
    ...profile,
    activePackages: [...nextPackages]
  });
};

export const applySessionResult = (profile, result) => {
  const rank = getRankForXp(profile.xp);
  const salaryMultiplier = rank.salaryMultiplier || 1;
  const xpGain = Math.max(0, Math.round(result.score * 0.34 + result.landings * 28 + result.calm * 2));
  const creditGain = Math.max(0, Math.round((result.score * 0.46 + result.landings * 9) * salaryMultiplier));
  return saveProfile({
    ...profile,
    xp: profile.xp + xpGain,
    credits: profile.credits + creditGain,
    sessions: profile.sessions + 1,
    bestScore: Math.max(profile.bestScore || 0, result.score),
    totalLandings: (profile.totalLandings || 0) + result.landings
  });
};

export const packageUnlockedForProfile = (pkg, profile) => isRankUnlocked(pkg.unlockRank || 'cadet', profile);