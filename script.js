// Stretch Timer — robust audio (Web Audio API, unlocked on user gesture)
// plus deadline-based countdown that survives background-tab throttling.
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
    const stretchGif = document.getElementById("stretch-gif");
    const alarmOverlay = document.getElementById("alarm-overlay");
    const dismissButton = document.getElementById("dismiss-button");
    const presetButtons = document.querySelectorAll(".preset");

    // State
    let ticker = null;          // requestAnimationFrame/interval handle
    let deadline = null;       // absolute end time (Date.now() based)
    let running = false;
    let timeLeft = parseInt(timeSlider.value, 10);
    let wakeLock = null;
    let soundEnabled = true;
    let alarming = false;      // true while the stretch alarm is ringing

    // ---- Audio: Web Audio API (primary, always works after first gesture) ----
    let audioCtx = null;
    let audioBuffer = null;    // decoded beep.wav
    let alarmGain = null;
    let alarmTimer = null;     // interval handle for the repeating alarm

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
                // Pre-decode beep.wav so playback never waits on the network.
                if (!audioBuffer) {
                    const res = await fetch("beep.wav");
                    const arr = await res.arrayBuffer();
                    audioBuffer = await audioCtx.decodeAudioData(arr);
                }
            }
            if (audioCtx.state === "suspended") {
                await Promise.race([
                    audioCtx.resume(),
                    new Promise(r => setTimeout(r, 500)) // never hang Start
                ]);
            }
            return audioCtx.state === "running";
        } catch (err) {
            console.warn("Web Audio unavailable, falling back to <audio>:", err);
            return false;
        }
    }

    // Play one beep via Web Audio. Returns true if it played.
    function beepNow() {
        if (!soundEnabled || !audioCtx || !audioBuffer) return false;
        const src = audioCtx.createBufferSource();
        src.buffer = audioBuffer;
        const gain = audioCtx.createGain();
        gain.gain.value = 1;
        src.connect(gain).connect(audioCtx.destination);
        src.start(0);
        return true;
    }

    // Start a repeating alarm (beep every 600ms) until stopAlarm() is called.
    function startAlarm() {
        stopAlarm();
        if (!soundEnabled || !audioCtx || !audioBuffer) {
            beepSound.loop = true;
            beepSound.currentTime = 0;
            beepSound.play().catch(() => { /* visual alarm still shows */ });
            alarming = true;
            return;
        }
        alarming = true;
        alarmGain = audioCtx.createGain();
        alarmGain.gain.value = 1;
        alarmGain.connect(audioCtx.destination);
        const tick = () => {
            if (!alarming) return;
            const src = audioCtx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(alarmGain);
            src.start(0);
        };
        tick();
        alarmTimer = setInterval(tick, 600);
    }

    function stopAlarm() {
        alarming = false;
        if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
        if (alarmGain && audioCtx) {
            try { alarmGain.disconnect(); } catch (e) { /* noop */ }
            alarmGain = null;
        }
        if (beepSound.loop) {
            beepSound.loop = false;
            beepSound.pause();
        }
    }

    // Fallback beep via <audio> if Web Audio failed.
    function fallbackBeep() {
        if (!beepSound.loop) {
            beepSound.currentTime = 0;
            beepSound.play().catch(() => {});
        }
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

    function onTimeUp() {
        running = false;
        if (ticker) { clearInterval(ticker); ticker = null; } // stop the countdown loop
        stretchGif.style.display = "block";
        alarmOverlay.hidden = false;
        document.title = "Stretch now! — Stretch Timer";
        if (soundEnabled) {
            beepNow();                 // immediate first beep
            startAlarm();              // then repeat until dismissed
        }
        requestWakeLock();            // keep screen on while stretching
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
        timeLeft = parseInt(timeSlider.value, 10); // slider is the source of truth
        running = true;
        stopAlarm();
        alarmOverlay.hidden = true;
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
        stopAlarm();
        deadline = null;
        alarmOverlay.hidden = true;
        stretchGif.style.display = "none";
        stretchGif.classList.remove("running", "urgent");
        releaseWakeLock();
        document.removeEventListener("visibilitychange", onVisibility);
        document.title = "Stretch Timer";
        renderTime();
    }

    // Resume the countdown if the user returns to a tab mid-count.
    function onVisibility() {
        if (document.visibilityState === "visible" && running) {
            requestWakeLock();
            tick(); // catch up immediately (deadline math handles it)
        }
    }

    function restartAfterStretch() {
        // Alarm dismissed: go straight back into a fresh interval.
        // timeLeft may be 0/1 from the countdown, so re-read the slider.
        timeLeft = parseInt(timeSlider.value, 10);
        stopAlarm();
        alarmOverlay.hidden = true;
        running = true;
        deadline = Date.now() + timeLeft * 1000;
        ticker = setInterval(tick, 250);
        renderTime();
        requestWakeLock();
    }

    // ---- Sound toggle + test ----
    function setSound(on) {
        soundEnabled = on;
        soundToggle.textContent = on ? "🔊 Sound On" : "🔇 Sound Off";
        soundToggle.classList.toggle("muted", !on);
        if (!on) {
            stopAlarm();
            beepSound.pause();
        }
        try { localStorage.setItem("stretch-sound", on ? "1" : "0"); } catch (e) { /* private mode */ }
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
    dismissButton.addEventListener("click", restartAfterStretch);
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

    // Load saved sound preference.
    try {
        const saved = localStorage.getItem("stretch-sound");
        if (saved !== null) setSound(saved === "1");
    } catch (e) { /* private mode */ }

    renderTime();
});
