/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Award,
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Star,
  Sparkles,
  Trophy,
  ShieldCheck,
  Share2,
  Calendar,
  User,
  School,
  Lock
} from 'lucide-react';
import {
  LevelData,
  LevelProgress,
  DesignStageId,
  STAGES,
  calculateTotalStars,
  calculateStageProgress,
  generateCertificateCode,
  getGoogleClassroomShareUrl,
  getEarnedBadges,
  MIN_STARS_FOR_CERTIFICATE,
  ArcadeScores,
  ARCADE_GAMES,
  calculateTotalArcadeScore,
  isGoalReached as isGoalReachedHelper
} from '../utils/designQuestRules';

interface CertificateModalProps {
  onClose: () => void;
  levels: LevelData[];
  progress: Record<string, LevelProgress>;
  studentName: string;
  onUpdateStudentName: (name: string) => void;
  teacherEmail: string;
  arcadeScores: ArcadeScores;
  isTeacherVerifiedView?: boolean;
  verifiedStars?: number | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  onClose,
  levels,
  progress,
  studentName,
  onUpdateStudentName,
  teacherEmail,
  arcadeScores,
  isTeacherVerifiedView = false,
  verifiedStars = null
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [nameInput, setNameInput] = useState(studentName || '');
  const [directedNotice, setDirectedNotice] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync if prop updates
  useEffect(() => {
    if (studentName && !nameInput) {
      setNameInput(studentName);
    }
  }, [studentName]);

  const baseStars = calculateTotalStars(progress);
  const totalStars = verifiedStars ? Math.max(verifiedStars, baseStars) : baseStars;
  const isQuestComplete = Boolean(progress['lvl-5-3']?.completed && (progress['lvl-5-3']?.stars || 0) >= 1);
  const isGoalReached = totalStars >= MIN_STARS_FOR_CERTIFICATE || isQuestComplete || isGoalReachedHelper(progress, levels) || Boolean(isTeacherVerifiedView);
  const earnedBadges = getEarnedBadges(progress, levels);

  // Formatted current date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const certificateCode = generateCertificateCode(
    studentName || 'Student',
    totalStars,
    1730000000
  );

  const appUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://designquest.app';
  
  const stageIds: DesignStageId[] = ['ask', 'research', 'brainstorm', 'prototype', 'present'];
  const stageStars = stageIds.map(stId => calculateStageProgress(stId, progress, levels).starsEarned);

  const classroomShareUrl = getGoogleClassroomShareUrl(
    appUrl,
    certificateCode,
    studentName || 'Student',
    totalStars,
    {
      arcadeScores,
      stageStars
    }
  );

  const handleDirectToClassroom = async () => {
    const trimmed = (nameInput || studentName || '').trim();
    if (!trimmed || trimmed === 'Nicholas Hanner' || trimmed === 'Student') {
      const entered = window.prompt(
        'Please type your first and last name for your official certificate:',
        trimmed === 'Nicholas Hanner' ? '' : trimmed
      );
      if (!entered || !entered.trim()) {
        alert('Please enter your full name so your certificate is made out to you before attaching to Google Classroom!');
        return;
      }
      setNameInput(entered.trim());
      onUpdateStudentName(entered.trim());
    } else {
      onUpdateStudentName(trimmed);
    }

    try {
      const text = getSubmissionTextReport();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }
    } catch {
      // ignore
    }

    const currentName = (nameInput || studentName || 'Student').trim();
    const currentCode = generateCertificateCode(currentName, totalStars, 1730000000);
    const targetUrl = getGoogleClassroomShareUrl(
      appUrl,
      currentCode,
      currentName,
      totalStars,
      { arcadeScores, stageStars }
    );

    setDirectedNotice(true);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Prepare full turn-in report text
  const getSubmissionTextReport = () => {
    const askProg = calculateStageProgress('ask', progress, levels);
    const resProg = calculateStageProgress('research', progress, levels);
    const brProg = calculateStageProgress('brainstorm', progress, levels);
    const prProg = calculateStageProgress('prototype', progress, levels);
    const psProg = calculateStageProgress('present', progress, levels);

    const reflections = (levels || [])
      .map(l => {
        const p = progress && progress[l.id];
        return p?.reflectionAnswer ? `• [${l.code} ${l.title}]: "${p.reflectionAnswer}"` : null;
      })
      .filter(Boolean)
      .join('\n');

    const totalArcade = calculateTotalArcadeScore(arcadeScores);
    const arcadeBreakdown = (Object.keys(ARCADE_GAMES) as (keyof ArcadeScores)[])
      .map(k => `• ${ARCADE_GAMES[k].title} (${ARCADE_GAMES[k].arcadeClassic}): ${(arcadeScores && arcadeScores[k]) || 0} pts`)
      .join('\n');

    return `🎓 DESIGNQUEST: ENGINEERING DESIGN PROCESS CERTIFICATE OF ACHIEVEMENT
Student Name: ${studentName || 'Student'}
Date Completed: ${formattedDate}
Certificate Code: ${certificateCode}
Total Stars Earned: ${totalStars} / ${levels.length * 3} Stars
Status: ${isGoalReached ? 'GOAL ACHIEVED (Official Certificate Unlocked)' : 'IN PROGRESS'}

STAGE MASTERY BREAKDOWN:
1. Ask & Identify Problem: ${askProg.starsEarned}/9 Stars (${askProg.percentage}%)
2. Research the Problem: ${resProg.starsEarned}/9 Stars (${resProg.percentage}%)
3. Brainstorm Solutions: ${brProg.starsEarned}/9 Stars (${brProg.percentage}%)
4. Prototype & Test Ideas: ${prProg.starsEarned}/9 Stars (${prProg.percentage}%)
5. Present & Pitch: ${psProg.starsEarned}/9 Stars (${psProg.percentage}%)

RETRO ARCADE INTERMISSION HIGH SCORES (Total: ${totalArcade} pts):
${arcadeBreakdown}

EARNED BADGES:
${earnedBadges.map(b => `• ${b.title}: ${b.description}`).join('\n') || '• In Progress'}

STUDENT DESIGN REFLECTIONS:
${reflections || '• No written reflections recorded yet.'}

Verification Link: ${appUrl}?cert=${certificateCode}`;
  };

  const handleCopyReport = async () => {
    const text = getSubmissionTextReport();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      // Fallback for iframe / permission-restricted contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  // High-Res Canvas Image Generation for PNG Download
  const handleDownloadImage = () => {
    setIsGeneratingPng(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 840);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#fef3c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 840);

      // Gold Ornate Borders
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 14;
      ctx.strokeRect(24, 24, 1152, 792);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.strokeRect(38, 38, 1124, 764);

      // Corner Accents
      ctx.fillStyle = '#b45309';
      ctx.fillRect(24, 24, 30, 30);
      ctx.fillRect(1146, 24, 30, 30);
      ctx.fillRect(24, 786, 30, 30);
      ctx.fillRect(1146, 786, 30, 30);

      // Header Tagline
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GOOGLE CLASSROOM STEM ENGINEERING VERIFICATION', 600, 90);

      // Main Title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 46px sans-serif';
      ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 600, 150);

      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 20px sans-serif';
      ctx.fillText('This certifies that', 600, 200);

      // Student Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText(studentName || 'Student Engineer', 600, 270);

      // Underline
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(350, 290);
      ctx.lineTo(850, 290);
      ctx.stroke();

      // Body text
      ctx.fillStyle = '#334155';
      ctx.font = '20px sans-serif';
      ctx.fillText(
        'has successfully demonstrated mastery across the 5 Core Stages of the',
        600,
        340
      );
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.fillText(
        'Engineering Design Process: Ask, Research, Brainstorm, Prototype, and Present',
        600,
        380
      );

      // Stars and Metrics Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(160, 410, 880, 190, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`★ Total Stars Earned: ${totalStars} / ${levels.length * 3} ★`, 600, 450);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(
        'Stages Mastered: 1. Ask  •  2. Research  •  3. Brainstorm  •  4. Prototype  •  5. Present',
        600,
        485
      );

      // Retro Arcade High Scores Line
      const totalArcade = calculateTotalArcadeScore(arcadeScores);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#b45309';
      ctx.fillText(
        `🎮 RETRO ARCADE INTERMISSION HIGH SCORES (Total: ${totalArcade} pts)`,
        600,
        525
      );
      ctx.font = '14px monospace';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(
        `Invaders: ${arcadeScores.space_invaders || 0}  |  DigDug: ${arcadeScores.dig_dug || 0}  |  Tetris: ${arcadeScores.tetris || 0}  |  OutRun: ${arcadeScores.outrun || 0}  |  Archery: ${arcadeScores.archery || 0}`,
        600,
        560
      );

      // Signatures and Date Footer
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Date: ${formattedDate}`, 120, 690);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`Verification Code: ${certificateCode}`, 120, 720);

      ctx.textAlign = 'right';
      ctx.font = 'italic bold 22px cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Nicholas Hanner, Instructor', 1080, 675);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(850, 685);
      ctx.lineTo(1080, 685);
      ctx.stroke();
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Engineering Design & Technology Education', 1080, 710);

      // Download trigger
      const link = document.createElement('a');
      link.download = `DesignQuest_Certificate_${studentName.replace(/\s+/g, '_') || 'Student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // ignore
    } finally {
      setIsGeneratingPng(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border-4 border-slate-100 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">
                Certificate of Achievement & Google Classroom Submission
              </h2>
              <p className="text-xs text-slate-300">
                Official verified record for your design thinking portfolio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close certificate modal"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* TEACHER VERIFIED MODE BANNER (When opened from Google Classroom submission link) */}
          {isTeacherVerifiedView ? (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-400">
                      Official Teacher Verification Mode
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800">{certificateCode}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-950 mt-1">
                    Student: <span className="underline font-extrabold">{studentName || 'Student'}</span> • {totalStars} / {levels.length * 3} Stars Earned
                  </div>
                  <p className="text-xs text-emerald-800/90 mt-0.5">
                    Authenticated from Google Classroom assignment submission. All earned stars and stage achievements are verified.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingPng}
                  className="game-btn bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="game-btn bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>
          ) : (
            /* STUDENT NAME ENTRY & GOOGLE CLASSROOM DIRECT TURN-IN CARD */
            <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-amber-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>Type Your Full Name for the Official Certificate</span>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </h3>
                    <p className="text-xs text-slate-600">
                      Enter your first and last name so it appears on your official engineering diploma and Google Classroom turn-in.
                    </p>
                  </div>
                </div>
                {studentName.trim() && studentName !== 'Nicholas Hanner' && studentName !== 'Student' && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Name Confirmed
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => {
                      setNameInput(e.target.value);
                      onUpdateStudentName(e.target.value);
                    }}
                    onBlur={() => {
                      if (nameInput.trim()) onUpdateStudentName(nameInput.trim());
                    }}
                    placeholder="Type your full name (e.g. Alex Rivera, Maya Lin)..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none shadow-xs"
                  />
                </div>
                <button
                  onClick={handleDirectToClassroom}
                  className="game-btn px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 whitespace-nowrap cursor-pointer hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Attach to Google Classroom</span>
                </button>
              </div>

              {directedNotice && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl p-2.5 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ✓ Directed to Google Classroom! Select your class and click <strong>Attach</strong> to submit your certificate. All your <strong>{totalStars} stars</strong> and arcade high scores are securely saved in the link so your teacher will see them!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Goal Status Callout Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isGoalReached
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isGoalReached ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                }`}
              >
                {isGoalReached ? <ShieldCheck className="w-6 h-6" /> : <Star className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-bold text-sm">
                  {isGoalReached
                    ? 'Official Certificate Goal Reached!'
                    : `In Progress: ${totalStars} / ${MIN_STARS_FOR_CERTIFICATE} Stars Collected`}
                </div>
                <p className="text-xs opacity-90">
                  {isGoalReached
                    ? 'You have earned sufficient stars across the 5 design stages to claim your verifiable diploma.'
                    : `Earn at least ${MIN_STARS_FOR_CERTIFICATE} stars or complete Stage 5-3 to officially certify completion. You can still preview and download.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{totalStars} / {levels.length * 3} Stars</span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* THE PRINTABLE CERTIFICATE CANVAS / CONTAINER */}
          {/* ==================================================== */}
          <div
            id="certificate-print-area"
            className="relative bg-gradient-to-b from-amber-50/70 via-white to-amber-50/70 border-8 border-amber-600/80 rounded-3xl p-6 sm:p-10 shadow-lg text-center overflow-hidden"
          >
            {/* Inner filigree border */}
            <div className="absolute inset-2 border-2 border-amber-400/80 rounded-2xl pointer-events-none" />

            {/* Corner Badges */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-amber-700 pointer-events-none" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-amber-700 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-amber-700 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-amber-700 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-800 flex items-center justify-center gap-2">
                <School className="w-4 h-4" />
                <span>Google Classroom STEM Engineering Curriculum</span>
              </div>

              <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight">
                CERTIFICATE OF ACHIEVEMENT
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 italic">
                This certifies that
              </p>

              <div className="py-1">
                <span className="font-display font-extrabold text-2xl sm:text-4xl text-slate-950 border-b-2 border-amber-500 pb-1 px-6 inline-block">
                  {studentName || 'Student Engineer'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed">
                has successfully investigated, designed, and mastered the 5 core stages of the{' '}
                <strong className="text-amber-900 font-bold">
                  Engineering Design Process
                </strong>
                : Asking the Problem, Researching Evidence, Brainstorming Solutions, Rapid Prototyping, and Presenting Ideas.
              </p>

              {/* Star Rating Badge Box */}
              <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/90 border-2 border-amber-200 rounded-2xl px-6 py-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span className="font-display font-extrabold text-xl text-slate-900">
                    {totalStars} / {levels.length * 3}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">Stars Earned</span>
                </div>

                <div className="hidden sm:block w-px h-6 bg-slate-200" />

                <div className="text-xs text-slate-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold text-slate-800">{certificateCode}</span>
                </div>
              </div>

              {/* Stage Progress Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                {(['ask', 'research', 'brainstorm', 'prototype', 'present'] as const).map(stageId => {
                  const stageInfo = STAGES[stageId];
                  const prog = calculateStageProgress(stageId, progress, levels);
                  return (
                    <div
                      key={stageId}
                      className="bg-white/80 border border-slate-200 rounded-xl p-2 text-center"
                    >
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        {stageInfo.shortName}
                      </div>
                      <div className="font-display font-bold text-sm text-slate-800 flex items-center justify-center gap-0.5">
                        <span>{prog.starsEarned}/9</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Retro Arcade Intermission High Scores */}
              <div className="bg-slate-900/90 text-white rounded-2xl p-3 border-2 border-amber-400/60 shadow-inner mt-2">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <span>🎮 Retro STEM Arcade High Scores</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">
                    Total Arcade Points: <strong className="text-amber-400">{calculateTotalArcadeScore(arcadeScores)}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
                    <div className="text-[10px] text-amber-300 font-semibold truncate">👾 Invaders</div>
                    <div className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
                      {arcadeScores.space_invaders || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
                    <div className="text-[10px] text-blue-300 font-semibold truncate">⛏ Dig Dug</div>
                    <div className="font-mono font-bold text-blue-400 text-xs sm:text-sm">
                      {arcadeScores.dig_dug || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
                    <div className="text-[10px] text-purple-300 font-semibold truncate">🧱 Tetris</div>
                    <div className="font-mono font-bold text-purple-400 text-xs sm:text-sm">
                      {arcadeScores.tetris || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
                    <div className="text-[10px] text-emerald-300 font-semibold truncate">🏎 OutRun</div>
                    <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                      {arcadeScores.outrun || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl p-1.5 border border-slate-700">
                    <div className="text-[10px] text-rose-300 font-semibold truncate">🎯 Archery</div>
                    <div className="font-mono font-bold text-rose-400 text-xs sm:text-sm">
                      {arcadeScores.archery || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & Verification */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-xs text-slate-600 border-t border-amber-200/80 mt-4">
                <div className="text-left">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date: {formattedDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    AH-Schools Engineering Design
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif italic font-bold text-base text-indigo-950">
                    Nicholas Hanner
                  </div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-300 pt-0.5 inline-block">
                    Instructor Signature & Verification
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* GOOGLE CLASSROOM DIRECT SUBMISSION ACTIONS */}
          {/* ==================================================== */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>Share & Turn In Status for Google Classroom:</span>
            </div>

            {/* Certificate Lock Notice (Only if neither 38 stars nor level 5-3 completed) */}
            {!isGoalReached && (
              <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Printing Locked (Complete Level 5-3 or Earn 38 Stars):</span> Official certificate printing and PNG export unlock once you finish all 5 stages (Level 5-3) or collect at least 38 stars.
                  <div className="mt-1 font-semibold text-amber-800">
                    Current Progress: <span className="font-bold text-slate-900">{totalStars} / 38 Stars</span> ({Math.max(0, 38 - totalStars)} more stars needed)
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600">
              {isGoalReached
                ? 'Official Diploma Unlocked! Attach directly to Google Classroom (your stars and high scores are embedded in the link so your teacher sees them), or download your high-res certificate image.'
                : 'Complete Stage 5-3 or earn 38 stars to unlock official certificate printing and PNG download.'}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {/* Direct Google Classroom Share Link */}
              <button
                onClick={handleDirectToClassroom}
                className="game-btn bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-display font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:scale-105"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Turn In to Google Classroom</span>
              </button>

              {/* PNG Download Button - Locked until 38 stars */}
              <button
                onClick={handleDownloadImage}
                disabled={isGeneratingPng || !isGoalReached}
                className={`game-btn px-4 py-2.5 rounded-xl font-display font-semibold text-xs flex items-center gap-2 shadow-xs ${
                  isGoalReached
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                }`}
                title={isGoalReached ? 'Download high-res certificate image' : 'Earn 38 stars to unlock image download'}
              >
                {isGoalReached ? (
                  <Download className="w-4 h-4 text-amber-600" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {isGeneratingPng
                    ? 'Generating PNG...'
                    : isGoalReached
                    ? 'Download Certificate PNG'
                    : `PNG Locked (${totalStars}/38★)`}
                </span>
              </button>

              {/* Copy Submission Report Text */}
              <button
                onClick={handleCopyReport}
                className="game-btn bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-2.5 rounded-xl font-display font-semibold text-xs flex items-center gap-2 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-600" />
                    <span>Copy Text Report</span>
                  </>
                )}
              </button>

              {/* Print / Save as PDF - Locked until 38 stars */}
              <button
                onClick={handlePrint}
                disabled={!isGoalReached}
                className={`game-btn px-4 py-2.5 rounded-xl font-display font-semibold text-xs flex items-center gap-2 shadow-xs ${
                  isGoalReached
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                }`}
                title={isGoalReached ? 'Print Certificate' : 'Earn 38 stars to unlock printing'}
              >
                {isGoalReached ? (
                  <Printer className="w-4 h-4 text-slate-600" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
                <span>{isGoalReached ? 'Print / Save PDF' : `Print Locked (${totalStars}/38★)`}</span>
              </button>
            </div>

            {/* Expandable Submission Text Box for easy manual selection & verification */}
            <div className="pt-2">
              <details className="text-xs group">
                <summary className="font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer select-none">
                  ▶ View Raw Submission Report Text (for manual copy & paste)
                </summary>
                <div className="mt-2 p-3 bg-white rounded-xl border border-slate-300 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto select-all shadow-inner">
                  {getSubmissionTextReport()}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="game-btn px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
