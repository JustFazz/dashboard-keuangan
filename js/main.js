import { loadComponents } from "./component-loader.js";
import { getTodayDateString, keepScreenOn } from "./utils.js";
import { seedInitialDataIfEmpty } from "./db.js";
import { initFirebase } from "./firebase-config.js";
import { firebaseLogin, processPendingSyncQueue } from "./sync.js";
import * as UI from "./ui.js";
import * as Storage from "./storage.js";
import { initTestGlobals } from "./test.js";

// Binding fungsi UI ke Objek Window agar kompatibel dengan atribut HTML inline (onclick, onchange, onSubmit)
window.firebaseLogin = firebaseLogin;
window.processPendingSyncQueue = processPendingSyncQueue;
window.renderHistory = UI.renderHistory;
window.switchTab = UI.switchTab;
window.unlockApp = UI.unlockApp;
window.setSubTab = UI.setSubTab;
window.setMode = UI.setMode;
window.setTransferType = UI.setTransferType;
window.pressKey = UI.pressKey;
window.saveTransaction = UI.saveTransaction;
window.deleteTransaction = UI.deleteTransaction;
window.openEditModal = UI.openEditModal;
window.closeEditModal = UI.closeEditModal;
window.handleEditSubmit = UI.handleEditSubmit;
window.openChangePinModal = UI.openChangePinModal;
window.closeChangePinModal = UI.closeChangePinModal;
window.handleChangePinSubmit = UI.handleChangePinSubmit;

window.exportCSV = Storage.exportCSV;
window.importCSV = Storage.importCSV;
window.exportJSONBackup = Storage.exportJSONBackup;
window.importJSONRestore = Storage.importJSONRestore;

// Inisialisasi variabel tes di global scope
initTestGlobals();
// Load Page
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load HTML Komponen
    await loadComponents();
    initFirebase();

    // 2. Inisialisasi State & Event UI
    const lockScreen = document.getElementById("app-lock-screen");
    if (lockScreen) lockScreen.style.display = "flex";

    const datePicker = document.getElementById("history-date-picker");
    if (datePicker) datePicker.value = getTodayDateString();

    UI.updateDisplay();
    UI.displayVersion();
    await seedInitialDataIfEmpty();
    UI.renderRecentTransactions();
    UI.renderHistory();
    keepScreenOn();
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        keepScreenOn();
    }
});