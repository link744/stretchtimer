document.addEventListener("DOMContentLoaded", function() {
    let timeLeft = 30;
    let timerDisplay = document.getElementById("timer-display");

    // Check if timer-display exists
    if (!timerDisplay) {
        console.error("Error: 'timer-display' not found in the document.");
        return; // Stop execution if the element is missing
    }

    timerDisplay.textContent = timeLeft;

    document.getElementById("start-button").addEventListener("click", function() {
        alert("Start button clicked!");
    });

    document.getElementById("stop-button").addEventListener("click", function() {
        alert("Stop button clicked!");
    });
});
