/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { WorldMap } from './components/WorldMap';
import { LevelModal } from './components/LevelModal';
import { CertificateModal } from './components/CertificateModal';
import { ProjectJournalModal } from './components/ProjectJournalModal';
import { BadgesModal } from './components/BadgesModal';
import { ArcadeGamesModal } from './components/ArcadeGames';
import { ALL_LEVELS, SAMPLE_PROJECT_TOPICS } from './data/levelsData';
import {
  LevelData,
  LevelProgress,
  StudentProfile,
  DesignStageId,
  calculateTotalStars,
  isGoalReached,
  playSynthSound,
  MIN_STARS_FOR_CERTIFICATE,
  ArcadeGameId,
  ArcadeScores,
  calculateTotalArcadeScore,
  getArcadeGameForStage,
  isStageFullyCompleted
} from './utils/designQuestRules';
import {
  Sparkles,
  Compass,
  ArrowRight,
  Award,
  CheckCircle2,
  BookOpen,
  Share2,
  Play
} from 'lucide-react';

const PROGRESS_STORAGE_KEY = 'designquest_progress_v2';
const PROFILE_STORAGE_KEY = 'designquest_profile_v2';
const ARCADE_STORAGE_KEY = 'designquest_arcade_scores_v2';
const ARCADE_ATTEMPTS_STORAGE_KEY = 'designquest_arcade_attempts_v2';

export default function App() {
  const [levels] = useState<LevelData[]>(ALL_LEVELS);
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null);
  const [activeLevel, setActiveLevel] = useState<LevelData | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Helper for resilient localStorage parsing that never returns null or corrupted primitives
  const safeParseStorage = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed as T;
      return fallback;
    } catch {
      return fallback;
    }
  };

  // Retro Arcade Intermission state
  const [activeArcadeGame, setActiveArcadeGame] = useState<ArcadeGameId | null>(null);
  const [pendingNextLevelId, setPendingNextLevelId] = useState<string | null>(null);
  const [arcadeScores, setArcadeScores] = useState<ArcadeScores>(() =>
    safeParseStorage<ArcadeScores>(ARCADE_STORAGE_KEY, {
      space_invaders: 0,
      dig_dug: 0,
      tetris: 0,
      outrun: 0,
      archery: 0
    })
  );

  const [arcadeAttempts, setArcadeAttempts] = useState<Record<ArcadeGameId, number>>(() =>
    safeParseStorage<Record<ArcadeGameId, number>>(ARCADE_ATTEMPTS_STORAGE_KEY, {
      space_invaders: 0,
      dig_dug: 0,
      tetris: 0,
      outrun: 0,
      archery: 0
    })
  );

  const handleRecordArcadeAttempt = (gameId: ArcadeGameId) => {
    setArcadeAttempts(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {
        space_invaders: 0,
        dig_dug: 0,
        tetris: 0,
        outrun: 0,
        archery: 0
      };
      const nextCount = (safePrev[gameId] || 0) + 1;
      const updated = { ...safePrev, [gameId]: nextCount };
      try {
        localStorage.setItem(ARCADE_ATTEMPTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleUpdateArcadeHighScore = (gameId: ArcadeGameId, newScore: number) => {
    setArcadeScores(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {
        space_invaders: 0,
        dig_dug: 0,
        tetris: 0,
        outrun: 0,
        archery: 0
      };
      const current = safePrev[gameId] || 0;
      if (newScore <= current) return safePrev;
      const updated = { ...safePrev, [gameId]: newScore };
      try {
        localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Teacher Verified View state (when opened from Google Classroom submission link)
  const [isTeacherVerifiedView, setIsTeacherVerifiedView] = useState(false);
  const [urlVerifiedStars, setUrlVerifiedStars] = useState<number | null>(null);

  // Student Profile
  const [profile, setProfile] = useState<StudentProfile>(() =>
    safeParseStorage<StudentProfile>(PROFILE_STORAGE_KEY, {
      name: '',
      teacherEmail: 'nicholas.hanner@ahschools.us',
      projectTopic: SAMPLE_PROJECT_TOPICS[0].title,
      soundEnabled: true,
      avatar: 'falcon'
    })
  );

  // Progress tracking
  const [progress, setProgress] = useState<Record<string, LevelProgress>>(() =>
    safeParseStorage<Record<string, LevelProgress>>(PROGRESS_STORAGE_KEY, {})
  );

  // Check URL params on load: preserves stars when teacher views submission on Google Classroom!
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const certParam = params.get('cert');
    const studentParam = params.get('student');
    const starsParam = params.get('stars');
    const stagesParam = params.get('stages');
    const scoresParam = params.get('scores');

    if (certParam || starsParam || studentParam) {
      if (studentParam) {
        setProfile(p => ({ ...p, name: studentParam }));
      }

      // Extract verified stars from &stars= param OR from cert code (e.g. DQ-NICH-38-1234)
      let verifiedStars = 0;
      if (starsParam) {
        verifiedStars = parseInt(starsParam, 10) || 0;
      } else if (certParam) {
        const match = certParam.match(/DQ-[A-Z0-9]+-(\d+)-/i);
        if (match) {
          verifiedStars = parseInt(match[1], 10) || 0;
        }
      }

      if (verifiedStars > 0) {
        setUrlVerifiedStars(verifiedStars);
        setIsTeacherVerifiedView(true);

        // Populate progress so teacher viewing from Google Classroom sees authentic student stars!
        setProgress(prevProgress => {
          const currentStars = calculateTotalStars(prevProgress);
          // Only replace if current localStorage has fewer stars than verified turn-in
          if (currentStars >= verifiedStars) return prevProgress;

          const verifiedProg: Record<string, LevelProgress> = { ...prevProgress };

          if (stagesParam) {
            const stageCounts = stagesParam.split('_').map(n => parseInt(n, 10) || 0);
            const stageIds: DesignStageId[] = ['ask', 'research', 'brainstorm', 'prototype', 'present'];
            stageIds.forEach((stId, sIdx) => {
              let starsLeft = stageCounts[sIdx] || 0;
              const stageLevels = ALL_LEVELS.filter(l => l.stageId === stId);
              stageLevels.forEach(lvl => {
                const lvlStars = Math.min(3, Math.max(0, starsLeft));
                starsLeft -= lvlStars;
                verifiedProg[lvl.id] = {
                  levelId: lvl.id,
                  completed: lvlStars > 0,
                  stars: lvlStars,
                  score: lvlStars * 33 + (lvlStars === 3 ? 1 : 0),
                  attempts: 1,
                  completedAt: new Date().toISOString(),
                  reflectionAnswer: `Mastered key concepts in stage ${lvl.stageId} during our classroom challenge.`
                };
              });
            });
          } else {
            // Distribute verified stars evenly across levels
            let remainingStars = verifiedStars;
            ALL_LEVELS.forEach(lvl => {
              const starsForLvl = Math.min(3, Math.max(0, remainingStars));
              remainingStars -= starsForLvl;
              verifiedProg[lvl.id] = {
                levelId: lvl.id,
                completed: starsForLvl > 0,
                stars: starsForLvl,
                score: starsForLvl * 33 + (starsForLvl === 3 ? 1 : 0),
                attempts: 1,
                completedAt: new Date().toISOString(),
                reflectionAnswer: `Completed level during design quest challenge.`
              };
            });
          }

          return verifiedProg;
        });
      }

      // If scores param present in URL, restore arcade high scores
      if (scoresParam) {
        const s = scoresParam.split('_').map(n => parseInt(n, 10) || 0);
        if (s.length >= 5) {
          setArcadeScores({
            space_invaders: s[0],
            dig_dug: s[1],
            tetris: s[2],
            outrun: s[3],
            archery: s[4]
          });
        }
      }

      if (certParam || starsParam) {
        setShowCertificate(true);
      }
    }

    const levelCode = params.get('level');
    if (levelCode) {
      const found = ALL_LEVELS.find(l => l.code === levelCode || l.id === levelCode);
      if (found) setActiveLevel(found);
    }
  }, []);

  // Save progress
  const handleSaveLevelProgress = (
    levelId: string,
    stars: number,
    score: number,
    reflection?: string
  ) => {
    setProgress(prev => {
      const current = prev[levelId];
      const bestStars = Math.max(stars, current?.stars || 0);
      const bestScore = Math.max(score, current?.score || 0);
      const updated: Record<string, LevelProgress> = {
        ...prev,
        [levelId]: {
          levelId,
          completed: true,
          stars: bestStars,
          score: bestScore,
          attempts: (current?.attempts || 0) + 1,
          completedAt: new Date().toISOString(),
          reflectionAnswer: reflection || current?.reflectionAnswer
        }
      };
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleUpdateProfile = (updated: Partial<StudentProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetProgress = () => {
    if (window.confirm('Reset all progress, stars, and arcade high scores to 0?')) {
      setProgress({});
      setArcadeScores({
        space_invaders: 0,
        dig_dug: 0,
        tetris: 0,
        outrun: 0,
        archery: 0
      });
      setArcadeAttempts({
        space_invaders: 0,
        dig_dug: 0,
        tetris: 0,
        outrun: 0,
        archery: 0
      });
      try {
        localStorage.removeItem(PROGRESS_STORAGE_KEY);
        localStorage.removeItem(ARCADE_STORAGE_KEY);
        localStorage.removeItem(ARCADE_ATTEMPTS_STORAGE_KEY);
      } catch {
        // ignore
      }
      if (soundEnabled) playSynthSound('click');
    }
  };

  // Quick Demo Progression for testing / grading demo (awards 39 stars so >= 38 stars required for certificate)
  const handleQuickDemoProgress = () => {
    const demoProgress: Record<string, LevelProgress> = {};
    ALL_LEVELS.slice(0, 13).forEach(lvl => {
      demoProgress[lvl.id] = {
        levelId: lvl.id,
        completed: true,
        stars: 3,
        score: 100,
        attempts: 1,
        completedAt: new Date().toISOString(),
        reflectionAnswer: `Mastered key concepts in stage ${lvl.stageId} during our classroom challenge.`
      };
    });
    setProgress(demoProgress);
    const demoArcade: ArcadeScores = {
      space_invaders: 1400,
      dig_dug: 1250,
      tetris: 2800,
      outrun: 1950,
      archery: 1200
    };
    setArcadeScores(demoArcade);
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(demoProgress));
      localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(demoArcade));
    } catch {
      // ignore
    }
    if (soundEnabled) playSynthSound('victory');
  };

  const totalStars = calculateTotalStars(progress);
  const totalArcadeScore = calculateTotalArcadeScore(arcadeScores);
  const maxPossibleStars = levels.length * 3;
  const goalReached = isGoalReached(progress, levels, MIN_STARS_FOR_CERTIFICATE);

  // Launch Arcade Intermission when completing a stage or choosing to play
  const handleLaunchStageArcade = (gameId: ArcadeGameId, nextLevelId?: string) => {
    setActiveLevel(null);
    setPendingNextLevelId(nextLevelId || null);
    setActiveArcadeGame(gameId);
    if (soundEnabled) playSynthSound('slingshot');
  };

  // When arcade modal closes, continue seamlessly to the pending next level or certificate
  const handleCloseArcade = () => {
    const wasArchery = activeArcadeGame === 'archery';
    const isLevel53Done = Boolean(progress['lvl-5-3']?.completed);
    setActiveArcadeGame(null);

    // If closing archery (Stage 5 culmination) or level 5-3 was completed, automatically open certificate!
    if (wasArchery || isLevel53Done) {
      setTimeout(() => {
        setShowCertificate(true);
        if (soundEnabled) playSynthSound('victory');
      }, 250);
      return;
    }

    if (pendingNextLevelId) {
      const nextLevel = levels.find(l => l.id === pendingNextLevelId);
      setPendingNextLevelId(null);
      if (nextLevel) {
        setTimeout(() => {
          setActiveLevel(nextLevel);
          if (soundEnabled) playSynthSound('slingshot');
        }, 250);
      }
    } else if (goalReached) {
      setTimeout(() => {
        setShowCertificate(true);
      }, 300);
    }
  };

  // Next level navigation helper: automatically triggers stage arcade game between stages!
  const handleOpenNextLevel = () => {
    if (!activeLevel) return;
    const currentIndex = levels.findIndex(l => l.id === activeLevel.id);
    if (currentIndex >= 0 && currentIndex < levels.length - 1) {
      const nextLvl = levels[currentIndex + 1];
      // If transitioning from one stage to another (e.g. 1-3 to 2-1), pop up the completed stage's arcade game!
      if (nextLvl.stageId !== activeLevel.stageId) {
        const completedStageArcade = getArcadeGameForStage(activeLevel.stageId);
        handleLaunchStageArcade(completedStageArcade.id, nextLvl.id);
      } else {
        setActiveLevel(nextLvl);
        if (soundEnabled) playSynthSound('slingshot');
      }
    } else {
      // Completed the very last level of the entire quest (Stage 5, Level 5-3)!
      const completedStageArcade = getArcadeGameForStage(activeLevel.stageId);
      handleLaunchStageArcade(completedStageArcade.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        totalStars={totalStars}
        maxPossibleStars={maxPossibleStars}
        goalReached={goalReached}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(v => !v)}
        onOpenCertificate={() => setShowCertificate(true)}
        onOpenJournal={() => setShowJournal(true)}
        onOpenBadges={() => setShowBadges(true)}
        onOpenArcade={() => setActiveArcadeGame('space_invaders')}
        totalArcadeScore={totalArcadeScore}
        onResetProgress={handleResetProgress}
        onQuickDemoProgress={handleQuickDemoProgress}
        studentName={profile.name}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {/* Playful Hero Header */}
        <section className="bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-slate-50 border-b border-amber-100/80 py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Gamified Engineering Education
              </div>

              <h1 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-tight leading-tight">
                Master the <span className="text-amber-600 underline decoration-amber-300 decoration-wavy">Design Process</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Embark on an Angry Birds-style STEM quest! Progress through 5 unlockable worlds—<strong>Ask, Research, Brainstorm, Prototype, and Present</strong>. Earn stars, complete hands-on engineering challenges, and generate your verified certificate for Google Classroom.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => {
                    const firstUncompleted = levels.find(l => !progress[l.id]?.completed) || levels[0];
                    setActiveLevel(firstUncompleted);
                    if (soundEnabled) playSynthSound('slingshot');
                  }}
                  className="game-btn px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-display font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:from-amber-600 hover:to-rose-600"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Next Mission</span>
                </button>

                <button
                  onClick={() => setShowJournal(true)}
                  className="game-btn px-5 py-3 rounded-2xl bg-white text-slate-800 border-2 border-slate-200 hover:border-slate-300 font-display font-bold text-sm flex items-center gap-2 shadow-xs"
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>My Project Blueprint</span>
                </button>

                <button
                  onClick={() => setShowCertificate(true)}
                  className="game-btn px-5 py-3 rounded-2xl bg-white text-emerald-800 border-2 border-emerald-200 hover:bg-emerald-50 font-display font-bold text-sm flex items-center gap-2 shadow-xs"
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Google Classroom Status</span>
                </button>
              </div>
            </div>

            {/* Stage Quick Progress Mini-Card */}
            <div className="w-full md:w-80 bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-md space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-900">
                  Design Journey Goal
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {totalStars} / {MIN_STARS_FOR_CERTIFICATE}★ Target
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalStars / MIN_STARS_FOR_CERTIFICATE) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Start</span>
                  <span>Certificate Goal ({MIN_STARS_FOR_CERTIFICATE}★)</span>
                  <span>100% ({maxPossibleStars}★)</span>
                </div>
              </div>

              {/* Stage Checklist Mini-indicators */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
                {[
                  { id: 'ask', name: '1. Ask the Problem' },
                  { id: 'research', name: '2. Research Evidence' },
                  { id: 'brainstorm', name: '3. Brainstorm Ideas' },
                  { id: 'prototype', name: '4. Prototype & Test' },
                  { id: 'present', name: '5. Present & Pitch' }
                ].map((st, idx) => {
                  const worldLevels = levels.filter(l => l.stageId === st.id);
                  const isDone = worldLevels.some(l => progress[l.id]?.completed && (progress[l.id].stars || 0) >= 1);
                  return (
                    <div key={st.id} className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>{st.name}</span>
                      </span>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Stage {idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Angry Birds-Style Interactive Progression Map */}
        <WorldMap
          levels={levels}
          progress={progress}
          selectedWorld={selectedWorld}
          onSelectWorld={setSelectedWorld}
          onOpenLevel={lvl => {
            setActiveLevel(lvl);
            if (soundEnabled) playSynthSound('slingshot');
          }}
          onOpenCertificate={() => setShowCertificate(true)}
          totalStars={totalStars}
          goalReached={goalReached}
          arcadeScores={arcadeScores}
          arcadeAttempts={arcadeAttempts}
          onOpenArcade={gameId => {
            setActiveArcadeGame(gameId || 'space_invaders');
            if (soundEnabled) playSynthSound('slingshot');
          }}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">
          DesignQuest — K-12 Engineering Design Process Interactive Curriculum
        </p>
        <p>
          Aligned with NGSS (Next Generation Science Standards) ETS Engineering Design Framework.
        </p>
        <p className="text-[11px] text-slate-400 pt-1">
          Designed for classroom integration & Google Classroom assignment submission.
        </p>
      </footer>

      {/* Interactive Level Modal */}
      {activeLevel && (() => {
        const currentIndex = levels.findIndex(l => l.id === activeLevel.id);
        const nextLevel = currentIndex >= 0 && currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
        const isStageCompleted = isStageFullyCompleted(activeLevel.stageId, levels, progress);
        const isCulmination = activeLevel.levelNumber === 3 || isStageCompleted;

        return (
          <LevelModal
            level={activeLevel}
            onClose={() => setActiveLevel(null)}
            onSaveProgress={handleSaveLevelProgress}
            onOpenNextLevel={handleOpenNextLevel}
            soundEnabled={soundEnabled}
            existingProgress={progress[activeLevel.id]}
            isStageCompleted={isCulmination}
            onLaunchStageArcade={(gameId) => {
              handleLaunchStageArcade(gameId, nextLevel ? nextLevel.id : undefined);
            }}
          />
        );
      })()}

      {/* Official Certificate & Google Classroom Modal */}
      {showCertificate && (
        <CertificateModal
          onClose={() => setShowCertificate(false)}
          levels={levels}
          progress={progress}
          studentName={profile.name}
          onUpdateStudentName={name => handleUpdateProfile({ name })}
          teacherEmail={profile.teacherEmail}
          arcadeScores={arcadeScores}
          isTeacherVerifiedView={isTeacherVerifiedView}
          verifiedStars={urlVerifiedStars}
        />
      )}

      {/* Retro Arcade Intermission Games Modal */}
      {activeArcadeGame && (
        <ArcadeGamesModal
          initialGameId={activeArcadeGame}
          onClose={handleCloseArcade}
          scores={arcadeScores}
          onUpdateHighScore={handleUpdateArcadeHighScore}
          soundEnabled={soundEnabled}
          certificateUnlocked={goalReached || Boolean(progress['lvl-5-3']?.completed)}
          attempts={arcadeAttempts}
          onRecordAttempt={handleRecordArcadeAttempt}
          onOpenCertificate={() => setShowCertificate(true)}
        />
      )}

      {/* Student Design Project Journal Modal */}
      {showJournal && (
        <ProjectJournalModal
          onClose={() => setShowJournal(false)}
          studentProfile={profile}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Badges Modal */}
      {showBadges && (
        <BadgesModal
          onClose={() => setShowBadges(false)}
          levels={levels}
          progress={progress}
        />
      )}
    </div>
  );
}
