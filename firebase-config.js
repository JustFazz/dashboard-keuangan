// Ganti objek di bawah ini dengan kredensial Firebase Project Anda dari Kasir Gemilang Buah
const firebaseConfig = {
  apiKey: "AIzaSyBluoP8kHD0paTm1vac4eecPr-oWmsA9wc",
  authDomain: "kasir-gemilang-buah.firebaseapp.com",
  databaseURL:
    "https://kasir-gemilang-buah-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "kasir-gemilang-buah",
  storageBucket: "kasir-gemilang-buah.firebasestorage.app",
  messagingSenderId: "938448110663",
  appId: "1:938448110663:web:7585b64d97c20a4d155d62",
};

// Inisialisasi Firebase jika belum pernah diinisialisasi
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Ekspor instance Auth dan Realtime Database ke variabel global
const auth = firebase.auth();
const rtdb = firebase.database();
