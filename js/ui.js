import { state } from "./config.js";
import {
    formatRupiah,
    playSound,
    showToast,
    getTodayDateString,
} from "./utils.js";
import { dbAdd, dbGetAll, dbUpdate, dbDelete } from "./db.js";
import { addToSyncQueue, processPendingSyncQueue } from "./sync.js";

// ==========================================================================
// 1. NAVIGASI TAB & MODE
// ==========================================================================

export function switchTab(tabName) {
    const isInput = tabName === "input";

    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".page-content").forEach((page) => page.classList.remove("active"));

    document.getElementById(isInput ? "tab-input-btn" : "tab-riwayat-btn").classList.add("active");
    document.getElementById(isInput ? "page-input" : "page-riwayat").classList.add("active");
}

export function unlockApp() {
    const inputEl = document.getElementById("app-pin-input");
    if (inputEl.value === state.appPin) {
        document.getElementById("app-lock-screen").style.display = "none";
        inputEl.value = "";
        showToast("Aplikasi Berhasil Dibuka");
    } else {
        showToast("PIN Salah!");
        inputEl.value = "";
    }
}

export function setSubTab(subTab) {
    state.currentSubTab = subTab;
    document.querySelectorAll(".sub-tab-btn").forEach((btn) => btn.classList.remove("active"));

    const subTabMap = {
        all: "subtab-all",
        Cash: "subtab-cash",
        QRIS: "subtab-qris",
        Bank: "subtab-bank",
        Out: "subtab-out",
    };

    if (subTabMap[ subTab ]) {
        document.getElementById(subTabMap[ subTab ]).classList.add("active");
    }

    filterHistoryDOM();
}

export function setMode(mode) {
    state.currentMode = mode;
    const lowerMode = mode.toLowerCase();

    document.querySelectorAll(".mode-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`.${lowerMode}-mode`).classList.add("active");
    document.getElementById("active-mode-label").innerText = mode;

    document.getElementById("btn-save").className = `key-btn key-submit ${lowerMode}-mode`;

    const ketGroup = document.getElementById("group-keterangan");
    const isOut = mode === "Out";
    ketGroup.style.display = isOut ? "flex" : "none";
    if (!isOut) document.getElementById("input-keterangan").value = "";

    const transferTypeGroup = document.getElementById("group-transfer-type");
    const isTransfer = mode === "Transfer";
    transferTypeGroup.style.display = isTransfer ? "grid" : "none";
    if (isTransfer) setTransferType("qris");
}

export function setTransferType(type) {
    state.currentTransferType = type;
    document.getElementById("btn-transfer-qris").classList.toggle("active", type === "qris");
    document.getElementById("btn-transfer-bank").classList.toggle("active", type === "bank");
}
export async function displayVersion() {
    const response = await fetch("./sw.js");
    const text = await response.text();

    const firstLine = text.split(/\r?\n/)[ 0 ];

    const APP_VERSION = firstLine
        .match(/["']([^"']+)["']/)?.[ 1 ];

    document.getElementById("version").textContent = APP_VERSION;
}

// ==========================================================================
// 2. KEYPAD & DISPLAY LOGIC
// ==========================================================================

export function pressKey(key) {
    if (key === "C") {
        state.rawAmount = "0";
    } else if (key === "BACK") {
        state.rawAmount = state.rawAmount.length > 1 ? state.rawAmount.slice(0, -1) : "0";
    } else if (key === "00") {
        if (state.rawAmount !== "0") state.rawAmount += "00";
    } else {
        if (state.rawAmount === "0") {
            state.rawAmount = key;
        } else if (state.rawAmount.length < 12) {
            state.rawAmount += key;
        }
    }
    updateDisplay();
}

export function updateDisplay() {
    const val = parseInt(state.rawAmount, 10) || 0;
    document.getElementById("display-amount").innerText = formatRupiah(val);
}

export function getDisplayType(item) {
    if (item.type === "Transfer") {
        return item.subType === "bank" ? "Bank" : "QRIS";
    }
    return item.type;
}

// ==========================================================================
// 3. OLAH & SIMPAN TRANSAKSI
// ==========================================================================

export async function saveTransaction() {
    const amount = parseInt(state.rawAmount, 10);
    if (!amount || amount <= 0) return showToast("Nominal transaksi tidak valid!");

    const noteInput = document.getElementById("input-keterangan").value.trim();
    let note = noteInput;

    if (state.currentMode === "Out" && !note) {
        return showToast("Harap isi keterangan pengeluaran!");
    }

    if (!note) {
        if (state.currentMode === "Cash") note = "Pemasukan Cash";
        else if (state.currentMode === "Transfer") {
            note = state.currentTransferType === "qris" ? "Pemasukan QRIS" : "Pemasukan Bank";
        }
    }

    const now = new Date();
    const dateOnly = getTodayDateString();
    const timeOnly = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const data = {
        id: Date.now(),
        type: state.currentMode,
        subType: state.currentMode === "Transfer" ? state.currentTransferType : null,
        amount: amount,
        note: note,
        dateOnly: dateOnly,
        timeOnly: timeOnly,
        verified: false,
    };

    await dbAdd(data);
    await addToSyncQueue("create", data.id, data);
    processPendingSyncQueue();
    state.rawAmount = "0";
    updateDisplay();
    document.getElementById("input-keterangan").value = "";

    await renderRecentTransactions();
    await renderHistory();

    playSound("success");
    setMode("Cash");
    showToast("Transaksi berhasil disimpan!");
}

export async function deleteTransaction(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    const transactions = await dbGetAll();
    const data = transactions.find((tx) => tx.id === id);

    if (!data) return showToast("Transaksi tidak ditemukan!");

    await addToSyncQueue("delete", data.id, data);
    await dbDelete(id);
    processPendingSyncQueue();
    await renderRecentTransactions();
    await renderHistory();
    showToast("Transaksi berhasil dihapus");
}

// ==========================================================================
// 4. RENDER & FILTER UI
// ==========================================================================

export async function renderRecentTransactions() {
    const recentList = document.getElementById("recent-list");
    if (!recentList) return;
    recentList.innerHTML = "";

    const all = await dbGetAll();
    all.sort((a, b) => b.id - a.id);
    const items = all.slice(0, 3);

    if (items.length === 0) {
        recentList.innerHTML = '<div class="empty-state">Belum ada transaksi.</div>';
        return;
    }

    items.forEach((item) => {
        const displayType = getDisplayType(item);
        const el = document.createElement("div");
        el.className = "recent-item";
        el.innerHTML = `
            <div class="left">
                <span class="type-badge ${displayType}">${displayType}</span>
                <span>${item.note}</span>
            </div>
            <div class="right">
                <span>${formatRupiah(item.amount)}</span>
                <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        `;
        recentList.appendChild(el);
    });
}

export async function renderHistory() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";

    const all = await dbGetAll();
    const dateFiltered = all.filter((i) => i.dateOnly === selectedDate);

    let totalCash = 0, totalQris = 0, totalBank = 0, totalOut = 0;
    dateFiltered.forEach((i) => {
        if (i.type === "Cash") totalCash += i.amount;
        else if (i.type === "Out") totalOut += i.amount;
        else if (i.type === "Transfer") {
            if (i.subType === "bank") totalBank += i.amount;
            else totalQris += i.amount;
        }
    });

    const totalPemasukan = totalCash + totalQris + totalBank;
    const balance = totalCash - totalOut;

    document.getElementById("stat-total-pemasukan").innerText = formatRupiah(totalPemasukan);
    document.getElementById("stat-total-cash").innerText = formatRupiah(totalCash);
    document.getElementById("stat-total-qris").innerText = formatRupiah(totalQris);
    document.getElementById("stat-total-bank").innerText = formatRupiah(totalBank);
    document.getElementById("stat-total-out").innerText = formatRupiah(totalOut);
    document.getElementById("stat-balance").innerText = formatRupiah(balance);

    if (dateFiltered.length === 0) {
        historyList.innerHTML = '<div class="empty-state">Tidak ada transaksi pada tanggal ini.</div>';
        document.getElementById("history-count").innerText = "0 Catatan";
        return;
    }

    dateFiltered.sort((a, b) => b.id - a.id);
    dateFiltered.forEach((item) => {
        const displayType = getDisplayType(item);
        const el = document.createElement("div");
        el.className = "history-item";

        el.dataset.type = item.type;
        el.dataset.subtype = item.subType || "";

        el.innerHTML = `
            <div class="item-main">
                <span class="type-badge ${displayType}">${displayType}</span>
                <div class="item-details">
                    <span class="item-amount">${formatRupiah(item.amount)}</span>
                    <span class="item-note">${item.note}</span>
                </div>
            </div>
            <div class="item-actions">
                <span class="item-time"><i class="fa-regular fa-clock"></i> ${item.timeOnly}</span>
                <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete-btn" onclick="deleteTransaction(${item.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        historyList.appendChild(el);
    });

    filterHistoryDOM();
}

export function filterHistoryDOM() {
    const historyList = document.getElementById("history-list");
    const items = historyList.querySelectorAll(".history-item");
    let visibleCount = 0;

    items.forEach((el) => {
        const { type, subtype: subType } = el.dataset;

        let shouldShow = false;
        if (state.currentSubTab === "all") shouldShow = true;
        else if (state.currentSubTab === "Cash") shouldShow = type === "Cash";
        else if (state.currentSubTab === "Out") shouldShow = type === "Out";
        else if (state.currentSubTab === "QRIS") shouldShow = type === "Transfer" && (subType === "qris" || subType === "");
        else if (state.currentSubTab === "Bank") shouldShow = type === "Transfer" && subType === "bank";

        if (shouldShow) {
            el.style.display = "";
            visibleCount++;
        } else {
            el.style.display = "none";
        }
    });

    document.getElementById("history-count").innerText = `${visibleCount} Catatan`;

    let emptyState = historyList.querySelector(".empty-state-subtab");
    if (visibleCount === 0 && items.length > 0) {
        if (!emptyState) {
            emptyState = document.createElement("div");
            emptyState.className = "empty-state empty-state-subtab";
            emptyState.innerText = "Tidak ada transaksi pada sub-tab ini.";
            historyList.appendChild(emptyState);
        }
        emptyState.style.display = "";
    } else if (emptyState) {
        emptyState.style.display = "none";
    }
}

// ==========================================================================
// 5. MANAJEMEN MODAL (EDIT & PIN)
// ==========================================================================

export async function openEditModal(id) {
    const all = await dbGetAll();
    const item = all.find((t) => t.id === id);
    if (!item) return;

    const defaultNotes = [ "Pemasukan Cash", "Pemasukan QRIS", "Pemasukan Bank" ];

    document.getElementById("edit-id").value = item.id;
    document.getElementById("edit-type").value =
        item.type === "Transfer"
            ? (item.subType === "bank" ? "Transfer-bank" : "Transfer-qris")
            : item.type;

    document.getElementById("edit-amount").value = item.amount;
    document.getElementById("edit-keterangan").value = defaultNotes.includes(item.note) ? "" : item.note;
    document.getElementById("edit-modal").classList.add("active");
}

export function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("active");
}

export async function handleEditSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("edit-id").value, 10);
    const selectedType = document.getElementById("edit-type").value;
    const amount = parseInt(document.getElementById("edit-amount").value, 10);
    const note = document.getElementById("edit-keterangan").value.trim();

    const all = await dbGetAll();
    const existing = all.find((t) => t.id === id);

    if (existing) {
        if (selectedType.startsWith("Transfer-")) {
            existing.type = "Transfer";
            existing.subType = selectedType === "Transfer-bank" ? "bank" : "qris";
        } else {
            existing.type = selectedType;
            existing.subType = null;
        }

        existing.amount = amount;
        existing.note =
            note ||
            (existing.type === "Cash"
                ? "Pemasukan Cash"
                : existing.type === "Out"
                    ? "Pengeluaran"
                    : existing.subType === "bank" ? "Pemasukan Bank" : "Pemasukan QRIS");
        await dbUpdate(existing);
        await addToSyncQueue("update", existing.id, existing);
        processPendingSyncQueue();
        await renderRecentTransactions();
        await renderHistory();
        closeEditModal();
        showToast("Transaksi diperbarui!");
    }
}

export function openChangePinModal() {
    document.getElementById("pin-old").value = "";
    document.getElementById("pin-new").value = "";
    document.getElementById("pin-confirm").value = "";
    document.getElementById("change-pin-modal").classList.add("active");
}

export function closeChangePinModal() {
    document.getElementById("change-pin-modal").classList.remove("active");
}

export function handleChangePinSubmit(e) {
    e.preventDefault();
    const oldPin = document.getElementById("pin-old").value;
    const newPin = document.getElementById("pin-new").value;
    const confirmPin = document.getElementById("pin-confirm").value;

    if (oldPin !== state.appPin) return showToast("PIN saat ini tidak sesuai!");
    if (newPin.length !== 4 || isNaN(newPin)) return showToast("PIN Baru harus 4 digit angka!");
    if (newPin !== confirmPin) return showToast("Konfirmasi PIN Baru tidak cocok!");

    state.appPin = newPin;
    localStorage.setItem("app_pin", newPin);
    closeChangePinModal();
    showToast("PIN Aplikasi berhasil diperbarui!");
}
