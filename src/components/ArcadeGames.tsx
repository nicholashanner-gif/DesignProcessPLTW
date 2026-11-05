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
  playSynthSound
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
}

export const ArcadeGamesModal: React.FC<ArcadeGamesModalProps> = ({
  initialGameId = 'space_invaders',
  onClose,
  scores,
  onUpdateHighScore,
  soundEnabled,
  certificateUnlocked = false,
  attempts = { space_invaders: 0, dig_dug: 0, tetris: 0, outrun: 0, archery: 0 },
  onRecordAttempt
}) => {
  const [activeGameId, setActiveGameId] = useState<ArcadeGameId>(initialGameId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extra HUD states for game-specific feedback
  const [waveNumber, setWaveNumber] = useState(1);
  const [digDugTimeLeft, setDigDugTimeLeft] = useState(120);
  const [tetrisLinesCleared, setTetrisLinesCleared] = useState(0);
  const [archeryDistance, setArcheryDistance] = useState<'near' | 'mid' | 'far'>('mid');
  const [archeryAngle, setArcheryAngle] = useState(42);

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
    setDigDugTimeLeft(120);
    setTetrisLinesCleared(0);
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
    // 1. SPACE INVADERS / GALAGA (Stage 1: Ask Arcade)
    // -----------------------------------------------------------
    if (activeGameId === 'space_invaders') {
      let playerX = canvas.width / 2;
      const playerY = canvas.height - 35;
      const playerSpeed = 6.2;
      let bullets: { x: number; y: number; active: boolean }[] = [];
      let alienLasers: { x: number; y: number; active: boolean; vy: number }[] = [];
      let lastShot = 0;
      let lastAlienShot = 0;
      let playerInvulnerableUntil = 1500;
      let currentWave = 1;
      let waveBannerTime = 2000; // Show wave announcement

      interface Invader {
        x: number;
        y: number;
        row: number;
        col: number;
        alive: boolean;
        type: 'mothership' | 'crab' | 'stinger';
        points: number;
      }

      const types: ('mothership' | 'crab' | 'stinger')[] = ['mothership', 'crab', 'stinger'];
      const pointValues = [200, 150, 100];

      // Clean grid spawn helper (Fixes bug where all ships spawned on the same starting line)
      const spawnWaveInvaders = (wave: number): Invader[] => {
        const list: Invader[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 6; c++) {
            list.push({
              x: 55 + c * 82,
              y: 45 + r * 44, // Distinct 3-row grid: y = 45, 89, 133
              row: r,
              col: c,
              alive: true,
              type: types[r],
              points: Math.round(pointValues[r] * Math.pow(1.10, wave - 1))
            });
          }
        }
        return list;
      };

      let invaders: Invader[] = spawnWaveInvaders(1);
      let fleetDirection = 1;

      const loop = (time: number) => {
        // Clear
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Starfield
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 28; i++) {
          const sx = (Math.sin(i * 99 + time * 0.001) * 0.5 + 0.5) * canvas.width;
          const sy = ((time * 0.08 + i * 40) % canvas.height);
          ctx.fillRect(sx, sy, 2, 2);
        }

        // Wave speed scaling: 10% faster each round
        const speedScale = Math.pow(1.10, currentWave - 1);
        const invaderMoveSpeed = 1.0 * speedScale;
        const alienShotInterval = Math.max(350, 1400 / speedScale);
        const alienLaserSpeed = 3.2 * speedScale;

        // Player Controls
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) {
          playerX = Math.max(30, playerX - playerSpeed);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) {
          playerX = Math.min(canvas.width - 30, playerX + playerSpeed);
        }
        if ((keysPressed.current[' '] || keysPressed.current['TouchAction']) && time - lastShot > 200) {
          bullets.push({ x: playerX, y: playerY - 15, active: true });
          lastShot = time;
          handleSound('click');
        }

        // Alien shooting (10% faster frequency each round)
        if (time - lastAlienShot > alienShotInterval) {
          const livingInvaders = invaders.filter(i => i.alive);
          if (livingInvaders.length > 0) {
            const shooter = livingInvaders[Math.floor(Math.random() * livingInvaders.length)];
            alienLasers.push({ x: shooter.x, y: shooter.y + 14, active: true, vy: alienLaserSpeed });
            lastAlienShot = time;
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
        bullets.forEach(b => {
          if (!b.active) return;
          b.y -= 8.5;
          ctx.fillRect(b.x - 2, b.y, 4, 14);
          if (b.y < 0) b.active = false;
        });
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
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }
          if (al.y > canvas.height) al.active = false;
        });
        alienLasers = alienLasers.filter(al => al.active);

        // Update & Draw Alien Spaceships
        let hitEdge = false;
        let aliveCount = 0;

        invaders.forEach(inv => {
          if (!inv.alive) return;
          aliveCount++;
          inv.x += fleetDirection * invaderMoveSpeed;
          if (inv.x > canvas.width - 35 || inv.x < 35) hitEdge = true;

          // Check bullet hit on alien
          bullets.forEach(b => {
            if (b.active && Math.abs(b.x - inv.x) < 24 && Math.abs(b.y - inv.y) < 16) {
              b.active = false;
              inv.alive = false;
              localScore += inv.points;
              setCurrentScore(localScore);
              handleSound('correct');
            }
          });

          // Check bottom crash or player collision
          if (!isShielded && (inv.y > playerY - 14 || (Math.abs(inv.x - playerX) < 26 && Math.abs(inv.y - playerY) < 18))) {
            inv.alive = false;
            localLives--;
            setLives(localLives);
            playerInvulnerableUntil = time + 1800;
            handleSound('wrong');
            if (localLives <= 0) {
              triggerGameOver();
              return;
            }
          }

          // RENDER ALIEN SPACESHIP (Differentiated retro sprites)
          if (inv.type === 'mothership') {
            // 1. Mothership Cruiser
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.ellipse(inv.x, inv.y, 18, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(inv.x, inv.y - 3, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(inv.x - 17, inv.y - 3, 4, 7);
            ctx.fillRect(inv.x + 13, inv.y - 3, 4, 7);
          } else if (inv.type === 'crab') {
            // 2. Alien Crab Scout
            const clawOffset = Math.sin(time * 0.007) * 3;
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(inv.x - 11, inv.y - 7, 22, 14);
            ctx.fillRect(inv.x - 9, inv.y - 12, 3, 6);
            ctx.fillRect(inv.x + 6, inv.y - 12, 3, 6);
            ctx.fillRect(inv.x - 17 - clawOffset, inv.y - 4, 6, 10);
            ctx.fillRect(inv.x + 11 + clawOffset, inv.y - 4, 6, 10);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(inv.x - 7, inv.y - 2, 4, 4);
            ctx.fillRect(inv.x + 3, inv.y - 2, 4, 4);
          } else {
            // 3. Alien Stinger Fighter
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(inv.x, inv.y + 11);
            ctx.lineTo(inv.x - 15, inv.y - 9);
            ctx.lineTo(inv.x + 15, inv.y - 9);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(inv.x, inv.y - 2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Drop down fleet on boundary bounce
        if (hitEdge) {
          fleetDirection *= -1;
          invaders.forEach(inv => { inv.y += 8; });
        }

        // NEXT WAVE PROGRESSION (+10% Speed & Shooting, clean 3-row grid respawn)
        if (aliveCount === 0 && !isEnded) {
          currentWave++;
          setWaveNumber(currentWave);
          localScore += 600 * currentWave;
          setCurrentScore(localScore);
          handleSound('star');
          invaders = spawnWaveInvaders(currentWave);
          waveBannerTime = time + 2000;
          fleetDirection = 1;
        }

        // HUD: Wave Banner
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`ROUND / WAVE ${currentWave} (+${Math.round((speedScale - 1) * 100)}% SPD)`, 15, 20);

        if (time < waveBannerTime) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.font = 'black 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⚡ WAVE ${currentWave} • 10% FASTER! ⚡`, canvas.width / 2, 90);
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
      let roundBannerText = '';
      let roundBannerUntil = 0;

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
        const elapsed = time - gameStartTime;
        const remainingSeconds = Math.max(0, Math.ceil((TOTAL_DURATION_MS - elapsed) / 1000));
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
          roundBannerText = `🎉 ROUND ${digDugRound} COMPLETED! +1 RANDOM MONSTER ADDED!`;
          roundBannerUntil = time + 2500;

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
        }

        // UPDATE & DRAW SUBTERRANEAN MONSTERS (1 Chaser + Random Roaming Monsters)
        const isShielded = time < minerInvulnerableUntil;

        enemies.forEach(en => {
          if (!en.alive) return;
          const isStunned = time < en.stunnedUntil;

          if (!isStunned && elapsed > 1500) {
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

        // Draw Round Banner announcement
        if (time < roundBannerUntil && roundBannerText) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(35, 75, canvas.width - 70, 36);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(35, 75, canvas.width - 70, 36);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(roundBannerText, canvas.width / 2, 97);
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

      // Collectibles: Fuel Jerry Cans & Spinning Gold Rings
      interface Collectible {
        x: number;
        y: number;
        type: 'fuel' | 'gold_ring';
      }

      let collectibles: Collectible[] = [
        { x: 250, y: -140, type: 'fuel' },
        { x: 410, y: -360, type: 'gold_ring' }
      ];

      const loop = (time: number) => {
        // Track Grass Background
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Asphalt Highway (3 lanes)
        const roadW = 340;
        const roadL = (canvas.width - roadW) / 2;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(roadL, 0, roadW, canvas.height);

        // Solid Yellow Road Boundaries (Non-flashing)
        ctx.fillStyle = '#facc15'; // Solid safety yellow edge
        ctx.fillRect(roadL - 8, 0, 8, canvas.height);
        ctx.fillRect(roadL + roadW, 0, 8, canvas.height);
        // Inner crisp amber border for road definition
        ctx.fillStyle = '#ca8a04';
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

        // Controls
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['TouchLeft']) {
          carX = Math.max(roadL + 22, carX - 6.5);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['TouchRight']) {
          carX = Math.min(roadL + roadW - 22, carX + 6.5);
        }

        // Distance points
        localScore += 2;
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

        // MOVE & RENDER COLLECTIBLES (Fuel Jerry Cans & Spinning Gold Rings)
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
            ctx.font = 'black 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FUEL', col.x, col.y + 4);
          } else {
            // Spinning 3D Golden Ring
            const ringWidth = Math.abs(Math.sin(time * 0.005)) * 14 + 4;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(col.x, col.y, ringWidth, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(col.x - 1, col.y - 1, 3, 3);
          }

          // Pickup check: award points, increment items, ramp speed up 1%
          if (Math.abs(carX - col.x) < 28 && Math.abs(carY - col.y) < 26) {
            col.y = -100;
            col.x = roadL + Math.random() * (roadW - 50) + 25;
            itemsCollected++;
            speed = baseSpeed * (1 + itemsCollected * 0.01);
            localScore += col.type === 'fuel' ? 250 : 350;
            setCurrentScore(localScore);
            handleSound('correct');
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

        const flameLength = Math.random() * 8 + 4;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(carX - 10, carY + 28, 3, flameLength);
        ctx.fillRect(carX + 7, carY + 28, 3, flameLength);

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
        ctx.fillText('+250★ (+1% Spd)', 34, 92);

        // Gold Ring Icon
        const guideRingW = Math.abs(Math.sin(time * 0.005)) * 7 + 3;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(22, 114, guideRingW, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('GOLD RING', 34, 111);
        ctx.fillStyle = '#facc15';
        ctx.fillText('+350★ (+1% Spd)', 34, 121);

        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(12, 134); ctx.lineTo(116, 134); ctx.stroke();

        // AVOID SECTION
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AVOID (-1 LIFE):', 64, 148);

        // Rival Car Icon
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(15, 158, 14, 20);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(17, 163, 10, 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('RIVAL CAR', 34, 166);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 176);

        // Boulder Icon
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(22, 196, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BOULDER', 34, 194);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 204);

        // Barricade Icon
        ctx.fillStyle = '#f97316';
        ctx.fillRect(14, 216, 16, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 216, 4, 10);
        ctx.fillText('BARRIER', 34, 222);
        ctx.fillStyle = '#f87171';
        ctx.fillText('Lose 1 Life', 34, 232);

        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(12, 245); ctx.lineTo(116, 245); ctx.stroke();

        // Speed ramp description
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPEED RAMP:', 64, 260);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText('Starts at 50% Speed', 64, 274);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('+1% per Item Picked', 64, 288);

        // ---------------------------------------------------------
        // ON-SCREEN SPEEDOMETER & ITEMS HUD (Right Side)
        // ---------------------------------------------------------
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(478, 30, 116, 140);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(478, 30, 116, 140);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPEEDOMETER', 536, 46);

        const currentSpeedPct = Math.round(50 + itemsCollected);
        ctx.fillStyle = currentSpeedPct > 80 ? '#f87171' : currentSpeedPct > 65 ? '#facc15' : '#38bdf8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${currentSpeedPct}%`, 536, 74);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(`+${itemsCollected}% from items`, 536, 88);

        // Speed meter bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(486, 96, 100, 10);
        const gaugeFill = Math.min(100, (currentSpeedPct / 120) * 100);
        ctx.fillStyle = currentSpeedPct > 80 ? '#f87171' : currentSpeedPct > 65 ? '#facc15' : '#4ade80';
        ctx.fillRect(486, 96, gaugeFill, 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(`ITEMS COLLECTED: ${itemsCollected}`, 536, 124);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`VELOCITY: ${(speed * 10).toFixed(1)} MPH`, 536, 136);

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
      let strengthDir = 1.8;
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

        // Angle controls with Up/Down or W/S
        if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) {
          angleDeg = Math.min(75, angleDeg + 0.6);
          setArcheryAngle(Math.round(angleDeg));
        }
        if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) {
          angleDeg = Math.max(15, angleDeg - 0.6);
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
                          onClick={onClose}
                          className="game-btn px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs"
                        >
                          Continue to Questions
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
                            You've used your 1 additional play for this stage! Return to the questions to earn stars. Unlock your Certificate at 38★ to replay anytime!
                          </p>
                        </div>
                        <button
                          onClick={onClose}
                          className="game-btn w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <span>Continue to Stage Questions</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Outrun Road Guide Bar (when Outrun is active) */}
          {activeGameId === 'outrun' && (
            <div className="w-full max-w-xl flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-950/90 border border-slate-800 rounded-xl text-xs shrink-0 mt-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-emerald-400 font-bold">Collect:</span>
                <span className="text-slate-300">⛽ Fuel (+250★) & 🟡 Rings (+350★) • +1% Speed</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-rose-400 font-bold">Avoid:</span>
                <span className="text-slate-300">🚙 Cars, 🪨 Rocks, 🚧 Barriers (-1 ❤️)</span>
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
              className="px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-display font-extrabold text-xs sm:text-sm active:scale-95 shadow-md flex items-center gap-1.5"
            >
              {activeGameId === 'archery'
                ? '🎯 Release Arrow'
                : activeGameId === 'space_invaders'
                ? '⚡ Fire Laser'
                : activeGameId === 'dig_dug'
                ? '💨 Air Pump'
                : activeGameId === 'outrun'
                ? '⚡ Steer'
                : 'Action'}
            </button>
          </div>
        </div>

        {/* Slim Footer */}
        <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="truncate">Keyboard: [Arrow Keys / W-S] + [Space] to Action • [1-3] Target Distance</span>
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
