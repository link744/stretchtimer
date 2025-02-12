let timer;
let timeLeft = 30; // Default timer value
let isRunning = false;

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
        } else {
            timeLeft = parseInt(document.getElementById("time-slider").value); // Reset timer
        }
        updateTimerDisplay();
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

// Ensure DOM is fully loaded before attaching event listeners
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("start-button").addEventListener("click", startTimer);
    document.getElementById("stop-button").addEventListener("click", stopTimer);
    document.getElementById("time-slider").addEventListener("input", updateTime);

    // Initial timer display update
    updateTimerDisplay();
});
