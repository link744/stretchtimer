let timeLeft = 30;
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("timer-display").textContent = timeLeft;

    document.getElementById("start-button").onclick = function() {
        alert("Start button clicked!");
    };

    document.getElementById("stop-button").onclick = function() {
        alert("Stop button clicked!");
    };
});
