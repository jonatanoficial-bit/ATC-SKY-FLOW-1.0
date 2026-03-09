import { storage } from './storage.js';

export const RANKS = [
  { id: 'cadet', name: 'Cadete Global', badge: 'C1', minXp: 0 },
  { id: 'controller', name: 'Oficial de Torre', badge: 'C2', minXp: 800 },
  { id: 'director', name: 'Diretor de Fluxo', badge: 'C3', minXp: 1900 },
  { id: 'chief', name: 'Chief Global', badge: 'C4', minXp: 3600 }
];

const PROFILE_KEY = 'skyflow.profile.v2';

const defaultProfile = () => ({
  pilotName: 'Operador Vale',
  xp: 0,
  credits: 1800,
  sessions: 0,
  totalLandings: 0,
  bestScore: 0,
  favoriteScenarioId: null,
  activePackages: ['core'],
  settings: {
    sfx: true,
    reducedMotion: false
  }
});

export const loadProfile = () => {
  const profile = storage.get(PROFILE_KEY, null);
  return { ...defaultProfile(), ...(profile || {}), settings: { ...defaultProfile().settings, ...(profile?.settings || {}) } };
};

export const saveProfile = (profile) => {
  storage.set(PROFILE_KEY, profile);
  return profile;
};

export const resetProfile = () => {
  const profile = defaultProfile();
  saveProfile(profile);
  return profile;
};

export const getRankProgress = (profile) => {
  let currentRank = RANKS[0];
  let nextRank = null;
  for (let index = 0; index < RANKS.length; index += 1) {
    const rank = RANKS[index];
    if (profile.xp >= rank.minXp) {
      currentRank = rank;
      nextRank = RANKS[index + 1] || null;
    }
  }
  if (!nextRank) return { currentRank, nextRank: null, progress: 1 };
  const range = nextRank.minXp - currentRank.minXp;
  const current = Math.max(0, profile.xp - currentRank.minXp);
  return { currentRank, nextRank, progress: range ? current / range : 1 };
};

export const packageUnlockedForProfile = (pkg, profile) => {
  const requiredId = pkg.unlockRank || 'cadet';
  const currentId = getRankProgress(profile).currentRank.id;
  const rankIndex = (rankId) => Math.max(0, RANKS.findIndex((entry) => entry.id === rankId));
  return rankIndex(currentId) >= rankIndex(requiredId);
};

export const togglePackageForProfile = (profile, packageId, shouldEnable) => {
  const next = new Set(profile.activePackages || ['core']);
  if (packageId === 'core') next.add('core');
  else if (shouldEnable) next.add(packageId);
  else next.delete(packageId);
  const updated = { ...profile, activePackages: [...next] };
  saveProfile(updated);
  return updated;
};

export const applySessionResult = (profile, result) => {
  const xpGain = Math.max(120, Math.round(result.score * 0.35 + result.landings * 18 - result.conflicts * 25));
  const creditsGain = Math.max(140, Math.round(result.score * 0.25 + result.calm * 2));
  const updated = {
    ...profile,
    xp: profile.xp + xpGain,
    credits: profile.credits + creditsGain,
    sessions: profile.sessions + 1,
    totalLandings: (profile.totalLandings || 0) + result.landings,
    bestScore: Math.max(profile.bestScore || 0, result.score)
  };
  saveProfile(updated);
  return updated;
};
