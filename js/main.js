/**
 * Main Controller - Monitoring Toko (HP2)
 * Orkestrasi Autentikasi, Event Listener, Navigasi, dan Alur Offline-First.
 */

// Menyiapkan variabel state tanggal/bulan aktif
let currentSelectedMonth = getCurrentMonth();
let currentSelectedDate = getTodayDate();

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

/**
 * Inisialisasi Aplikasi dan Monitoring Firebase Auth Sesi
 */
function initApp() {
  if ("serviceWorker" in navigator && location.hostname !== "localhost") {
        navigator.serviceWorker.register("./sw.js")
            .then((reg) => console.log("[PWA] Service Worker terdaftar dengan scope:", reg.scope))
            .catch((err) => console.warn("[PWA] Registrasi Service Worker gagal:", err));
    }

    setupEventListeners();

    // Monitor status autentikasi Firebase
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User sudah login
            document.getElementById("user-email-display").textContent = user.email || "";
            showView("dashboard");
            
            // Set default value picker
            const monthPicker = document.getElementById("month-picker");
            const datePicker = document.getElementById("date-picker");
            
            if (monthPicker) monthPicker.value = currentSelectedMonth;
            if (datePicker) datePicker.value = currentSelectedDate;

            // Buka halaman default (Hari Ini) secara Offline-First
            setActiveTab("today");
            loadTodayPage();
        } else {
            // User belum login
            showView("login");
        }
    });
}

/**
 * Mendaftarkan seluruh Event Listener di DOM
 */
function setupEventListeners() {
    // 1. Form Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // 2. Tombol Logout
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", handleLogout);
    }

    // 3. Navigasi Tab
    const navButtons = document.querySelectorAll(".nav-pill");
    navButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const tabName = e.currentTarget.getAttribute("data-tab");
            setActiveTab(tabName);

            if (tabName === "today") {
                loadTodayPage();
            } else if (tabName === "month") {
                loadMonthPage();
            } else if (tabName === "date") {
                loadDatePage();
            }
        });
    });

    // 4. Input Picker Changes
    const monthPicker = document.getElementById("month-picker");
    if (monthPicker) {
        monthPicker.addEventListener("change", (e) => {
            if (e.target.value) {
                currentSelectedMonth = e.target.value;
                loadMonthPage();
            }
        });
    }

    const datePicker = document.getElementById("date-picker");
    if (datePicker) {
        datePicker.addEventListener("change", (e) => {
            if (e.target.value) {
                currentSelectedDate = e.target.value;
                loadDatePage();
            }
        });
    }

    // 5. Tombol Manual Sync
    const btnSyncToday = document.getElementById("btn-sync-today");
    if (btnSyncToday) {
        btnSyncToday.addEventListener("click", () => handleManualSyncDate(getTodayDate(), btnSyncToday, loadTodayPage));
    }

    const btnSyncDate = document.getElementById("btn-sync-date");
    if (btnSyncDate) {
        btnSyncDate.addEventListener("click", () => handleManualSyncDate(currentSelectedDate, btnSyncDate, loadDatePage));
    }
}

/**
 * Handle proses submit form login
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const statusEl = document.getElementById("login-status");
    const btnLogin = document.getElementById("btn-login");

    if (!email || !password) {
        statusEl.textContent = "Email dan password wajib diisi.";
        statusEl.className = "status-message error";
        return;
    }

    try {
        btnLogin.disabled = true;
        statusEl.textContent = "Proses login...";
        statusEl.className = "status-message";

        await auth.signInWithEmailAndPassword(email, password);
        statusEl.textContent = "";
    } catch (error) {
        console.error("Login gagal:", error);
        statusEl.textContent = "Login gagal: " + (error.message || "Cek email/password Anda.");
        statusEl.className = "status-message error";
    } finally {
        btnLogin.disabled = false;
    }
}

/**
 * Handle proses logout
 */
async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout gagal:", error);
    }
}

/**
 * ALUR OFFLINE-FIRST: Halaman Hari Ini
 */
async function loadTodayPage() {
    const todayStr = getTodayDate();
    
    // 1. Tampilkan Cache Lokal IndexedDB secepat mungkin
    const cachedData = await getLocalTransactionsByDate(todayStr);
    const summary = calculateSummary(cachedData);
    renderTodaySummary(summary, `Hari Ini (${formatDateLabel(todayStr)})`);

    // 2. Jalankan Sinkronisasi Firebase di Background (Non-blocking)
    updateSyncStatus("Memeriksa sinkronisasi...", "updating");
    
    try {
        const syncRes = await syncDateIfNeeded(todayStr);
        if (syncRes.updated) {
            // Data berubah -> Ambil cache terbaru dan refresh UI
            const freshData = await getLocalTransactionsByDate(todayStr);
            renderTodaySummary(calculateSummary(freshData), `Hari Ini (${formatDateLabel(todayStr)})`);
            updateSyncStatus("Data diperbarui.", "normal");
        } else if (syncRes.reason === "ALREADY_UP_TO_DATE") {
            updateSyncStatus("Data sudah terbaru.", "normal");
        } else if (syncRes.reason === "NO_SERVER_METADATA") {
            updateSyncStatus("Cache digunakan.", "normal");
        } else {
            updateSyncStatus("Offline. Menggunakan cache.", "offline");
        }
    } catch (err) {
        updateSyncStatus("Offline. Menggunakan cache.", "offline");
    }
}

/**
 * ALUR OFFLINE-FIRST: Halaman Ringkasan Bulan
 */
async function loadMonthPage() {
    const monthStr = currentSelectedMonth;

    // 1. Tampilkan Cache Lokal IndexedDB secepat mungkin
    const cachedData = await getLocalTransactionsByMonth(monthStr);
    renderMonthSummary(calculateSummary(cachedData));

    // 2. Jalankan Sinkronisasi Bulan di Background
    updateSyncStatus("Memeriksa sinkronisasi bulan...", "updating");

    try {
        const syncRes = await syncMonthIfNeeded(monthStr);
        if (syncRes.changed) {
            const freshData = await getLocalTransactionsByMonth(monthStr);
            renderMonthSummary(calculateSummary(freshData));
            
            if (syncRes.failedDates && syncRes.failedDates.length > 0) {
                updateSyncStatus(`${syncRes.changedDates.length} tanggal diperbarui, ${syncRes.failedDates.length} gagal.`, "normal");
            } else {
                updateSyncStatus("Data bulan diperbarui.", "normal");
            }
        } else {
            if (syncRes.failedDates && syncRes.failedDates.length > 0) {
                updateSyncStatus("Sebagian sinkronisasi gagal. Menggunakan cache.", "offline");
            } else {
                updateSyncStatus("Data bulan sudah terbaru.", "normal");
            }
        }
    } catch (err) {
        updateSyncStatus("Offline. Menggunakan cache.", "offline");
    }
}

/**
 * ALUR OFFLINE-FIRST: Halaman Transaksi per Tanggal
 */
async function loadDatePage() {
    const dateStr = currentSelectedDate;

    // 1. Tampilkan Cache Lokal IndexedDB secepat mungkin
    const cachedData = await getLocalTransactionsByDate(dateStr);
    renderDateSummary(calculateSummary(cachedData));
    renderTransactionList(cachedData);

    // 2. Jalankan Sinkronisasi Firebase di Background
    updateSyncStatus("Memeriksa sinkronisasi...", "updating");

    try {
        const syncRes = await syncDateIfNeeded(dateStr);
        if (syncRes.updated) {
            const freshData = await getLocalTransactionsByDate(dateStr);
            renderDateSummary(calculateSummary(freshData));
            renderTransactionList(freshData);
            updateSyncStatus("Data diperbarui.", "normal");
        } else if (syncRes.reason === "ALREADY_UP_TO_DATE") {
            updateSyncStatus("Data sudah terbaru.", "normal");
        } else if (syncRes.reason === "NO_SERVER_METADATA") {
            updateSyncStatus("Cache digunakan.", "normal");
        } else {
            updateSyncStatus("Offline. Menggunakan cache.", "offline");
        }
    } catch (err) {
        updateSyncStatus("Offline. Menggunakan cache.", "offline");
    }
}

/**
 * Handler Tombol Sinkron Manual (Menunggu proses sync selesai)
 */
async function handleManualSyncDate(dateStr, buttonEl, renderCallback) {
    if (!buttonEl) return;
    
    buttonEl.disabled = true;
    updateSyncStatus("Menyinkronkan data...", "updating");

    try {
        const syncRes = await syncDateIfNeeded(dateStr);
        const freshData = await getLocalTransactionsByDate(dateStr);
        renderCallback();

        if (syncRes.updated) {
            updateSyncStatus("Data berhasil diperbarui.", "normal");
        } else if (syncRes.reason === "ALREADY_UP_TO_DATE") {
            updateSyncStatus("Data sudah terbaru.", "normal");
        } else {
            updateSyncStatus("Gagal menyinkronkan. Menggunakan cache.", "offline");
        }
    } catch (err) {
        updateSyncStatus("Gagal menyinkronkan. Menggunakan cache.", "offline");
    } finally {
        buttonEl.disabled = false;
    }
}

/**
 * Helper format tampilan tanggal kecil (contoh: "22/09/2026")
 */


async function loadPerformance() {
    try {
        const performance =
            await getPerformanceData();

        renderPerformanceCharts(
            performance
        );

    } catch (error) {
        console.error(
            "Gagal memuat performa:",
            error
        );
    }
}

loadPerformance();