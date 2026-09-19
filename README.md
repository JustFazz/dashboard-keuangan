# Changelog
Next - Future Plan
 * Bisa diakses lewat hp lain diluar jaringan
 * Hilangkan fitur edit nominal dan hapus transaksi
## v2.1.4 - Update firebase auth system
 * Membuat db menggunakan uid
## v2.1.3 - Version Display
 * Menambahkan nama versi di halaman riwayat
## v2.1.2 - v2.1.2.1 - Minor fix
 * Pindah sw.js
## v2.1.1 - Minor fix
 * Menghapus tombol test Sync
## v2.1 - Penerapan Awal Online
 * Membuat proses sync ke production test
## v2 - Pengoptimalan & persiapan online state
 * Pengoptimalan Service Worker
 * Memecah Script dan HTML menjadi komponen
 * Update suara keypad & matikan
 * Rancangan persiapan Firebase sync
## v1.3.1 - Bank & Sound
 * Bagi jenis transaksi TF menjadi QRIS dan Bank
 * Tambah suara keypad dan notif tersimpan
## v1.3 - Proteksi pin
 * Memasukkan pin setiap kali aplikasi dibuka
 * Pin bisa direset lewat halaman riwayat
 * Mode akan otomatis berganti ke Cash saat disimpan
## v1.2.2  - Wakelock, Backup Restore, Quick Edit
 * Screen Wake Lock API: Menambahkan fitur penyimpan daya mati layar (indikator ikon matahari ☀️ pada header) agar layar HP/tablet kasir tetap menyala selama digunakan.
 * Backup & Restore Total (JSON): Fitur ekspor full database ke format .json dan restore total dengan metode replace (menimpa/mengosongkan data lama) beserta modal konfirmasi peringatan.
 * Quick Edit 3 Transaksi Terakhir: Tombol edit cepat dipasang langsung pada widget riwayat di bawah kalkulator input.
## v1.2.0 - Sub-Tab Filter, Verifikasi Transfer & Fitur CSV
 * Widget 3 Transaksi Terakhir: Menampilkan ringkasan 3 transaksi terbaru di bagian bawah halaman input utama.
 * Sub-Tab Riwayat: Pembagian filter tampilan riwayat menjadi 4 kategori (All, Cash, TF, dan Out).
 * Verifikasi Transfer: Tombol ceklis verifikasi khusus transaksi Transfer untuk memastikan dana sudah benar-benar masuk ke rekening saat penutupan harian.
 * Ekspor & Impor CSV: Fitur unduh laporan harian ke CSV (dikelompokkan per jenis transaksi) dan impor data transaksi secara parsial.
## v1.1.0 - Migrasi IndexedDB & Filter Tanggal
 * Penyimpanan IndexedDB: Migrasi sistem penyimpanan dari localStorage ke IndexedDB (CatatanTransaksiDB) agar data lebih aman, stabil, dan berkapasitas besar.
 * Warna Tombol Dinamis: Warna latar belakang tombol simpan berubah otomatis mengikuti jenis transaksi aktif (Hijau = Cash, Biru = Transfer, Merah = Out).
 * Date Picker Riwayat: Fitur pemilih tanggal harian untuk menyaring laporan dan perhitungan statistik secara spesifik.
## v1.0.0 - Rilis Awal Aplikasi Transaksi
 * Antarmuka Keypad Numerik: Input nominal menggunakan tombol kalkulator interaktif (0-9, 00, Clear, Backspace).
 * 3 Mode Input: Dukungan transaksi Cash, Transfer, dan Out.
 * Keterangan Dinamis: Kolom teks keterangan otomatis muncul khusus saat mode Out dipilih.
 * Manajemen Riwayat Sederhana: Ringkasan Total Cash, Total Out, Sisa Cash, serta fungsi Edit dan Hapus transaksi.
