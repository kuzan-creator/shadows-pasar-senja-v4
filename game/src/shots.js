// shots.js — deterministic screenshot staging. Each ?shot= scene is built
// from the same game state the player sees, frozen at a fixed clock, so
// the four screenshots reproduce byte-for-byte every time.
import { loadLevel } from './engine.js';

const ALL_LOOT = [
  'KERIS PUSAKA', 'Topeng Kayu', 'Kain Batik',
  'MAHKOTA SENJA', 'Wayang Kulit', 'Gamelan Gong',
  'MUTIARA PELABUHAN', 'Kompas Kuningan', 'Peta Laut Tua',
];

export function stageShot(g, name) {
  g.shot = name;
  g.time = 3.7; // frozen clock: identical light pulse every render
  if (name === 'cover') {
    loadLevel(g, 0);
    g.screen = 'play';
    g.time = 3.7;
    // Player hidden in the tall grass at the edge of Bimo's cone.
    g.player.x = 640; g.player.y = 275; g.player.crouch = true; g.player.dir = -Math.PI / 2;
    const bimo = g.guards[0];
    bimo.x = 640; bimo.y = 190; bimo.dir = Math.PI / 2;
    bimo.state = 'suspicious'; bimo.alert = 55; bimo.wait = 99;
    // The thrown coin, mid-distraction, with its sound ring.
    g.coins.push({ x: 830, y: 430, ttl: 14 });
    g.rings.push({ x: 830, y: 430, r: 52, max: 120, ttl: 0.9 });
    g.rings.push({ x: 830, y: 430, r: 26, max: 120, ttl: 0.9 });
    g.alarm = 55;
    g.message = '';
  }
  if (name === 'alarm') {
    loadLevel(g, 1);
    g.screen = 'play';
    g.time = 3.7;
    const joko = g.guards[0];
    joko.x = 560; joko.y = 580; joko.dir = Math.atan2(640 - 580, 500 - 560);
    joko.state = 'alert'; joko.alert = 100; joko.seenX = 500; joko.seenY = 640;
    g.player.x = 500; g.player.y = 640; g.player.dir = Math.PI;
    g.alarm = 100;
    g.caughtBy = 'Joko';
    g.spotted = true; g.ghost = false;
    g.treasureTaken = true; g.loot = 1800; g.lootNames = ['MAHKOTA SENJA'];
    g.message = '';
  }
  if (name === 'title') {
    g.screen = 'title';
  }
  if (name === 'victory') {
    loadLevel(g, 2);
    g.screen = 'victory';
    g.time = 3.7;
    g.loot = 6100;
    g.lootNames = [...ALL_LOOT];
    g.treasureTaken = true;
    g.ghost = true;
    g.levelTime = 75;
  }
}
