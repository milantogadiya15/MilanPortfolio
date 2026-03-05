// =============================================
// Firebase Contact Form Integration
// Replace the firebaseConfig below with your
// actual config from Firebase Console >
// Project Settings > Your Apps > Web App
// =============================================

const firebaseConfig = {
    apiKey: "AIzaSyDnkXQ5v47iiABI8mVxyO1XRZoBHvhRITQ",
    authDomain: "portfolio-c8f33.firebaseapp.com",
    projectId: "portfolio-c8f33",
    storageBucket: "portfolio-c8f33.firebasestorage.app",
    messagingSenderId: "723187942501",
    appId: "1:723187942501:web:0b93a234ef542bd748728c",
    measurementId: "G-5RDZXNM0XH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =============================================
// Save message to Firebase Firestore
// =============================================
function saveMessageToFirebase(msgData) {
    return db.collection('messages').doc(msgData.id.toString()).set(msgData)
        .then(() => {
            console.log('[Firebase] Message saved to Firestore:', msgData.id);
        })
        .catch((error) => {
            console.error('[Firebase] Error saving message:', error);
        });
}

// =============================================
// Intercept form submission
// Runs AFTER the existing obfuscated script.js handler
// We watch localStorage for new messages
// =============================================
(function () {
    const STORAGE_KEY = 'portfolio_messages';
    let lastKnownIds = new Set();

    // Load initial IDs
    function loadCurrentIds() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const msgs = data ? JSON.parse(data) : [];
            msgs.forEach(m => lastKnownIds.add(String(m.id)));
        } catch (e) { }
    }

    // Check for new messages added to localStorage
    function syncNewMessages() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const msgs = data ? JSON.parse(data) : [];
            msgs.forEach(msg => {
                const msgId = String(msg.id);
                if (!lastKnownIds.has(msgId)) {
                    lastKnownIds.add(msgId);
                    saveMessageToFirebase(msg);
                }
            });
        } catch (e) { }
    }

    // Listen to localStorage changes and form submit
    loadCurrentIds();

    // Watch the contact form for submission
    document.addEventListener('DOMContentLoaded', () => {
        const contactForm = document.querySelector('.contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', () => {
                // Wait a bit for the existing handler to save to localStorage
                setTimeout(syncNewMessages, 1500);
            });
        }
    });

    // Also listen for storage events (cross-tab)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            syncNewMessages();
        }
    });
})();
