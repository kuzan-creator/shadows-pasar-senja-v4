// main.js — boot, input, the game loop and the self-test driver.
// ?shot=cover|alarm|title|victory freezes a staged scene for screenshots.
// ?autotest=1 plays every level with a scripted thief (same movement,
// pickup and exit code as a human) and reports WIN in the page title.
import { makeGame, loadLevel, update, throwCoin, VIEW } from './engine.js';
import { render } from './render.js';
import { ensureAudio, sfx } from './audio.js';
import { stageShot } from './shots.js';
import { LEVELS } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const g = makeGame();
window.__senja = { game: g, loadLevel, LEVELS };

const input = { up: false, down: false, left: false, right: false, crouch: false };
let lastAlarm = 0;
let lastStepAt = 0;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'crouch', ShiftRight: 'crouch',
};

window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code] !== undefined) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Enter') {
    ensureAudio();
    if (g.screen === 'title') { loadLevel(g, 0); }
    else if (g.screen === 'levelclear') { loadLevel(g, g.levelIndex + 1); }
  }
  if (e.code === 'KeyR') {
    if (g.screen === 'caught' || g.screen === 'victory') { g.loot = 0; g.lootNames = []; g.ghost = true; loadLevel(g, 0); }
    else if (g.screen === 'play') loadLevel(g, g.levelIndex);
  }
  if (g.screen === 'title' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    loadLevel(g, Number(e.code.slice(-1)) - 1);
  }
});

window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});

canvas.addEventListener('mousedown', (e) => {
  ensureAudio();
  if (g.screen === 'title') { loadLevel(g, 0); return; }
  if (g.screen === 'levelclear') { loadLevel(g, g.levelIndex + 1); return; }
  if (g.screen === 'caught' || g.screen === 'victory') return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  if (g.screen === 'play') {
    throwCoin(g, x, y);
    sfx('coin');
  }
});

const autotest = params.get('autotest') === '1';
if (autotest) {
  g.god = true;
  loadLevel(g, 0);
  const div = document.createElement('div');
  div.id = 'autotest';
  div.style.cssText = 'position:fixed;top:0;left:0;z-index:9;color:#fff;background:#000;padding:2px 6px;font:12px monospace';
  div.textContent = 'AUTOTEST RUNNING';
  document.body.appendChild(div);
}

const shot = params.get('shot');
if (shot) {
  stageShot(g, shot);
} else if (!autotest) {
  g.screen = 'title';
}

// Steer the scripted thief: same velocity + wall collision as a human.
// Waypoints thread the gaps between walls, so the bot proves the real
// route is walkable instead of cutting through a wall.
const AUTO_WAYPOINTS = [
  [[250, 700], [300, 700], [300, 470], [640, 470], [640, 300], [640, 150], [1205, 150], [1205, 100]],
  [[250, 640], [640, 640], [640, 580], [640, 360], [640, 580], [640, 640], [1205, 640], [1205, 700]],
  [[1200, 710], [1200, 300], [1200, 150], [1150, 150], [1200, 150], [1200, 700], [75, 700]],
];
let autoWp = 0;
function autotestInput() {
  const wps = AUTO_WAYPOINTS[g.levelIndex];
  const target = wps[Math.min(autoWp, wps.length - 1)];
  const dx = target[0] - g.player.x;
  const dy = target[1] - g.player.y;
  if (Math.hypot(dx, dy) < 22) autoWp++;
  input.up = dy < -14; input.down = dy > 14;
  input.left = dx < -14; input.right = dx > 14;
  input.crouch = false;
}

let last = performance.now();
let autotestDone = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (!g.shot) {
    if (autotest && !autotestDone) {
      autotestInput();
      update(g, input, dt);
      if (g.screen === 'levelclear') {
        const el = document.getElementById('autotest');
        if (el) el.textContent = `AUTOTEST LEVEL ${g.levelIndex + 1} CLEARED loot=${g.loot}`;
        autoWp = 0;
        loadLevel(g, g.levelIndex + 1);
      } else if (g.screen === 'victory') {
        autotestDone = true;
        document.title = `AUTOTEST WIN loot=${g.loot} ghost=${g.ghost}`;
        const el = document.getElementById('autotest');
        if (el) el.textContent = `AUTOTEST WIN loot=${g.loot} ghost=${g.ghost}`;
      } else if (g.screen === 'caught') {
        autotestDone = true;
        document.title = 'AUTOTEST CAUGHT';
      }
    } else {
      update(g, input, dt);
    }
    // footstep + alarm sounds, throttled
    if (g.screen === 'play') {
      if (g.player.moving && now - lastStepAt > 340) { lastStepAt = now; sfx('step'); }
      if (g.alarm >= 100 && lastAlarm < 100) sfx('alarm');
      if (g.messageTtl > 0 && /STOLEN/.test(g.message)) sfx('pickup');
    }
    lastAlarm = g.alarm;
    if (g.screen === 'victory') sfx('win');
    if (g.screen === 'caught') sfx('caught');
  }
  render(ctx, g);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
void VIEW;
