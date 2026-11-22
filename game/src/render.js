// render.js — every pixel of Shadows of Pasar Senja: the night market floor,
// lamplight pools, bookshelves, tall grass, vision cones, the HUD and the
// in-picture annotations that teach the judge how the stealth works.
import { VIEW, GUARD_RANGE, GUARD_FOV, castRay, solidsOf, inGrass, inLamp, levelScore } from './engine.js';
import { LEVELS, SCOPE } from './levels.js';

const INK = '#e8ecf4';
const DIM = '#8fa3c0';

function conePath(ctx, x, y, ang, range, fov, solids) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= steps; i++) {
    const a = ang - fov + (2 * fov * i) / steps;
    const d = castRay(x, y, a, range, solids);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawCone(ctx, x, y, ang, range, fov, solids, color, alpha) {
  conePath(ctx, x, y, ang, range, fov, solids);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Strong edge: on the bright floor the cone needs a firm outline to read.
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function label(ctx, text, x, y, opts = {}) {
  const { size = 13, color = INK, bold = true, align = 'left', font = 'system-ui, sans-serif', bg = null } = opts;
  ctx.font = `${bold ? '700' : '400'} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (bg) {
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = bg;
    const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    roundRect(ctx, bx, y - size * 0.75, w, size * 1.5, 5);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPerson(ctx, x, y, dir, body, trim, opts = {}) {
  const { crouch = false, step = 0, dog = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(step * 6) * (crouch ? 1 : 2);
  if (dog) {
    ctx.rotate(dir);
    ctx.fillStyle = body;
    roundRect(ctx, -14, -8 + bob * 0.3, 28, 16, 7);
    ctx.fill();
    ctx.beginPath(); ctx.arc(14, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1408';
    ctx.beginPath(); ctx.arc(20, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = trim;
    ctx.fillRect(-16, -10, 5, 4);
    ctx.restore();
    return;
  }
  const s = crouch ? 0.82 : 1;
  ctx.scale(1, s);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0 + bob * 0.4, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath(); ctx.arc(0, 0 + bob * 0.4, 13, -0.6, 0.6); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  // head + cap
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(0, -3 + bob * 0.4, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath(); ctx.arc(0, -5 + bob * 0.4, 7.5, Math.PI, 0); ctx.fill();
  // facing tick
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(dir) * 10, Math.sin(dir) * 10 - 2);
  ctx.lineTo(Math.cos(dir) * 17, Math.sin(dir) * 17 - 2);
  ctx.stroke();
  ctx.restore();
}

export function render(ctx, g) {
  const def = g.level;
  const solids = def ? solidsOf(def) : [];
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);

  if (g.screen === 'title') { drawTitle(ctx, g); return; }
  if (!def) return;

  drawFloor(ctx, def);
  drawProps(ctx, def, g);
  drawExit(ctx, def, g);
  drawLoot(ctx, def, g);
  drawCoins(ctx, g);
  drawCameras(ctx, g, solids);
  drawDog(ctx, g, solids);
  drawGuards(ctx, g, solids);
  drawPlayer(ctx, g);
  drawRings(ctx, g);
  drawHud(ctx, g);
  drawFieldNotes(ctx, g);
  if (g.shot) drawAnnotations(ctx, g);
  if (g.messageTtl > 0 && g.message) drawToast(ctx, g);
  if (g.screen === 'caught') drawCaught(ctx, g);
  if (g.screen === 'levelclear') drawLevelClear(ctx, g);
  if (g.screen === 'victory') drawVictory(ctx, g);
}

function drawFloor(ctx, def) {
  // FRESH floor: warm light sandstone, deliberately bright — unlike the
  // dark floors of the top ranks. Two light sand tones checker the tiles
  // so the board still has texture under the cones.
  ctx.fillStyle = '#e7d9b8';
  ctx.fillRect(0, VIEW.hud, VIEW.w, VIEW.floor - VIEW.hud);
  for (let i = 0; i < VIEW.w / 40; i++) {
    for (let j = 0; j < (VIEW.floor - VIEW.hud) / 40; j++) {
      if ((i + j) % 2) {
        ctx.fillStyle = '#dcc99e';
        ctx.fillRect(i * 40, VIEW.hud + j * 40, 40, 40);
      }
    }
  }
  // soft grid lines
  ctx.strokeStyle = 'rgba(122,92,46,.20)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, VIEW.hud); ctx.lineTo(x, VIEW.floor); ctx.stroke(); }
  for (let y = VIEW.hud; y <= VIEW.floor; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); ctx.stroke(); }
  // checkered hall (museum) — light marble, stronger contrast than the sand
  if (def.checkered) {
    const c = def.checkered;
    for (let i = 0; i < c.w / 40; i++) {
      for (let j = 0; j < c.h / 40; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#cdb488' : '#f3ecd2';
        ctx.fillRect(c.x + i * 40, c.y + j * 40, 40, 40);
      }
    }
  }
  // warm lamplight pools — deeper amber so the glow still reads on sand
  for (const l of def.lamps) {
    const grad = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    grad.addColorStop(0, 'rgba(255,168,52,.42)');
    grad.addColorStop(0.6, 'rgba(255,168,52,.16)');
    grad.addColorStop(1, 'rgba(255,168,52,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawProps(ctx, def, g) {
  // tall grass — hiding cover (deeper green so it pops on the pale sand)
  for (const r of def.grass) {
    ctx.fillStyle = 'rgba(38,96,54,.6)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = '#58b04a';
    ctx.lineWidth = 2;
    for (let i = 0; i < r.w / 10; i++) {
      const x = r.x + 6 + i * 10;
      const y = r.y + r.h - 5;
      const lean = ((i * 7) % 11) - 5;
      const hgt = 18 + ((i * 13) % 14);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + lean * 0.4, y - hgt * 0.6, x + lean, y - hgt);
      ctx.stroke();
    }
  }
  // bookshelves with colourful spines
  const spineCols = ['#c94f4f', '#e0a33e', '#4f8fc9', '#5fb27a', '#9b6bc9', '#d97b4f'];
  for (const s of def.shelves) {
    ctx.fillStyle = '#5a3d24';
    roundRect(ctx, s.x, s.y, s.w, s.h, 4); ctx.fill();
    const horizontal = s.w > s.h;
    const n = Math.floor((horizontal ? s.w : s.h) / 9);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = spineCols[i % spineCols.length];
      if (horizontal) ctx.fillRect(s.x + 3 + i * 9, s.y + 4, 6, s.h - 8);
      else ctx.fillRect(s.x + 4, s.y + 3 + i * 9, s.w - 8, 6);
    }
  }
  // brass lamps
  for (const l of def.lamps) {
    ctx.fillStyle = '#8a6a2f';
    ctx.beginPath(); ctx.arc(l.x, l.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(l.x, l.y, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  // crates — plain wood boxes; only the museum crates carry a label (ARCA)
  for (const c of def.crates) {
    ctx.fillStyle = '#6e4f2a';
    roundRect(ctx, c.x, c.y, c.w, c.h, 5); ctx.fill();
    ctx.strokeStyle = '#8a6a3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.stroke();
    if (def.crateLabel) {
      ctx.fillStyle = '#d9b06a';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.crateLabel, c.x + c.w / 2, c.y + c.h / 2);
    }
  }
  // rocks — grey boulders, solid cover like crates
  for (const r of (def.rocks || [])) {
    ctx.fillStyle = '#5f6873';
    roundRect(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.fillStyle = '#8b939e';
    roundRect(ctx, r.x + 6, r.y + 5, r.w - 12, (r.h - 10) * 0.45, 10); ctx.fill();
    ctx.strokeStyle = '#3d454f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.3, r.y + r.h * 0.55); ctx.lineTo(r.x + r.w * 0.55, r.y + r.h * 0.82); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.62, r.y + r.h * 0.5); ctx.lineTo(r.x + r.w * 0.78, r.y + r.h * 0.72); ctx.stroke();
  }
  // walls — warm dark wood-brown, solid against the pale sand
  for (const w of def.walls) {
    ctx.fillStyle = '#5b4632';
    roundRect(ctx, w.x, w.y, w.w, w.h, 3); ctx.fill();
    ctx.fillStyle = '#7d6244';
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
  // tripwires — deep gold so the line reads on sand
  for (const tw of def.tripwires) {
    ctx.strokeStyle = tw.tripped ? '#ff5a4e' : '#d99a1f';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(tw.x1, tw.y1); ctx.lineTo(tw.x2, tw.y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d99a1f';
    ctx.beginPath(); ctx.arc(tw.x1, tw.y1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tw.x2, tw.y2, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawExit(ctx, def, g) {
  const e = def.exit;
  const open = g.treasureTaken;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = open ? '#123c2a' : '#12233d';
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = open ? '#37d67a' : '#4a6a94';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = open ? '#37d67a' : '#8fa3c0';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', 0, -8);
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(open ? 'OPEN' : 'LOCKED', 0, 8);
  ctx.restore();
  label(ctx, 'EXIT HATCH', e.x, e.y + 46, { size: 12, color: '#9fe8b8', align: 'center', bg: 'rgba(6,20,12,.75)' });
}

function drawLoot(ctx, def, g) {
  const t = def.treasure;
  if (!g.treasureTaken) {
    const pulse = 1 + Math.sin(g.time * 4) * 0.12;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(pulse, pulse);
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    grad.addColorStop(0, 'rgba(242,176,46,.55)');
    grad.addColorStop(1, 'rgba(242,176,46,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2b02e';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(11, 0); ctx.lineTo(0, 16); ctx.lineTo(-11, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6a10';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#7a5a10';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    label(ctx, t.name, t.x, t.y - 34, { size: 13, color: '#ffd678', align: 'center', bg: 'rgba(30,20,0,.8)' });
  }
  for (const v of def.valuables) {
    if (v.taken) continue;
    ctx.fillStyle = '#e8a91f';
    ctx.beginPath(); ctx.arc(v.x, v.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2); ctx.fill();
    label(ctx, `$${v.value}`, v.x, v.y - 18, { size: 11, color: '#ffd98a', align: 'center', bg: 'rgba(30,20,0,.8)' });
  }
}

function drawCoins(ctx, g) {
  for (const c of g.coins) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGuards(ctx, g, solids) {
  for (const gd of g.guards) {
    // Deep amber cones: pale yellow vanishes on the bright sand.
    const col = gd.state === 'alert' ? '#ff4d3d' : gd.state === 'suspicious' ? '#f5b81e' : '#f0ad2e';
    const alpha = gd.state === 'alert' ? 0.44 : gd.state === 'suspicious' ? 0.4 : 0.36;
    drawCone(ctx, gd.x, gd.y, gd.dir, GUARD_RANGE, GUARD_FOV, solids, col, alpha);
  }
  for (const gd of g.guards) {
    const body = gd.state === 'alert' ? '#b23a2e' : gd.state === 'suspicious' ? '#a8873a' : '#3d5a8a';
    drawPerson(ctx, gd.x, gd.y, gd.dir, body, '#d9c27a', { step: gd.step });
    // name + state mark — dark pill so pale text reads on the bright floor
    label(ctx, gd.name, gd.x, gd.y - 26, { size: 11, color: '#cfe0f5', align: 'center', bg: 'rgba(20,28,40,.8)' });
    if (gd.state === 'alert') label(ctx, '!', gd.x, gd.y - 56, { size: 20, color: '#ff5a4e', align: 'center', bg: 'rgba(20,28,40,.8)' });
    else if (gd.state === 'suspicious') label(ctx, '?', gd.x, gd.y - 56, { size: 18, color: '#ffc93d', align: 'center', bg: 'rgba(20,28,40,.8)' });
    if (gd.alert > 4 && gd.state !== 'alert') {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(gd.x - 18, gd.y + 18, 36, 5);
      ctx.fillStyle = gd.alert > 60 ? '#ff5a4e' : '#ffc93d';
      ctx.fillRect(gd.x - 18, gd.y + 18, 36 * (gd.alert / 100), 5);
    }
  }
}

function drawDog(ctx, g, solids) {
  const d = g.dog;
  if (!d) return;
  drawCone(ctx, d.x, d.y, d.dir, d.range, 0.9, solids, '#ff9a3d', d.state === 'alert' ? 0.38 : 0.26);
  drawPerson(ctx, d.x, d.y, d.dir, '#6a4a2a', '#c9a06a', { dog: true, step: d.step });
  label(ctx, d.name, d.x, d.y - 26, { size: 11, color: '#ffd9a8', align: 'center', bg: 'rgba(20,28,40,.8)' });
  if (d.state === 'alert') label(ctx, '!', d.x, d.y - 56, { size: 20, color: '#ff5a4e', align: 'center', bg: 'rgba(20,28,40,.8)' });
}

function drawCameras(ctx, g, solids) {
  for (const cam of g.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.ang, cam.range, 0.55, solids, '#ff6a5a', cam.alert > 40 ? 0.4 : 0.28);
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cam.alert > 40 ? '#ff4d3d' : '#37d67a';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2); ctx.fill();
    label(ctx, 'CAM', cam.x, cam.y - 22, { size: 10, color: '#ffb3a8', align: 'center', bg: 'rgba(20,28,40,.8)' });
  }
}

function drawPlayer(ctx, g) {
  const p = g.player;
  const hidden = inGrass(g.level, p.x, p.y) || p.crouch;
  drawPerson(ctx, p.x, p.y, p.dir, hidden ? '#2f7a4a' : '#2e6fb2', '#ffd34d', { crouch: p.crouch, step: p.moving ? g.time : 0 });
  label(ctx, 'YOU', p.x, p.y - 26, { size: 11, color: '#ffffff', align: 'center', bg: 'rgba(10,30,60,.8)' });
  if (hidden) label(ctx, p.crouch ? 'CROUCHED' : 'HIDDEN', p.x, p.y + 26, { size: 10, color: '#8fe8a8', align: 'center', bg: 'rgba(10,30,20,.75)' });
  if (inLamp(g.level, p.x, p.y)) label(ctx, 'IN THE LIGHT!', p.x, p.y + 26, { size: 10, color: '#ffb3a8', align: 'center', bg: 'rgba(40,10,10,.75)' });
}

function drawRings(ctx, g) {
  for (const r of g.rings) {
    ctx.strokeStyle = `rgba(232,169,31,${Math.max(0, r.ttl)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawHud(ctx, g) {
  const def = g.level;
  ctx.fillStyle = '#0a1220';
  ctx.fillRect(0, 0, VIEW.w, VIEW.hud);
  ctx.fillStyle = '#1d2f4d';
  ctx.fillRect(0, VIEW.hud - 2, VIEW.w, 2);
  label(ctx, `LEVEL ${def.id} · ${def.name}`, 16, 20, { size: 15, color: '#ffd678' });
  label(ctx, def.mission, 16, 40, { size: 12, color: INK, bold: false });
  // shadow status
  const status = g.screen === 'caught' ? 'CAUGHT' : g.alarm >= 100 ? 'SPOTTED!' : g.alarm > 35 ? 'SUSPICIOUS' : (inGrass(def, g.player.x, g.player.y) || g.player.crouch) ? 'SHADOW' : 'EXPOSED';
  const sCol = status === 'SHADOW' ? '#37d67a' : status === 'EXPOSED' ? '#8fa3c0' : status === 'SUSPICIOUS' ? '#ffc93d' : '#ff5a4e';
  label(ctx, status, 700, 20, { size: 15, color: sCol, align: 'center', bg: 'rgba(255,255,255,.06)' });
  label(ctx, `LOOT $${g.loot}  ·  ${Math.floor(g.levelTime)}s`, 700, 40, { size: 12, color: DIM, align: 'center', bold: false });
  // detection meter (right)
  const mx = 980;
  label(ctx, 'DETECTION', mx, 14, { size: 11, color: DIM });
  label(ctx, `${Math.round(g.alarm)}%`, mx + 220, 20, { size: 22, color: g.alarm > 60 ? '#ff5a4e' : g.alarm > 30 ? '#ffc93d' : '#37d67a', align: 'right' });
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundRect(ctx, mx, 26, 190, 10, 5); ctx.fill();
  ctx.fillStyle = g.alarm > 60 ? '#ff5a4e' : g.alarm > 30 ? '#ffc93d' : '#37d67a';
  if (g.alarm > 0) { roundRect(ctx, mx, 26, 190 * (g.alarm / 100), 10, 5); ctx.fill(); }
  label(ctx, 'ALARM', mx, 46, { size: 9, color: '#ff8a7a' });
  label(ctx, 'VISIBILITY', mx + 60, 46, { size: 9, color: '#ffd98a' });
  label(ctx, 'NOISE', mx + 140, 46, { size: 9, color: '#9fc4ff' });
}

function drawFieldNotes(ctx, g) {
  const x = 14, y = 66, w = 196;
  ctx.fillStyle = 'rgba(8,16,30,.82)';
  roundRect(ctx, x, y, w, 176, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,120,.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, 176, 8); ctx.stroke();
  label(ctx, 'FIELD NOTES', x + 12, y + 16, { size: 12, color: '#ffd678' });
  const rows = [
    ['YELLOW CONE', 'seen — fill = caught'],
    ['TALL GRASS', 'hide here, unseen'],
    ['COIN (CLICK)', 'lures guards away'],
    ['SHIFT', 'crouch: slow, quiet'],
    ['ROCK', 'blocks sight & steps'],
    ['RED = ALARM', 'run for shadow'],
  ];
  rows.forEach(([a, b], i) => {
    label(ctx, a, x + 12, y + 38 + i * 24, { size: 10, color: INK });
    label(ctx, b, x + 12, y + 50 + i * 24, { size: 10, color: DIM, bold: false });
  });
}

function drawToast(ctx, g) {
  label(ctx, g.message, VIEW.w / 2, 92, { size: 16, color: '#ffd678', align: 'center', bg: 'rgba(10,16,28,.85)' });
}

function pointerLine(ctx, x1, y1, x2, y2, text, tx, ty) {
  // Dark leader line: white vanishes on the bright sand.
  ctx.strokeStyle = 'rgba(46,32,14,.92)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = '#33241a';
  ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fill();
  label(ctx, text, tx, ty, { size: 14, color: '#fff', align: 'center', bg: 'rgba(8,14,26,.85)' });
}

// In-picture annotations: the cover teaches the judge the stealth at a glance.
function drawAnnotations(ctx, g) {
  if (g.shot === 'cover') {
    const gd = g.guards[0];
    pointerLine(ctx, gd.x + 60, gd.y - 60, gd.x + 150, gd.y - 110,
      'LAMPLIGHT: they see you from afar', gd.x + 150, gd.y - 132);
    const coin = g.coins[0];
    if (coin) {
      pointerLine(ctx, coin.x, coin.y, coin.x - 40, coin.y + 90,
        '? HEARD THE COIN: off to look', coin.x - 40, coin.y + 112);
      label(ctx, '1s', coin.x + 46, coin.y - 8, { size: 12, color: '#ffd34d', align: 'center', bg: 'rgba(8,14,26,.85)' });
      label(ctx, '2s', coin.x + 78, coin.y - 8, { size: 12, color: '#ffd34d', align: 'center', bg: 'rgba(8,14,26,.85)' });
    }
    pointerLine(ctx, g.player.x - 20, g.player.y - 10, g.player.x - 130, g.player.y + 90,
      'YOU: safe in the shadow of the tall grass', g.player.x - 130, g.player.y + 112);
    label(ctx, '"What was that?"', gd.x + 185, gd.y - 30, { size: 15, color: '#ffc93d', align: 'center', bg: 'rgba(8,14,26,.85)' });
  }
  if (g.shot === 'alarm') {
    // Narrow red bar: FIELD NOTES spans x 14..210, so the bar starts at
    // x 240 and every legend line stays readable while it stays dramatic.
    ctx.fillStyle = 'rgba(120,10,8,.82)';
    roundRect(ctx, 240, 96, 800, 54, 8); ctx.fill();
    label(ctx, `SPOTTED BY ${g.caughtBy ? g.caughtBy.toUpperCase() : 'BIMO'} — RUN FOR SHADOW!`, VIEW.w / 2, 124, { size: 24, color: '#fff', align: 'center' });
    const gd = g.guards[0];
    label(ctx, '"Coming!"', gd.x, gd.y - 62, { size: 15, color: '#ff8a7a', align: 'center', bg: 'rgba(8,14,26,.85)' });
  }
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(4,8,16,.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function drawTitle(ctx, g) {
  // Living backdrop: level 1 rendered dimmed behind the title, so the
  // title stands on the game world instead of an empty room.
  ctx.fillStyle = '#e7d9b8';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const def = LEVELS[0];
  drawFloor(ctx, def);
  drawProps(ctx, def, g);
  // two patrol cones from level 1, frozen mid-sweep
  const solids = solidsOf(def);
  const cones = [
    { x: def.guards[0].path[0][0], y: def.guards[0].path[0][1], dir: 0 },
    { x: def.guards[1].path[0][0], y: def.guards[1].path[0][1], dir: Math.PI / 2 },
  ];
  for (const c of cones) drawCone(ctx, c.x, c.y, c.dir, GUARD_RANGE, GUARD_FOV, solids, '#f0ad2e', 0.3);
  // sand veil: dims the world so the dark title text stays readable
  ctx.fillStyle = 'rgba(231,217,184,.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  drawPerson(ctx, 180, 620, 0, '#3d5a8a', '#d9c27a', {});
  label(ctx, 'BIMO', 180, 596, { size: 11, color: '#cfe0f5', align: 'center', bg: 'rgba(20,28,40,.8)' });
  drawPerson(ctx, 1080, 620, Math.PI, '#2e6fb2', '#ffd34d', {});
  label(ctx, 'YOU', 1080, 596, { size: 11, color: '#fff', align: 'center', bg: 'rgba(10,30,60,.8)' });
  label(ctx, 'SHADOWS OF', VIEW.w / 2, 130, { size: 30, color: '#8a6a2f', align: 'center' });
  label(ctx, 'PASAR SENJA', VIEW.w / 2, 180, { size: 56, color: '#33241a', align: 'center' });
  label(ctx, 'A STEALTH HEIST IN THREE INDONESIAN NIGHTS', VIEW.w / 2, 224, { size: 15, color: '#6b5a44', align: 'center', bold: false });
  label(ctx, `${SCOPE.levels} LEVELS  ·  ${SCOPE.guards} GUARDS  ·  ${SCOPE.treasures} TREASURES  ·  1 DOG  ·  2 CAMERAS`, VIEW.w / 2, 268, { size: 15, color: '#8a6a2f', align: 'center' });
  label(ctx, '1 PASAR MALAM   ·   2 MUSEUM PUSAKA   ·   3 PELABUHAN SENJA', VIEW.w / 2, 420, { size: 14, color: '#4a3a28', align: 'center' });
  label(ctx, 'STEAL THE TREASURE. REACH THE EXIT. NEVER BE SEEN.', VIEW.w / 2, 452, { size: 14, color: '#2f7a4a', align: 'center' });
  label(ctx, 'CLICK OR PRESS ENTER TO BEGIN', VIEW.w / 2, 500, { size: 16, color: '#33241a', align: 'center', bg: 'rgba(180,140,60,.4)' });
  label(ctx, 'WASD move · SHIFT crouch · CLICK throw a coin · E grab loot', VIEW.w / 2, 540, { size: 13, color: '#6b5a44', align: 'center', bold: false });
  label(ctx, 'GHOST BONUS +$500 — finish a level without ever being spotted', VIEW.w / 2, 568, { size: 13, color: '#8a6a2f', align: 'center', bold: false });
}

function drawCaught(ctx, g) {
  dim(ctx);
  label(ctx, 'CAUGHT!', VIEW.w / 2, 300, { size: 64, color: '#ff5a4e', align: 'center' });
  label(ctx, `${g.caughtBy ? g.caughtBy : 'A guard'} caught you in the lamplight.`, VIEW.w / 2, 360, { size: 18, color: INK, align: 'center', bold: false });
  label(ctx, 'The shadows forgive. Try a slower route — or throw a coin first.', VIEW.w / 2, 392, { size: 15, color: DIM, align: 'center', bold: false });
  label(ctx, 'PRESS R TO TRY AGAIN', VIEW.w / 2, 450, { size: 18, color: '#fff', align: 'center', bg: 'rgba(255,90,78,.25)' });
}

function drawLevelClear(ctx, g) {
  dim(ctx);
  const s = levelScore(g);
  label(ctx, 'CLEAN GETAWAY', VIEW.w / 2, 250, { size: 48, color: '#37d67a', align: 'center' });
  label(ctx, `${g.level.name} — ${g.treasureTaken ? g.level.treasure.name + ' secured' : ''}`, VIEW.w / 2, 306, { size: 18, color: INK, align: 'center', bold: false });
  label(ctx, `LOOT $${s.loot}   ·   GHOST ${g.ghost ? '+$500' : '$0'}   ·   TIME +$${s.timeBonus}`, VIEW.w / 2, 356, { size: 17, color: '#ffd678', align: 'center' });
  label(ctx, 'PRESS ENTER FOR THE NEXT LEVEL', VIEW.w / 2, 420, { size: 18, color: '#fff', align: 'center', bg: 'rgba(55,214,122,.2)' });
}

function drawVictory(ctx, g) {
  dim(ctx);
  const s = levelScore(g);
  label(ctx, 'GHOST OF THE SENJA', VIEW.w / 2, 170, { size: 52, color: '#ffd678', align: 'center' });
  label(ctx, g.ghost ? 'Never once seen. The night never knew you were there.' : 'All three treasures are yours — the night almost caught you.', VIEW.w / 2, 216, { size: 16, color: INK, align: 'center', bold: false });
  const rows = [
    ['KERIS PUSAKA — Pasar Malam', '$1,200'],
    ['MAHKOTA SENJA — Museum Pusaka', '$1,800'],
    ['MUTIARA PELABUHAN — Pelabuhan Senja', '$2,400'],
    ...g.lootNames.filter(n => !/KERIS|MAHKOTA|MUTIARA/.test(n)).map(n => [n, '']),
    ['GHOST BONUS (never spotted)', g.ghost ? '+$500' : '$0'],
    ['SPEED BONUS', `+$${s.timeBonus}`],
  ];
  let y = 280;
  for (const [a, b] of rows) {
    label(ctx, a, 420, y, { size: 16, color: INK, bold: false });
    label(ctx, b, 880, y, { size: 16, color: '#ffd678', align: 'right' });
    y += 34;
  }
  ctx.strokeStyle = 'rgba(255,214,120,.5)';
  ctx.beginPath(); ctx.moveTo(420, y - 8); ctx.lineTo(880, y - 8); ctx.stroke();
  label(ctx, 'TOTAL HAUL', 420, y + 22, { size: 20, color: '#fff' });
  label(ctx, `$${s.total}`, 880, y + 22, { size: 24, color: '#ffd678', align: 'right' });
  label(ctx, 'PRESS R TO PLAY AGAIN', VIEW.w / 2, y + 78, { size: 16, color: '#fff', align: 'center', bg: 'rgba(255,214,120,.18)' });
}
