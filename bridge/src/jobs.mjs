// Presentation only. Source: server/src/server/MapleCarnivalChallenge.java,
// handling/login/LoginInformationProvider.java, and TrixterDemonAvenger.java.
// Do not use job mappings to decide whether a character is eligible.
const jobs = new Map([
  [0, 'Beginner'], [1, 'Beginner'],
  [100, 'Warrior'], [110, 'Fighter'], [111, 'Crusader'], [112, 'Hero'],
  [120, 'Page'], [121, 'White Knight'], [122, 'Paladin'],
  [130, 'Spearman'], [131, 'Dragon Knight'], [132, 'Dark Knight'],
  [200, 'Magician'], [210, 'Wizard (Fire/Poison)'], [211, 'Mage (Fire/Poison)'],
  [212, 'Arch Mage (Fire/Poison)'], [220, 'Wizard (Ice/Lightning)'],
  [221, 'Mage (Ice/Lightning)'], [222, 'Arch Mage (Ice/Lightning)'],
  [230, 'Cleric'], [231, 'Priest'], [232, 'Bishop'],
  [300, 'Archer'], [310, 'Hunter'], [311, 'Ranger'], [312, 'Bowmaster'],
  [320, 'Crossbowman'], [321, 'Sniper'], [322, 'Marksman'],
  [400, 'Rogue'], [410, 'Assassin'], [411, 'Hermit'], [412, 'Night Lord'],
  [420, 'Bandit'], [421, 'Chief Bandit'], [422, 'Shadower'],
  [430, 'Blade Recruit'], [431, 'Blade Acolyte'], [432, 'Blade Specialist'],
  [433, 'Blade Lord'], [434, 'Blade Master'],
  [500, 'Pirate'], [501, 'Pirate (Cannoneer)'], [510, 'Brawler'],
  [511, 'Marauder'], [512, 'Buccaneer'], [520, 'Gunslinger'],
  [521, 'Outlaw'], [522, 'Corsair'], [530, 'Cannoneer'],
  [531, 'Cannon Blaster'], [532, 'Cannon Master'],
  [800, 'Manager'], [900, 'Game Master'], [910, 'Super Game Master'],
  [1000, 'Noblesse'], [2000, 'Legend'], [2001, 'Evan'],
  [2002, 'Mercedes'], [3000, 'Citizen'], [3001, 'Demon Slayer'],
]);

for (const [name, ids] of [
  ['Dawn Warrior', [1100, 1110, 1111, 1112]],
  ['Blaze Wizard', [1200, 1210, 1211, 1212]],
  ['Wind Archer', [1300, 1310, 1311, 1312]],
  ['Night Walker', [1400, 1410, 1411, 1412]],
  ['Thunder Breaker', [1500, 1510, 1511, 1512]],
  ['Aran', [2100, 2110, 2111, 2112]],
  ['Evan', [2200, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218]],
  ['Mercedes', [2300, 2310, 2311, 2312]],
  ['Phantom', [2400, 2410, 2411, 2412]],
  ['Demon Slayer', [3100, 3110, 3111, 3112]],
  ['Battle Mage', [3200, 3210, 3211, 3212]],
  ['Wild Hunter', [3300, 3310, 3311, 3312]],
  ['Mechanic', [3500, 3510, 3511, 3512]],
]) {
  for (const id of ids) jobs.set(id, name);
}

export const DA_CARRIER_JOBS = Object.freeze([100, 120, 121, 122]);

export function resolveJobName(jobId, isDemonAvenger) {
  if (isDemonAvenger && DA_CARRIER_JOBS.includes(jobId)) return 'Demon Avenger';
  return jobs.get(jobId) ?? `Unknown job (${jobId})`;
}
