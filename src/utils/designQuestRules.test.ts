/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStars,
  isLevelUnlocked,
  calculateTotalStars,
  isGoalReached,
  calculateStageProgress,
  generateCertificateCode,
  getGoogleClassroomShareUrl,
  getEarnedBadges,
  calculateTotalArcadeScore,
  getArcadeGameForStage,
  canPlayArcadeGame,
  getRemainingArcadePlays,
  isStageFullyCompleted,
  calculateInvaderAccuracy,
  getInvaderAccuracyBonus,
  isChallengeRound,
  getChallengeStageBonus,
  getWaveShipConfigs,
  LevelProgress
} from './designQuestRules';
import { ALL_LEVELS } from '../data/levelsData';

test('calculateStars awards correct 0 to 3 stars based on thresholds', () => {
  const thresholds = { oneStar: 60, twoStars: 80, threeStars: 95 };

  assert.equal(calculateStars(100, thresholds), 3);
  assert.equal(calculateStars(95, thresholds), 3);
  assert.equal(calculateStars(94, thresholds), 2);
  assert.equal(calculateStars(80, thresholds), 2);
  assert.equal(calculateStars(79, thresholds), 1);
  assert.equal(calculateStars(60, thresholds), 1);
  assert.equal(calculateStars(59, thresholds), 0);
  assert.equal(calculateStars(0, thresholds), 0);
});

test('Level 1-1 is always unlocked by default', () => {
  const emptyProgress: Record<string, LevelProgress> = {};
  const unlocked = isLevelUnlocked('lvl-1-1', emptyProgress, ALL_LEVELS);
  assert.equal(unlocked, true);
});

test('Level 1-2 unlocks only when Level 1-1 is completed with at least 1 star', () => {
  const emptyProgress: Record<string, LevelProgress> = {};
  assert.equal(isLevelUnlocked('lvl-1-2', emptyProgress, ALL_LEVELS), false);

  const completedOneStar: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 1, score: 70, attempts: 1 }
  };
  assert.equal(isLevelUnlocked('lvl-1-2', completedOneStar, ALL_LEVELS), true);

  const failedZeroStar: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: false, stars: 0, score: 30, attempts: 1 }
  };
  assert.equal(isLevelUnlocked('lvl-1-2', failedZeroStar, ALL_LEVELS), false);
});

test('World 2 unlocks when at least 2 levels of World 1 are completed with >= 1 star', () => {
  const worldOnePartial: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 3, score: 100, attempts: 1 }
  };
  assert.equal(isLevelUnlocked('lvl-2-1', worldOnePartial, ALL_LEVELS), false);

  const worldOneTwoDone: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 3, score: 100, attempts: 1 },
    'lvl-1-2': { levelId: 'lvl-1-2', completed: true, stars: 2, score: 85, attempts: 1 }
  };
  assert.equal(isLevelUnlocked('lvl-2-1', worldOneTwoDone, ALL_LEVELS), true);
});

test('calculateTotalStars aggregates all stars accurately', () => {
  const progress: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 3, score: 100, attempts: 1 },
    'lvl-1-2': { levelId: 'lvl-1-2', completed: true, stars: 2, score: 85, attempts: 1 },
    'lvl-1-3': { levelId: 'lvl-1-3', completed: true, stars: 1, score: 65, attempts: 1 }
  };
  assert.equal(calculateTotalStars(progress), 6);
});

test('isGoalReached verifies certificate eligibility threshold of 38 stars', () => {
  const lowProgress: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 3, score: 100, attempts: 1 }
  };
  assert.equal(isGoalReached(lowProgress, ALL_LEVELS, 38), false);

  // Create progress meeting 38 stars (13 levels at 3 stars = 39 stars)
  const highProgress: Record<string, LevelProgress> = {};
  for (let i = 0; i < 13; i++) {
    const lvl = ALL_LEVELS[i];
    highProgress[lvl.id] = { levelId: lvl.id, completed: true, stars: 3, score: 100, attempts: 1 };
  }
  assert.equal(calculateTotalStars(highProgress), 39);
  assert.equal(isGoalReached(highProgress, ALL_LEVELS, 38), true);
});

test('calculateStageProgress calculates accurate percentages and stats for a stage', () => {
  const progress: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 3, score: 100, attempts: 1 },
    'lvl-1-2': { levelId: 'lvl-1-2', completed: true, stars: 3, score: 100, attempts: 1 }
  };
  const stats = calculateStageProgress('ask', progress, ALL_LEVELS);
  assert.equal(stats.totalLevels, 3);
  assert.equal(stats.maxStars, 9);
  assert.equal(stats.starsEarned, 6);
  assert.equal(stats.completedLevels, 2);
  assert.equal(stats.percentage, 67);
});

test('generateCertificateCode produces authentic verifiable code containing student initials and stars', () => {
  const code = generateCertificateCode('Nicholas Hanner', 38, 1700000000);
  assert.match(code, /^DQ-NICH-38-\d{4}$/);
});

test('getGoogleClassroomShareUrl constructs valid sharing URL with title and url query parameters', () => {
  const url = getGoogleClassroomShareUrl(
    'https://ais-test.app',
    'DQ-NICH-38-7890',
    'Nicholas Hanner',
    38
  );
  assert.ok(url.startsWith('https://classroom.google.com/share?'));
  assert.ok(url.includes('url='));
  assert.ok(url.includes('title='));
  assert.ok(url.includes('DQ-NICH-38-7890'));
});

test('getEarnedBadges awards First Flight badge on earning first star', () => {
  const progress: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 1, score: 65, attempts: 1 }
  };
  const badges = getEarnedBadges(progress, ALL_LEVELS);
  assert.ok(badges.some(b => b.id === 'first_launch'));
  assert.ok(!badges.some(b => b.id === 'ask_master')); // Needs 7 stars
});

test('calculateTotalArcadeScore accurately sums high scores across retro games', () => {
  const scores = {
    space_invaders: 1200,
    dig_dug: 850,
    tetris: 3400,
    outrun: 2100,
    archery: 950
  };
  assert.equal(calculateTotalArcadeScore(scores), 8500);
});

test('getArcadeGameForStage maps every one of the 5 design stages to its designated retro arcade game', () => {
  assert.equal(getArcadeGameForStage('ask').id, 'space_invaders');
  assert.equal(getArcadeGameForStage('research').id, 'dig_dug');
  assert.equal(getArcadeGameForStage('brainstorm').id, 'tetris');
  assert.equal(getArcadeGameForStage('prototype').id, 'outrun');
  assert.equal(getArcadeGameForStage('present').id, 'archery');
});

test('canPlayArcadeGame restricts to 1 additional play before certificate and unlocks unlimited play after 38 stars', () => {
  const attempts = { space_invaders: 0, dig_dug: 1, tetris: 2 };

  // Attempt 1 allowed
  assert.equal(canPlayArcadeGame('space_invaders', attempts, false), true);
  assert.equal(getRemainingArcadePlays('space_invaders', attempts, false), 2);

  // Attempt 2 (1 additional play) allowed
  assert.equal(canPlayArcadeGame('dig_dug', attempts, false), true);
  assert.equal(getRemainingArcadePlays('dig_dug', attempts, false), 1);

  // Attempt 3 blocked when certificate is NOT unlocked
  assert.equal(canPlayArcadeGame('tetris', attempts, false), false);
  assert.equal(getRemainingArcadePlays('tetris', attempts, false), 0);

  // When certificate is unlocked (38+ stars), unlimited replays are allowed!
  assert.equal(canPlayArcadeGame('tetris', attempts, true), true);
  assert.equal(getRemainingArcadePlays('tetris', attempts, true), Infinity);
});

test('isStageFullyCompleted accurately detects when all levels in a stage have at least 1 star', () => {
  const partialProgress: Record<string, LevelProgress> = {
    'lvl-1-1': { levelId: 'lvl-1-1', completed: true, stars: 2, score: 85, attempts: 1 },
    'lvl-1-2': { levelId: 'lvl-1-2', completed: true, stars: 3, score: 98, attempts: 1 }
    // lvl-1-3 missing
  };
  assert.equal(isStageFullyCompleted('ask', ALL_LEVELS, partialProgress), false);

  const completeProgress: Record<string, LevelProgress> = {
    ...partialProgress,
    'lvl-1-3': { levelId: 'lvl-1-3', completed: true, stars: 1, score: 70, attempts: 1 }
  };
  assert.equal(isStageFullyCompleted('ask', ALL_LEVELS, completeProgress), true);
  assert.equal(isStageFullyCompleted('research', ALL_LEVELS, completeProgress), false);
});

test('calculateInvaderAccuracy computes exact integer percentage and handles edge cases', () => {
  assert.equal(calculateInvaderAccuracy(0, 0), 0);
  assert.equal(calculateInvaderAccuracy(10, 0), 0);
  assert.equal(calculateInvaderAccuracy(10, 7), 70);
  assert.equal(calculateInvaderAccuracy(10, 10), 100);
  assert.equal(calculateInvaderAccuracy(3, 2), 67);
  assert.equal(calculateInvaderAccuracy(10, 15), 100); // capped at 100
});

test('getInvaderAccuracyBonus awards zero below 70% and substantial bonus at or above 70%', () => {
  assert.equal(getInvaderAccuracyBonus(0, 1), 0);
  assert.equal(getInvaderAccuracyBonus(69, 1), 0);
  assert.equal(getInvaderAccuracyBonus(70, 1), 500);
  assert.equal(getInvaderAccuracyBonus(80, 1), 750);
  assert.equal(getInvaderAccuracyBonus(100, 1), 1250);

  // Scales with wave multiplier
  const wave2Bonus = getInvaderAccuracyBonus(70, 2);
  assert.ok(wave2Bonus > 500, `Expected wave 2 bonus > 500, got ${wave2Bonus}`);
});

test('isChallengeRound correctly identifies every 3rd level', () => {
  assert.equal(isChallengeRound(0), false);
  assert.equal(isChallengeRound(1), false);
  assert.equal(isChallengeRound(2), false);
  assert.equal(isChallengeRound(3), true);
  assert.equal(isChallengeRound(4), false);
  assert.equal(isChallengeRound(5), false);
  assert.equal(isChallengeRound(6), true);
  assert.equal(isChallengeRound(9), true);
});

test('getChallengeStageBonus awards tiered bonuses based on targets hit', () => {
  assert.equal(getChallengeStageBonus(0, 18).points, 0);
  assert.equal(getChallengeStageBonus(18, 18).points, 2500);
  assert.ok(getChallengeStageBonus(18, 18).label.includes('PERFECT'));
  assert.equal(getChallengeStageBonus(15, 18).points, 1500);
  assert.equal(getChallengeStageBonus(11, 18).points, 800);
  assert.equal(getChallengeStageBonus(6, 18).points, 400);
});

test('getWaveShipConfigs provides distinct ships across regular and challenge waves', () => {
  const wave1 = getWaveShipConfigs(1);
  assert.equal(wave1.row0.type, 'mothership');
  assert.equal(wave1.row1.type, 'crab');
  assert.equal(wave1.row2.type, 'stinger');
  assert.equal(wave1.row0.canBomb, true);

  const wave2 = getWaveShipConfigs(2);
  assert.equal(wave2.row0.type, 'bomber');
  assert.equal(wave2.row1.type, 'interceptor');
  assert.equal(wave2.row2.type, 'quantum');
  assert.equal(wave2.row0.canBomb, true);
  assert.ok(wave2.row0.points > wave1.row0.points);

  const wave3 = getWaveShipConfigs(3); // Challenge round!
  assert.equal(wave3.row0.type, 'phoenix');
  assert.equal(wave3.row1.type, 'aero_dart');
  assert.equal(wave3.row2.type, 'solar_orb');
  // In challenge rounds, enemies do not drop bombs
  assert.equal(wave3.row0.canBomb, false);
  assert.equal(wave3.row1.canBomb, false);
});


