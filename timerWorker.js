let timeLeft;
let interval;

self.onmessage = function(e) {
    if (e.data.action === "start") {
        timeLeft = e.data.duration;
        interval = setInterval(() => {
            timeLeft--;
            self.postMessage({ timeLeft: timeLeft });
            if (timeLeft <= 0) {
                self.postMessage({ playSound: true });
                timeLeft = e.data.duration;
            }
        }, 1000);
    }
};

self.onclose = function() {
    clearInterval(interval);
};

worker.onmessage = function(e) {
    if (e.data.timeLeft !== undefined) {
        document.getElementById('timer').textContent = e.data.timeLeft;
    }
    if (e.data.playSound) {
        playSound(); // This should be inside the main script, not the worker
    }
};

document.addEventListener("DOMContentLoaded", () => {
    let silentAudio = new Audio();
    silentAudio.muted = true;
    silentAudio.play().catch(error => console.log("Silent play failed:", error));
});

function unlockAudio() {
    let alertSound = document.getElementById('alertSound');
    alertSound.src = "beep.wav"; // Any valid sound file
    alertSound.play().then(() => {
        console.log("Audio unlocked");
    }).catch(error => {
        console.log("Unlock failed:", error);
    });
}

let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Wake Lock is active");
            
            // Auto-reacquire lock if it gets released
            wakeLock.addEventListener('release', () => {
                console.log("Wake Lock was released");
                wakeLock = null;
            });
        }
    } catch (err) {
        console.log("Wake Lock error:", err);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            console.log("Wake Lock released manually");
            wakeLock = null;
        });
    }
}

function preventScreenLock() {
    setInterval(() => {
        window.dispatchEvent(new Event('touchstart'));
        window.dispatchEvent(new Event('touchend'));
    }, 29000); // Refresh touch event every ~29 seconds
}


function preventScreenLock() {
    setInterval(() => {
        window.dispatchEvent(new Event('touchstart'));
        window.dispatchEvent(new Event('touchend'));
    }, 29000); // Refresh touch event every ~29 seconds
}

function startTimer() {
    preventScreenLock(); // Simulate user interaction to prevent screen dimming
    worker.postMessage({ action: "start", duration: timerDuration });
}

