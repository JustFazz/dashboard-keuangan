/**
 * Modul IndexedDB - Monitoring Toko (HP2)
 * Bertanggung jawab penuh atas penyimpanan dan pemanggilan data lokal.
 */

/**
 * Membuka koneksi ke IndexedDB dan membuat struktur database jika belum ada.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store 1: transactions (keyPath: "id", index: "dateOnly")
            if (!db.objectStoreNames.contains("transactions")) {
                const txStore = db.createObjectStore("transactions", { keyPath: "id" });
                txStore.createIndex("dateOnly", "dateOnly", { unique: false });
            }

            // Store 2: syncMetadata (keyPath: "date")
            if (!db.objectStoreNames.contains("syncMetadata")) {
                db.createObjectStore("syncMetadata", { keyPath: "date" });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject("Gagal membuka IndexedDB: " + event.target.error);
        };
    });
}

/**
 * Membaca seluruh transaksi lokal berdasarkan tanggal tertentu (YYYY-MM-DD).
 * @param {string} dateOnly - Tanggal format "YYYY-MM-DD"
 * @returns {Promise<Array>} Array objek transaksi
 */
async function getLocalTransactionsByDate(dateOnly) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        const index = store.index("dateOnly");
        const request = index.getAll(dateOnly);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject("Gagal mengambil transaksi tanggal " + dateOnly + ": " + e.target.error);
    });
}

/**
 * Membaca seluruh transaksi lokal dalam satu bulan (YYYY-MM).
 * @param {string} yearMonth - Format "YYYY-MM"
 * @returns {Promise<Array>} Array objek transaksi dalam bulan tersebut
 */
async function getLocalTransactionsByMonth(yearMonth) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        const request = store.openCursor();
        const results = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.dateOnly && cursor.value.dateOnly.startsWith(yearMonth)) {
                    results.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = (e) => reject("Gagal mengambil transaksi bulan " + yearMonth + ": " + e.target.error);
    });
}

/**
 * Mengganti secara utuh data transaksi lokal pada tanggal tertentu.
 * Menghapus transaksi lama pada tanggal tersebut lalu menyimpan data transaksi baru.
 * @param {string} dateOnly - Tanggal format "YYYY-MM-DD"
 * @param {Array} transactionsArray - Array objek transaksi baru dari Firebase
 * @returns {Promise<void>}
 */
async function replaceLocalTransactionsByDate(dateOnly, transactionsArray) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("transactions", "readwrite");
        const store = tx.objectStore("transactions");
        const index = store.index("dateOnly");
        const request = index.getAllKeys(dateOnly);

        request.onsuccess = () => {
            const keysToDelete = request.result || [];
            
            // 1. Hapus semua record transaksi lama untuk tanggal ini
            keysToDelete.forEach((key) => store.delete(key));

            // 2. Simpan record transaksi baru jika ada
            if (Array.isArray(transactionsArray)) {
                transactionsArray.forEach((item) => {
                    store.put({
                        id: item.id,
                        type: item.type,
                        subType: item.subType || null,
                        amount: Number(item.amount) || 0,
                        note: item.note || "",
                        dateOnly: item.dateOnly,
                        timeOnly: item.timeOnly,
                        verified: Boolean(item.verified)
                    });
                });
            }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject("Gagal memperbarui transaksi lokal: " + e.target.error);
    });
}

/**
 * Membaca metadata sinkronisasi lokal untuk tanggal tertentu.
 * @param {string} dateOnly - Tanggal format "YYYY-MM-DD"
 * @returns {Promise<Object|null>} Object metadata { date, version, syncedAt } atau null jika belum pernah disinkronkan
 */
async function getLocalSyncMetadata(dateOnly) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("syncMetadata", "readonly");
        const store = tx.objectStore("syncMetadata");
        const request = store.get(dateOnly);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject("Gagal mengambil metadata lokal: " + e.target.error);
    });
}

/**
 * Menyimpan atau memperbarui data metadata sinkronisasi lokal.
 * @param {Object} metadataObj - Object { date: "YYYY-MM-DD", version: number, syncedAt: timestamp }
 * @returns {Promise<void>}
 */
async function saveLocalSyncMetadata(metadataObj) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("syncMetadata", "readwrite");
        const store = tx.objectStore("syncMetadata");
        const request = store.put({
            date: metadataObj.date,
            version: metadataObj.version,
            syncedAt: metadataObj.syncedAt || Date.now()
        });

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject("Gagal menyimpan metadata lokal: " + e.target.error);
    });
}

async function getTransactionsForRange(dates) {
    const months = [
        ...new Set(
            dates.map(date => date.slice(0, 7))
        )
    ];

    const results = await Promise.all(
        months.map(month =>
            getLocalTransactionsByMonth(month)
        )
    );

    return results.flat().filter(transaction =>
        dates.includes(transaction.dateOnly)
    );
}
async function getLocalTransactionsByDateRange(startDate, endDate) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        const index = store.index("dateOnly");

        const range = IDBKeyRange.bound(
            startDate,
            endDate
        );

        const request = index.getAll(range);

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = (e) => {
            reject(
                "Gagal mengambil transaksi " +
                `${startDate} sampai ${endDate}: ` +
                e.target.error
            );
        };
    });
}