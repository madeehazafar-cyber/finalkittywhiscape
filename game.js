"use strict";

// Kitty Whiscape rebuilt as a Canvas platformer with JSON-like level data.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const playButton = document.getElementById("playButton");
const editorButton = document.getElementById("editorButton");
const levelSelect = document.getElementById("levelSelect");
const levelMap = document.getElementById("levelMap");
const backToMenu = document.getElementById("backToMenu");
const pauseMenu = document.getElementById("pauseMenu");
const continueButton = document.getElementById("continueButton");
const quitButton = document.getElementById("quitButton");
const levelEditor = document.getElementById("levelEditor");
const closeEditor = document.getElementById("closeEditor");
const levelJson = document.getElementById("levelJson");
const toast = document.getElementById("toast");

const VIEW_W = 1280;
const VIEW_H = 720;
const TILE = 48;
const GRAVITY = 0.72;
const FRICTION = 0.82;
const AIR_FRICTION = 0.96;
const MAX_FALL = 18;

const keys = new Set();
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let lastTime = 0;
let running = false;
let levelIndex = 0;
let level = null;
let camera = { x: 0, y: 0 };
let shake = 0;
let message = "";
let messageTimer = 0;
let fishFound = new Set();
let levelStartFishFound = new Set();
let gameWon = false;
let unlockedLevels = 1;
let paused = false;

const player = {
  x: 0,
  y: 0,
  w: 38,
  h: 42,
  vx: 0,
  vy: 0,
  face: 1,
  grounded: false,
  jumpsUsed: 0,
  maxJumps: 2,
  coyote: 0,
  jumpBuffer: 0,
  hearts: 3,
  yarn: 0,
  stars: 0,
  fish: 0,
  invuln: 0,
  grapple: null,
  spawnX: 0,
  spawnY: 0
};

const LEVELS = [
  {
    id: "kitchen",
    name: "Kitchen Tutorial",
    theme: "kitchen",
    width: 3300,
    height: 1080,
    start: [110, 770],
    exit: [3120, 730],
    prompt: "Follow the mansion notes: move, double jump, then grapple across the glowing yarn gaps.",
    tutorials: [
      { x: 150, text: "Press A/D to move." },
      { x: 620, text: "Press W to jump. Press W again to double jump!" },
      { x: 1260, text: "See the glowing yarn? Stand near it. Press E or Right Mouse Button to shoot your yarn and grapple across!" },
      { x: 2080, text: "Practice: use yarn points to cross these safe gaps." }
    ],
    platforms: [
      [0, 920, 900, 160], [1080, 920, 420, 160], [1700, 920, 420, 160], [2320, 920, 420, 160], [2940, 920, 360, 160],
      [380, 790, 280, 34], [780, 760, 240, 34], [1220, 720, 260, 34], [1820, 730, 260, 34], [2440, 740, 260, 34],
      [1420, 590, 210, 30], [2040, 600, 210, 30], [2660, 610, 210, 30]
    ],
    stars: [[520, 742], [1430, 672], [2670, 562]],
    yarn: [[250, 870], [760, 870], [1110, 870], [1360, 672], [1700, 870], [1980, 552], [2320, 870], [2600, 562], [2960, 870]],
    fishCrates: [[580, 724], [2720, 564]],
    enemies: [[2580, 884, 70]],
    webPoints: [[1040, 670], [1320, 630], [1620, 650], [1940, 540], [2240, 650], [2560, 550], [2880, 650]]
  },
  {
    id: "ballroom",
    name: "Ballroom Timing",
    theme: "ballroom",
    width: 3600,
    height: 1180,
    start: [100, 860],
    exit: [3400, 700],
    prompt: "Ballroom: time your jumps around slow enemies, then use clear grapple shots to reach the balcony.",
    platforms: [
      [0, 1010, 680, 170], [820, 1010, 480, 170], [1460, 960, 460, 220], [2080, 900, 460, 280], [2720, 900, 420, 280], [3280, 840, 320, 340],
      [420, 820, 270, 34], [900, 730, 270, 34], [1380, 650, 270, 34], [1880, 570, 270, 34], [2380, 620, 270, 34], [2880, 720, 270, 34]
    ],
    stars: [[440, 774], [1900, 524], [2920, 672]],
    yarn: [[240, 960], [700, 960], [1000, 684], [1500, 604], [2000, 524], [2500, 574], [3000, 674], [3340, 790]],
    fishCrates: [[1260, 964], [2860, 674]],
    enemies: [[900, 974, 90], [2120, 864, 95], [2920, 864, 90]],
    webPoints: [[760, 690], [1180, 600], [1640, 520], [2140, 470], [2640, 540], [3100, 640], [3380, 600]]
  },
  {
    id: "library",
    name: "Library of Shadow",
    theme: "library",
    width: 3900,
    height: 1280,
    start: [110, 970],
    exit: [3700, 820],
    prompt: "Shadow can only be beaten by dropping a bookshelf, then hitting the stunned boss with 3 yarn balls.",
    platforms: [
      [0, 1120, 620, 160], [1120, 1120, 430, 160], [1980, 1120, 450, 160], [2820, 1120, 460, 160], [3500, 1040, 400, 240],
      [520, 900, 240, 34], [1110, 780, 240, 34], [1480, 660, 240, 34], [1910, 790, 240, 34], [2320, 920, 240, 34],
      [2840, 820, 250, 34], [3260, 720, 250, 34], [3600, 880, 230, 34],
      [1480, 1000, 220, 30], [2040, 1000, 220, 30], [2600, 1000, 220, 30]
    ],
    stars: [[540, 854], [1500, 614], [3280, 674]],
    yarn: [[280, 1070], [640, 854], [1040, 1070], [1210, 734], [1600, 614], [2040, 1070], [2260, 1070], [2880, 1070], [3160, 774], [3540, 990]],
    fishCrates: [[1550, 954]],
    enemies: [[2040, 1084, 85], [2920, 1084, 90]],
    webPoints: [[850, 720], [1160, 650], [1420, 540], [1760, 660], [2180, 760], [2560, 840], [3060, 690], [3440, 610], [3700, 720]],
    shelves: [[1500, 790], [2060, 790], [2620, 790]],
    shelfWebPoints: [[1560, 700], [2120, 700], [2680, 700]],
    boss: {
      type: "shadow",
      name: "Shadow",
      x: 3180,
      y: 1066,
      arena: [900, 760, 2500, 360],
      hp: 3
    }
  },
  {
    id: "dungeon",
    name: "Dungeon Descent",
    theme: "dungeon",
    width: 3400,
    height: 1680,
    start: [120, 310],
    exit: [3100, 1400],
    prompt: "Dungeon: descend in readable steps. Each long drop has a visible web point and recovery ledge.",
    platforms: [
      [0, 460, 560, 120], [650, 560, 420, 90], [1160, 690, 410, 90], [1660, 840, 410, 90], [2120, 1010, 420, 90], [2540, 1200, 420, 90], [2920, 1500, 480, 180],
      [480, 680, 220, 32], [850, 800, 220, 32], [1240, 940, 220, 32], [1640, 1080, 220, 32], [2020, 1230, 220, 32], [2400, 1370, 220, 32], [2760, 1430, 220, 32]
    ],
    stars: [[300, 410], [1280, 642], [2780, 1384]],
    yarn: [[220, 410], [620, 632], [900, 752], [1320, 642], [1740, 792], [2180, 962], [2600, 1152], [2960, 1452]],
    fishCrates: [[900, 754]],
    enemies: [[1710, 804, 90], [2960, 1464, 90]],
    webPoints: [[560, 390], [820, 520], [1120, 610], [1500, 720], [1900, 880], [2320, 1040], [2700, 1220], [3040, 1340], [3200, 1320]]
  },
  {
    id: "attic",
    name: "Nancy's Attic",
    theme: "attic",
    width: 3400,
    height: 1040,
    start: [110, 750],
    exit: [3180, 680],
    prompt: "Attic finale: platforms are wide, crystals are reachable, and the chandelier has extra setup web points.",
    platforms: [
      [0, 900, 720, 140], [840, 900, 520, 140], [1480, 900, 560, 140], [2160, 900, 520, 140], [2800, 900, 600, 140],
      [520, 720, 250, 34], [900, 620, 260, 34], [1320, 540, 260, 34], [1740, 500, 280, 34], [2160, 580, 260, 34], [2580, 700, 260, 34]
    ],
    stars: [[560, 674], [1360, 494], [2580, 654]],
    yarn: [[250, 850], [760, 850], [1010, 574], [1440, 494], [1860, 454], [2240, 534], [2680, 654], [2920, 850], [3160, 850]],
    fishCrates: [[580, 654], [2310, 854]],
    enemies: [[2240, 864, 80]],
    webPoints: [[760, 610], [1120, 520], [1500, 430], [1860, 360], [2220, 460], [2600, 580], [2960, 650], [2020, 250], [2200, 260, "nancyChandelier"]],
    crystals: [[1760, 800], [1980, 800], [2200, 800]],
    boss: {
      type: "nancy",
      name: "Nancy",
      x: 2300,
      y: 820,
      arena: [1720, 260, 860, 640],
      hp: 8
    }
  }
];

const TOTAL_FISH = LEVELS.reduce((sum, l) => sum + l.fishCrates.length, 0);
let objects = {};
unlockedLevels = readUnlockedLevels();

function readUnlockedLevels() {
  const saved = Number(localStorage.getItem("kittyWhiscapeUnlocked") || "1");
  return Math.max(1, Math.min(LEVELS?.length || 5, Number.isFinite(saved) ? saved : 1));
}

function saveUnlockedLevels(count) {
  unlockedLevels = Math.max(unlockedLevels, Math.min(LEVELS.length, count));
  localStorage.setItem("kittyWhiscapeUnlocked", String(unlockedLevels));
}

function hidePanels() {
  menu.hidden = true;
  levelSelect.hidden = true;
  pauseMenu.hidden = true;
  levelEditor.hidden = true;
}

function showMainMenu() {
  running = false;
  paused = false;
  hidePanels();
  menu.hidden = false;
}

function showLevelSelect() {
  running = false;
  paused = false;
  player.grapple = null;
  hidePanels();
  renderLevelSelect();
  levelSelect.hidden = false;
}

function renderLevelSelect() {
  levelMap.innerHTML = "";
  LEVELS.forEach((room, index) => {
    const button = document.createElement("button");
    const unlocked = index < unlockedLevels;
    button.type = "button";
    button.className = `room-button ${unlocked ? "unlocked" : "locked"}`;
    button.disabled = !unlocked;
    button.innerHTML = `<strong>${index + 1}. ${room.name}</strong><span>${unlocked ? room.prompt : "Locked"}</span>`;
    button.addEventListener("click", () => startLevel(index));
    levelMap.appendChild(button);
  });
}

function startLevel(index) {
  if (index >= unlockedLevels) return;
  hidePanels();
  paused = false;
  running = true;
  levelStartFishFound = new Set(fishFound);
  resetLevel(index);
}

function quitToLevelSelect() {
  fishFound = new Set(levelStartFishFound);
  showLevelSelect();
}

function setPaused(value) {
  if (!running && !paused) return;
  paused = value;
  pauseMenu.hidden = !paused;
  if (paused) {
    keys.clear();
    player.grapple = null;
    say("Paused");
  }
}

function cloneLevel(source) {
  return JSON.parse(JSON.stringify(source));
}

function resetLevel(index = levelIndex) {
  levelIndex = index;
  level = cloneLevel(LEVELS[levelIndex]);
  objects = {
    platforms: level.platforms.map(([x, y, w, h]) => ({ x, y, w, h })),
    stars: level.stars.map(([x, y]) => ({ x, y, r: 18, taken: false })),
    yarn: level.yarn.map(([x, y]) => ({ x, y, r: 16, taken: false })),
    crates: level.fishCrates.map(([x, y], index) => ({
      x,
      y,
      w: 44,
      h: 44,
      broken: fishFound.has(`${levelIndex}:${index}`),
      id: `${levelIndex}:${index}`
    })),
    enemies: level.enemies.map(([x, y, patrol]) => ({ x, y, w: 42, h: 36, baseX: x, patrol, vx: 1.3, alive: true })),
    webPoints: [
      ...level.webPoints.map(([x, y, kind = "normal"]) => ({ x, y, kind, used: false, glow: 0 })),
      ...(level.shelfWebPoints || []).map(([x, y], index) => ({ x, y, kind: "shelf", shelfIndex: index, used: false, glow: 0 }))
    ],
    shelves: (level.shelves || []).map(([x, y]) => ({ x, y, w: 120, h: 190, falling: false, vy: 0, spent: false })),
    crystals: (level.crystals || []).map(([x, y]) => ({ x, y, r: 24, charged: true })),
    projectiles: [],
    particles: []
  };
  if (level.mirror) {
    objects.mirror = { x: level.mirror[0], y: level.mirror[1], w: 86, h: 148, broken: false };
  }
  objects.boss = makeBoss(level.boss);
  player.x = level.start[0];
  player.y = level.start[1];
  player.spawnX = player.x;
  player.spawnY = player.y;
  player.vx = 0;
  player.vy = 0;
  player.hearts = 3;
  player.yarn = 1;
  player.stars = 0;
  player.fish = 0;
  player.grapple = null;
  player.jumpsUsed = 0;
  player.invuln = 0;
  gameWon = false;
  camera.x = 0;
  camera.y = 0;
  say(`${level.name}: ${level.prompt}`, 4.5);
}

function makeBoss(data) {
  if (!data) return null;
  return {
    ...data,
    w: data.type === "nancy" ? 58 : 54,
    h: data.type === "duchess" ? 66 : 54,
    baseX: data.x,
    vx: data.type === "whiskers" ? 0 : 1.7,
    vy: 0,
    state: "idle",
    timer: 1,
    phase: 1,
    stunned: 0,
    defeated: false,
    chargeDir: -1,
    hits: 0,
    shelfStuns: 0,
    visibleIndex: 0,
    orbTimer: 1.2
  };
}

function say(text, seconds = 2.5) {
  message = text;
  messageTimer = seconds;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(say.hideTimer);
  say.hideTimer = setTimeout(() => toast.classList.remove("show"), seconds * 1000);
}

function resizeCanvas() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(VIEW_W * dpr);
  canvas.height = Math.floor(VIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) / rect.width * VIEW_W;
  const sy = (clientY - rect.top) / rect.height * VIEW_H;
  mouse.x = sx;
  mouse.y = sy;
  mouse.worldX = sx + camera.x;
  mouse.worldY = sy + camera.y;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(x, y, r) {
  return { x: x - r, y: y - r, w: r * 2, h: r * 2 };
}

function distance(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function collectNear(list, callback) {
  for (const item of list) {
    if (!item.taken && distance(player.x + player.w / 2, player.y + player.h / 2, item.x, item.y) < item.r + 32) {
      item.taken = true;
      callback(item);
    }
  }
}

function handleInput() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const fastFall = keys.has("arrowdown") || keys.has("s");

  if (left) {
    player.vx -= player.grounded ? 0.72 : 0.46;
    player.face = -1;
  }
  if (right) {
    player.vx += player.grounded ? 0.72 : 0.46;
    player.face = 1;
  }
  player.vx = Math.max(-7.2, Math.min(7.2, player.vx));
  if (fastFall && !player.grounded) player.vy += 0.52;

  const canGroundJump = player.grounded || player.coyote > 0;
  const canAirJump = !canGroundJump && player.jumpsUsed < player.maxJumps - 1;
  if (player.jumpBuffer > 0 && (canGroundJump || canAirJump)) {
    player.vy = -14.4;
    player.grounded = false;
    player.jumpBuffer = 0;
    player.coyote = 0;
    player.jumpsUsed = canGroundJump ? 1 : player.jumpsUsed + 1;
    puff(player.x + player.w / 2, player.y + player.h, "#fff5cf", 8);
  }
}

function updatePlayer(dt) {
  player.jumpBuffer -= dt;
  player.coyote -= dt;
  player.invuln -= dt;
  handleInput();

  if (player.grapple) {
    const gp = player.grapple.point;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const dx = gp.x - cx;
    const dy = gp.y - cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const pull = Math.min(1.15, 280 / dist);
    player.vx += (dx / dist) * pull;
    player.vy += (dy / dist) * pull - 0.04;
    player.grapple.time -= dt;
    if (dist < 48 || player.grapple.time <= 0) player.grapple = null;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(MAX_FALL, player.vy);
  player.x += player.vx;
  collideAxis("x");
  player.y += player.vy;
  player.grounded = false;
  collideAxis("y");
  player.vx *= player.grounded ? FRICTION : AIR_FRICTION;
  if (player.grounded) {
    player.coyote = 0.12;
    player.jumpsUsed = 0;
  }

  if (player.y > level.height + 160) hurtPlayer("Kitty fell. Restarting the room.");

  collectNear(objects.stars, () => {
    player.stars += 1;
    puff(player.x, player.y, "#ffd166", 14);
    say(`${player.stars}/3 stars collected`);
  });
  collectNear(objects.yarn, () => {
    player.yarn += 1;
    puff(player.x, player.y, "#ff9ecb", 12);
    say(`Yarn ammo +1. You have ${player.yarn}.`);
  });

  for (const enemy of objects.enemies) {
    if (enemy.alive && rectsOverlap(player, enemy)) hurtPlayer("Ouch. Enemy hit!");
  }
  const boss = objects.boss;
  if (boss && !boss.defeated && rectsOverlap(player, boss) && player.invuln <= 0) {
    hurtPlayer(`${boss.name} hit Kitty!`);
  }

  const exit = { x: level.exit[0], y: level.exit[1] - 96, w: 74, h: 116 };
  if (rectsOverlap(player, exit)) {
    if (player.stars < 3) {
      say("The door needs all 3 stars.");
    } else if (objects.boss && !objects.boss.defeated) {
      say(`Defeat ${objects.boss.name} to unlock the door.`);
    } else {
      nextLevel();
    }
  }
}

function collideAxis(axis) {
  const solids = objects.platforms;
  for (const p of solids) {
    if (!rectsOverlap(player, p)) continue;
    if (axis === "x") {
      if (player.vx > 0) player.x = p.x - player.w;
      if (player.vx < 0) player.x = p.x + p.w;
      player.vx = 0;
    } else {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.grounded = true;
      }
      if (player.vy < 0) player.y = p.y + p.h;
      player.vy = 0;
    }
  }
}

function hurtPlayer(text) {
  if (player.invuln > 0) return;
  player.hearts -= 1;
  player.invuln = 1.3;
  shake = 14;
  player.grapple = null;
  say(text);
  if (player.hearts <= 0) {
    say("Game over. Restarting this room.");
    setTimeout(() => resetLevel(levelIndex), 600);
  } else {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.jumpsUsed = 0;
  }
}

function updateEnemies(dt) {
  for (const enemy of objects.enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx;
    if (Math.abs(enemy.x - enemy.baseX) > enemy.patrol) enemy.vx *= -1;
  }
  for (const shelf of objects.shelves) {
    if (shelf.falling && !shelf.spent) {
      shelf.vy += 0.9;
      shelf.y += shelf.vy;
      if (objects.boss && objects.boss.type === "shadow" && !objects.boss.defeated && rectsOverlap(shelf, objects.boss)) {
        objects.boss.stunned = 6;
        objects.boss.shelfStuns += 1;
        shelf.spent = true;
        shelf.falling = false;
        puff(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2, "#c084fc", 24);
        say("Bookshelf slam! Shadow is stunned. Hit him with 3 yarn balls!");
      }
      if (shelf.y > level.height) shelf.spent = true;
    }
  }
  for (const p of objects.projectiles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.kind === "orb" && rectsOverlap(player, { x: p.x - 12, y: p.y - 12, w: 24, h: 24 })) hurtPlayer("Nancy's orb burned a heart.");
  }
  objects.projectiles = objects.projectiles.filter(p => p.life > 0);
}

function updateBoss(dt) {
  const boss = objects.boss;
  if (!boss || boss.defeated) return;
  boss.timer -= dt;
  boss.stunned -= dt;

  if (boss.type === "whiskers") updateWhiskers(boss, dt);
  if (boss.type === "shadow") updateShadow(boss, dt);
  if (boss.type === "duchess") updateDuchess(boss, dt);
  if (boss.type === "nancy") updateNancy(boss, dt);
}

function updateWhiskers(boss, dt) {
  if (boss.state === "idle" && boss.timer <= 0) {
    boss.state = "charge";
    boss.chargeDir = player.x < boss.x ? -1 : 1;
    boss.timer = 1.35;
    say("Whiskers is charging. Use the chandelier web point!");
  }
  if (boss.state === "charge") {
    boss.x += boss.chargeDir * 7.5;
    if (boss.x < boss.arena[0] || boss.x + boss.w > boss.arena[0] + boss.arena[2]) boss.chargeDir *= -1;
    if (boss.timer <= 0) {
      boss.state = "idle";
      boss.timer = 1.4;
    }
  }
}

function updateShadow(boss, dt) {
  if (boss.stunned > 0) return;
  const left = boss.arena[0];
  const right = boss.arena[0] + boss.arena[2] - boss.w;
  const playerInRange = player.x > left - 160 && player.x < right + 160;
  if (playerInRange) {
    const dir = player.x + player.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
    boss.vx += dir * 0.18;
  } else {
    boss.vx += (boss.chargeDir || 1) * 0.08;
  }
  boss.vx = Math.max(-4.1, Math.min(4.1, boss.vx));
  boss.x += boss.vx;
  boss.vx *= 0.94;
  if (boss.x <= left) {
    boss.x = left;
    boss.chargeDir = 1;
    boss.vx = Math.abs(boss.vx);
  }
  if (boss.x >= right) {
    boss.x = right;
    boss.chargeDir = -1;
    boss.vx = -Math.abs(boss.vx);
  }
  if (boss.timer <= 0) {
    boss.visibleIndex = (boss.visibleIndex + 1) % 3;
    boss.timer = 1.2;
  }
}

function updateDuchess(boss, dt) {
  if (boss.stunned > 0) return;
  const dir = player.x < boss.x ? -1 : 1;
  boss.vx += dir * 0.12;
  boss.vx = Math.max(-3.4, Math.min(3.4, boss.vx));
  boss.x += boss.vx;
  boss.vx *= 0.94;
  if (boss.x < boss.arena[0]) boss.x = boss.arena[0];
  if (boss.x > boss.arena[0] + boss.arena[2] - boss.w) boss.x = boss.arena[0] + boss.arena[2] - boss.w;
}

function updateNancy(boss, dt) {
  boss.x = boss.baseX + Math.sin(performance.now() / 650) * 150;
  if (boss.phase === 1) {
    boss.orbTimer -= dt;
    if (boss.orbTimer <= 0) {
      const cx = boss.x + boss.w / 2;
      const cy = boss.y + 10;
      const dx = player.x - cx;
      const dy = player.y - cy;
      const d = Math.max(1, Math.hypot(dx, dy));
      objects.projectiles.push({ kind: "orb", x: cx, y: cy, vx: dx / d * 4.5, vy: dy / d * 4.5, life: 4 });
      boss.orbTimer = 1.25;
      say("Shoot a crystal while an orb is flying to reflect it.");
    }
  }
}

function damageBoss(amount, text) {
  const boss = objects.boss;
  if (!boss || boss.defeated) return;
  boss.hp -= amount;
  boss.stunned = Math.max(boss.stunned, 0.9);
  shake = 10;
  say(`${text} ${boss.name} HP: ${Math.max(0, boss.hp)}`);
  if (boss.type === "nancy" && boss.phase === 1 && boss.hp <= 5) {
    boss.phase = 2;
    boss.hp = 5;
    objects.projectiles.length = 0;
    say("Nancy phase 2: swing the chandelier into her 5 times!");
  } else if (boss.hp <= 0) {
    boss.defeated = true;
    puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#fff2a8", 50);
    say(`${boss.name} defeated! The exit is open.`);
  }
}

function fireYarn() {
  if (!running || paused || gameWon) return;
  if (player.grapple) {
    player.grapple = null;
    return;
  }
  if (player.yarn <= 0) {
    say("No yarn ammo. Find a yarn ball.");
    return;
  }
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const target = nearestInteractive(px, py);
  if (!target) {
    say("Move closer to a glowing yarn point or boss object.");
    return;
  }
  player.yarn -= 1;
  if (target.type === "web") {
    if (target.obj.kind === "shelf") {
      dropShelf(objects.shelves[target.obj.shelfIndex]);
      return;
    }
    player.grapple = { point: target.obj, time: 2.2 };
    puff(target.obj.x, target.obj.y, "#ff9ecb", 14);
    if (target.obj.kind === "chandelier") dropWhiskersChandelier(target.obj);
    if (target.obj.kind === "nancyChandelier") swingNancyChandelier(target.obj);
  }
  if (target.type === "crate") breakCrate(target.obj);
  if (target.type === "shelf") dropShelf(target.obj);
  if (target.type === "mirror") smashMirror();
  if (target.type === "duchess") hitDuchess();
  if (target.type === "shadow") hitShadow();
  if (target.type === "crystal") reflectNancyOrb(target.obj);
}

function nearestInteractive(px, py) {
  const choices = [];
  for (const point of objects.webPoints) {
    choices.push({ type: "web", obj: point, d: distance(px, py, point.x, point.y), limit: 370 });
  }
  for (const crate of objects.crates) {
    if (!crate.broken) choices.push({ type: "crate", obj: crate, d: distance(px, py, crate.x + 22, crate.y + 22), limit: 230 });
  }
  if (objects.mirror && !objects.mirror.broken) {
    const m = objects.mirror;
    choices.push({ type: "mirror", obj: m, d: distance(px, py, m.x + m.w / 2, m.y + m.h / 2), limit: 360 });
  }
  if (objects.boss && objects.boss.type === "duchess" && objects.boss.stunned > 0 && !objects.boss.defeated) {
    const b = objects.boss;
    choices.push({ type: "duchess", obj: b, d: distance(px, py, b.x + b.w / 2, b.y + b.h / 2), limit: 360 });
  }
  if (objects.boss && objects.boss.type === "shadow" && objects.boss.stunned > 0 && !objects.boss.defeated) {
    const b = objects.boss;
    choices.push({ type: "shadow", obj: b, d: distance(px, py, b.x + b.w / 2, b.y + b.h / 2), limit: 380 });
  }
  for (const crystal of objects.crystals) {
    if (crystal.charged) choices.push({ type: "crystal", obj: crystal, d: distance(px, py, crystal.x, crystal.y), limit: 420 });
  }
  choices.sort((a, b) => a.d - b.d);
  return choices.find(c => c.d <= c.limit) || null;
}

function breakCrate(crate) {
  crate.broken = true;
  if (!fishFound.has(crate.id)) {
    fishFound.add(crate.id);
    player.fish += 1;
  }
  puff(crate.x + 22, crate.y + 22, "#7dd3fc", 20);
  say(`Hidden fish found! Total fish: ${fishFound.size}/${TOTAL_FISH}`);
}

function dropShelf(shelf) {
  if (objects.boss?.type !== "shadow") {
    say("That shelf rattled, but nothing happened.");
    return;
  }
  if (!shelf || shelf.spent || shelf.falling) {
    say("That bookshelf has already fallen.");
    return;
  }
  shelf.falling = true;
  shelf.vy = 2;
  puff(shelf.x + shelf.w / 2, shelf.y + 20, "#c084fc", 14);
  say("Bookshelf falling! Lure Shadow directly underneath.");
}

function smashMirror() {
  const boss = objects.boss;
  if (!boss || boss.type !== "duchess") return;
  const mirror = objects.mirror;
  if (distance(boss.x, boss.y, mirror.x, mirror.y) > 260) {
    say("Lure Duchess closer to the mirror first.");
    return;
  }
  mirror.broken = true;
  boss.stunned = 5;
  puff(mirror.x + 40, mirror.y + 70, "#bae6fd", 34);
  say("Mirror smashed! Duchess is stunned. Hit her with yarn 3 times.");
}

function hitDuchess() {
  if (objects.boss?.type === "duchess" && objects.boss.stunned > 0) {
    damageBoss(1, "Yarn hit!");
  }
}

function hitShadow() {
  const boss = objects.boss;
  if (!boss || boss.type !== "shadow" || boss.defeated) return;
  if (boss.stunned <= 0) {
    say("Shadow shrugs it off. Drop a bookshelf on him first!");
    return;
  }
  damageBoss(1, "Yarn hit the stunned Shadow!");
  boss.stunned = Math.max(boss.stunned, 2.2);
}

function reflectNancyOrb(crystal) {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy" || boss.phase !== 1) {
    say("The crystal will matter during Nancy's orb phase.");
    return;
  }
  const orb = objects.projectiles.find(p => p.kind === "orb" && distance(p.x, p.y, crystal.x, crystal.y) < 260);
  if (!orb) {
    say("Wait until one of Nancy's orbs is close to a crystal.");
    return;
  }
  crystal.charged = false;
  orb.life = 0;
  damageBoss(1, "Crystal reflected an orb!");
}

function dropWhiskersChandelier(point) {
  const boss = objects.boss;
  if (!boss || boss.type !== "whiskers" || boss.defeated) return;
  if (Math.abs((boss.x + boss.w / 2) - point.x) < 190) {
    damageBoss(1, "The chandelier dropped on Whiskers!");
  } else {
    say("Drop the chandelier while Whiskers charges underneath it.");
  }
}

function swingNancyChandelier(point) {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy" || boss.phase !== 2) {
    say("Save the attic chandelier for Nancy's second phase.");
    return;
  }
  if (distance(point.x, point.y, boss.x + boss.w / 2, boss.y) < 520) {
    damageBoss(1, "Chandelier swing connected!");
  } else {
    say("Get Nancy closer before swinging the chandelier.");
  }
}

function nextLevel() {
  if (levelIndex < LEVELS.length - 1) {
    saveUnlockedLevels(levelIndex + 2);
    say(`${LEVELS[levelIndex + 1].name} unlocked!`);
    showLevelSelect();
  } else {
    winGame();
  }
}

function winGame() {
  gameWon = true;
  running = false;
  saveUnlockedLevels(LEVELS.length);
  say(`Nancy defeated. Hidden fish found: ${fishFound.size}/${TOTAL_FISH}.`, 9);
}

function updateCamera() {
  camera.x += (player.x + player.w / 2 - VIEW_W / 2 - camera.x) * 0.09;
  camera.y += (player.y + player.h / 2 - VIEW_H / 2 - camera.y) * 0.09;
  camera.x = Math.max(0, Math.min(level.width - VIEW_W, camera.x));
  camera.y = Math.max(0, Math.min(level.height - VIEW_H, camera.y));
}

function update(dt) {
  if (!running || paused) return;
  messageTimer -= dt;
  shake = Math.max(0, shake - dt * 30);
  updatePlayer(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateParticles(dt);
  updateCamera();
}

function puff(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    objects.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.7) * 7,
      life: 0.45 + Math.random() * 0.45,
      color
    });
  }
}

function updateParticles(dt) {
  for (const p of objects.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life -= dt;
  }
  objects.particles = objects.particles.filter(p => p.life > 0);
}

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground();
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
  drawWorld();
  ctx.restore();
  drawHud();
  if (gameWon) drawWinOverlay();
}

function drawBackground() {
  const palettes = {
    kitchen: ["#27202d", "#4b2534", "#704436"],
    library: ["#141926", "#243249", "#593a49"],
    ballroom: ["#21152a", "#633457", "#9b5f63"],
    dungeon: ["#10151d", "#172a2f", "#33413d"],
    attic: ["#171423", "#3e2d3c", "#675247"]
  };
  const p = palettes[level?.theme || "kitchen"];
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, p[0]);
  grd.addColorStop(0.58, p[1]);
  grd.addColorStop(1, p[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let i = 0; i < 26; i++) {
    const x = (i * 173 - camera.x * 0.22) % (VIEW_W + 220) - 80;
    const y = 60 + (i * 83) % 430 - camera.y * 0.08;
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawWorld() {
  drawRoomDecor();
  drawTutorialPrompts();
  for (const p of objects.platforms) drawPlatform(p);
  drawExit();
  for (const crate of objects.crates) if (!crate.broken) drawCrate(crate);
  for (const shelf of objects.shelves) if (!shelf.spent) drawShelf(shelf);
  if (objects.mirror) drawMirror(objects.mirror);
  for (const crystal of objects.crystals) drawCrystal(crystal);
  for (const star of objects.stars) if (!star.taken) drawEmoji("⭐", star.x, star.y, 30);
  for (const y of objects.yarn) if (!y.taken) drawYarnBall(y.x, y.y, 16);
  for (const point of objects.webPoints) drawWebPoint(point);
  for (const enemy of objects.enemies) if (enemy.alive) drawEnemy(enemy);
  for (const p of objects.projectiles) drawProjectile(p);
  if (objects.boss && !objects.boss.defeated) drawBoss(objects.boss);
  drawPlayer();
  drawGrapple();
  for (const p of objects.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
    ctx.globalAlpha = 1;
  }
}

function drawTutorialPrompts() {
  if (!level.tutorials) return;
  ctx.font = "bold 19px Trebuchet MS";
  ctx.textAlign = "center";
  for (const note of level.tutorials) {
    const visible = Math.abs((player.x + player.w / 2) - note.x) < 520;
    ctx.globalAlpha = visible ? 1 : 0.38;
    const w = Math.min(520, 90 + note.text.length * 8.6);
    const x = note.x;
    const y = 585;
    ctx.fillStyle = "rgba(18, 10, 13, 0.78)";
    ctx.fillRect(x - w / 2, y - 40, w, 54);
    ctx.strokeStyle = "rgba(247, 199, 109, 0.72)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - w / 2, y - 40, w, 54);
    ctx.fillStyle = "#fff4c2";
    ctx.fillText(note.text, x, y - 8);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawRoomDecor() {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x < level.width; x += 260) {
    ctx.fillRect(x + 20, 120, 76, level.height - 170);
  }
  if (level.theme === "kitchen") {
    for (let x = 140; x < level.width; x += 500) drawEmoji("🍳", x, 210, 44);
  }
  if (level.theme === "library") {
    for (let x = 120; x < level.width; x += 360) {
      ctx.fillStyle = "#3b2b3f";
      ctx.fillRect(x, 180, 150, 260);
      ctx.fillStyle = "#c084fc";
      for (let b = 0; b < 6; b++) ctx.fillRect(x + 14 + b * 20, 202, 12, 210);
    }
  }
  if (level.theme === "ballroom") {
    for (let x = 180; x < level.width; x += 520) drawEmoji("🎵", x, 190, 38);
  }
  if (level.theme === "attic") {
    for (let x = 220; x < level.width; x += 520) drawEmoji("🕯️", x, 180, 34);
  }
}

function drawPlatform(p) {
  ctx.fillStyle = "#2c2030";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "#6ee7b7";
  ctx.fillRect(p.x, p.y, p.w, 8);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let x = p.x; x < p.x + p.w; x += TILE) ctx.fillRect(x, p.y + 10, 3, p.h - 10);
}

function drawExit() {
  const [x, y] = level.exit;
  const locked = player.stars < 3 || (objects.boss && !objects.boss.defeated);
  ctx.fillStyle = locked ? "#4b5563" : "#8b5cf6";
  ctx.fillRect(x, y - 96, 74, 116);
  ctx.fillStyle = locked ? "#9ca3af" : "#ffd166";
  ctx.fillRect(x + 12, y - 82, 50, 84);
  ctx.fillStyle = "#111827";
  ctx.fillRect(x + 48, y - 42, 6, 6);
}

function drawCrate(c) {
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
  ctx.beginPath();
  ctx.moveTo(c.x + 6, c.y + 6);
  ctx.lineTo(c.x + c.w - 6, c.y + c.h - 6);
  ctx.moveTo(c.x + c.w - 6, c.y + 6);
  ctx.lineTo(c.x + 6, c.y + c.h - 6);
  ctx.stroke();
}

function drawShelf(s) {
  ctx.fillStyle = "#4a2d3f";
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = "#f59e0b";
  for (let i = 0; i < 5; i++) ctx.fillRect(s.x + 14 + i * 19, s.y + 24, 12, 132);
  drawYarnBall(s.x + s.w / 2, s.y + 10, 13);
}

function drawMirror(m) {
  if (m.broken) {
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(m.x + 20 + i * 10, m.y + 30);
      ctx.lineTo(m.x + 44, m.y + 110 - i * 7);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = "#5b335f";
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(m.x + 12, m.y + 12, m.w - 24, m.h - 24);
  ctx.fillStyle = "rgba(255,255,255,0.44)";
  ctx.fillRect(m.x + 26, m.y + 18, 12, m.h - 36);
  drawYarnBall(m.x + m.w / 2, m.y - 12, 13);
}

function drawCrystal(c) {
  ctx.fillStyle = c.charged ? "#67e8f9" : "#475569";
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 28);
  ctx.lineTo(c.x + 22, c.y);
  ctx.lineTo(c.x, c.y + 28);
  ctx.lineTo(c.x - 22, c.y);
  ctx.closePath();
  ctx.fill();
  drawYarnBall(c.x, c.y - 42, 11);
}

function drawWebPoint(p) {
  const pulse = 1 + Math.sin(performance.now() / 160 + p.x) * 0.12;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#ff8dbd";
  ctx.shadowBlur = 18;
  drawYarnBall(0, 0, p.kind === "normal" ? 15 : 20);
  ctx.restore();
}

function drawYarnBall(x, y, r) {
  ctx.strokeStyle = "#ff8dbd";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y);
  ctx.quadraticCurveTo(x, y - r * 0.7, x + r * 0.7, y);
  ctx.moveTo(x - r * 0.6, y + r * 0.4);
  ctx.quadraticCurveTo(x, y - r * 0.2, x + r * 0.6, y + r * 0.4);
  ctx.stroke();
}

function drawEnemy(e) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(e.x + 8, e.y + 10, 7, 7);
  ctx.fillRect(e.x + 27, e.y + 10, 7, 7);
}

function drawProjectile(p) {
  ctx.fillStyle = "#a78bfa";
  ctx.shadowColor = "#ddd6fe";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBoss(b) {
  if (b.type === "shadow") {
    for (let i = 0; i < 3; i++) {
      const ghostX = b.arena[0] + 120 + i * 230 + Math.sin(performance.now() / 300 + i) * 20;
      ctx.globalAlpha = i === b.visibleIndex ? 1 : 0.38;
      drawBossBody({ ...b, x: i === b.visibleIndex ? b.x : ghostX, y: b.y }, i === b.visibleIndex ? "#0f172a" : "#1e293b", i === b.visibleIndex);
    }
    ctx.globalAlpha = 1;
  } else {
    const color = b.type === "whiskers" ? "#f97316" : b.type === "duchess" ? "#ec4899" : "#7c3aed";
    drawBossBody(b, color, true);
  }
  drawBossBar(b);
}

function drawBossBody(b, color, eyes) {
  ctx.fillStyle = color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "#111827";
  ctx.fillRect(b.x + 8, b.y - 16, 16, 20);
  ctx.fillRect(b.x + b.w - 24, b.y - 16, 16, 20);
  ctx.fillStyle = eyes ? "#fef08a" : "#334155";
  ctx.fillRect(b.x + 12, b.y + 15, 8, 8);
  ctx.fillRect(b.x + b.w - 20, b.y + 15, 8, 8);
  if (b.stunned > 0) drawEmoji("✦", b.x + b.w / 2, b.y - 24, 24);
}

function drawBossBar(b) {
  const max = b.type === "nancy" && b.phase === 2 ? 5 : b.type === "nancy" ? 8 : b.type === "whiskers" ? 1 : 3;
  const x = b.arena[0] + 20;
  const y = b.arena[1] + 20;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, 260, 20);
  ctx.fillStyle = "#ff5d73";
  ctx.fillRect(x, y, 260 * Math.max(0, b.hp / max), 20);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(`${b.name}${b.type === "nancy" ? ` Phase ${b.phase}` : ""}`, x, y - 8);
}

function drawPlayer() {
  ctx.save();
  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.face, 1);
  ctx.fillStyle = "#fff0cf";
  ctx.fillRect(-18, -18, 36, 34);
  ctx.fillStyle = "#f0a6a6";
  ctx.fillRect(-15, -28, 12, 14);
  ctx.fillRect(3, -28, 12, 14);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-9, -5, 5, 5);
  ctx.fillRect(7, -5, 5, 5);
  ctx.fillStyle = "#ff8dbd";
  ctx.fillRect(-3, 3, 6, 4);
  ctx.fillStyle = "#fff0cf";
  ctx.fillRect(-14, 16, 9, 10);
  ctx.fillRect(5, 16, 9, 10);
  ctx.restore();
}

function drawGrapple() {
  if (!player.grapple) return;
  const gp = player.grapple.point;
  ctx.strokeStyle = "#ffb8d6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2, player.y + player.h / 2);
  ctx.lineTo(gp.x, gp.y);
  ctx.stroke();
}

function drawHud() {
  ctx.fillStyle = "rgba(5,8,13,0.66)";
  ctx.fillRect(18, 18, 660, 82);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "bold 23px Trebuchet MS";
  ctx.fillText(`${"❤️".repeat(player.hearts)}${"♡".repeat(3 - player.hearts)}`, 34, 52);
  ctx.fillText(`⭐ ${player.stars}/3`, 170, 52);
  ctx.fillText(`🧶 ${player.yarn}`, 270, 52);
  ctx.fillText(`🐟 ${fishFound.size}/${TOTAL_FISH}`, 350, 52);
  ctx.fillText(`Room ${levelIndex + 1}/${LEVELS.length}: ${level.name}`, 34, 86);
  ctx.font = "bold 18px Trebuchet MS";
  ctx.fillStyle = "#dbeafe";
  ctx.fillText("Move A/D or Arrows | Double Jump W/Space | Grapple E or Right Mouse | Restart R", VIEW_W - 745, 50);
  if (messageTimer > 0 && message) {
    ctx.fillStyle = "rgba(5,8,13,0.72)";
    ctx.fillRect(330, VIEW_H - 86, 620, 46);
    ctx.fillStyle = "#fff8e8";
    ctx.textAlign = "center";
    ctx.fillText(message, VIEW_W / 2, VIEW_H - 56);
    ctx.textAlign = "left";
  }
}

function drawWinOverlay() {
  ctx.fillStyle = "rgba(5,8,13,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#fff4c2";
  ctx.textAlign = "center";
  ctx.font = "bold 70px Trebuchet MS";
  ctx.fillText("Nancy Defeated", VIEW_W / 2, 300);
  ctx.font = "bold 28px Trebuchet MS";
  ctx.fillText(`Hidden fish collected: ${fishFound.size}/${TOTAL_FISH}`, VIEW_W / 2, 358);
  ctx.fillText("Refresh or press Play to start again.", VIEW_W / 2, 404);
  ctx.textAlign = "left";
}

function drawEmoji(icon, x, y, size) {
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x, y);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  hidePanels();
  fishFound = new Set();
  showLevelSelect();
}

playButton.addEventListener("click", startGame);
backToMenu.addEventListener("click", showMainMenu);
continueButton.addEventListener("click", () => setPaused(false));
quitButton.addEventListener("click", quitToLevelSelect);
editorButton.addEventListener("click", () => {
  levelJson.value = JSON.stringify(LEVELS, null, 2);
  levelEditor.hidden = false;
});
closeEditor.addEventListener("click", () => {
  levelEditor.hidden = true;
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("mousemove", e => screenToWorld(e.clientX, e.clientY));
window.addEventListener("contextmenu", e => {
  e.preventDefault();
  screenToWorld(e.clientX, e.clientY);
  fireYarn();
});
window.addEventListener("mousedown", e => {
  if (e.button === 2) {
    e.preventDefault();
    fireYarn();
  }
});
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (key === "escape") {
    e.preventDefault();
    if (running || paused) setPaused(!paused);
    return;
  }
  if (paused) return;
  keys.add(key);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key)) e.preventDefault();
  if (key === "w" || key === "arrowup" || key === " ") player.jumpBuffer = 0.16;
  if (key === "e") fireYarn();
  if (key === "r" && running) resetLevel(levelIndex);
});
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

resizeCanvas();
resetLevel(0);
running = false;
renderLevelSelect();
requestAnimationFrame(loop);
