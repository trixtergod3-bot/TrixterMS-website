export const RANKING_SORT_OPTIONS = [
  { value: "level", label: "Level / Current EXP", scoreLabel: "Current EXP" },
  { value: "fame", label: "Fame", scoreLabel: "Fame" },
  { value: "exp-earned", label: "Lifetime EXP earned", scoreLabel: "EXP earned" },
  { value: "current-mesos", label: "Current Mesos", scoreLabel: "Mesos" },
  { value: "mesos-earned", label: "Lifetime Mesos earned", scoreLabel: "Mesos earned" },
  { value: "current-nx", label: "Current NX", scoreLabel: "NX Credit + Prepaid" },
  { value: "nx-earned", label: "Lifetime NX earned", scoreLabel: "NX earned" },
  { value: "nx-credit-earned", label: "Lifetime NX Credit earned", scoreLabel: "NX Credit earned" },
  { value: "nx-prepaid-earned", label: "Lifetime NX Prepaid earned", scoreLabel: "NX Prepaid earned" },
] as const;

export type RankingSort = typeof RANKING_SORT_OPTIONS[number]["value"];
export const RANKING_SORT_KEYS = new Set<string>(RANKING_SORT_OPTIONS.map((option) => option.value));

export const RANKING_CLASS_OPTIONS = [
  { value: "beginner", label: "Beginner", jobIds: [0, 1] },
  { value: "warrior", label: "Warrior", jobIds: [100] },
  { value: "hero", label: "Hero", jobIds: [110, 111, 112] },
  { value: "paladin", label: "Paladin", jobIds: [120, 121, 122] },
  { value: "dark-knight", label: "Dark Knight", jobIds: [130, 131, 132] },
  { value: "magician", label: "Magician", jobIds: [200] },
  { value: "fire-poison", label: "Fire / Poison", jobIds: [210, 211, 212] },
  { value: "ice-lightning", label: "Ice / Lightning", jobIds: [220, 221, 222] },
  { value: "bishop", label: "Bishop", jobIds: [230, 231, 232] },
  { value: "archer", label: "Archer", jobIds: [300] },
  { value: "bowmaster", label: "Bowmaster", jobIds: [310, 311, 312] },
  { value: "marksman", label: "Marksman", jobIds: [320, 321, 322] },
  { value: "rogue", label: "Rogue", jobIds: [400] },
  { value: "night-lord", label: "Night Lord", jobIds: [410, 411, 412] },
  { value: "shadower", label: "Shadower", jobIds: [420, 421, 422] },
  { value: "dual-blade", label: "Dual Blade", jobIds: [430, 431, 432, 433, 434] },
  { value: "pirate", label: "Pirate", jobIds: [500] },
  { value: "buccaneer", label: "Buccaneer", jobIds: [510, 511, 512] },
  { value: "corsair", label: "Corsair", jobIds: [520, 521, 522] },
  { value: "cannoneer", label: "Cannoneer", jobIds: [501, 530, 531, 532] },
  { value: "noblesse", label: "Noblesse", jobIds: [1000] },
  { value: "dawn-warrior", label: "Dawn Warrior", jobIds: [1100, 1110, 1111, 1112] },
  { value: "blaze-wizard", label: "Blaze Wizard", jobIds: [1200, 1210, 1211, 1212] },
  { value: "wind-archer", label: "Wind Archer", jobIds: [1300, 1310, 1311, 1312] },
  { value: "night-walker", label: "Night Walker", jobIds: [1400, 1410, 1411, 1412] },
  { value: "thunder-breaker", label: "Thunder Breaker", jobIds: [1500, 1510, 1511, 1512] },
  { value: "aran", label: "Aran", jobIds: [2000, 2100, 2110, 2111, 2112] },
  { value: "evan", label: "Evan", jobIds: [2001, 2200, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218] },
  { value: "mercedes", label: "Mercedes", jobIds: [2002, 2300, 2310, 2311, 2312] },
  { value: "phantom", label: "Phantom", jobIds: [2400, 2410, 2411, 2412] },
  { value: "citizen", label: "Citizen", jobIds: [3000] },
  { value: "demon-slayer", label: "Demon Slayer", jobIds: [3001, 3100, 3110, 3111, 3112] },
  { value: "demon-avenger", label: "Demon Avenger", jobIds: [100, 120, 121, 122] },
  { value: "battle-mage", label: "Battle Mage", jobIds: [3200, 3210, 3211, 3212] },
  { value: "wild-hunter", label: "Wild Hunter", jobIds: [3300, 3310, 3311, 3312] },
  { value: "mechanic", label: "Mechanic", jobIds: [3500, 3510, 3511, 3512] },
] as const;

export type RankingClass = typeof RANKING_CLASS_OPTIONS[number]["value"];
export const RANKING_CLASS_KEYS = new Set<string>(RANKING_CLASS_OPTIONS.map((option) => option.value));

export function matchesRankingClass(jobId: number, jobName: string, value: RankingClass) {
  const option = RANKING_CLASS_OPTIONS.find((candidate) => candidate.value === value)!;
  if (!option.jobIds.includes(jobId as never)) return false;
  if (value === "demon-avenger") return jobName === "Demon Avenger";
  if (value === "paladin" || value === "warrior") return jobName !== "Demon Avenger";
  return true;
}

export function rankingSortOption(value: RankingSort) {
  return RANKING_SORT_OPTIONS.find((option) => option.value === value)!;
}
