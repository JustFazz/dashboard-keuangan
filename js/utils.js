const sounds = {
    click: new Audio("./sounds/click.mp3"),
    success: new Audio("./sounds/success.mp3"),
};

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

export function playSound(name) {
    const sound = sounds[name];
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
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
