// engine.js — the stealth simulation: movement, patrols, vision cones,
// detection, noise, cameras, tripwires and the guard dog. No drawing here.
import { LEVELS, GHOST_BONUS } from './levels.js';

export const VIEW = { w: 1280, h: 800, hud: 56, floor: 776 };
export const GUARD_RANGE = 250;
export const GUARD_FOV = 1.15; // radians, half-angle ~33 deg

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// Segment intersection: does segment p1-p2 cross segment p3-p4?
export function segHit(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / den;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y, t };
}

export function rectEdges(r) {
  const { x, y, w, h } = r;
  return [
    [{ x, y }, { x: x + w, y }], [{ x: x + w, y }, { x: x + w, y: y + h }],
    [{ x: x + w, y: y + h }, { x, y: y + h }], [{ x, y: y + h }, { x, y }],
  ];
}

// Cast one ray from (ox,oy) along angle; return nearest hit distance (or max).
export function castRay(ox, oy, ang, max, solids) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const end = { x: ox + dx * max, y: oy + dy * max };
  let best = max;
  for (const s of solids) {
    for (const [a, b] of rectEdges(s)) {
      const hit = segHit({ x: ox, y: oy }, end, a, b);
      if (hit && hit.t * max < best) best = hit.t * max;
    }
  }
  // Play-area bounds also block sight.
  const bx = dx > 0 ? (VIEW.w - 8 - ox) / dx : dx < 0 ? (8 - ox) / dx : 1e9;
  const by = dy > 0 ? (VIEW.floor - 8 - oy) / dy : dy < 0 ? (VIEW.hud + 8 - oy) / dy : 1e9;
  const bound = Math.min(bx, by);
  if (bound > 0 && bound < best) best = bound;
  return best;
}

export function losClear(ax, ay, bx, by, solids) {
  for (const s of solids) {
    for (const [a, b] of rectEdges(s)) {
      if (segHit({ x: ax, y: ay }, { x: bx, y: by }, a, b)) return false;
    }
  }
  return true;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function makeGame() {
  return {
    screen: 'title', // title | play | caught | levelclear | victory
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    dog: null,
    coins: [],
    rings: [], // noise rings {x,y,r,max,ttl}
    loot: 0,
    lootNames: [],
    treasureTaken: false,
    ghost: true, // never been spotted this run
    spotted: false, // spotted at least once this level
    alarm: 0, // 0..100 global detection meter
    time: 0,
    levelTime: 0,
    caughtBy: null,
    message: '',
    messageTtl: 0,
    shot: null, // screenshot staging mode
    god: false, // autotest: guards cannot catch
    stats: { coinsThrown: 0, timesSpotted: 0 },
  };
}

export function loadLevel(g, i) {
  const def = LEVELS[i];
  g.levelIndex = i;
  g.level = def;
  g.player = { x: def.player.x, y: def.player.y, r: 13, crouch: false, moving: false, running: false, dir: 0, speed: 0 };
  g.guards = def.guards.map((gd, k) => ({
    name: gd.name, path: gd.path, speed: gd.speed,
    x: gd.path[0][0], y: gd.path[0][1], wp: 1, dir: 0,
    state: 'patrol', // patrol | suspicious | alert | search
    alert: 0, // 0..100 personal detection
    investigate: null, wait: 0, seenX: 0, seenY: 0, step: (k * 0.37) % 1,
  }));
  g.cameras = def.cameras.map(c => ({ ...c, ang: c.base, t: 0, alert: 0 }));
  g.dog = def.dog ? { ...def.dog, x: def.dog.path[0][0], y: def.dog.path[0][1], wp: 1, dir: 0, state: 'patrol', alert: 0, step: 0 } : null;
  g.coins = [];
  g.rings = [];
  g.treasureTaken = false;
  g.spotted = false;
  g.alarm = 0;
  g.levelTime = 0;
  g.caughtBy = null;
  g.message = '';
  g.screen = 'play';
}

export function solidsOf(def) {
  return [...def.walls, ...def.crates, ...def.shelves];
}

export function inGrass(def, x, y) {
  return def.grass.some(r => pointInRect(x, y, r));
}

export function inLamp(def, x, y) {
  return def.lamps.some(l => dist(x, y, l.x, l.y) < l.r * 0.62);
}

// Can watcher at (wx,wy) facing ang see the player? Returns 0..1 visibility.
export function canSee(g, wx, wy, ang, range, fov) {
  const p = g.player;
  const d = dist(wx, wy, p.x, p.y);
  if (d > range) return 0;
  let a = Math.atan2(p.y - wy, p.x - wx) - ang;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  if (Math.abs(a) > fov) return 0;
  if (!losClear(wx, wy, p.x, p.y, solidsOf(g.level))) return 0;
  let vis = 1 - d / (range * 1.25);
  if (p.crouch) vis *= 0.55;
  if (inGrass(g.level, p.x, p.y) && d > 70) vis *= 0.25;
  if (!inLamp(g.level, p.x, p.y) && d > 120) vis *= 0.7;
  return clamp(vis, 0, 1);
}

function moveWithWalls(g, e, dx, dy) {
  const solids = solidsOf(g.level);
  const r = e.r || 13;
  const nx = clamp(e.x + dx, 10 + r, VIEW.w - 10 - r);
  const ny = clamp(e.y + dy, VIEW.hud + 10 + r, VIEW.floor - 10 - r);
  let blockedX = false, blockedY = false;
  for (const s of solids) {
    if (ny > s.y - r + 2 && ny < s.y + s.h + r - 2 && nx > s.x - r && nx < s.x + s.w + r) blockedX = true;
    if (nx > s.x - r + 2 && nx < s.x + s.w + r - 2 && ny > s.y - r && ny < s.y + s.h + r) blockedY = true;
  }
  if (!blockedX) e.x = nx;
  if (!blockedY) e.y = ny;
  return !blockedX || !blockedY;
}

function patrolStep(g, e, dt) {
  const target = e.path[e.wp];
  const d = dist(e.x, e.y, target[0], target[1]);
  const sp = e.speed * (e.state === 'alert' ? 1.9 : e.state === 'suspicious' ? 1.25 : 1);
  if (d < 6) {
    if (e.state === 'patrol') { e.wp = (e.wp + 1) % e.path.length; }
    else if (e.state === 'suspicious' || e.state === 'search') {
      e.wait -= dt;
      if (e.wait <= 0) { e.state = 'patrol'; e.alert = Math.max(0, e.alert - 40); }
    }
    return;
  }
  const ang = Math.atan2(target[1] - e.y, target[0] - e.x);
  e.dir = ang;
  e.step += dt * sp * 0.045;
  moveWithWalls(g, e, Math.cos(ang) * sp * dt, Math.sin(ang) * sp * dt);
}

function guardThink(g, gd, dt) {
  const p = g.player;
  const vis = canSee(g, gd.x, gd.y, gd.dir, GUARD_RANGE, GUARD_FOV);
  if (vis > 0.12) {
    gd.alert = clamp(gd.alert + vis * 95 * dt, 0, 100);
    gd.seenX = p.x; gd.seenY = p.y;
    if (gd.alert >= 100 && gd.state !== 'alert') {
      gd.state = 'alert';
      if (!g.spotted) { g.spotted = true; g.stats.timesSpotted++; }
      g.ghost = false;
      g.message = `SPOTTED BY ${gd.name.toUpperCase()}!`;
      g.messageTtl = 2.2;
    } else if (gd.alert > 35 && gd.state === 'patrol') {
      gd.state = 'suspicious';
    }
  } else {
    gd.alert = clamp(gd.alert - 22 * dt, 0, 100);
    if (gd.state === 'suspicious' && gd.alert <= 5) { gd.state = 'patrol'; }
  }
  if (gd.state === 'alert') {
    // Chase the last seen spot, then the player if still visible.
    const tx = vis > 0.12 ? p.x : gd.seenX;
    const ty = vis > 0.12 ? p.y : gd.seenY;
    const d = dist(gd.x, gd.y, tx, ty);
    if (d < 10) {
      if (vis <= 0.12) { gd.state = 'search'; gd.wait = 2.5; }
    } else {
      const ang = Math.atan2(ty - gd.y, tx - gd.x);
      gd.dir = ang;
      gd.step += dt * 4;
      moveWithWalls(g, gd, Math.cos(ang) * gd.speed * 1.9 * dt, Math.sin(ang) * gd.speed * 1.9 * dt);
    }
    if (d < 26 && !g.god) {
      g.screen = 'caught';
      g.caughtBy = gd.name;
      g.alarm = 100;
    }
  } else if (gd.state === 'suspicious' && gd.investigate) {
    const t = gd.investigate;
    const d = dist(gd.x, gd.y, t.x, t.y);
    if (d > 12) {
      const ang = Math.atan2(t.y - gd.y, t.x - gd.x);
      gd.dir = ang;
      gd.step += dt * 3;
      moveWithWalls(g, gd, Math.cos(ang) * gd.speed * 1.25 * dt, Math.sin(ang) * gd.speed * 1.25 * dt);
    } else {
      gd.wait -= dt;
      if (gd.wait <= 0) { gd.state = 'patrol'; gd.investigate = null; gd.alert = 10; }
    }
  } else {
    patrolStep(g, gd, dt);
  }
}

export function throwCoin(g, x, y) {
  g.coins.push({ x, y, ttl: 14 });
  g.rings.push({ x, y, r: 8, max: 120, ttl: 1.1 });
  g.stats.coinsThrown++;
  for (const gd of g.guards) {
    if (dist(gd.x, gd.y, x, y) < 260 && gd.state !== 'alert') {
      gd.state = 'suspicious';
      gd.investigate = { x, y };
      gd.wait = 2.2;
      gd.alert = Math.max(gd.alert, 45);
    }
  }
  if (g.dog && dist(g.dog.x, g.dog.y, x, y) < 320) {
    g.dog.state = 'suspicious';
    g.dog.investigate = { x, y };
    g.dog.wait = 2.0;
  }
}

export function update(g, input, dt) {
  if (g.screen !== 'play') return;
  g.time += dt;
  g.levelTime += dt;
  if (g.messageTtl > 0) g.messageTtl -= dt;
  const p = g.player;
  const def = g.level;

  // --- player movement ---
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  p.crouch = !!input.crouch;
  const speed = p.crouch ? 78 : 165;
  p.moving = mx !== 0 || my !== 0;
  p.running = p.moving && !p.crouch;
  if (p.moving) {
    p.dir = Math.atan2(my, mx);
    p.speed = speed;
    moveWithWalls(g, p, (mx / len) * speed * dt, (my / len) * speed * dt);
    if (p.running && Math.random() < dt * 2.2) {
      g.rings.push({ x: p.x, y: p.y, r: 6, max: 46, ttl: 0.7 });
    }
  } else p.speed = 0;

  // Running noise draws nearby guards.
  if (p.running) {
    for (const gd of g.guards) {
      if (gd.state === 'patrol' && dist(gd.x, gd.y, p.x, p.y) < 110) {
        gd.state = 'suspicious';
        gd.investigate = { x: p.x, y: p.y };
        gd.wait = 1.4;
      }
    }
  }

  // --- loot pickup (walk over, or press E nearby) ---
  const near = (o, r) => dist(p.x, p.y, o.x, o.y) < r;
  if (!g.treasureTaken && near(def.treasure, 34)) {
    g.treasureTaken = true;
    g.loot += def.treasure.value;
    g.lootNames.push(def.treasure.name);
    g.message = `${def.treasure.name} STOLEN — NOW REACH THE EXIT!`;
    g.messageTtl = 3;
  }
  for (const v of def.valuables) {
    if (!v.taken && near(v, 30)) {
      v.taken = true;
      g.loot += v.value;
      g.lootNames.push(v.name);
      g.message = `+ $${v.value} — ${v.name.toUpperCase()}`;
      g.messageTtl = 1.8;
    }
  }

  // --- exit ---
  if (g.treasureTaken && near(def.exit, 36)) {
    if (g.levelIndex < LEVELS.length - 1) {
      g.screen = 'levelclear';
    } else {
      g.screen = 'victory';
    }
    return;
  }

  // --- guards, cameras, dog ---
  for (const gd of g.guards) guardThink(g, gd, dt);
  if (g.screen !== 'play') return;

  for (const cam of g.cameras) {
    cam.t += dt;
    cam.ang = cam.base + Math.sin(cam.t * cam.speed) * cam.sweep;
    const vis = canSee(g, cam.x, cam.y, cam.ang, cam.range, 0.55);
    cam.alert = vis > 0.12 ? clamp(cam.alert + vis * 120 * dt, 0, 100) : clamp(cam.alert - 30 * dt, 0, 100);
    if (cam.alert >= 100 && !g.spotted) {
      g.spotted = true; g.stats.timesSpotted++;
      g.ghost = false;
      g.message = 'SPOTTED BY CAMERA!';
      g.messageTtl = 2.2;
      for (const gd of g.guards) {
        if (gd.state !== 'alert') { gd.state = 'suspicious'; gd.investigate = { x: p.x, y: p.y }; gd.wait = 2.5; }
      }
      cam.alert = 40;
    }
  }

  for (const tw of def.tripwires) {
    if (!tw.tripped && !g.god) {
      const crossed = segHit({ x: p.x, y: p.y }, { x: p.x, y: p.y }, { x: tw.x1, y: tw.y1 }, { x: tw.x2, y: tw.y2 });
      // point crossing: check distance from player to segment < 14 while moving
      const dx = tw.x2 - tw.x1, dy = tw.y2 - tw.y1;
      const L2 = dx * dx + dy * dy;
      let t = ((p.x - tw.x1) * dx + (p.y - tw.y1) * dy) / L2;
      t = clamp(t, 0, 1);
      const cx = tw.x1 + t * dx, cy = tw.y1 + t * dy;
      if (dist(p.x, p.y, cx, cy) < 14 && !p.crouch) {
        tw.tripped = true;
        g.ghost = false; g.spotted = true; g.stats.timesSpotted++;
        g.message = 'TRIPWIRE TRIPPED!';
        g.messageTtl = 2.2;
        for (const gd of g.guards) {
          if (gd.state !== 'alert') { gd.state = 'suspicious'; gd.investigate = { x: p.x, y: p.y }; gd.wait = 2.5; }
        }
      }
      void crossed;
    }
  }

  if (g.dog) {
    const d = g.dog;
    const vis = canSee(g, d.x, d.y, d.dir, d.range, 0.9);
    if (vis > 0.1) {
      d.alert = clamp(d.alert + vis * 110 * dt, 0, 100);
      if (d.alert >= 100 && d.state !== 'alert') {
        d.state = 'alert';
        if (!g.spotted) { g.spotted = true; g.stats.timesSpotted++; }
        g.ghost = false;
        g.message = 'THE DOG SMELLS YOU!';
        g.messageTtl = 2.2;
      }
    } else d.alert = clamp(d.alert - 25 * dt, 0, 100);
    if (d.state === 'alert') {
      const ang = Math.atan2(p.y - d.y, p.x - d.x);
      d.dir = ang;
      d.step += dt * 6;
      moveWithWalls(g, d, Math.cos(ang) * d.speed * 1.6 * dt, Math.sin(ang) * d.speed * 1.6 * dt);
      if (dist(d.x, d.y, p.x, p.y) < 24 && !g.god) {
        g.screen = 'caught';
        g.caughtBy = d.name;
        g.alarm = 100;
      }
      if (vis <= 0.1 && dist(d.x, d.y, p.x, p.y) > 320) { d.state = 'patrol'; d.alert = 30; }
    } else if (d.state === 'suspicious' && d.investigate) {
      const t = d.investigate;
      const dd = dist(d.x, d.y, t.x, t.y);
      if (dd > 14) {
        const ang = Math.atan2(t.y - d.y, t.x - d.x);
        d.dir = ang;
        d.step += dt * 5;
        moveWithWalls(g, d, Math.cos(ang) * d.speed * 1.2 * dt, Math.sin(ang) * d.speed * 1.2 * dt);
      } else { d.wait -= dt; if (d.wait <= 0) { d.state = 'patrol'; d.investigate = null; } }
    } else patrolStep(g, d, dt);
  }

  // --- noise rings fade ---
  for (const r of g.rings) { r.r += (r.max - r.r) * dt * 3; r.ttl -= dt; }
  g.rings = g.rings.filter(r => r.ttl > 0);

  // --- global alarm meter ---
  const top = Math.max(0, ...g.guards.map(x => x.alert), g.dog ? g.dog.alert : 0, ...g.cameras.map(c => c.alert));
  g.alarm = clamp(top, 0, 100);
}

export function levelScore(g) {
  const timeBonus = Math.max(0, 600 - Math.floor(g.levelTime) * 5);
  return { loot: g.loot, ghostBonus: g.ghost ? GHOST_BONUS : 0, timeBonus, total: g.loot + (g.ghost ? GHOST_BONUS : 0) + timeBonus };
}
