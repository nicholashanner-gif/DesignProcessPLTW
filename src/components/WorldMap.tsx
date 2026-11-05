/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Lock,
  Star,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Compass,
  Lightbulb,
  Search,
  Hammer,
  Award,
  Sparkles
} from 'lucide-react';
import {
  LevelData,
  LevelProgress,
  STAGES,
  DesignStageId,
  isLevelUnlocked,
  calculateStageProgress,
  MIN_STARS_FOR_CERTIFICATE,
  ArcadeScores,
  ArcadeGameId,
  getArcadeGameForStage
} from '../utils/designQuestRules';
import { Gamepad2, Play } from 'lucide-react';

interface WorldMapProps {
  levels: LevelData[];
  progress: Record<string, LevelProgress>;
  selectedWorld: number | null;
  onSelectWorld: (worldNum: number | null) => void;
  onOpenLevel: (level: LevelData) => void;
  onOpenCertificate: () => void;
  totalStars: number;
  goalReached: boolean;
  arcadeScores: ArcadeScores;
  arcadeAttempts?: Record<ArcadeGameId, number>;
  onOpenArcade: (gameId?: ArcadeGameId) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  levels,
  progress,
  selectedWorld,
  onSelectWorld,
  onOpenLevel,
  onOpenCertificate,
  totalStars,
  goalReached,
  arcadeScores,
  arcadeAttempts = { space_invaders: 0, dig_dug: 0, tetris: 0, outrun: 0, archery: 0 },
  onOpenArcade
}) => {
  // Group levels by world
  const worlds = [
    { num: 1, stageId: 'ask' as DesignStageId, name: 'Problem Peak', icon: Search, bgGrad: 'from-amber-500/10 via-orange-500/10 to-amber-600/10', border: 'border-amber-200' },
    { num: 2, stageId: 'research' as DesignStageId, name: 'Research Rapids', icon: Compass, bgGrad: 'from-blue-500/10 via-cyan-500/10 to-indigo-600/10', border: 'border-blue-200' },
    { num: 3, stageId: 'brainstorm' as DesignStageId, name: 'Brainstorm Bay', icon: Lightbulb, bgGrad: 'from-purple-500/10 via-fuchsia-500/10 to-pink-500/10', border: 'border-purple-200' },
    { num: 4, stageId: 'prototype' as DesignStageId, name: 'Prototype Peninsula', icon: Hammer, bgGrad: 'from-emerald-500/10 via-teal-500/10 to-emerald-600/10', border: 'border-emerald-200' },
    { num: 5, stageId: 'present' as DesignStageId, name: 'Showcase Summit', icon: Award, bgGrad: 'from-rose-500/10 via-pink-500/10 to-red-600/10', border: 'border-rose-200' }
  ];

  const displayedWorlds = selectedWorld ? worlds.filter(w => w.num === selectedWorld) : worlds;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* World Selection Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => onSelectWorld(null)}
            className={`px-3 py-1.5 rounded-xl font-display text-sm font-semibold whitespace-nowrap transition-all ${
              selectedWorld === null
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All 5 Stages Map
          </button>
          {worlds.map(w => {
            const stage = STAGES[w.stageId];
            const isCurrent = selectedWorld === w.num;
            const stageProg = calculateStageProgress(w.stageId, progress, levels);
            return (
              <button
                key={w.num}
                onClick={() => onSelectWorld(w.num)}
                className={`px-3 py-1.5 rounded-xl font-display text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{w.num}. {stage.shortName}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isCurrent ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {stageProg.starsEarned}/9★
                </span>
              </button>
            );
          })}
        </div>

        {/* Milestone Quick Jump */}
        <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
          <span>Goal Target:</span>
          <span className="font-bold text-amber-600">{MIN_STARS_FOR_CERTIFICATE} Stars</span>
          {goalReached && (
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 ml-1">
              <Sparkles className="w-3 h-3" /> Unlocked!
            </span>
          )}
        </div>
      </div>

      {/* Worlds Trail */}
      <div className="space-y-12">
        {displayedWorlds.map((world, worldIdx) => {
          const stage = STAGES[world.stageId];
          const worldLevels = levels.filter(lvl => lvl.worldNumber === world.num);
          const stageProg = calculateStageProgress(world.stageId, progress, levels);
          const IconComponent = world.icon;

          return (
            <section
              key={world.num}
              className={`relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br ${world.bgGrad} border-2 ${world.border} shadow-sm overflow-hidden`}
            >
              {/* Decorative Background Accents */}
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                <IconComponent className="w-56 h-56 text-slate-900" />
              </div>

              {/* World Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: stage.themeColor }}
                  >
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/80 text-slate-800 border border-slate-200 shadow-xs">
                        Stage {world.num}
                      </span>
                      <h2 className="font-display font-bold text-2xl text-slate-900">
                        {stage.name}
                      </h2>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1 max-w-2xl">
                      {stage.tagline}
                    </p>
                    <p className="text-xs text-slate-500 italic mt-0.5">
                      Key Inquiry: "{stage.keyQuestion}"
                    </p>
                  </div>
                </div>

                {/* World Star Badge */}
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-white/80 rounded-2xl p-3 shadow-sm shrink-0 self-start md:self-auto">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      World Mastery
                    </div>
                    <div className="flex items-center justify-end gap-1 font-display font-bold text-lg text-slate-800">
                      <span>{stageProg.starsEarned}</span>
                      <span className="text-slate-400 text-sm">/ {stageProg.maxStars}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Trophy className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Angry Birds Progression Trail / Map Nodes */}
              <div className="relative z-10 py-6">
                {/* Winding Trail for larger screens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center relative">
                  {worldLevels.map((level, idx) => {
                    const isUnlocked = isLevelUnlocked(level.id, progress, levels);
                    const levelProg = progress[level.id];
                    const stars = levelProg?.stars || 0;
                    const isCompleted = Boolean(levelProg?.completed && stars >= 1);
                    const isNextToPlay = isUnlocked && !isCompleted;

                    return (
                      <div key={level.id} className="flex flex-col items-center w-full max-w-xs group">
                        {/* Interactive Angry Birds Level Node Button */}
                        <div className="relative">
                          {/* Pulsing ring on the next playable level */}
                          {isNextToPlay && (
                            <span className="absolute -inset-2.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
                          )}

                          <button
                            onClick={() => onOpenLevel(level)}
                            disabled={!isUnlocked}
                            aria-label={`Level ${level.code}: ${level.title}. ${isUnlocked ? (isCompleted ? `${stars} stars earned` : 'Unlocked, ready to play') : 'Locked'}`}
                            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center font-display transition-all relative z-10 border-4 ${
                              !isUnlocked
                                ? 'bg-slate-200/90 border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                                : isCompleted
                                ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 border-amber-200 text-amber-950 game-node-shadow cursor-pointer hover:scale-105'
                                : 'bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 border-sky-200 text-white game-node-shadow cursor-pointer hover:scale-105'
                            }`}
                          >
                            {/* Inner Node Content */}
                            {!isUnlocked ? (
                              <div className="flex flex-col items-center">
                                <Lock className="w-7 h-7 text-slate-400 mb-0.5" />
                                <span className="text-xs font-bold text-slate-500">{level.code}</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs uppercase tracking-wider font-extrabold opacity-80">
                                  Level
                                </span>
                                <span className="text-2xl sm:text-3xl font-black leading-none drop-shadow-sm">
                                  {level.code}
                                </span>
                                {isCompleted && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                              </>
                            )}
                          </button>

                          {/* Level Code Tag */}
                          <div className="mt-2 flex justify-center">
                            {/* 3 Angry Birds Stars underneath the node */}
                            <div className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow-xs border border-slate-200">
                              {[1, 2, 3].map(starIndex => (
                                <Star
                                  key={starIndex}
                                  className={`w-4 h-4 transition-all ${
                                    stars >= starIndex
                                      ? 'fill-amber-400 text-amber-500 drop-shadow-xs animate-star-pop'
                                      : 'text-slate-300 fill-slate-100'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Level Title and Micro-description */}
                        <div className="text-center mt-3 px-2">
                          <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-amber-700 transition-colors">
                            {level.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {level.subtitle}
                          </p>
                          <div className="mt-1.5 flex items-center justify-center gap-1.5">
                            <span className="text-[11px] font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-md">
                              {level.challenges.length} Challenges
                            </span>
                            {levelProg?.score !== undefined && (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Best: {levelProg.score}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* World Objective Footer */}
              <div className="mt-4 pt-4 border-t border-white/60 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">Stage Objective:</span>
                  <span>{stage.objective}</span>
                </div>
                {worldIdx < worlds.length - 1 && (
                  <div className="flex items-center gap-1 text-slate-500 font-semibold">
                    <span>Next: Stage {world.num + 1} ({STAGES[worlds[worldIdx + 1].stageId].shortName})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Stage Arcade Intermission Gateway */}
              {(() => {
                const stageGame = getArcadeGameForStage(world.stageId);
                const gameScore = (arcadeScores && typeof arcadeScores === 'object' && arcadeScores[stageGame.id]) || 0;
                const attempts = (arcadeAttempts && typeof arcadeAttempts === 'object' && arcadeAttempts[stageGame.id]) || 0;
                const remainingPlays = goalReached ? Infinity : Math.max(0, 2 - attempts);

                return (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-900/95 text-white border-2 border-amber-400/60 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-xs">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                            Stage {world.num} Intermission Game
                          </span>
                          <span className="font-display font-black text-sm sm:text-base text-white">
                            {stageGame.title}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({stageGame.arcadeClassic})
                          </span>

                          {/* Play limit badge */}
                          {goalReached ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> Unlimited Free Play
                            </span>
                          ) : attempts === 0 ? (
                            <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/40">
                              2 Plays (1 Replay)
                            </span>
                          ) : attempts === 1 ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                              1 Replay Left
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                              2/2 Plays Used • Next Questions Await
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          3 Lives Challenge • Best High Score: <strong className="text-amber-400 font-mono font-bold">{gameScore} pts</strong> (Transfers to Certificate!)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenArcade(stageGame.id)}
                      className={`game-btn px-4 py-2 rounded-xl font-display font-extrabold text-xs flex items-center gap-1.5 shadow-md shrink-0 ${
                        !goalReached && attempts >= 2
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-orange-500/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {goalReached
                          ? `Play ${stageGame.title}`
                          : attempts === 0
                          ? `Play ${stageGame.title} (1st Play)`
                          : attempts === 1
                          ? `Play ${stageGame.title} (Last Replay)`
                          : `Stage Plays Used (2/2)`}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </section>
          );
        })}
      </div>

      {/* Grand Finish / Goal Banner */}
      <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-15 pointer-events-none">
          <Trophy className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-white/30">
            <Sparkles className="w-4 h-4 text-amber-200" />
            Classroom Grand Milestone
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
            Ready to Turn In Your Design Journey?
          </h2>

          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Reach the {MIN_STARS_FOR_CERTIFICATE}+ star goal to unlock your official <strong>Certificate of Achievement</strong>, with direct submission to Google Classroom, printable report card, and engineering badge showcase!
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenCertificate}
              className="game-btn bg-white text-orange-950 px-6 py-3 rounded-2xl font-display font-bold text-base shadow-lg hover:bg-amber-50 flex items-center gap-2 border-2 border-amber-200"
            >
              <Award className="w-5 h-5 text-orange-600" />
              <span>{goalReached ? 'Claim & Share Certificate' : 'Preview Certificate & Classroom Turn-In'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
