/**
 * Modul UI - Monitoring Toko (HP2)
 * Bertanggung jawab atas manipulasi DOM, rendering data, dan manajemen navigasi.
 */

/**
 * Mengontrol visibilitas antara layar Login dan Layar Dashboard Utama.
 * @param {string} viewName - "login" atau "dashboard"
 */
function showView(viewName) {
    const loginView = document.getElementById("login-view");
    const dashboardView = document.getElementById("dashboard-view");

    if (viewName === "login") {
        loginView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
    } else if (viewName === "dashboard") {
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
    }
}

/**
 * Berpindah tab navigasi pada dashboard (Hari Ini / Ringkasan Bulan / Transaksi per Tanggal).
 * @param {string} tabName - "today", "month", atau "date"
 */
function setActiveTab(tabName) {
    // 1. Update tombol navigasi
    const navButtons = document.querySelectorAll(".nav-pill");
    navButtons.forEach((btn) => {
        if (btn.getAttribute("data-tab") === tabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // 2. Update visibilitas seksi tab
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => {
        if (content.id === `tab-${tabName}`) {
            content.classList.remove("hidden");
            content.classList.add("active");
        } else {
            content.classList.add("hidden");
            content.classList.remove("active");
        }
    });
}

/**
 * Memperbarui pesan dan status visual pada Status Bar Sinkronisasi.
 * @param {string} message - Pesan teks status
 * @param {string} type - 'normal' | 'updating' | 'offline'
 */
function updateSyncStatus(message, type = "normal") {
    const statusBar = document.getElementById("sync-status-bar");
    const statusText = document.getElementById("sync-status-text");

    if (!statusBar || !statusText) return;

    statusText.textContent = message;

    // Reset class status
    statusBar.className = "sync-status";

    if (type === "updating") {
        statusBar.classList.add("updating");
    } else if (type === "offline") {
        statusBar.classList.add("offline");
    }
}

/**
 * Mengisi 6 indikator ringkasan pada halaman Hari Ini.
 * @param {Object} summary - Objek hasil calculateSummary()
 * @param {string} dateFormattedText - Tanggal header (contoh: "Hari Ini (22/09/2026)")
 */
function renderTodaySummary(summary, dateFormattedText) {
    if (dateFormattedText) {
        const heading = document.getElementById("today-date-heading");
        if (heading) heading.textContent = dateFormattedText;
    }

    document.getElementById("today-total").textContent = formatRupiah(summary.totalOmzet);
    document.getElementById("today-cash").textContent = formatRupiah(summary.totalCash);
    document.getElementById("today-qris").textContent = formatRupiah(summary.totalQris);
    document.getElementById("today-bank").textContent = formatRupiah(summary.totalBank);
    document.getElementById("today-out").textContent = formatRupiah(summary.totalOut);
    document.getElementById("today-sisa-cash").textContent = formatRupiah(summary.sisaCash);
}

/**
 * Mengisi 4 indikator ringkasan pada halaman Ringkasan Bulan (Total Omzet, Cash, QRIS, Bank).
 * @param {Object} summary - Objek hasil calculateSummary()
 */
function renderMonthSummary(summary) {
    document.getElementById("month-total").textContent = formatRupiah(summary.totalOmzet);
    document.getElementById("month-cash").textContent = formatRupiah(summary.totalCash);
    document.getElementById("month-qris").textContent = formatRupiah(summary.totalQris);
    document.getElementById("month-bank").textContent = formatRupiah(summary.totalBank);
}

/**
 * Mengisi 6 indikator ringkasan pada halaman Transaksi per Tanggal.
 * @param {Object} summary - Objek hasil calculateSummary()
 */
function renderDateSummary(summary) {
    document.getElementById("date-total").textContent = formatRupiah(summary.totalOmzet);
    document.getElementById("date-cash").textContent = formatRupiah(summary.totalCash);
    document.getElementById("date-qris").textContent = formatRupiah(summary.totalQris);
    document.getElementById("date-bank").textContent = formatRupiah(summary.totalBank);
    document.getElementById("date-out").textContent = formatRupiah(summary.totalOut);
    document.getElementById("date-sisa-cash").textContent = formatRupiah(summary.sisaCash);

    const countBadge = document.getElementById("date-count-badge");
    if (countBadge) {
        countBadge.textContent = `${summary.count} Catatan`;
    }
}

/**
 * Merender daftar item transaksi pada elemen #transaction-list.
 * Transaksi diurutkan berdasarkan jam (terbaru di paling atas).
 * @param {Array} transactions - Array objek transaksi
 */
function renderTransactionList(transactions) {
    const listContainer = document.getElementById("transaction-list");
    if (!listContainer) return;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">Tidak ada transaksi pada tanggal ini.</p>';
        return;
    }

    // Urutkan transaksi dari jam terbaru ke terlama
    const sortedList = [...transactions].sort((a, b) => {
        const timeA = a.timeOnly || "";
        const timeB = b.timeOnly || "";
        return timeB.localeCompare(timeA);
    });

    let html = "";

    sortedList.forEach((tx) => {
        const typeInfo = formatTransactionType(tx);
        const formattedAmount = formatRupiah(tx.amount);
        const formattedTime = formatTime(tx.timeOnly);
        const noteText = tx.note ? tx.note : "-";

        html += `
            <div class="tx-item">
                <div class="tx-left-group">
                    <span class="tx-badge ${typeInfo.category}">${typeInfo.label}</span>
                    <div class="tx-info">
                        <span class="tx-amount">${formattedAmount}</span>
                        <span class="tx-note">${escapeHtml(noteText)}</span>
                    </div>
                </div>
                <div class="tx-right-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${formattedTime}</span>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

/**
 * Helper untuk mencegah serangan Cross-Site Scripting (XSS) pada input catatan transaksi.
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createSalesChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    return new Chart(canvas, {
        type: "line",
        data: {
            labels: data.map(item => item.label),
            datasets: [{
                data: data.map(item => item.total),
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
async function getPerformanceData() {
    const todayDate = new Date();
    const todayString = formatDate(todayDate);


    // =========================
    // HARI INI
    // =========================

    const todayTransactions =
        await getLocalTransactionsByDate(
            todayString
        );

    const todayData = fillMissingHours(
        aggregateByHour(todayTransactions)
    );


    // =========================
    // 7 HARI
    // =========================

    const last7Dates = getDateRange(7);

    const last7Range =
        getDateRangeBounds(7);

    const last7Transactions =
        await getLocalTransactionsByDateRange(
            last7Range.startDate,
            last7Range.endDate
        );

    const last7Data = fillMissingDates(
        last7Dates,
        aggregateByDate(last7Transactions)
    );


    // =========================
    // 30 HARI
    // =========================

    const last30Dates = getDateRange(30);

    const last30Range =
        getDateRangeBounds(30);

    const last30Transactions =
        await getLocalTransactionsByDateRange(
            last30Range.startDate,
            last30Range.endDate
        );

    const last30Data = fillMissingDates(
        last30Dates,
        aggregateByDate(last30Transactions)
    );


    return {
        today: todayData,

        last7Days: formatDateLabels(
            last7Data
        ),

        last30Days: formatDateLabels(
            last30Data
        )
    };
}function renderPerformanceCharts(performance) {
    // Hapus chart lama jika fungsi dipanggil ulang
    if (todayChart) {
    //    todayChart.destroy();
    }

    if (last7DaysChart) {
     //   last7DaysChart.destroy();
    }

    if (last30DaysChart) {
    //    last30DaysChart.destroy();
    }

    todayChart = createChart(
        "todayChart",
        performance.today
    );

    last7DaysChart = createChart(
        "last7DaysChart",
        performance.last7Days
    );

    last30DaysChart = createChart(
        "last30DaysChart",
        performance.last30Days
    );
    
}
