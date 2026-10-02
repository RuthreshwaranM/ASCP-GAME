/* =====================================================
   AKASA SKY RUN  -  Flappy-style game
   Everything you may want to change is in CONFIG below.
   ===================================================== */

const CONFIG = {
  // ---- Images (put files inside the "images" folder) ----
  planeImage:      "images/akasa-b737.png",  // aircraft, transparent PNG, nose pointing right
  buildingImage:   "images/building.png",    // building, transparent PNG, roof at the TOP of the picture
  backgroundImage: "images/background.png",  // full game background
  gameOverImage:   "images/gameover.png",    // picture shown in the hit popup
  backgroundScroll: false,                   // true = background slowly moves left (needs a seamless left-right image)

  // ---- Aircraft ----
  planeWidth:    90,      // size on screen (height follows the image shape)
  planeX:        90,      // how far from the left edge
  hitboxShrink:  0.28,    // 0 = full size hitbox, 0.3 = more forgiving

  // ---- Physics (feel of the game) ----
  gravity:       0.42,    // higher = falls faster
  flapPower:    -7.2,     // more negative = jumps higher
  maxFallSpeed:  9,

  // ---- Buildings ----
  buildingWidth: 78,
  gap:           175,     // opening between top and bottom building
  speed:         2.6,     // scroll speed
  spawnEvery:    95,      // frames between buildings (higher = more space)
  minTop:        90,      // how high the gap can go
  minBottom:     110,     // space kept above the ground
  speedUpEvery:  5,       // every N points the game gets a bit faster
  speedUpBy:     0.15,

  // ---- Colours ----
  skyTop:        "#2a0f4d",
  skyMid:        "#8a2f6b",
  skyBottom:     "#ff8a3d",
  groundColor:   "#1c0b30",
  groundStripe:  "#ff6a13",
  buildingColors: ["#3b1a63", "#4a2378", "#5a2d8c"],
  windowLit:     "#ffd27a",
  windowDark:    "#241040",

  groundHeight:  60
};

/* ---------------- Setup ---------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const scoreEl   = document.getElementById("score");
const menuEl    = document.getElementById("menu");
const overEl    = document.getElementById("gameover");
const finalEl   = document.getElementById("finalScore");
const bestEl    = document.getElementById("bestScore");
const bestMenu  = document.getElementById("bestMenu");

let best = 0;
try { best = Number(localStorage.getItem("akasaSkyRunBest")) || 0; } catch (e) {}
bestMenu.textContent = best;

/* ---------------- Images ---------------- */
const planeImg = new Image();
let planeReady = false;
planeImg.onload = () => { planeReady = true; };
planeImg.src = CONFIG.planeImage;

const buildingImg = new Image();
let buildingReady = false;
if (CONFIG.buildingImage) {
  buildingImg.onload = () => { buildingReady = true; };
  buildingImg.src = CONFIG.buildingImage;
}

const bgImg = new Image();
let bgReady = false, bgX = 0;
if (CONFIG.backgroundImage) {
  bgImg.onload = () => { bgReady = true; };
  bgImg.src = CONFIG.backgroundImage;
}

// popup picture (shown only if the file exists)
const overImgEl = document.getElementById("overImg");
if (CONFIG.gameOverImage) {
  overImgEl.onload = () => { overImgEl.style.display = "block"; };
  overImgEl.src = CONFIG.gameOverImage;
}

/* ---------------- Game state ---------------- */
let state = "menu";        // "menu" | "playing" | "over"
let plane, buildings, frame, score, speed, clouds, groundX;

function resetGame() {
  const ratio = planeReady ? planeImg.height / planeImg.width : 0.35;
  plane = {
    x: CONFIG.planeX,
    y: H / 2 - 40,
    w: CONFIG.planeWidth,
    h: CONFIG.planeWidth * ratio,
    vy: 0,
    angle: 0
  };
  buildings = [];
  frame = 0;
  score = 0;
  speed = CONFIG.speed;
  groundX = 0;
  scoreEl.textContent = 0;
  if (!clouds) {
    clouds = Array.from({ length: 5 }, () => ({
      x: Math.random() * W,
      y: 40 + Math.random() * 260,
      s: 0.5 + Math.random() * 0.8
    }));
  }
}

/* ---------------- Controls ---------------- */
function flap() {
  if (state === "playing") plane.vy = CONFIG.flapPower;
}

function startGame() {
  resetGame();
  menuEl.classList.add("hidden");
  overEl.classList.add("hidden");
  scoreEl.style.display = "block";
  state = "playing";
  flap();
}

function endGame() {
  state = "over";
  if (score > best) {
    best = score;
    try { localStorage.setItem("akasaSkyRunBest", best); } catch (e) {}
  }
  finalEl.textContent = score;
  bestEl.textContent = best;
  bestMenu.textContent = best;
  scoreEl.style.display = "none";
  overEl.classList.remove("hidden");
}

document.getElementById("playBtn").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (state === "playing") flap();
    else if (state === "over") startGame();
  }
});
canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); flap(); });

/* ---------------- Buildings ---------------- */
function spawnBuilding() {
  const minGapTop = CONFIG.minTop;
  const maxGapTop = H - CONFIG.groundHeight - CONFIG.minBottom - CONFIG.gap;
  const gapTop = minGapTop + Math.random() * (maxGapTop - minGapTop);
  buildings.push({
    x: W + 10,
    gapTop,
    gapBottom: gapTop + CONFIG.gap,
    color: CONFIG.buildingColors[Math.floor(Math.random() * CONFIG.buildingColors.length)],
    scored: false
  });
}

/* ---------------- Update ---------------- */
function update() {
  groundX = (groundX - speed) % 40;
  if (CONFIG.backgroundScroll && state === "playing") bgX -= speed * 0.3;
  clouds.forEach((c) => {
    c.x -= c.s * 0.5;
    if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 260; }
  });

  if (state !== "playing") return;
  frame++;

  // plane
  plane.vy = Math.min(plane.vy + CONFIG.gravity, CONFIG.maxFallSpeed);
  plane.y += plane.vy;
  plane.angle = Math.max(-0.45, Math.min(0.7, plane.vy * 0.07));

  // buildings
  if (frame % CONFIG.spawnEvery === 1) spawnBuilding();
  buildings.forEach((b) => { b.x -= speed; });
  buildings = buildings.filter((b) => b.x + CONFIG.buildingWidth > -10);

  // hitbox (a bit smaller than the picture so it feels fair)
  const sx = plane.w * CONFIG.hitboxShrink * 0.5;
  const sy = plane.h * CONFIG.hitboxShrink * 0.5;
  const hit = {
    l: plane.x + sx, r: plane.x + plane.w - sx,
    t: plane.y + sy, b: plane.y + plane.h - sy
  };

  // ground and ceiling
  if (hit.b >= H - CONFIG.groundHeight) return endGame();
  if (hit.t <= -40) plane.y = -40 - sy;

  for (const b of buildings) {
    const overlapX = hit.r > b.x && hit.l < b.x + CONFIG.buildingWidth;
    if (overlapX && (hit.t < b.gapTop || hit.b > b.gapBottom)) return endGame();

    // score when the plane passes a building
    if (!b.scored && b.x + CONFIG.buildingWidth < plane.x) {
      b.scored = true;
      score++;
      scoreEl.textContent = score;
      if (score % CONFIG.speedUpEvery === 0) speed += CONFIG.speedUpBy;
    }
  }
}

/* ---------------- Drawing ---------------- */
function drawSky() {
  if (bgReady) {
    if (CONFIG.backgroundScroll) {
      const w = bgImg.width * (H / bgImg.height);
      const x0 = ((bgX % w) + w) % w;
      for (let x = -x0; x < W; x += w) ctx.drawImage(bgImg, x, 0, w, H);
    } else {
      // "cover": fills the screen without stretching
      const s = Math.max(W / bgImg.width, H / bgImg.height);
      const dw = bgImg.width * s, dh = bgImg.height * s;
      ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, CONFIG.skyTop);
  g.addColorStop(0.55, CONFIG.skyMid);
  g.addColorStop(1, CONFIG.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  clouds.forEach((c) => {
    const r = 18 * c.s * 1.6;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.arc(c.x + r, c.y + 4, r * 0.8, 0, Math.PI * 2);
    ctx.arc(c.x - r, c.y + 6, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

// draws one building body between y1 and y2 (windows included)
function drawBuildingBody(x, y1, y2, color) {
  const w = CONFIG.buildingWidth;
  ctx.fillStyle = color;
  ctx.fillRect(x, y1, w, y2 - y1);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y1, 6, y2 - y1);

  const cols = 4, pad = 10, ww = 10, wh = 14;
  const stepX = (w - pad * 2 - ww) / (cols - 1);
  for (let y = y1 + 14; y < y2 - wh; y += 26) {
    for (let c = 0; c < cols; c++) {
      // stable "random" so windows don't flicker
      const lit = ((Math.floor(x * 0 + y) * 7 + c * 13) % 5) > 1;
      ctx.fillStyle = lit ? CONFIG.windowLit : CONFIG.windowDark;
      ctx.fillRect(x + pad + c * stepX, y, ww, wh);
    }
  }
}

function drawBuildings() {
  const w = CONFIG.buildingWidth;
  const groundY = H - CONFIG.groundHeight;

  buildings.forEach((b) => {
    if (buildingReady) {
      // image keeps its shape; roof sits at the gap, body continues to ground / top of screen
      const dh = buildingImg.height * (w / buildingImg.width);
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x, b.gapBottom, w, groundY - b.gapBottom); ctx.clip();
      ctx.drawImage(buildingImg, b.x, b.gapBottom, w, dh);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x, 0, w, b.gapTop); ctx.clip();
      ctx.translate(b.x, b.gapTop);
      ctx.scale(1, -1);
      ctx.drawImage(buildingImg, 0, 0, w, dh);
      ctx.restore();
    } else {
      // drawn buildings
      drawBuildingBody(b.x, b.gapBottom, groundY, b.color);
      ctx.fillStyle = "#1c0b30";
      ctx.fillRect(b.x - 4, b.gapBottom, w + 8, 10);              // roof lip (bottom)
      drawBuildingBody(b.x, -40, b.gapTop, b.color);
      ctx.fillStyle = "#1c0b30";
      ctx.fillRect(b.x - 4, b.gapTop - 10, w + 8, 10);            // roof lip (top)
    }
  });
}

function drawGround() {
  const y = H - CONFIG.groundHeight;
  ctx.fillStyle = CONFIG.groundColor;
  ctx.fillRect(0, y, W, CONFIG.groundHeight);
  ctx.fillStyle = CONFIG.groundStripe;
  ctx.fillRect(0, y, W, 5);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let x = groundX; x < W; x += 40) ctx.fillRect(x, y + 32, 20, 4);
}

function drawPlane() {
  const p = plane || { x: CONFIG.planeX, y: H / 2 - 40, w: CONFIG.planeWidth, h: CONFIG.planeWidth * 0.35, angle: 0 };
  // gentle bobbing on the menu screen
  const bob = state === "menu" ? Math.sin(Date.now() / 300) * 8 : 0;

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + bob);
  ctx.rotate(p.angle || 0);

  if (planeReady) {
    ctx.drawImage(planeImg, -p.w / 2, -p.h / 2, p.w, p.h);
  } else {
    // placeholder plane until your image is in the images folder
    ctx.fillStyle = "#fff4e8";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w / 2, p.h / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6a13";
    ctx.beginPath();
    ctx.moveTo(-p.w / 2 + 4, -2);
    ctx.lineTo(-p.w / 2 - 8, -p.h / 1.2);
    ctx.lineTo(-p.w / 2 + 18, -2);
    ctx.fill();
    ctx.fillRect(-6, 0, 28, 6);
  }
  ctx.restore();
}

/* ---------------- Main loop ---------------- */
// Runs at the same speed on 60Hz and 120Hz screens
let last = 0, acc = 0;
const STEP = 1000 / 60;

function loop(t) {
  acc += Math.min(t - last, 100);
  last = t;
  while (acc >= STEP) { update(); acc -= STEP; }

  drawSky();
  if (buildings) drawBuildings();
  drawGround();
  drawPlane();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame((t) => { last = t; loop(t); });
