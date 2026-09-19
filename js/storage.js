import { dbGetAll, dbClear, dbAdd, dbUpdate } from "./db.js";
import { showToast, getTodayDateString } from "./utils.js";
import { renderRecentTransactions, renderHistory } from "./ui.js";

export async function exportCSV() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const all = await dbGetAll();
    const filtered = all.filter((i) => i.dateOnly === selectedDate);

    if (filtered.length === 0) {
        return showToast("Tidak ada data pada tanggal ini!");
    }

    let csv = "\uFEFF<<< TRANSAKSI CASH >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam\n";
    filtered.filter((i) => i.type === "Cash").forEach((i) => {
        csv += `"${i.id}","Cash","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}"\n`;
    });

    csv += "\n<<< TRANSAKSI QRIS >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam,Status Verifikasi\n";
    filtered
        .filter((i) => i.type === "Transfer" && (i.subType === "qris" || !i.subType))
        .forEach((i) => {
            csv += `"${i.id}","QRIS","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}","${i.verified ? "Diverifikasi" : "Belum"}"\n`;
        });

    csv += "\n<<< TRANSAKSI BANK >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam,Status Verifikasi\n";
    filtered
        .filter((i) => i.type === "Transfer" && i.subType === "bank")
        .forEach((i) => {
            csv += `"${i.id}","Bank","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}","${i.verified ? "Diverifikasi" : "Belum"}"\n`;
        });

    csv += "\n<<< TRANSAKSI OUT >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam\n";
    filtered.filter((i) => i.type === "Out").forEach((i) => {
        csv += `"${i.id}","Out","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-${selectedDate}.csv`;
    link.click();
    showToast("Laporan CSV berhasil diunduh!");
}

export function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
        const lines = evt.target.result.split("\n");
        let count = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("<<<") || line.startsWith("ID")) continue;

            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches && matches.length >= 6) {
                const clean = matches.map((m) => m.replace(/^"|"$/g, ""));
                const rawType = clean[1];

                let mainType = rawType;
                let subType = null;

                if (rawType === "QRIS" || rawType === "Bank" || rawType === "Transfer") {
                    mainType = "Transfer";
                    subType = rawType === "Bank" ? "bank" : "qris";
                }

                await dbUpdate({
                    id: parseInt(clean[0], 10) || Date.now() + Math.random(),
                    type: mainType,
                    subType: subType,
                    amount: parseInt(clean[2], 10),
                    note: clean[3],
                    dateOnly: clean[4],
                    timeOnly: clean[5],
                    verified: clean[6] === "Diverifikasi",
                });
                count++;
            }
        }

        renderRecentTransactions();
        renderHistory();
        showToast(`Diimpor ${count} transaksi dari CSV`);
        e.target.value = "";
    };
    reader.readAsText(file);
}

export async function exportJSONBackup() {
    try {
        const allData = await dbGetAll();
        if (!allData || allData.length === 0) {
            return showToast("Tidak ada data transaksi untuk di-backup!");
        }

        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `backup_transaksi_${getTodayDateString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Backup JSON berhasil diunduh!");
    } catch (err) {
        showToast("Gagal membuat backup data!");
    }
}

export function importJSONRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    const confirmRestore = confirm(
        "⚠️ PERINGATAN RESTORE DATA:\n\nProses ini akan MENGHAPUS SELURUH DATA LAMA di aplikasi dan menggantinya dengan data dari file backup JSON.\n\nApakah Anda yakin ingin melanjutkan?"
    );

    if (!confirmRestore) {
        e.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (Array.isArray(data)) {
                await dbClear();
                for (const item of data) {
                    await dbAdd(item);
                }
                renderRecentTransactions();
                renderHistory();
                showToast("Restore Data Berhasil!");
            } else {
                showToast("Format file JSON tidak sesuai!");
            }
        } catch (err) {
            showToast("Gagal membaca atau memproses file JSON!");
        }
        e.target.value = "";
    };

    reader.readAsText(file);
}
