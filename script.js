// Stretch Timer — loop mode: one beep at the end of each interval, then
// immediately start counting down the next interval. No screen interaction
// required — the beep tells you to change stretches, the countdown loops on.
document.addEventListener("DOMContentLoaded", async function () {
    // Element references
    const timerDisplay = document.getElementById("timer-display");
    const timeSlider = document.getElementById("time-slider");
    const startButton = document.getElementById("start-button");
    const stopButton = document.getElementById("stop-button");
    const themeToggle = document.getElementById("theme-toggle");
    const testSoundButton = document.getElementById("test-sound");
    const soundToggle = document.getElementById("sound-toggle");
    const beepSound = document.getElementById("beep-sound");
    const soundPicker = document.getElementById("sound-picker");
    const stretchGif = document.getElementById("stretch-gif");
    const presetButtons = document.querySelectorAll(".preset");

    // State
    let ticker = null;          // interval handle
    let deadline = null;        // absolute end time (Date.now() based)
    let running = false;
    let timeLeft = parseInt(timeSlider.value, 10);
    let wakeLock = null;
    let soundEnabled = true;

    // ---- Sounds: user-selectable (persisted alongside the enabled flag) ----
    const SOUNDS = {
        beep:   { name: "Nice Ding",        src: "beep.wav" },
        chime: { name: "Bell (Long Tail)", src: "chime.wav" },
        alarm: { name: "Alarm",            src: "alarm.wav" },
    };
    const DEFAULT_SOUND = "beep";
    let selectedSoundId = DEFAULT_SOUND;

    // ---- Audio: Web Audio API (primary, always works after first gesture) ----
    let audioCtx = null;
    const audioBuffers = {};     // soundId -> decoded AudioBuffer (cached per sound)

    // Create/resume the audio context. MUST be called from a user gesture
    // (click/keypress) — after that the browser lets us play at any time.
    // Best-effort and non-blocking: it must never prevent the timer from
    // starting, so resume() is raced against a short timeout.
    async function ensureAudio() {
        if (!soundEnabled) return false;
        try {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return false;
                audioCtx = new Ctx();
            }
            if (audioCtx.state === "suspended") {
                await Promise.race([
                    audioCtx.resume(),
                    new Promise(r => setTimeout(r, 500)) // never hang Start
                ]);
            }
            if (audioCtx.state === "running") {
                // Make sure the currently selected sound is decoded before playing.
                await getBuffer(selectedSoundId);
            }
            return audioCtx.state === "running";
        } catch (err) {
            console.warn("Web Audio unavailable, falling back to <audio>:", err);
            return false;
        }
    }

    // Decode (and cache) a named sound; each sound is decoded at most once.
    async function getBuffer(id) {
        if (audioBuffers[id]) return audioBuffers[id];
        const sound = SOUNDS[id];
        if (!sound || !audioCtx) return null;
        const res = await fetch(sound.src);
        const arr = await res.arrayBuffer();
        const buf = await audioCtx.decodeAudioData(arr);
        audioBuffers[id] = buf;
        return buf;
    }

    // Play the selected sound via Web Audio. Returns true if it played.
    function beepNow() {
        if (!soundEnabled) return false;
        const buf = audioBuffers[selectedSoundId];
        if (!audioCtx || !buf) return false;
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const gain = audioCtx.createGain();
        gain.gain.value = 1;
        src.connect(gain).connect(audioCtx.destination);
        src.start(0);
        return true;
    }

    // Fallback beep via <audio> if Web Audio failed (plays the selected sound).
    function fallbackBeep() {
        const sound = SOUNDS[selectedSoundId];
        if (!sound) return;
        beepSound.src = sound.src;
        beepSound.currentTime = 0;
        beepSound.play().catch(() => { /* silent */ });
    }

    // The interval-end cue: exactly one beep (Web Audio, <audio> fallback).
    function beepOnce() {
        if (!soundEnabled) return;
        if (!beepNow()) fallbackBeep();
    }

    // ---- Countdown: deadline-based so it is immune to timer throttling ----
    function renderTime() {
        if (!deadline) { timerDisplay.textContent = timeLeft; return; }
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        timeLeft = remaining;
        timerDisplay.textContent = remaining;
        document.title = running ? remaining + "s — Stretch Timer" : "Stretch Timer";
        // Countdown urgency: pulse the GIF in the last 5 seconds.
        stretchGif.classList.toggle("urgent", running && remaining <= 5);
    }

    function tick() {
        if (!deadline) return;
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            onTimeUp();
        } else {
            renderTime();
        }
    }

    // Loop: one beep, then immediately start the next countdown.
    function onTimeUp() {
        beepOnce();
        restartCountdown();
    }

    // Start (or restart) a fresh interval from the slider's value.
    function restartCountdown() {
        timeLeft = parseInt(timeSlider.value, 10);
        running = true;
        deadline = Date.now() + timeLeft * 1000;
        renderTime();
        if (!ticker) ticker = setInterval(tick, 250);
        requestWakeLock();
    }

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            } catch (err) {
                console.warn("Wake lock failed:", err);
            }
        }
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().catch(() => {});
            wakeLock = null;
        }
    }

    // ---- Timer controls ----
    function startTimer() {
        if (running) return;
        running = true;
        timeLeft = parseInt(timeSlider.value, 10); // slider is the source of truth
        deadline = Date.now() + timeLeft * 1000;
        stretchGif.style.display = "block";
        stretchGif.classList.add("running");
        renderTime();
        ticker = setInterval(tick, 250);
        requestWakeLock();
        // Re-acquire wake lock when the tab is refocused (browsers release it).
        document.addEventListener("visibilitychange", onVisibility, { once: false });
        window.addEventListener("focus", requestWakeLock);
    }

    function stopTimer() {
        running = false;
        if (ticker) { clearInterval(ticker); ticker = null; }
        deadline = null;
        stretchGif.style.display = "none";
        stretchGif.classList.remove("running", "urgent");
        releaseWakeLock();
        document.removeEventListener("visibilitychange", onVisibility);
        document.title = "Stretch Timer";
        timeLeft = parseInt(timeSlider.value, 10);
        renderTime();
    }

    // Resume the countdown if the user returns to a tab mid-count.
    function onVisibility() {
        if (document.visibilityState === "visible" && running) {
            requestWakeLock();
            tick(); // catch up immediately (deadline math handles it)
        }
    }

    // ---- Sound toggle + picker + test ----
    function setSound(on) {
        soundEnabled = on;
        soundToggle.textContent = on ? "🔊 Sound On" : "🔇 Sound Off";
        soundToggle.classList.toggle("muted", !on);
        if (!on) beepSound.pause();
        try { localStorage.setItem("stretch-sound", on ? "1" : "0"); } catch (e) { /* private mode */ }
    }

    // Select + persist the chosen sound (localStorage "stretch-sound-choice").
    function selectSound(id) {
        if (!SOUNDS[id]) return;
        selectedSoundId = id;
        try { localStorage.setItem("stretch-sound-choice", id); } catch (e) { /* private mode */ }
        if (soundPicker) {
            soundPicker.querySelectorAll(".sound-option").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.sound === id);
            });
        }
    }

    // Load persisted enabled-state + selected-sound preferences.
    function loadSoundPreference() {
        let enabled = true;
        try { enabled = localStorage.getItem("stretch-sound") !== "0"; } catch (e) { enabled = true; }
        soundEnabled = enabled;
        soundToggle.textContent = enabled ? "🔊 Sound On" : "🔇 Sound Off";
        soundToggle.classList.toggle("muted", !enabled);
        let savedChoice = null;
        try { savedChoice = localStorage.getItem("stretch-sound-choice"); } catch (e) { /* private mode */ }
        selectedSoundId = savedChoice && SOUNDS[savedChoice] ? savedChoice : DEFAULT_SOUND;
        if (soundPicker) {
            soundPicker.querySelectorAll(".sound-option").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.sound === selectedSoundId);
            });
        }
    }

    async function testSound() {
        await ensureAudio();
        if (soundEnabled) {
            const ok = beepNow();
            if (!ok) fallbackBeep();
        }
    }

    // ---- Theme (persisted) ----
    function applyTheme(dark) {
        document.body.classList.toggle("dark-mode", dark);
        themeToggle.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
    }
    let themeDark = false;
    try {
        themeDark = localStorage.getItem("stretch-theme") === "dark"
            || (!localStorage.getItem("stretch-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) { themeDark = false; }
    applyTheme(themeDark);

    function toggleTheme() {
        themeDark = !themeDark;
        applyTheme(themeDark);
        try { localStorage.setItem("stretch-theme", themeDark ? "dark" : "light"); } catch (e) { /* private mode */ }
    }

    // ---- Slider + presets ----
    timeSlider.addEventListener("input", function () {
        timeLeft = parseInt(this.value, 10);
        if (!running) {
            deadline = null;
            renderTime();
        }
    });

    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const sec = parseInt(btn.dataset.seconds, 10);
            timeSlider.value = sec;
            timeLeft = sec;
            if (!running) {
                deadline = null;
                renderTime();
            }
        });
    });

    // ---- Button wiring (audio unlocked HERE — inside a user gesture) ----
    startButton.addEventListener("click", async () => {
        await ensureAudio();   // unlock audio on the very first Start
        testSound();           // confirm we can hear (also proves unlock)
        startTimer();
    });
    stopButton.addEventListener("click", stopTimer);
    testSoundButton.addEventListener("click", testSound);
    soundToggle.addEventListener("click", async () => {
        const on = !soundEnabled;
        await ensureAudio();
        setSound(on);
        if (on) testSound();
    });
    themeToggle.addEventListener("click", toggleTheme);

    // Space bar starts/stops (skip if focused on a control).
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target === document.body) {
            e.preventDefault();
            if (running) { stopTimer(); }
            else { ensureAudio().then(() => { testSound(); startTimer(); }); }
        }
    });

    // Load saved sound + selected-sound preferences, then render.
    loadSoundPreference();
    try { beepSound.src = SOUNDS[selectedSoundId].src; } catch (e) { /* private mode */ }

    // Sound picker wiring: choose + persist the sound used for interval-end cues.
    if (soundPicker) {
        soundPicker.querySelectorAll(".sound-option").forEach(btn => {
            btn.addEventListener("click", () => {
                selectSound(btn.dataset.sound);
                // Pre-decode the newly selected sound (fire-and-forget).
                if (audioCtx && audioCtx.state === "running") {
                    getBuffer(btn.dataset.sound).catch(() => { /* best effort */ });
                }
            });
        });
    }

    renderTime();
});
