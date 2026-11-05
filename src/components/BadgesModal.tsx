/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Trophy,
  Rocket,
  Search,
  Compass,
  Sparkles,
  Wrench,
  Megaphone,
  Crown,
  Lock,
  CheckCircle2
} from 'lucide-react';
import {
  BADGES,
  getEarnedBadges,
  LevelData,
  LevelProgress
} from '../utils/designQuestRules';

interface BadgesModalProps {
  onClose: () => void;
  levels: LevelData[];
  progress: Record<string, LevelProgress>;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Rocket,
  Search,
  Compass,
  Sparkles,
  Wrench,
  Megaphone,
  Crown
};

export const BadgesModal: React.FC<BadgesModalProps> = ({
  onClose,
  levels,
  progress
}) => {
  const earned = getEarnedBadges(progress, levels);
  const earnedIds = new Set(earned.map(b => b.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">
                Engineering Badges & Medals
              </h2>
              <p className="text-xs text-amber-100">
                {earned.length} of {BADGES.length} Badges Unlocked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close badges"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {BADGES.map(badge => {
              const isUnlocked = earnedIds.has(badge.id);
              const IconComp = ICON_MAP[badge.icon] || Trophy;

              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 transition-all ${
                    isUnlocked
                      ? 'bg-amber-50/60 border-amber-300 text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnlocked
                        ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? (
                      <IconComp className="w-6 h-6" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-display font-bold text-sm text-slate-900 truncate">
                        {badge.title}
                      </h3>
                      {isUnlocked && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <div className="mt-2 text-[10px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md inline-block border border-slate-200">
                      Requirement: {badge.conditionDescription}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="game-btn px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
