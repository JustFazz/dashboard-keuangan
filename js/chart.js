let todayChart = null;
let last7DaysChart = null;
let last30DaysChart = null;

function createChart(canvasId, data, label = "Pemasukan") {
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.warn(`Canvas #${canvasId} tidak ditemukan.`);
        return null;
    }

    return new Chart(canvas, {
        type: "line",

        data: {
            labels: data.map(item => item.label),

            datasets: [{
                label,

                data: data.map(item => item.total),

                // Garis
                borderWidth: 2.5,
                tension: 0.4,

                // Area di bawah garis
                fill: true,

                backgroundColor: "rgba(37, 99, 235, 0.08)",
                borderColor: "#2563eb",

                // Titik dibuat minimal
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBorderWidth: 2,
                pointHoverBackgroundColor: "#ffffff",
                pointHoverBorderColor: "#2563eb"
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            // Animasi lebih halus
            animation: {
                duration: 700,
                easing: "easeOutQuart"
            },

            interaction: {
                intersect: false,
                mode: "index"
            },

            layout: {
                padding: {
                    top: 10,
                    right: 15,
                    bottom: 5,
                    left: 5
                }
            },

            plugins: {
                // Tidak perlu legend karena biasanya sudah ada
                // judul/label di luar chart
                legend: {
                    display: false
                },

                tooltip: {
                    enabled: true,

                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#ffffff",

                    titleFont: {
                        size: 12,
                        weight: "600"
                    },

                    bodyFont: {
                        size: 13,
                        weight: "500"
                    },

                    padding: 12,
                    cornerRadius: 8,

                    displayColors: false,

                    callbacks: {
                        title(context) {
                            return context[0].label;
                        },

                        label(context) {
                            return formatRupiah(context.parsed.y);
                        }
                    }
                }
            },

            scales: {
                x: {
                    border: {
                        display: false
                    },

                    grid: {
                        display: false
                    },

                    ticks: {
                        color: "#6b7280",

                        font: {
                            size: 11
                        },

                        padding: 8,

                        maxRotation: 0,
                        autoSkip: true
                    }
                },

                y: {
                    beginAtZero: true,

                    border: {
                        display: false
                    },

                    grid: {
                        color: "rgba(107, 114, 128, 0.10)",
                        drawTicks: false
                    },

                    ticks: {
                        color: "#9ca3af",

                        font: {
                            size: 11
                        },

                        padding: 10,

                        // Supaya angka tidak terlalu panjang
                        callback(value) {
                            return formatChartRupiah(value);
                        }
                    }
                }
            }
        }
    });
}


/**
 * Format Rupiah untuk tooltip
 * Contoh:
 * Rp 125.000
 */
function formatRupiah(value) {
    return "Rp " + Number(value).toLocaleString("id-ID");
}


/**
 * Format Rupiah khusus untuk sumbu Y
 * Contoh:
 * 1 jt
 * 500 rb
 * 25 jt
 */
function formatChartRupiah(value) {
    value = Number(value);

    if (value >= 1_000_000_000) {
        return "Rp " + (value / 1_000_000_000).toFixed(1) + " M";
    }

    if (value >= 1_000_000) {
        return "Rp " + (value / 1_000_000).toFixed(1) + " jt";
    }

    if (value >= 1_000) {
        return "Rp " + (value / 1_000).toFixed(0) + " rb";
    }

    return "Rp " + value.toLocaleString("id-ID");
}