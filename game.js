// Kitty Whiscape: canvas-based platformer logic.
    const screens = {
      loader: document.getElementById("loader"),
      prologue: document.getElementById("prologue"),
      start: document.getElementById("start"),
      game: document.getElementById("game"),
      ending: document.getElementById("ending")
    };

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const storyCanvas = document.getElementById("storyCanvas");
    const sctx = storyCanvas.getContext("2d");
    const fade = document.getElementById("fade");
    const modal = document.getElementById("modal");
    const webOverlay = document.getElementById("webOverlay");
    const prologue = document.getElementById("prologue");

    const hud = {
      hearts: document.getElementById("hearts"),
      score: document.getElementById("score"),
      stars: document.getElementById("stars"),
      room: document.getElementById("room"),
      modeName: document.getElementById("modeName"),
      timer: document.getElementById("timer"),
      timerWrap: document.getElementById("timerWrap"),
      sense: document.getElementById("senseBadge"),
      musicToggle: document.getElementById("musicToggle")
    };

    const storyMeta = document.getElementById("storyMeta");
    const storyText = document.getElementById("storyText");
    const storyNext = document.getElementById("storyNext");
    const storyBox = document.querySelector(".story-box");
    const storyIcon = document.getElementById("storyIcon");
    const toast = document.getElementById("toast");
    const keys = new Set();
    const mouse = { x: 0, y: 0, down: false };

    const music = {
      ctx: null,
      master: null,
      compressor: null,
      nextStep: 0,
      step: 0,
      bpm: 168,
      playing: true,
      started: false,
      timer: null
    };

    const storyScenes = [
      {
        label: "The Abandonment",
        icon: "",
        text: "Hello, I'm Kitty. I was abandoned by my only friend, Peter..."
      },
      {
        label: "The Heartbreak",
        icon: "Peter -> Nancy",
        text: "...He even threw away Nancy into these haunted rooms!"
      },
      {
        label: "The Rumor",
        icon: "Magic Cat Clan",
        text: "Psst... Have you heard? Deep within this mansion lies a portal to the legendary Magic Cat Clan land!"
      },
      {
        label: "The Vow",
        icon: "",
        text: "I've made a vow. I am going to escape this nightmare and reach the Magic Cat Clan land!"
      }
    ];

    const rain = Array.from({ length: 180 }, () => ({
      x: Math.random() * 1280,
      y: Math.random() * 720,
      speed: 8 + Math.random() * 10,
      len: 14 + Math.random() * 22
    }));

    const magicBits = Array.from({ length: 70 }, () => ({
      seed: Math.random() * 1000,
      size: 2 + Math.random() * 4
    }));

    const rooms = [
      {
        name: "The Cozy Escape",
        difficulty: "Easy",
        palette: ["#1d1833", "#51304f", "#8d5d68"],
        start: [72, 448],
        exit: [980, 428],
        requiredStars: 3,
        platforms: [[0, 516, 1040, 69], [145, 452, 170, 22], [385, 402, 160, 22], [625, 350, 150, 22], [830, 416, 130, 22]],
        enemies: [[430, 472, 80]],
        items: [["star", 255, 414], ["star", 472, 364], ["star", 892, 378], ["yarn", 720, 312]],
        spikes: [[548, 535, 118, 18]],
        hazards: [[760, 384, 16, 52, 1.1, "x"]],
        traps: [],
        moving: [],
        disappearing: []
      },
      {
        name: "The Swinging Gallery",
        difficulty: "Medium",
        palette: ["#11142d", "#2d2449", "#a56a58"],
        start: [64, 448],
        exit: [980, 354],
        requiredStars: 3,
        platforms: [[0, 516, 182, 69], [318, 454, 118, 22], [568, 384, 106, 22], [824, 410, 126, 22], [220, 118, 80, 18], [505, 96, 80, 18], [775, 116, 80, 18]],
        enemies: [[350, 410, 70], [840, 366, 72]],
        items: [["star", 174, 476], ["star", 606, 346], ["star", 858, 372], ["yarn", 528, 60]],
        spikes: [[190, 535, 124, 18], [448, 535, 116, 18], [686, 535, 118, 18]],
        hazards: [[490, 482, 18, 72, 1.6, "x"], [720, 350, 18, 82, 1.3, "y"]],
        traps: [[260, 438, 18, 62, "right", 7.2, 1150], [936, 354, 18, 72, "left", 7.6, 980]],
        moving: [],
        disappearing: []
      },
      {
        name: "Nancy's Haunted Vault",
        difficulty: "Hard",
        palette: ["#101b2e", "#28375a", "#71629b"],
        start: [64, 448],
        exit: [980, 244],
        requiredStars: 3,
        platforms: [[0, 516, 170, 69], [238, 454, 104, 20], [430, 390, 94, 20], [616, 324, 92, 20], [820, 268, 104, 20], [500, 172, 92, 18]],
        enemies: [[250, 410, 72, true], [635, 280, 78, true]],
        items: [["star", 250, 416], ["star", 640, 286], ["star", 845, 230], ["yarn", 892, 230]],
        spikes: [[176, 535, 164, 16], [356, 535, 150, 16], [708, 535, 196, 16]],
        hazards: [[492, 356, 16, 132, 2.1, "x"], [744, 260, 16, 118, 1.8, "y"], [600, 486, 14, 180, 2.2, "x"]],
        traps: [[360, 390, 18, 64, "right", 8.8, 820], [930, 250, 18, 62, "left", 9.2, 780]],
        moving: [[228, 454, 116, 20, 58, 1.2], [420, 390, 104, 20, 70, 1.45, "y"], [604, 324, 104, 20, 76, 1.55]],
        disappearing: []
      },
      {
        name: "The Endless Mansion Escalation",
        difficulty: "Expert",
        palette: ["#101126", "#2a214b", "#744a76"],
        start: [64, 448],
        exit: [976, 230],
        requiredStars: 3,
        platforms: [[0, 516, 150, 69], [262, 462, 94, 20], [468, 398, 86, 20], [670, 334, 82, 20], [860, 272, 88, 20], [330, 170, 76, 18], [720, 154, 72, 18]],
        enemies: [[294, 418, 66], [494, 354, 58], [692, 290, 58], [884, 228, 54]],
        items: [["star", 296, 424], ["star", 492, 360], ["star", 754, 116], ["yarn", 894, 234]],
        spikes: [[156, 535, 96, 18], [368, 535, 186, 18], [578, 535, 318, 18]],
        hazards: [[386, 424, 17, 100, 2.2, "x"], [612, 260, 17, 110, 2.4, "y"], [820, 228, 17, 82, 2.7, "x"]],
        traps: [[210, 462, 18, 58, "right", 9.4, 680], [808, 154, 18, 82, "down", 9.8, 640], [954, 230, 18, 72, "left", 10.2, 620]],
        moving: [[252, 462, 118, 20, 88, 1.7], [458, 398, 104, 20, 88, 1.85, "y"], [658, 334, 100, 20, 100, 2.05]],
        disappearing: [[626, 224, 92, 18, 150]]
      },
      {
        name: "Nancy's Master Bedroom",
        difficulty: "Boss",
        palette: ["#171021", "#3b1835", "#6d2748"],
        start: [70, 448],
        exit: [980, 410],
        platforms: [[0, 516, 1040, 69], [180, 430, 150, 22], [400, 360, 160, 22], [650, 430, 150, 22], [790, 292, 150, 22]],
        enemies: [[285, 472, 96], [750, 360, 72]],
        items: [["fish", 238, 392], ["star", 292, 392], ["mouse", 466, 322], ["yarn", 734, 392], ["star", 840, 254]],
        spikes: [[574, 505, 70, 16]],
        moving: [],
        disappearing: [],
        boss: true
      }
    ];

    let selectedMode = "classic";
    let storyIndex = 0;
    let typingIndex = 0;
    let typingTimer = 0;
    let storyFade = 0;
    let storySceneStart = performance.now();
    let gameState = "loading";
    let roomIndex = 0;
    let currentRoom;
    let player;
    let platforms = [];
    let enemies = [];
    let items = [];
    let spikes = [];
    let hazards = [];
    let traps = [];
    let projectiles = [];
    let shockwaves = [];
    let particles = [];
    let switches = [];
    let chandeliers = [];
    let boss = null;
    let score = 0;
    let stars = 0;
    let roomStars = 0;
    let roomNumber = 1;
    let timerStart = 0;
    let elapsed = 0;
    let shake = 0;
    let slowMo = 0;
    let senseUsed = false;
    let frozen = false;
    let lastTime = 0;
    let endlessDifficulty = 0;
    let noticeText = "";
    let noticeTimer = 0;
    let shop = null;
    let roomClearTimer = 0;
    let roomTransitioning = false;
    let lastHud = { score: 0, stars: 0, room: 1, sense: "READY" };
    let deathShakeTimer = 0;
    let attemptStarSnapshots = [];

    function showScreen(name) {
      Object.values(screens).forEach(screen => screen.classList.remove("active"));
      screens[name].classList.add("active");
      gameState = name;
    }

    function buildTitle() {
      const title = document.getElementById("title");
      title.textContent = "";
      "Kitty Whiscape".split("").forEach((letter, index) => {
        const span = document.createElement("span");
        span.textContent = letter === " " ? "\u00a0" : letter;
        span.style.animationDelay = `${index * 70}ms, ${index * 95}ms`;
        title.appendChild(span);
      });
    }

    function beginPrologue() {
      storyIndex = 0;
      showScreen("prologue");
      renderStory(true);
    }

    function renderStory(reset = false) {
      const scene = storyScenes[storyIndex];
      if (reset) {
        typingIndex = 0;
        typingTimer = 0;
        storySceneStart = performance.now();
      }
      storyMeta.textContent = `${storyIndex + 1} / ${storyScenes.length} - ${scene.label}`;
      storyNext.textContent = storyIndex === storyScenes.length - 1 ? "Enter Mansion" : "Next";
      storyText.textContent = "";
      storyIcon.textContent = scene.icon;
      prologue.classList.remove("scene-1", "scene-2", "scene-3", "scene-4", "jump");
      prologue.classList.add(`scene-${storyIndex + 1}`);
      if (storyIndex === 2) prologue.classList.add("jump");
    }

    function advanceStory() {
      const scene = storyScenes[storyIndex];
      if (typingIndex < scene.text.length) {
        typingIndex = scene.text.length;
        storyText.textContent = scene.text;
        return;
      }
      if (storyIndex < storyScenes.length - 1) {
        storyBox.classList.remove("ripple");
        void storyBox.offsetWidth;
        storyBox.classList.add("ripple");
        storyBox.classList.add("fading");
        setTimeout(() => {
          storyIndex += 1;
          typingIndex = 0;
          storyText.textContent = "";
          renderStory(true);
          storyFade = 1;
          storyBox.classList.remove("fading");
        }, 230);
      } else {
        prologue.classList.add("zoom-away");
        setTimeout(() => {
          prologue.classList.remove("zoom-away");
          showScreen("start");
        }, 680);
      }
    }

    function makePlayer() {
      return {
        x: 70, y: 430, w: 34, h: 34,
        vx: 0, vy: 0, facing: 1,
        grounded: false, jumps: 0, maxJumps: 2,
        health: 6, maxHealth: 6,
        invincible: 0, flip: 0,
        web: null, webStamina: 100
      };
    }

    function cloneRoom(index) {
      if (selectedMode !== "endless") return JSON.parse(JSON.stringify(rooms[index]));
      const base = JSON.parse(JSON.stringify(rooms[index % 4]));
      base.name = `Endless Room ${endlessDifficulty + 1}`;
      base.difficulty = `Endless +${endlessDifficulty}`;
      base.requiredStars = 3;
      base.enemies.push([180 + (endlessDifficulty * 73) % 620, 472, 90]);
      if (endlessDifficulty % 2 === 1) base.spikes.push([440, 535, 96, 16]);
      base.hazards = base.hazards || [];
      base.hazards.push([420 + (endlessDifficulty * 67) % 330, 330, 16, 80, 1.6 + endlessDifficulty * 0.45, endlessDifficulty % 2 ? "y" : "x"]);
      base.traps = base.traps || [];
      base.traps.push([280 + (endlessDifficulty * 71) % 460, 250, 18, 90, endlessDifficulty % 2 ? "left" : "right", 9 + endlessDifficulty * 0.65, 620]);
      base.items = base.items.filter(item => item[0] !== "star").concat([
        ["star", 250 + (endlessDifficulty * 83) % 520, 410],
        ["star", 520 + (endlessDifficulty * 47) % 260, 300],
        ["star", 760 + (endlessDifficulty * 61) % 160, 180]
      ]);
      return base;
    }

    function loadRoom(index) {
      currentRoom = cloneRoom(index);
      roomIndex = index;
      roomNumber = selectedMode === "endless" ? endlessDifficulty + 1 : index + 1;
      player.x = currentRoom.start[0];
      player.y = currentRoom.start[1];
      player.vx = 0;
      player.vy = 0;
      player.web = null;
      roomStars = 0;
      roomTransitioning = false;
      roomClearTimer = 0;
      const currentLevel = Math.max(1, roomNumber);
      const baseSpeed = 1;
      const hazardSpeed = baseSpeed * (1 + currentLevel * 0.45);
      const minWidth = currentLevel >= 3 ? 72 : 92;
      const scaledWidth = w => Math.max(minWidth, w - currentLevel * 10);
      platforms = currentRoom.platforms.map(p => ({ x: p[0], y: p[1], w: p[2] > 600 ? p[2] : scaledWidth(p[2]), h: p[3], baseX: p[0], baseY: p[1], move: null, vanish: null, dissolve: null, solid: true }));
      currentRoom.moving.forEach(m => platforms.push({ x: m[0], y: m[1], w: scaledWidth(m[2]), h: m[3], baseX: m[0], baseY: m[1], move: { range: m[4] + currentLevel * 4, speed: m[5] * hazardSpeed, axis: m[6] || "x", t: 0 }, vanish: null, dissolve: null, solid: true }));
      currentRoom.disappearing.forEach(d => platforms.push({ x: d[0], y: d[1], w: scaledWidth(d[2]), h: d[3], baseX: d[0], baseY: d[1], move: null, vanish: { timer: d[4], phase: 0 }, dissolve: null, solid: true }));
      enemies = currentRoom.enemies.map(e => ({ x: e[0], y: e[1], w: 34, h: 34, baseX: e[0], patrol: Math.max(36, e[2] - Math.max(0, roomNumber - 3) * 4), vx: e[3] ? 0.65 + roomNumber * 0.05 : 1.05 + roomIndex * 0.15 + endlessDifficulty * 0.04, sleep: !!e[3], dead: false, wobble: Math.random() * 9 }));
      items = currentRoom.items.map(i => ({ type: i[0], x: i[1], y: i[2], w: 24, h: 24, taken: false, bob: Math.random() * 8 }));
      attemptStarSnapshots = [];
      spikes = currentRoom.spikes.map(s => ({ x: s[0], y: s[1], w: s[2], h: s[3] }));
      hazards = (currentRoom.hazards || []).map(h => ({ x: h[0], y: h[1], w: h[2] * 2, h: h[2] * 2, r: h[2], baseX: h[0], baseY: h[1], range: h[3], speed: h[4] * hazardSpeed, axis: h[5] || "x", t: Math.random() * 6, near: false }));
      traps = (currentRoom.traps || []).map(t => ({ x: t[0], y: t[1], w: t[2], h: t[3], dir: t[4], speed: t[5] * hazardSpeed, cooldown: t[6], timer: 260 + Math.random() * 500, armed: false }));
      shop = roomIndex < rooms.length - 1 ? { x: 54, y: 392, w: 72, h: 88, used: false, item: roomIndex % 2 === 0 ? "Web Boots" : "Heart Charm" } : null;
      projectiles = [];
      shockwaves = [];
      switches = [];
      chandeliers = [];
      boss = null;
      if (currentRoom.boss) setupBoss();
      transitionFade();
      updateHud();
    }

    function setupBoss() {
      boss = { x: 846, y: 330, w: 104, h: 186, hp: 12, maxHp: 12, timer: 0, defeated: false, glasses: { x: 882, y: 372, w: 36, h: 20 } };
      switches = [
        { x: 820, y: 252, w: 38, h: 24, used: false },
        { x: 906, y: 252, w: 38, h: 24, used: false }
      ];
      chandeliers = [
        { x: 878, y: 70, targetY: 350, falling: false, fallen: false },
        { x: 922, y: 70, targetY: 350, falling: false, fallen: false }
      ];
      showToast("Boss: web the gold switches or dash into Nancy's glasses");
    }

    function startGame() {
      selectedMode = document.querySelector(".mode-card.selected").dataset.mode;
      score = 0;
      stars = 0;
      roomIndex = 0;
      endlessDifficulty = 0;
      senseUsed = false;
      slowMo = 0;
      frozen = false;
      timerStart = performance.now();
      player = makePlayer();
      showScreen("game");
      loadRoom(0);
      hud.timerWrap.style.display = selectedMode === "speedrun" ? "inline" : "none";
    }

    function startGameWithWipe() {
      if (gameState !== "start") return;
      resumeMusic();
      fade.classList.add("wipe", "on");
      setTimeout(() => {
        startGame();
        fade.classList.remove("wipe", "on");
      }, 620);
    }

    function transitionFade() {
      fade.classList.add("on");
      setTimeout(() => fade.classList.remove("on"), 360);
    }

    function update(dt) {
      if (gameState === "prologue") updateTyping(dt);
      if (gameState !== "game" || frozen) return;

      const slow = slowMo > 0 ? 0.2 : 1;
      if (slowMo > 0) slowMo -= dt;
      if (roomTransitioning) {
        updateParticles(dt);
        roomClearTimer = Math.max(0, roomClearTimer - dt);
        shake = Math.max(0, shake - dt * 0.04);
        return;
      }
      updatePlayer(dt);
      updatePlatforms(dt);
      updateHazards(dt * slow);
      updateTraps(dt * slow);
      enemies.forEach(enemy => updateEnemy(enemy, dt * slow));
      updateItems();
      updateShop();
      updateBoss(dt * slow);
      updateProjectiles(dt * slow);
      updateParticles(dt);
      checkRoomExit();
      roomClearTimer = Math.max(0, roomClearTimer - dt);
      noticeTimer = Math.max(0, noticeTimer - dt);
      if (selectedMode === "speedrun") elapsed = (performance.now() - timerStart) / 1000;
      shake = Math.max(0, shake - dt * 0.04);
      deathShakeTimer = Math.max(0, deathShakeTimer - dt);
      updateHud();
    }

    function updateTyping(dt) {
      const line = storyScenes[storyIndex].text;
      if (typingIndex >= line.length) {
        storyText.textContent = line;
        return;
      }
      typingTimer += dt;
      while (typingTimer > 22 && typingIndex < line.length) {
        typingIndex += 1;
        typingTimer -= 22;
      }
      storyText.textContent = line.slice(0, typingIndex);
    }

    function visibleStoryText() {
      const line = storyScenes[storyIndex].text;
      if (typingIndex >= line.length) return line;
      const partial = line.slice(0, typingIndex);
      const lastSpace = partial.lastIndexOf(" ");
      return lastSpace > 0 ? partial.slice(0, lastSpace) : "";
    }

    function updatePlayer(dt) {
      const accel = 0.62;
      const max = 5.6;
      const friction = player.grounded ? 0.82 : 0.94;
      const left = keys.has("a") || keys.has("ArrowLeft");
      const right = keys.has("d") || keys.has("ArrowRight");
      const down = keys.has("s") || keys.has("ArrowDown");
      if (left) { player.vx -= accel; player.facing = -1; }
      if (right) { player.vx += accel; player.facing = 1; }
      player.vx = Math.max(-max, Math.min(max, player.vx));
      player.vx *= friction;
      player.vy += down ? 0.95 : 0.52;
      player.vy = Math.min(player.vy, down ? 17 : 12);

      if (player.web) {
        const dx = player.web.x - (player.x + player.w / 2);
        const dy = player.web.y - (player.y + player.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < 30 || player.web.life <= 0) player.web = null;
        else {
          player.vx += (dx / dist) * 0.7;
          player.vy += (dy / dist) * 0.7;
          player.web.life -= 1;
          player.webStamina = Math.max(0, player.webStamina - 0.12);
        }
      }

      player.x += player.vx;
      player.y += player.vy;
      const leftLimit = selectedMode === "endless" ? 0 : Math.max(0, currentRoom.start[0] - 18);
      player.x = Math.max(leftLimit, Math.min(canvas.width - player.w, player.x));
      player.grounded = false;
      platforms.forEach(p => collidePlatform(p));
      if (player.grounded) player.jumps = 0;
      spikes.forEach(spike => { if (overlap(player, spike)) resetAttempt("Spike reset!"); });
      if (player.y > canvas.height + 80) {
        resetAttempt("Bottomless gap!");
      }
      player.invincible = Math.max(0, player.invincible - 1);
      player.flip *= 0.92;
    }

    function jump() {
      if (gameState !== "game") return;
      if (player.jumps < player.maxJumps) {
        player.vy = -11.8;
        player.jumps += 1;
        player.grounded = false;
        player.flip = player.jumps === 2 ? Math.PI * 2 : 0;
        burst(player.x + 17, player.y + 34, "#fff1b8", 10);
      }
    }

    function collidePlatform(p) {
      if (!p.solid) return;
      if (overlap(player, p) && player.vy >= 0 && player.y + player.h - player.vy <= p.y + 10) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
        if (p.vanish) p.vanish.phase += 2;
        if (roomNumber >= 3 && p.w < 300 && !p.dissolve) p.dissolve = { timer: 1500, respawn: 0 };
      }
    }

    function updatePlatforms(dt) {
      platforms.forEach(p => {
        if (p.move) {
          p.move.t += dt * 0.001 * p.move.speed;
          const offset = Math.sin(p.move.t) * p.move.range;
          if (p.move.axis === "y") p.y = p.baseY + offset;
          else p.x = p.baseX + offset;
        }
        if (p.vanish) {
          p.vanish.phase += dt * 0.012;
          p.solid = Math.sin(p.vanish.phase / 28) > -0.55;
        }
        if (p.dissolve) {
          if (p.solid) {
            p.dissolve.timer -= dt;
            if (p.dissolve.timer <= 0) {
              p.solid = false;
              p.dissolve.respawn = 1600;
            }
          } else {
            p.dissolve.respawn -= dt;
            if (p.dissolve.respawn <= 0) {
              p.solid = true;
              p.dissolve = null;
            }
          }
        }
      });
    }

    function updateHazards(dt) {
      hazards.forEach(hazard => {
        hazard.t += dt * 0.001 * hazard.speed;
        const offset = Math.sin(hazard.t) * hazard.range;
        if (hazard.axis === "y") hazard.y = hazard.baseY + offset;
        else hazard.x = hazard.baseX + offset;
        hazard.w = hazard.r * 2;
        hazard.h = hazard.r * 2;
        const hitbox = { x: hazard.x - hazard.r, y: hazard.y - hazard.r, w: hazard.w, h: hazard.h };
        if (overlap(player, hitbox)) {
          resetAttempt("Ghost hazard!");
        } else if (!hazard.near && rectDistance(player, hitbox) < 20) {
          hazard.near = true;
          violentShake(5);
        } else if (rectDistance(player, hitbox) >= 32) {
          hazard.near = false;
        }
      });
    }

    function updateTraps(dt) {
      traps.forEach(trap => {
        const crossedX = player.x + player.w > trap.x && player.x < trap.x + trap.w;
        const crossedY = player.y + player.h > trap.y && player.y < trap.y + trap.h;
        trap.armed = trap.dir === "left" || trap.dir === "right" ? crossedY : crossedX;
        trap.timer -= dt;
        if (trap.armed && trap.timer <= 0) {
          fireTrap(trap);
          trap.timer = trap.cooldown;
        }
      });
    }

    function fireTrap(trap) {
      const speed = trap.speed;
      const dirs = {
        left: [-speed, 0],
        right: [speed, 0],
        up: [0, -speed],
        down: [0, speed]
      };
      const [vx, vy] = dirs[trap.dir] || dirs.right;
      projectiles.push({ x: trap.x + trap.w / 2, y: trap.y + trap.h / 2, vx, vy, r: 7, life: 145, lethal: true, color: "#ff5570" });
      burst(trap.x + trap.w / 2, trap.y + trap.h / 2, "#ff5570", 8);
    }

    function updateEnemy(enemy, dt) {
      if (enemy.dead) return;
      const drift = enemy.sleep ? Math.sin(performance.now() / 360 + enemy.wobble) * 0.55 : 0;
      enemy.x += (enemy.vx + drift) * (dt / 16.67);
      if (Math.abs(enemy.x - enemy.baseX) > enemy.patrol) enemy.vx *= -1;
      if (!overlap(player, enemy)) return;
      const stomp = player.vy > 0 && player.y + player.h - player.vy < enemy.y + 12;
      const webDash = Math.abs(player.vx) > 7 || Math.abs(player.vy) > 10;
      if (stomp || webDash) {
        enemy.dead = true;
        score += enemy.sleep ? 240 : 140;
        player.vy = -8;
        shake = 6;
        burst(enemy.x + 17, enemy.y + 16, "#d7d3dc", 18);
      } else {
        hurt(enemy.sleep ? 2 : 1);
      }
    }

    function updateItems() {
      items.forEach(item => {
        if (item.taken || !overlap(player, item)) return;
        item.taken = true;
        if (item.type === "fish") {
          score += 70;
          showToast("+70 Food");
        }
        if (item.type === "star") {
          stars += 1;
          roomStars += 1;
          score += 50;
          showToast(`Star ${roomStars}/${currentRoom.requiredStars || 0}`);
          starBurst(item.x + 12, item.y + 12);
        }
        if (item.type === "mouse") {
          score += 130;
          player.health = Math.min(player.maxHealth, player.health + 1);
          showToast("Golden Mouse: healed 1 heart");
        }
        if (item.type === "yarn") {
          score += 90;
          player.webStamina = 100;
          showToast("Yarn: web stamina refilled");
        }
        burst(item.x + 12, item.y + 12, item.type === "yarn" ? "#a98cff" : "#ffd166", item.type === "star" ? 8 : 16);
      });
    }

    function updateShop() {
      if (!shop || shop.used || !overlap(player, shop)) return;
      if (stars < 2) {
        noticeText = "Need 2 stars to buy upgrade";
        noticeTimer = 900;
        return;
      }
      stars -= 2;
      shop.used = true;
      if (shop.item === "Web Boots") {
        player.webStamina = 100;
        player.maxJumps = 3;
        showToast("Bought Web Boots: triple jump unlocked");
      } else {
        player.maxHealth += 1;
        player.health = player.maxHealth;
        showToast("Bought Heart Charm: max health up");
      }
      burst(shop.x + 35, shop.y + 30, "#ffd166", 26);
    }

    function showToast(text) {
      toast.textContent = text;
      toast.classList.add("show");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.classList.remove("show"), 1300);
    }

    function initMusic() {
      if (music.started) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      music.ctx = new AudioContext();
      music.compressor = music.ctx.createDynamicsCompressor();
      music.compressor.threshold.value = -18;
      music.compressor.knee.value = 18;
      music.compressor.ratio.value = 5;
      music.master = music.ctx.createGain();
      music.master.gain.value = 0.18;
      music.master.connect(music.compressor);
      music.compressor.connect(music.ctx.destination);
      music.nextStep = music.ctx.currentTime + 0.05;
      music.started = true;
      music.timer = setInterval(scheduleMusic, 25);
    }

    function resumeMusic() {
      initMusic();
      if (music.ctx && music.ctx.state === "suspended") music.ctx.resume();
    }

    function toggleMusic() {
      music.playing = !music.playing;
      if (hud.musicToggle) hud.musicToggle.textContent = `Music: ${music.playing ? "ON" : "OFF"}`;
      if (music.playing) resumeMusic();
      else if (music.master) music.master.gain.setTargetAtTime(0.0001, music.ctx.currentTime, 0.03);
    }

    function scheduleMusic() {
      if (!music.ctx || !music.playing) return;
      music.master.gain.setTargetAtTime(0.18, music.ctx.currentTime, 0.08);
      const stepDur = 60 / music.bpm / 4;
      while (music.nextStep < music.ctx.currentTime + 0.14) {
        playMusicStep(music.step, music.nextStep);
        music.nextStep += stepDur;
        music.step = (music.step + 1) % 32;
      }
    }

    function playMusicStep(step, time) {
      const bass = [55, 55, 65.41, 55, 82.41, 73.42, 65.41, 55];
      if (step % 2 === 0) bitSynth(bass[(step / 2) % bass.length], time, 0.09, 0.16);
      if (step % 8 === 0) kick(time);
      if (step % 8 === 4) snare(time);
      if (step % 2 === 1) tick(time, step % 4 === 1 ? 1500 : 980);
      if (step % 16 === 0) gothicOrgan([110, 130.81, 164.81, 220], time, 0.75);
      if (step % 16 === 8) gothicOrgan([98, 123.47, 146.83, 196], time, 0.75);
      if (step % 7 === 0) glitchStab(time);
    }

    function makeGain(time, level, decay) {
      const gain = music.ctx.createGain();
      gain.gain.setValueAtTime(level, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      gain.connect(music.master);
      return gain;
    }

    function bitSynth(freq, time, decay, level) {
      const osc = music.ctx.createOscillator();
      const shaper = music.ctx.createWaveShaper();
      shaper.curve = distortionCurve(280);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, time + decay);
      osc.connect(shaper);
      shaper.connect(makeGain(time, level, decay));
      osc.start(time);
      osc.stop(time + decay + 0.02);
    }

    function gothicOrgan(freqs, time, decay) {
      const gain = makeGain(time, 0.07, decay);
      freqs.forEach((freq, i) => {
        const osc = music.ctx.createOscillator();
        osc.type = i % 2 ? "triangle" : "square";
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.value = (i - 1.5) * 5;
        osc.connect(gain);
        osc.start(time);
        osc.stop(time + decay);
      });
    }

    function kick(time) {
      const osc = music.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
      osc.connect(makeGain(time, 0.34, 0.16));
      osc.start(time);
      osc.stop(time + 0.18);
    }

    function snare(time) {
      noiseHit(time, 0.13, 0.18, 900);
      bitSynth(180, time, 0.08, 0.05);
    }

    function tick(time, freq) {
      const osc = music.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);
      osc.connect(makeGain(time, 0.055, 0.035));
      osc.start(time);
      osc.stop(time + 0.04);
    }

    function glitchStab(time) {
      bitSynth(220 + Math.random() * 180, time, 0.045, 0.08);
      noiseHit(time, 0.04, 0.06, 2200);
    }

    function noiseHit(time, decay, level, filterFreq) {
      const length = Math.max(1, Math.floor(music.ctx.sampleRate * decay));
      const buffer = music.ctx.createBuffer(1, length, music.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = music.ctx.createBufferSource();
      const filter = music.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.9;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(makeGain(time, level, decay));
      source.start(time);
    }

    function distortionCurve(amount) {
      const n = 256;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.max(-0.75, Math.min(0.75, ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x))));
      }
      return curve;
    }

    function resetPlayer(text = "Try again!") {
      hurt(1);
      player.x = currentRoom.start[0];
      player.y = currentRoom.start[1];
      player.vx = 0;
      player.vy = 0;
      player.web = null;
      shake = 8;
      noticeText = text;
      noticeTimer = 900;
      burst(player.x + 18, player.y + 18, "#ff5570", 18);
    }

    function resetAttempt(text = "Instant reset!") {
      if (deathShakeTimer > 0 || roomTransitioning || frozen) return;
      roomStars = 0;
      items.forEach(item => {
        if (item.type === "star") item.taken = false;
      });
      projectiles = projectiles.filter(p => !p.lethal);
      player.x = currentRoom.start[0];
      player.y = currentRoom.start[1];
      player.vx = 0;
      player.vy = 0;
      player.web = null;
      player.invincible = 50;
      violentShake(14);
      noticeText = text;
      noticeTimer = 950;
      showToast("Attempt reset: collect all 3 stars again");
      burst(player.x + 18, player.y + 18, "#ff5570", 32);
    }

    function violentShake(amount = 14) {
      shake = Math.max(shake, amount);
      deathShakeTimer = 200;
    }

    function updateBoss(dt) {
      if (!boss || boss.defeated) return;
      boss.timer += dt;
      boss.glasses.x = boss.x + 36;
      boss.glasses.y = boss.y + 42;
      if (boss.timer > 1200) {
        boss.timer = 0;
        const attack = Math.floor(Math.random() * 3);
        if (attack === 0) throwYarn();
        if (attack === 1) summonSleepCats();
        if (attack === 2) caneSlam();
      }
      switches.forEach((sw, i) => {
        if (!sw.used && overlap(player, sw)) {
          triggerBossSwitch(i);
        }
      });
      chandeliers.forEach(ch => {
        if (ch.falling && !ch.fallen) {
          ch.y += 9;
          if (ch.y >= ch.targetY) {
            ch.fallen = true;
            ch.falling = false;
            if (Math.abs(ch.x - boss.x - 52) < 100) damageBoss(4);
            shake = 14;
            burst(ch.x, ch.y, "#fff1b8", 28);
          }
        }
      });
      if (overlap(player, boss.glasses) && (Math.abs(player.vx) > 7 || Math.abs(player.vy) > 8 || player.web)) damageBoss(1);
      if (overlap(player, boss)) hurt(1);
    }

    function triggerBossSwitch(index) {
      const sw = switches[index];
      if (!sw || sw.used) return;
      sw.used = true;
      chandeliers[index].falling = true;
      noticeText = "Chandelier drop!";
      noticeTimer = 900;
      burst(sw.x + sw.w / 2, sw.y, "#ffd166", 18);
    }

    function throwYarn() {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      projectiles.push({ x: boss.x + 24, y: boss.y + 82, vx: dx / d * 5, vy: dy / d * 5, r: 12, life: 220 });
    }

    function summonSleepCats() {
      enemies.push({ x: 980, y: 472, w: 34, h: 34, baseX: 980, patrol: 180, vx: -1.55, sleep: true, dead: false, wobble: Math.random() * 9 });
      enemies.push({ x: 70, y: 472, w: 34, h: 34, baseX: 70, patrol: 160, vx: 1.45, sleep: true, dead: false, wobble: Math.random() * 9 });
    }

    function caneSlam() {
      shockwaves.push({ x: boss.x, y: 500, vx: -5, w: 34, h: 16, life: 170 });
      shockwaves.push({ x: boss.x, y: 500, vx: -7, w: 34, h: 16, life: 170 });
      shake = 12;
    }

    function damageBoss(amount) {
      if (!boss || boss.defeated) return;
      boss.hp -= amount;
      score += amount * 260;
      shake = 10;
      burst(boss.glasses.x + 18, boss.glasses.y, "#ffec99", 22);
      player.vx *= -0.7;
      player.vy = -8;
      if (boss.hp <= 0) defeatNancy();
    }

    function updateProjectiles(dt) {
      projectiles.forEach(p => {
        p.x += p.vx * (dt / 16.67);
        p.y += p.vy * (dt / 16.67);
        p.life -= 1;
        if (circleRect(p, player)) {
          p.life = 0;
          resetAttempt(p.lethal ? "Trap shot!" : "Yarn hit!");
        }
      });
      projectiles = projectiles.filter(p => p.life > 0);
      shockwaves.forEach(w => {
        w.x += w.vx * (dt / 16.67);
        w.life -= 1;
        if (overlap(player, w)) hurt(1);
      });
      shockwaves = shockwaves.filter(w => w.life > 0);
    }

    function defeatNancy() {
      boss.defeated = true;
      frozen = true;
      shake = 18;
      burst(boss.x + 50, boss.y + 80, "#fff1b8", 90);
      modal.classList.add("show");
    }

    function hurt(amount) {
      if (player.invincible > 0 || frozen) return;
      player.health -= amount;
      player.invincible = 70;
      shake = 8;
      burst(player.x + 17, player.y + 17, "#ff5570", 14);
      if (player.health <= 0) {
        player.health = player.maxHealth;
        score = Math.max(0, score - 300);
        loadRoom(roomIndex);
      }
    }

    function shootWeb() {
      if (gameState !== "game" || player.webStamina < 12) return;
      if (boss && !boss.defeated) {
        const hitSwitch = switches.findIndex(sw => !sw.used && pointInRect(mouse.x, mouse.y, sw, 22));
        if (hitSwitch >= 0) {
          triggerBossSwitch(hitSwitch);
          player.webStamina = Math.max(0, player.webStamina - 10);
          burst(mouse.x, mouse.y, "#ffd166", 14);
          return;
        }
        if (pointInRect(mouse.x, mouse.y, boss.glasses, 26)) {
          player.web = { x: boss.glasses.x + boss.glasses.w / 2, y: boss.glasses.y + boss.glasses.h / 2, life: 44 };
          damageBoss(1);
          player.webStamina = Math.max(0, player.webStamina - 14);
          return;
        }
      }
      const target = findWebTarget(mouse.x, mouse.y);
      if (!target) {
        burst(player.x + 17, player.y + 17, "#a98cff", 6);
        return;
      }
      player.web = { x: target.x, y: target.y, life: 80 };
      player.webStamina -= 12;
      burst(target.x, target.y, "#a98cff", 8);
    }

    function findWebTarget(x, y) {
      for (const p of platforms) {
        if (p.solid && x >= p.x - 8 && x <= p.x + p.w + 8 && y >= p.y - 16 && y <= p.y + p.h + 16) return { x, y: Math.min(y, p.y) };
      }
      if (y < 130) return { x, y };
      return null;
    }

    function pointInRect(x, y, rect, pad = 0) {
      return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
    }

    function activateSense() {
      if (senseUsed || gameState !== "game") return;
      senseUsed = true;
      slowMo = 5000;
      webOverlay.classList.remove("show");
      void webOverlay.offsetWidth;
      webOverlay.classList.add("show");
      shake = 10;
    }

    function checkRoomExit() {
      if (roomTransitioning) return;
      if (player.x + player.w > currentRoom.exit[0] && player.y + player.h > currentRoom.exit[1] - 40) {
        const needed = currentRoom.requiredStars || 0;
        if (!currentRoom.boss && roomStars < needed) {
          noticeText = `Collect ${needed - roomStars} more star${needed - roomStars === 1 ? "" : "s"} to open the portal`;
          noticeTimer = 1000;
          player.x = currentRoom.exit[0] - player.w - 16;
          player.vx = -4;
          shake = 4;
          return;
        }
        if (selectedMode === "endless") {
          beginRoomClear(() => {
            endlessDifficulty += 1;
            loadRoom((roomIndex + 1) % 4);
          });
        } else if (roomIndex < rooms.length - 1) {
          beginRoomClear(() => loadRoom(roomIndex + 1));
        } else if (boss && !boss.defeated) {
          noticeText = "Defeat Nancy first!";
          noticeTimer = 1200;
          player.x = currentRoom.exit[0] - player.w - 14;
          player.vx = -3;
          shake = 5;
        } else {
          beginRoomClear(() => showScreen("ending"));
        }
      }
    }

    function beginRoomClear(next) {
      roomTransitioning = true;
      roomClearTimer = 900;
      score += 100 + roomNumber * 25;
      showToast("ROOM CLEAR!");
      burst(currentRoom.exit[0] + 22, currentRoom.exit[1] + 44, "#7cf4a5", 36);
      setTimeout(() => fade.classList.add("wipe", "on"), 320);
      setTimeout(() => {
        next();
        fade.classList.remove("wipe", "on");
      }, 900);
    }

    function draw() {
      if (gameState === "prologue") drawPrologue();
      if (gameState !== "game") return;
      const sx = shake ? (Math.random() - 0.5) * shake : 0;
      const sy = shake ? (Math.random() - 0.5) * shake : 0;
      ctx.save();
      ctx.translate(sx, sy);
      if (slowMo > 0) ctx.filter = "grayscale(1) contrast(1.15)";
      drawRoom();
      drawPlatforms();
      drawSpikes();
      drawHazards();
      drawTraps();
      drawItems();
      drawShop();
      enemies.forEach(drawEnemy);
      drawBoss();
      drawSwitchesAndChandeliers();
      drawProjectiles();
      drawWeb();
      drawPlayer();
      drawParticles();
      drawAim();
      ctx.filter = "none";
      ctx.restore();
      drawBossBar();
      drawStamina();
      drawNotice();
      drawRoomClear();
    }

    function drawPrologue() {
      const time = (performance.now() - storySceneStart) / 1000;
      sctx.clearRect(0, 0, storyCanvas.width, storyCanvas.height);
      if (storyIndex === 0) {
        sctx.fillStyle = "#000";
        sctx.fillRect(0, 0, storyCanvas.width, storyCanvas.height);
      } else {
        const gradient = sctx.createRadialGradient(640, 390, 80, 640, 390, 760);
        gradient.addColorStop(0, storyIndex === 1 ? "#241426" : "#101730");
        gradient.addColorStop(0.54, "#080915");
        gradient.addColorStop(1, "#000");
        sctx.fillStyle = gradient;
        sctx.fillRect(0, 0, storyCanvas.width, storyCanvas.height);
        drawCutsceneDust(time);
        drawCutsceneMansionLines();
      }
      if (storyIndex === 3) drawElderPuff(time);
      if (storyFade > 0) {
        sctx.fillStyle = `rgba(2,2,10,${storyFade})`;
        sctx.fillRect(0, 0, storyCanvas.width, storyCanvas.height);
        storyFade = Math.max(0, storyFade - 0.045);
      }
    }

    function drawCutsceneDust(t) {
      for (let i = 0; i < 70; i += 1) {
        const x = (i * 173 + Math.sin(t + i) * 18) % 1280;
        const y = (i * 91 + t * 22) % 720;
        sctx.fillStyle = i % 3 ? "rgba(255,209,102,0.22)" : "rgba(124,244,165,0.2)";
        sctx.beginPath();
        sctx.arc(x, y, 1.5 + (i % 4) * 0.5, 0, Math.PI * 2);
        sctx.fill();
      }
    }

    function drawCutsceneMansionLines() {
      sctx.strokeStyle = "rgba(255,255,255,0.07)";
      sctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 64) {
        sctx.beginPath();
        sctx.moveTo(x, 0);
        sctx.lineTo(x, 720);
        sctx.stroke();
      }
      for (let y = 0; y < 720; y += 64) {
        sctx.beginPath();
        sctx.moveTo(0, y);
        sctx.lineTo(1280, y);
        sctx.stroke();
      }
    }

    function drawElderPuff(t) {
      if (t > 1.2) return;
      const alpha = Math.max(0, 1 - t / 1.2);
      for (let i = 0; i < 38; i += 1) {
        const angle = (Math.PI * 2 * i) / 38;
        const dist = 30 + t * 160 + (i % 5) * 8;
        const x = 1040 + Math.cos(angle) * dist;
        const y = 450 + Math.sin(angle) * dist * 0.6;
        sctx.fillStyle = `rgba(184,216,255,${alpha * 0.5})`;
        sctx.beginPath();
        sctx.arc(x, y, 4 + (i % 4), 0, Math.PI * 2);
        sctx.fill();
      }
    }

    function drawAbandonment(t) {
      drawStorySky("#0b1026", "#211827");
      drawFullMoon(1050, 92, 54, 1);
      drawStoryMansion(690, 158, 0.72);
      drawStoryGround("#182019");
      drawRain();
      const carX = t < 2.3 ? -240 + t * 250 : t < 4.2 ? 335 : 335 + (t - 4.2) * 330;
      drawCar(carX, 515);
      if (t > 2.1 && t < 4.2) drawPeter(480, 488, t);
      if (t > 2.5) {
        const drop = Math.min(1, Math.max(0, (t - 2.6) / 0.8));
        drawKittyBox(548, 532 - (1 - drop) * 60, t);
      }
      sctx.fillStyle = "rgba(0,0,0,0.28)";
      sctx.fillRect(0, 600, storyCanvas.width, 120);
    }

    function drawWhisper(t) {
      drawStorySky("#070b1c", "#142943");
      drawStarsStory(t);
      drawParallaxHills(t);
      drawStreetlamp(690, 352, t);
      const kittyX = Math.min(520, 120 + t * 120);
      drawStoryCat(kittyX, 540 + Math.sin(t * 8) * 3, 42, "#fff0d0", 1, false);
      drawStoryCat(735, 540 + Math.sin(t * 4) * 2, 46, "#a99f9a", -1, true);
      drawMagicTrail(t);
      drawStoryGround("#10291d");
    }

    function drawJumpScare(t) {
      drawStorySky("#080815", "#171022");
      const blink = Math.abs(Math.sin(t * 1.3)) > 0.82 ? 0.14 : 1;
      drawFullMoon(980, 110, 86, blink);
      drawHugeDoor();
      drawStoryCat(566, 548 + Math.sin(t * 7) * 2, 54, "#fff0d0", 1, false);
      if (Math.sin(t * 9) > 0.72) {
        sctx.fillStyle = "rgba(255,255,255,0.62)";
        sctx.fillRect(0, 0, storyCanvas.width, storyCanvas.height);
      }
      const reveal = Math.min(1, Math.max(0, (t - 1.1) / 1.2));
      if (reveal > 0) {
        drawNancyDoorEyes(reveal, t);
        drawNancyShadowStory(reveal, t);
      }
      drawStoryGround("#171018");
    }

    function drawInstructionsScene(t) {
      drawStorySky("#081128", "#111d3a");
      drawGridMap(t);
      drawControlKey(250, 244, "A", t);
      drawControlKey(310, 244, "D", t + 0.2);
      drawControlKey(280, 184, "W", t + 0.4);
      drawControlKey(280, 306, "S", t + 0.6);
      drawMouseDemo(805, 270, t);
      drawStoryCat(540, 500 + Math.sin(t * 5) * 4, 48, "#fff0d0", 1, false);
      sctx.strokeStyle = "rgba(232,220,255,0.8)";
      sctx.lineWidth = 4;
      sctx.beginPath();
      sctx.moveTo(565, 510);
      sctx.quadraticCurveTo(660, 365 + Math.sin(t * 3) * 16, 805, 270);
      sctx.stroke();
      drawStoryGround("#10291d");
    }

    function drawStorySky(top, bottom) {
      const gradient = sctx.createLinearGradient(0, 0, 0, storyCanvas.height);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      sctx.fillStyle = gradient;
      sctx.fillRect(0, 0, storyCanvas.width, storyCanvas.height);
    }

    function drawStoryGround(color) {
      sctx.fillStyle = color;
      sctx.fillRect(0, 586, storyCanvas.width, 134);
      sctx.fillStyle = "rgba(124,244,165,0.16)";
      for (let x = 0; x < storyCanvas.width; x += 26) {
        sctx.fillRect(x, 578 + Math.sin(x) * 3, 16, 8);
      }
    }

    function drawRain() {
      sctx.strokeStyle = "rgba(178,210,255,0.48)";
      sctx.lineWidth = 2;
      rain.forEach(drop => {
        drop.y += drop.speed;
        drop.x += 2.4;
        if (drop.y > 720) {
          drop.y = -40;
          drop.x = Math.random() * 1280;
        }
        sctx.beginPath();
        sctx.moveTo(drop.x, drop.y);
        sctx.lineTo(drop.x - 8, drop.y + drop.len);
        sctx.stroke();
      });
    }

    function drawFullMoon(x, y, r, eyeOpen) {
      sctx.fillStyle = "#fff0b2";
      sctx.beginPath();
      sctx.arc(x, y, r, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = "#20162d";
      sctx.beginPath();
      sctx.ellipse(x, y, r * 0.42, Math.max(3, r * 0.22 * eyeOpen), 0, 0, Math.PI * 2);
      sctx.fill();
      if (eyeOpen > 0.3) {
        sctx.fillStyle = "#ffd166";
        sctx.beginPath();
        sctx.arc(x, y, r * 0.1, 0, Math.PI * 2);
        sctx.fill();
      }
    }

    function drawStoryMansion(x, y, scale) {
      sctx.save();
      sctx.translate(x, y);
      sctx.scale(scale, scale);
      sctx.fillStyle = "#211d3a";
      sctx.beginPath();
      sctx.moveTo(-330, 160);
      sctx.lineTo(0, -60);
      sctx.lineTo(330, 160);
      sctx.closePath();
      sctx.fill();
      sctx.fillStyle = "#17152e";
      roundStoryRect(-290, 150, 580, 330, 24);
      sctx.fill();
      sctx.fillStyle = "#121126";
      roundStoryRect(-250, 80, 82, 400, 18);
      sctx.fill();
      roundStoryRect(168, 80, 82, 400, 18);
      sctx.fill();
      sctx.fillStyle = "#ffd166";
      [-170, 0, 170].forEach(wx => {
        roundStoryRect(wx - 24, 220, 48, 72, 14);
        sctx.fill();
      });
      sctx.fillStyle = "#080812";
      roundStoryRect(-42, 330, 84, 150, 34);
      sctx.fill();
      sctx.restore();
    }

    function drawCar(x, y) {
      sctx.fillStyle = "#06070c";
      roundStoryRect(x, y, 220, 58, 18);
      sctx.fill();
      sctx.fillStyle = "#15192b";
      roundStoryRect(x + 42, y - 38, 112, 46, 16);
      sctx.fill();
      sctx.fillStyle = "#a4c7ff";
      sctx.fillRect(x + 58, y - 28, 36, 24);
      sctx.fillRect(x + 102, y - 28, 34, 24);
      sctx.fillStyle = "#fff0a5";
      sctx.fillRect(x + 205, y + 16, 22, 14);
      sctx.fillStyle = "#111";
      [x + 45, x + 172].forEach(wx => {
        sctx.beginPath();
        sctx.arc(wx, y + 58, 24, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = "#555";
        sctx.beginPath();
        sctx.arc(wx, y + 58, 10, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = "#111";
      });
    }

    function drawPeter(x, y, t) {
      const bob = Math.sin(t * 10) * 4;
      sctx.strokeStyle = "#07070b";
      sctx.lineWidth = 10;
      sctx.beginPath();
      sctx.moveTo(x, y - 52 + bob);
      sctx.lineTo(x, y);
      sctx.moveTo(x, y - 24 + bob);
      sctx.lineTo(x - 32, y - 6);
      sctx.moveTo(x, y - 24 + bob);
      sctx.lineTo(x + 28, y - 6);
      sctx.moveTo(x, y);
      sctx.lineTo(x - 16, y + 42);
      sctx.moveTo(x, y);
      sctx.lineTo(x + 16, y + 42);
      sctx.stroke();
      sctx.fillStyle = "#09090f";
      sctx.beginPath();
      sctx.arc(x, y - 76 + bob, 20, 0, Math.PI * 2);
      sctx.fill();
    }

    function drawKittyBox(x, y, t) {
      sctx.fillStyle = "#a46c3f";
      sctx.fillRect(x - 48, y, 96, 60);
      sctx.fillStyle = "#7c4a2b";
      sctx.fillRect(x - 48, y, 96, 9);
      sctx.fillStyle = "#fff0d0";
      sctx.beginPath();
      sctx.moveTo(x - 20, y + 6);
      sctx.lineTo(x - 8, y - 18 - Math.sin(t * 6) * 4);
      sctx.lineTo(x + 4, y + 6);
      sctx.moveTo(x + 10, y + 6);
      sctx.lineTo(x + 22, y - 16 + Math.sin(t * 5) * 4);
      sctx.lineTo(x + 32, y + 6);
      sctx.fill();
    }

    function drawStarsStory(t) {
      sctx.fillStyle = "rgba(255,255,255,0.74)";
      for (let i = 0; i < 75; i += 1) {
        const x = (i * 173 + Math.sin(t + i) * 7) % 1280;
        const y = 38 + (i * 59) % 320;
        sctx.fillRect(x, y, 2, 2);
      }
    }

    function drawParallaxHills(t) {
      [["#152f3f", 0.12, 515], ["#1a463f", 0.22, 570], ["#123322", 0.34, 610]].forEach(([color, speed, yBase]) => {
        sctx.fillStyle = color;
        sctx.beginPath();
        sctx.moveTo(0, 720);
        for (let x = -80; x <= 1360; x += 80) {
          const y = yBase + Math.sin(x * 0.012 + t * speed * 10) * 34;
          sctx.lineTo(x, y);
        }
        sctx.lineTo(1280, 720);
        sctx.closePath();
        sctx.fill();
      });
    }

    function drawStreetlamp(x, y, t) {
      sctx.strokeStyle = "#18231f";
      sctx.lineWidth = 10;
      sctx.beginPath();
      sctx.moveTo(x, y);
      sctx.lineTo(x, 586);
      sctx.stroke();
      sctx.fillStyle = "#87ff9a";
      sctx.beginPath();
      sctx.arc(x, y, 28 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = "rgba(135,255,154,0.16)";
      sctx.beginPath();
      sctx.ellipse(x, y + 110, 140, 210, 0, 0, Math.PI * 2);
      sctx.fill();
    }

    function drawMagicTrail(t) {
      magicBits.forEach(bit => {
        const p = (t * 0.18 + bit.seed) % 1;
        const x = 760 + p * 330 + Math.sin(bit.seed + t * 3) * 32;
        const y = 520 - p * 430 + Math.cos(bit.seed + t * 2) * 18;
        sctx.fillStyle = `rgba(124,244,165,${1 - p})`;
        sctx.beginPath();
        sctx.arc(x, y, bit.size, 0, Math.PI * 2);
        sctx.fill();
      });
    }

    function drawHugeDoor() {
      sctx.fillStyle = "#100a18";
      roundStoryRect(390, 130, 500, 540, 36);
      sctx.fill();
      sctx.fillStyle = "#23162c";
      roundStoryRect(424, 170, 432, 460, 28);
      sctx.fill();
      sctx.fillStyle = "#09070f";
      roundStoryRect(502, 220, 276, 220, 20);
      sctx.fill();
      sctx.fillStyle = "#ffd166";
      sctx.beginPath();
      sctx.arc(818, 426, 12, 0, Math.PI * 2);
      sctx.fill();
    }

    function drawNancyDoorEyes(reveal, t) {
      sctx.fillStyle = `rgba(255,35,76,${reveal})`;
      [590, 690].forEach(x => {
        sctx.beginPath();
        sctx.ellipse(x, 320 + Math.sin(t * 4) * 3, 42 * reveal, 16 * reveal, 0, 0, Math.PI * 2);
        sctx.fill();
      });
      sctx.shadowColor = "#ff234c";
      sctx.shadowBlur = 30;
      sctx.fill();
      sctx.shadowBlur = 0;
    }

    function drawNancyShadowStory(reveal, t) {
      sctx.fillStyle = `rgba(0,0,0,${0.72 * reveal})`;
      sctx.save();
      sctx.translate(640, 580);
      const scale = reveal * (1.25 + Math.sin(t * 2) * 0.04);
      sctx.scale(scale, scale);
      sctx.beginPath();
      sctx.ellipse(0, -170, 130, 210, 0, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillRect(-65, -210, 130, 260);
      sctx.restore();
    }

    function drawGridMap(t) {
      sctx.strokeStyle = "rgba(124,244,165,0.2)";
      sctx.lineWidth = 2;
      for (let x = 80; x < 1200; x += 70) {
        sctx.beginPath();
        sctx.moveTo(x + Math.sin(t) * 5, 80);
        sctx.lineTo(x, 610);
        sctx.stroke();
      }
      for (let y = 110; y < 610; y += 60) {
        sctx.beginPath();
        sctx.moveTo(80, y);
        sctx.lineTo(1200, y + Math.cos(t) * 4);
        sctx.stroke();
      }
      sctx.fillStyle = "rgba(12,13,32,0.68)";
      roundStoryRect(120, 130, 1040, 430, 26);
      sctx.fill();
    }

    function drawControlKey(x, y, label, t) {
      const lift = Math.sin(t * 4) * 5;
      sctx.fillStyle = "#fff0a5";
      roundStoryRect(x, y + lift, 48, 48, 12);
      sctx.fill();
      sctx.fillStyle = "#231424";
      sctx.font = "bold 24px monospace";
      sctx.textAlign = "center";
      sctx.fillText(label, x + 24, y + 31 + lift);
      sctx.textAlign = "left";
    }

    function drawMouseDemo(x, y, t) {
      sctx.fillStyle = "#e8dcff";
      roundStoryRect(x, y, 74, 108, 32);
      sctx.fill();
      sctx.strokeStyle = "#231424";
      sctx.lineWidth = 4;
      sctx.beginPath();
      sctx.moveTo(x + 37, y + 8);
      sctx.lineTo(x + 37, y + 44);
      sctx.stroke();
      const click = Math.sin(t * 5) > 0.45;
      sctx.fillStyle = click ? "#ff8cc6" : "#a98cff";
      sctx.beginPath();
      sctx.arc(x + 37, y + 155, click ? 17 : 11, 0, Math.PI * 2);
      sctx.fill();
      sctx.strokeStyle = "#e8dcff";
      sctx.beginPath();
      sctx.moveTo(x + 37, y + 54);
      sctx.lineTo(x + 37, y + 155);
      sctx.stroke();
    }

    function drawStoryCat(x, y, size, color, facing, rugged) {
      sctx.save();
      sctx.translate(x + size / 2, y + size / 2);
      sctx.scale(facing, 1);
      sctx.fillStyle = color;
      roundStoryRect(-size * 0.42, -size * 0.26, size * 0.84, size * 0.7, 6);
      sctx.fill();
      sctx.beginPath();
      sctx.moveTo(-size * 0.36, -size * 0.25);
      sctx.lineTo(-size * 0.18, -size * 0.68);
      sctx.lineTo(-size * 0.02, -size * 0.25);
      sctx.moveTo(size * 0.36, -size * 0.25);
      sctx.lineTo(size * 0.18, -size * 0.68);
      sctx.lineTo(size * 0.02, -size * 0.25);
      sctx.fill();
      sctx.fillStyle = rugged ? "#342b2e" : "#1c1520";
      sctx.fillRect(-size * 0.16, -size * 0.05, 5, 5);
      sctx.fillRect(size * 0.1, -size * 0.05, 5, 5);
      sctx.fillStyle = "#ee7fa8";
      sctx.fillRect(-2, size * 0.1, 5, 4);
      if (rugged) {
        sctx.strokeStyle = "#5e5557";
        sctx.lineWidth = 3;
        sctx.beginPath();
        sctx.moveTo(-size * 0.26, size * 0.22);
        sctx.lineTo(size * 0.18, size * 0.36);
        sctx.stroke();
      }
      sctx.restore();
    }

    function roundStoryRect(x, y, w, h, r) {
      sctx.beginPath();
      sctx.moveTo(x + r, y);
      sctx.arcTo(x + w, y, x + w, y + h, r);
      sctx.arcTo(x + w, y + h, x, y + h, r);
      sctx.arcTo(x, y + h, x, y, r);
      sctx.arcTo(x, y, x + w, y, r);
      sctx.closePath();
    }

    function drawRoom() {
      const [base, wall, trim] = currentRoom.palette;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = wall;
      ctx.fillRect(28, 62, 984, 454);
      ctx.fillStyle = trim;
      for (let x = 64; x < 980; x += 112) {
        ctx.fillRect(x, 96, 52, 76);
        ctx.fillStyle = "rgba(255,209,102,0.85)";
        ctx.fillRect(x + 12, 112, 28, 46);
        ctx.fillStyle = trim;
      }
      drawRoomDecor(currentRoom.name);
      ctx.fillStyle = "rgba(255,241,179,0.9)";
      ctx.font = "bold 20px monospace";
      ctx.fillText(currentRoom.name, 36, 40);
      if (currentRoom.boss && boss && !boss.defeated) {
        ctx.fillStyle = "rgba(7,8,22,0.72)";
        roundRect(330, 56, 380, 44, 16);
        ctx.fill();
        ctx.fillStyle = "#fff1b8";
        ctx.font = "bold 15px Trebuchet MS";
        ctx.fillText("Shoot gold switches or web-dash Nancy's glasses", 354, 83);
      }
      const finalLocked = roomIndex === rooms.length - 1 && boss && !boss.defeated;
      const starLocked = !currentRoom.boss && roomStars < (currentRoom.requiredStars || 0);
      ctx.fillStyle = finalLocked || starLocked ? "rgba(255,85,112,0.65)" : "rgba(124,244,165,0.85)";
      roundRect(currentRoom.exit[0], currentRoom.exit[1], 44, 88, 18);
      ctx.fill();
      ctx.fillStyle = finalLocked || starLocked ? "#fff6ff" : "#173820";
      ctx.font = "bold 12px monospace";
      ctx.fillText(finalLocked || starLocked ? "LOCK" : "EXIT", currentRoom.exit[0] + 7, currentRoom.exit[1] + 48);
      if (!currentRoom.boss) {
        ctx.fillStyle = "#fff1b8";
        ctx.font = "bold 12px Trebuchet MS";
        ctx.fillText(`${roomStars}/${currentRoom.requiredStars || 0} stars`, currentRoom.exit[0] - 10, currentRoom.exit[1] - 10);
      }
    }

    function drawRoomDecor(name) {
      if (name.includes("Cozy") || name.includes("Kitchen")) {
        drawCounter(58, 420, 276); drawCounter(690, 420, 252); drawHangingPans();
      } else if (name.includes("Gallery") || name.includes("Library")) {
        for (let x = 60; x < 960; x += 150) drawBookshelf(x, 116);
      } else if (name.includes("Vault") || name.includes("Sleepwalking")) {
        drawBeds(); drawCurtains(56, 86); drawCurtains(890, 86);
      } else if (name.includes("Escalation") || name.includes("Attic") || name.includes("Endless")) {
        drawAtticBeams(); drawCrates(70, 448); drawCrates(850, 448);
      } else {
        drawCurtains(70, 82); drawCurtains(890, 82); drawNancyPortrait(); drawCandle(190, 410); drawCandle(720, 410);
      }
    }

    function drawCounter(x, y, w) {
      ctx.fillStyle = "#6d4656"; ctx.fillRect(x, y, w, 96);
      ctx.fillStyle = "#d59f70"; ctx.fillRect(x - 8, y - 12, w + 16, 16);
      ctx.fillStyle = "#2c1b2f";
      for (let i = x + 20; i < x + w - 20; i += 58) ctx.fillRect(i, y + 20, 36, 44);
    }
    function drawHangingPans() {
      ctx.strokeStyle = "#c7bdd3"; ctx.lineWidth = 3;
      [440, 490, 540].forEach((x, i) => {
        ctx.beginPath(); ctx.moveTo(x, 74); ctx.lineTo(x, 126); ctx.stroke();
        ctx.fillStyle = i === 1 ? "#b8d8ff" : "#262232";
        ctx.beginPath(); ctx.arc(x, 146, 18, 0, Math.PI * 2); ctx.fill();
      });
    }
    function drawBookshelf(x, y) {
      ctx.fillStyle = "#4a2c35"; ctx.fillRect(x, y, 96, 236);
      for (let r = 0; r < 4; r += 1) {
        ctx.fillStyle = "#d0a75d"; ctx.fillRect(x + 8, y + 20 + r * 52, 80, 6);
        for (let b = 0; b < 6; b += 1) {
          ctx.fillStyle = ["#ff8cc6", "#7cf4a5", "#ffd166", "#a98cff"][b % 4];
          ctx.fillRect(x + 12 + b * 12, y + 26 + r * 52, 8, 34);
        }
      }
    }
    function drawBeds() {
      [110, 405, 700].forEach(x => {
        ctx.fillStyle = "#281d36"; ctx.fillRect(x, 390, 190, 48);
        ctx.fillStyle = "#b8d8ff"; ctx.fillRect(x + 8, 366, 174, 44);
      });
    }
    function drawAtticBeams() {
      ctx.strokeStyle = "#3a2436"; ctx.lineWidth = 18;
      ctx.beginPath(); ctx.moveTo(28, 92); ctx.lineTo(520, 26); ctx.lineTo(1012, 92); ctx.moveTo(150, 70); ctx.lineTo(150, 516); ctx.moveTo(890, 70); ctx.lineTo(890, 516); ctx.stroke();
    }
    function drawCrates(x, y) {
      ctx.fillStyle = "#7d4a36"; ctx.fillRect(x, y, 58, 48); ctx.fillRect(x + 64, y - 34, 52, 82);
      ctx.strokeStyle = "#3d241c"; ctx.lineWidth = 4; ctx.strokeRect(x + 5, y + 5, 48, 38); ctx.strokeRect(x + 69, y - 29, 42, 72);
    }
    function drawCurtains(x, y) {
      ctx.fillStyle = "#5b1636"; ctx.fillRect(x, y, 56, 286);
      ctx.fillStyle = "#8e2c52"; for (let i = 0; i < 4; i += 1) ctx.fillRect(x + i * 14, y, 7, 286);
    }
    function drawNancyPortrait() {
      ctx.fillStyle = "#211421"; ctx.fillRect(420, 88, 200, 158);
      ctx.fillStyle = "#d0a75d"; ctx.fillRect(434, 102, 172, 130);
      ctx.fillStyle = "#171021"; ctx.fillRect(448, 116, 144, 102);
      ctx.fillStyle = "#e6d0c6"; ctx.beginPath(); ctx.arc(520, 158, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff5570"; ctx.fillRect(506, 150, 8, 7); ctx.fillRect(527, 150, 8, 7);
    }
    function drawCandle(x, y) {
      ctx.fillStyle = "#e8d8b0"; ctx.fillRect(x, y, 16, 54);
      ctx.fillStyle = "#ffcf5c"; ctx.beginPath(); ctx.ellipse(x + 8, y - 8, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    }

    function drawPlatforms() {
      platforms.forEach(p => {
        if (!p.solid) return;
        ctx.globalAlpha = p.dissolve ? Math.max(0.24, p.dissolve.timer / 1500) : p.vanish ? 0.58 + Math.sin(p.vanish.phase / 16) * 0.35 : 1;
        drawThemedPlatform(p);
        ctx.globalAlpha = 1;
      });
    }
    function drawThemedPlatform(p) {
      const name = currentRoom.name;
      if (p.h > 40) {
        ctx.fillStyle = "#20172a";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#55384d";
        ctx.fillRect(p.x, p.y, p.w, 10);
        return;
      }
      if (name.includes("Cozy") || name.includes("Kitchen")) {
        ctx.fillStyle = "#7a4f5f";
        roundRect(p.x, p.y - 10, p.w, p.h + 20, 10);
        ctx.fill();
        ctx.fillStyle = "#d59f70";
        ctx.fillRect(p.x - 6, p.y - 14, p.w + 12, 10);
        ctx.fillStyle = "#2c1b2f";
        for (let x = p.x + 18; x < p.x + p.w - 20; x += 42) ctx.fillRect(x, p.y + 8, 24, 20);
      } else if (name.includes("Gallery") || name.includes("Library")) {
        ctx.fillStyle = "#5a342f";
        roundRect(p.x, p.y - 8, p.w, p.h + 28, 8);
        ctx.fill();
        ctx.fillStyle = "#d0a75d";
        ctx.fillRect(p.x, p.y - 8, p.w, 8);
        for (let x = p.x + 12; x < p.x + p.w - 10; x += 18) {
          ctx.fillStyle = ["#ff8cc6", "#7cf4a5", "#ffd166", "#a98cff"][Math.floor(x) % 4];
          ctx.fillRect(x, p.y + 3, 10, 22);
        }
      } else if (name.includes("Vault") || name.includes("Sleepwalking")) {
        ctx.fillStyle = "#b8d8ff";
        roundRect(p.x, p.y - 10, p.w, p.h + 18, 14);
        ctx.fill();
        ctx.fillStyle = "#281d36";
        ctx.fillRect(p.x, p.y + 12, p.w, 12);
      } else if (name.includes("Escalation") || name.includes("Attic") || name.includes("Endless")) {
        ctx.fillStyle = "#7d4a36";
        roundRect(p.x, p.y - 8, p.w, p.h + 18, 6);
        ctx.fill();
        ctx.strokeStyle = "#3d241c";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x + 8, p.y + 4);
        ctx.lineTo(p.x + p.w - 8, p.y + 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#6f1e43";
        roundRect(p.x, p.y - 9, p.w, p.h + 18, 12);
        ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(p.x + 10, p.y - 5, p.w - 20, 5);
      }
    }
    function drawSpikes() {
      spikes.forEach(s => {
        ctx.fillStyle = "#4f1027"; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#ff5b76";
        for (let x = s.x; x < s.x + s.w; x += 14) {
          ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + 7, s.y - 18); ctx.lineTo(x + 14, s.y); ctx.fill();
        }
      });
    }

    function drawHazards() {
      hazards.forEach(hazard => {
        const pulse = 0.65 + Math.sin(performance.now() / 120 + hazard.t) * 0.25;
        ctx.save();
        ctx.shadowBlur = 22;
        ctx.shadowColor = "#ff8cc6";
        ctx.fillStyle = `rgba(255, 140, 198, ${0.42 + pulse * 0.28})`;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff1f7";
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5d315f";
        ctx.beginPath();
        ctx.arc(hazard.x - 5, hazard.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(hazard.x + 5, hazard.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawTraps() {
      traps.forEach(trap => {
        const charged = trap.timer < 180;
        ctx.save();
        ctx.fillStyle = charged ? "rgba(255,85,112,0.9)" : "rgba(80,32,48,0.86)";
        ctx.strokeStyle = charged ? "#fff1b8" : "rgba(255,209,102,0.45)";
        ctx.lineWidth = 2;
        roundRect(trap.x, trap.y, trap.w, trap.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        if (trap.dir === "left") {
          ctx.moveTo(trap.x + 4, trap.y + trap.h / 2);
          ctx.lineTo(trap.x + trap.w - 4, trap.y + 8);
          ctx.lineTo(trap.x + trap.w - 4, trap.y + trap.h - 8);
        } else if (trap.dir === "right") {
          ctx.moveTo(trap.x + trap.w - 4, trap.y + trap.h / 2);
          ctx.lineTo(trap.x + 4, trap.y + 8);
          ctx.lineTo(trap.x + 4, trap.y + trap.h - 8);
        } else if (trap.dir === "down") {
          ctx.moveTo(trap.x + trap.w / 2, trap.y + trap.h - 4);
          ctx.lineTo(trap.x + 4, trap.y + 6);
          ctx.lineTo(trap.x + trap.w - 4, trap.y + 6);
        } else {
          ctx.moveTo(trap.x + trap.w / 2, trap.y + 4);
          ctx.lineTo(trap.x + 4, trap.y + trap.h - 6);
          ctx.lineTo(trap.x + trap.w - 4, trap.y + trap.h - 6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }

    function drawItems() {
      items.forEach(item => {
        if (item.taken) return;
        const y = item.y + Math.sin(performance.now() / 250 + item.bob) * 5;
        if (item.type === "fish") {
          ctx.fillStyle = "#fff1b8"; ctx.beginPath(); ctx.ellipse(item.x + 12, y + 12, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#111"; ctx.fillRect(item.x + 16, y + 9, 3, 3);
        } else if (item.type === "mouse") {
          ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.ellipse(item.x + 12, y + 14, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(item.x + 2, y + 14); ctx.lineTo(item.x - 12, y + 7); ctx.stroke();
        } else if (item.type === "star") {
          ctx.fillStyle = "#fff1a8";
          drawStar(item.x + 12, y + 12, 13, 6);
          ctx.fill();
          ctx.strokeStyle = "#ffd166";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = "#a98cff"; ctx.beginPath(); ctx.arc(item.x + 12, y + 12, 13, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(item.x + 12, y + 12, 7, 0, Math.PI * 1.5); ctx.stroke();
        }
      });
    }
    function drawShop() {
      if (!shop || shop.used) return;
      ctx.fillStyle = "rgba(7,8,22,0.8)";
      roundRect(shop.x, shop.y, shop.w, shop.h, 12);
      ctx.fill();
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      roundRect(shop.x, shop.y, shop.w, shop.h, 12);
      ctx.stroke();
      ctx.fillStyle = "#fff1a8";
      ctx.font = "bold 12px monospace";
      ctx.fillText("SHOP", shop.x + 18, shop.y + 22);
      ctx.fillText("2 stars", shop.x + 14, shop.y + 45);
      ctx.fillStyle = shop.item === "Web Boots" ? "#a98cff" : "#ff8cc6";
      ctx.beginPath();
      ctx.arc(shop.x + 36, shop.y + 66, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    function drawStar(x, y, outer, inner) {
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    function drawEnemy(e) {
      if (e.dead) return;
      drawCat(e.x, e.y, e.w, e.sleep ? "#b8d8ff" : "#c995ff", e.vx > 0 ? 1 : -1, e.sleep);
      if (e.sleep) { ctx.fillStyle = "#fff2a8"; ctx.font = "18px monospace"; ctx.fillText("Z", e.x + 10, e.y - 8); }
    }
    function drawPlayer() {
      ctx.save();
      if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2) ctx.globalAlpha = 0.45;
      ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
      ctx.rotate(player.flip);
      drawCat(-player.w / 2, -player.h / 2, player.w, "#fff0d0", player.facing, false);
      ctx.restore();
    }
    function drawCat(x, y, size, color, facing, sleepy) {
      ctx.save(); ctx.translate(x + size / 2, y + size / 2); ctx.scale(facing, 1);
      ctx.fillStyle = color; ctx.fillRect(-size * 0.42, -size * 0.28, size * 0.84, size * 0.72);
      ctx.beginPath(); ctx.moveTo(-size * 0.38, -size * 0.28); ctx.lineTo(-size * 0.2, -size * 0.68); ctx.lineTo(-size * 0.04, -size * 0.28); ctx.moveTo(size * 0.38, -size * 0.28); ctx.lineTo(size * 0.2, -size * 0.68); ctx.lineTo(size * 0.04, -size * 0.28); ctx.fill();
      ctx.fillStyle = "#1c1520";
      if (sleepy) { ctx.fillRect(-size * 0.18, -size * 0.03, 9, 2); ctx.fillRect(size * 0.1, -size * 0.03, 9, 2); }
      else { ctx.fillRect(-size * 0.18, -size * 0.05, 4, 5); ctx.fillRect(size * 0.12, -size * 0.05, 4, 5); }
      ctx.fillStyle = "#ee7fa8"; ctx.fillRect(-2, size * 0.1, 4, 3);
      ctx.restore();
    }
    function drawBoss() {
      if (!boss || boss.defeated) return;
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.moveTo(boss.x + 52, boss.y); ctx.lineTo(boss.x - 95, 516); ctx.lineTo(boss.x + 190, 516); ctx.fill();
      ctx.fillStyle = "#160b1b"; roundRect(boss.x, boss.y, boss.w, boss.h, 32); ctx.fill();
      ctx.fillStyle = "#e6d0c6"; ctx.beginPath(); ctx.arc(boss.x + 52, boss.y + 42, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff5570"; roundRect(boss.glasses.x, boss.glasses.y, boss.glasses.w, boss.glasses.h, 8); ctx.fill();
      ctx.strokeStyle = "#f4d7ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(boss.x + 14, boss.y + 100); ctx.lineTo(boss.x - 24, boss.y + 176); ctx.stroke();
    }
    function drawSwitchesAndChandeliers() {
      switches.forEach(sw => { ctx.fillStyle = sw.used ? "#777" : "#ffd166"; roundRect(sw.x, sw.y, sw.w, sw.h, 6); ctx.fill(); });
      chandeliers.forEach(ch => {
        ctx.strokeStyle = "#c9a25d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ch.x, 62); ctx.lineTo(ch.x, ch.y); ctx.stroke();
        ctx.fillStyle = "#c9a25d"; ctx.fillRect(ch.x - 34, ch.y, 68, 8);
        ctx.fillStyle = "#fff2a8"; [-24, 0, 24].forEach(o => { ctx.beginPath(); ctx.arc(ch.x + o, ch.y + 16, 8, 0, Math.PI * 2); ctx.fill(); });
      });
    }
    function drawProjectiles() {
      projectiles.forEach(p => {
        ctx.save();
        ctx.shadowBlur = p.lethal ? 18 : 8;
        ctx.shadowColor = p.color || "#a98cff";
        ctx.fillStyle = p.color || "#a98cff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      shockwaves.forEach(w => { ctx.fillStyle = "#ffcf5c"; roundRect(w.x, w.y, w.w, w.h, 8); ctx.fill(); });
    }
    function drawWeb() {
      if (!player.web) return;
      ctx.strokeStyle = "#e8dcff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(player.x + player.w / 2, player.y + player.h / 2); ctx.lineTo(player.web.x, player.web.y); ctx.stroke();
    }
    function drawAim() {
      ctx.strokeStyle = "rgba(255,255,255,0.72)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2); ctx.moveTo(mouse.x - 14, mouse.y); ctx.lineTo(mouse.x + 14, mouse.y); ctx.moveTo(mouse.x, mouse.y - 14); ctx.lineTo(mouse.x, mouse.y + 14); ctx.stroke();
    }
    function drawBossBar() {
      if (!boss || boss.defeated || gameState !== "game") return;
      ctx.fillStyle = "rgba(0,0,0,0.62)"; roundRect(250, 18, 540, 28, 14); ctx.fill();
      ctx.fillStyle = "#ff5570"; roundRect(256, 24, 528 * (boss.hp / boss.maxHp), 16, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; ctx.fillText("NANCY", 520, 38); ctx.textAlign = "left";
    }
    function drawStamina() {
      if (gameState !== "game") return;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; roundRect(20, 548, 180, 16, 8); ctx.fill();
      ctx.fillStyle = "#a98cff"; roundRect(24, 552, 172 * (player.webStamina / 100), 8, 4); ctx.fill();
    }
    function drawNotice() {
      if (gameState !== "game" || noticeTimer <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, noticeTimer / 220);
      ctx.fillStyle = "rgba(7,8,22,0.86)";
      roundRect(365, 74, 310, 54, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,241,179,0.55)";
      ctx.lineWidth = 3;
      roundRect(365, 74, 310, 54, 18);
      ctx.stroke();
      ctx.fillStyle = "#fff1b8";
      ctx.font = "bold 20px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(noticeText, 520, 108);
      ctx.textAlign = "left";
      ctx.restore();
    }

    function drawRoomClear() {
      if (gameState !== "game" || roomClearTimer <= 0) return;
      const progress = 1 - roomClearTimer / 900;
      const scale = 0.7 + Math.sin(progress * Math.PI) * 0.38;
      ctx.save();
      ctx.globalAlpha = Math.sin(progress * Math.PI);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(7,8,22,0.48)";
      roundRect(-205, -54, 410, 108, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(124,244,165,0.72)";
      ctx.lineWidth = 4;
      roundRect(-205, -54, 410, 108, 26);
      ctx.stroke();
      ctx.fillStyle = "#fff1b8";
      ctx.font = "900 46px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText("ROOM CLEAR!", 0, 15);
      ctx.restore();
    }

    function drawParticles() {
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.glow || 0;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    function burst(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.8) * 6, life: 34, max: 34, color, size: 3 + Math.random() * 4 });
      }
    }

    function starBurst(x, y) {
      for (let i = 0; i < 28; i += 1) {
        const angle = (Math.PI * 2 * i) / 28;
        const speed = 2.2 + Math.random() * 4.6;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 38 + Math.random() * 16,
          max: 54,
          color: i % 3 === 0 ? "#fff1b8" : i % 3 === 1 ? "#ffd166" : "#7cf4a5",
          size: 2 + Math.random() * 4,
          glow: 14
        });
      }
    }
    function updateParticles(dt) {
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life -= dt / 16.67; });
      particles = particles.filter(p => p.life > 0);
    }
    function updateHud() {
      hud.hearts.innerHTML = "";
      for (let i = 0; i < player.maxHealth; i += 1) {
        const span = document.createElement("span");
        span.className = "heart";
        span.textContent = i < player.health ? "HP" : "--";
        hud.hearts.appendChild(span);
      }
      setHudValue(hud.score, score, "score");
      setHudValue(hud.stars, `${stars} (${roomStars}/${currentRoom.requiredStars || 0})`, "stars");
      setHudValue(hud.room, roomNumber, "room");
      hud.modeName.textContent = selectedMode === "classic" ? "Classic" : selectedMode === "speedrun" ? "Speedrun" : "Endless";
      hud.timer.textContent = elapsed.toFixed(3);
      hud.sense.textContent = `Spidey Sense: ${senseUsed ? "USED" : "READY"}`;
      hud.sense.className = `badge ${senseUsed ? "used" : "ready"}`;
      const senseState = senseUsed ? "USED" : "READY";
      if (lastHud.sense !== senseState) pulseHud(hud.sense);
      lastHud.sense = senseState;
    }

    function setHudValue(el, value, key) {
      const text = String(value);
      if (String(lastHud[key]) !== text) {
        el.textContent = text;
        pulseHud(el);
        lastHud[key] = text;
      } else if (el.textContent !== text) {
        el.textContent = text;
      }
    }

    function pulseHud(el) {
      el.classList.remove("hud-pop");
      void el.offsetWidth;
      el.classList.add("hud-pop");
    }

    function overlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    function circleRect(c, r) {
      const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
      const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
      return Math.hypot(c.x - nx, c.y - ny) < c.r;
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function loop(time) {
      const dt = Math.min(34, time - lastTime || 16.67);
      lastTime = time;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }

    document.getElementById("startButton").addEventListener("click", startGameWithWipe);
    if (hud.musicToggle) hud.musicToggle.addEventListener("click", toggleMusic);
    document.getElementById("continueEnding").addEventListener("click", () => {
      modal.classList.remove("show");
      showScreen("ending");
    });
    storyNext.addEventListener("click", advanceStory);

    document.querySelectorAll(".mode-card").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".mode-card").forEach(card => card.classList.remove("selected"));
        button.classList.add("selected");
        startGameWithWipe();
      });
    });

    window.addEventListener("keydown", event => {
      if (gameState === "game" || gameState === "start") resumeMusic();
      keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(event.key)) event.preventDefault();
      if ((event.key === "Enter" || event.key === " " || event.key === "Spacebar") && gameState === "prologue") advanceStory();
      if ((event.key === "w" || event.key === "ArrowUp") && gameState === "game") jump();
      if (event.key === "Shift") activateSense();
    });
    window.addEventListener("keyup", event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
    canvas.addEventListener("mousemove", event => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener("mousedown", shootWeb);

    buildTitle();
    // Keep the game immediately playable: load straight into the menu.
    setTimeout(() => showScreen("start"), 900);
    requestAnimationFrame(loop);
