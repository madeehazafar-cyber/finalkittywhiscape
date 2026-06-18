"use strict";

// Kitty Whiscape rebuilt as a Canvas platformer with JSON-like level data.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const storyIntro = document.getElementById("storyIntro");
const storyStage = document.getElementById("storyStage");
const storyText = document.getElementById("storyText");
const storyNext = document.getElementById("storyNext");
const playButton = document.getElementById("playButton");
const roomsButton = document.getElementById("roomsButton");
const editorButton = document.getElementById("editorButton");
const levelSelect = document.getElementById("levelSelect");
const levelMap = document.getElementById("levelMap");
const backToMenu = document.getElementById("backToMenu");
const pauseMenu = document.getElementById("pauseMenu");
const continueButton = document.getElementById("continueButton");
const quitButton = document.getElementById("quitButton");
const victoryPanel = document.getElementById("victoryPanel");
const victorySummary = document.getElementById("victorySummary");
const returnVictoryButton = document.getElementById("returnVictoryButton");
const levelEditor = document.getElementById("levelEditor");
const closeEditor = document.getElementById("closeEditor");
const levelJson = document.getElementById("levelJson");
const transitionFade = document.getElementById("transitionFade");
const unlockBurst = document.getElementById("unlockBurst");
const modeDescription = document.getElementById("modeDescription");
const toast = document.getElementById("toast");
const menuKitty = document.getElementById("menuKitty");

const HOTSPOT_COORDS = [
  { left: 13, bottom: 27 },
  { left: 30, bottom: 45 },
  { left: 50, bottom: 33 },
  { left: 67, bottom: 51 },
  { left: 82, bottom: 35 }
];

let pawPrintInterval = null;

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
let storyActive = false;
let storyIndex = 0;
let storyTypingTimer = 0;
let storyTypingIndex = 0;
let classicStoryCompleted = false;
let speedrunModeUnlocked = false;
let selectedMode = "classic";
let selectedLevel = 0;
let pendingIntroLevel = null;
let storyTimer = null;
let visualTime = 0;
let lastUnlockLevel = -1;
let cutsceneAudio = null;
let currentAudioScene = 0;

const MODE_DESCRIPTIONS = {
  classic: "Play the full story of Kitty escaping Nancy's mansion.",
  speedrun: "Race through the mansion as fast as possible.",
  endless: "Survive an endless escape with increasing difficulty."
};

const INTRO_WATCHED_KEY = "kittyWhiscapeIntroWatched";

const STORY_BEATS = [
  { scene: 1, speaker: "kitty", text: "Peter... wait..." },
  { scene: 1, speaker: "kitty", text: "Peter abandoned me... wahhh!" },
  { scene: 2, speaker: "narration", text: "Alone under the moonlight, Kitty kept walking." },
  { scene: 3, speaker: "mystery", text: "There is a place beyond Nancy's mansion." },
  { scene: 3, speaker: "mystery", text: "A magical cat land." },
  { scene: 3, speaker: "mystery", text: "A place where no cat is abandoned." },
  { scene: 4, speaker: "thought", text: "Is that really possible?" },
  { scene: 5, speaker: "mystery", text: "Follow your heart." },
  { scene: 6, speaker: "narration", text: "Nancy's mansion waited in the fog." },
  { scene: 7, speaker: "nancy", text: "You think you can leave?" },
  { scene: 7, speaker: "nancy", text: "No one escapes my mansion." },
  { scene: 8, speaker: "kitty", text: "I'm not giving up." },
  { scene: 9, speaker: "narration", text: "Run, Kitty. The mansion is pulling you in." }
];

function createCutsceneAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const context = new AudioCtx();
  const master = context.createGain();
  master.gain.value = 0.18;
  master.connect(context.destination);
  const active = new Set();

  function track(node) {
    active.add(node);
    return node;
  }

  function stopTracked(node) {
    try { node.stop(); } catch (_) {}
    active.delete(node);
  }

  function tone(freq, duration = 0.35, type = "sine", volume = 0.2, dest = master, when = context.currentTime) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + duration + 0.04);
  }

  function noise(duration = 0.6, volume = 0.14, filterFreq = 900, type = "lowpass") {
    const samples = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, samples, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = type;
    filter.frequency.value = filterFreq;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function loopNoise(volume = 0.035, filterFreq = 1200) {
    const samples = context.sampleRate * 2;
    const buffer = context.createBuffer(1, samples, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i += 1) data[i] = Math.random() * 2 - 1;
    const source = track(context.createBufferSource());
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    return source;
  }

  let ambient = null;

  return {
    context,
    resume() {
      if (context.state === "suspended") context.resume();
    },
    setScene(scene) {
      this.resume();
      if (ambient) {
        stopTracked(ambient);
        ambient = null;
      }
      if (scene === 1) ambient = loopNoise(0.032, 2600);
      if (scene === 2 || scene === 5) ambient = loopNoise(0.012, 700);
      if (scene === 6 || scene === 7) ambient = loopNoise(0.02, 360);
    },
    beat(beat) {
      this.resume();
      const scene = beat.scene;
      if (scene === 1 && beat.text.includes("wait")) {
        noise(0.9, 0.09, 2800, "highpass");
        tone(440, 0.18, "triangle", 0.055);
        tone(392, 0.22, "triangle", 0.045, master, context.currentTime + 0.11);
      } else if (scene === 1) {
        noise(1.1, 0.16, 180, "lowpass");
        tone(330, 0.55, "sine", 0.055);
        tone(247, 0.55, "sine", 0.04, master, context.currentTime + 0.12);
      } else if (scene === 2) {
        tone(523.25, 0.16, "sine", 0.035);
        tone(659.25, 0.18, "sine", 0.026, master, context.currentTime + 0.22);
      } else if (scene === 3) {
        tone(196, 0.62, "sine", 0.045);
        tone(392, 0.32, "triangle", 0.032, master, context.currentTime + 0.08);
      } else if (scene === 4) {
        [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
          tone(freq, 0.55, "sine", 0.035, master, context.currentTime + i * 0.08);
        });
      } else if (scene === 5) {
        [880, 740, 622, 523].forEach((freq, i) => {
          tone(freq, 0.42, "sine", 0.032, master, context.currentTime + i * 0.1);
        });
      } else if (scene === 6) {
        noise(0.45, 0.22, 130, "lowpass");
        tone(73, 1.0, "sawtooth", 0.035);
      } else if (scene === 7) {
        noise(0.55, 0.12, 280, "lowpass");
        tone(110, 0.9, "sawtooth", 0.048);
        tone(55, 1.1, "sine", 0.035);
      } else if (scene === 8) {
        [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
          tone(freq, 0.5, "triangle", 0.04, master, context.currentTime + i * 0.11);
        });
      } else if (scene === 9) {
        noise(0.75, 0.16, 1600, "highpass");
        tone(196, 0.34, "triangle", 0.04);
        tone(392, 0.42, "triangle", 0.05, master, context.currentTime + 0.1);
      }
    },
    stop() {
      if (ambient) {
        stopTracked(ambient);
        ambient = null;
      }
      active.forEach(node => stopTracked(node));
    }
  };
}

function ensureCutsceneAudio() {
  if (!cutsceneAudio) cutsceneAudio = createCutsceneAudio();
  cutsceneAudio?.resume();
  return cutsceneAudio;
}

function playCutsceneAudioForBeat(beat) {
  const audio = ensureCutsceneAudio();
  if (!audio) return;
  if (beat.scene !== currentAudioScene) {
    currentAudioScene = beat.scene;
    audio.setScene(beat.scene);
  }
  audio.beat(beat);
}

function stopCutsceneAudio() {
  cutsceneAudio?.stop();
  currentAudioScene = 0;
}

const player = {
  x: 0,
  y: 0,
  w: 38,
  h: 42,
  vx: 0,
  vy: 0,
  face: 1,
  grounded: false,
  coyote: 0,
  jumpBuffer: 0,
  jumpsUsed: 0,
  maxJumps: 2,
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
    id: "entrance",
    name: "Entrance Hall Tutorial",
    theme: "kitchen",
    width: 3800,
    height: 1080,
    start: [110, 770],
    exit: [3600, 730],
    prompt: "Learn the split yarn controls: E/Right Mouse grapples hooks, Space/Left Mouse shoots yarn attacks.",
    tutorials: [
      { x: 180, text: "Press A/D to move." },
      { x: 660, text: "Press W to jump." },
      { x: 1260, text: "See the glowing yarn point? Stand near it. Press E or Right Mouse Button to shoot your yarn and grapple across!" },
      { x: 2050, text: "Press Left Mouse Button or Space to shoot yarn at objects." }
    ],
    platforms: [
      [0, 920, 900, 160], [1160, 920, 420, 160], [1840, 920, 420, 160], [2520, 920, 420, 160], [3200, 920, 600, 160],
      [430, 790, 260, 34], [1320, 720, 260, 34], [2020, 720, 260, 34], [2700, 720, 260, 34]
    ],
    stars: [[520, 742], [1400, 672], [2760, 672]],
    yarn: [[250, 870], [880, 870], [1200, 870], [1740, 870], [2380, 870], [3060, 870]],
    fishCrates: [[2120, 674]],
    enemies: [],
    webPoints: [[1060, 650], [1700, 640], [2380, 650], [3060, 650]]
  },
  {
    id: "kitchen",
    name: "Kitchen of Whiskers",
    theme: "kitchen",
    width: 4100,
    height: 1120,
    start: [100, 820],
    exit: [3900, 760],
    prompt: "Boss room: dodge Whiskers under the chandelier, drop it with a yarn attack, then hit him 3 times.",
    platforms: [
      [0, 980, 720, 140], [1020, 980, 460, 140], [1780, 940, 460, 180], [2520, 900, 500, 220], [3320, 940, 780, 180],
      [760, 770, 260, 34], [1500, 690, 260, 34], [2260, 610, 260, 34], [3040, 710, 260, 34]
    ],
    stars: [[780, 724], [2260, 564], [3420, 894]],
    yarn: [[260, 930], [960, 720], [1620, 640], [2380, 560], [2700, 850], [2920, 850], [3060, 660], [3300, 890], [3500, 890], [3720, 890]],
    fishCrates: [[1380, 934], [3120, 664]],
    enemies: [[1120, 944, 100], [2680, 864, 110]],
    webPoints: [[900, 650], [1640, 570], [2380, 490], [3180, 610]],
    attackTargets: [[2300, 350, "chandelier"]],
    boss: { type: "whiskers", name: "Whiskers", x: 2800, y: 846, arena: [2280, 520, 850, 420], hp: 3 }
  },
  {
    id: "library",
    name: "Library Stacks",
    theme: "library",
    width: 4300,
    height: 1320,
    start: [100, 970],
    exit: [4100, 860],
    prompt: "Regular room: hooks cross the wide shelves; yarn attacks clear enemies and fish crates.",
    platforms: [
      [0, 1120, 660, 200], [980, 1120, 460, 200], [1760, 1040, 460, 280], [2520, 960, 460, 360], [3300, 1040, 460, 280], [3940, 1000, 360, 320],
      [520, 900, 250, 34], [1320, 760, 250, 34], [2100, 640, 250, 34], [2860, 740, 250, 34], [3560, 830, 250, 34]
    ],
    stars: [[540, 854], [2120, 594], [3580, 784]],
    yarn: [[280, 1070], [840, 1070], [1260, 710], [1900, 990], [2180, 590], [2740, 910], [3340, 990], [3980, 950]],
    fishCrates: [[1420, 714]],
    enemies: [[1860, 1004, 100], [3360, 1004, 110]],
    webPoints: [[820, 760], [1500, 620], [2240, 520], [3000, 620], [3720, 720]]
  },
  {
    id: "shadow-library",
    name: "Shadow Library",
    theme: "library",
    width: 4400,
    height: 1220,
    start: [100, 880],
    exit: [4200, 740],
    prompt: "Boss room: lure Shadow under each bookshelf, then hit the glowing shelf anchor with yarn attacks.",
    platforms: [
      [0, 1020, 680, 200], [980, 1020, 480, 200], [1760, 980, 520, 240], [2540, 980, 520, 240], [3340, 1020, 520, 200], [4020, 900, 380, 320],
      [620, 800, 260, 34], [1400, 700, 260, 34], [2180, 620, 260, 34], [2960, 700, 260, 34], [3660, 800, 260, 34]
    ],
    stars: [[640, 754], [2200, 574], [3680, 754]],
    yarn: [[260, 970], [900, 970], [1540, 650], [1900, 930], [2300, 590], [2700, 930], [3100, 650], [3400, 930], [3760, 750], [4120, 850]],
    fishCrates: [[1340, 974], [3720, 754]],
    enemies: [[1160, 984, 90]],
    webPoints: [[900, 700], [1700, 580], [3300, 580], [3980, 700]],
    shelves: [[1600, 760], [2400, 760], [3200, 760]],
    boss: { type: "shadow", name: "Shadow", x: 3380, y: 926, arena: [1280, 650, 2300, 370], hp: 3 }
  },
  {
    id: "dungeon",
    name: "Dungeon Drop",
    theme: "dungeon",
    width: 4300,
    height: 1760,
    start: [120, 310],
    exit: [4040, 1460],
    prompt: "Regular vertical room: every long drop has one required hook and a recovery ledge.",
    platforms: [
      [0, 460, 620, 120], [920, 560, 480, 90], [1700, 720, 480, 90], [2480, 900, 480, 90], [3260, 1140, 480, 90], [3860, 1520, 440, 240],
      [600, 760, 230, 32], [1360, 920, 230, 32], [2140, 1100, 230, 32], [2920, 1320, 230, 32], [3540, 1420, 230, 32]
    ],
    stars: [[300, 410], [2140, 1052], [3560, 1374]],
    yarn: [[220, 410], [740, 712], [1260, 872], [1960, 672], [2300, 1052], [3080, 1272], [3920, 1472]],
    fishCrates: [[1420, 874]],
    enemies: [[1760, 684, 90], [3300, 1104, 100]],
    webPoints: [[720, 390], [1500, 520], [2280, 700], [3060, 900], [3680, 1200]]
  },
  {
    id: "duchess-ballroom",
    name: "Duchess' Ballroom",
    theme: "ballroom",
    width: 4500,
    height: 1260,
    start: [100, 900],
    exit: [4300, 820],
    prompt: "Boss room: lure Duchess to the mirror, shatter it with a yarn attack, then hit her while stunned.",
    platforms: [
      [0, 1040, 680, 220], [1040, 1040, 480, 220], [1840, 980, 480, 280], [2640, 920, 520, 340], [3440, 980, 520, 280], [4100, 940, 400, 320],
      [640, 820, 260, 34], [1440, 700, 260, 34], [2240, 620, 260, 34], [3040, 700, 260, 34], [3740, 800, 260, 34]
    ],
    stars: [[660, 774], [2260, 574], [3760, 754]],
    yarn: [[260, 990], [900, 990], [1540, 650], [2340, 570], [2920, 870], [3140, 650], [3320, 870], [3520, 870], [3840, 750], [4200, 890]],
    fishCrates: [[1120, 994], [3820, 754]],
    enemies: [[1220, 1004, 90], [3500, 944, 100]],
    webPoints: [[900, 700], [1700, 580], [2500, 500], [3300, 580], [3980, 700]],
    mirror: [3560, 780],
    boss: { type: "duchess", name: "Duchess", x: 3260, y: 958, arena: [2880, 620, 900, 420], hp: 3 }
  },
  {
    id: "tower",
    name: "Crooked Tower",
    theme: "library",
    width: 4200,
    height: 1880,
    start: [120, 1420],
    exit: [3960, 360],
    prompt: "Regular ascent: tight hooks and attack shots prepare Kitty for the attic.",
    platforms: [
      [0, 1580, 620, 300], [900, 1460, 420, 90], [1640, 1320, 420, 90], [2380, 1160, 420, 90], [3120, 960, 420, 90], [3740, 760, 420, 90], [3880, 460, 320, 90],
      [520, 1280, 230, 32], [1260, 1120, 230, 32], [2000, 960, 230, 32], [2740, 780, 230, 32], [3380, 600, 230, 32]
    ],
    stars: [[540, 1234], [2020, 914], [3900, 414]],
    yarn: [[260, 1530], [760, 1232], [1360, 1072], [2100, 912], [2840, 732], [3480, 552], [4000, 414]],
    fishCrates: [[1320, 1074]],
    enemies: [[1700, 1284, 90], [3160, 924, 100]],
    webPoints: [[760, 1300], [1500, 1130], [2240, 970], [2980, 790], [3600, 610], [3980, 500]]
  },
  {
    id: "attic",
    name: "Nancy's Attic",
    theme: "attic",
    width: 4600,
    height: 1120,
    start: [110, 810],
    exit: [4380, 760],
    prompt: "Final boss: deflect orbs, find the real Nancy, charge all crystals, then grapple the chandelier hook.",
    platforms: [
      [0, 960, 760, 160], [1080, 960, 520, 160], [1880, 960, 520, 160], [2680, 960, 520, 160], [3480, 960, 520, 160], [4200, 960, 400, 160],
      [660, 760, 260, 34], [1480, 640, 260, 34], [2300, 560, 280, 34], [3120, 640, 260, 34], [3840, 760, 260, 34]
    ],
    stars: [[680, 714], [2320, 514], [3860, 714]],
    yarn: [[260, 910], [980, 910], [1580, 594], [2100, 910], [2260, 760], [2400, 514], [2440, 910], [2620, 760], [2800, 910], [3000, 760], [3220, 594], [3260, 910], [3480, 760], [3700, 910], [3940, 714], [4300, 910]],
    fishCrates: [[1540, 594], [3540, 914]],
    enemies: [[1160, 924, 90], [3560, 924, 100]],
    webPoints: [[940, 650], [1760, 520], [2520, 220, "chandelierSwing"], [3400, 520], [4100, 650]],
    attackTargets: [[2520, 280, "atticChandelier"]],
    crystals: [[2160, 500], [3420, 500], [2160, 840], [3420, 840]],
    boss: { type: "nancy", name: "Nancy", x: 3000, y: 820, arena: [2080, 360, 1500, 600], hp: 5 }
  }
];

const TOTAL_FISH = LEVELS.reduce((sum, l) => sum + l.fishCrates.length, 0);
let objects = {};
unlockedLevels = readUnlockedLevels();
fishFound = readFishFound();

function readUnlockedLevels() {
  const saved = Number(localStorage.getItem("kittyWhiscapeUnlocked") || "1");
  return Math.max(1, Math.min(LEVELS?.length || 8, Number.isFinite(saved) ? saved : 1));
}

function saveUnlockedLevels(count) {
  unlockedLevels = Math.max(unlockedLevels, Math.min(LEVELS.length, count));
  localStorage.setItem("kittyWhiscapeUnlocked", String(unlockedLevels));
}

function hasWatchedIntro() {
  return localStorage.getItem(INTRO_WATCHED_KEY) === "true";
}

function markIntroWatched() {
  localStorage.setItem(INTRO_WATCHED_KEY, "true");
}

function readFishFound() {
  try {
    const parsed = JSON.parse(localStorage.getItem("kittyWhiscapeFish") || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveFishFound() {
  localStorage.setItem("kittyWhiscapeFish", JSON.stringify([...fishFound]));
}

function hidePanels() {
  menu.hidden = true;
  levelSelect.hidden = true;
  pauseMenu.hidden = true;
  victoryPanel.hidden = true;
  levelEditor.hidden = true;
}

function showMainMenu() {
  running = false;
  paused = false;
  toast.classList.remove("show");
  toast.textContent = "";
  levelSelect.hidden = true;
  pauseMenu.hidden = true;
  victoryPanel.hidden = true;
  levelEditor.hidden = true;
  updateMenuLocks();
  menu.hidden = false;
  menu.classList.remove("menu-leaving");
  menu.classList.add("menu-entering");
  window.setTimeout(() => menu.classList.remove("menu-entering"), 5600);
}

function triggerUnlockVisual(levelNumber) {
  if (levelNumber <= lastUnlockLevel) return;
  lastUnlockLevel = levelNumber;
  const button = document.querySelector(`.level-hotspot[data-level="${levelNumber}"]`);
  if (button) {
    button.classList.remove("unlocking");
    void button.offsetWidth;
    button.classList.add("unlocking");
  }
  if (unlockBurst) {
    unlockBurst.classList.remove("active");
    void unlockBurst.offsetWidth;
    unlockBurst.classList.add("active");
    window.setTimeout(() => unlockBurst.classList.remove("active"), 920);
  }
}

function updateMenuLocks() {
  document.querySelectorAll(".level-hotspot").forEach(button => {
    const levelNumber = Number(button.dataset.level);
    const unlocked = levelNumber < unlockedLevels;
    button.classList.toggle("locked", !unlocked);
    button.classList.toggle("unlocked", unlocked);
    button.classList.toggle("selected", levelNumber === selectedLevel);
    button.setAttribute("aria-disabled", String(!unlocked));
  });

  document.querySelectorAll("[data-locked='true']").forEach(button => {
    const mode = button.dataset.mode;
    const unlocked = mode === "speedrun" ? speedrunModeUnlocked : classicStoryCompleted;
    button.classList.toggle("locked", !unlocked);
    button.setAttribute("aria-disabled", String(!unlocked));
  });

  document.querySelectorAll(".version-hotspot").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });

  updateMenuKittyPosition();
}

function typeStoryScene(reset = false) {
  const beat = STORY_BEATS[storyIndex];
  const text = beat.text;
  if (reset) {
    storyTypingIndex = 0;
    storyText.textContent = "";
    storyStage.classList.remove("scene-1", "scene-2", "scene-3", "scene-4", "scene-5", "scene-6", "scene-7", "scene-8", "scene-9");
    storyStage.classList.add(`scene-${beat.scene}`);
    storyIntro.dataset.speaker = beat.speaker;
    storyNext.textContent = storyIndex === STORY_BEATS.length - 1 ? "Start Level 1" : "Next";
    playCutsceneAudioForBeat(beat);
  }
  if (storyTypingIndex < text.length) {
    storyTypingIndex += 1;
    storyText.textContent = text.slice(0, storyTypingIndex);
  } else {
    storyText.textContent = text;
  }
}

function advanceStory() {
  const text = STORY_BEATS[storyIndex].text;
  if (storyTypingIndex < text.length) {
    storyTypingIndex = text.length;
    storyText.textContent = text;
    return;
  }
  if (storyIndex < STORY_BEATS.length - 1) {
    storyIndex += 1;
    typeStoryScene(true);
    return;
  }
  storyActive = false;
  stopCutsceneAudio();
  storyIntro.classList.add("leaving");
  clearInterval(storyTimer);
  window.setTimeout(() => {
    storyIntro.classList.remove("active");
    storyIntro.classList.remove("leaving");
    storyIntro.hidden = true;
    const levelToStart = pendingIntroLevel ?? 0;
    pendingIntroLevel = null;
    startLevelWithFade(levelToStart, true);
  }, 680);
}

function playIntroBeforeLevel(index) {
  markIntroWatched();
  pendingIntroLevel = index;
  storyIndex = 0;
  storyActive = true;
  currentAudioScene = 0;
  ensureCutsceneAudio();
  hidePanels();
  storyIntro.hidden = false;
  storyIntro.classList.add("active");
  storyIntro.classList.remove("leaving");
  typeStoryScene(true);
  clearInterval(storyTimer);
  storyTimer = window.setInterval(() => {
    if (!storyActive) return;
    typeStoryScene();
  }, 34);
}

function finishStoryIntro() {
  storyActive = false;
  stopCutsceneAudio();
  storyIntro.classList.add("leaving");
  clearInterval(storyTimer);
  window.setTimeout(() => {
    storyIntro.classList.remove("active");
    storyIntro.classList.remove("leaving");
    storyIntro.hidden = true;
    const levelToStart = pendingIntroLevel ?? 0;
    pendingIntroLevel = null;
    startLevelWithFade(levelToStart, true);
  }, 680);
}

function showLevelSelect() {
  running = false;
  paused = false;
  player.grapple = null;
  menu.hidden = true;
  pauseMenu.hidden = true;
  victoryPanel.hidden = true;
  levelEditor.hidden = true;
  renderLevelSelect();
  levelSelect.hidden = false;
  levelSelect.classList.remove("leaving");
}

function renderLevelSelect() {
  levelMap.innerHTML = "";
  LEVELS.forEach((room, index) => {
    const button = document.createElement("button");
    const unlocked = index < unlockedLevels;
    const justUnlocked = unlocked && index === unlockedLevels - 1 && index > 0;
    const bossBadge = room.boss ? " <em>☠ Boss</em>" : "";
    button.type = "button";
    button.className = `room-button ${unlocked ? "unlocked" : "locked"}${justUnlocked ? " just-unlocked" : ""}`;
    button.disabled = !unlocked;
    button.innerHTML = `<strong>${index + 1}. ${room.name}${bossBadge}</strong><span>${unlocked ? room.prompt : "Locked"}</span>`;
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

function pulseMenuButton(button) {
  if (!button) return;
  button.classList.remove("clicking");
  void button.offsetWidth;
  button.classList.add("clicking");
}

function startLevelWithFade(index, skipIntro = false) {
  if (index >= unlockedLevels) {
    showLockedFeedback(document.querySelector(`.level-hotspot[data-level="${index}"]`));
    return;
  }
  selectedLevel = index;
  updateMenuLocks();
  if (index === 0 && !skipIntro && !hasWatchedIntro()) {
    playIntroBeforeLevel(index);
    return;
  }
  playMenuSound("start");
  const button = document.querySelector(`.level-hotspot[data-level="${index}"]`);
  pulseMenuButton(button);
  menu.classList.add("menu-leaving");
  transitionFade.classList.add("active");
  window.setTimeout(() => {
    startLevel(index);
    menu.classList.remove("menu-leaving");
    transitionFade.classList.remove("active");
  }, 480);
}

function quitToLevelSelect() {
  fishFound = new Set(levelStartFishFound);
  saveFishFound();
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
    shelves: (level.shelves || []).map(([x, y]) => ({ x, y, startY: y, w: 120, h: 190, falling: false, vy: 0, spent: false })),
    crystals: (level.crystals || []).map(([x, y]) => ({ x, y, r: 24, charged: true, activated: false })),
    attackTargets: (level.attackTargets || []).map(([x, y, kind]) => ({ x, y, kind, r: 28, used: false })),
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
  player.jumpsUsed = 0;
  player.hearts = 3;
  player.yarn = 1;
  player.stars = 0;
  player.fish = 0;
  player.grapple = null;
  player.invuln = 0;
  gameWon = false;
  camera.x = 0;
  camera.y = 0;
  say(`${level.name}: ${level.prompt}`, 4.5);
}

function makeBoss(data) {
  if (!data) return null;
  const boss = {
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
    orbTimer: 1.2,
    maxHp: data.hp,
    phaseHp: data.hp,
    teleportTimer: 2.2,
    swingCooldown: 0,
    chandelierDropped: false,
    images: []
  };
  if (boss.type === "nancy") {
    boss.phaseHp = 5;
    boss.maxHp = 5;
    boss.phase2Hp = 4;
    boss.phase3Hp = 3;
    boss.hp = 5;
    boss.baseX = data.x;
    boss.beamTimer = 5;
    boss.beamReady = false;
    boss.crystalsActivated = 0;
    boss.images = [];
  }
  return boss;
}

function say(text, seconds = 2.5) {
  message = text;
  messageTimer = seconds;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(say.hideTimer);
  say.hideTimer = setTimeout(() => toast.classList.remove("show"), seconds * 1000);
}

function showLockedFeedback(button) {
  playMenuSound("locked");
  if (button) {
    button.classList.remove("bump");
    void button.offsetWidth;
    button.classList.add("bump");
  }
  say("This door is locked.", 1.5);
}

function playMenuSound(name) {
  // Sound placeholder: connect real click, locked, and unlock sounds here later.
  void name;
}

function initProceduralMenuVisuals() {
  const menuArt = document.querySelector(".procedural-menu .menu-camera-rig");
  const particleLayer = document.getElementById("menuParticleLayer");
  const hoverLayer = document.getElementById("menuHoverParticles");
  const pawTrail = document.getElementById("menuKittyPawTrail");
  const menuKitty = document.getElementById("menuKitty");
  if (!menuArt || !menu) return;

  const parallaxLayers = [
    { node: document.querySelector(".procedural-menu .menu-stars-layer"), depth: 0.12 },
    { node: document.querySelector(".procedural-menu .menu-moon"), depth: 0.08 },
    { node: document.querySelector(".procedural-menu .menu-clouds"), depth: 0.22 },
    { node: document.querySelector(".procedural-menu .menu-ray-beams"), depth: 0.14 },
    { node: document.querySelector(".procedural-menu .menu-mansion-scene"), depth: 0.1 },
    { node: document.querySelector(".procedural-menu .parallax-back"), depth: 0.16 },
    { node: document.querySelector(".procedural-menu .menu-hill.parallax-mid"), depth: 0.28 },
    { node: document.querySelector(".procedural-menu .menu-hill.parallax-front"), depth: 0.38 },
    { node: document.querySelectorAll(".procedural-menu .menu-fog"), depth: 0.42 },
    { node: document.querySelector(".procedural-menu .menu-fireflies"), depth: 0.32 },
    { node: document.querySelector(".procedural-menu .menu-float-particles"), depth: 0.26 },
    { node: document.querySelector(".procedural-menu .menu-depth-glow"), depth: 0.18 }
  ].flatMap(entry => {
    if (!entry.node) return [];
    if (typeof entry.node.length === "number") {
      return Array.from(entry.node).map(node => ({ node, depth: entry.depth }));
    }
    return [entry];
  });

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let pawTimer = null;

  function animateCamera() {
    if (menu.hidden) {
      requestAnimationFrame(animateCamera);
      return;
    }
    currentX += (targetX - currentX) * 0.055;
    currentY += (targetY - currentY) * 0.055;
    menuArt.style.setProperty("--cam-x", `${currentX.toFixed(2)}px`);
    menuArt.style.setProperty("--cam-y", `${currentY.toFixed(2)}px`);
    parallaxLayers.forEach(({ node, depth }) => {
      node.style.transform = `translate3d(${(currentX * depth).toFixed(2)}px, ${(currentY * depth).toFixed(2)}px, 0)`;
    });
    requestAnimationFrame(animateCamera);
  }

  window.addEventListener("mousemove", event => {
    if (menu.hidden) return;
    const rect = menuArt.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    targetX = nx * -14;
    targetY = ny * -10;
  });

  function spawnMenuParticles(clientX, clientY, count = 14, layer = particleLayer, spread = 36) {
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    const originX = clientX - rect.left;
    const originY = clientY - rect.top;
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement("i");
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 14 + Math.random() * spread;
      spark.style.left = `${originX}px`;
      spark.style.top = `${originY}px`;
      spark.style.setProperty("--px", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--py", `${Math.sin(angle) * distance - 10}px`);
      if (layer === hoverLayer) spark.className = "hover-spark";
      layer.appendChild(spark);
      window.setTimeout(() => spark.remove(), layer === hoverLayer ? 900 : 760);
    }
  }

  function spawnKittyPawPrint() {
    if (!pawTrail || !menuKitty || menu.hidden) return;
    const pathRect = pawTrail.getBoundingClientRect();
    const kittyRect = menuKitty.getBoundingClientRect();
    if (!pathRect.width || !kittyRect.width) return;
    const print = document.createElement("i");
    print.style.left = `${kittyRect.left - pathRect.left + kittyRect.width * 0.38 + (Math.random() * 10 - 5)}px`;
    print.style.top = `${kittyRect.bottom - pathRect.top - 8}px`;
    print.style.setProperty("--paw-rot", `${-16 + Math.random() * 32}deg`);
    pawTrail.appendChild(print);
    window.setTimeout(() => print.remove(), 2600);
  }

  function startPawTrail() {
    if (pawTimer) return;
    pawTimer = window.setInterval(() => {
      if (menu.hidden) return;
      spawnKittyPawPrint();
    }, 620);
  }

  function stopPawTrail() {
    if (!pawTimer) return;
    window.clearInterval(pawTimer);
    pawTimer = null;
  }

  const hoverThrottle = new Map();
  document.querySelectorAll(".procedural-menu .menu-hotspot").forEach(button => {
    button.addEventListener("click", event => {
      spawnMenuParticles(event.clientX, event.clientY, 16, particleLayer, 42);
    });
    button.addEventListener("mouseenter", event => {
      const now = performance.now();
      const last = hoverThrottle.get(button) || 0;
      if (now - last < 420) return;
      hoverThrottle.set(button, now);
      spawnMenuParticles(event.clientX, event.clientY, 6, hoverLayer, 18);
    });
  });

  if (playButton) {
    playButton.addEventListener("mouseenter", () => menu.classList.add("menu-portal-open"));
    playButton.addEventListener("focus", () => menu.classList.add("menu-portal-open"));
    playButton.addEventListener("mouseleave", () => menu.classList.remove("menu-portal-open"));
    playButton.addEventListener("blur", () => menu.classList.remove("menu-portal-open"));
  }

  const menuObserver = new MutationObserver(() => {
    if (menu.hidden) stopPawTrail();
    else startPawTrail();
  });
  menuObserver.observe(menu, { attributes: true, attributeFilter: ["hidden"] });

  startPawTrail();
  requestAnimationFrame(animateCamera);
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
  const canAirJump = !canGroundJump && player.jumpsUsed < player.maxJumps;
  if (player.jumpBuffer > 0 && (canGroundJump || canAirJump)) {
    player.vy = canGroundJump ? -14.4 : -14.0;
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
    player.coyote = 0.18;
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
        objects.boss.hp -= 1;
        shelf.spent = true;
        shelf.falling = false;
        puff(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2, "#c084fc", 24);
        if (objects.boss.hp <= 0) {
          defeatBoss("All three bookshelves crushed Shadow! Boss Defeated! Exit unlocked.");
        } else {
          say(`Bookshelf slam! Shadow HP: ${objects.boss.hp}/3`);
        }
      }
      if (shelf.y > level.height) {
        shelf.y = shelf.startY;
        shelf.vy = 0;
        shelf.falling = false;
        say("The bookshelf missed. Try luring Shadow underneath again.");
      }
    }
  }
  for (const p of objects.projectiles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if ((p.kind === "orb" || p.kind === "reflected") && rectsOverlap(player, { x: p.x - 12, y: p.y - 12, w: 24, h: 24 })) {
      p.life = 0;
      hurtPlayer(p.kind === "orb" ? "Nancy's orb burned a heart." : "Duchess reflected the yarn!");
    }
    if (p.kind === "yarnAttack") resolveYarnAttackHit(p);
  }
  objects.projectiles = objects.projectiles.filter(p => p.life > 0);
}

function resolveYarnAttackHit(p) {
  const hitBox = { x: p.x - 10, y: p.y - 10, w: 20, h: 20 };
  const boss = objects.boss;
  if (boss?.type === "nancy" && boss.phase === 1) {
    const orb = objects.projectiles.find(o => o.kind === "orb" && distance(p.x, p.y, o.x, o.y) < 34);
    if (orb) {
      orb.life = 0;
      p.life = 0;
      damageNancyPhase1();
      return;
    }
  }
  if (boss?.type === "nancy" && boss.phase === 2) {
    const image = boss.images.find(img => distance(p.x, p.y, img.x + boss.w / 2, img.y + boss.h / 2) < 42);
    if (image) {
      p.life = 0;
      puff(image.x + boss.w / 2, image.y + boss.h / 2, "#a78bfa", 18);
      say("That was only a mirror image. The real Nancy glows gold.");
      return;
    }
  }
  for (const enemy of objects.enemies) {
    if (enemy.alive && rectsOverlap(hitBox, enemy)) {
      enemy.alive = false;
      p.life = 0;
      puff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ff8dbd", 18);
      say("Enemy tangled!");
      return;
    }
  }
  for (const crate of objects.crates) {
    if (!crate.broken && rectsOverlap(hitBox, crate)) {
      breakCrate(crate);
      p.life = 0;
      return;
    }
  }
  for (let i = 0; i < objects.shelves.length; i++) {
    const shelf = objects.shelves[i];
    const trigger = { x: shelf.x + shelf.w / 2 - 40, y: shelf.y - 90, w: 80, h: 100 };
    if (!shelf.spent && !shelf.falling && rectsOverlap(hitBox, trigger)) {
      dropShelf(shelf);
      p.life = 0;
      return;
    }
  }
  if (objects.mirror && !objects.mirror.broken && rectsOverlap(hitBox, objects.mirror)) {
    smashMirror();
    p.life = 0;
    return;
  }
  for (const crystal of objects.crystals) {
    if (crystal.charged && distance(p.x, p.y, crystal.x, crystal.y) < 42) {
      reflectNancyOrb(crystal);
      p.life = 0;
      return;
    }
  }
  for (const target of objects.attackTargets) {
    if (!target.used && distance(p.x, p.y, target.x, target.y) < target.r + 10) {
      if (target.kind === "chandelier") {
        dropWhiskersChandelier(target);
      }
      p.life = 0;
      return;
    }
  }
  if (boss && !boss.defeated && rectsOverlap(hitBox, boss)) {
    if (boss.type === "duchess") {
      hitDuchess();
    } else if (boss.type === "shadow") {
      say("Shadow only falls to dropped shelves.");
    } else if (boss.type === "whiskers") {
      hitWhiskers();
    } else if (boss.type === "nancy") {
      hitNancyDirect();
    } else {
      damageBoss(1, "Yarn attack hit!");
    }
    p.life = 0;
  }
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
  if (boss.stunned > 0) return;
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
  boss.teleportTimer -= dt;
  if (boss.teleportTimer <= 0) {
    boss.x = left + Math.random() * (right - left);
    boss.vx = Math.random() > 0.5 ? 2.4 : -2.4;
    boss.teleportTimer = 4.2 + Math.random() * 1.4;
    puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#c084fc", 22);
    say("Shadow slipped through the shelves. Watch the glowing eyes.");
  }
}

function updateDuchess(boss, dt) {
  if (boss.stunned > 0) return;
  if (objects.mirror?.broken && boss.hp > 0) {
    objects.mirror.broken = false;
    say("Duchess recovered. Lure her back to the mirror.");
  }
  const dir = player.x < boss.x ? -1 : 1;
  boss.vx += dir * 0.12;
  boss.vx = Math.max(-3.4, Math.min(3.4, boss.vx));
  boss.x += boss.vx;
  boss.vx *= 0.94;
  if (boss.x < boss.arena[0]) boss.x = boss.arena[0];
  if (boss.x > boss.arena[0] + boss.arena[2] - boss.w) boss.x = boss.arena[0] + boss.arena[2] - boss.w;
}

function updateNancy(boss, dt) {
  boss.swingCooldown = Math.max(0, boss.swingCooldown - dt);
  if (boss.phase === 1) {
    boss.x = boss.baseX + Math.sin(performance.now() / 650) * 150;
    boss.orbTimer -= dt;
    if (boss.orbTimer <= 0) {
      const cx = boss.x + boss.w / 2;
      const cy = boss.y + 10;
      for (const offset of [-0.35, 0, 0.35]) {
        const dx = player.x - cx;
        const dy = player.y - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const base = Math.atan2(dy, dx) + offset;
        objects.projectiles.push({ kind: "orb", x: cx, y: cy, vx: Math.cos(base) * 4.5, vy: Math.sin(base) * 4.5, life: 4 });
      }
      boss.orbTimer = 1.25;
      say("Hit the purple orbs with yarn attacks to deflect them!");
    }
  }
  if (boss.phase === 2) {
    boss.teleportTimer -= dt;
    if (boss.teleportTimer <= 0 || boss.images.length === 0) {
      const left = boss.arena[0] + 120;
      const right = boss.arena[0] + boss.arena[2] - 180;
      boss.x = left + Math.random() * (right - left);
      boss.images = [
        { x: left + Math.random() * (right - left), y: boss.y },
        { x: left + Math.random() * (right - left), y: boss.y }
      ];
      boss.teleportTimer = 1.7;
      puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#facc15", 18);
    }
  }
  if (boss.phase === 3) {
    boss.x = boss.arena[0] + boss.arena[2] / 2 - boss.w / 2 + Math.sin(performance.now() / 900) * 100;
    if (boss.stunned <= 0) {
      boss.beamTimer -= dt;
      if (boss.beamTimer <= 0) {
        boss.beamTimer = 5;
        shake = 16;
        hurtPlayer("Nancy's charged beam struck Kitty!");
        say("Charge all 4 crystals with yarn attacks before the beam fires.");
      }
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
  if (boss.hp <= 0) defeatBoss(`${boss.name} defeated! Boss Defeated! Exit unlocked.`);
}

function defeatBoss(text) {
  const boss = objects.boss;
  if (!boss || boss.defeated) return;
  boss.defeated = true;
  boss.hp = 0;
  boss.stunned = 0;
  objects.projectiles.length = 0;
  puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#fff2a8", 60);
  say(text || "Boss Defeated! Exit unlocked.", 4);
}

function hitWhiskers() {
  const boss = objects.boss;
  if (!boss?.chandelierDropped || boss.stunned <= 0) {
    say("Whiskers blocks yarn. Drop the chandelier while he charges underneath.");
    return;
  }
  damageBoss(1, "Yarn hit stunned Whiskers!");
}

function reflectYarnAtPlayer(source) {
  const cx = source.x + source.w / 2;
  const cy = source.y + source.h / 2;
  const dx = player.x + player.w / 2 - cx;
  const dy = player.y + player.h / 2 - cy;
  const d = Math.max(1, Math.hypot(dx, dy));
  objects.projectiles.push({ kind: "reflected", x: cx, y: cy, vx: dx / d * 6, vy: dy / d * 6, life: 2.8 });
}

function damageNancyPhase1() {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy" || boss.phase !== 1) return;
  boss.hp -= 1;
  boss.phaseHp = boss.hp;
  puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#a78bfa", 26);
  if (boss.hp <= 0) {
    boss.phase = 2;
    boss.hp = 4;
    boss.maxHp = 4;
    boss.phaseHp = 4;
    boss.teleportTimer = 0;
    objects.projectiles.length = 0;
    say("Nancy Phase 2: hit the real Nancy. She has a golden aura!", 4);
  } else {
    say(`Orb deflected! Nancy Phase 1 HP: ${boss.hp}/5`);
  }
}

function hitNancyDirect() {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy") return;
  if (boss.phase === 2) {
    boss.hp -= 1;
    boss.phaseHp = boss.hp;
    puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#facc15", 24);
    if (boss.hp <= 0) {
      boss.phase = 3;
      boss.hp = 3;
      boss.maxHp = 3;
      boss.phaseHp = 3;
      boss.stunned = 0;
      boss.images = [];
      boss.beamTimer = 5;
      boss.crystalsActivated = 0;
      for (const crystal of objects.crystals) {
        crystal.activated = false;
        crystal.charged = true;
      }
      say("Nancy Phase 3: charge all 4 crystals, then grapple the chandelier hook!", 5);
    } else {
      say(`Real Nancy hit! Phase 2 HP: ${boss.hp}/4`);
    }
    return;
  }
  say("Direct yarn will not work in this phase. Follow the glowing cues.");
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
    say("Move closer to a metal hook, then press E or Right Mouse to grapple.");
    return;
  }
  player.yarn -= 1;
  if (target.type === "web") {
    player.grapple = { point: target.obj, time: 2.2 };
    puff(target.obj.x, target.obj.y, "#ff9ecb", 14);
    if (target.obj.kind === "chandelierSwing") swingNancyChandelier(target.obj);
  }
}

function shootYarnAttack() {
  if (!running || paused || gameWon) return;
  if (player.yarn <= 0) {
    say("No yarn ammo. Collect yarn balls before attacking.");
    return;
  }
  player.yarn -= 1;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const dx = mouse.worldX - cx;
  const dy = mouse.worldY - cy;
  const d = Math.max(1, Math.hypot(dx, dy));
  objects.projectiles.push({
    kind: "yarnAttack",
    x: cx,
    y: cy,
    vx: dx / d * 12,
    vy: dy / d * 12,
    life: 1.25
  });
  say("Yarn attack fired.");
}

function nearestInteractive(px, py) {
  const choices = [];
  for (const point of objects.webPoints) {
    choices.push({ type: "web", obj: point, d: distance(px, py, point.x, point.y), limit: 370 });
  }
  choices.sort((a, b) => a.d - b.d);
  return choices.find(c => c.d <= c.limit) || null;
}

function breakCrate(crate) {
  crate.broken = true;
  if (!fishFound.has(crate.id)) {
    fishFound.add(crate.id);
    player.fish += 1;
    saveFishFound();
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
  boss.stunned = 4;
  puff(mirror.x + 40, mirror.y + 70, "#bae6fd", 34);
  say("Mirror smashed! Duchess is stunned for 4 seconds. Hit her 3 times!");
}

function hitDuchess() {
  if (objects.boss?.type === "duchess" && objects.boss.stunned > 0) {
    damageBoss(1, "Yarn hit!");
  } else if (objects.boss?.type === "duchess") {
    reflectYarnAtPlayer(objects.boss);
    say("Duchess reflected that yarn. Stun her with the mirror first.");
  }
}

function reflectNancyOrb(crystal) {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy" || boss.phase !== 3) {
    say("The crystals are for Nancy's final beam phase.");
    return;
  }
  if (crystal.activated) {
    say("That crystal is already charged.");
    return;
  }
  crystal.activated = true;
  crystal.charged = false;
  boss.crystalsActivated += 1;
  puff(crystal.x, crystal.y, "#67e8f9", 22);
  if (boss.crystalsActivated >= 4) {
    boss.stunned = 6;
    boss.beamTimer = 6;
    say("All crystals charged! Grapple the chandelier hook to swing it into Nancy!", 5);
  } else {
    say(`Crystal charged: ${boss.crystalsActivated}/4`);
  }
}

function dropWhiskersChandelier(point) {
  const boss = objects.boss;
  if (!boss || boss.type !== "whiskers" || boss.defeated) return;
  if (point.used) {
    say("The chandelier has already fallen. Hit stunned Whiskers!");
    return;
  }
  if (Math.abs((boss.x + boss.w / 2) - point.x) < 190) {
    point.used = true;
    boss.chandelierDropped = true;
    boss.stunned = 5;
    shake = 18;
    puff(point.x, point.y + 120, "#fef3c7", 40);
    say("Chandelier dropped! Whiskers is stunned. Hit him 3 times!");
  } else {
    say("Drop the chandelier while Whiskers charges underneath it.");
  }
}

function swingNancyChandelier(point) {
  const boss = objects.boss;
  if (!boss || boss.type !== "nancy" || boss.phase !== 3) {
    say("Save the chandelier hook for Nancy's final phase.");
    return;
  }
  if (boss.stunned <= 0) {
    say("Charge all 4 crystals first to stun Nancy.");
    return;
  }
  if (boss.swingCooldown > 0) {
    return;
  }
  if (distance(point.x, point.y, boss.x + boss.w / 2, boss.y) < 520) {
    boss.swingCooldown = 1.1;
    boss.hp -= 1;
    boss.phaseHp = boss.hp;
    shake = 18;
    puff(boss.x + boss.w / 2, boss.y + boss.h / 2, "#fef3c7", 34);
    if (boss.hp <= 0) {
      defeatBoss("Nancy defeated! Total Hidden Fish Found shown below.");
      winGame();
    } else {
      say(`Chandelier swing connected! Nancy Phase 3 HP: ${boss.hp}/3`);
    }
  } else {
    say("Get Nancy closer before swinging the chandelier.");
  }
}

function nextLevel() {
  if (levelIndex < LEVELS.length - 1) {
    saveUnlockedLevels(levelIndex + 2);
    triggerUnlockVisual(levelIndex + 1);
    updateMenuLocks();
    say(`${LEVELS[levelIndex + 1].name} unlocked!`);
    showLevelSelect();
  } else {
    winGame();
  }
}

function winGame() {
  gameWon = true;
  running = false;
  paused = false;
  classicStoryCompleted = true;
  speedrunModeUnlocked = true;
  updateMenuLocks();
  saveUnlockedLevels(LEVELS.length);
  saveFishFound();
  menu.hidden = true;
  levelSelect.hidden = true;
  pauseMenu.hidden = true;
  levelEditor.hidden = true;
  victorySummary.textContent = `Total Hidden Fish Found: ${fishFound.size} / ${TOTAL_FISH}`;
  victoryPanel.hidden = false;
  say(`Nancy defeated. Total Hidden Fish Found: ${fishFound.size}/${TOTAL_FISH}.`, 9);
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
    kitchen: ["#27202d", "#4b2534", "#704436", "#1a1218"],
    library: ["#141926", "#243249", "#593a49", "#0d1118"],
    ballroom: ["#21152a", "#633457", "#9b5f63", "#180f1a"],
    dungeon: ["#10151d", "#172a2f", "#33413d", "#0a0e12"],
    attic: ["#171423", "#3e2d3c", "#675247", "#100d14"]
  };
  const p = palettes[level?.theme || "kitchen"];
  const t = visualTime;
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, p[0]);
  grd.addColorStop(0.58, p[1]);
  grd.addColorStop(1, p[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Parallax distant hills
  ctx.fillStyle = p[3];
  for (let layer = 0; layer < 2; layer++) {
    const parallax = 0.08 + layer * 0.06;
    const baseY = 180 + layer * 80;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W + 100; x += 80) {
      const wx = x + (camera.x * parallax);
      const h = Math.sin((wx + layer * 200) * 0.008 + t * 0.3) * 40 + baseY;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.globalAlpha = 0.35 - layer * 0.1;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Drifting clouds
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 340 - camera.x * 0.15 + t * 18 * (i % 2 === 0 ? 1 : -1)) % (VIEW_W + 300)) - 80;
    const cy = 50 + i * 45 + Math.sin(t * 0.4 + i) * 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 + i * 12, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 40, cy + 6, 50, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Light rays
  ctx.save();
  ctx.globalAlpha = 0.04 + Math.sin(t * 0.5) * 0.015;
  for (let i = 0; i < 3; i++) {
    const rx = 200 + i * 280 - camera.x * 0.05;
    const rayGrd = ctx.createLinearGradient(rx, 0, rx + 120, VIEW_H);
    rayGrd.addColorStop(0, "rgba(255,230,160,0.5)");
    rayGrd.addColorStop(1, "transparent");
    ctx.fillStyle = rayGrd;
    ctx.fillRect(rx, 0, 80, VIEW_H);
  }
  ctx.restore();

  // Glowing windows
  const windowSpacing = 420;
  for (let wx = windowSpacing; wx < level.width; wx += windowSpacing) {
    const sx = wx - camera.x;
    if (sx < -40 || sx > VIEW_W + 40) continue;
    const glow = 0.5 + Math.sin(t * 2 + wx * 0.01) * 0.3;
    ctx.fillStyle = `rgba(255,210,100,${0.12 * glow})`;
    ctx.shadowColor = "rgba(255,200,80,0.6)";
    ctx.shadowBlur = 16 * glow;
    ctx.fillRect(sx + 10, 140, 24, 36);
    ctx.shadowBlur = 0;
  }

  // Animated fog layer
  ctx.fillStyle = "rgba(180,190,210,0.04)";
  for (let f = 0; f < 3; f++) {
    const fy = VIEW_H * 0.55 + f * 40 + Math.sin(t * 0.3 + f) * 15;
    const fx = (t * 20 * (f + 1) - camera.x * 0.1) % (VIEW_W + 200) - 100;
    ctx.fillRect(fx, fy, VIEW_W * 0.6, 30);
  }

  // Fireflies / dust motes
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let i = 0; i < 26; i++) {
    const x = (i * 173 - camera.x * 0.22 + Math.sin(t + i) * 12) % (VIEW_W + 220) - 80;
    const y = 60 + (i * 83) % 430 - camera.y * 0.08 + Math.cos(t * 1.2 + i) * 10;
    ctx.fillRect(x, y, 3, 3);
  }
  // Brighter fireflies
  for (let i = 0; i < 8; i++) {
    const fx = (i * 220 - camera.x * 0.18 + t * 15) % (VIEW_W + 100);
    const fy = 200 + (i * 97) % 350 + Math.sin(t * 1.5 + i * 2) * 20;
    const alpha = 0.3 + Math.sin(t * 3 + i) * 0.3;
    ctx.fillStyle = `rgba(255,232,140,${alpha})`;
    ctx.shadowColor = "rgba(255,232,140,0.8)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
  for (const target of objects.attackTargets) if (!target.used || target.kind === "nancyChandelier") drawAttackTarget(target);
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

function wrapCanvasTextLines(text, maxWidth, maxLines = 2) {
  const source = String(text);
  const words = source.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let overflow = false;

  function trimToWidth(value) {
    let trimmed = value;
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1).trimEnd();
    }
    return `${trimmed}...`;
  }

  for (const word of words) {
    let currentWord = word;

    while (ctx.measureText(currentWord).width > maxWidth && currentWord.length > 1) {
      if (line) {
        lines.push(line);
        line = "";
        if (lines.length === maxLines) {
          overflow = true;
          break;
        }
      }

      let part = "";
      for (const char of currentWord) {
        if (ctx.measureText(part + char).width > maxWidth) break;
        part += char;
      }
      if (!part) part = currentWord.charAt(0);
      lines.push(part);
      currentWord = currentWord.slice(part.length);
      if (lines.length === maxLines) {
        overflow = currentWord.length > 0;
        break;
      }
    }

    if (overflow || lines.length === maxLines) {
      overflow = overflow || currentWord.length > 0;
      break;
    }

    const test = line ? `${line} ${currentWord}` : currentWord;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = currentWord;
      if (lines.length === maxLines) {
        overflow = true;
        break;
      }
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (!lines.length) return [source];

  const joined = lines.join(" ");
  if (overflow || joined.length < source.trim().length) {
    lines[lines.length - 1] = trimToWidth(lines[lines.length - 1]);
  }

  return lines.slice(0, maxLines);
}

function drawTutorialPrompts() {
  if (!level.tutorials) return;
  ctx.font = "800 16px Nunito, Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  for (const note of level.tutorials) {
    const visible = Math.abs((player.x + player.w / 2) - note.x) < 520;
    ctx.globalAlpha = visible ? 1 : 0.38;
    const w = 520;
    const lines = wrapCanvasTextLines(note.text, w - 54, 3);
    const h = 34 + lines.length * 22;
    const x = note.x;
    const y = 585;
    const boxX = x - w / 2;
    const boxY = y - h + 12;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(7, 8, 14, 0.84)";
    ctx.strokeStyle = "rgba(255, 226, 151, 0.58)";
    ctx.lineWidth = 1.6;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, w, h, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
    } else {
      ctx.fillRect(boxX, boxY, w, h);
      ctx.shadowBlur = 0;
      ctx.strokeRect(boxX, boxY, w, h);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255, 248, 232, 0.96)";
    ctx.shadowColor = "rgba(0,0,0,0.62)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff4c2";
    const textStartY = y - h + 35;
    lines.forEach((line, i) => ctx.fillText(line, x, textStartY + i * 22));
    ctx.shadowBlur = 0;
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
  drawAttackAnchor(s.x + s.w / 2, s.y - 12, "shelf");
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
  drawAttackAnchor(m.x + m.w / 2, m.y - 12, "mirror");
}

function drawCrystal(c) {
  const boss = objects.boss;
  const readyPulse = boss?.type === "nancy" && boss.phase === 3 && !c.activated;
  ctx.save();
  if (readyPulse) {
    ctx.shadowColor = "#67e8f9";
    ctx.shadowBlur = 18 + Math.sin(performance.now() / 120) * 6;
  }
  ctx.fillStyle = c.activated ? "#fef3c7" : c.charged ? "#67e8f9" : "#475569";
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 28);
  ctx.lineTo(c.x + 22, c.y);
  ctx.lineTo(c.x, c.y + 28);
  ctx.lineTo(c.x - 22, c.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawAttackAnchor(c.x, c.y - 42, "crystal");
}

function drawWebPoint(p) {
  const pulse = 1 + Math.sin(performance.now() / 160 + p.x) * 0.12;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = p.kind === "chandelierSwing" ? "#fef3c7" : "#ff8dbd";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#ffd6ea";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -15);
  ctx.quadraticCurveTo(0, -25, 16, -15);
  ctx.moveTo(-12, -6);
  ctx.quadraticCurveTo(0, -13, 12, -6);
  ctx.stroke();
  ctx.shadowColor = "#ddd6fe";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = p.kind === "chandelierSwing" ? "#facc15" : "#d1d5db";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 2);
  ctx.arc(9, 2, 9, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(0, -24, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAttackAnchor(x, y, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = kind === "crystal" ? "#67e8f9" : "#fbbf24";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = kind === "crystal" ? "#bae6fd" : "#fef3c7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.restore();
}

function drawAttackTarget(target) {
  ctx.save();
  const sway = Math.sin(performance.now() / 420 + target.x) * 4;
  ctx.translate(target.x + sway, target.y);
  ctx.strokeStyle = target.kind === "atticChandelier" ? "#c4b5fd" : "#fef3c7";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(0, -4);
  ctx.stroke();
  ctx.fillStyle = "#4c1d95";
  ctx.fillRect(-34, -4, 68, 10);
  ctx.fillStyle = "#fef3c7";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 15, 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  drawAttackAnchor(0, -48, target.kind);
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
  if (p.kind === "yarnAttack") {
    ctx.save();
    ctx.shadowColor = "#ff8dbd";
    ctx.shadowBlur = 14;
    drawYarnBall(p.x, p.y, 10);
    ctx.restore();
    return;
  }
  ctx.fillStyle = p.kind === "reflected" ? "#fb7185" : "#a78bfa";
  ctx.shadowColor = p.kind === "reflected" ? "#fecdd3" : "#ddd6fe";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBoss(b) {
  if (b.type === "nancy" && b.phase === 2) {
    for (const img of b.images) {
      ctx.save();
      ctx.globalAlpha = 0.48;
      drawBossBody({ ...b, x: img.x, y: img.y, stunned: 0 }, "#6d28d9", true);
      ctx.restore();
    }
  }
  const color = b.type === "shadow" ? "#0f172a" : b.type === "whiskers" ? "#f97316" : b.type === "duchess" ? "#ec4899" : "#7c3aed";
  if (b.type === "shadow") {
    ctx.save();
    ctx.shadowColor = "#c084fc";
    ctx.shadowBlur = 24;
    drawBossBody(b, color, true);
    ctx.restore();
    return;
  }
  if (b.type === "nancy" && b.phase === 2) {
    ctx.save();
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 26;
    drawBossBody(b, color, true);
    ctx.restore();
    return;
  }
  if (b.type === "nancy" && b.phase === 3) {
    ctx.save();
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 20 + Math.sin(performance.now() / 90) * 8;
    drawBossBody(b, color, true);
    ctx.restore();
    return;
  }
  drawBossBody(b, color, true);
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
  const max = b.maxHp || 3;
  const x = 34;
  const y = 108;
  const phaseName = b.type === "nancy" ? ` Phase ${b.phase}` : "";
  const label = b.type === "shadow" ? `Shadow HP: ${Math.max(0, b.hp)}/3 bookshelves` : `${b.name}${phaseName} HP: ${Math.max(0, b.hp)}/${max}`;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, 330, 22);
  ctx.fillStyle = "#ff5d73";
  ctx.fillRect(x, y, 330 * Math.max(0, b.hp / max), 22);
  ctx.strokeStyle = "rgba(255, 248, 232, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 330, 22);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(label, x, y - 8);
}

function drawPlayer() {
  const t = visualTime;
  const walking = Math.abs(player.vx) > 0.4 && player.grounded;
  const breath = 1 + Math.sin(t * 2.2) * 0.04;
  const blink = Math.sin(t * 0.9) > 0.92;
  const tailAngle = Math.sin(t * 3.5) * 0.35;
  const earTwitchL = Math.sin(t * 4.1) > 0.95 ? 0.15 : 0;
  const earTwitchR = Math.sin(t * 4.1 + 1) > 0.95 ? -0.15 : 0;
  const pawPhase = Math.sin(t * (walking ? 10 : 2.5));
  const pawLiftL = walking ? Math.max(0, pawPhase) * 5 : Math.sin(t * 2.5) * 2;
  const pawLiftR = walking ? Math.max(0, -pawPhase) * 5 : Math.sin(t * 2.5 + Math.PI) * 2;

  ctx.save();
  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.face, 1);
  ctx.scale(1, breath);

  // Tail (behind body)
  ctx.save();
  ctx.translate(-13, 10);
  ctx.rotate(tailAngle - 0.08);
  ctx.strokeStyle = "#fff0cf";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-16, -17, -34, -8, -27, 7);
  ctx.stroke();
  ctx.restore();

  // Body and round cat head
  ctx.fillStyle = "#fff0cf";
  ctx.beginPath();
  ctx.ellipse(0, 9, 15, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6dc";
  ctx.beginPath();
  ctx.ellipse(0, -8, 17, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = "#fff6dc";
  ctx.save();
  ctx.translate(-10, -20);
  ctx.rotate(-0.28 + earTwitchL);
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-2, -8);
  ctx.lineTo(8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f0a6a6";
  ctx.beginPath();
  ctx.moveTo(-2, 6);
  ctx.lineTo(0, -2);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(10, -20);
  ctx.rotate(0.28 + earTwitchR);
  ctx.fillStyle = "#fff6dc";
  ctx.beginPath();
  ctx.moveTo(6, 10);
  ctx.lineTo(2, -8);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f0a6a6";
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(0, -2);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Eyes
  ctx.fillStyle = "#1f2937";
  if (blink) {
    ctx.fillRect(-9, -10, 5, 1.5);
    ctx.fillRect(4, -10, 5, 1.5);
  } else {
    ctx.beginPath();
    ctx.ellipse(-6.5, -8, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, -8, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-7, -9, 1, 0, Math.PI * 2);
    ctx.arc(5.5, -9, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.fillStyle = "#ff8dbd";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(-3, 0);
  ctx.lineTo(3, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(82,48,31,0.7)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 1);
  ctx.lineTo(-17, -3);
  ctx.moveTo(-4, 3);
  ctx.lineTo(-17, 4);
  ctx.moveTo(4, 1);
  ctx.lineTo(17, -3);
  ctx.moveTo(4, 3);
  ctx.lineTo(17, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-2, 3, 3, 0, Math.PI * 0.85);
  ctx.arc(2, 3, 3, Math.PI * 0.15, Math.PI);
  ctx.stroke();

  // Paws
  ctx.fillStyle = "#fff0cf";
  ctx.fillRect(-14, 16 - pawLiftL, 9, 10 - pawLiftL * 0.3);
  ctx.fillRect(5, 16 - pawLiftR, 9, 10 - pawLiftR * 0.3);

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

function getWrappedHudLines(text, maxWidth, maxLines = 2) {
  return wrapCanvasTextLines(text, maxWidth, maxLines);
}

function drawHud() {
  const boss = objects.boss && !objects.boss.defeated ? objects.boss : null;
  const hudH = boss ? 126 : 82;

  // Glass HUD panel
  ctx.fillStyle = "rgba(5,8,13,0.55)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(18, 18, 700, hudH, 12);
    ctx.fill();
  } else {
    ctx.fillRect(18, 18, 700, hudH);
  }
  ctx.strokeStyle = "rgba(215,184,107,0.35)";
  ctx.lineWidth = 1.5;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(18, 18, 700, hudH, 12);
    ctx.stroke();
  }

  ctx.fillStyle = "#fff8e8";
  ctx.font = "bold 23px Nunito, Trebuchet MS, sans-serif";
  ctx.fillText(`${"❤️".repeat(player.hearts)}${"♡".repeat(3 - player.hearts)}`, 34, 52);
  ctx.fillText(`⭐ ${player.stars}/3`, 170, 52);
  ctx.fillText(`🧶 ${player.yarn}`, 270, 52);
  ctx.fillText(`🐟 ${fishFound.size}/${TOTAL_FISH}`, 350, 52);
  ctx.font = "bold 18px Nunito, Trebuchet MS, sans-serif";
  ctx.fillStyle = "rgba(255,248,232,0.85)";
  ctx.fillText(`Room ${levelIndex + 1}/${LEVELS.length}: ${level.name}`, 34, 86);
  if (boss) drawBossBar(boss);
  ctx.font = "600 15px Nunito, Trebuchet MS, sans-serif";
  ctx.fillStyle = "rgba(219,234,254,0.75)";
  ctx.fillText("A/D Move | W Jump | S Fast Fall | E/RMB Grapple | Space/LMB Attack | ESC Pause", VIEW_W - 760, 50);
  if (messageTimer > 0 && message) {
    const msgAlpha = Math.min(1, messageTimer);
    const boxW = 760;
    const boxH = 64;
    const boxX = (VIEW_W - boxW) / 2;
    const boxY = VIEW_H - 108;
    ctx.fillStyle = `rgba(5,8,13,${0.72 * msgAlpha})`;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.strokeStyle = `rgba(215,184,107,${0.4 * msgAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }
    ctx.fillStyle = `rgba(255,248,232,${msgAlpha})`;
    ctx.textAlign = "center";
    ctx.font = "bold 16px Nunito, Trebuchet MS, sans-serif";
    const lines = getWrappedHudLines(message, boxW - 44, 2);
    const startY = boxY + boxH / 2 - (lines.length - 1) * 10 + 6;
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, startY + i * 21));
    ctx.textAlign = "left";
  }
}

function drawWinOverlay() {
  const t = visualTime;
  ctx.fillStyle = "rgba(5,8,13,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Gold particle celebration
  for (let i = 0; i < 24; i++) {
    const px = VIEW_W / 2 + Math.sin(t * 2 + i * 1.7) * (120 + i * 8);
    const py = 260 + Math.cos(t * 1.8 + i * 2.1) * (80 + i * 5);
    const alpha = 0.4 + Math.sin(t * 3 + i) * 0.3;
    ctx.fillStyle = `rgba(255,224,145,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fff4c2";
  ctx.textAlign = "center";
  ctx.font = "bold 70px Cinzel, Trebuchet MS, serif";
  ctx.shadowColor = "rgba(255,224,145,0.5)";
  ctx.shadowBlur = 20;
  ctx.fillText("Nancy Defeated", VIEW_W / 2, 300);
  ctx.shadowBlur = 0;
  ctx.font = "bold 28px Nunito, Trebuchet MS, sans-serif";
  ctx.fillText(`Hidden fish collected: ${fishFound.size}/${TOTAL_FISH}`, VIEW_W / 2, 358);
  ctx.fillStyle = "rgba(255,244,194,0.75)";
  ctx.font = "600 22px Nunito, Trebuchet MS, sans-serif";
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
  visualTime = now / 1000;
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  speedrunModeUnlocked = true;
  playMenuSound("select");
  updateMenuLocks();
  if (playButton) {
    playButton.classList.add("clicking");
    setTimeout(() => playButton.classList.remove("clicking"), 400);
  }
  startLevelWithFade(0);
}

playButton.addEventListener("click", startGame);
roomsButton.addEventListener("click", showLevelSelect);
storyNext.addEventListener("click", advanceStory);
document.querySelectorAll(".level-hotspot").forEach(button => {
  button.addEventListener("mouseenter", () => {
    selectedLevel = Number(button.dataset.level);
    updateMenuLocks();
  });
  button.addEventListener("click", () => {
    startLevelWithFade(Number(button.dataset.level));
  });
});
document.querySelectorAll(".version-hotspot").forEach(button => {
  button.addEventListener("mouseenter", () => {
    if (modeDescription) modeDescription.textContent = MODE_DESCRIPTIONS[button.dataset.mode] || MODE_DESCRIPTIONS.classic;
  });
  button.addEventListener("mouseleave", () => {
    if (modeDescription) modeDescription.textContent = MODE_DESCRIPTIONS[selectedMode] || MODE_DESCRIPTIONS.classic;
  });
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    playMenuSound("select");
    updateMenuLocks();
    button.classList.add("clicking");
    setTimeout(() => button.classList.remove("clicking"), 400);
    say(`${button.getAttribute("aria-label")} selected.`, 1.2);
  });
});

function handleMenuKeyboard(key) {
  const menuVisible = !menu.hidden && !running && !paused;
  if (!menuVisible) return false;

  if (/^[1-8]$/.test(key)) {
    selectedLevel = Number(key) - 1;
    updateMenuLocks();
    const target = document.querySelector(`.level-hotspot[data-level="${selectedLevel}"]`);
    if (target) target.focus();
    return true;
  }

  if (key === "enter") {
    startLevelWithFade(selectedLevel);
    return true;
  }

  if (key === "arrowleft" || key === "arrowright") {
    selectedLevel += key === "arrowright" ? 1 : -1;
    if (selectedLevel < 0) selectedLevel = LEVELS.length - 1;
    if (selectedLevel > LEVELS.length - 1) selectedLevel = 0;
    updateMenuLocks();
    const target = document.querySelector(`.level-hotspot[data-level="${selectedLevel}"]`);
    if (target) target.focus();
    return true;
  }

  if (key === "arrowup" || key === "arrowdown") {
    const order = ["classic", "speedrun", "endless"];
    const current = Math.max(0, order.indexOf(selectedMode));
    const next = key === "arrowdown" ? (current + 1) % order.length : (current + order.length - 1) % order.length;
    const nextMode = order[next];
    const nextButton = document.querySelector(`.version-hotspot[data-mode="${nextMode}"]`);
    selectedMode = nextMode;
    updateMenuLocks();
    if (nextButton) nextButton.focus();
    return true;
  }

  return false;
}

backToMenu.addEventListener("click", showMainMenu);
continueButton.addEventListener("click", () => setPaused(false));
quitButton.addEventListener("click", quitToLevelSelect);
returnVictoryButton.addEventListener("click", showLevelSelect);
editorButton?.addEventListener("click", () => {
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
  if (e.button === 0 && running && !paused) {
    screenToWorld(e.clientX, e.clientY);
    shootYarnAttack();
  }
});
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (storyActive) {
    if (key === "enter" || key === " ") {
      e.preventDefault();
      advanceStory();
    }
    return;
  }
  if (handleMenuKeyboard(key)) {
    e.preventDefault();
    return;
  }
  if (key === "escape") {
    e.preventDefault();
    if (running || paused) setPaused(!paused);
    return;
  }
  if (paused) return;
  keys.add(key);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key)) e.preventDefault();
  if (key === "w" || key === "arrowup") player.jumpBuffer = 0.24;
  if (key === "e") fireYarn();
  if (key === " ") shootYarnAttack();
  if (key === "r" && running) resetLevel(levelIndex);
});
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

resizeCanvas();
resetLevel(0);
running = false;
renderLevelSelect();
updateMenuLocks();
initProceduralMenuVisuals();
showMainMenu();
if (playButton) playButton.classList.add("important-sparkle");

// Initialize Visual & Animation Redesign Features
initMenuParallax();
initMenuFireflies();
initClickParticles();

requestAnimationFrame(loop);

/* ---- NEW INDIE GAME VISUAL UPGRADES ---- */

function updateMenuKittyPosition() {
  if (!menuKitty) return;
  const target = HOTSPOT_COORDS[selectedLevel];
  if (!target) return;

  const currentLeft = parseFloat(menuKitty.style.left) || 11;
  const isMoving = Math.abs(currentLeft - target.left) > 0.5;

  if (target.left > currentLeft) {
    menuKitty.style.transform = "scaleX(1)";
  } else if (target.left < currentLeft) {
    menuKitty.style.transform = "scaleX(-1)";
  }

  if (isMoving) {
    menuKitty.classList.add("walking");
    startPawPrintTrail();
  }

  menuKitty.style.left = `${target.left}%`;
  menuKitty.style.bottom = `${target.bottom}%`;

  if (menuKitty._walkTimer) clearTimeout(menuKitty._walkTimer);
  menuKitty._walkTimer = setTimeout(() => {
    menuKitty.classList.remove("walking");
    stopPawPrintTrail();
  }, 800);
}

function startPawPrintTrail() {
  if (pawPrintInterval) return;
  pawPrintInterval = setInterval(() => {
    if (!menuKitty || !menuKitty.classList.contains("walking")) {
      stopPawPrintTrail();
      return;
    }

    const parent = menuKitty.parentElement;
    if (!parent) return;

    const print = document.createElement("div");
    print.className = "paw-print";

    const kRect = menuKitty.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();

    const x = kRect.left - pRect.left + kRect.width / 2 + (Math.random() - 0.5) * 6;
    const y = kRect.top - pRect.top + kRect.height - 3;

    print.style.left = `${x}px`;
    print.style.top = `${y}px`;

    parent.appendChild(print);

    setTimeout(() => print.remove(), 1600);
  }, 140);
}

function stopPawPrintTrail() {
  if (pawPrintInterval) {
    clearInterval(pawPrintInterval);
    pawPrintInterval = null;
  }
}

function initMenuParallax() {
  const visualCanvas = document.querySelector(".visual-canvas");
  if (!visualCanvas) return;

  visualCanvas.addEventListener("mousemove", (e) => {
    if (menu.hidden || running) return;

    const rect = visualCanvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

    const layers = [
      { selector: ".moon", factor: 6 },
      { selector: ".menu-clouds", factor: 12 },
      { selector: ".mansion-silhouette", factor: -14 },
      { selector: ".purple-woods", factor: -22 },
      { selector: ".gate-bars", factor: -32 }
    ];

    layers.forEach(l => {
      const el = visualCanvas.querySelector(l.selector);
      if (el) {
        el.style.transform = `translate3d(${mouseX * l.factor}px, ${mouseY * l.factor}px, 0)`;
      }
    });
  });

  visualCanvas.addEventListener("mouseleave", () => {
    const selectors = [".moon", ".menu-clouds", ".mansion-silhouette", ".purple-woods", ".gate-bars"];
    selectors.forEach(sel => {
      const el = visualCanvas.querySelector(sel);
      if (el) el.style.transform = "";
    });
  });
}

function initMenuFireflies() {
  const visualCanvas = document.querySelector(".visual-canvas");
  if (!visualCanvas) return;

  // Remove existing
  visualCanvas.querySelectorAll(".menu-firefly").forEach(el => el.remove());

  for (let i = 0; i < 18; i++) {
    const firefly = document.createElement("div");
    firefly.className = "menu-firefly";

    firefly.style.left = `${Math.random() * 95}%`;
    firefly.style.top = `${15 + Math.random() * 75}%`;

    const duration = 6 + Math.random() * 6;
    const delay = Math.random() * 5;
    firefly.style.animationDuration = `${duration}s`;
    firefly.style.animationDelay = `${delay}s`;

    const dx = (Math.random() - 0.5) * 80;
    const dy = (Math.random() - 0.5) * 60;
    firefly.style.setProperty("--dx", `${dx}px`);
    firefly.style.setProperty("--dy", `${dy}px`);

    visualCanvas.appendChild(firefly);
  }
}

function initClickParticles() {
  document.addEventListener("click", (e) => {
    const button = e.target.closest("button, .version-hotspot, .play-cta, .secondary-cta");
    if (!button) return;

    let x = e.clientX;
    let y = e.clientY;

    if (x === 0 && y === 0) {
      const rect = button.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    createClickParticles(x, y);
  });
}

function createClickParticles(clientX, clientY) {
  const count = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "click-particle";

    p.style.left = `${clientX + window.scrollX - 3}px`;
    p.style.top = `${clientY + window.scrollY - 3}px`;

    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 50;
    const tx = Math.cos(angle) * speed;
    const ty = Math.sin(angle) * speed;

    p.style.setProperty("--tx", `${tx}px`);
    p.style.setProperty("--ty", `${ty}px`);

    p.style.animationDuration = `${0.45 + Math.random() * 0.35}s`;
    const scale = 0.5 + Math.random() * 0.6;
    p.style.transform = `scale(${scale})`;

    const colors = ["#facc15", "#eab308", "#fef08a", "#fffbeb", "#f59e0b"];
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}
