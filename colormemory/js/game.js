'use strict';

// ─── Constants ──────────────────────────────────────────────────────────
const COLORS = ['red', 'blue', 'green', 'yellow'];

// 4 slot positions: top-left, top-right, bottom-left, bottom-right
const SLOTS = [
  { top: 0,    left: 0    },
  { top: 0,    left: 166  },
  { top: 166,  left: 0    },
  { top: 166,  left: 166  },
];

const DEFAULT_SLOTS = { red: 0, blue: 1, green: 2, yellow: 3 };

// Tone frequencies per color
const FREQ = { red: 220, blue: 294, green: 370, yellow: 494 };

// ─── State ──────────────────────────────────────────────────────────────
let sequence     = [];
let playerIndex  = 0;
let currentLevel = 0;
let playerTurn   = false;
let colorToSlot  = {};
let audioCtx     = null;

// ─── Audio ──────────────────────────────────────────────────────────────
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(color, ms) {
  try {
    initAudio();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = FREQ[color];
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch (_) {}
}

function beepWrong() {
  try {
    initAudio();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.55);
  } catch (_) {}
}

// ─── Helpers ────────────────────────────────────────────────────────────
const pause = ms => new Promise(r => setTimeout(r, ms));

function getSpeed(level) {
  if (level <= 5)  return { flashMs: 700, gapMs: 350, betweenMs: 500 };
  if (level <= 10) return { flashMs: 430, gapMs: 220, betweenMs: 320 };
  if (level <= 15) return { flashMs: 270, gapMs: 140, betweenMs: 200 };
  return                  { flashMs: 150, gapMs: 80,  betweenMs: 130 };
}

function getPhase(level) {
  if (level <= 5)  return 'Easy & Slow';
  if (level <= 10) return 'Getting Faster';
  if (level <= 15) return 'Long & Tough';
  return                  'Super Fast + Swap!';
}

const el = color => document.getElementById('sq-' + color);

// ─── UI ─────────────────────────────────────────────────────────────────
function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function updateProgress() {
  document.getElementById('level-text').textContent = `Level ${currentLevel} / 20`;
  document.getElementById('phase-text').textContent = getPhase(currentLevel);
  document.getElementById('bar').style.width = (currentLevel / 20 * 100) + '%';
}

function renderDots() {
  const c = document.getElementById('dots');
  c.innerHTML = '';
  sequence.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot'
      + (i < playerIndex             ? ' done'   : '')
      + (i === playerIndex && playerTurn ? ' active' : '');
    c.appendChild(d);
  });
}

function setClickable(on) {
  COLORS.forEach(c => {
    on ? el(c).classList.remove('no-click')
       : el(c).classList.add('no-click');
  });
}

// ─── Square positions ────────────────────────────────────────────────────
function applyPositions(animate) {
  COLORS.forEach(color => {
    const sq = el(color);
    if (!animate) {
      sq.style.transition = 'none';
    }
    const { top, left } = SLOTS[colorToSlot[color]];
    sq.style.top  = top  + 'px';
    sq.style.left = left + 'px';
    if (!animate) {
      void sq.offsetHeight;
      sq.style.transition = '';
    }
  });
}

function resetPositions() {
  colorToSlot = { ...DEFAULT_SLOTS };
  applyPositions(false);
}

function swapPositions() {
  const slots = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  COLORS.forEach((color, i) => { colorToSlot[color] = slots[i]; });
  applyPositions(true);
}

// ─── Flash animation ─────────────────────────────────────────────────────
async function flash(color, ms) {
  const sq = el(color);
  sq.classList.add('fl-' + color);
  beep(color, ms);
  await pause(ms);
  sq.classList.remove('fl-' + color);
}

// ─── Core loop ───────────────────────────────────────────────────────────
async function playSequence() {
  setClickable(false);
  setStatus('Watch the pattern...');
  const { flashMs, gapMs, betweenMs } = getSpeed(currentLevel);

  for (const color of sequence) {
    await pause(betweenMs);
    await flash(color, flashMs);
    await pause(gapMs);
  }

  if (currentLevel >= 16) {
    setStatus('Squares are swapping — remember the COLORS!');
    await pause(450);
    swapPositions();
    await pause(700);
  }

  playerTurn  = true;
  playerIndex = 0;
  setClickable(true);
  renderDots();
  setStatus('Your turn! Click in the same order.');
}

function handleClick(color) {
  if (!playerTurn) return;

  const expected = sequence[playerIndex];

  if (color === expected) {
    flash(color, 180);
    playerIndex++;
    renderDots();

    if (playerIndex === sequence.length) {
      playerTurn = false;
      setClickable(false);

      if (currentLevel === 20) {
        setTimeout(() => document.getElementById('ov-win').classList.remove('hidden'), 700);
      } else {
        setStatus(`Level ${currentLevel} complete! ✓`);
        setTimeout(advanceLevel, 1200);
      }
    }
  } else {
    playerTurn = false;
    setClickable(false);
    beepWrong();
    el(color).classList.add('sq-wrong');
    setTimeout(() => {
      el(color).classList.remove('sq-wrong');
      document.getElementById('msg-gameover').textContent =
        `You reached Level ${currentLevel} with a ${sequence.length}-step pattern.`;
      document.getElementById('ov-gameover').classList.remove('hidden');
    }, 750);
  }
}

async function advanceLevel() {
  currentLevel++;
  playerIndex = 0;
  sequence.push(COLORS[Math.floor(Math.random() * 4)]);
  resetPositions();
  updateProgress();
  renderDots();
  setStatus(`Level ${currentLevel} — Get ready...`);
  await pause(900);
  playSequence();
}

// ─── Start / Restart ─────────────────────────────────────────────────────
function startGame() {
  initAudio();
  document.getElementById('ov-start').classList.add('hidden');
  sequence     = [];
  currentLevel = 0;
  playerTurn   = false;
  resetPositions();
  advanceLevel();
}

function restartGame() {
  document.getElementById('ov-gameover').classList.add('hidden');
  document.getElementById('ov-win').classList.add('hidden');
  sequence     = [];
  currentLevel = 0;
  playerTurn   = false;
  resetPositions();
  advanceLevel();
}

// ─── Wire clicks ─────────────────────────────────────────────────────────
COLORS.forEach(color => {
  el(color).addEventListener('click', () => handleClick(color));
});
