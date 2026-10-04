let todayChart = null;
let last7DaysChart = null;
let last30DaysChart = null;

function createChart(canvasId, data, label = "Penjualan") {
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

                tension: 0.35,

                fill: true,

                pointRadius: 3,
                pointHoverRadius: 5,

                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return formatRupiah(context.parsed.y);
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        callback(value) {
                            return formatRupiah(value);
                        }
                    }
                }
            }
        }
    });
}