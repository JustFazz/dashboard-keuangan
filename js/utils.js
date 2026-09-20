const toastQueue = [];
let toastShowing = false;
let wakeLock = null;

export function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
}

let audioContext;
let success;


export function playSound(name) {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.value = 2640;
    osc.type = "sine";

    gain.gain.setValueAtTime(0.9, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 2
    );

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 2.5);
    
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();

    osc1.frequency.value = 2640;
    osc1.type = "square";

    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.5
    );

    osc1.connect(gain1);
    gain1.connect(audioContext.destination);

    osc1.start();
    osc1.stop(now + 1);
}

export function showToast(message) {
    toastQueue.push(message);
    if (!toastShowing) {
        processToastQueue();
    }
}

function processToastQueue() {
    if (toastQueue.length === 0) {
        toastShowing = false;
        return;
    }

    toastShowing = true;
    const toast = document.getElementById("toast");
    if (!toast) return;

    const message = toastQueue.shift();
    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => processToastQueue(), 300);
    }, 1500);
}

export async function keepScreenOn() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (err) {
        console.log("WakeLock error:", err);
    }
}
