/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Star,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Send,
  Volume2,
  VolumeX,
  Clock,
  Square,
  Gamepad2,
  Play
} from 'lucide-react';
import {
  LevelData,
  LevelProgress,
  calculateStars,
  playSynthSound,
  STAGES,
  ArcadeGameId,
  getArcadeGameForStage
} from '../utils/designQuestRules';

interface LevelModalProps {
  level: LevelData | null;
  onClose: () => void;
  onSaveProgress: (levelId: string, stars: number, score: number, reflection?: string) => void;
  onOpenNextLevel?: () => void;
  soundEnabled: boolean;
  existingProgress?: LevelProgress;
  isStageCompleted?: boolean;
  onLaunchStageArcade?: (gameId: ArcadeGameId) => void;
}

export const LevelModal: React.FC<LevelModalProps> = ({
  level,
  onClose,
  onSaveProgress,
  onOpenNextLevel,
  soundEnabled,
  existingProgress,
  isStageCompleted = false,
  onLaunchStageArcade
}) => {
  if (!level) return null;

  const stage = STAGES[level.stageId];
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalStars, setFinalStars] = useState(0);
  const [revealedStars, setRevealedStars] = useState(0);
  const [reflectionText, setReflectionText] = useState(existingProgress?.reflectionAnswer || '');

  // 15-Second mandatory thinking timer
  const [timeLeft, setTimeLeft] = useState(15);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [casualVoiceLabel, setCasualVoiceLabel] = useState<string>('Casual Voice');

  // Load natural, casual voice on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) return;

    const findCasualVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // 1. Prioritize Natural / Online neural voices (Edge / Chrome / Windows / macOS)
        const naturalVoice = voices.find(v =>
          v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online'))
        );
        if (naturalVoice) {
          setSelectedVoice(naturalVoice);
          const cleanName = naturalVoice.name
            .replace(/Microsoft |Online |\(Natural\) |English \(United States\)|English \(UK\)/gi, '')
            .trim();
          setCasualVoiceLabel(cleanName ? `Natural: ${cleanName}` : 'Natural Casual Voice');
          return;
        }

        // 2. High-quality human/casual names (Chrome, Safari, macOS, iOS, Android)
        const friendlyNames = [
          'Jenny', 'Guy', 'Aria', 'Ava', 'Samantha', 'Allison',
          'Google US English', 'Google UK English Female', 'Daniel', 'Karen', 'Serena', 'Tom'
        ];
        for (const name of friendlyNames) {
          const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
          if (match) {
            setSelectedVoice(match);
            const cleanName = match.name.replace(/Microsoft |English \(United States\)/gi, '').trim();
            setCasualVoiceLabel(`Casual: ${cleanName}`);
            return;
          }
        }

        // 3. Fallback to pleasant English voice excluding legacy robotic synthesizers
        const nonRobotic = voices.find(v =>
          v.lang.startsWith('en') &&
          !v.name.toLowerCase().includes('desktop') &&
          !v.name.toLowerCase().includes('espeak') &&
          !v.name.toLowerCase().includes('david')
        );
        if (nonRobotic) {
          setSelectedVoice(nonRobotic);
          setCasualVoiceLabel(`Friendly: ${nonRobotic.name.replace(/Microsoft /gi, '').trim()}`);
          return;
        }

        // 4. Any English voice
        const anyEn = voices.find(v => v.lang.startsWith('en'));
        if (anyEn) {
          setSelectedVoice(anyEn);
          setCasualVoiceLabel('Casual Voice');
        }
      } catch {
        // speech synthesis not available or blocked by iframe permissions
      }
    };

    try {
      findCasualVoice();
      window.speechSynthesis.onvoiceschanged = findCasualVoice;
    } catch {
      // ignore
    }

    return () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Reset state when level changes
  useEffect(() => {
    setCurrentChallengeIdx(0);
    setUserAnswers({});
    setShowFeedback({});
    setIsCompleted(false);
    setFinalScore(0);
    setFinalStars(0);
    setRevealedStars(0);
    setReflectionText(existingProgress?.reflectionAnswer || '');
  }, [level.id]);

  // 15-second timer per challenge
  useEffect(() => {
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentChallengeIdx, level.id]);

  // Cancel speech on unmount or question change
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChallengeIdx, level.id]);

  const currentChallenge = level.challenges[currentChallengeIdx];
  const totalChallenges = level.challenges.length;

  const handleSound = (type: 'slingshot' | 'star' | 'victory' | 'correct' | 'wrong' | 'click') => {
    if (soundEnabled) {
      playSynthSound(type);
    }
  };

  // Text-To-Speech Read Aloud with Casual, Conversational Teacher Voice
  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentChallenge) return;

    // Friendly, engaging conversational teacher phrasing
    let textToSpeak = `Here is your engineering challenge: ${currentChallenge.prompt}. `;
    if (currentChallenge.type === 'multiple-choice' && currentChallenge.options) {
      textToSpeak += ' Here are the choices: ';
      currentChallenge.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        textToSpeak += ` Choice ${letter}: ${opt.label}. `;
      });
    } else if (currentChallenge.type === 'scenario-decision' && currentChallenge.scenario) {
      textToSpeak += ` Background context: ${currentChallenge.scenario.context}. What should you do? `;
      currentChallenge.scenario.choices.forEach((choice, idx) => {
        const letter = String.fromCharCode(65 + idx);
        textToSpeak += ` Option ${letter}: ${choice.text}. `;
      });
    } else if (currentChallenge.type === 'classify-items' && currentChallenge.categories && currentChallenge.draggableItems) {
      textToSpeak += ` Let's classify these items into two groups: ${currentChallenge.categories.map(c => c.label).join(' versus ')}. `;
      textToSpeak += ` The items to classify are: ${currentChallenge.draggableItems.map(i => i.text).join('. ')}. `;
    } else if (currentChallenge.type === 'order-steps' && currentChallenge.draggableItems) {
      textToSpeak += ` Let's arrange these engineering steps in order: ${currentChallenge.draggableItems.map((i, idx) => `Step ${idx + 1}: ${i.text}`).join('. ')}. `;
    }

    if (showFeedback[currentChallenge.id]) {
      textToSpeak += ` Engineering takeaway: ${currentChallenge.explanation}. `;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    // Casual, conversational delivery: warm pitch, relaxed pace
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Multiple Choice Handler
  const handleSelectOption = (challengeId: string, optionId: string) => {
    setUserAnswers(prev => ({ ...prev, [challengeId]: optionId }));
    setShowFeedback(prev => ({ ...prev, [challengeId]: true }));
    
    const challenge = level.challenges.find(c => c.id === challengeId);
    const selectedOpt = challenge?.options?.find(o => o.id === optionId);
    if (selectedOpt?.isCorrect) {
      handleSound('correct');
    } else {
      handleSound('wrong');
    }
  };

  // Scenario Decision Handler
  const handleSelectScenario = (challengeId: string, choiceId: string) => {
    setUserAnswers(prev => ({ ...prev, [challengeId]: choiceId }));
    setShowFeedback(prev => ({ ...prev, [challengeId]: true }));
    const challenge = level.challenges.find(c => c.id === challengeId);
    const chosen = challenge?.scenario?.choices.find(c => c.id === choiceId);
    if (chosen?.isBest) {
      handleSound('correct');
    } else {
      handleSound('wrong');
    }
  };

  // Classify Items Handler (Toggle category for an item)
  const handleAssignCategory = (challengeId: string, itemId: string, categoryId: string) => {
    setUserAnswers(prev => {
      const currentMap = prev[challengeId] || {};
      return {
        ...prev,
        [challengeId]: {
          ...currentMap,
          [itemId]: categoryId
        }
      };
    });
    handleSound('click');
  };

  // Order Steps Handler (Swap or move)
  const handleMoveStep = (challengeId: string, itemIndex: number, direction: 'up' | 'down') => {
    const challenge = level.challenges.find(c => c.id === challengeId);
    if (!challenge || !challenge.draggableItems) return;

    setUserAnswers(prev => {
      const currentList: string[] = prev[challengeId] || challenge.draggableItems!.map(i => i.id);
      const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return prev;

      const newList = [...currentList];
      const temp = newList[itemIndex];
      newList[itemIndex] = newList[targetIndex];
      newList[targetIndex] = temp;

      return {
        ...prev,
        [challengeId]: newList
      };
    });
    handleSound('click');
  };

  // Evaluate Level completion
  const handleFinishLevel = () => {
    let earnedPoints = 0;
    let maxPoints = 0;

    level.challenges.forEach(ch => {
      if (ch.type === 'multiple-choice') {
        maxPoints += 100;
        const chosenId = userAnswers[ch.id];
        const opt = ch.options?.find(o => o.id === chosenId);
        if (opt?.isCorrect) earnedPoints += 100;
      } else if (ch.type === 'scenario-decision') {
        maxPoints += 100;
        const chosenId = userAnswers[ch.id];
        const choice = ch.scenario?.choices.find(c => c.id === chosenId);
        if (choice) earnedPoints += choice.points;
      } else if (ch.type === 'classify-items') {
        const itemAnswers = userAnswers[ch.id] || {};
        const items = ch.draggableItems || [];
        const perItem = 100 / Math.max(1, items.length);
        maxPoints += 100;
        items.forEach(it => {
          if (itemAnswers[it.id] === it.correctCategoryId) {
            earnedPoints += perItem;
          }
        });
      } else if (ch.type === 'order-steps') {
        maxPoints += 100;
        const items = ch.draggableItems || [];
        const currentOrder: string[] = userAnswers[ch.id] || items.map(i => i.id);
        let correctPositions = 0;
        currentOrder.forEach((id, idx) => {
          const item = items.find(i => i.id === id);
          if (item && item.correctOrder === idx + 1) {
            correctPositions += 1;
          }
        });
        earnedPoints += (correctPositions / Math.max(1, items.length)) * 100;
      }
    });

    const calculatedScore = Math.min(100, Math.round((earnedPoints / Math.max(1, maxPoints)) * 100));
    const stars = calculateStars(calculatedScore, level.starThresholds);

    setFinalScore(calculatedScore);
    setFinalStars(stars);
    setIsCompleted(true);

    // Save progress immediately
    onSaveProgress(level.id, stars, calculatedScore, reflectionText);

    // Trigger sequential star reveals and sound
    if (stars > 0) {
      handleSound('victory');
      setTimeout(() => {
        setRevealedStars(1);
        handleSound('star');
      }, 400);

      if (stars >= 2) {
        setTimeout(() => {
          setRevealedStars(2);
          handleSound('star');
        }, 900);
      }

      if (stars >= 3) {
        setTimeout(() => {
          setRevealedStars(3);
          handleSound('star');
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore
          }
        }, 1400);
      }
    } else {
      handleSound('wrong');
    }
  };

  const isCurrentChallengeAnswered = () => {
    if (!currentChallenge) return false;
    const ans = userAnswers[currentChallenge.id];
    if (currentChallenge.type === 'multiple-choice' || currentChallenge.type === 'scenario-decision') {
      return Boolean(ans);
    }
    if (currentChallenge.type === 'classify-items') {
      const items = currentChallenge.draggableItems || [];
      const itemMap = ans || {};
      return items.every(it => Boolean(itemMap[it.id]));
    }
    if (currentChallenge.type === 'order-steps') {
      return true; // steps are always in some order
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border-4 border-slate-100 overflow-hidden">
        {/* Top Header Bar */}
        <div
          className="p-5 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: stage.themeColor }}
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-display font-black text-xl border border-white/30">
              {level.code}
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/80">
                Stage {level.worldNumber}: {stage.shortName}
              </div>
              <h2 className="font-display font-bold text-xl leading-tight">
                {level.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close level"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isCompleted ? (
            <>
              {/* Concept Teaser Card */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Design Thinking Insight
                  </div>
                  <p className="text-xs text-amber-950/90 mt-0.5 leading-relaxed">
                    {level.conceptTeaser}
                  </p>
                </div>
              </div>

              {/* Challenge Step Indicator & 15-Second Reading Timer Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>
                    Challenge {currentChallengeIdx + 1} of {totalChallenges}
                  </span>
                  <div className="flex gap-1.5">
                    {level.challenges.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all ${
                          i === currentChallengeIdx
                            ? 'w-6 bg-amber-500'
                            : i < currentChallengeIdx
                            ? 'w-2 bg-emerald-500'
                            : 'w-2 bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 15-Second Think & Read Timer Progress */}
                <div className="bg-slate-100 rounded-xl p-2.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                        timeLeft > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {timeLeft > 0 ? (
                        <span className="font-semibold text-amber-900">
                          Thinking Timer: <strong className="font-mono font-bold text-amber-950">{timeLeft}s</strong> remaining before advancing
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          15s Reading Time Complete — Ready to submit/advance!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Read Aloud Button */}
                  <button
                    onClick={handleToggleReadAloud}
                    className={`game-btn px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto ${
                      isSpeaking
                        ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                        : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs'
                    }`}
                    title={`Click to have question and answer choices read out loud using ${casualVoiceLabel}`}
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-3 h-3 fill-white" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>🔊 Read Out Loud</span>
                        <span className="hidden md:inline-block text-[10px] font-semibold text-indigo-500/80 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                          {casualVoiceLabel}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Challenge Interactive Container */}
              {currentChallenge && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">
                    {currentChallenge.prompt}
                  </h3>

                  {/* Multiple Choice Options */}
                  {currentChallenge.type === 'multiple-choice' && currentChallenge.options && (
                    <div className="space-y-2.5">
                      {currentChallenge.options.map(opt => {
                        const isSelected = userAnswers[currentChallenge.id] === opt.id;
                        const revealed = showFeedback[currentChallenge.id];
                        let btnStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-800';

                        if (revealed) {
                          if (opt.isCorrect) {
                            btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300';
                          } else if (isSelected && !opt.isCorrect) {
                            btnStyle = 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-300';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300';
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(currentChallenge.id, opt.id)}
                            className={`w-full p-4 rounded-2xl border-2 text-left font-medium text-sm flex items-start justify-between gap-3 transition-all ${btnStyle}`}
                          >
                            <span>{opt.label}</span>
                            {revealed && opt.isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            {revealed && isSelected && !opt.isCorrect && (
                              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Scenario Decision Choices */}
                  {currentChallenge.type === 'scenario-decision' && currentChallenge.scenario && (
                    <div className="space-y-3">
                      <div className="bg-slate-100 p-3.5 rounded-xl text-xs text-slate-700 italic border border-slate-200">
                        Context: {currentChallenge.scenario.context}
                      </div>
                      <div className="space-y-2.5">
                        {currentChallenge.scenario.choices.map(choice => {
                          const isSelected = userAnswers[currentChallenge.id] === choice.id;
                          const revealed = showFeedback[currentChallenge.id];

                          let cardStyle = 'bg-white border-slate-200 hover:border-slate-300';
                          if (revealed) {
                            if (choice.isBest) {
                              cardStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950';
                            } else if (isSelected) {
                              cardStyle = 'bg-amber-50 border-amber-400 text-amber-950';
                            }
                          } else if (isSelected) {
                            cardStyle = 'bg-amber-50 border-amber-400 text-amber-950';
                          }

                          return (
                            <button
                              key={choice.id}
                              onClick={() => handleSelectScenario(currentChallenge.id, choice.id)}
                              className={`w-full p-4 rounded-2xl border-2 text-left text-sm transition-all flex flex-col gap-1 ${cardStyle}`}
                            >
                              <span className="font-semibold text-slate-900">{choice.text}</span>
                              {revealed && (
                                <p className="text-xs text-slate-600 mt-1 pt-1 border-t border-slate-200/80">
                                  {choice.feedback}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Classify Items Activity */}
                  {currentChallenge.type === 'classify-items' && currentChallenge.categories && currentChallenge.draggableItems && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentChallenge.categories.map(cat => (
                          <div
                            key={cat.id}
                            className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 min-h-[120px]"
                          >
                            <div className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 pb-1 border-b border-slate-200">
                              {cat.label}
                            </div>
                            <div className="space-y-2">
                              {currentChallenge.draggableItems?.map(item => {
                                const selectedCat = userAnswers[currentChallenge.id]?.[item.id];
                                if (selectedCat !== cat.id) return null;
                                return (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs flex items-center justify-between gap-2"
                                  >
                                    <span>{item.text}</span>
                                    <button
                                      onClick={() => handleAssignCategory(currentChallenge.id, item.id, '')}
                                      className="text-slate-400 hover:text-rose-500 text-[10px] font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Items to sort */}
                      <div className="bg-amber-50/50 border border-amber-200/70 p-3.5 rounded-2xl">
                        <div className="text-xs font-bold text-amber-900 mb-2">
                          Click each item to assign its bucket:
                        </div>
                        <div className="space-y-2">
                          {currentChallenge.draggableItems.map(item => {
                            const assignedCat = userAnswers[currentChallenge.id]?.[item.id];
                            return (
                              <div
                                key={item.id}
                                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                              >
                                <span className="text-slate-800">{item.text}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {currentChallenge.categories?.map(cat => (
                                    <button
                                      key={cat.id}
                                      onClick={() => handleAssignCategory(currentChallenge.id, item.id, cat.id)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                        assignedCat === cat.id
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {cat.id === 'crit' ? 'Criteria' : cat.id === 'const' ? 'Constraint' : cat.label.slice(0, 10)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Steps Activity */}
                  {currentChallenge.type === 'order-steps' && currentChallenge.draggableItems && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Use the ▲ / ▼ arrows to arrange the items in the correct chronological sequence:
                      </p>
                      {(() => {
                        const items = currentChallenge.draggableItems;
                        const currentOrder: string[] = userAnswers[currentChallenge.id] || items.map(i => i.id);
                        return (
                          <div className="space-y-2">
                            {currentOrder.map((itemId, idx) => {
                              const item = items.find(i => i.id === itemId);
                              if (!item) return null;
                              return (
                                <div
                                  key={item.id}
                                  className="p-3 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-800">
                                      {item.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleMoveStep(currentChallenge.id, idx, 'up')}
                                      disabled={idx === 0}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      aria-label="Move item up"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      onClick={() => handleMoveStep(currentChallenge.id, idx, 'down')}
                                      disabled={idx === currentOrder.length - 1}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                      aria-label="Move item down"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Feedback Explanation Callout */}
                  {showFeedback[currentChallenge.id] && (
                    <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-950 flex items-start gap-2.5 animate-fade-in">
                      <HelpCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sky-900 mb-0.5">Explanation & Rationale</div>
                        <p>{currentChallenge.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ==================================================== */
            /* ANGRY BIRDS STYLE LEVEL COMPLETE SUMMARY & STARS */
            /* ==================================================== */
            <div className="py-4 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Level Clear!
              </div>

              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900">
                {finalStars === 3
                  ? 'Flawless 3-Star Mastery!'
                  : finalStars === 2
                  ? 'Great Work! 2 Stars Earned'
                  : finalStars === 1
                  ? 'Level Completed! 1 Star'
                  : 'Needs Another Try!'}
              </h2>

              {/* 3 Giant Animated Stars */}
              <div className="flex items-center justify-center gap-4 py-3">
                {[1, 2, 3].map(starNum => {
                  const isEarned = revealedStars >= starNum;
                  return (
                    <div key={starNum} className="relative">
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all ${
                          isEarned
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 shadow-xl shadow-amber-400/30 scale-105 animate-star-pop'
                            : 'bg-slate-100 text-slate-300'
                        }`}
                      >
                        <Star
                          className={`w-10 h-10 sm:w-12 sm:h-12 ${
                            isEarned ? 'fill-amber-900' : 'fill-slate-200 text-slate-300'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">
                        Star {starNum}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Score breakdown badge */}
              <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5">
                <span className="text-xs text-slate-500 font-medium">Evaluation Score:</span>
                <span className="font-display font-extrabold text-xl text-slate-900">
                  {finalScore}%
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  {finalStars}/3 Stars Added
                </span>
              </div>

              {/* Student Design Reflection */}
              <div className="max-w-md mx-auto text-left bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                <label
                  htmlFor="reflection-input"
                  className="block text-xs font-bold text-amber-950 uppercase tracking-wide"
                >
                  Student Journal Reflection (Optional for Classroom Turn-In)
                </label>
                <p className="text-xs text-slate-600">
                  {level.reflectionPrompt}
                </p>
                <div className="flex gap-2">
                  <input
                    id="reflection-input"
                    type="text"
                    value={reflectionText}
                    onChange={e => setReflectionText(e.target.value)}
                    placeholder="Type your design takeaway..."
                    className="w-full text-xs bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => {
                      onSaveProgress(level.id, finalStars, finalScore, reflectionText);
                      handleSound('click');
                    }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </div>

              {/* Stage Arcade Intermission Unlocked Card */}
              {((isStageCompleted || level.levelNumber === 3) && finalStars >= 1) && (() => {
                const stageArcadeGame = getArcadeGameForStage(level.stageId);
                return (
                  <div className="max-w-md mx-auto bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-rose-500/15 border-2 border-amber-500/80 rounded-2xl p-4 text-center space-y-2.5 shadow-md animate-fade-in">
                    <div className="flex items-center justify-center gap-2 text-amber-800 font-display font-black text-xs sm:text-sm uppercase tracking-wider">
                      <Gamepad2 className="w-5 h-5 text-amber-600 animate-pulse" />
                      <span>Stage {stage.index} Complete! Arcade Intermission Unlocked!</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">
                      You mastered Stage {stage.index} ({stage.name})! Take a 3-lives retro gaming break in <strong>{stageArcadeGame.title} ({stageArcadeGame.arcadeClassic})</strong> before the next stage.
                    </p>
                    <button
                      onClick={() => {
                        if (onLaunchStageArcade) {
                          onLaunchStageArcade(stageArcadeGame.id);
                          handleSound('slingshot');
                        }
                      }}
                      className="game-btn w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-display font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/30 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Play {stageArcadeGame.title} ({stageArcadeGame.arcadeClassic}) Intermission</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {!isCompleted ? (
            <>
              <button
                onClick={() => setCurrentChallengeIdx(prev => Math.max(0, prev - 1))}
                disabled={currentChallengeIdx === 0}
                className="game-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {currentChallengeIdx < totalChallenges - 1 ? (
                <button
                  onClick={() => {
                    setCurrentChallengeIdx(prev => prev + 1);
                    handleSound('click');
                  }}
                  disabled={!isCurrentChallengeAnswered() || timeLeft > 0}
                  className="game-btn px-5 py-2.5 rounded-xl text-xs font-display font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                >
                  {timeLeft > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Read & Think ({timeLeft}s)</span>
                    </>
                  ) : (
                    <>
                      <span>Next Challenge</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFinishLevel}
                  disabled={!isCurrentChallengeAnswered() || timeLeft > 0}
                  className="game-btn px-6 py-2.5 rounded-xl text-xs font-display font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-orange-500/20"
                >
                  {timeLeft > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Read & Think ({timeLeft}s)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit & Score Level</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => {
                  setIsCompleted(false);
                  setCurrentChallengeIdx(0);
                  handleSound('slingshot');
                }}
                className="game-btn px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay for 3 Stars</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="game-btn px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Return to Map
                </button>

                {((isStageCompleted || level.levelNumber === 3) && finalStars >= 1) ? (() => {
                  const stageArcadeGame = getArcadeGameForStage(level.stageId);
                  return (
                    <button
                      onClick={() => {
                        if (onLaunchStageArcade) {
                          onLaunchStageArcade(stageArcadeGame.id);
                          handleSound('slingshot');
                        } else if (onOpenNextLevel) {
                          onOpenNextLevel();
                          handleSound('slingshot');
                        }
                      }}
                      className="game-btn px-5 py-2.5 rounded-xl text-xs font-display font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-orange-500/30 animate-pulse hover:scale-105"
                    >
                      <Gamepad2 className="w-4 h-4 text-white" />
                      <span>Start Stage {stage.index} Arcade Intermission</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  );
                })() : onOpenNextLevel ? (
                  <button
                    onClick={() => {
                      onOpenNextLevel();
                      handleSound('slingshot');
                    }}
                    className="game-btn px-5 py-2.5 rounded-xl text-xs font-display font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <span>Next Level</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
