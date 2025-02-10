let audioContext;
let unlocked = false;
let timer;
let timeLeft = 30; // Default timer value
let isRunning = false;

// Function to initialize Web Audio API with user interaction
function unlockAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
            console.log("Audio unlocked!");
            unlocked = true;
            document.getElementById("enableSoundBtn").remove(); // Remove button after activation
        });
    }
}

// Function to play the selected sound
async function playSound() {
    if (!unlocked) return; // Prevent playback until audio is unlocked

    try {
        const response = await fetch(soundSelect.value);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        console.log("Web Audio API playback error:", error);
    }
}

// Function to update and display the timer
function updateTimerDisplay() {
    document.getElementById("timer-display").textContent = timeLeft;
}

// Function to start the countdown timer
function startTimer() {
    if (isRunning) return;
    isRunning = true;

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            playSound(); // Play sound when timer reaches zero
            timeLeft = parseInt(document.getElementById("time-slider").value); // Reset timer
            updateTimerDisplay();
        }
    }, 1000);
}

// Function to stop the countdown timer
function stopTimer() {
    clearInterval(timer);
    isRunning = false;
}

// Function to update timer value from slider
function updateTime(event) {
    timeLeft = parseInt(event.target.value);
    updateTimerDisplay();
}

// Add "Enable Sound" button on page load
document.addEventListener("DOMContentLoaded", () => {
    const enableSoundBtn = document.createElement("button");
    enableSoundBtn.id = "enableSoundBtn";
    enableSoundBtn.textContent = "Enable Sound";
    enableSoundBtn.style.position = "fixed";
    enableSoundBtn.style.bottom = "20px";
    enableSoundBtn.style.right = "20px";
    enableSoundBtn.style.zIndex = "1000";
    document.body.appendChild(enableSoundBtn);

    enableSoundBtn.addEventListener("click", unlockAudio);

    document.getElementById("start-button").addEventListener("click", startTimer);
    document.getElementById("stop-button").addEventListener("click", stopTimer);
    document.getElementById("time-slider").addEventListener("input", updateTime);
    updateTimerDisplay();
});
