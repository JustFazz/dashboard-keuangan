/**
 * Modul Utility - Monitoring Toko (HP2)
 * Berisi fungsi-fungsi pembantu umum untuk pemformatan data dan kalkulasi summary.
 */

/**
 * Mendapatkan tanggal hari ini dalam format "YYYY-MM-DD"
 * @returns {string} Contoh: "2026-09-22"
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan bulan saat ini dalam format "YYYY-MM"
 * @returns {string} Contoh: "2026-09"
 */
function getCurrentMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

/**
 * Memformat angka nominal menjadi string Rupiah
 * @param {number} amount - Nominal angka
 * @returns {string} Contoh: "Rp 350.000"
 */
function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(value);
}
function formatDateLabel(dateOnlyStr) {
    console.log("dateOnlyStr:", dateOnlyStr);
console.log("type:", typeof dateOnlyStr);
    if (!dateOnlyStr) return "";
    const [y, m, d] = dateOnlyStr.split("-");
    return `${d}/${m}/${y}`;
}
function formatDateLabels(data) {
    return data.map(item => ({
        ...item,
        label: formatChartDate(item.label)
    }));
}
/**
 * Memformat string waktu "HH:mm:ss" menjadi "HH:mm"
 * @param {string} timeOnly - Contoh "10:32:15"
 * @returns {string} Contoh "10:32"
 */
function formatTime(timeOnly) {
    if (!timeOnly) return "--:--";
    const parts = timeOnly.split(":");
    if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
    }
    return timeOnly;
}

/**
 * Mengidentifikasi kategori tampilan untuk jenis transaksi.
 * Memperhitungkan backward compatibility data lama (misal: "Tunai").
 * @param {Object} transaction - Objek transaksi
 * @returns {Object} { label: string, category: string }
 */
function formatTransactionType(transaction) {
    const type = (transaction.type || "").trim().toLowerCase();
    const subType = (transaction.subType || "").trim().toLowerCase();

    // 1. Transaksi Keluar
    if (type === "out" || type === "keluar") {
        return { label: "OUT", category: "out" };
    }

    // 2. Transaksi Transfer / QRIS / Bank
    if (type === "transfer") {
        if (subType === "qris") {
            return { label: "QRIS", category: "qris" };
        }
        if (subType === "bank") {
            return { label: "BANK", category: "bank" };
        }
        return { label: "TRANSFER", category: "transfer" };
    }

    if (type === "qris" || subType === "qris") {
        return { label: "QRIS", category: "qris" };
    }

    if (type === "bank" || subType === "bank") {
        return { label: "BANK", category: "bank" };
    }

    // 3. Transaksi Tunai (Cash / Tunai)
    if (type === "cash" || type === "tunai") {
        return { label: "CASH", category: "cash" };
    }

    return { label: type.toUpperCase() || "CASH", category: "cash" };
}

/**
 * Menghitung seluruh ringkasan statistik dari array transaksi lokal.
 * Tidak meminta Firebase untuk menghitung summary.
 * 
 * Aturan kalkulasi:
 * - Omzet (Total): Jumlah nominal semua transaksi KECUALI 'Out'
 * - Cash: Jumlah transaksi 'Cash' / 'Tunai'
 * - QRIS: Jumlah transaksi 'QRIS'
 * - Bank: Jumlah transaksi 'Bank'
 * - Out: Jumlah transaksi 'Out' / 'Keluar'
 * - Sisa Cash: (Total Cash - Total Out)
 * - Count: Jumlah total catatan/transaksi
 * 
 * @param {Array} transactions - Array objek transaksi
 * @returns {Object} Hasil perhitungan 6 indikator
 */
function calculateSummary(transactions) {
    let totalOmzet = 0;
    let totalCash = 0;
    let totalQris = 0;
    let totalBank = 0;
    let totalOut = 0;

    if (Array.isArray(transactions)) {
        transactions.forEach((tx) => {
            const amount = Number(tx.amount) || 0;
            const typeInfo = formatTransactionType(tx);

            if (typeInfo.category === "out") {
                totalOut += amount;
            } else {
                // Semua transaksi selain Out masuk ke Total Omzet
                totalOmzet += amount;

                if (typeInfo.category === "cash") {
                    totalCash += amount;
                } else if (typeInfo.category === "qris") {
                    totalQris += amount;
                } else if (typeInfo.category === "bank") {
                    totalBank += amount;
                } else if (typeInfo.category === "transfer") {
                    // Jika transfer tanpa subType spesifik, kategorikan sementara ke bank
                    totalBank += amount;
                }
            }
        });
    }

    const sisaCash = totalCash - totalOut;

    return {
        count: Array.isArray(transactions) ? transactions.length : 0,
        totalOmzet: totalOmzet,
        totalCash: totalCash,
        totalQris: totalQris,
        totalBank: totalBank,
        totalOut: totalOut,
        sisaCash: sisaCash
    };
}
function formatChartDate(dateOnly) {
    const date = new Date(`${dateOnly}T00:00:00`);

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short"
    }).format(date);
}
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
function getDateRange(days) {
    const today = new Date();

    const dates = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);

        date.setDate(today.getDate() - i);

        dates.push(formatDate(date));
    }

    return dates;
}
function fillMissingDates(dates, aggregated) {
    const map = new Map(
        aggregated.map(item => [
            item.label,
            item.total
        ])
    );

    return dates.map(date => ({
        label: date,
        total: map.get(date) || 0
    }));
}
function fillMissingHours(aggregated) {
    const map = new Map(
        aggregated.map(item => [
            item.label,
            item.total
        ])
    );

    const result = [];

    for (let hour = 6; hour <= 22; hour++) {
        const label = `${String(hour).padStart(2, "0")}:00`;

        result.push({
            label,
            total: map.get(label) || 0
        });
    }

    return result;
}
function isSale(transaction) {
    if (transaction.type === "Cash") {
        return true;
    }

    if (
        transaction.type === "Transfer" &&
        ["qris", "bank"].includes(
            transaction.subType?.toLowerCase()
        )
    ) {
        return true;
    }

    return false;
}

function aggregateByHour(transactions) {
    const result = {};

    for (const transaction of transactions) {
        if (!isSale(transaction)) continue;

        const hour = transaction.timeOnly.slice(0, 2);

        if (!result[hour]) {
            result[hour] = 0;
        }

        result[hour] += Number(transaction.amount) || 0;
    }

    return Object.entries(result)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, total]) => ({
            label: `${hour}:00`,
            total
        }));
} 
function aggregateByDate(transactions) {
    const result = {};

    for (const transaction of transactions) {
        if (!isSale(transaction)) continue;

        const date = transaction.dateOnly;

        result[date] = (result[date] || 0) +
            (Number(transaction.amount) || 0);
    }

    return Object.entries(result)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({
            label: date,
            total
        }));
}
function getDateRangeBounds(days) {
    const today = new Date();

    const endDate = formatDate(today);

    const start = new Date(today);

    start.setDate(
        start.getDate() - (days - 1)
    );

    const startDate = formatDate(start);

    return {
        startDate,
        endDate
    };
}