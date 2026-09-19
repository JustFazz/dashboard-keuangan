import {
    addToSyncQueue,
    getSyncQueue,
    getPendingSyncQueue,
    updateSyncQueueStatus,
    syncCreateToFirebase,
    processSyncQueueItem,
    processPendingSyncQueue,
    updateFirebaseMetadata,
} from "./sync.js";
import { getTodayDateString } from "./utils.js";

export function initTestGlobals() {
    window.testProcessSyncQueue = async function() {
        try {
            const pendingQueue = await getPendingSyncQueue();
            if (pendingQueue.length === 0)
                return alert("Tidak ada queue pending.");

            const result = await processSyncQueueItem(pendingQueue[ 0 ]);
            if (result.success) {
                console.log(
                    `Sync berhasil!\n\nQueue ID: ${result.queueItem.queueId}\nStatus: ready`,
                );
            } else {
                alert(`Sync gagal!\n\n${result.error.message}`);
            }
        } catch (error) {
            alert("Error:\n" + error.message);
        }
    };

    window.testProcessPendingSyncQueue = async function() {
        try {
            await processPendingSyncQueue();
            const queue = await getPendingSyncQueue();
            alert(
                `Proses retry selesai.\n\nQueue pending tersisa: ${queue.length}`,
            );
        } catch (error) {
            alert("Error:\n" + error.message);
        }
    };

    window.testSyncQueue = async function() {
        try {
            const result = await addToSyncQueue("create", 999999, {
                id: 999999,
                type: "Transfer",
                subType: "Test",
                amount: 10000,
                note: "TEST SYNC QUEUE",
                dateOnly: getTodayDateString(),
                timeOnly: "16:00:00",
                verified: false,
            });
            alert(
                `QUEUE BERHASIL DIBUAT!\n\nOperation: ${result.operation}\nStatus: ${result.status}\nTransaction ID: ${result.transactionId}`,
            );
        } catch (error) {
            alert("QUEUE GAGAL!\n\n" + error.message);
        }
    };

    window.testGetSyncQueue = async function() {
        try {
            const queue = await getSyncQueue();
            console.log("SYNC QUEUE:", queue);
            alert(
                `Jumlah queue: ${queue.length}\n\n${JSON.stringify(queue, null, 2)}`,
            );
        } catch (error) {
            alert("GAGAL MEMBACA QUEUE!\n\n" + error.message);
        }
    };

    window.testUpdateSyncQueue = async function() {
        try {
            const queue = await getPendingSyncQueue();
            if (queue.length === 0) return alert("Tidak ada queue pending");

            const item = queue[ 0 ];
            await updateSyncQueueStatus(item.queueId, "ready");
            alert(`Berhasil!\n\nQueue ID: ${item.queueId}\nStatus: ready`);
        } catch (error) {
            alert("GAGAL!\n\n" + error.message);
        }
    };

    window.testFirebaseCreateSync = async function() {
        try {
            const queue = await getPendingSyncQueue();
            if (queue.length === 0)
                return alert("Tidak ada queue pending untuk dites.");

            const item = queue[ 0 ];
            if (item.operation !== "create")
                return alert("Queue pertama bukan operation create.");

            await syncCreateToFirebase(item);
            alert(
                `BERHASIL DIKIRIM KE FIREBASE!\n\nQueue ID: ${item.queueId}\nTransaction ID: ${item.transactionId}`,
            );
        } catch (error) {
            console.error(error);
            alert("GAGAL SYNC KE FIREBASE!\n\n" + error.message);
        }
    };

    window.testPendingSyncQueue = async function() {
        try {
            const queue = await getPendingSyncQueue();
            console.log("PENDING QUEUE:", queue);
            alert(
                `Pending queue: ${queue.length}\n\n${JSON.stringify(queue, null, 2)}`,
            );
        } catch (error) {
            alert("GAGAL!\n\n" + error.message);
        }
    };

    window.testFirebaseMetadata = async function testFirebaseMetadata() {
        const result = await updateFirebaseMetadata("2026-09-14");

        console.log("Metadata berhasil:", result);

        alert("Version: " + result.version + "\nUpdated: " + result.updatedAt);
    };
}
