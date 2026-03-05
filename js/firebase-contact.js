// =============================================
// Firebase Contact Form Integration
// Direct form capture - works on live sites
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

// Initialize Firebase safely
let db = null;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('[Firebase] Initialized successfully');
} catch (e) {
    console.error('[Firebase] Init error:', e);
}

// =============================================
// Save message directly to Firebase Firestore
// =============================================
function saveMessageToFirebase(msgData) {
    if (!db) {
        console.error('[Firebase] Firestore not initialized');
        return Promise.resolve();
    }
    return db.collection('messages')
        .doc(msgData.id.toString())
        .set(msgData)
        .then(() => {
            console.log('[Firebase] ✅ Message saved:', msgData.name, '|', msgData.email);
        })
        .catch((err) => {
            console.error('[Firebase] ❌ Save error:', err);
        });
}

// =============================================
// Intercept contact form directly
// Collects form data and saves to Firebase
// INDEPENDENT of localStorage / emailjs / existing scripts
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function () {
        // Read field values at the moment of submission
        const name = (document.getElementById('name') || {}).value || '';
        const email = (document.getElementById('email') || {}).value || '';
        const subject = (document.getElementById('subject') || {}).value || '';
        const message = (document.getElementById('message') || {}).value || '';

        const trimName = name.trim();
        const trimEmail = email.trim();
        const trimMessage = message.trim();

        // Only save if minimum required fields are filled
        if (!trimName || !trimEmail || !trimMessage) return;

        const msgData = {
            id: Date.now().toString(),
            name: trimName,
            email: trimEmail,
            subject: subject.trim() || 'Not specified',
            message: trimMessage,
            timestamp: Date.now(),
            read: false
        };

        console.log('[Firebase] Saving message from:', trimName);
        saveMessageToFirebase(msgData);

        // Also sync into localStorage so admin panel sees it locally too
        try {
            const key = 'portfolio_messages';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push(msgData);
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (e) { /* ignore */ }
    });

    console.log('[Firebase] Contact form interceptor attached');
});
