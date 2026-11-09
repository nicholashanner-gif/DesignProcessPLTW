/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trophy,
  Heart,
  RotateCcw,
  Sparkles,
  Gamepad2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Target,
  Clock,
  Zap,
  Play,
  Lock
} from 'lucide-react';
import {
  ArcadeGameId,
  ArcadeScores,
  ARCADE_GAMES,
  playSynthSound,
  calculateInvaderAccuracy,
  getInvaderAccuracyBonus,
  isChallengeRound,
  getChallengeStageBonus,
  getWaveShipConfigs
} from '../utils/designQuestRules';

interface ArcadeGamesModalProps {
  initialGameId?: ArcadeGameId;
  onClose: () => void;
  scores: ArcadeScores;
  onUpdateHighScore: (gameId: ArcadeGameId, newScore: number) => void;
  soundEnabled: boolean;
  certificateUnlocked?: boolean;
  attempts?: Record<ArcadeGameId, number>;
  onRecordAttempt?: (gameId: ArcadeGameId) => void;
  onOpenCertificate?: () => void;
}

export const ArcadeGamesModal: React.FC<ArcadeGamesModalProps> = ({
  initialGameId = 'space_invaders',
  onClose,
  scores,
  onUpdateHighScore,
  soundEnabled,
  certificateUnlocked = false,
  attempts = { space_invaders: 0, dig_dug: 0, tetris: 0, outrun: 0, archery: 0 },
  onRecordAttempt,
  onOpenCertificate
}) => {
  const [activeGameId, setActiveGameId] = useState<ArcadeGameId>(initialGameId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extra HUD states for game-specific feedback
  const [waveNumber, setWaveNumber] = useState(1);
  const [invaderAccuracy, setInvaderAccuracy] = useState(100);
  const [digDugTimeLeft, setDigDugTimeLeft] = useState(120);
  const [tetrisLinesCleared, setTetrisLinesCleared] = useState(0);
  const [archeryDistance, setArcheryDistance] = useState<'near' | 'mid' | 'far'>('mid');
  const [archeryAngle, setArcheryAngle] = useState(42);
  const [outrunBoostCharges, setOutrunBoostCharges] = useState(0);
  const [outrunFuelsCount, setOutrunFuelsCount] = useState(0);
  const [outrunIsBoosting, setOutrunIsBoosting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  const currentGame = ARCADE_GAMES[activeGameId];

  // Sound helper
  const handleSound = (type: 'slingshot' | 'star' | 'victory' | 'correct' | 'wrong' | 'click') => {
    if (soundEnabled) playSynthSound(type);
  };

  // Switch game tab
  const handleSelectGame = (gameId: ArcadeGameId) => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setActiveGameId(gameId);
    setIsPlaying(false);
    setGameOver(false);
    setCurrentScore(0);
    setLives(3);
    setWaveNumber(1);
    setInvaderAccuracy(100);
    setDigDugTimeLeft(120);
    setTetrisLinesCleared(0);
    setOutrunBoostCharges(0);
    setOutrunFuelsCount(0);
    setOutrunIsBoosting(false);
  };

  // Keyboard controls handler
  const keysPressed = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // -------------------------------------------------------------
  // GAME ENGINE: Runs the selected retro game on the canvas
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let canvasDismissTriggered = false;
    const handleCanvasPointer = () => {
      canvasDismissTriggered = true;
    };
    canvas.addEventListener('pointerdown', handleCanvasPointer);

    let localLives = 3;
    let localScore = 0;
    let isEnded = false;

    // Finish game helper
    const triggerGameOver = () => {
      if (isEnded) return;
      isEnded = true;
      setGameOver(true);
      setIsPlaying(false);
      handleSound('wrong');
      onUpdateHighScore(activeGameId, Math.max(localScore, scores[activeGameId] || 0));
    };

    // -----------------------------------------------------------
    // 1. SPACE INVADERS / GALAGA (Stage 1: Problem Invaders)
    // -----------------------------------------------------------
    if (activeGameId === 'space_invaders') {
      let playerX = canvas.width / 2;
      const playerY = canvas.height - 35;
      const playerSpeed = 6.2;
      let bullets: { x: number; y: number; active: boolean }[] = [];
      let alienLasers: { x: number; y: number; active: boolean; vy: number }[] = [];
      let alienBombs: { id: number; x: number; y: number; vy: number; radius: number; fuse: number; active: boolean }[] = [];
      let explosions: { x: number; y: number; radius: number; maxRadius: number; color: string; life: number; isMidAir?: boolean }[] = [];
      let floatTexts: { text: string; x: number; y: number; color: string; life: number; vy: number }[] = [];

      let lastShot = 0;
      let lastAlienShot = 0;
      let lastBombDrop = 0;
      let lastDivebombTime = 0;
      let playerInvulnerableUntil = 1500;
      let currentWave = 1;
      let waveDialogActive = true;
      let waveDialogStartTime = 0;
      const WAVE_DIALOG_DURATION = 3200;
      let waveDialogTitle = '⚡ WAVE 1 • ALIEN FLEET ASSAULT ⚡';
      let waveDialogSub = 'Blast alien ships & shoot bombs before they detonate!';
      let waveDialogTip = '🎯 Aim for >70% accuracy for bonus • Divebombers award 2x points!';

      // Accuracy Tracking
      let shotsFired = 0;
      let shotsHit = 0;

      // Challenge Round Tracking (Every 3rd wave: 3, 6, 9...)
      let challengeTargetsTotal = 18;
      let challengeTargetsHit = 0;
      let challengeEndTime = 0;

      interface Invader {
        id: number;
        x: number;
        y: number;
        gridRow: number;
        gridCol: number;
        alive: boolean;
        type: 'mothership' | 'crab' | 'stinger' | 'bomber' | 'interceptor' | 'quantum' | 'plasma_titan' | 'phantom_raider' | 'comet_striker' | 'phoenix' | 'aero_dart' | 'solar_orb';
        name: string;
        points: number;
        color: string;
        accentColor: string;
        canBomb: boolean;
        // Divebombing mechanics (Galaga-style)
        isDivebombing: boolean;
        diveStartX: number;
        diveStartY: number;
        diveProgress: number; // 0 to 1
        diveSpeed: number;
        diveSide: number; // 1 or -1
        diveHasShot: boolean;
        // Challenge Stage Acrobatic Movement
        isChallengeTarget?: boolean;
        challengeSquad?: number;
        challengeFlightTime?: number;
        challengeBaseY?: number;
        challengeDir?: number;
      }

      // Spawn Fleet or Challenge Squad
      const spawnWaveFleet = (wave: number): Invader[] => {
        const list: Invader[] = [];
        const isChallenge = isChallengeRound(wave);

        if (isChallenge) {
          challengeTargetsHit = 0;
          challengeTargetsTotal = 18;
          challengeEndTime = 0;
          // Challenge Stage: 18 acrobatic drones across 3 squads
          const configs = getWaveShipConfigs(wave);
          const squadConfigs = [configs.row0, configs.row1, configs.row2];

          for (let squad = 0; squad < 3; squad++) {
            const conf = squadConfigs[squad];
            for (let i = 0; i < 6; i++) {
              list.push({
                id: squad * 6 + i,
                x: squad % 2 === 0 ? -40 - i * 45 : canvas.width + 40 + i * 45,
                y: 50 + squad * 45,
                gridRow: squad,
                gridCol: i,
                alive: true,
                type: conf.type,
                name: conf.name,
                points: conf.points,
                color: conf.color,
                accentColor: conf.accentColor,
                canBomb: false,
                isDivebombing: false,
                diveStartX: 0,
                diveStartY: 0,
                diveProgress: 0,
                diveSpeed: 0.008,
                diveSide: 1,
                diveHasShot: false,
                isChallengeTarget: true,
                challengeSquad: squad,
                challengeFlightTime: -squad * 1400 - i * 180, // Staggered entry
                challengeBaseY: 65 + squad * 55,
                challengeDir: squad % 2 === 0 ? 1 : -1
              });
            }
          }
          return list;
        }

        // Regular Combat Fleet (3 distinct rows of 6 ships)
        const rowConfigs = getWaveShipConfigs(wave);
        const configs = [rowConfigs.row0, rowConfigs.row1, rowConfigs.row2];
        const waveScale = Math.pow(1.10, wave - 1);

        for (let r = 0; r < 3; r++) {
          const cfg = configs[r];
          for (let c = 0; c < 6; c++) {
            list.push({
              id: r * 6 + c,
              x: 55 + c * 82,
              y: 45 + r * 44, // Distinct 3-row grid: y = 45, 89, 133
              gridRow: r,
              gridCol: c,
              alive: true,
              type: cfg.type,
              name: cfg.name,
              points: Math.round(cfg.points * waveScale),
              color: cfg.color,
              accentColor: cfg.accentColor,
              canBomb: cfg.canBomb,
              isDivebombing: false,
              diveStartX: 0,
              diveStartY: 0,
              diveProgress: 0,
              diveSpeed: 0.007,
              diveSide: 1,
              diveHasShot: false
            });
          }
        }
        return list;
      };

      let invaders: Invader[] = spawnWaveFleet(1);
      let fleetDirection = 1;

      // Draw Invader Helper with 11 Retro Vector Art Sprites
      const renderInvaderSprite = (inv: Invader, cx: number, cy: number, timeVal: number) => {
        ctx.save();
        ctx.translate(cx, cy);

        // Tilt sprite slightly if divebombing before reaching 2/3 distance
        if (inv.isDivebombing) {
          if (cy < 280) {
            const bankAngle = Math.max(-0.35, Math.min(0.35, (playerX - cx) * 0.0035));
            ctx.rotate(bankAngle);
          }
          // Once cy >= 280 (2/3 distance), angle is 0 (pointing straight down)
        }

        if (inv.type === 'mothership') {
          // Command Cruiser UFO
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.beginPath();
          ctx.arc(0, -3, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(-17, -3, 4, 7);
          ctx.fillRect(13, -3, 4, 7);
        } else if (inv.type === 'crab') {
          // Alien Crab Scout
          const clawOffset = Math.sin(timeVal * 0.007) * 3;
          ctx.fillStyle = inv.color;
          ctx.fillRect(-11, -7, 22, 14);
          ctx.fillRect(-9, -12, 3, 6);
          ctx.fillRect(6, -12, 3, 6);
          ctx.fillRect(-17 - clawOffset, -4, 6, 10);
          ctx.fillRect(11 + clawOffset, -4, 6, 10);
          ctx.fillStyle = inv.accentColor;
          ctx.fillRect(-7, -2, 4, 4);
          ctx.fillRect(3, -2, 4, 4);
        } else if (inv.type === 'stinger') {
          // Stinger Fighter
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 12);
          ctx.lineTo(-15, -9);
          ctx.lineTo(15, -9);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.beginPath();
          ctx.arc(0, -2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (inv.type === 'bomber') {
          // Heavy Dreadnought Bomber (Orange/Crimson armored hull + glowing bomb bay)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(-18, -8);
          ctx.lineTo(18, -8);
          ctx.lineTo(14, 8);
          ctx.lineTo(6, 13);
          ctx.lineTo(-6, 13);
          ctx.lineTo(-14, 8);
          ctx.closePath();
          ctx.fill();
          // Glowing Bomb Bay core
          ctx.fillStyle = inv.accentColor;
          ctx.beginPath();
          ctx.arc(0, 3, 5 + Math.sin(timeVal * 0.01) * 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Wing pylons
          ctx.fillStyle = '#f87171';
          ctx.fillRect(-18, -3, 4, 8);
          ctx.fillRect(14, -3, 4, 8);
        } else if (inv.type === 'interceptor') {
          // Stealth Interceptor (Violet chevron stealth wings)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 14);
          ctx.lineTo(17, -11);
          ctx.lineTo(7, -6);
          ctx.lineTo(0, -11);
          ctx.lineTo(-7, -6);
          ctx.lineTo(-17, -11);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.fillRect(-2, -3, 4, 9);
        } else if (inv.type === 'quantum') {
          // Quantum Swarmer (Hexagonal electric drone)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const ang = (a * Math.PI) / 3;
            const px = Math.cos(ang) * 12;
            const py = Math.sin(ang) * 12;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = inv.accentColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (inv.type === 'plasma_titan') {
          // Plasma Titan (Heavy battlecruiser with ruby plasma exhausts)
          ctx.fillStyle = inv.color;
          ctx.fillRect(-16, -9, 32, 12);
          ctx.fillRect(-10, 3, 20, 8);
          ctx.fillStyle = inv.accentColor;
          ctx.fillRect(-6, -14, 12, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-14, 4, 3, 6);
          ctx.fillRect(11, 4, 3, 6);
        } else if (inv.type === 'phantom_raider') {
          // Phantom Raider (Neon cyan & indigo delta wing)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 13);
          ctx.lineTo(19, -4);
          ctx.lineTo(12, -10);
          ctx.lineTo(-12, -10);
          ctx.lineTo(-19, -4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (inv.type === 'comet_striker') {
          // Comet Striker (White razor dart)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 14);
          ctx.lineTo(-13, -11);
          ctx.lineTo(0, -6);
          ctx.lineTo(13, -11);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.fillRect(-2, -5, 4, 11);
        } else if (inv.type === 'phoenix') {
          // Golden Phoenix (Challenge Stage target)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 14);
          ctx.lineTo(18, -6);
          ctx.lineTo(12, -12);
          ctx.lineTo(4, -7);
          ctx.lineTo(0, -12);
          ctx.lineTo(-4, -7);
          ctx.lineTo(-12, -12);
          ctx.lineTo(-18, -6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.beginPath();
          ctx.arc(0, -1, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (inv.type === 'aero_dart') {
          // Aero Dart (Challenge Stage target)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.moveTo(0, 15);
          ctx.lineTo(14, -10);
          ctx.lineTo(0, -4);
          ctx.lineTo(-14, -10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inv.accentColor;
          ctx.fillRect(-2, 0, 4, 8);
        } else {
          // Solar Energy Orb (Challenge Stage target)
          ctx.fillStyle = inv.color;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = inv.accentColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      const loop = (time: number) => {
        // Clear
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Starfield
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
          const sx = (Math.sin(i * 99 + time * 0.001) * 0.5 + 0.5) * canvas.width;
          const sy = ((time * 0.08 + i * 40) % canvas.height);
          ctx.fillRect(sx, sy, 2, 2);
        }

        // Wave speed scaling: 10% faster each round
        const speedScale = Math.pow(1.10, currentWave - 1);
        const invaderMoveSpeed = 1.05 * speedScale;
        const alienShotInterval = Math.max(340, 1350 / speedScale);
        const alienLaserSpeed = 3.3 * speedScale;
        const isChallenge = isChallengeRound(currentWave);

        // ========================================================
        // DIALOG SCREEN: PAUSES THE GAME IN THE BACKGROUND
        // Game freezes until dialog is dismissed by player or timer!
        // ========================================================
        if (waveDialogActive) {
          if (waveDialogStartTime === 0) {
            waveDialogStartTime = time;
          }

          const elapsedDialog = time - waveDialogStartTime;
          const timeLeftSec = Math.max(0, Math.ceil((WAVE_DIALOG_DURATION - elapsedDialog) / 1000));
          const progressFraction = Math.min(1, elapsedDialog / WAVE_DIALOG_DURATION);

          const userDismissed =
            canvasDismissTriggered ||
            keysPressed.current[' '] ||
            keysPressed.current['Enter'] ||
            keysPressed.current['TouchAction'];

          if (userDismissed || elapsedDialog >= WAVE_DIALOG_DURATION) {
            waveDialogActive = false;
            canvasDismissTriggered = false;
            if (keysPressed.current[' ']) keysPressed.current[' '] = false;
            if (keysPressed.current['TouchAction']) keysPressed.current['TouchAction'] = false;
            handleSound('star');

            // Grace period: alien shots, bombs, and divebombers don't immediately attack on unpause
            lastShot = time;
            lastAlienShot = time + 700;
            lastBombDrop = time + 1400;
            lastDivebombTime = time + 2800;
            playerInvulnerableUntil = time + 1500;
          } else {
            // Draw Player Cannon in frozen position
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(playerX, playerY - 18);
            ctx.lineTo(playerX - 18, playerY + 12);
            ctx.lineTo(playerX + 18, playerY + 12);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(playerX - 3, playerY - 24, 6, 8);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(playerX - 14, playerY + 8, 5, 4);
            ctx.fillRect(playerX + 9, playerY + 8, 5, 4);

            // Draw Alien spaceships in frozen grid formation
            invaders.forEach(inv => {
              if (inv.alive) renderInvaderSprite(inv, inv.x, inv.y, time);
            });

            // Draw Top HUD Bar
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            if (isChallenge) {
              ctx.fillStyle = '#fbbf24';
              ctx.fillText(`⭐ CHALLENGE ROUND ${currentWave} • TARGETS: ${challengeTargetsHit}/${challengeTargetsTotal}`, 15, 20);
            } else {
              ctx.fillText(`ROUND / WAVE ${currentWave} (+${Math.round((speedScale - 1) * 100)}% SPD)`, 15, 20);
            }
            ctx.textAlign = 'right';
            const currentAccuracy = calculateInvaderAccuracy(shotsFired, shotsHit);
            if (currentAccuracy >= 70) {
              ctx.fillStyle = '#10b981';
              ctx.fillText(`🎯 ACCURACY: ${currentAccuracy}% (>70% BONUS ACTIVE)`, canvas.width - 15, 20);
            } else {
              ctx.fillStyle = '#f59e0b';
              ctx.fillText(`ACCURACY: ${currentAccuracy}% (70% GOAL)`, canvas.width - 15, 20);
            }

            // Draw Dialog Card Screen (Centered, clear, readable, pauses background)
            ctx.save();
            ctx.fillStyle = 'rgba(6, 10, 20, 0.72)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cardW = 470;
            const cardH = 148;
            const cardX = (canvas.width - cardW) / 2;
            const cardY = (canvas.height - cardH) / 2 - 10;

            // Card body & neon border
            ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeStyle = isChallenge ? '#fbbf24' : '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            // Dialog Badge / Wave Title
            ctx.fillStyle = isChallenge ? '#fbbf24' : '#f59e0b';
            ctx.font = 'black 17px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(waveDialogTitle, canvas.width / 2, cardY + 34);

            // Subtitle / Mission Brief
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(waveDialogSub, canvas.width / 2, cardY + 62);

            // Strategy Pro-Tip
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.fillText(waveDialogTip, canvas.width / 2, cardY + 84);

            // Pulsing Dismiss Action Prompt
            const pulse = Math.sin(time * 0.008) * 0.5 + 0.5;
            ctx.fillStyle = pulse > 0.4 ? '#38bdf8' : '#7dd3fc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`▶ PRESS [SPACE] OR CLICK SCREEN TO START (${timeLeftSec}s)`, canvas.width / 2, cardY + 114);

            // Progress bar
            ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
            ctx.fillRect(cardX + 24, cardY + cardH - 12, cardW - 48, 5);
            ctx.fillStyle = isChallenge ? '#f59e0b' : '#38bdf8';
            ctx.fillRect(cardX + 24, cardY + cardH - 12, (cardW - 48) * (1 - progressFraction), 5);

            ctx.restore();

            // Loop continues to animate the dialog prompt, but NO gameplay updates occur!
            if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
            return;
          }
        }

        // Player Controls
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) {
          playerX = Math.max(30, playerX - playerSpeed);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) {
          playerX = Math.min(canvas.width - 30, playerX + playerSpeed);
        }
        if ((keysPressed.current[' '] || keysPressed.current['TouchAction']) && time - lastShot > 200) {
          bullets.push({ x: playerX, y: playerY - 15, active: true });
          shotsFired++;
          lastShot = time;
          handleSound('click');
        }

        // Live Accuracy calculation
        const currentAccuracy = calculateInvaderAccuracy(shotsFired, shotsHit);
        if (Math.floor(time / 200) % 5 === 0) {
          setInvaderAccuracy(currentAccuracy);
        }

        // Regular Wave: Alien Shooting & Bomb Dropping
        if (!isChallenge) {
          // Alien Lasers
          if (time - lastAlienShot > alienShotInterval) {
            const livingInvaders = invaders.filter(i => i.alive);
            if (livingInvaders.length > 0) {
              const shooter = livingInvaders[Math.floor(Math.random() * livingInvaders.length)];
              alienLasers.push({ x: shooter.x, y: shooter.y + 14, active: true, vy: alienLaserSpeed });
              lastAlienShot = time;
            }
          }

          // Alien Bombs (Dropped by bombers and motherships, or random fleet units)
          const bombInterval = Math.max(1200, 3200 / speedScale);
          if (time - lastBombDrop > bombInterval) {
            const bombDroppers = invaders.filter(i => i.alive && (i.canBomb || i.gridRow === 0));
            const candidatePool = bombDroppers.length > 0 ? bombDroppers : invaders.filter(i => i.alive);
            if (candidatePool.length > 0) {
              const bomber = candidatePool[Math.floor(Math.random() * candidatePool.length)];
              alienBombs.push({
                id: Math.random(),
                x: bomber.x,
                y: bomber.y + 12,
                vy: 2.1 * speedScale,
                radius: 7,
                fuse: 0,
                active: true
              });
              lastBombDrop = time + Math.random() * 400;
            }
          }

          // Random Divebombing Attacks (A ship from each row peels off at random intervals)
          const diveInterval = Math.max(2200, 4200 / speedScale);
          const divebombingCount = invaders.filter(i => i.alive && i.isDivebombing).length;
          if (divebombingCount < 2 && time - lastDivebombTime > diveInterval) {
            // Pick an available living ship from any row
            const availableShips = invaders.filter(i => i.alive && !i.isDivebombing);
            if (availableShips.length > 0) {
              // Cycle through rows to ensure all rows divebomb
              const targetRow = Math.floor(Math.random() * 3);
              const rowShips = availableShips.filter(i => i.gridRow === targetRow);
              const diver = rowShips.length > 0
                ? rowShips[Math.floor(Math.random() * rowShips.length)]
                : availableShips[Math.floor(Math.random() * availableShips.length)];

              diver.isDivebombing = true;
              diver.diveStartX = diver.x;
              diver.diveStartY = diver.y;
              diver.diveProgress = 0;
              diver.diveSpeed = invaderMoveSpeed; // Level speed!
              diver.diveSide = Math.random() > 0.5 ? 1 : -1;
              diver.diveHasShot = false;
              lastDivebombTime = time;
            }
          }
        }

        // Draw Player Cannon
        const isShielded = time < playerInvulnerableUntil;
        if (!isShielded || Math.floor(time / 100) % 2 === 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(playerX, playerY - 18);
          ctx.lineTo(playerX - 18, playerY + 12);
          ctx.lineTo(playerX + 18, playerY + 12);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(playerX - 3, playerY - 24, 6, 8);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(playerX - 14, playerY + 8, 5, 4);
          ctx.fillRect(playerX + 9, playerY + 8, 5, 4);
        }

        // Draw Shield Aura when invulnerable
        if (isShielded) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(playerX, playerY - 2, 26, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Update & Draw Player Bullets
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 6;
        bullets.forEach(b => {
          if (!b.active) return;
          b.y -= 8.8;
          ctx.fillRect(b.x - 2, b.y, 4, 14);
          if (b.y < 0) b.active = false;
        });
        ctx.shadowBlur = 0;
        bullets = bullets.filter(b => b.active);

        // Update & Draw Alien Lasers
        ctx.fillStyle = '#f43f5e';
        alienLasers.forEach(al => {
          if (!al.active) return;
          al.y += al.vy;
          ctx.fillRect(al.x - 2, al.y - 6, 4, 12);

          // Hit player check
          if (!isShielded && Math.abs(al.x - playerX) < 22 && Math.abs(al.y - playerY) < 18) {
            al.active = false;
            localLives--;
            setLives(localLives);
            playerInvulnerableUntil = time + 1800;
            handleSound('wrong');
            explosions.push({ x: playerX, y: playerY, radius: 8, maxRadius: 36, color: '#f43f5e', life: 1.0 });
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }
          if (al.y > canvas.height) al.active = false;
        });
        alienLasers = alienLasers.filter(al => al.active);

        // Update, Collide & Draw Alien Bombs (SHOOTABLE & EXPLOSIVE!)
        alienBombs.forEach(bomb => {
          if (!bomb.active) return;
          bomb.y += bomb.vy;
          bomb.fuse += 0.05;

          // 1. Check if PLAYER BULLET hits bomb -> Mid-air detonation!
          bullets.forEach(b => {
            if (b.active && Math.hypot(b.x - bomb.x, b.y - bomb.y) < bomb.radius + 7) {
              b.active = false;
              bomb.active = false;
              shotsHit++;
              localScore += 100;
              setCurrentScore(localScore);
              handleSound('star');
              floatTexts.push({ text: 'BOMB DEFUSED! +100', x: bomb.x, y: bomb.y - 12, color: '#f59e0b', life: 1.0, vy: -1.2 });

              // Create mid-air shockwave explosion with area-of-effect chain reaction!
              explosions.push({
                x: bomb.x,
                y: bomb.y,
                radius: 8,
                maxRadius: 46,
                color: '#fbbf24',
                life: 1.0,
                isMidAir: true
              });
            }
          });

          // 2. Check if bomb hits ground -> Explodes at bottom
          if (bomb.active && bomb.y >= canvas.height - 18) {
            bomb.active = false;
            explosions.push({ x: bomb.x, y: canvas.height - 15, radius: 6, maxRadius: 38, color: '#ea580c', life: 1.0 });
            handleSound('wrong');

            // Ground blast damage to player if close
            if (!isShielded && Math.abs(bomb.x - playerX) < 36 && Math.abs(canvas.height - 15 - playerY) < 32) {
              localLives--;
              setLives(localLives);
              playerInvulnerableUntil = time + 1800;
              if (localLives <= 0) {
                triggerGameOver();
                return;
              }
            }
          }

          // 3. Direct hit on player
          if (bomb.active && !isShielded && Math.abs(bomb.x - playerX) < 22 && Math.abs(bomb.y - playerY) < 18) {
            bomb.active = false;
            localLives--;
            setLives(localLives);
            playerInvulnerableUntil = time + 1800;
            handleSound('wrong');
            explosions.push({ x: playerX, y: playerY, radius: 10, maxRadius: 40, color: '#ef4444', life: 1.0 });
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }

          // 4. Render Alien Bomb (Mechanical ticking mine with blinking fuse spark)
          if (bomb.active) {
            ctx.save();
            ctx.translate(bomb.x, bomb.y);

            // Blinking fuse flame
            const sparkColor = Math.sin(time * 0.02) > 0 ? '#facc15' : '#ef4444';
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, -bomb.radius - 3, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Bomb main metallic casing
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Pulsing core
            ctx.fillStyle = Math.sin(time * 0.015) > 0 ? '#ef4444' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(0, 0, bomb.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        });
        alienBombs = alienBombs.filter(b => b.active);

        // Update & Render Explosions (Handles chain reactions on enemies!)
        explosions.forEach(exp => {
          exp.radius += (exp.maxRadius - exp.radius) * 0.15;
          exp.life -= 0.04;

          // Mid-Air Detonation Chain Reaction: destroys nearby invaders caught in blast!
          if (exp.isMidAir && exp.life > 0.6) {
            invaders.forEach(inv => {
              if (inv.alive && Math.hypot(inv.x - exp.x, inv.y - exp.y) < exp.radius + 12) {
                inv.alive = false;
                shotsHit++;
                localScore += inv.points;
                setCurrentScore(localScore);
                floatTexts.push({ text: `BLAST POP! +${inv.points}`, x: inv.x, y: inv.y - 10, color: '#38bdf8', life: 1.0, vy: -1.0 });
              }
            });
            // Also detonates nearby bombs in chain reaction
            alienBombs.forEach(otherBomb => {
              if (otherBomb.active && Math.hypot(otherBomb.x - exp.x, otherBomb.y - exp.y) < exp.radius + 8) {
                otherBomb.active = false;
                shotsHit++;
                localScore += 100;
                setCurrentScore(localScore);
                floatTexts.push({ text: 'CHAIN DEFUSED! +100', x: otherBomb.x, y: otherBomb.y, color: '#eab308', life: 1.0, vy: -1.2 });
              }
            });
          }

          // Render Explosion Shockwave
          ctx.save();
          ctx.globalAlpha = Math.max(0, exp.life);
          ctx.strokeStyle = exp.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = exp.color;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, exp.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        explosions = explosions.filter(e => e.life > 0);

        // Update & Draw Alien Spaceships
        let hitEdge = false;
        let aliveCount = 0;

        invaders.forEach(inv => {
          if (!inv.alive) return;
          aliveCount++;

          if (isChallenge) {
            // CHALLENGE ROUND: Acrobatic Flight Patterns across the screen
            inv.challengeFlightTime = (inv.challengeFlightTime || 0) + 16 * speedScale;
            if (inv.challengeFlightTime > 0) {
              const t = inv.challengeFlightTime * 0.0022;
              const baseY = inv.challengeBaseY || 80;
              // Acrobatic sinusoidal swoop across the screen
              inv.x += (inv.challengeDir || 1) * 2.8 * speedScale;
              inv.y = baseY + Math.sin(t * 4) * 45;

              // If flies off screen, loop back across
              if (inv.challengeDir === 1 && inv.x > canvas.width + 50) {
                inv.x = -40;
              } else if (inv.challengeDir === -1 && inv.x < -50) {
                inv.x = canvas.width + 40;
              }
            }
          } else if (inv.isDivebombing) {
            // DIVEBOMBING ATTACK:
            // 1. Move only as fast as the level speed (invaderMoveSpeed) so the player has time to aim and shoot
            // 2. Track/pursue the player in the top 2/3 of the screen (y < 280)
            // 3. Once at 2/3 screen distance (y >= 280), movement goes straight down and no longer chases player
            const twoThirdsScreen = canvas.height * (2 / 3); // 280px in 420px canvas
            const diveVy = invaderMoveSpeed; // vertical descent rate matches level speed

            inv.y += diveVy;

            if (inv.y < twoThirdsScreen) {
              // Pursue player horizontally at gentle speed not exceeding level speed
              const dx = playerX - inv.x;
              if (Math.abs(dx) > 3) {
                const trackSpeed = Math.min(Math.abs(dx) * 0.035, invaderMoveSpeed * 0.75);
                inv.x += Math.sign(dx) * trackSpeed;
              }
            }
            // Once inv.y >= twoThirdsScreen, inv.x remains constant (plunges straight down!)

            // Divebomber drops a bomb or shoots mid-flight (between 160px and 240px down)
            if (!inv.diveHasShot && inv.y >= 160 && inv.y <= 240) {
              inv.diveHasShot = true;
              if (inv.canBomb) {
                alienBombs.push({ id: Math.random(), x: inv.x, y: inv.y + 10, vy: 2.2 * speedScale, radius: 7, fuse: 0, active: true });
              } else {
                alienLasers.push({ x: inv.x, y: inv.y + 10, active: true, vy: alienLaserSpeed * 1.05 });
              }
            }

            // Once the divebomber passes completely off the bottom of the screen, return to formation
            if (inv.y > canvas.height + 25) {
              inv.isDivebombing = false;
              inv.diveHasShot = false;
              const sameRow = invaders.find(i => i.alive && !i.isDivebombing && i.gridRow === inv.gridRow && i.id !== inv.id);
              if (sameRow) {
                inv.y = sameRow.y;
                inv.x = Math.max(35, Math.min(canvas.width - 35, sameRow.x + (inv.gridCol - sameRow.gridCol) * 82));
              } else {
                inv.y = 45 + inv.gridRow * 44;
                inv.x = 55 + inv.gridCol * 82;
              }
            }
          } else {
            // Standard Grid Formation Movement
            inv.x += fleetDirection * invaderMoveSpeed;
            if (inv.x > canvas.width - 35 || inv.x < 35) hitEdge = true;
          }

          // Check Bullet Hit on Alien
          bullets.forEach(b => {
            if (b.active && Math.abs(b.x - inv.x) < 24 && Math.abs(b.y - inv.y) < 18) {
              b.active = false;
              inv.alive = false;
              shotsHit++;

              // DIVE KILL BONUS (2x Points!)
              const earnedPts = inv.isDivebombing ? inv.points * 2 : inv.points;
              localScore += earnedPts;
              setCurrentScore(localScore);

              if (inv.isDivebombing) {
                handleSound('star');
                floatTexts.push({ text: `DIVE KILL! +${earnedPts}`, x: inv.x, y: inv.y - 12, color: '#f43f5e', life: 1.2, vy: -1.3 });
              } else {
                handleSound('correct');
                floatTexts.push({ text: `+${earnedPts}`, x: inv.x, y: inv.y - 10, color: '#38bdf8', life: 0.9, vy: -1.0 });
              }

              if (isChallenge) {
                challengeTargetsHit++;
              }

              // Visual explosion
              explosions.push({ x: inv.x, y: inv.y, radius: 6, maxRadius: 28, color: inv.color, life: 0.8 });
            }
          });

          // Check Collision with Player:
          // Direct physical hit on player ship, OR standard fleet descent reaching base line (only for non-divebombing fleet)
          const isDirectHit = Math.abs(inv.x - playerX) < 24 && Math.abs(inv.y - playerY) < 18;
          const isFleetInvasion = !inv.isDivebombing && inv.y > playerY - 12;

          if (!isShielded && (isDirectHit || isFleetInvasion)) {
            inv.alive = false;
            localLives--;
            setLives(localLives);
            playerInvulnerableUntil = time + 1800;
            handleSound('wrong');
            explosions.push({ x: playerX, y: playerY, radius: 10, maxRadius: 40, color: '#ef4444', life: 1.0 });
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }

          // Render Alien Spaceship Sprite
          renderInvaderSprite(inv, inv.x, inv.y, time);
        });

        // Fleet Bounce & Drop (Standard Waves)
        if (hitEdge && !isChallenge) {
          fleetDirection *= -1;
          invaders.forEach(inv => {
            if (!inv.isDivebombing) inv.y += 8;
          });
        }

        // Floating Text Animation
        floatTexts.forEach(ft => {
          ft.y += ft.vy;
          ft.life -= 0.025;
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.life);
          ctx.fillStyle = ft.color;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        });
        floatTexts = floatTexts.filter(ft => ft.life > 0);

        // NEXT WAVE PROGRESSION & ACCURACY BONUS EVALUATION
        if (aliveCount === 0 && !isEnded) {
          // 1. Evaluate Shooting Accuracy Bonus (>70% triggers big bonus!)
          const finalRoundAccuracy = calculateInvaderAccuracy(shotsFired, shotsHit);
          const accuracyBonus = getInvaderAccuracyBonus(finalRoundAccuracy, currentWave);

          let bonusNotice = '';
          if (finalRoundAccuracy >= 70 && accuracyBonus > 0) {
            localScore += accuracyBonus;
            bonusNotice = `🎯 ACCURACY BONUS: ${finalRoundAccuracy}% (+${accuracyBonus} PTS)!`;
            handleSound('victory');
          } else {
            handleSound('star');
          }

          // 2. Challenge Stage Bonus
          if (isChallenge) {
            const chBonus = getChallengeStageBonus(challengeTargetsHit, challengeTargetsTotal);
            localScore += chBonus.points;
            bonusNotice += ` ${chBonus.label} (+${chBonus.points} PTS)`;
          }

          // Wave Completion Base Points
          localScore += 600 * currentWave;
          setCurrentScore(localScore);

          // Advance to next wave
          currentWave++;
          setWaveNumber(currentWave);

          // Reset wave trackers & clear existing projectiles
          invaders = spawnWaveFleet(currentWave);
          fleetDirection = 1;
          bullets = [];
          alienLasers = [];
          alienBombs = [];

          // Activate dialog pause for the next wave
          waveDialogActive = true;
          waveDialogStartTime = 0;
          canvasDismissTriggered = false;

          if (isChallengeRound(currentWave)) {
            waveDialogTitle = `⭐ CHALLENGE STAGE: WAVE ${currentWave} ⭐`;
            waveDialogSub = 'SPEED & ACCURACY TEST! 18 ACROBATIC TARGETS • DO NOT FIRE BACK!';
            waveDialogTip = '🎯 Hit targets rapidly for maximum bonus stars! No alien lasers/bombs.';
          } else {
            const shipNames = getWaveShipConfigs(currentWave);
            waveDialogTitle = `⚡ WAVE ${currentWave} • ${shipNames.row0.name.toUpperCase()} SQUADRON ⚡`;
            waveDialogSub = bonusNotice ? bonusNotice : `+10% FLEET SPEED • NEW ALIEN WARSHIPS DETECTED!`;
            waveDialogTip = '💣 Shoot bombs out of the sky • Dodge divebombers (2x pts for dive kills)!';
          }
        }

        // HUD: Top Bar Stats
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        if (isChallenge) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(`⭐ CHALLENGE ROUND ${currentWave} • TARGETS: ${challengeTargetsHit}/${challengeTargetsTotal}`, 15, 20);
        } else {
          ctx.fillText(`ROUND / WAVE ${currentWave} (+${Math.round((speedScale - 1) * 100)}% SPD)`, 15, 20);
        }

        // Top Right: Live Accuracy Display
        ctx.textAlign = 'right';
        if (currentAccuracy >= 70) {
          ctx.fillStyle = '#10b981';
          ctx.fillText(`🎯 ACCURACY: ${currentAccuracy}% (>70% BONUS ACTIVE)`, canvas.width - 15, 20);
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`ACCURACY: ${currentAccuracy}% (70% GOAL)`, canvas.width - 15, 20);
        }

        if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    // -----------------------------------------------------------
    // 2. DIG DUG: INSIGHT EXCAVATOR (Stage 2: Research Arcade)
    // -----------------------------------------------------------
    else if (activeGameId === 'dig_dug') {
      let minerX = 300;
      let minerY = 55;
      const speed = 4.5;
      const monsterSpeed = speed * 0.65; // 65% of player speed
      let facingDir: 'left' | 'right' | 'up' | 'down' = 'down';
      let minerInvulnerableUntil = 2000;

      // Root Vegetables (Carrots 🥕, Potatoes 🥔, Turnips 🧅)
      interface Veggie {
        x: number;
        y: number;
        gathered: boolean;
        type: 'carrot' | 'potato' | 'turnip';
        label: string;
      }

      let veggies: Veggie[] = [
        { x: 160, y: 120, gathered: false, type: 'carrot', label: 'Carrot' },
        { x: 440, y: 130, gathered: false, type: 'potato', label: 'Potato' },
        { x: 300, y: 210, gathered: false, type: 'turnip', label: 'Turnip' },
        { x: 130, y: 300, gathered: false, type: 'carrot', label: 'Carrot' },
        { x: 470, y: 310, gathered: false, type: 'potato', label: 'Potato' }
      ];

      // Underground Monsters with fangs & homing pursuit AI
      interface DigDugEnemy {
        id: number;
        x: number;
        y: number;
        radius: number;
        alive: boolean;
        stunnedUntil: number;
        popLevel: number;
        behavior: 'chaser' | 'wanderer';
        color: string;
        hornColor: string;
        wanderAngle: number;
        wanderTimer: number;
        wanderSpeed: number;
      }

      let digDugRound = 1;
      let roundDialogActive = true;
      let roundDialogStartTime = 0;
      const ROUND_DIALOG_DURATION = 3200;
      let roundDialogTitle = '🥕 ROUND 1: INSIGHT EXCAVATION';
      let roundDialogSub = 'Gather all root vegetables • Beware of 1 Chaser (Red) + 1 Wanderer (Purple)!';
      let roundDialogTip = 'Dig with Arrow Keys • Pump monsters with SPACE • Press SPACE to start!';
      let pausedDurationTotal = 0;
      let roundPauseStart = 0;

      // Round 1 begins with:
      // - 1 Chaser monster (chases player directly at 65% speed)
      // - 1 Wanderer monster (moves around in random wandering patterns)
      let enemies: DigDugEnemy[] = [
        {
          id: 1,
          x: 80,
          y: 340,
          radius: 15,
          alive: true,
          stunnedUntil: 0,
          popLevel: 0,
          behavior: 'chaser',
          color: '#dc2626', // Crimson Chaser
          hornColor: '#facc15',
          wanderAngle: 0,
          wanderTimer: 0,
          wanderSpeed: monsterSpeed
        },
        {
          id: 2,
          x: 520,
          y: 350,
          radius: 15,
          alive: true,
          stunnedUntil: 0,
          popLevel: 0,
          behavior: 'wanderer',
          color: '#9333ea', // Electric Violet Wanderer
          hornColor: '#38bdf8',
          wanderAngle: Math.random() * Math.PI * 2,
          wanderTimer: 2000,
          wanderSpeed: speed * 0.70
        }
      ];

      // Air-pump harpoon attack
      let pumpBeam: { startX: number; startY: number; endX: number; endY: number; expireTime: number } | null = null;
      let lastPumpTime = 0;
      let gameStartTime: number | null = null;
      const TOTAL_DURATION_MS = 120 * 1000; // Strict 2-minute timer

      const loop = (time: number) => {
        if (!gameStartTime) gameStartTime = time;
        const activePlayTime = time - gameStartTime - pausedDurationTotal;
        const remainingSeconds = Math.max(0, Math.ceil((TOTAL_DURATION_MS - activePlayTime) / 1000));
        setDigDugTimeLeft(remainingSeconds);

        // 2-Minute Timer check: Game over when 2 minutes expire
        if (remainingSeconds <= 0 && !isEnded) {
          triggerGameOver();
          return;
        }

        // Subterranean Dirt background
        ctx.fillStyle = '#652b12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sky & Grass at surface
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 0, canvas.width, 48);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(0, 44, canvas.width, 6);

        // ========================================================
        // ROUND DIALOG SCREEN: PAUSES DIG DUG IN THE BACKGROUND
        // Game & timer freeze until dialog is dismissed by player!
        // ========================================================
        if (roundDialogActive) {
          if (roundDialogStartTime === 0) {
            roundDialogStartTime = time;
            roundPauseStart = time;
          }

          const elapsedDialog = time - roundDialogStartTime;
          const timeLeftSec = Math.max(0, Math.ceil((ROUND_DIALOG_DURATION - elapsedDialog) / 1000));
          const progressFraction = Math.min(1, elapsedDialog / ROUND_DIALOG_DURATION);

          const userDismissed =
            canvasDismissTriggered ||
            keysPressed.current[' '] ||
            keysPressed.current['Enter'] ||
            keysPressed.current['TouchAction'];

          if (userDismissed || elapsedDialog >= ROUND_DIALOG_DURATION) {
            roundDialogActive = false;
            canvasDismissTriggered = false;
            if (keysPressed.current[' ']) keysPressed.current[' '] = false;
            if (keysPressed.current['TouchAction']) keysPressed.current['TouchAction'] = false;
            handleSound('star');

            // Add the time spent paused so the 2-minute timer is frozen
            pausedDurationTotal += (time - roundPauseStart);

            // Stun enemies briefly on unpause so they don't instantly bite
            enemies.forEach(e => {
              e.stunnedUntil = Math.max(e.stunnedUntil, time + 600);
            });
          } else {
            // Draw tunnels around miner
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(minerX, minerY, 24, 0, Math.PI * 2);
            ctx.fill();

            // Draw root vegetables in starting positions
            veggies.forEach(v => {
              if (!v.gathered) {
                if (v.type === 'carrot') {
                  ctx.fillStyle = '#16a34a';
                  ctx.fillRect(v.x - 4, v.y - 14, 8, 5);
                  ctx.fillStyle = '#ea580c';
                  ctx.beginPath();
                  ctx.moveTo(v.x - 7, v.y - 9); ctx.lineTo(v.x + 7, v.y - 9); ctx.lineTo(v.x, v.y + 11);
                  ctx.closePath();
                  ctx.fill();
                } else if (v.type === 'potato') {
                  ctx.fillStyle = '#b45309';
                  ctx.beginPath();
                  ctx.ellipse(v.x, v.y, 11, 8, 0.2, 0, Math.PI * 2);
                  ctx.fill();
                } else {
                  ctx.fillStyle = '#16a34a';
                  ctx.fillRect(v.x - 2, v.y - 13, 4, 5);
                  ctx.fillStyle = '#a21caf';
                  ctx.beginPath();
                  ctx.arc(v.x, v.y, 9, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            });

            // Draw enemies in initial cavern pockets
            enemies.forEach(en => {
              if (en.alive) {
                ctx.fillStyle = '#292524';
                ctx.beginPath();
                ctx.arc(en.x, en.y, en.radius + 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = en.color;
                ctx.beginPath();
                ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
                ctx.fill();
              }
            });

            // Draw miner
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(minerX, minerY, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(minerX - 10, minerY - 18, 20, 8);

            // Draw Dialog Card Screen
            ctx.save();
            ctx.fillStyle = 'rgba(6, 10, 20, 0.72)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cardW = 470;
            const cardH = 148;
            const cardX = (canvas.width - cardW) / 2;
            const cardY = (canvas.height - cardH) / 2 - 10;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            ctx.fillStyle = '#fde047';
            ctx.font = 'black 17px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(roundDialogTitle, canvas.width / 2, cardY + 34);

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(roundDialogSub, canvas.width / 2, cardY + 62);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.fillText(roundDialogTip, canvas.width / 2, cardY + 84);

            const pulse = Math.sin(time * 0.008) * 0.5 + 0.5;
            ctx.fillStyle = pulse > 0.4 ? '#fde047' : '#fef08a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`▶ PRESS [SPACE] OR CLICK SCREEN TO START (${timeLeftSec}s)`, canvas.width / 2, cardY + 114);

            ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
            ctx.fillRect(cardX + 24, cardY + cardH - 12, cardW - 48, 5);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(cardX + 24, cardY + cardH - 12, (cardW - 48) * (1 - progressFraction), 5);

            ctx.restore();

            if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
            return;
          }
        }

        // Miner Controls
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) {
          minerX = Math.max(20, minerX - speed);
          facingDir = 'left';
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) {
          minerX = Math.min(canvas.width - 20, minerX + speed);
          facingDir = 'right';
        }
        if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['TouchUp']) {
          minerY = Math.max(50, minerY - speed);
          facingDir = 'up';
        }
        if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['TouchDown']) {
          minerY = Math.min(canvas.height - 25, minerY + speed);
          facingDir = 'down';
        }

        // Fire Air Pump Harpoon
        if ((keysPressed.current[' '] || keysPressed.current['TouchAction']) && time - lastPumpTime > 250) {
          lastPumpTime = time;
          let dx = 0;
          let dy = 0;
          if (facingDir === 'left') dx = -70;
          else if (facingDir === 'right') dx = 70;
          else if (facingDir === 'up') dy = -70;
          else if (facingDir === 'down') dy = 70;

          pumpBeam = {
            startX: minerX,
            startY: minerY,
            endX: minerX + dx,
            endY: minerY + dy,
            expireTime: time + 180
          };
          handleSound('click');

          enemies.forEach(en => {
            if (!en.alive) return;
            const dist = Math.hypot(en.x - (minerX + dx * 0.7), en.y - (minerY + dy * 0.7));
            if (dist < 38) {
              en.popLevel++;
              en.stunnedUntil = time + 2500;
              if (en.popLevel >= 2) {
                en.alive = false;
                localScore += 400;
                setCurrentScore(localScore);
                handleSound('star');
                setTimeout(() => {
                  en.alive = true;
                  en.popLevel = 0;
                  en.stunnedUntil = 0;
                  en.x = Math.random() > 0.5 ? 70 : canvas.width - 70;
                  en.y = canvas.height - 60;
                  if (en.behavior === 'wanderer') {
                    en.wanderAngle = Math.random() * Math.PI * 2;
                  }
                }, 6000);
              } else {
                handleSound('correct');
              }
            }
          });
        }

        if (pumpBeam && time > pumpBeam.expireTime) pumpBeam = null;

        // Dug Tunnels around Miner
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(minerX, minerY, 24, 0, Math.PI * 2);
        ctx.fill();

        // Draw Harpoon Cable
        if (pumpBeam) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(pumpBeam.startX, pumpBeam.startY);
          ctx.lineTo(pumpBeam.endX, pumpBeam.endY);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pumpBeam.endX, pumpBeam.endY, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // DRAW ROOT VEGETABLES (Carrots, Potatoes, Turnips)
        let remainingVeggies = 0;
        veggies.forEach(v => {
          if (!v.gathered) {
            remainingVeggies++;
            if (Math.hypot(minerX - v.x, minerY - v.y) < 26) {
              v.gathered = true;
              localScore += 250;
              setCurrentScore(localScore);
              handleSound('correct');
            } else {
              if (v.type === 'carrot') {
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(v.x - 4, v.y - 14, 8, 5);
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.moveTo(v.x - 7, v.y - 9);
                ctx.lineTo(v.x + 7, v.y - 9);
                ctx.lineTo(v.x, v.y + 11);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#c2410c';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(v.x - 5, v.y - 4); ctx.lineTo(v.x + 5, v.y - 4);
                ctx.moveTo(v.x - 3, v.y + 2); ctx.lineTo(v.x + 3, v.y + 2);
                ctx.stroke();
              } else if (v.type === 'potato') {
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.ellipse(v.x, v.y, 11, 8, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.fillRect(v.x - 5, v.y - 2, 2, 2);
                ctx.fillRect(v.x + 3, v.y + 2, 2, 2);
                ctx.fillRect(v.x - 1, v.y - 4, 2, 2);
              } else {
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(v.x - 2, v.y - 13, 4, 5);
                ctx.fillStyle = '#a21caf';
                ctx.beginPath();
                ctx.arc(v.x, v.y - 2, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fdf4ff';
                ctx.beginPath();
                ctx.arc(v.x, v.y + 2, 6, 0, Math.PI);
                ctx.fill();
              }
              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 8px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(v.label, v.x, v.y + 18);
            }
          }
        });

        // Round Completion: Add 1 additional monster moving at random each round!
        if (remainingVeggies === 0) {
          digDugRound++;
          localScore += 500;
          setCurrentScore(localScore);
          handleSound('star');

          // Respawn root vegetables at fresh subterranean positions
          veggies.forEach(v => {
            v.gathered = false;
            v.x = Math.floor(Math.random() * (canvas.width - 140) + 70);
            v.y = Math.floor(Math.random() * (canvas.height - 140) + 70);
          });

          // Add an additional monster moving at random patterns
          const wandererPalette = ['#059669', '#ea580c', '#0284c7', '#c026d3', '#e11d48', '#d97706'];
          const nextColor = wandererPalette[(enemies.length - 2) % wandererPalette.length];
          enemies.push({
            id: enemies.length + 1,
            x: Math.random() > 0.5 ? 75 : canvas.width - 75,
            y: Math.floor(Math.random() * 150 + 190),
            radius: 15,
            alive: true,
            stunnedUntil: 0,
            popLevel: 0,
            behavior: 'wanderer',
            color: nextColor,
            hornColor: '#fde047',
            wanderAngle: Math.random() * Math.PI * 2,
            wanderTimer: time + 1800,
            wanderSpeed: speed * 0.70
          });

          // Trigger Round Dialog Pause for the new round
          const wanderingCount = enemies.filter(e => e.behavior === 'wanderer').length;
          roundDialogActive = true;
          roundDialogStartTime = 0;
          canvasDismissTriggered = false;
          roundDialogTitle = `🎉 ROUND ${digDugRound}: +1 ROAMING MONSTER ADDED!`;
          roundDialogSub = `Now facing 1 Chaser + ${wanderingCount} Roaming Monsters underground!`;
          roundDialogTip = 'Dig new escape tunnels & pump monsters with SPACE before they bite!';
        }

        // UPDATE & DRAW SUBTERRANEAN MONSTERS (1 Chaser + Random Roaming Monsters)
        const isShielded = time < minerInvulnerableUntil;

        enemies.forEach(en => {
          if (!en.alive) return;
          const isStunned = time < en.stunnedUntil;

          if (!isStunned && activePlayTime > 1500) {
            if (en.behavior === 'chaser') {
              // Homing pursuit towards miner at 75% player speed
              const dx = minerX - en.x;
              const dy = minerY - en.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 4) {
                en.x += (dx / dist) * monsterSpeed;
                en.y += (dy / dist) * monsterSpeed;
              }
            } else {
              // Random Pattern Wanderer: smooth movement with periodic organic angle shifts & bounce
              if (time > en.wanderTimer) {
                en.wanderAngle = Math.random() * Math.PI * 2;
                en.wanderTimer = time + Math.random() * 2000 + 1200; // changes every 1.2s - 3.2s
              }

              // Boundary reflections to stay underground
              if (en.x <= 35 && Math.cos(en.wanderAngle) < 0) {
                en.wanderAngle = Math.PI - en.wanderAngle;
              } else if (en.x >= canvas.width - 35 && Math.cos(en.wanderAngle) > 0) {
                en.wanderAngle = Math.PI - en.wanderAngle;
              }
              if (en.y <= 65 && Math.sin(en.wanderAngle) < 0) {
                en.wanderAngle = -en.wanderAngle;
              } else if (en.y >= canvas.height - 30 && Math.sin(en.wanderAngle) > 0) {
                en.wanderAngle = -en.wanderAngle;
              }

              en.x += Math.cos(en.wanderAngle) * en.wanderSpeed;
              en.y += Math.sin(en.wanderAngle) * en.wanderSpeed;
              en.x = Math.max(30, Math.min(canvas.width - 30, en.x));
              en.y = Math.max(65, Math.min(canvas.height - 30, en.y));
            }
          }

          // Cavern pocket
          ctx.fillStyle = '#292524';
          ctx.beginPath();
          ctx.arc(en.x, en.y, en.radius + 6 + (en.popLevel * 6), 0, Math.PI * 2);
          ctx.fill();

          // Monster body with horns and sharp fangs
          const r = en.radius + (en.popLevel * 6);
          ctx.fillStyle = isStunned ? '#fbbf24' : en.color;
          ctx.beginPath();
          ctx.arc(en.x, en.y, r, 0, Math.PI * 2);
          ctx.fill();

          // Spiky Horns
          ctx.fillStyle = en.hornColor;
          ctx.beginPath();
          ctx.moveTo(en.x - 10, en.y - 10);
          ctx.lineTo(en.x - 15, en.y - 20);
          ctx.lineTo(en.x - 5, en.y - 12);
          ctx.moveTo(en.x + 10, en.y - 10);
          ctx.lineTo(en.x + 15, en.y - 20);
          ctx.lineTo(en.x + 5, en.y - 12);
          ctx.fill();

          // Monster Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(en.x - 5, en.y - 2, 4, 0, Math.PI * 2);
          ctx.arc(en.x + 5, en.y - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          // Chaser has intense red pupils, wanderers have watchful dark pupils
          ctx.fillStyle = en.behavior === 'chaser' ? '#b91c1c' : '#0f172a';
          ctx.beginPath();
          ctx.arc(en.x - 4, en.y - 2, 2, 0, Math.PI * 2);
          ctx.arc(en.x + 6, en.y - 2, 2, 0, Math.PI * 2);
          ctx.fill();

          // Monster Fangs
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(en.x - 5, en.y + 6); ctx.lineTo(en.x - 3, en.y + 11); ctx.lineTo(en.x - 1, en.y + 6);
          ctx.moveTo(en.x + 1, en.y + 6); ctx.lineTo(en.x + 3, en.y + 11); ctx.lineTo(en.x + 5, en.y + 6);
          ctx.fill();

          // Collision with player
          if (!isStunned && !isShielded && Math.hypot(minerX - en.x, minerY - en.y) < (r + 12)) {
            localLives--;
            setLives(localLives);
            handleSound('wrong');
            minerX = 300;
            minerY = 55;
            minerInvulnerableUntil = time + 2000;
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }
        });

        // Draw Miner
        if (!isShielded || Math.floor(time / 100) % 2 === 0) {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(minerX, minerY, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(minerX - 10, minerY - 18, 20, 8); // hard hat
        }


        // Surface HUD: Round & Monster Counts + 2-Minute Timer
        const wanderingCount = enemies.filter(e => e.behavior === 'wanderer').length;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🥕 ROUND ${digDugRound} • 1 Chaser + ${wanderingCount} Roaming Monsters`, 15, 22);

        // Draw 2-Minute HUD Bar
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        ctx.fillStyle = remainingSeconds <= 15 ? '#ef4444' : '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`⏱️ TIME: ${timeStr} (2:00 LIMIT)`, canvas.width - 15, 22);

        if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    // -----------------------------------------------------------
    // 3. TETRIS: IDEA STACKER (Stage 3: Brainstorm Arcade)
    // -----------------------------------------------------------
    else if (activeGameId === 'tetris') {
      const COLS = 10;
      const ROWS = 15; // 15 rows with 21px block = 315px, leaves 73px bottom margin so 100% visible!
      const BLOCK_SIZE = 21;
      const offsetX = 170;
      const offsetY = 35;

      let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

      // Classic complete 7 Tetromino shapes (including L and J!)
      const SHAPES = [
        [[1, 1, 1, 1]], // I (Cyan)
        [[1, 1], [1, 1]], // O (Yellow)
        [[0, 1, 0], [1, 1, 1]], // T (Purple)
        [[0, 1, 1], [1, 1, 0]], // S (Green)
        [[1, 1, 0], [0, 1, 1]], // Z (Red)
        [[1, 0, 0], [1, 1, 1]], // J (Blue)
        [[0, 0, 1], [1, 1, 1]]  // L (Orange)
      ];
      const COLORS = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316'];

      const getRandomPiece = () => {
        const idx = Math.floor(Math.random() * SHAPES.length);
        return {
          shape: SHAPES[idx],
          color: COLORS[idx],
          x: 3,
          y: 0
        };
      };

      let currentPiece = getRandomPiece();
      let nextPiece = getRandomPiece();
      let dropTimer = 0;
      let lastMove = 0;
      let totalLines = 0;

      const collides = (pieceX: number, pieceY: number, shape: number[][]) => {
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              const nx = pieceX + c;
              const ny = pieceY + r;
              if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
              if (ny >= 0 && board[ny][nx]) return true;
            }
          }
        }
        return false;
      };

      const rotate = (shape: number[][]) => {
        const rows = shape.length;
        const cols = shape[0].length;
        const res = Array.from({ length: cols }, () => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            res[c][rows - 1 - r] = shape[r][c];
          }
        }
        return res;
      };

      const loop = (time: number) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Matrix frame
        ctx.fillStyle = '#020617';
        ctx.fillRect(offsetX - 4, offsetY - 4, COLS * BLOCK_SIZE + 8, ROWS * BLOCK_SIZE + 8);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX - 4, offsetY - 4, COLS * BLOCK_SIZE + 8, ROWS * BLOCK_SIZE + 8);

        // Distinct Bottom Floor Baseline (Guarantees bottom row is visibly resting on ground!)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(offsetX - 8, offsetY + ROWS * BLOCK_SIZE + 2, COLS * BLOCK_SIZE + 16, 6);
        ctx.strokeStyle = '#34d399';
        ctx.strokeRect(offsetX - 8, offsetY + ROWS * BLOCK_SIZE + 2, COLS * BLOCK_SIZE + 16, 6);

        // NEXT PIECE PREVIEW BOX on the right side
        const previewX = offsetX + COLS * BLOCK_SIZE + 30;
        const previewY = offsetY + 10;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(previewX, previewY, 130, 95);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(previewX, previewY, 130, 95);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT PIECE', previewX + 65, previewY + 18);

        // Draw preview shape
        ctx.fillStyle = nextPiece.color;
        const pRows = nextPiece.shape.length;
        const pCols = nextPiece.shape[0].length;
        const pOffsetX = previewX + (130 - pCols * 16) / 2;
        const pOffsetY = previewY + 32 + (50 - pRows * 16) / 2;
        for (let r = 0; r < pRows; r++) {
          for (let c = 0; c < pCols; c++) {
            if (nextPiece.shape[r][c]) {
              ctx.fillRect(pOffsetX + c * 16, pOffsetY + r * 16, 14, 14);
            }
          }
        }

        // Stats Card (Speed + Lines)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(previewX, previewY + 115, 130, 85);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(previewX, previewY + 115, 130, 85);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('LINES CLEARED', previewX + 65, previewY + 135);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`${totalLines}`, previewX + 65, previewY + 158);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`+${Math.round(totalLines * 2)}% FALL SPEED`, previewX + 65, previewY + 182);

        // Player Controls
        if (time - lastMove > 105) {
          if ((keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) && !collides(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
            currentPiece.x--;
            lastMove = time;
            handleSound('click');
          }
          if ((keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) && !collides(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
            currentPiece.x++;
            lastMove = time;
            handleSound('click');
          }
          if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['TouchUp']) {
            const rotated = rotate(currentPiece.shape);
            if (!collides(currentPiece.x, currentPiece.y, rotated)) {
              currentPiece.shape = rotated;
              lastMove = time + 50;
              handleSound('click');
            }
          }
        }

        // Speed increases 2% for each line completed!
        const speedScale = Math.pow(0.98, totalLines);
        const normalThreshold = Math.max(3, Math.floor(24 * speedScale));
        const dropThreshold = (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['TouchDown']) ? 3 : normalThreshold;

        dropTimer++;
        if (dropTimer >= dropThreshold) {
          dropTimer = 0;
          if (!collides(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
            currentPiece.y++;
          } else {
            // Lock piece onto matrix
            let pieceLockedAbove = false;
            for (let r = 0; r < currentPiece.shape.length; r++) {
              for (let c = 0; c < currentPiece.shape[r].length; c++) {
                if (currentPiece.shape[r][c]) {
                  const by = currentPiece.y + r;
                  const bx = currentPiece.x + c;
                  if (by < 1) pieceLockedAbove = true;
                  if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                    board[by][bx] = currentPiece.color;
                  }
                }
              }
            }

            if (pieceLockedAbove) {
              localLives--;
              setLives(localLives);
              handleSound('wrong');
              board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
              if (localLives <= 0) {
                triggerGameOver();
                return;
              }
            }

            // Line clear check
            let clearedCount = 0;
            for (let r = ROWS - 1; r >= 0; r--) {
              if (board[r].every(cell => cell !== 0)) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(0));
                clearedCount++;
                r++;
              }
            }

            if (clearedCount > 0) {
              totalLines += clearedCount;
              setTetrisLinesCleared(totalLines);
              localScore += clearedCount * 250 + (clearedCount > 1 ? 300 : 0);
              setCurrentScore(localScore);
              handleSound('star');
            }

            // Spawn next piece & queue a new random piece
            currentPiece = { ...nextPiece, x: 3, y: 0 };
            nextPiece = getRandomPiece();
          }
        }

        // Render Board Blocks
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
              ctx.fillStyle = board[r][c];
              ctx.fillRect(offsetX + c * BLOCK_SIZE + 1, offsetY + r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
          }
        }

        // Render Current Active Falling Piece
        ctx.fillStyle = currentPiece.color;
        for (let r = 0; r < currentPiece.shape.length; r++) {
          for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
              ctx.fillRect(
                offsetX + (currentPiece.x + c) * BLOCK_SIZE + 1,
                offsetY + (currentPiece.y + r) * BLOCK_SIZE + 1,
                BLOCK_SIZE - 2,
                BLOCK_SIZE - 2
              );
            }
          }
        }

        if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    // -----------------------------------------------------------
    // 4. OUTRUN: MAKER RACEWAY (Stage 4: Prototype Arcade)
    // -----------------------------------------------------------
    else if (activeGameId === 'outrun') {
      let carX = canvas.width / 2;
      const carY = canvas.height - 65;
      // Start Outrun at 50% speed (4.0 px/frame) and ramp up 1% for each item collected
      const baseSpeed = 4.0;
      let itemsCollected = 0;
      let speed = baseSpeed * (1 + itemsCollected * 0.01);

      // 3-Fuel Nitro Booster Mechanics
      let fuelsTowardBoost = 0;
      let boostCharges = 0;
      let boostActiveUntil = 0;
      let outrunFloatTexts: { text: string; x: number; y: number; color: string; life: number; vy: number }[] = [];

      // Obstacles: Rival Cars, Boulders/Rocks, Construction Barricades
      interface Obstacle {
        x: number;
        y: number;
        type: 'rival_car' | 'boulder' | 'barricade';
      }

      let obstacles: Obstacle[] = [
        { x: 190, y: -40, type: 'rival_car' },
        { x: 360, y: -260, type: 'boulder' },
        { x: 280, y: -480, type: 'barricade' }
      ];

      // Collectibles: Fuel Jerry Cans & Stacks of Money
      interface Collectible {
        x: number;
        y: number;
        type: 'fuel' | 'money_stack';
      }

      let collectibles: Collectible[] = [
        { x: 250, y: -140, type: 'fuel' },
        { x: 410, y: -360, type: 'money_stack' }
      ];

      const loop = (time: number) => {
        // Spacebar or TouchAction to trigger Nitro Boost
        if ((keysPressed.current[' '] || keysPressed.current['TouchAction']) && boostCharges > 0 && time >= boostActiveUntil) {
          boostCharges--;
          setOutrunBoostCharges(boostCharges);
          boostActiveUntil = time + 3000;
          keysPressed.current[' '] = false;
          keysPressed.current['TouchAction'] = false;
          handleSound('victory');
          outrunFloatTexts.push({ text: '🚀 NITRO BOOST! +20% SPEED!', x: carX, y: carY - 40, color: '#38bdf8', life: 1.8, vy: -1.0 });
        }

        const isBoosting = time < boostActiveUntil;
        setOutrunIsBoosting(isBoosting);
        const currentBaseSpeed = baseSpeed * (1 + itemsCollected * 0.01);
        speed = isBoosting ? currentBaseSpeed * 1.20 : currentBaseSpeed;

        // Track Grass Background
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Asphalt Highway (3 lanes)
        const roadW = 340;
        const roadL = (canvas.width - roadW) / 2;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(roadL, 0, roadW, canvas.height);

        // Solid Yellow Road Boundaries (Non-flashing)
        ctx.fillStyle = isBoosting ? '#38bdf8' : '#facc15'; // Glowing blue edges when boosting!
        ctx.fillRect(roadL - 8, 0, 8, canvas.height);
        ctx.fillRect(roadL + roadW, 0, 8, canvas.height);
        // Inner crisp amber/cyan border for road definition
        ctx.fillStyle = isBoosting ? '#0284c7' : '#ca8a04';
        ctx.fillRect(roadL - 1, 0, 1, canvas.height);
        ctx.fillRect(roadL + roadW, 0, 1, canvas.height);

        // Animated Dashed lane lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([24, 24]);
        ctx.lineDashOffset = -time * (speed * 0.05);
        ctx.beginPath();
        ctx.moveTo(roadL + roadW / 3, 0);
        ctx.lineTo(roadL + roadW / 3, canvas.height);
        ctx.moveTo(roadL + (roadW * 2) / 3, 0);
        ctx.lineTo(roadL + (roadW * 2) / 3, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Warp speed streak lines along road when boosting
        if (isBoosting) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 2;
          for (let s = 0; s < 6; s++) {
            const streakY = ((time * 0.8 + s * 70) % canvas.height);
            const sideLeft = roadL + 12 + (s % 2) * 20;
            const sideRight = roadL + roadW - 12 - (s % 2) * 20;
            ctx.beginPath();
            ctx.moveTo(sideLeft, streakY);
            ctx.lineTo(sideLeft, streakY + 28);
            ctx.moveTo(sideRight, streakY);
            ctx.lineTo(sideRight, streakY + 28);
            ctx.stroke();
          }
        }

        // Controls
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) {
          carX = Math.max(roadL + 22, carX - 6.5);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) {
          carX = Math.min(roadL + roadW - 22, carX + 6.5);
        }

        // Distance points (higher while boosting)
        localScore += isBoosting ? 3 : 2;
        setCurrentScore(localScore);

        // MOVE & RENDER OBSTACLES (Rival cars, boulders, barricades)
        obstacles.forEach(ob => {
          ob.y += speed;

          if (ob.type === 'rival_car') {
            // Blue Rival Sports Car
            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.roundRect(ob.x - 16, ob.y - 24, 32, 48, 6);
            ctx.fill();
            // Roof / Windshield
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(ob.x - 12, ob.y - 8, 24, 16);
            // Rival Headlights
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(ob.x - 13, ob.y + 18, 6, 4);
            ctx.fillRect(ob.x + 7, ob.y + 18, 6, 4);
          } else if (ob.type === 'boulder') {
            // Craggy grey rock
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(ob.x, ob.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Rock facets
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.moveTo(ob.x - 6, ob.y - 6); ctx.lineTo(ob.x + 4, ob.y - 10); ctx.lineTo(ob.x, ob.y + 4);
            ctx.fill();
          } else {
            // Construction barricade with orange/white stripes
            ctx.fillStyle = '#f97316';
            ctx.fillRect(ob.x - 20, ob.y - 10, 40, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ob.x - 14, ob.y - 10, 8, 20);
            ctx.fillRect(ob.x + 4, ob.y - 10, 8, 20);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(ob.x - 4, ob.y - 14, 8, 4);
          }

          // Collision detection
          if (Math.abs(carX - ob.x) < 32 && Math.abs(carY - ob.y) < 28) {
            ob.y = -90;
            ob.x = roadL + Math.random() * (roadW - 50) + 25;
            localLives--;
            setLives(localLives);
            handleSound('wrong');
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }

          if (ob.y > canvas.height + 40) {
            ob.y = -60;
            ob.x = roadL + Math.random() * (roadW - 50) + 25;
          }
        });

        // MOVE & RENDER COLLECTIBLES (Fuel Jerry Cans & Money Stacks)
        collectibles.forEach(col => {
          col.y += speed;

          if (col.type === 'fuel') {
            // Red Jerry Can with yellow nozzle
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(col.x - 11, col.y - 13, 22, 26);
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(col.x - 8, col.y - 17, 16, 4);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(col.x + 4, col.y - 18, 4, 6);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FUEL', col.x, col.y + 4);
          } else {
            // 3D Layered Stack of Money with Gold Currency Band
            const billW = 30;
            const billH = 17;
            // Base shadow/depth layers
            ctx.fillStyle = '#064e3b';
            ctx.beginPath();
            ctx.roundRect(col.x - billW / 2 + 2, col.y - billH / 2 + 3, billW, billH, 3);
            ctx.fill();
            ctx.fillStyle = '#047857';
            ctx.beginPath();
            ctx.roundRect(col.x - billW / 2 + 1, col.y - billH / 2 + 1.5, billW, billH, 3);
            ctx.fill();
            // Top banknote
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(col.x - billW / 2, col.y - billH / 2, billW, billH, 3);
            ctx.fill();
            ctx.strokeStyle = '#065f46';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Inner mint border
            ctx.strokeStyle = '#6ee7b7';
            ctx.strokeRect(col.x - billW / 2 + 2, col.y - billH / 2 + 2, billW - 4, billH - 4);
            // Gold currency strap
            ctx.fillStyle = '#facc15';
            ctx.fillRect(col.x - 3, col.y - billH / 2, 6, billH);
            ctx.strokeStyle = '#ca8a04';
            ctx.strokeRect(col.x - 3, col.y - billH / 2, 6, billH);
            // $ Sign
            ctx.fillStyle = '#064e3b';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$', col.x, col.y + 3);
            // Sparkle
            if (Math.sin(time * 0.007) > 0.4) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(col.x + 9, col.y - 6, 2, 2);
            }
          }

          // Pickup check: award points, increment items, ramp speed up 1%
          if (Math.abs(carX - col.x) < 28 && Math.abs(carY - col.y) < 26) {
            col.y = -100;
            col.x = roadL + Math.random() * (roadW - 50) + 25;
            itemsCollected++;

            if (col.type === 'fuel') {
              localScore += 250;
              fuelsTowardBoost++;
              setOutrunFuelsCount(fuelsTowardBoost);
              if (fuelsTowardBoost >= 3) {
                fuelsTowardBoost = 0;
                setOutrunFuelsCount(0);
                boostCharges++;
                setOutrunBoostCharges(boostCharges);
                handleSound('star');
                outrunFloatTexts.push({ text: '🚀 NITRO BOOST READY! [SPACE]', x: carX, y: carY - 40, color: '#facc15', life: 1.8, vy: -1.0 });
              } else {
                handleSound('correct');
                outrunFloatTexts.push({ text: `+250★ FUEL (${fuelsTowardBoost}/3)`, x: carX, y: carY - 30, color: '#4ade80', life: 1.2, vy: -0.8 });
              }
            } else {
              localScore += 350;
              handleSound('correct');
              outrunFloatTexts.push({ text: '💵 +350★ CASH STACK!', x: carX, y: carY - 30, color: '#10b981', life: 1.2, vy: -0.8 });
            }

            setCurrentScore(localScore);
          }

          if (col.y > canvas.height + 40) {
            col.y = -80;
            col.x = roadL + Math.random() * (roadW - 50) + 25;
          }
        });

        // DRAW PLAYER SPORTS CAR (Detailed Retro Roadster)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(carX - 18, carY - 28, 36, 56, 8);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(carX - 13, carY - 10, 26, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#991b1b';
        ctx.fillRect(carX - 20, carY + 22, 40, 6);

        ctx.fillStyle = '#f87171';
        ctx.fillRect(carX - 16, carY + 20, 6, 3);
        ctx.fillRect(carX + 10, carY + 20, 6, 3);

        ctx.fillStyle = '#18181b';
        ctx.fillRect(carX - 22, carY - 20, 5, 12);
        ctx.fillRect(carX + 17, carY - 20, 5, 12);
        ctx.fillRect(carX - 22, carY + 8, 5, 12);
        ctx.fillRect(carX + 17, carY + 8, 5, 12);

        // Exhaust flames: Regular or Nitro Boost
        if (isBoosting) {
          const turboFlameLen = Math.random() * 20 + 20;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(carX - 12, carY + 28, 5, turboFlameLen);
          ctx.fillRect(carX + 7, carY + 28, 5, turboFlameLen);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(carX - 10, carY + 28, 2, turboFlameLen * 0.7);
          ctx.fillRect(carX + 8, carY + 28, 2, turboFlameLen * 0.7);
        } else {
          const flameLength = Math.random() * 8 + 4;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(carX - 10, carY + 28, 3, flameLength);
          ctx.fillRect(carX + 7, carY + 28, 3, flameLength);
        }

        // Render Floating Text Notifications
        for (let i = outrunFloatTexts.length - 1; i >= 0; i--) {
          const ft = outrunFloatTexts[i];
          ft.y += ft.vy;
          ft.life -= 0.02;
          if (ft.life <= 0) {
            outrunFloatTexts.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
          ctx.fillStyle = ft.color;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }

        // ---------------------------------------------------------
        // ON-SCREEN DRIVER GUIDE (Left Side: What to Get & Avoid)
        // ---------------------------------------------------------
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(6, 30, 116, 360);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(6, 30, 116, 360);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ROAD GUIDE', 64, 46);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(12, 52); ctx.lineTo(116, 52); ctx.stroke();

        // COLLECT SECTION
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('GET (+PTS):', 64, 66);

        // Fuel Icon
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(16, 75, 13, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(23, 72, 4, 3);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('FUEL CAN', 34, 82);
        ctx.fillStyle = '#4ade80';
        ctx.fillText('+250★ (3 = Boost)', 34, 92);

        // Cash Stack Icon
        ctx.fillStyle = '#047857';
        ctx.fillRect(15, 108, 16, 9);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(14, 106, 16, 9);
        ctx.strokeStyle = '#6ee7b7';
        ctx.strokeRect(15, 107, 14, 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(20, 105, 4, 11);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('CASH STACK', 34, 111);
        ctx.fillStyle = '#10b981';
        ctx.fillText('+350★ (+1% Spd)', 34, 121);

        // NITRO BOOSTER GUIDE
        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(12, 133); ctx.lineTo(116, 133); ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NITRO BOOST:', 64, 146);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText('Collect 3 Fuel Cans', 64, 158);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('Press [SPACE] for', 64, 170);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('+20% SPD (3 SEC)', 64, 182);

        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(12, 192); ctx.lineTo(116, 192); ctx.stroke();

        // AVOID SECTION
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AVOID (-1 LIFE):', 64, 206);

        // Rival Car Icon
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(15, 215, 14, 18);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(17, 220, 10, 7);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('RIVAL CAR', 34, 222);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 232);

        // Boulder Icon
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(22, 250, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BOULDER', 34, 248);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 258);

        // Barricade Icon
        ctx.fillStyle = '#f97316';
        ctx.fillRect(14, 269, 16, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 269, 4, 10);
        ctx.fillText('BARRIER', 34, 275);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 285);

        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(12, 298); ctx.lineTo(116, 298); ctx.stroke();

        // Speed ramp description
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPEED RAMP:', 64, 313);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText('Starts at 50% Speed', 64, 327);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('+1% per Item Picked', 64, 341);

        // ---------------------------------------------------------
        // ON-SCREEN SPEEDOMETER & BOOSTER HUD (Right Side)
        // ---------------------------------------------------------
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(478, 30, 116, 212);
        ctx.strokeStyle = isBoosting ? '#facc15' : '#38bdf8';
        ctx.lineWidth = isBoosting ? 2.5 : 1.5;
        ctx.strokeRect(478, 30, 116, 212);

        ctx.fillStyle = isBoosting ? '#facc15' : '#38bdf8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isBoosting ? '🔥 NITRO SURGE!' : 'SPEEDOMETER', 536, 46);

        const currentSpeedPct = Math.round((50 + itemsCollected) * (isBoosting ? 1.20 : 1.0));
        ctx.fillStyle = isBoosting ? '#facc15' : currentSpeedPct > 80 ? '#f87171' : '#38bdf8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${currentSpeedPct}%`, 536, 72);

        ctx.fillStyle = isBoosting ? '#38bdf8' : '#94a3b8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(isBoosting ? '+20% NITRO BOOST!' : `+${itemsCollected}% from items`, 536, 85);

        // Speed meter bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(486, 92, 100, 8);
        const gaugeFill = Math.min(100, (currentSpeedPct / 140) * 100);
        ctx.fillStyle = isBoosting ? '#facc15' : currentSpeedPct > 80 ? '#f87171' : '#4ade80';
        ctx.fillRect(486, 92, gaugeFill, 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(`ITEMS PICKED: ${itemsCollected}`, 536, 114);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`VELOCITY: ${(speed * 10).toFixed(1)} MPH`, 536, 126);

        // Divider
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(484, 134); ctx.lineTo(588, 134); ctx.stroke();

        // NITRO BOOSTER HUD
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('NITRO BOOSTER', 536, 148);

        // 3 Fuel Gauge Pips
        for (let p = 0; p < 3; p++) {
          const pipX = 496 + p * 28;
          const pipFilled = p < fuelsTowardBoost;
          ctx.fillStyle = pipFilled ? '#dc2626' : '#1e293b';
          ctx.fillRect(pipX, 156, 20, 12);
          ctx.strokeStyle = pipFilled ? '#f87171' : '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(pipX, 156, 20, 12);
          if (pipFilled) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px sans-serif';
            ctx.fillText('⛽', pipX + 10, 165);
          }
        }

        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText(`Fuel: ${fuelsTowardBoost}/3`, 536, 180);

        // Booster Status Label
        if (isBoosting) {
          const timeLeftSec = ((boostActiveUntil - time) / 1000).toFixed(1);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`🔥 SURGE: ${timeLeftSec}s`, 536, 196);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '7px sans-serif';
          ctx.fillText('+20% Top Speed!', 536, 206);
        } else if (boostCharges > 0) {
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`🚀 READY (${boostCharges})`, 536, 196);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('PRESS [SPACE]', 536, 206);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.font = '8px sans-serif';
          ctx.fillText('Collect 3 Fuels', 536, 196);
          ctx.fillText('to charge boost', 536, 206);
        }

        if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    // -----------------------------------------------------------
    // 5. PRECISION ARCHERY: BULLSEYE (Stage 5: Present Arcade)
    // -----------------------------------------------------------
    else if (activeGameId === 'archery') {
      const archerX = 75;
      const archerY = 320;

      // Target positions for Near, Mid, Far
      const targetPositions = {
        near: { x: 340, multiplier: 1.0, label: 'Near (1.0x)' },
        mid: { x: 440, multiplier: 1.25, label: 'Mid (1.25x)' },
        far: { x: 530, multiplier: 1.5, label: 'Far (1.5x)' }
      };

      let currentDistKey: 'near' | 'mid' | 'far' = archeryDistance;
      // Target position with smooth interpolation so target visibly moves after each hit
      let targetX = targetPositions[currentDistKey].x;
      let targetTargetX = targetPositions[currentDistKey].x;
      let targetY = 240;
      let targetTargetY = 240;

      let angleDeg = archeryAngle; // 15° to 75°
      let strength = 60;
      let strengthDir = 0.8; // Tuned for comfortable, relaxed timing
      let inFlight = false;

      let arrowX = archerX;
      let arrowY = archerY;
      let arrowVx = 0;
      let arrowVy = 0;
      let arrowTrail: { x: number; y: number }[] = [];

      // Hit banner feedback
      let hitFeedback = '';
      let hitFeedbackTimer = 0;

      const bowCenterX = archerX + 26;
      const bowCenterY = archerY - 10;

      const launchArrow = () => {
        if (inFlight) return;
        inFlight = true;
        const rad = (angleDeg * Math.PI) / 180;
        const aimAngleRad = -rad;
        const launchSpeed = (strength / 100) * 17.5;
        // Arrow starts at front of bow arc
        arrowX = bowCenterX + Math.cos(aimAngleRad) * 44;
        arrowY = bowCenterY + Math.sin(aimAngleRad) * 44;
        arrowVx = launchSpeed * Math.cos(rad);
        arrowVy = -launchSpeed * Math.sin(rad);
        arrowTrail = [];
        handleSound('slingshot');
      };

      const loop = (time: number) => {
        // Smoothly interpolate target position to its new spot after scores
        targetX += (targetTargetX - targetX) * 0.08;
        targetY += (targetTargetY - targetY) * 0.08;

        // Outdoors Sky & Mountain Landscape
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#0284c7');
        skyGradient.addColorStop(0.65, '#bae6fd');
        skyGradient.addColorStop(0.65, '#15803d');
        skyGradient.addColorStop(1, '#166534');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Distant mountains
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.65);
        ctx.lineTo(140, 200);
        ctx.lineTo(300, canvas.height * 0.65);
        ctx.lineTo(450, 180);
        ctx.lineTo(600, canvas.height * 0.65);
        ctx.closePath();
        ctx.fill();

        // Target distance adjust keyboard shortcuts: [1] Near, [2] Mid, [3] Far
        if (keysPressed.current['1']) { currentDistKey = 'near'; setArcheryDistance('near'); targetTargetX = targetPositions['near'].x; }
        if (keysPressed.current['2']) { currentDistKey = 'mid'; setArcheryDistance('mid'); targetTargetX = targetPositions['mid'].x; }
        if (keysPressed.current['3']) { currentDistKey = 'far'; setArcheryDistance('far'); targetTargetX = targetPositions['far'].x; }

        // Precision angle controls with Up/Down or W/S or touch buttons (smooth 0.22 deg/frame)
        if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['TouchUp']) {
          angleDeg = Math.min(75, angleDeg + 0.22);
          setArcheryAngle(Math.round(angleDeg));
        }
        if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['TouchDown']) {
          angleDeg = Math.max(15, angleDeg - 0.22);
          setArcheryAngle(Math.round(angleDeg));
        }

        // Strength meter oscillation when not in flight
        if (!inFlight) {
          strength += strengthDir;
          if (strength >= 100 || strength <= 25) strengthDir *= -1;

          if (keysPressed.current[' '] || keysPressed.current['TouchAction']) {
            launchArrow();
          }
        } else {
          // Arrow Flight Physics across the arc
          arrowX += arrowVx;
          arrowY += arrowVy;
          arrowVy += 0.28; // Realistic gravity trajectory
          arrowTrail.push({ x: arrowX, y: arrowY });
          if (arrowTrail.length > 25) arrowTrail.shift();

          // Check hit on Target Plane (when arrow crosses targetX)
          if (arrowX >= targetX) {
            inFlight = false;
            const distFromCenter = Math.abs(arrowY - targetY);
            const distMult = targetPositions[currentDistKey].multiplier;

            if (distFromCenter < 72) {
              let pts = 0;
              let ringLabel = '';
              if (distFromCenter < 12) {
                pts = Math.round(1000 * distMult);
                ringLabel = '🎯 BULLSEYE!';
                handleSound('star');
              } else if (distFromCenter < 26) {
                pts = Math.round(600 * distMult);
                ringLabel = '🔴 RED RING!';
                handleSound('correct');
              } else if (distFromCenter < 42) {
                pts = Math.round(400 * distMult);
                ringLabel = '🔵 BLUE RING!';
                handleSound('correct');
              } else if (distFromCenter < 58) {
                pts = Math.round(200 * distMult);
                ringLabel = '⚫ BLACK RING!';
                handleSound('correct');
              } else {
                pts = Math.round(100 * distMult);
                ringLabel = '⚪ WHITE RING!';
                handleSound('correct');
              }

              localScore += pts;
              setCurrentScore(localScore);

              // TARGET MOVES AFTER EACH SUCCESSFUL SCORE!
              targetTargetY = Math.floor(Math.random() * 150 + 130); // Random Y between 130 and 280
              const xJitter = (Math.random() - 0.5) * 50;
              targetTargetX = Math.max(300, Math.min(540, targetPositions[currentDistKey].x + xJitter));

              hitFeedback = `${ringLabel} +${pts} PTS! 🎯 Target Moved!`;
              hitFeedbackTimer = time + 2200;
            } else {
              // Missed target
              localLives--;
              setLives(localLives);
              hitFeedback = '❌ MISSED TARGET!';
              hitFeedbackTimer = time + 1800;
              handleSound('wrong');
              if (localLives <= 0) {
                triggerGameOver();
                return;
              }
            }
          }

          // Hit ground
          if (arrowY >= canvas.height - 35) {
            inFlight = false;
            localLives--;
            setLives(localLives);
            hitFeedback = '❌ ARROW HIT GROUND!';
            hitFeedbackTimer = time + 1800;
            handleSound('wrong');
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }
        }

        // DRAW TARGET STAND (Tripod legs dynamically attached to moving target position)
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(targetX - 24, canvas.height - 35);
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(targetX + 24, canvas.height - 35);
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(targetX, canvas.height - 30);
        ctx.stroke();

        // DRAW CONCENTRIC TARGET RINGS
        // Ring 5: White (radius 70)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ring 4: Black (radius 56)
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 56, 0, Math.PI * 2);
        ctx.fill();

        // Ring 3: Blue (radius 42)
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 42, 0, Math.PI * 2);
        ctx.fill();

        // Ring 2: Red (radius 26)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Ring 1: Gold Bullseye (radius 12)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Target Distance & Elevation Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(targetX - 55, targetY - 95, 110, 20);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.strokeRect(targetX - 55, targetY - 95, 110, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${targetPositions[currentDistKey].label}`, targetX, targetY - 82);

        // DRAW ARCHER BODY
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(archerX, archerY - 26, 10, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(archerX - 7, archerY - 16, 14, 26); // torso
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(archerX - 7, archerY + 10, 6, 18); // left leg
        ctx.fillRect(archerX + 1, archerY + 10, 6, 18); // right leg

        // Aim angle in canvas coordinates (negative Y points UP toward the sky)
        const aimAngleRad = -(angleDeg * Math.PI) / 180;
        const rad = (angleDeg * Math.PI) / 180;

        // DOTTED TRAJECTORY PREVIEW ARC (Shows arrow flight arc)
        if (!inFlight) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          let px = bowCenterX + Math.cos(aimAngleRad) * 44;
          let py = bowCenterY + Math.sin(aimAngleRad) * 44;
          let pvx = (strength / 100) * 17.5 * Math.cos(rad);
          let pvy = -(strength / 100) * 17.5 * Math.sin(rad);
          ctx.moveTo(px, py);
          for (let step = 0; step < 26; step++) {
            px += pvx;
            py += pvy;
            pvy += 0.28;
            ctx.lineTo(px, py);
            if (py > canvas.height - 35 || px > targetX + 50) break;
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // DRAW ROTATED BOW & NOCKED ARROW (Properly aligned with angleDeg!)
        ctx.save();
        ctx.translate(bowCenterX, bowCenterY);
        ctx.rotate(aimAngleRad); // Rotates bow to point upward along aiming angle

        // Bow curved limb (curves forward toward +X along aim angle)
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 26, -Math.PI * 0.44, Math.PI * 0.44, false);
        ctx.stroke();

        // Bow tips
        ctx.fillStyle = '#facc15';
        ctx.fillRect(Math.cos(-Math.PI * 0.44) * 26 - 2, Math.sin(-Math.PI * 0.44) * 26 - 2, 4, 4);
        ctx.fillRect(Math.cos(Math.PI * 0.44) * 26 - 2, Math.sin(Math.PI * 0.44) * 26 - 2, 4, 4);

        // Bow string: pulls back along -X based on draw strength
        const pullBackDist = (strength / 100) * 18;
        const stringNockX = -pullBackDist;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(-Math.PI * 0.44) * 26, Math.sin(-Math.PI * 0.44) * 26);
        ctx.lineTo(stringNockX, 0);
        ctx.lineTo(Math.cos(Math.PI * 0.44) * 26, Math.sin(Math.PI * 0.44) * 26);
        ctx.stroke();

        // NOCKED ARROW: rests on string at stringNockX and CROSSES THE BOW ARC to the front!
        if (!inFlight) {
          // Shaft crosses through bow arc
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(stringNockX, 0);
          ctx.lineTo(stringNockX + 46, 0);
          ctx.stroke();

          // Steel arrowhead
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(stringNockX + 46, 0);
          ctx.lineTo(stringNockX + 37, -5);
          ctx.lineTo(stringNockX + 37, 5);
          ctx.closePath();
          ctx.fill();

          // Fletching feathers at nock
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(stringNockX, -1); ctx.lineTo(stringNockX + 9, -6); ctx.lineTo(stringNockX + 13, -1);
          ctx.moveTo(stringNockX, 1); ctx.lineTo(stringNockX + 9, 6); ctx.lineTo(stringNockX + 13, 1);
          ctx.fill();
        }

        ctx.restore();

        // DRAW IN-FLIGHT ARROW (Smoothly flying along the parabolic arc)
        if (inFlight) {
          // Flight trail
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          arrowTrail.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.save();
          ctx.translate(arrowX, arrowY);
          const flightAngle = Math.atan2(arrowVy, arrowVx);
          ctx.rotate(flightAngle);

          // Arrow shaft
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-22, 0);
          ctx.lineTo(22, 0);
          ctx.stroke();

          // Steel point
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(13, -5);
          ctx.lineTo(13, 5);
          ctx.closePath();
          ctx.fill();

          // Fletchings
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(-22, -1); ctx.lineTo(-14, -6); ctx.lineTo(-10, -1);
          ctx.moveTo(-22, 1); ctx.lineTo(-14, 6); ctx.lineTo(-10, 1);
          ctx.fill();
          ctx.restore();
        }

        // HIT FEEDBACK BANNER (Notifies score and when target relocates)
        if (time < hitFeedbackTimer) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(canvas.width / 2 - 170, 20, 340, 44);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(canvas.width / 2 - 170, 20, 340, 44);
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(hitFeedback, canvas.width / 2, 47);
        }

        // HUD: Angle & Strength meters
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(15, canvas.height - 55, 235, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🏹 ANGLE: ${Math.round(angleDeg)}° [W/S]`, 25, canvas.height - 38);
        ctx.fillText(`⚡ STRENGTH: ${Math.round(strength)}%`, 25, canvas.height - 20);

        // Power gauge bar
        ctx.fillStyle = '#334155';
        ctx.fillRect(135, canvas.height - 29, 100, 10);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(135, canvas.height - 29, (strength / 100) * 100, 10);

        if (!isEnded) gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasPointer);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying, activeGameId, archeryDistance, archeryAngle]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isExpanded ? 'p-0 bg-slate-950' : 'p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md'} animate-fade-in`}>
      <div className={`bg-slate-900 border-2 sm:border-4 border-amber-500/80 ${isExpanded ? 'w-full h-full rounded-none' : 'rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[96vh] sm:h-[92vh] max-h-[820px]'} flex flex-col shadow-2xl overflow-hidden text-white`}>
        {/* Top Retro Arcade Header */}
        <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-black text-base sm:text-lg text-amber-400 tracking-wider uppercase leading-none">
                  STEM Arcade Intermission
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 hidden sm:inline-block">
                  3 Lives Challenge
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Stage {currentGame.stageNumber} Challenge: {currentGame.title} ({currentGame.arcadeClassic})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title={isExpanded ? 'Exit Full Screen' : 'Expand to Full Screen'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
                onClose();
              }}
              aria-label="Close arcade"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5 Stage Game Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
          {(Object.keys(ARCADE_GAMES) as ArcadeGameId[]).map(gId => {
            const game = ARCADE_GAMES[gId];
            const isCurrent = activeGameId === gId;
            const highScore = scores[gId] || 0;

            return (
              <button
                key={gId}
                onClick={() => handleSelectGame(gId)}
                className={`px-2.5 py-1 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>{game.stageNumber}. {game.title}</span>
                <span className="text-[10px] px-1 py-0.2 rounded-md bg-black/30 font-mono">
                  {highScore > 0 ? `${highScore}★` : '0'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Responsive Play Area - Scaled to Screen without Cutoff */}
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-between p-2 sm:p-3 overflow-hidden select-none">
          {/* Compact HUD Bar */}
          <div className="w-full max-w-xl flex items-center justify-between px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs shrink-0 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Score:</span>
              <span className="font-mono font-black text-base sm:text-lg text-amber-400">{currentScore}</span>
            </div>

            {/* 3 Lives indicator */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 mr-0.5">Lives:</span>
              {[1, 2, 3].map(heartIdx => (
                <Heart
                  key={heartIdx}
                  className={`w-4 h-4 transition-all ${
                    lives >= heartIdx
                      ? 'fill-rose-500 text-rose-500 animate-pulse'
                      : 'fill-slate-800 text-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Space Invaders Live Accuracy Indicator */}
            {activeGameId === 'space_invaders' && (
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span className={invaderAccuracy >= 70 ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}>
                  Acc: {invaderAccuracy}% {invaderAccuracy >= 70 ? '🎯' : ''}
                </span>
                {isChallengeRound(waveNumber) && (
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] animate-pulse">
                    ⭐ Challenge
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] text-amber-300 font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Best: {Math.max(scores[activeGameId] || 0, currentScore)}</span>
            </div>
          </div>

          {/* Canvas Screen Wrapper - Responsive Contain */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden">
            <div className="relative border-2 sm:border-4 border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-black max-h-full max-w-full flex items-center justify-center aspect-[600/420]">
              <canvas
                ref={canvasRef}
                width={600}
                height={420}
                style={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  aspectRatio: '600 / 420',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                className="block bg-black max-h-full"
              />

              {/* Start Screen Overlay */}
              {!isPlaying && !gameOver && (() => {
                const currentAttempts = (attempts && typeof attempts === 'object' && attempts[activeGameId]) || 0;
                const canPlayGame = certificateUnlocked || currentAttempts < 2;

                const handleStartGame = () => {
                  if (!canPlayGame) return;
                  if (onRecordAttempt) {
                    onRecordAttempt(activeGameId);
                  }
                  setLives(3);
                  setCurrentScore(0);
                  setGameOver(false);
                  setIsPlaying(true);
                  handleSound('slingshot');
                };

                return (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 text-center space-y-2 sm:space-y-3">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      {currentGame.arcadeClassic} Edition
                    </span>
                    <h3 className="font-display font-black text-xl sm:text-2xl text-white">
                      {currentGame.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 max-w-sm leading-snug line-clamp-2">
                      {currentGame.tagline}
                    </p>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 text-[11px] text-amber-200 max-w-sm">
                      🎮 {currentGame.instructions}
                    </div>

                    {/* Attempt Status Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-300">
                      {certificateUnlocked ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Unlimited Free Play Active (Certificate Achieved!)
                        </span>
                      ) : currentAttempts === 0 ? (
                        <span className="text-sky-300">Attempt 1 of 2 • 1 Additional Replay Available</span>
                      ) : currentAttempts === 1 ? (
                        <span className="text-amber-300">Attempt 2 of 2 • Final Stage Play!</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Stage Limit Reached (2/2 Plays Used)
                        </span>
                      )}
                    </div>

                    {!canPlayGame ? (
                      <div className="space-y-2 pt-1 max-w-sm">
                        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-display font-bold text-xs">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Stage Plays Completed (2/2 Used)</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            You've used your 1 additional play for Stage {currentGame.stageNumber}! Time to continue your questions.
                          </p>
                          <p className="text-[10px] text-amber-300 font-semibold">
                            ⭐ Unlock your Certificate with 38+ stars to replay all games as much as you want!
                          </p>
                        </div>
                        <button
                          onClick={onClose}
                          className="game-btn w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-display font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>Continue to Stage Questions</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartGame}
                        className="game-btn px-6 sm:px-8 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/30 hover:scale-105 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>
                          {certificateUnlocked
                            ? 'Insert Coin / Start Game (Unlimited Free Play)'
                            : currentAttempts === 0
                            ? 'Insert Coin / Start Game (Play 1 of 2)'
                            : 'Insert Coin / Play 1 Additional Time (Play 2 of 2)'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Game Over Screen Overlay */}
              {gameOver && (() => {
                const currentAttempts = (attempts && typeof attempts === 'object' && attempts[activeGameId]) || 0;
                const currentHighScore = (scores && typeof scores === 'object' && scores[activeGameId]) || 0;
                const canPlayAgain = certificateUnlocked || currentAttempts < 2;

                const handlePlayAgain = () => {
                  if (!canPlayAgain) return;
                  if (onRecordAttempt) {
                    onRecordAttempt(activeGameId);
                  }
                  setLives(3);
                  setCurrentScore(0);
                  setGameOver(false);
                  setIsPlaying(true);
                  handleSound('slingshot');
                };

                return (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 text-center space-y-2 sm:space-y-3 animate-fade-in">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                      Challenge Complete • Game Over
                    </span>
                    <h3 className="font-display font-black text-2xl sm:text-3xl text-white">
                      Final Score: <span className="text-amber-400">{currentScore}</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      {currentScore > currentHighScore
                        ? '🎉 NEW HIGH SCORE! Recorded to your official Certificate!'
                        : `High Score: ${currentHighScore}`}
                    </p>

                    {/* Stage 5 Finale (Archery) or Certificate Unlocked: Dedicated Generate Certificate Button */}
                    {(activeGameId === 'archery' || certificateUnlocked) && (
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenCertificate) onOpenCertificate();
                        }}
                        className="game-btn w-full max-w-sm px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-400 text-slate-950 font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-105 animate-pulse cursor-pointer"
                      >
                        <Trophy className="w-4 h-4 text-slate-950" />
                        <span>🎓 Generate Official Certificate</span>
                        <ArrowRight className="w-4 h-4 text-slate-950" />
                      </button>
                    )}

                    {canPlayAgain ? (
                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={handlePlayAgain}
                          className="game-btn px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-display font-bold text-xs flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{certificateUnlocked ? 'Play Again' : 'Play 1 Additional Time'}</span>
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            if ((activeGameId === 'archery' || certificateUnlocked) && onOpenCertificate) {
                              onOpenCertificate();
                            }
                          }}
                          className="game-btn px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs"
                        >
                          {activeGameId === 'archery' ? 'Finish Quest & View Certificate' : 'Continue to Questions'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 max-w-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Stage Plays Completed (2/2)</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {activeGameId === 'archery'
                              ? 'Stage 5 Complete! You can now claim your Certificate of Achievement and turn it into Google Classroom.'
                              : "You've used your 1 additional play for this stage! Return to the questions to earn stars. Unlock your Certificate at 38★ to replay anytime!"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            if ((activeGameId === 'archery' || certificateUnlocked) && onOpenCertificate) {
                              onOpenCertificate();
                            }
                          }}
                          className="game-btn w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <span>{activeGameId === 'archery' ? 'View Certificate of Achievement' : 'Continue to Stage Questions'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Space Invaders Strategy Guide Bar */}
          {activeGameId === 'space_invaders' && (
            <div className="w-full max-w-xl flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-950/90 border border-slate-800 rounded-xl text-xs shrink-0 mt-1">
              <div className="flex items-center gap-1.5 text-[11px] truncate">
                <span className="text-amber-400 font-bold">Tactics:</span>
                <span className="text-slate-300">💣 Shoot falling bombs (+100★ & area blast!) • 🎯 &gt;70% Acc = Bonus • Dive Kills = 2x Pts</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] shrink-0 font-bold text-sky-400">
                <span>Wave {waveNumber}</span>
              </div>
            </div>
          )}

          {/* Outrun Road Guide Bar (when Outrun is active) */}
          {activeGameId === 'outrun' && (
            <div className="w-full max-w-xl flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-950/90 border border-slate-800 rounded-xl text-xs shrink-0 mt-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-emerald-400 font-bold">Collect:</span>
                <span className="text-slate-300">⛽ Fuel (+250★) & 💵 Cash Stacks (+350★)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-amber-400 font-bold">🚀 3 Fuels = Nitro:</span>
                <span className="text-slate-300">Press [Space] for +20% Speed (3s)</span>
              </div>
            </div>
          )}

          {/* Archery Target Distance Selector Bar (when Archery is active) */}
          {activeGameId === 'archery' && (
            <div className="w-full max-w-xl flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-950/90 border border-slate-800 rounded-xl text-xs shrink-0 mt-1">
              <span className="text-slate-400 text-[11px] font-bold">🎯 Target Distance:</span>
              <div className="flex items-center gap-1">
                {(['near', 'mid', 'far'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setArcheryDistance(d)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      archeryDistance === d
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d} ({d === 'near' ? '1.0x' : d === 'mid' ? '1.25x' : '1.5x'})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* On-Screen Touch / Click Controls - Scaled & Compact */}
          <div className="w-full max-w-xl flex items-center justify-between gap-2 shrink-0 pt-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onMouseDown={() => { keysPressed.current['TouchLeft'] = true; }}
                onMouseUp={() => { keysPressed.current['TouchLeft'] = false; }}
                onTouchStart={() => { keysPressed.current['TouchLeft'] = true; }}
                onTouchEnd={() => { keysPressed.current['TouchLeft'] = false; }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-white active:bg-amber-500 active:text-black font-bold"
                aria-label="Steer Left"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onMouseDown={() => { keysPressed.current['TouchRight'] = true; }}
                onMouseUp={() => { keysPressed.current['TouchRight'] = false; }}
                onTouchStart={() => { keysPressed.current['TouchRight'] = true; }}
                onTouchEnd={() => { keysPressed.current['TouchRight'] = false; }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-white active:bg-amber-500 active:text-black font-bold"
                aria-label="Steer Right"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {(activeGameId === 'dig_dug' || activeGameId === 'tetris' || activeGameId === 'archery') && (
                <>
                  <button
                    onMouseDown={() => { keysPressed.current['TouchUp'] = true; keysPressed.current['w'] = true; }}
                    onMouseUp={() => { keysPressed.current['TouchUp'] = false; keysPressed.current['w'] = false; }}
                    onTouchStart={() => { keysPressed.current['TouchUp'] = true; keysPressed.current['w'] = true; }}
                    onTouchEnd={() => { keysPressed.current['TouchUp'] = false; keysPressed.current['w'] = false; }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-white active:bg-amber-500 active:text-black font-bold"
                    aria-label="Up / Rotate / Angle Up"
                  >
                    <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onMouseDown={() => { keysPressed.current['TouchDown'] = true; keysPressed.current['s'] = true; }}
                    onMouseUp={() => { keysPressed.current['TouchDown'] = false; keysPressed.current['s'] = false; }}
                    onTouchStart={() => { keysPressed.current['TouchDown'] = true; keysPressed.current['s'] = true; }}
                    onTouchEnd={() => { keysPressed.current['TouchDown'] = false; keysPressed.current['s'] = false; }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-white active:bg-amber-500 active:text-black font-bold"
                    aria-label="Down / Drop / Angle Down"
                  >
                    <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </>
              )}
            </div>

            <button
              onMouseDown={() => { keysPressed.current['TouchAction'] = true; }}
              onMouseUp={() => { keysPressed.current['TouchAction'] = false; }}
              onTouchStart={() => { keysPressed.current['TouchAction'] = true; }}
              onTouchEnd={() => { keysPressed.current['TouchAction'] = false; }}
              className={`px-4 sm:px-6 py-2 rounded-xl text-white font-display font-extrabold text-xs sm:text-sm active:scale-95 shadow-md flex items-center gap-1.5 transition-all ${
                activeGameId === 'outrun' && outrunBoostCharges > 0
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 animate-pulse ring-2 ring-amber-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
            >
              {activeGameId === 'archery'
                ? '🎯 Release Arrow'
                : activeGameId === 'space_invaders'
                ? '⚡ Fire Laser'
                : activeGameId === 'dig_dug'
                ? '💨 Air Pump'
                : activeGameId === 'outrun'
                ? outrunIsBoosting
                  ? '🔥 BOOST ACTIVE!'
                  : outrunBoostCharges > 0
                  ? `🚀 NITRO BOOST [SPACE] (${outrunBoostCharges})`
                  : `⚡ Boost (${outrunFuelsCount}/3 Fuels)`
                : 'Action'}
            </button>
          </div>
        </div>

        {/* Slim Footer */}
        <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="truncate">Keyboard: [Arrow Keys / A-D / W-S] • [Space] to Action / Boost • [1-3] Target Distance</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs shrink-0 ml-2"
          >
            Back to Map
          </button>
        </div>
      </div>
    </div>
  );
};
