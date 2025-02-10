/* Stretch Timer - Main JavaScript File */

// Variables for timer and Web Worker
let timerWorker;
let timerDuration = 30; // Default duration in seconds
let wakeLock = null;

// Request Wake Lock (only works in some browsers, not iOS Safari)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Wake Lock is active");
            wakeLock.addEventListener('release', () => wakeLock = null);
        }
    } catch (err) {
        console.log("Wake Lock error:", err);
    }
}

// Release Wake Lock
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

// Function to keep screen awake using scrolling trick
function preventScreenDimming() {
    let scrollArea = document.getElementById("scrollArea");
    let direction = 1;
    setInterval(() => {
        if (scrollArea) {
            scrollArea.scrollTop += direction;
            direction *= -1; // Reverse direction each time
        }
    }, 25000); // Scroll every 25 seconds
}

// Start Timer Function
function startTimer() {
    requestWakeLock(); // Attempt to keep screen awake
    preventScreenDimming(); // Use scrolling trick
    if (!timerWorker) {
        timerWorker = new Worker("timerWorker.js");
        timerWorker.onmessage = (event) => {
            if (event.data === "done") {
                playSound();
                timerWorker.postMessage({ action: "start", duration: timerDuration });
            }
        };
    }
    timerWorker.postMessage({ action: "start", duration: timerDuration });
}

// Stop Timer Function
function stopTimer() {
    releaseWakeLock(); // Allow screen to dim
    if (timerWorker) {
        timerWorker.postMessage({ action: "stop" });
    }
}

// Play sound when timer reaches zero
function playSound() {
    let audio = new Audio("beep.wav"); // Change to desired sound file
    audio.play().catch(error => console.log("Audio playback error:", error));
}

// Initialize scrolling area in HTML
window.onload = function() {
    document.body.insertAdjacentHTML('beforeend', '<div id="scrollArea" style="width:1px; height:1px; overflow:auto; position:absolute; top:-100px;"><div style="height:200px;"></div></div>');
};
