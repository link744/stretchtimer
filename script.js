// Select elements
const timerDisplay = document.getElementById("timer");
const timeSlider = document.getElementById("timeSlider");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const soundSelect = document.getElementById("soundSelect");
const darkModeToggle = document.getElementById("darkModeToggle");

let countdown;
let timerDuration = parseInt(timeSlider.value, 10);
let wakeLock = null; // Used to prevent screen dimming on iOS

// Update timer display when slider changes
timeSlider.addEventListener("input", () => {
    timerDuration = parseInt(timeSlider.value, 10);
    timerDisplay.textContent = timerDuration;
});

// Function to start the countdown
function startTimer() {
    let timeLeft = timerDuration;

    // Prevent screen dimming
    requestWakeLock();

    countdown = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
        } else {
            playSound(); // Play sound when timer reaches 0
            timeLeft = timerDuration; // Reset timer
        }
    }, 1000);

    startBtn.disabled = true;
    stopBtn.disabled = false;
}

// Function to stop the countdown
function stopTimer() {
    clearInterval(countdown);
    releaseWakeLock();
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Function to play the selected sound
function playSound() {
    const sound = new Audio(soundSelect.value);
    sound.play().catch(error => console.log("Audio playback error:", error));
}

// Toggle dark mode
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// Prevent screen dimming/sleeping on iOS
async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => {
                console.log("Wake Lock was released");
                wakeLock = null;
            });
        }
    } catch (error) {
        console.log("Wake Lock request failed:", error);
    }
}

// Release Wake Lock when timer stops
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
        });
    }
}

// Attach event listeners
startBtn.addEventListener("click", startTimer);
stopBtn.addEventListener("click", stopTimer);
