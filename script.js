// Ensure JavaScript runs only after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM fully loaded and parsed.");

    // Get references to important elements
    let timerDisplay = document.getElementById("timer-display");
    let timeSlider = document.getElementById("time-slider");
    let startButton = document.getElementById("start-button");
    let stopButton = document.getElementById("stop-button");
    let themeToggle = document.getElementById("theme-toggle");
    let testSoundButton = document.getElementById("test-sound");
    let beepSound = document.getElementById("beep-sound");
    let stretchGif = document.getElementById("stretch-gif");

    let countdown;
    let timeLeft = parseInt(timeSlider.value, 10);
    let wakeLock = null; // Wake lock reference

    timerDisplay.textContent = timeLeft;
    stretchGif.style.display = "none"; // Hide GIF initially

    // Function to request wake lock
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log("Wake lock is active.");

                // Handle wake lock release (e.g., when minimized or inactive)
                wakeLock.addEventListener('release', () => {
                    console.log("Wake lock was released.");
                });
            } catch (err) {
                console.error("Wake lock request failed:", err);
            }
        } else {
            console.warn("Wake lock API not supported on this device.");
        }
    }

    // Function to release wake lock
    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release()
                .then(() => console.log("Wake lock released."));
            wakeLock = null;
        }
    }

    // Function to start the countdown
    function startTimer() {
        console.log("Timer started");
        clearInterval(countdown);
        stretchGif.style.display = "block"; // Show GIF when timer starts

        requestWakeLock(); // Activate wake lock

        countdown = setInterval(function () {
            if (timeLeft > 0) {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
            } else {
                clearInterval(countdown);
                playSound();
                resetTimer();
            }
        }, 1000);
    }

    // Function to reset timer
    function resetTimer() {
        timeLeft = parseInt(timeSlider.value, 10);
        timerDisplay.textContent = timeLeft;
        startTimer();
    }

    // Function to stop the timer
    function stopTimer() {
        console.log("Timer stopped");
        clearInterval(countdown);
        stretchGif.style.display = "none";
        releaseWakeLock(); // Release wake lock when timer stops
    }

    // Function to play the beep sound
    function playSound() {
        console.log("Playing sound...");
        beepSound.currentTime = 0;
        beepSound.play()
            .then(() => console.log(
