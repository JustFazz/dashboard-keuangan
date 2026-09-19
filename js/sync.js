import { openDB } from "./db.js";
import { SYNC_QUEUE_STORE } from "./config.js";
import { showToast } from "./utils.js";

export function firebaseLogin() {
    const email = document.getElementById("firebase-email").value.trim();
    const password = document.getElementById("firebase-password").value;
    const status = document.getElementById("firebase-login-status");

    if (!email || !password) {
        status.textContent = "Email dan password harus diisi.";
        return;
    }
    status.textContent = "Sedang login...";

    firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(() => {
            status.textContent = "Login berhasil.";
            document.getElementById("firebase-login-screen").style.display =
                "none";
        })
        .catch((error) => {
            console.error(error);
            status.textContent = "Login gagal: " + error.message;
        });
}

function getFirebaseDatePath(dateOnly) {
    const [ year, month, day ] = dateOnly.split("-");

    return `${firebase.auth().currentUser?.uid}/${year}/${month}/${day}`;
}

// DB

export async function addToSyncQueue(operation, transactionId, data = null) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, "readwrite");
        const store = tx.objectStore(SYNC_QUEUE_STORE);

        const queueItem = {
            queueId:
                Date.now().toString() +
                "-" +
                Math.random().toString(36).substring(2, 8),
            operation,
            transactionId,
            data,
            status: "pending",
            createdAt: Date.now(),
        };

        const req = store.add(queueItem);
        req.onsuccess = () => resolve(queueItem);
        req.onerror = () => reject(req.error);
    });
}

export async function getSyncQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, "readonly");
        const store = tx.objectStore(SYNC_QUEUE_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getPendingSyncQueue() {
    const queue = await getSyncQueue();
    return queue.filter((item) => item.status === "pending");
}

export async function updateSyncQueueStatus(queueId, status) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, "readwrite");
        const store = tx.objectStore(SYNC_QUEUE_STORE);
        const getReq = store.get(queueId);

        getReq.onsuccess = () => {
            const item = getReq.result;
            if (!item) {
                reject(new Error("Queue item tidak ditemukan"));
                return;
            }
            item.status = status;
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve(item);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

// PROCESS

export async function processSyncQueueItem(queueItem) {
    try {
        if (queueItem.operation === "create") {
            await syncCreateToFirebase(queueItem);

        } else if (queueItem.operation === "update") {
            await syncUpdateToFirebase(queueItem);

        } else if (queueItem.operation === "delete") {
            await syncDeleteToFirebase(queueItem);

        } else {
            throw new Error(
                "Operation belum didukung: " + queueItem.operation
            );
        } await updateSyncQueueStatus(queueItem.queueId, "ready");
        return { success: true, queueItem };
    } catch (error) {
        console.error("Sync gagal:", error);
        return { success: false, queueItem, error };
    }
}

let syncRunning = false;
let syncSuccess = false;

export async function processPendingSyncQueue() {
    if (syncRunning) return;

    syncRunning = true;

    try {
        while (true) {
            const pendingQueue = (await getPendingSyncQueue())
                .sort((a, b) => a.createdAt - b.createdAt);

            if (pendingQueue.length === 0) {
                break;
            }

            const queueItem = pendingQueue[ 0 ];

            console.log("MULAI:", queueItem.queueId);

            const result = await processSyncQueueItem(queueItem);

            console.log("HASIL:", result);

            console.log(
                `Queue: ${queueItem.queueId}\nSuccess: ${result.success}`
            );

            if (!result.success) {
                console.log("BREAK");
                syncSuccess = false;
                break;
            }
            syncSuccess = true;
        }

    } catch (error) {
        console.error("Sync Queue error:", error);

    } finally {
        syncRunning = false;
        showToast("Sync " + (syncSuccess ? "Selesai" : "Pending"))
    }
}

// FIREBASE OPERATION

export async function updateFirebaseMetadata(dateOnly) {
    if (!dateOnly) {
        throw new Error("dateOnly tidak ditemukan");
    }

    const datePath = getFirebaseDatePath(dateOnly);

    const metadataRef = firebase
        .database()
        .ref(`${datePath}/metadata`);

    const result = await metadataRef.transaction((metadata) => {
        if (!metadata) {
            return {
                version: 1,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
        }

        return {
            version: (metadata.version || 0) + 1,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
    });

    return result.snapshot.val();
}


export async function syncCreateToFirebase(queueItem) {
    if (queueItem.operation !== "create")
        throw new Error("Operation bukan create");
    const data = queueItem.data;
    if (!data || !data.id) throw new Error("Data transaksi tidak valid");
    const date = data.dateOnly;

    if (!date) {
        throw new Error("dateOnly tidak ditemukan");
    }

    const datePath = getFirebaseDatePath(date);
    const transactionKey = String(data.id);
    const transactionRef = firebase
        .database()
        .ref(`${datePath}/transactions/${transactionKey}`);
    await transactionRef.set(data);
    await updateFirebaseMetadata(date);
    return true;
}

export async function syncUpdateToFirebase(queueItem) {
    if (queueItem.operation !== "update")
        throw new Error("Operation bukan update");
    const data = queueItem.data;
    if (!data || !data.id)
        throw new Error("Data transaksi tidak valid");
    const date = data.dateOnly;

    if (!date) {
        throw new Error("dateOnly tidak ditemukan");
    }

    const datePath = getFirebaseDatePath(date);
    const transactionKey = String(data.id);
    const transactionRef = firebase
        .database()
        .ref(`${datePath}/transactions/${transactionKey}`);

    // Update transaksi
    await transactionRef.set(data);

    // Update metadata setelah transaksi berhasil
    await updateFirebaseMetadata(date);

    return true;
}

export async function syncDeleteToFirebase(queueItem) {
    if (queueItem.operation !== "delete")
        throw new Error("Operation bukan delete");

    const data = queueItem.data;

    if (!data || !data.id)
        throw new Error("Data transaksi tidak valid");

    const date = data.dateOnly;

    if (!date) {
        throw new Error("dateOnly tidak ditemukan");
    }

    const datePath = getFirebaseDatePath(date);
    const transactionKey = String(data.id);

    const transactionRef = firebase
        .database()
        .ref(`${datePath}/transactions/${transactionKey}`);

    // Hapus transaksi
    await transactionRef.remove();

    // Update metadata setelah transaksi berhasil dihapus
    await updateFirebaseMetadata(date);

    return true;
}
