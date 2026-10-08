/**
 * Modul Sinkronisasi - Monitoring Toko (HP2)
 * Bagian 1: Fungsi pembacaan data read-only dari Firebase Realtime Database.
 */

/**
 * Helper untuk mendapatkan path tanggal Firebase berdasarkan UID user yang login.
 * Mengubah "2026-09-22" menjadi "{uid}/data/2026/09/22"
 * @param {string} dateOnly - Format "YYYY-MM-DD"
 * @returns {string} Path Firebase
 */
function getFirebaseDatePath(dateOnly) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Pengguna belum terautentikasi (belum login).");
    }
    
    const [year, month, day] = dateOnly.split("-");
    // Sesuaikan prefix jika HP1 menggunakan ${user.uid}/data/...
    return `${user.uid}/${year}/${month}/${day}`;
}

/**
 * Helper untuk mendapatkan path bulan Firebase berdasarkan UID user yang login.
 * Mengubah "2026-09" menjadi "{uid}/data/2026/09"
 * @param {string} yearMonth - Format "YYYY-MM"
 * @returns {string} Path Firebase
 */
function getFirebaseMonthPath(yearMonth) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Pengguna belum terautentikasi (belum login).");
    }

    const [year, month] = yearMonth.split("-");
    return `${user.uid}/${year}/${month}`;
}

/**
 * Membaca metadata versi transaksi untuk tanggal tertentu dari Firebase.
 * @param {string} dateOnly - Format "YYYY-MM-DD"
 * @returns {Promise<Object|null>} Objek metadata { version, updatedAt } atau null jika tidak ada
 */
async function getFirebaseMetadata(dateOnly) {
    try {
        const path = `${getFirebaseDatePath(dateOnly)}/metadata`;
        const snapshot = await rtdb.ref(path).once("value");
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Gagal mengambil metadata Firebase untuk tanggal " + dateOnly + ":", error);
        throw error;
    }
}

/**
 * Membaca daftar transaksi untuk tanggal tertentu dari Firebase.
 * @param {string} dateOnly - Format "YYYY-MM-DD"
 * @returns {Promise<Array>} Array transaksi dari Firebase
 */
async function getFirebaseTransactions(dateOnly) {
    try {
        const path = `${getFirebaseDatePath(dateOnly)}/transactions`;
        const snapshot = await rtdb.ref(path).once("value");
        if (!snapshot.exists()) {
            return [];
        }

        const dataObj = snapshot.val();
        return Object.values(dataObj);
    } catch (error) {
        console.error("Gagal mengambil transaksi Firebase untuk tanggal " + dateOnly + ":", error);
        throw error;
    }
}

/**
 * Membaca node satu bulan dari Firebase ("{uid}/data/YYYY/MM") satu kali saja
 * untuk mengumpulkan metadata seluruh tanggal dalam bulan tersebut.
 * @param {string} yearMonth - Format "YYYY-MM"
 * @returns {Promise<Object>} Map metadata per tanggal { "YYYY-MM-DD": { version, updatedAt } }
 */
async function getFirebaseMonthMetadata(yearMonth) {
    try {
        const monthPath = getFirebaseMonthPath(yearMonth);
        const snapshot = await rtdb.ref(monthPath).once("value");

        const resultMap = {};

        if (!snapshot.exists()) {
            return resultMap;
        }

        const monthData = snapshot.val();
        const [year, month] = yearMonth.split("-");

        // monthData berisi key tanggal seperti "01", "02", ..., "31"
        Object.keys(monthData).forEach((dayKey) => {
            const dayData = monthData[dayKey];
            if (dayData && dayData.metadata) {
                const fullDate = `${year}-${month}-${dayKey}`;
                resultMap[fullDate] = dayData.metadata;
            }
        });

        return resultMap;
    } catch (error) {
        console.error("Gagal mengambil metadata bulan Firebase untuk " + yearMonth + ":", error);
        throw error;
    }
}

// Map untuk mencegah pemanggilan ganda sinkronisasi tanggal yang sama dalam waktu bersamaan
const dateSyncTasks = new Map();

/**
 * Fungsi utama sinkronisasi tanggal tunggal (Non-blocking).
 * Memeriksa apakah sinkronisasi tanggal tersebut sedang berjalan. Jika ya, mengembalikan Promise yang sama.
 * @param {string} dateOnly - Format "YYYY-MM-DD"
 * @returns {Promise<Object>} Status hasil { updated: boolean, reason: string }
 */
function syncDateIfNeeded(dateOnly) {
    if (dateSyncTasks.has(dateOnly)) {
        // Jika sedang berjalan untuk tanggal ini, kembalikan tugas yang sedang aktif
        return dateSyncTasks.get(dateOnly);
    }

    // Buat task sinkronisasi baru dan simpan di Map
    const taskPromise = performDateSync(dateOnly).finally(() => {
        // Hapus dari Map setelah selesai (baik sukses maupun gagal)
        dateSyncTasks.delete(dateOnly);
    });

    dateSyncTasks.set(dateOnly, taskPromise);
    return taskPromise;
}

/**
 * Eksekusi aktual perbandingan versi dan pembaruan data transaksi.
 * @param {string} dateOnly - Format "YYYY-MM-DD"
 * @returns {Promise<Object>}
 */
async function performDateSync(dateOnly) {
    try {
        // 1. Ambil metadata dari Firebase
        const fbMetadata = await getFirebaseMetadata(dateOnly);

        // Jika metadata Firebase tidak ada (misal belum ada transaksi di server)
        if (!fbMetadata || typeof fbMetadata.version === "undefined") {
            return { updated: false, reason: "NO_SERVER_METADATA" };
        }

        // 2. Ambil metadata lokal dari IndexedDB
        const localMetadata = await getLocalSyncMetadata(dateOnly);
        const localVersion = localMetadata ? localMetadata.version : null;

        // 3. Bandingkan versi Firebase vs Lokal
        if (localVersion !== null && localVersion === fbMetadata.version) {
            // Versi sama, tidak perlu download transaksi
            return { updated: false, reason: "ALREADY_UP_TO_DATE" };
        }

        // 4. Versi berbeda / belum pernah disinkronkan -> Download transaksi dari Firebase
        const remoteTransactions = await getFirebaseTransactions(dateOnly);

        // 5. Timpa data transaksi lokal di IndexedDB
        await replaceLocalTransactionsByDate(dateOnly, remoteTransactions);

        // 6. Simpan version baru ke metadata lokal IndexedDB
        await saveLocalSyncMetadata({
            date: dateOnly,
            version: fbMetadata.version,
            syncedAt: Date.now()
        });

        return { updated: true, reason: "SYNC_SUCCESS" };
    } catch (error) {
        console.warn(`Sinkronisasi tanggal ${dateOnly} gagal atau offline:`, error);
        return { updated: false, reason: "SYNC_FAILED", error: error.message };
    }
}
// Map untuk mencegah pemanggilan ganda sinkronisasi bulan yang sama dalam waktu bersamaan
const monthSyncTasks = new Map();

/**
 * Fungsi utama sinkronisasi bulan (Non-blocking).
 * Memeriksa apakah sinkronisasi bulan tersebut sedang berjalan. Jika ya, mengembalikan Promise yang sama.
 * @param {string} yearMonth - Format "YYYY-MM" (contoh: "2026-09")
 * @returns {Promise<Object>} Status hasil { changed: boolean, changedDates: Array, failedDates: Array }
 */
function syncMonthIfNeeded(yearMonth) {
    if (monthSyncTasks.has(yearMonth)) {
        return monthSyncTasks.get(yearMonth);
    }

    const taskPromise = performMonthSync(yearMonth).finally(() => {
        monthSyncTasks.delete(yearMonth);
    });

    monthSyncTasks.set(yearMonth, taskPromise);
    return taskPromise;
}

/**
 * Eksekusi aktual perbandingan versi dan pembaruan parsial transaksi bulanan.
 * @param {string} yearMonth - Format "YYYY-MM"
 * @returns {Promise<Object>}
 */
async function performMonthSync(yearMonth) {
    const changedDates = [];
    const failedDates = [];

    try {
        // 1. Ambil seluruh metadata tanggal pada bulan ini dalam 1 request
        const remoteMonthMeta = await getFirebaseMonthMetadata(yearMonth);
        const datesInMonth = Object.keys(remoteMonthMeta);

        // Jika di Firebase belum ada data sama sekali untuk bulan ini
        if (datesInMonth.length === 0) {
            return { changed: false, changedDates: [], failedDates: [] };
        }

        // 2. Bandingkan versi tiap tanggal dengan metadata lokal IndexedDB
        const datesToSync = [];
        for (const dateOnly of datesInMonth) {
            const fbMeta = remoteMonthMeta[dateOnly];
            if (fbMeta && typeof fbMeta.version !== "undefined") {
                const localMeta = await getLocalSyncMetadata(dateOnly);
                const localVersion = localMeta ? localMeta.version : null;

                // Jika versi lokal berbeda atau belum ada -> masukkan ke daftar download
                if (localVersion === null || localVersion !== fbMeta.version) {
                    datesToSync.push(dateOnly);
                }
            }
        }

        // Jika semua tanggal dalam bulan ini sudah versi terbaru
        if (datesToSync.length === 0) {
            return { changed: false, changedDates: [], failedDates: [] };
        }

        // 3. Download transaksi HANYA untuk tanggal-tanggal yang berubah/baru
        for (const dateOnly of datesToSync) {
            try {
                const syncResult = await performDateSync(dateOnly);
                if (syncResult.updated) {
                    changedDates.push(dateOnly);
                } else if (syncResult.reason === "SYNC_FAILED") {
                    failedDates.push(dateOnly);
                }
            } catch (err) {
                console.warn(`Gagal sinkronisasi parsial tanggal ${dateOnly}:`, err);
                failedDates.push(dateOnly);
            }
        }

        return {
            changed: changedDates.length > 0,
            changedDates: changedDates,
            failedDates: failedDates
        };
    } catch (error) {
        console.warn(`Gagal sinkronisasi bulan ${yearMonth}:`, error);
        return {
            changed: false,
            changedDates: changedDates,
            failedDates: failedDates,
            error: error.message
        };
    }
}
