const loader = document.getElementById("loader");
const giftButton = document.getElementById("giftButton");
const confettiLayer = document.getElementById("confettiLayer");
const fireworkLayer = document.getElementById("fireworkLayer");
const micButton = document.getElementById("micButton");
const blowButton = document.getElementById("blowButton");
const micStatus = document.getElementById("micStatus");
const candleCake = document.querySelector(".cake--wish");
const sparkleLayer = document.getElementById("sparkleLayer");
const cuttingStage = document.getElementById("cuttingStage");
const knife = document.getElementById("knife");
const cutCake = document.getElementById("cutCake");
const slides = Array.from(document.querySelectorAll(".slide"));
const prevSlide = document.getElementById("prevSlide");
const nextSlide = document.getElementById("nextSlide");
const galleryDots = document.getElementById("galleryDots");
const typedMessage = document.getElementById("typedMessage");
const musicToggle = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
const sparkleSound = document.getElementById("sparkleSound");
const popSound = document.getElementById("popSound");
const chimeSound = document.getElementById("chimeSound");
const endlessHearts = document.getElementById("endlessHearts");
const heartRainButton = document.getElementById("heartRainButton");
const replayButton = document.getElementById("replayButton");

const message = `Happy Birthday Palvi ❤️

Today is all about you.
May your day be filled with happiness,
beautiful memories, laughter, and everything you love.

Thank you for being someone special.
Keep smiling and shining.

Wishing you a wonderful year ahead. 🎉`;

let activeScreen = "welcome";
let audioContext;
let analyser;
let microphoneSource;
let micStream;
let candleTriggered = false;
let cakeCut = false;
let currentSlide = 0;
let galleryTimer;
let messageStarted = false;
let heartTimer;
let generatedMusicPlaying = false;
let generatedMusicContext;
let generatedMusicTimer;
let effectAudioContext;
let lastTrailHeart = 0;

// Loading screen gives the first animation a polished entrance.
window.addEventListener("load", () => {
  setTimeout(() => loader.classList.add("is-hidden"), 900);
});

giftButton.addEventListener("click", () => {
  playSound(chimeSound);
  goToScreen("celebration");
  runCelebration();
});

micButton.addEventListener("click", startMicrophone);
blowButton.addEventListener("click", blowCandles);

knife.addEventListener("click", cutBirthdayCake);
knife.addEventListener("pointerdown", startKnifeDrag);

prevSlide.addEventListener("click", () => showSlide(currentSlide - 1));
nextSlide.addEventListener("click", () => showSlide(currentSlide + 1));

musicToggle.addEventListener("click", toggleMusic);
heartRainButton.addEventListener("click", () => {
  createHeartRain(38);
  playGeneratedEffect("sparkle");
});
replayButton.addEventListener("click", replayExperience);

document.addEventListener("pointermove", createHeartTrail, { passive: true });
document.addEventListener("click", (event) => createHeartTrail(event, true));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMicrophone();
  }
});

setupGallery();
setupImageFallbacks();

function goToScreen(screenName) {
  if (screenName === activeScreen) return;

  const oldScreen = document.querySelector(`[data-screen="${activeScreen}"]`);
  const newScreen = document.querySelector(`[data-screen="${screenName}"]`);

  if (oldScreen) {
    oldScreen.classList.remove("is-active");
    oldScreen.classList.add("is-leaving");
    setTimeout(() => oldScreen.classList.remove("is-leaving"), 900);
  }

  newScreen.classList.add("is-active");
  activeScreen = screenName;

  if (screenName === "gallery") {
    startGalleryAutoplay();
  }

  if (screenName === "message" && !messageStarted) {
    messageStarted = true;
    typeMessage();
  }

  if (screenName === "final") {
    musicToggle.classList.add("is-visible");
    startEndlessHearts();
  }
}

// Celebration screen effects are generated dynamically so the page stays lightweight.
function runCelebration() {
  createConfetti(110);
  createFireworks();
  playSound(popSound);

  setTimeout(() => {
    goToScreen("candles");
  }, 4300);
}

function createConfetti(amount = 70) {
  const colors = ["#ff7eb8", "#ffffff", "#f4c85f", "#c77df3", "#f369a6"];
  const target = activeScreen === "celebration" ? confettiLayer : document.querySelector(".screen.is-active");

  for (let index = 0; index < amount; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.setProperty("--fall-duration", `${2.4 + Math.random() * 2.2}s`);
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    target.appendChild(piece);
    setTimeout(() => piece.remove(), 5400);
  }
}

function createFireworks() {
  const colors = ["#fff4b8", "#ffd1e6", "#f4c85f", "#ffffff"];
  let bursts = 0;

  const interval = setInterval(() => {
    bursts += 1;
    const firework = document.createElement("span");
    firework.className = "firework";
    firework.style.left = `${18 + Math.random() * 64}%`;
    firework.style.top = `${12 + Math.random() * 42}%`;
    firework.style.color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 18; i += 1) {
      const spark = document.createElement("span");
      spark.style.setProperty("--angle", `${i * 20}deg`);
      firework.appendChild(spark);
    }

    fireworkLayer.appendChild(firework);
    setTimeout(() => firework.remove(), 1000);

    if (bursts >= 8) {
      clearInterval(interval);
    }
  }, 420);
}

async function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    micStatus.textContent = "Microphone is not available here. Please tap Blow Candles.";
    return;
  }

  try {
    micButton.disabled = true;
    micStatus.textContent = "Listening... blow gently toward the microphone.";
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioEngine();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    microphoneSource = audioContext.createMediaStreamSource(micStream);
    microphoneSource.connect(analyser);
    detectBlow();
  } catch (error) {
    micButton.disabled = false;
    micStatus.textContent = "Microphone permission was blocked. Use the Blow Candles button.";
  }
}

function detectBlow() {
  const samples = new Uint8Array(analyser.fftSize);

  function readVolume() {
    if (candleTriggered || !analyser) return;

    analyser.getByteTimeDomainData(samples);
    let total = 0;

    for (const sample of samples) {
      const centered = sample - 128;
      total += centered * centered;
    }

    const volume = Math.sqrt(total / samples.length);

    if (volume > 18) {
      blowCandles();
      return;
    }

    requestAnimationFrame(readVolume);
  }

  readVolume();
}

function blowCandles() {
  if (candleTriggered) return;

  candleTriggered = true;
  stopMicrophone();
  micStatus.textContent = "Wish sent into the universe.";
  candleCake.classList.add("candles-out");
  playSound(sparkleSound);
  createSparkles();

  setTimeout(() => {
    goToScreen("cakeCutting");
  }, 3300);
}

function stopMicrophone() {
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
  }

  if (audioContext && audioContext.state !== "closed") {
    audioContext.close().catch(() => {});
  }

  micStream = null;
  audioContext = null;
  analyser = null;
  microphoneSource = null;
}

function createSparkles() {
  for (let i = 0; i < 46; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "magic-sparkle";
    sparkle.style.left = `${35 + Math.random() * 30}%`;
    sparkle.style.top = `${20 + Math.random() * 34}%`;
    sparkle.style.setProperty("--spark-x", `${-150 + Math.random() * 300}px`);
    sparkle.style.setProperty("--spark-y", `${-140 + Math.random() * 230}px`);
    sparkle.style.animationDelay = `${Math.random() * 0.7}s`;
    sparkleLayer.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1900);
  }
}

function startKnifeDrag(event) {
  if (cakeCut) return;

  knife.setPointerCapture(event.pointerId);
  const stageRect = cuttingStage.getBoundingClientRect();

  function moveKnife(moveEvent) {
    const x = moveEvent.clientX - stageRect.left;
    const y = moveEvent.clientY - stageRect.top;
    knife.style.left = `${Math.max(0, Math.min(stageRect.width - 150, x - 80))}px`;
    knife.style.top = `${Math.max(0, Math.min(stageRect.height - 48, y - 24))}px`;
    knife.style.right = "auto";

    if (x > stageRect.width * 0.25 && x < stageRect.width * 0.75 && y > stageRect.height * 0.34) {
      cutBirthdayCake();
    }
  }

  function stopDrag() {
    knife.removeEventListener("pointermove", moveKnife);
    knife.removeEventListener("pointerup", stopDrag);
    knife.removeEventListener("pointercancel", stopDrag);
  }

  knife.addEventListener("pointermove", moveKnife);
  knife.addEventListener("pointerup", stopDrag);
  knife.addEventListener("pointercancel", stopDrag);
}

function cutBirthdayCake() {
  if (cakeCut) return;

  cakeCut = true;
  knife.style.left = "";
  knife.style.right = "6%";
  knife.classList.add("is-cutting");
  cutCake.classList.add("is-cut");
  createConfetti(85);
  playSound(popSound);

  setTimeout(() => {
    goToScreen("gallery");
  }, 3600);
}

function setupGallery() {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to memory ${index + 1}`);
    dot.addEventListener("click", () => showSlide(index));
    galleryDots.appendChild(dot);
  });

  showSlide(0);
}

// The carousel expects image1.jpg through image5.jpg in this folder.
function showSlide(index) {
  currentSlide = (index + slides.length) % slides.length;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-current", slideIndex === currentSlide);
  });

  Array.from(galleryDots.children).forEach((dot, dotIndex) => {
    dot.classList.toggle("is-current", dotIndex === currentSlide);
  });
}

function startGalleryAutoplay() {
  clearInterval(galleryTimer);
  galleryTimer = setInterval(() => showSlide(currentSlide + 1), 4200);

  setTimeout(() => {
    clearInterval(galleryTimer);
    goToScreen("message");
  }, 17000);
}

function setupImageFallbacks() {
  document.querySelectorAll(".slide img").forEach((image) => {
    const markMissing = () => {
      image.classList.add("is-missing");
      image.closest(".slide").classList.add("is-missing");
    };

    image.addEventListener("error", () => {
      markMissing();
    });

    if (image.complete && image.naturalWidth === 0) {
      markMissing();
    }
  });
}

// Typewriter message is kept in JavaScript so it can be personalized easily.
function typeMessage() {
  typedMessage.textContent = "";
  let index = 0;

  const interval = setInterval(() => {
    typedMessage.textContent += message[index];
    index += 1;

    if (index >= message.length) {
      clearInterval(interval);
      setTimeout(() => goToScreen("final"), 3200);
    }
  }, 42);
}

async function toggleMusic() {
  if (bgMusic.paused && !generatedMusicPlaying) {
    try {
      if (bgMusic.error) {
        throw new Error("Local music file is not available yet.");
      }

      await bgMusic.play();
      musicToggle.classList.add("is-playing");
      musicToggle.querySelector(".music-toggle__text").textContent = "Pause";
    } catch (error) {
      startGeneratedMusic();
    }
  } else {
    bgMusic.pause();
    stopGeneratedMusic();
    musicToggle.classList.remove("is-playing");
    musicToggle.querySelector(".music-toggle__text").textContent = "Music";
  }
}

function startGeneratedMusic() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;

  if (!AudioEngine) {
    musicToggle.querySelector(".music-toggle__text").textContent = "Add music";
    return;
  }

  generatedMusicContext = generatedMusicContext || new AudioEngine();
  generatedMusicPlaying = true;
  musicToggle.classList.add("is-playing");
  musicToggle.querySelector(".music-toggle__text").textContent = "Pause";

  const notes = [392, 493.88, 587.33, 493.88, 440, 523.25, 659.25, 523.25];
  let index = 0;

  playGeneratedNote(notes[index]);
  generatedMusicTimer = setInterval(() => {
    index = (index + 1) % notes.length;
    playGeneratedNote(notes[index]);
  }, 850);
}

function playGeneratedNote(frequency) {
  if (!generatedMusicContext || !generatedMusicPlaying) return;

  const oscillator = generatedMusicContext.createOscillator();
  const gain = generatedMusicContext.createGain();
  const now = generatedMusicContext.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);

  oscillator.connect(gain);
  gain.connect(generatedMusicContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.82);
}

function stopGeneratedMusic() {
  generatedMusicPlaying = false;
  clearInterval(generatedMusicTimer);
  generatedMusicTimer = null;
}

function replayExperience() {
  stopMicrophone();
  stopGeneratedMusic();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  musicToggle.classList.remove("is-visible", "is-playing");
  musicToggle.querySelector(".music-toggle__text").textContent = "Music";

  candleTriggered = false;
  cakeCut = false;
  messageStarted = false;
  currentSlide = 0;
  clearInterval(galleryTimer);
  clearInterval(heartTimer);
  heartTimer = null;

  candleCake.classList.remove("candles-out");
  cutCake.classList.remove("is-cut");
  knife.classList.remove("is-cutting");
  knife.style.left = "";
  knife.style.top = "";
  knife.style.right = "6%";
  micButton.disabled = false;
  micStatus.textContent = "Use the microphone or tap the fallback button.";
  typedMessage.textContent = "";
  sparkleLayer.innerHTML = "";
  endlessHearts.innerHTML = "";
  showSlide(0);
  goToScreen("welcome");
}

// Final screen hearts continue until the page is closed.
function startEndlessHearts() {
  if (heartTimer) return;

  heartTimer = setInterval(() => {
    createFinalHeart();
  }, 360);
}

function createHeartRain(amount = 24) {
  for (let index = 0; index < amount; index += 1) {
    setTimeout(createFinalHeart, index * 45);
  }
}

function createFinalHeart() {
  const heart = document.createElement("span");
  heart.style.left = `${Math.random() * 96}%`;
  heart.style.width = `${12 + Math.random() * 18}px`;
  heart.style.height = heart.style.width;
  heart.style.setProperty("--heart-drift", `${-40 + Math.random() * 80}px`);
  endlessHearts.appendChild(heart);
  setTimeout(() => heart.remove(), 8200);
}

function createHeartTrail(event, force = false) {
  const now = Date.now();

  if (!force && now - lastTrailHeart < 120) return;
  lastTrailHeart = now;

  const heart = document.createElement("span");
  heart.className = "trail-heart";
  heart.style.left = `${event.clientX}px`;
  heart.style.top = `${event.clientY}px`;
  heart.style.setProperty("--trail-x", `${-18 + Math.random() * 36}px`);
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 1200);
}

function playSound(audioElement) {
  if (!audioElement) return;

  const fallbackType = {
    chimeSound: "chime",
    popSound: "pop",
    sparkleSound: "sparkle",
  }[audioElement.id] || "sparkle";

  if (audioElement.error) {
    playGeneratedEffect(fallbackType);
    return;
  }

  audioElement.currentTime = 0;
  audioElement.play().catch(() => {
    playGeneratedEffect(fallbackType);
  });
}

function playGeneratedEffect(type) {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;

  if (!AudioEngine) return;

  effectAudioContext = effectAudioContext || new AudioEngine();
  effectAudioContext.resume().catch(() => {});

  if (type === "pop") {
    playTone(170, 0.08, "triangle", 0.08);
    playTone(96, 0.12, "sine", 0.05, 0.04);
    return;
  }

  if (type === "chime") {
    playTone(659.25, 0.2, "sine", 0.045);
    playTone(987.77, 0.28, "sine", 0.035, 0.08);
    return;
  }

  [1046.5, 1318.5, 1760].forEach((frequency, index) => {
    playTone(frequency, 0.16, "sine", 0.026, index * 0.055);
  });
}

function playTone(frequency, duration, type = "sine", volume = 0.04, delay = 0) {
  if (!effectAudioContext) return;

  const oscillator = effectAudioContext.createOscillator();
  const gain = effectAudioContext.createGain();
  const start = effectAudioContext.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(effectAudioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}
