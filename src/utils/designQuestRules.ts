/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DesignStageId = 'ask' | 'research' | 'brainstorm' | 'prototype' | 'present';

export interface StageInfo {
  id: DesignStageId;
  index: number;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  themeColor: string; // for UI gradients/borders
  accentColor: string;
  icon: string;
  objective: string;
  keyQuestion: string;
}

export interface ChallengeItem {
  id: string;
  type: 'multiple-choice' | 'classify-items' | 'order-steps' | 'scenario-decision';
  prompt: string;
  hint?: string;
  explanation: string;
  options?: { id: string; label: string; isCorrect?: boolean; feedback?: string }[];
  categories?: { id: string; label: string }[];
  draggableItems?: { id: string; text: string; correctCategoryId?: string; correctOrder?: number }[];
  scenario?: {
    context: string;
    choices: {
      id: string;
      text: string;
      points: number;
      feedback: string;
      isBest: boolean;
    }[];
  };
}

export interface LevelData {
  id: string;
  stageId: DesignStageId;
  worldNumber: number;
  levelNumber: number;
  code: string; // e.g. "1-1"
  title: string;
  subtitle: string;
  description: string;
  conceptTeaser: string;
  challenges: ChallengeItem[];
  reflectionPrompt: string;
  starThresholds: {
    oneStar: number; // e.g. 50
    twoStars: number; // e.g. 75
    threeStars: number; // e.g. 95
  };
}

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  stars: number; // 0, 1, 2, or 3
  score: number; // percentage 0-100
  attempts: number;
  completedAt?: string;
  reflectionAnswer?: string;
}

export interface StudentProfile {
  name: string;
  teacherEmail: string;
  projectTopic: string;
  projectSummary?: {
    problemStatement?: string;
    researchSummary?: string;
    brainstormTopIdeas?: string;
    prototypeTestNotes?: string;
    finalPitchStatement?: string;
  };
  soundEnabled: boolean;
  avatar: string;
}

export type ArcadeGameId = 'space_invaders' | 'dig_dug' | 'tetris' | 'outrun' | 'archery';

export interface ArcadeGameInfo {
  id: ArcadeGameId;
  stageId: DesignStageId;
  stageNumber: number;
  title: string;
  arcadeClassic: string;
  tagline: string;
  themeColor: string;
  accentBg: string;
  instructions: string;
}

export type ArcadeScores = Record<ArcadeGameId, number>;

export const ARCADE_GAMES: Record<ArcadeGameId, ArcadeGameInfo> = {
  space_invaders: {
    id: 'space_invaders',
    stageId: 'ask',
    stageNumber: 1,
    title: 'Problem Invaders',
    arcadeClassic: 'Space Invaders / Galaga',
    tagline: 'Shoot varied alien fleets & shootable bombs! Maintain >70% accuracy, dodge divebombers, and ace Challenge Rounds every 3rd wave.',
    themeColor: '#f59e0b',
    accentBg: 'from-amber-600 to-orange-700',
    instructions: 'Steer with [Left] / [Right] and blast with [Space]. Shoot dropped bombs to detonate them in mid-air! Watch for divebombing ships (2x pts). Maintain >70% accuracy for bonuses, and test your speed in Challenge Stages every 3rd round! 3 Lives.'
  },
  dig_dug: {
    id: 'dig_dug',
    stageId: 'research',
    stageNumber: 2,
    title: 'Insight Excavator',
    arcadeClassic: 'Dig Dug',
    tagline: 'Excavate root vegetables! Dodge 1 chaser monster and random roaming monsters in each round.',
    themeColor: '#3b82f6',
    accentBg: 'from-blue-600 to-indigo-800',
    instructions: 'Use [Arrow Keys] to tunnel and collect root vegetables. 1 monster chases you while others roam in random patterns! Complete rounds to add more roaming monsters. [Space] to pop monsters. 2-Minute Timer • 3 Lives.'
  },
  tetris: {
    id: 'tetris',
    stageId: 'brainstorm',
    stageNumber: 3,
    title: 'Idea Stacker',
    arcadeClassic: 'Tetris',
    tagline: 'Drop, rotate, and combine idea blocks! Features next-piece preview, L-pieces, and speed scaling.',
    themeColor: '#a855f7',
    accentBg: 'from-purple-600 to-fuchsia-800',
    instructions: 'Use [Left] / [Right] to position, [Up] to rotate, and [Down] to drop idea blocks. Watch the Next Piece preview! Completing lines boosts speed by 2%. 3 Lives.'
  },
  outrun: {
    id: 'outrun',
    stageId: 'prototype',
    stageNumber: 4,
    title: 'Rapid Outrun: Maker Raceway',
    arcadeClassic: 'OutRun',
    tagline: 'Steer through highway traffic! Dodge obstacles, collect fuel & stacks of money. Collect 3 fuels for a 20% nitro speed boost!',
    themeColor: '#10b981',
    accentBg: 'from-emerald-600 to-teal-800',
    instructions: 'Steer with [Left] / [Right]. Dodge rival cars & boulders. Collect fuel cans and stacks of money! Grab 3 fuels to charge your booster, then press [SPACE] for a 3-second 20% speed surge. 3 Lives.'
  },
  archery: {
    id: 'archery',
    stageId: 'present',
    stageNumber: 5,
    title: 'Precision Archer: Bullseye Pitch',
    arcadeClassic: 'Archery Bullseye',
    tagline: 'Tune your aiming angle and power meter to sink arrows into the bullseye at variable distances!',
    themeColor: '#f43f5e',
    accentBg: 'from-rose-600 to-red-800',
    instructions: 'Use [Up] / [Down] or [W] / [S] for smooth, precision angle aiming. Time your draw strength and press [SPACE] to release. Hit the bullseye! 3 Lives / Misses.'
  }
};

export const MAX_ARCADE_PLAYS_PER_STAGE = 2; // 1 initial play + 1 additional play before moving on

export function canPlayArcadeGame(
  gameId: ArcadeGameId,
  attempts?: Partial<Record<ArcadeGameId, number>> | null,
  certificateUnlocked: boolean = false
): boolean {
  if (certificateUnlocked) return true;
  if (!attempts || typeof attempts !== 'object') return true;
  const count = attempts[gameId] || 0;
  return count < MAX_ARCADE_PLAYS_PER_STAGE;
}

export function getRemainingArcadePlays(
  gameId: ArcadeGameId,
  attempts?: Partial<Record<ArcadeGameId, number>> | null,
  certificateUnlocked: boolean = false
): number {
  if (certificateUnlocked) return Infinity;
  if (!attempts || typeof attempts !== 'object') return MAX_ARCADE_PLAYS_PER_STAGE;
  const count = attempts[gameId] || 0;
  return Math.max(0, MAX_ARCADE_PLAYS_PER_STAGE - count);
}

export function calculateTotalArcadeScore(scores?: Partial<ArcadeScores> | null): number {
  if (!scores || typeof scores !== 'object') return 0;
  return Object.values(scores).reduce((sum, val) => sum + (val || 0), 0);
}

export function getArcadeGameForStage(stageId: DesignStageId): ArcadeGameInfo {
  const match = Object.values(ARCADE_GAMES).find(g => g.stageId === stageId);
  return match || ARCADE_GAMES.space_invaders;
}

export function isStageFullyCompleted(
  stageId: DesignStageId,
  levels: LevelData[],
  progress?: Record<string, LevelProgress> | null
): boolean {
  if (!levels || !levels.length) return false;
  const safeProgress = progress && typeof progress === 'object' ? progress : {};
  const stageLevels = levels.filter(l => l.stageId === stageId);
  return stageLevels.length > 0 && stageLevels.every(l => {
    const p = safeProgress[l.id];
    return p && p.completed && (p.stars || 0) >= 1;
  });
}

/**
 * Calculates shooting accuracy percentage (0-100%).
 */
export function calculateInvaderAccuracy(shotsFired: number, shotsHit: number): number {
  if (shotsFired <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((shotsHit / shotsFired) * 100)));
}

/**
 * Calculates accuracy bonus for Problem Invaders.
 * If accuracy >= 70%, awards substantial bonus scaling with accuracy and wave number.
 */
export function getInvaderAccuracyBonus(accuracy: number, wave: number = 1): number {
  if (accuracy < 70) return 0;
  const waveMultiplier = 1 + (Math.max(1, wave) - 1) * 0.15;
  const baseBonus = 500;
  const accuracyExcess = accuracy - 70; // 0 to 30
  return Math.round((baseBonus + accuracyExcess * 25) * waveMultiplier);
}

/**
 * Determines whether a given wave is a special Challenge Round (every 3rd level: 3, 6, 9...).
 */
export function isChallengeRound(wave: number): boolean {
  return wave > 0 && wave % 3 === 0;
}

/**
 * Evaluates performance in a Challenge Round and awards score bonus.
 */
export function getChallengeStageBonus(targetsHit: number, totalTargets: number): { points: number; label: string } {
  if (totalTargets <= 0 || targetsHit <= 0) {
    return { points: 0, label: 'Challenge Incomplete' };
  }
  const ratio = targetsHit / totalTargets;
  if (ratio >= 1.0) {
    return { points: 2500, label: '⭐ PERFECT 100% CHALLENGE CLEAR! ⭐' };
  }
  if (ratio >= 0.8) {
    return { points: 1500, label: '🎯 EXCELLENT SPEED & ACCURACY!' };
  }
  if (ratio >= 0.6) {
    return { points: 800, label: '⚡ GREAT SHOOTING!' };
  }
  return { points: 400, label: 'CHALLENGE CLEARED!' };
}

export interface InvaderRowConfig {
  type: 'mothership' | 'crab' | 'stinger' | 'bomber' | 'interceptor' | 'quantum' | 'plasma_titan' | 'phantom_raider' | 'comet_striker' | 'phoenix' | 'aero_dart' | 'solar_orb';
  name: string;
  points: number;
  color: string;
  accentColor: string;
  canBomb: boolean;
  canDivebomb: boolean;
}

/**
 * Returns distinct ship configs and visual palettes per row for a given wave.
 */
export function getWaveShipConfigs(wave: number): { row0: InvaderRowConfig; row1: InvaderRowConfig; row2: InvaderRowConfig } {
  if (isChallengeRound(wave)) {
    // Challenge stage: acrobatic swift targets
    return {
      row0: {
        type: 'phoenix',
        name: 'Golden Phoenix Drone',
        points: 250,
        color: '#f59e0b',
        accentColor: '#fef08a',
        canBomb: false,
        canDivebomb: true
      },
      row1: {
        type: 'aero_dart',
        name: 'Aero Dart Fighter',
        points: 200,
        color: '#06b6d4',
        accentColor: '#67e8f9',
        canBomb: false,
        canDivebomb: true
      },
      row2: {
        type: 'solar_orb',
        name: 'Solar Energy Core',
        points: 150,
        color: '#ec4899',
        accentColor: '#f472b6',
        canBomb: false,
        canDivebomb: true
      }
    };
  }

  // Regular combat waves: cycle and evolve enemy varieties
  const tier = Math.floor((wave - 1) / 3) % 3;
  const waveInTier = (wave - 1) % 3; // 0 or 1 (since 2 is challenge round)

  if (tier === 0) {
    if (waveInTier === 0) {
      // Wave 1: Classic Fleet
      return {
        row0: { type: 'mothership', name: 'Command Cruiser', points: 200, color: '#ec4899', accentColor: '#facc15', canBomb: true, canDivebomb: true },
        row1: { type: 'crab', name: 'Alien Crab Scout', points: 150, color: '#06b6d4', accentColor: '#ef4444', canBomb: false, canDivebomb: true },
        row2: { type: 'stinger', name: 'Stinger Fighter', points: 100, color: '#10b981', accentColor: '#fbbf24', canBomb: false, canDivebomb: true }
      };
    } else {
      // Wave 2: Heavy Bomber & Interceptor Fleet
      return {
        row0: { type: 'bomber', name: 'Heavy Dreadnought Bomber', points: 260, color: '#ea580c', accentColor: '#fbbf24', canBomb: true, canDivebomb: true },
        row1: { type: 'interceptor', name: 'Stealth Interceptor', points: 180, color: '#8b5cf6', accentColor: '#38bdf8', canBomb: true, canDivebomb: true },
        row2: { type: 'quantum', name: 'Quantum Swarmer', points: 120, color: '#eab308', accentColor: '#84cc16', canBomb: false, canDivebomb: true }
      };
    }
  } else if (tier === 1) {
    if (waveInTier === 0) {
      // Wave 4: Plasma Titans & Phantom Raiders
      return {
        row0: { type: 'plasma_titan', name: 'Plasma Titan', points: 320, color: '#dc2626', accentColor: '#f87171', canBomb: true, canDivebomb: true },
        row1: { type: 'phantom_raider', name: 'Phantom Raider', points: 220, color: '#0284c7', accentColor: '#a855f7', canBomb: true, canDivebomb: true },
        row2: { type: 'comet_striker', name: 'Comet Striker', points: 160, color: '#f8fafc', accentColor: '#38bdf8', canBomb: false, canDivebomb: true }
      };
    } else {
      // Wave 5: Apex Fleet
      return {
        row0: { type: 'bomber', name: 'Orbital Bombard Ship', points: 360, color: '#f97316', accentColor: '#fde047', canBomb: true, canDivebomb: true },
        row1: { type: 'interceptor', name: 'Void Stalker', points: 260, color: '#a855f7', accentColor: '#f43f5e', canBomb: true, canDivebomb: true },
        row2: { type: 'quantum', name: 'Pulse Dart', points: 180, color: '#14b8a6', accentColor: '#facc15', canBomb: false, canDivebomb: true }
      };
    }
  } else {
    // Tier 2+ (Wave 7+): Elite Dreadnought Swarm
    return {
      row0: { type: 'plasma_titan', name: 'Apex Mothership', points: 400, color: '#e11d48', accentColor: '#facc15', canBomb: true, canDivebomb: true },
      row1: { type: 'phantom_raider', name: 'Nova Vanguard', points: 300, color: '#6366f1', accentColor: '#22d3ee', canBomb: true, canDivebomb: true },
      row2: { type: 'comet_striker', name: 'Solar Interceptor', points: 200, color: '#f59e0b', accentColor: '#ec4899', canBomb: true, canDivebomb: true }
    };
  }
}

export interface Badge {
  id: string;
  title: string;
  stageId?: DesignStageId;
  description: string;
  icon: string;
  conditionDescription: string;
}

export const STAGES: Record<DesignStageId, StageInfo> = {
  ask: {
    id: 'ask',
    index: 1,
    name: '1. Ask & Identify the Problem',
    shortName: 'Ask',
    tagline: 'Spot the real need, define criteria & constraints',
    color: 'from-amber-400 to-orange-500',
    themeColor: '#f59e0b',
    accentColor: 'bg-amber-500',
    icon: 'Search',
    objective: 'Frame a meaningful problem without jumping straight to solutions.',
    keyQuestion: 'What is the actual problem, who has it, and what limits our design?'
  },
  research: {
    id: 'research',
    index: 2,
    name: '2. Research the Problem',
    shortName: 'Research',
    tagline: 'Investigate users, study nature, uncover real facts',
    color: 'from-blue-400 to-indigo-600',
    themeColor: '#3b82f6',
    accentColor: 'bg-blue-600',
    icon: 'Compass',
    objective: 'Gather genuine data, test assumptions, and learn from prior art.',
    keyQuestion: 'What already exists, why did past attempts fail, and what does the science say?'
  },
  brainstorm: {
    id: 'brainstorm',
    index: 3,
    name: '3. Brainstorm Solutions',
    shortName: 'Brainstorm',
    tagline: 'Go for wild volume, combine ideas, defer judgment',
    color: 'from-purple-400 to-pink-500',
    themeColor: '#a855f7',
    accentColor: 'bg-purple-600',
    icon: 'Lightbulb',
    objective: 'Generate dozens of wild possibilities before filtering down.',
    keyQuestion: 'How many different, unexpected ways could we solve this constraint?'
  },
  prototype: {
    id: 'prototype',
    index: 4,
    name: '4. Prototype & Test Ideas',
    shortName: 'Prototype',
    tagline: 'Build quick, fail early, test honestly, and iterate',
    color: 'from-emerald-400 to-teal-600',
    themeColor: '#10b981',
    accentColor: 'bg-emerald-600',
    icon: 'Hammer',
    objective: 'Create physical or digital mockups to test specific hypotheses.',
    keyQuestion: 'What is the fastest way to test if our assumptions hold up?'
  },
  present: {
    id: 'present',
    index: 5,
    name: '5. Present & Communicate',
    shortName: 'Present',
    tagline: 'Hook your audience, defend your tradeoffs, take feedback',
    color: 'from-rose-400 to-red-500',
    themeColor: '#f43f5e',
    accentColor: 'bg-rose-600',
    icon: 'Award',
    objective: 'Clearly communicate the story, the data, the prototype, and the impact.',
    keyQuestion: 'Can someone unfamiliar with your work understand why your solution matters?'
  }
};

export const BADGES: Badge[] = [
  {
    id: 'first_launch',
    title: 'First Flight',
    description: 'Completed your very first design process mission!',
    icon: 'Rocket',
    conditionDescription: 'Earn 1+ stars on any level'
  },
  {
    id: 'ask_master',
    stageId: 'ask',
    title: 'Problem Detective',
    description: 'Mastered criteria, constraints, and root-cause analysis.',
    icon: 'Search',
    conditionDescription: 'Earn at least 7 stars across World 1 (Ask)'
  },
  {
    id: 'research_scout',
    stageId: 'research',
    title: 'Insight Hunter',
    description: 'Separated fact from assumption and unlocked biomimicry inspiration.',
    icon: 'Compass',
    conditionDescription: 'Earn at least 7 stars across World 2 (Research)'
  },
  {
    id: 'wild_ideator',
    stageId: 'brainstorm',
    title: 'Idea Cyclone',
    description: 'Pushed past obvious answers to discover breakthrough solutions.',
    icon: 'Sparkles',
    conditionDescription: 'Earn at least 7 stars across World 3 (Brainstorm)'
  },
  {
    id: 'rapid_maker',
    stageId: 'prototype',
    title: 'Master Prototyper',
    description: 'Built, tested, and iterated fearlessly from failure.',
    icon: 'Wrench',
    conditionDescription: 'Earn at least 7 stars across World 4 (Prototype)'
  },
  {
    id: 'lead_pitcher',
    stageId: 'present',
    title: 'Keynote Champion',
    description: 'Delivered an articulate pitch with evidence and empathy.',
    icon: 'Megaphone',
    conditionDescription: 'Earn at least 7 stars across World 5 (Present)'
  },
  {
    id: 'design_legend',
    title: 'Certified Design Thinker',
    description: 'Reached the grand goal across all 5 engineering stages!',
    icon: 'Crown',
    conditionDescription: 'Earn 38+ total stars to unlock official certification'
  }
];

export const MIN_STARS_FOR_CERTIFICATE = 38;

/**
 * Calculates Angry Birds star rating (0 to 3) based on percentage score and thresholds.
 */
export function calculateStars(
  score: number,
  thresholds: { oneStar: number; twoStars: number; threeStars: number } = {
    oneStar: 50,
    twoStars: 75,
    threeStars: 90
  }
): number {
  if (score >= thresholds.threeStars) return 3;
  if (score >= thresholds.twoStars) return 2;
  if (score >= thresholds.oneStar) return 1;
  return 0;
}

/**
 * Determines whether a given level is unlocked based on preceding progress.
 * Angry Birds style rules:
 * - Level 1-1 is always unlocked.
 * - Any subsequent level within the world is unlocked once the immediate prior level has >= 1 star.
 * - The first level of World N (N > 1) is unlocked when at least 2 levels of World N-1 have been completed (>= 1 star).
 */
export function isLevelUnlocked(
  levelId: string,
  progress?: Record<string, LevelProgress> | null,
  allLevels: LevelData[] = []
): boolean {
  const safeProgress = progress && typeof progress === 'object' ? progress : {};
  const index = allLevels.findIndex(lvl => lvl.id === levelId);
  if (index === -1) return false;
  if (index === 0) return true; // first level always unlocked

  const currentLevel = allLevels[index];
  const priorLevel = allLevels[index - 1];

  // If in the same world, need previous level completed (>= 1 star)
  if (currentLevel.worldNumber === priorLevel.worldNumber) {
    const priorProg = safeProgress[priorLevel.id];
    return Boolean(priorProg && priorProg.completed && priorProg.stars >= 1);
  }

  // If first level of a new world, check that at least 2 levels of previous world have stars
  const prevWorldLevels = allLevels.filter(lvl => lvl.worldNumber === currentLevel.worldNumber - 1);
  const completedInPrevWorld = prevWorldLevels.filter(
    lvl => safeProgress[lvl.id] && safeProgress[lvl.id].completed && safeProgress[lvl.id].stars >= 1
  );
  return completedInPrevWorld.length >= 2;
}

/**
 * Calculate total stars collected across all levels.
 */
export function calculateTotalStars(progress?: Record<string, LevelProgress> | null): number {
  if (!progress || typeof progress !== 'object') return 0;
  return Object.values(progress).reduce((acc, p) => acc + (p?.stars || 0), 0);
}

/**
 * Calculate total completed levels count.
 */
export function countCompletedLevels(progress?: Record<string, LevelProgress> | null): number {
  if (!progress || typeof progress !== 'object') return 0;
  return Object.values(progress).filter(p => p && p.completed && (p.stars || 0) >= 1).length;
}

/**
 * Check if the student has reached the goal to earn the official Certificate of Achievement.
 */
export function isGoalReached(
  progress?: Record<string, LevelProgress> | null,
  allLevels: LevelData[] = [],
  minStars: number = MIN_STARS_FOR_CERTIFICATE
): boolean {
  const safeProgress = progress && typeof progress === 'object' ? progress : {};
  const totalStars = calculateTotalStars(safeProgress);
  // Reached if minimum stars met OR at least 8 levels completed with at least 1 star each in all 5 worlds
  if (totalStars >= minStars) return true;
  
  // Or if completed at least one level in every one of the 5 worlds
  const distinctWorldsCompleted = new Set(
    allLevels
      .filter(l => safeProgress[l.id]?.completed && safeProgress[l.id].stars >= 1)
      .map(l => l.worldNumber)
  );
  return distinctWorldsCompleted.size >= 5;
}

/**
 * Compute stage progress (stars earned, max stars, completed count).
 */
export function calculateStageProgress(
  stageId: DesignStageId,
  progress?: Record<string, LevelProgress> | null,
  allLevels: LevelData[] = []
): {
  starsEarned: number;
  maxStars: number;
  completedLevels: number;
  totalLevels: number;
  percentage: number;
} {
  const safeProgress = progress && typeof progress === 'object' ? progress : {};
  const stageLevels = allLevels.filter(lvl => lvl.stageId === stageId);
  const totalLevels = stageLevels.length;
  const maxStars = totalLevels * 3;

  let starsEarned = 0;
  let completedLevels = 0;

  for (const lvl of stageLevels) {
    const p = safeProgress[lvl.id];
    if (p && p.completed) {
      starsEarned += p.stars || 0;
      if (p.stars >= 1) completedLevels += 1;
    }
  }

  const percentage = maxStars > 0 ? Math.round((starsEarned / maxStars) * 100) : 0;

  return {
    starsEarned,
    maxStars,
    completedLevels,
    totalLevels,
    percentage
  };
}

/**
 * Generates an authentic verification certificate serial code.
 */
export function generateCertificateCode(studentName: string, totalStars: number, timestamp: number): string {
  const cleanName = studentName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'STUD';
  const timeHash = Math.abs(Math.sin(timestamp) * 10000).toFixed(0).padStart(4, '7');
  const starPad = totalStars.toString().padStart(2, '0');
  return `DQ-${cleanName}-${starPad}-${timeHash}`;
}

/**
 * Generates the official Google Classroom share link with query parameters.
 */
export function getGoogleClassroomShareUrl(
  appUrl: string,
  certificateCode: string,
  studentName: string,
  totalStars: number
): string {
  const title = encodeURIComponent(
    `Design Process Certificate: ${studentName || 'Student'} (${totalStars} Stars Earned - Code: ${certificateCode})`
  );
  const shareTargetUrl = encodeURIComponent(`${appUrl}?cert=${certificateCode}&student=${encodeURIComponent(studentName)}`);
  return `https://classroom.google.com/share?url=${shareTargetUrl}&title=${title}`;
}

/**
 * Evaluates earned badges based on current progress.
 */
export function getEarnedBadges(progress?: Record<string, LevelProgress> | null, allLevels: LevelData[] = []): Badge[] {
  const safeProgress = progress && typeof progress === 'object' ? progress : {};
  const totalStars = calculateTotalStars(safeProgress);
  const earned: Badge[] = [];

  for (const badge of BADGES) {
    if (badge.id === 'first_launch') {
      if (totalStars >= 1) earned.push(badge);
    } else if (badge.id === 'design_legend') {
      if (isGoalReached(safeProgress, allLevels) && totalStars >= 25) earned.push(badge);
    } else if (badge.stageId) {
      const stageProg = calculateStageProgress(badge.stageId, safeProgress, allLevels);
      if (stageProg.starsEarned >= 7) {
        earned.push(badge);
      }
    }
  }

  return earned;
}

/**
 * Simple audio synth for game feedback using standard Web Audio API.
 */
export function playSynthSound(type: 'slingshot' | 'star' | 'victory' | 'correct' | 'wrong' | 'click') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'star') {
      // Pleasant rising chiming chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.35);
      });
    } else if (type === 'slingshot') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'victory') {
      // Fanfare
      const notes = [440, 554.37, 659.25, 880, 880, 1108.73];
      const times = [0, 0.12, 0.24, 0.36, 0.48, 0.60];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + times[idx];
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    }
  } catch {
    // AudioContext might be restricted until user gesture; ignore gracefully
  }
}
