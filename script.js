// Ensure JavaScript runs only after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded and parsed.");

    // Get references to important elements
    let timerDisplay = document.getElementById("timer-display");
    let timeSlider = document.getElementById("time-slider");
    let startButton = document.getElementById("start-button");
    let stopButton = document.getElementById("stop-button");
    let themeToggle = document.getElementById("theme-toggle");
    let testSoundButton = document.getElementById("test-sound");
    let beepSound = document.getElementById("beep-sound");
    let stretchGif = document.getElementById("stretch-gif"); // Added GIF reference

    // Debugging: Check if elements exist
    if (!timerDisplay || !timeSlider || !startButton || !stopButton || !themeToggle || !testSoundButton || !beepSound || !stretchGif) {
        console.error("One or more elements are missing in the document.");
        return;
    }

    let countdown;
    let timeLeft = parseInt(timeSlider.value, 10); // Default time from slider
    timerDisplay.textContent = timeLeft; // Display initial time

    // Hide GIF initially
    stretchGif.style.display = "none";

    // Update time display when slider is moved
    timeSlider.addEventListener("input", function () {
        timeLeft = parseInt(this.value, 10);
        timerDisplay.textContent = timeLeft;
        console.log("Slider updated: " + timeLeft);
    });

    // Function to start the countdown
    function startTimer() {
        console.log("Timer started");
        clearInterval(countdown); // Ensure no multiple timers

        stretchGif.style.display = "block"; // Show GIF when timer starts

        countdown = setInterval(function () {
            if (timeLeft > 0) {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
            } else {
                clearInterval(countdown);
                playSound(); // Beep when timer reaches zero
                resetTimer(); // Restart countdown
            }
        }, 1000);
    }

    // Function to reset timer
    function resetTimer() {
        timeLeft = parseInt(timeSlider.value, 10); // Reset to slider value
        timerDisplay.textContent = timeLeft;
        startTimer(); // Start again
    }

    // Function to stop the timer
    function stopTimer() {
        console.log("Timer stopped");
        clearInterval(countdown);
        stretchGif.style.display = "none"; // Hide GIF when timer stops
    }

    // Function to play the beep sound
    function playSound() {
        console.log("Playing sound...");
        beepSound.currentTime = 0; // Reset audio position
        beepSound.play()
            .then(() => console.log("Sound played successfully"))
            .catch(error => console.error("Audio play failed:", error));
    }

    // Function to toggle between light and dark mode
    function toggleTheme() {
        document.body.classList.toggle("dark-mode");
        console.log("Theme toggled");
    }

    // Event listeners for buttons
    startButton.addEventListener("click", startTimer);
    stopButton.addEventListener("click", stopTimer);
    themeToggle.addEventListener("click", toggleTheme);
    testSoundButton.addEventListener("click", playSound);

    // Prevent screen dimming on iOS
    function preventScreenDimming() {
        let hiddenElement = document.createElement("video");
        hiddenElement.src = "small-video.mp4"; // A small silent video
        hiddenElement.loop = true;
        hiddenElement.muted = true;
        hiddenElement.style.display = "none";
        document.body.appendChild(hiddenElement);
        hiddenElement.play()
            .then(() => console.log("Video playing to prevent screen dimming"))
            .catch(error => console.error("Video play failed:", error));
    }

    preventScreenDimming(); // Call function when page loads
});
