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
