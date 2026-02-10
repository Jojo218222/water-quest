// Water Quest - simple whack-a-mole style
const startScreen = document.getElementById("startScreen");
const gameScreen  = document.getElementById("gameScreen");
const endScreen   = document.getElementById("endScreen");

const startBtn = document.getElementById("startBtn");
const quitBtn  = document.getElementById("quitBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const backBtn  = document.getElementById("backBtn");

const roundLengthSelect = document.getElementById("roundLength");

const gridEl = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const timeEl = document.getElementById("time");
const messageEl = document.getElementById("message");

const progressFill = document.getElementById("progressFill");
const milestoneText = document.getElementById("milestoneText");

const finalLine = document.getElementById("finalLine");
const finalScoreEl = document.getElementById("finalScore");
const cleanTapsEl = document.getElementById("cleanTaps");
const dirtyTapsEl = document.getElementById("dirtyTaps");

// --- Game settings (easy to tweak)
const HOLES = 9;
const SPAWN_MIN_MS = 450;
const SPAWN_MAX_MS = 900;
const SHOW_TIME_MIN_MS = 500;
const SHOW_TIME_MAX_MS = 900;

const CLEAN_POINTS = 10;
const DIRTY_PENALTY = 15;     // points removed
const DIRTY_TIME_PENALTY = 2; // seconds removed
const MILESTONE = 100;        // for the progress bar

let score = 0;
let streak = 0;
let timeLeft = 30;

let cleanTaps = 0;
let dirtyTaps = 0;

let timerInterval = null;
let spawnTimeout = null;
let activeIndex = -1;
let activeType = null; // "clean" or "dirty"
let running = false;

function showScreen(screen) {
  [startScreen, gameScreen, endScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setMessage(text, type = "info") {
  messageEl.textContent = text;

  // quick color shift based on type
  if (type === "good") {
    messageEl.style.background = "#e7f9ed";
    messageEl.style.borderColor = "#b7ebc6";
    messageEl.style.color = "#0f5132";
  } else if (type === "bad") {
    messageEl.style.background = "#ffe7e7";
    messageEl.style.borderColor = "#ffb3b3";
    messageEl.style.color = "#7a0b0b";
  } else {
    messageEl.style.background = "#e3f2ff";
    messageEl.style.borderColor = "#b6d8ff";
    messageEl.style.color = "#1f3a5f";
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  timeEl.textContent = timeLeft;

  const progress = Math.min(100, Math.max(0, (score / MILESTONE) * 100));
  progressFill.style.width = progress + "%";
  milestoneText.textContent = `${Math.max(0, score)} / ${MILESTONE}`;
}

function buildGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < HOLES; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.dataset.index = String(i);

    const can = document.createElement("div");
    can.className = "can";
    can.setAttribute("role", "button");
    can.setAttribute("aria-label", "Tap item");

    can.addEventListener("click", () => handleTap(i));

    hole.appendChild(can);
    gridEl.appendChild(hole);
  }
}

function clearActive() {
  if (activeIndex === -1) return;
  const hole = gridEl.querySelector(`.hole[data-index="${activeIndex}"]`);
  if (!hole) return;
  const can = hole.querySelector(".can");
  can.classList.remove("show", "clean", "dirty");
  can.textContent = "";
  activeIndex = -1;
  activeType = null;
}

function spawn() {
  if (!running) return;

  // clear previous
  clearActive();

  // pick a new hole
  let idx = randInt(0, HOLES - 1);

  // decide type (mostly clean, sometimes dirty)
  const isDirty = Math.random() < 0.22; // 22% dirty
  const type = isDirty ? "dirty" : "clean";

  const hole = gridEl.querySelector(`.hole[data-index="${idx}"]`);
  const can = hole.querySelector(".can");

  can.classList.add(type, "show");
  can.textContent = type === "clean" ? "🟨" : "⬛";

  activeIndex = idx;
  activeType = type;

  // auto-hide after a bit (missed)
  const showTime = randInt(SHOW_TIME_MIN_MS, SHOW_TIME_MAX_MS);
  setTimeout(() => {
    if (!running) return;
    // if still active and not tapped
    if (activeIndex === idx) {
      streak = 0;
      setMessage("Miss!", "bad");
      updateHUD();
      clearActive();
    }
  }, showTime);

  // schedule next spawn
  const nextSpawn = randInt(SPAWN_MIN_MS, SPAWN_MAX_MS);
  spawnTimeout = setTimeout(spawn, nextSpawn);
}

function handleTap(index) {
  if (!running) return;
  if (index !== activeIndex) return; // only tap counts if it matches active hole
  if (!activeType) return;

  if (activeType === "clean") {
    score += CLEAN_POINTS;
    streak += 1;
    cleanTaps += 1;

    if (score >= MILESTONE && (score - CLEAN_POINTS) < MILESTONE) {
      setMessage("Milestone hit! Nice work!", "good");
    } else {
      setMessage(`+${CLEAN_POINTS} Clean Water!`, "good");
    }
  } else {
    score = Math.max(0, score - DIRTY_PENALTY);
    timeLeft = Math.max(0, timeLeft - DIRTY_TIME_PENALTY);
    streak = 0;
    dirtyTaps += 1;
    setMessage(`Dirty can! -${DIRTY_PENALTY} and -${DIRTY_TIME_PENALTY}s`, "bad");
  }

  updateHUD();
  clearActive();
}

function startGame() {
  score = 0;
  streak = 0;
  cleanTaps = 0;
  dirtyTaps = 0;

  timeLeft = Number(roundLengthSelect.value || 30);
  running = true;

  setMessage("Tap the cans!", "info");
  updateHUD();
  showScreen(gameScreen);

  // start timer
  timerInterval = setInterval(() => {
    if (!running) return;
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      endGame();
      return;
    }
    updateHUD();
  }, 1000);

  // begin spawning
  spawn();
}

function endGame() {
  running = false;
  clearActive();

  if (timerInterval) clearInterval(timerInterval);
  if (spawnTimeout) clearTimeout(spawnTimeout);

  finalScoreEl.textContent = score;
  cleanTapsEl.textContent = cleanTaps;
  dirtyTapsEl.textContent = dirtyTaps;

  finalLine.textContent =
    score >= MILESTONE
      ? `You scored ${score}. You hit the milestone!`
      : `You scored ${score}. Try again and hit ${MILESTONE}!`;

  showScreen(endScreen);
}

function quitGame() {
  if (!running) {
    showScreen(startScreen);
    return;
  }
  endGame();
}

startBtn.addEventListener("click", startGame);
quitBtn.addEventListener("click", quitGame);
playAgainBtn.addEventListener("click", startGame);
backBtn.addEventListener("click", () => showScreen(startScreen));

// init
buildGrid();
updateHUD();
showScreen(startScreen);
