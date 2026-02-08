const playArea = document.getElementById("playArea");
const david = document.getElementById("david");
const startButton = document.getElementById("startButton");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const timerEl = document.getElementById("timer");
const timerFill = document.getElementById("timerFill");
const frenzyOverlay = document.getElementById("frenzyOverlay");
const frenzyTimerEl = document.getElementById("frenzyTimer");

let score = 0;
let best = 0;
let baseTime = 2000;
let countdown = baseTime;
let countdownInterval = null;
let frenzyActive = false;
let audioContext = null;
let masterGain = null;
let musicNodes = null;
let frenzyOscillator = null;

const MIN_TIME = 550;
const TIME_STEP = 75;
const FRENZY_DURATION = 5000;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const randomPosition = (element, padding = 20) => {
  const areaRect = playArea.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const maxX = areaRect.width - elementRect.width - padding;
  const maxY = areaRect.height - elementRect.height - padding;
  const x = Math.random() * clamp(maxX, 0, areaRect.width - elementRect.width) + padding / 2;
  const y = Math.random() * clamp(maxY, 0, areaRect.height - elementRect.height) + padding / 2;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
};

const updateScore = () => {
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
};

const updateTimerDisplay = () => {
  timerEl.textContent = `${(countdown / 1000).toFixed(2)}s`;
  timerFill.style.width = `${(countdown / baseTime) * 100}%`;
};

const resetTimer = () => {
  countdown = baseTime;
  updateTimerDisplay();
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdown -= 50;
    if (countdown <= 0) {
      handleGameOver();
    } else {
      updateTimerDisplay();
    }
  }, 50);
};

const handleGameOver = () => {
  clearInterval(countdownInterval);
  david.style.opacity = 0.4;
  startButton.textContent = "Try Again";
  startButton.disabled = false;
};

const spawnFrenzyDavids = () => {
  for (let i = 0; i < 12; i += 1) {
    const frenzyDavid = document.createElement("img");
    frenzyDavid.src = "david.jpg";
    frenzyDavid.alt = "David frenzy";
    frenzyDavid.className = "frenzy-david";
    frenzyDavid.style.left = `${Math.random() * 80 + 5}%`;
    frenzyDavid.style.top = `${Math.random() * 80 + 5}%`;
    frenzyDavid.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    frenzyDavid.style.width = `${70 + Math.random() * 60}px`;
    frenzyDavid.addEventListener("click", (event) => {
      event.stopPropagation();
      score += 1;
      updateScore();
      frenzyDavid.remove();
    });
    playArea.appendChild(frenzyDavid);
  }
};

const clearFrenzyDavids = () => {
  const frenzyDavids = playArea.querySelectorAll(".frenzy-david");
  frenzyDavids.forEach((node) => node.remove());
};

const startFrenzy = () => {
  frenzyActive = true;
  frenzyOverlay.classList.add("active");
  david.style.opacity = 0;
  clearInterval(countdownInterval);
  spawnFrenzyDavids();
  startFrenzySound();

  let remaining = FRENZY_DURATION / 1000;
  frenzyTimerEl.textContent = remaining.toFixed(1);
  const timer = setInterval(() => {
    remaining -= 0.1;
    frenzyTimerEl.textContent = Math.max(remaining, 0).toFixed(1);
  }, 100);

  setTimeout(() => {
    clearInterval(timer);
    stopFrenzySound();
    clearFrenzyDavids();
    frenzyOverlay.classList.remove("active");
    frenzyActive = false;
    david.style.opacity = 1;
    randomPosition(david, 40);
    resetTimer();
  }, FRENZY_DURATION);
};

const handleDavidClick = () => {
  if (frenzyActive) {
    return;
  }
  score += 1;
  updateScore();
  baseTime = Math.max(MIN_TIME, baseTime - TIME_STEP);
  if (score % 10 === 0) {
    startFrenzy();
    return;
  }
  randomPosition(david, 40);
  resetTimer();
};

const createAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioContext.destination);
  }
};

const startMusic = () => {
  if (musicNodes) {
    return;
  }
  createAudioContext();

  const bass = audioContext.createOscillator();
  const bassGain = audioContext.createGain();
  bass.type = "sawtooth";
  bass.frequency.value = 110;
  bassGain.gain.value = 0.25;
  bass.connect(bassGain).connect(masterGain);
  bass.start();

  const lead = audioContext.createOscillator();
  const leadGain = audioContext.createGain();
  lead.type = "square";
  lead.frequency.value = 440;
  leadGain.gain.value = 0.18;
  lead.connect(leadGain).connect(masterGain);
  lead.start();

  const melody = [440, 523, 659, 523, 392, 330, 392, 523];
  let step = 0;
  const melodyInterval = setInterval(() => {
    lead.frequency.setValueAtTime(melody[step % melody.length], audioContext.currentTime);
    step += 1;
  }, 240);

  musicNodes = { bass, bassGain, lead, leadGain, melodyInterval };
};

const stopMusic = () => {
  if (!musicNodes) {
    return;
  }
  musicNodes.bass.stop();
  musicNodes.lead.stop();
  clearInterval(musicNodes.melodyInterval);
  musicNodes = null;
};

const startFrenzySound = () => {
  createAudioContext();
  if (frenzyOscillator) {
    return;
  }
  frenzyOscillator = audioContext.createOscillator();
  const frenzyGain = audioContext.createGain();
  frenzyOscillator.type = "sine";
  frenzyOscillator.frequency.value = 1800;
  frenzyGain.gain.value = 0.9;
  frenzyOscillator.connect(frenzyGain).connect(masterGain);
  frenzyOscillator.start();
  frenzyOscillator._gain = frenzyGain;
};

const stopFrenzySound = () => {
  if (!frenzyOscillator) {
    return;
  }
  frenzyOscillator._gain.gain.value = 0;
  frenzyOscillator.stop();
  frenzyOscillator = null;
};

const startGame = () => {
  score = 0;
  baseTime = 2000;
  updateScore();
  randomPosition(david, 40);
  david.style.opacity = 1;
  startButton.disabled = true;
  startButton.textContent = "Game Running";
  startMusic();
  resetTimer();
};

startButton.addEventListener("click", () => {
  startGame();
});

david.addEventListener("click", (event) => {
  event.stopPropagation();
  handleDavidClick();
});

playArea.addEventListener("click", () => {
  if (!frenzyActive) {
    countdown -= 150;
    countdown = Math.max(countdown, 0);
    updateTimerDisplay();
  }
});

window.addEventListener("beforeunload", () => {
  stopMusic();
  stopFrenzySound();
});
