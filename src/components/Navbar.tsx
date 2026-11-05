/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Trophy,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Star,
  RotateCcw,
  Compass,
  Gamepad2
} from 'lucide-react';
import { MIN_STARS_FOR_CERTIFICATE } from '../utils/designQuestRules';

interface NavbarProps {
  totalStars: number;
  maxPossibleStars: number;
  goalReached: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCertificate: () => void;
  onOpenJournal: () => void;
  onOpenBadges: () => void;
  onOpenArcade: () => void;
  totalArcadeScore: number;
  onResetProgress: () => void;
  onQuickDemoProgress: () => void;
  studentName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalStars,
  maxPossibleStars,
  goalReached,
  soundEnabled,
  onToggleSound,
  onOpenCertificate,
  onOpenJournal,
  onOpenBadges,
  onOpenArcade,
  totalArcadeScore,
  onResetProgress,
  onQuickDemoProgress,
  studentName
}) => {
  const progressPercent = Math.min(100, Math.round((totalStars / MIN_STARS_FOR_CERTIFICATE) * 100));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Mascot */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                DesignQuest
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 hidden sm:inline-block">
                K-12 STEM
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              The 5-Stage Engineering Design Process Adventure
            </p>
          </div>
        </div>

        {/* Center: Angry Birds Star Goal Tracker */}
        <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl px-3 py-1.5 shadow-inner">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-amber-900 shadow-sm">
              <Star className="w-5 h-5 fill-amber-900" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-lg text-amber-950 leading-none">
                  {totalStars}
                </span>
                <span className="text-xs text-amber-700/80 font-medium">
                  / {maxPossibleStars}
                </span>
              </div>
              <div className="w-24 sm:w-28 bg-amber-200/70 h-2 rounded-full overflow-hidden mt-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-amber-900 hidden lg:block border-l border-amber-200 pl-3">
            {goalReached ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Goal Reached!
              </span>
            ) : (
              <span>
                Goal: {MIN_STARS_FOR_CERTIFICATE} Stars ({Math.max(0, MIN_STARS_FOR_CERTIFICATE - totalStars)} to unlock Certificate)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Certificate & Classroom Button */}
          <button
            onClick={onOpenCertificate}
            className={`game-btn px-3.5 py-2 rounded-xl font-display font-semibold text-sm flex items-center gap-2 shadow-sm transition-all ${
              goalReached
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400 ring-offset-1 animate-pulse'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
            title="View Certificate of Achievement and Google Classroom Turn-In"
          >
            <Award className={`w-4 h-4 ${goalReached ? 'text-amber-200' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">Certificate & Classroom</span>
            <span className="sm:hidden">Share</span>
            {goalReached && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>

          {/* Project Journal Button */}
          <button
            onClick={onOpenJournal}
            className="game-btn px-3 py-2 rounded-xl font-display font-semibold text-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            title="Open Student Design Journal & Project Blueprint"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">My Project Journal</span>
          </button>

          {/* Retro STEM Arcade Button */}
          <button
            onClick={onOpenArcade}
            className="game-btn px-3 py-2 rounded-xl font-display font-semibold text-sm bg-slate-900 text-amber-400 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm border border-slate-700"
            title="Play Retro Arcade Games (Tetris, Galaga, Dig Dug, OutRun, NBA Jam)"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Retro Arcade</span>
            {totalArcadeScore > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {totalArcadeScore}
              </span>
            )}
          </button>

          {/* Badges Button */}
          <button
            onClick={onOpenBadges}
            className="game-btn p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm"
            title="View Earned Badges"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm"
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Demo Auto-Unlock / Teacher quick test helper */}
          <button
            onClick={onQuickDemoProgress}
            className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium hidden xl:inline-block"
            title="Pre-fill sample student stars for quick testing/grading review"
          >
            Demo Unlock
          </button>

          <button
            onClick={onResetProgress}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Reset All Progress"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
