// levels.js — the three heists of Shadows of Pasar Senja.
// Every level is data: walls, cover, lamps, loot, patrols. The engine reads it;
// nothing here draws. Coordinates are canvas pixels. Play area y runs 56..776.
export const TILE = 40;

export const LEVELS = [
  {
    id: 1, name: 'PASAR MALAM', subtitle: 'The Night Market',
    treasure: { x: 640, y: 150, name: 'KERIS PUSAKA', value: 1200, kind: 'keris' },
    valuables: [
      { x: 150, y: 300, name: 'Topeng Kayu', value: 250 },
      { x: 1075, y: 640, name: 'Kain Batik', value: 250 },
    ],
    player: { x: 70, y: 700 },
    exit: { x: 1205, y: 100 },
    mission: 'STEAL THE KERIS PUSAKA, THEN REACH THE EXIT — UNSEEN',
    walls: [
      { x: 300, y: 230, w: 180, h: 26 }, { x: 800, y: 230, w: 180, h: 26 },
      { x: 300, y: 520, w: 180, h: 26 }, { x: 800, y: 520, w: 180, h: 26 },
      { x: 560, y: 330, w: 26, h: 130 }, { x: 694, y: 330, w: 26, h: 130 },
      { x: 540, y: 600, w: 26, h: 90 }, { x: 700, y: 600, w: 26, h: 90 },
      { x: 950, y: 690, w: 180, h: 26 }, { x: 60, y: 720, w: 180, h: 26 },
    ],
    // small plain crates (64x44), each on a clear tile away from the grass
    crates: [
      { x: 190, y: 330, w: 64, h: 44 }, { x: 1020, y: 330, w: 64, h: 44 },
      { x: 330, y: 620, w: 64, h: 44 }, { x: 990, y: 640, w: 64, h: 44 },
      { x: 450, y: 680, w: 64, h: 44 }, { x: 830, y: 680, w: 64, h: 44 },
      { x: 240, y: 110, w: 64, h: 44 },
    ],
    rocks: [
      { x: 60, y: 560, w: 80, h: 60 }, { x: 60, y: 300, w: 70, h: 55 },
      { x: 1090, y: 250, w: 70, h: 55 }, { x: 900, y: 590, w: 80, h: 55 },
      { x: 740, y: 690, w: 90, h: 60 },
    ],
    grass: [
      { x: 90, y: 430, w: 120, h: 80 }, { x: 1070, y: 430, w: 120, h: 80 },
      { x: 580, y: 250, w: 120, h: 50 },
      { x: 90, y: 600, w: 130, h: 80 }, { x: 1060, y: 600, w: 130, h: 70 },
      { x: 560, y: 600, w: 160, h: 60 }, { x: 1050, y: 180, w: 110, h: 60 },
    ],
    shelves: [],
    lamps: [
      { x: 340, y: 150, r: 130 }, { x: 940, y: 150, r: 130 },
      { x: 340, y: 660, r: 120 }, { x: 940, y: 660, r: 120 },
      { x: 640, y: 720, r: 110 }, { x: 1160, y: 480, r: 100 },
    ],
    checkered: null,
    guards: [
      { name: 'Bimo', path: [[300, 185], [980, 185]], speed: 62 },
      { name: 'Sari', path: [[430, 280], [430, 640]], speed: 55 },
      { name: 'Agus', path: [[220, 560], [1080, 560]], speed: 58 },
      { name: 'Dewi', path: [[880, 280], [880, 640]], speed: 55 },
    ],
    cameras: [], tripwires: [], dog: null,
  },
  {
    id: 2, name: 'MUSEUM PUSAKA', subtitle: 'The Heirloom Museum',
    crateLabel: 'ARCA',
    treasure: { x: 640, y: 360, name: 'MAHKOTA SENJA', value: 1800, kind: 'crown' },
    valuables: [
      { x: 150, y: 150, name: 'Wayang Kulit', value: 300 },
      { x: 1130, y: 660, name: 'Gamelan Gong', value: 300 },
    ],
    player: { x: 70, y: 130 },
    exit: { x: 1205, y: 700 },
    mission: 'STEAL THE MAHKOTA SENJA, THEN REACH THE EXIT — UNSEEN',
    walls: [
      { x: 380, y: 180, w: 26, h: 380 }, { x: 874, y: 180, w: 26, h: 380 },
      { x: 380, y: 180, w: 520, h: 26 }, { x: 380, y: 534, w: 200, h: 26 },
      { x: 700, y: 534, w: 200, h: 26 },
      { x: 300, y: 670, w: 140, h: 26 }, { x: 840, y: 670, w: 140, h: 26 },
    ],
    // small ARCA crates (64x44), each on a clear tile away from the grass
    crates: [
      { x: 120, y: 420, w: 64, h: 44 }, { x: 1070, y: 300, w: 64, h: 44 },
      { x: 300, y: 540, w: 64, h: 44 }, { x: 900, y: 540, w: 64, h: 44 },
      { x: 1000, y: 660, w: 64, h: 44 }, { x: 1080, y: 680, w: 64, h: 44 },
    ],
    rocks: [
      { x: 490, y: 685, w: 60, h: 50 }, { x: 750, y: 685, w: 60, h: 50 },
    ],
    grass: [
      { x: 450, y: 590, w: 90, h: 50 }, { x: 730, y: 590, w: 90, h: 50 },
    ],
    shelves: [
      { x: 60, y: 220, w: 26, h: 220 }, { x: 1194, y: 220, w: 26, h: 220 },
      { x: 430, y: 210, w: 180, h: 24 }, { x: 670, y: 210, w: 180, h: 24 },
      { x: 300, y: 700, w: 180, h: 24 }, { x: 560, y: 700, w: 180, h: 24 },
      { x: 820, y: 700, w: 180, h: 24 },
      { x: 60, y: 560, w: 26, h: 160 }, { x: 1194, y: 480, w: 26, h: 60 },
    ],
    lamps: [
      { x: 640, y: 120, r: 140 }, { x: 200, y: 700, r: 120 }, { x: 1080, y: 120, r: 120 },
      { x: 300, y: 720, r: 110 }, { x: 980, y: 720, r: 110 },
    ],
    checkered: { x: 406, y: 206, w: 468, h: 328 },
    guards: [
      { name: 'Joko', path: [[300, 640], [980, 640]], speed: 60 },
      { name: 'Ratna', path: [[470, 250], [470, 480]], speed: 52 },
      { name: 'Budi', path: [[810, 250], [810, 480]], speed: 52 },
      { name: 'Maya', path: [[200, 300], [1080, 300]], speed: 58 },
    ],
    cameras: [
      { x: 640, y: 96, base: Math.PI / 2, sweep: 1.1, speed: 0.7, range: 260 },
      { x: 120, y: 700, base: -Math.PI / 2, sweep: 0.9, speed: 0.9, range: 230 },
    ],
    tripwires: [
      { x1: 580, y1: 560, x2: 700, y2: 560, name: 'TRIPWIRE' },
    ],
    dog: null,
  },
  {
    id: 3, name: 'PELABUHAN SENJA', subtitle: 'The Dusk Harbour',
    treasure: { x: 1150, y: 150, name: 'MUTIARA PELABUHAN', value: 2400, kind: 'pearl' },
    valuables: [
      { x: 180, y: 160, name: 'Kompas Kuningan', value: 350 },
      { x: 640, y: 640, name: 'Peta Laut Tua', value: 350 },
    ],
    player: { x: 640, y: 710 },
    exit: { x: 75, y: 700 },
    mission: 'STEAL THE MUTIARA PELABUHAN, THEN REACH THE EXIT — UNSEEN',
    walls: [
      { x: 280, y: 200, w: 200, h: 26 }, { x: 800, y: 200, w: 200, h: 26 },
      { x: 280, y: 560, w: 200, h: 26 }, { x: 800, y: 560, w: 200, h: 26 },
      { x: 500, y: 340, w: 280, h: 26 },
      { x: 300, y: 650, w: 80, h: 20 }, { x: 430, y: 650, w: 60, h: 20 },
      { x: 520, y: 650, w: 240, h: 20 },
      { x: 800, y: 650, w: 60, h: 20 }, { x: 900, y: 650, w: 80, h: 20 },
    ],
    // small plain crates (64x44), each on a clear tile away from the grass
    crates: [
      { x: 160, y: 330, w: 64, h: 44 }, { x: 1040, y: 330, w: 64, h: 44 },
      { x: 160, y: 460, w: 64, h: 44 }, { x: 1040, y: 460, w: 64, h: 44 },
      { x: 600, y: 420, w: 64, h: 44 },
      { x: 290, y: 350, w: 64, h: 44 }, { x: 910, y: 350, w: 64, h: 44 },
      { x: 280, y: 500, w: 64, h: 44 }, { x: 930, y: 500, w: 64, h: 44 },
    ],
    rocks: [
      { x: 480, y: 520, w: 80, h: 60 }, { x: 700, y: 520, w: 80, h: 60 },
    ],
    grass: [
      { x: 90, y: 250, w: 110, h: 70 }, { x: 1080, y: 560, w: 110, h: 70 },
      { x: 580, y: 110, w: 120, h: 50 },
      { x: 90, y: 560, w: 130, h: 80 }, { x: 1080, y: 120, w: 120, h: 60 },
    ],
    shelves: [],
    lamps: [
      { x: 300, y: 130, r: 130 }, { x: 980, y: 130, r: 130 },
      { x: 640, y: 470, r: 120 },
      { x: 200, y: 660, r: 110 }, { x: 1080, y: 660, r: 110 },
    ],
    checkered: null,
    guards: [
      { name: 'Eko', path: [[250, 300], [1030, 300]], speed: 62 },
      { name: 'Lestari', path: [[400, 420], [400, 660]], speed: 55 },
      { name: 'Fajar', path: [[880, 420], [880, 660]], speed: 55 },
      { name: 'Nita', path: [[200, 620], [1080, 620]], speed: 58 },
      { name: 'Rizky', path: [[640, 240], [640, 480]], speed: 50 },
    ],
    cameras: [],
    tripwires: [],
    dog: { name: 'Anjing Kala', path: [[420, 470], [860, 470]], speed: 95, range: 300 },
  },
];

export const SCOPE = { levels: 3, guards: 13, treasures: 9 };
export const GHOST_BONUS = 500;
