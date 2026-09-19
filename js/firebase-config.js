export function initFirebase() {
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

    // Mencegah error re-initialization jika fungsi dipanggil ulang
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    firebase.auth().onAuthStateChanged((user) => {
        const loginScreen = document.getElementById("firebase-login-screen");
        if (!loginScreen) return;

        if (user) {
            loginScreen.style.display = "none";
            console.log("Firebase login aktif:", user.uid);
        } else {
            loginScreen.style.display = "flex";
        }
    });
}
