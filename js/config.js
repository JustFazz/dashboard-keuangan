export const state = {
    currentMode: "Cash",
    currentSubTab: "all",
    rawAmount: "0",
    currentTransferType: "qris",
    appPin: localStorage.getItem("app_pin") || "1234"
};

export const DB_NAME = "CatatanTransaksiDB";
export const DB_VERSION = 2;
export const STORE_NAME = "transactions";
export const SYNC_QUEUE_STORE = "syncQueue";
