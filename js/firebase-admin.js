// =============================================
// Firebase Admin Panel Integration
// Loads messages from Firebase Firestore
// and merges with localStorage messages
// =============================================

const FIREBASE_ADMIN_CONFIG = {
    apiKey: "AIzaSyDnkXQ5v47iiABI8mVxyO1XRZoBHvhRITQ",
    authDomain: "portfolio-c8f33.firebaseapp.com",
    projectId: "portfolio-c8f33",
    storageBucket: "portfolio-c8f33.firebasestorage.app",
    messagingSenderId: "723187942501",
    appId: "1:723187942501:web:0b93a234ef542bd748728c",
    measurementId: "G-5RDZXNM0XH"
};

const STORAGE_KEY = 'portfolio_messages';
let firebaseLoaded = false;

// =============================================
// Initialize Firebase safely
// =============================================
function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_ADMIN_CONFIG);
        }
        return firebase.firestore();
    } catch (e) {
        console.error('[Firebase Admin] Init error:', e);
        return null;
    }
}

// =============================================
// Merge Firestore messages with localStorage
// =============================================
function mergeAndRender(firestoreMsgs) {
    try {
        const localData = localStorage.getItem(STORAGE_KEY);
        const localMsgs = localData ? JSON.parse(localData) : [];

        // Deduplicate by id — prefer local read status
        const msgMap = new Map();
        localMsgs.forEach(m => msgMap.set(String(m.id), m));
        firestoreMsgs.forEach(m => {
            const existing = msgMap.get(String(m.id));
            msgMap.set(String(m.id), {
                ...m,
                read: existing ? (existing.read || m.read) : m.read
            });
        });

        const merged = Array.from(msgMap.values());

        // Update localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        // Push into admin.js global allMessages array if available
        if (typeof allMessages !== 'undefined' && Array.isArray(allMessages)) {
            allMessages.length = 0;
            merged.forEach(m => allMessages.push(m));
        }

        // Re-render admin panel
        if (typeof renderMessages === 'function') renderMessages();
        if (typeof renderStats === 'function') renderStats();
        if (typeof updateUnreadBadge === 'function') updateUnreadBadge();

        console.log('[Firebase Admin] ✅ Merged', firestoreMsgs.length,
            'Firestore +', localMsgs.length, 'local =', merged.length, 'total');
    } catch (e) {
        console.error('[Firebase Admin] Merge error:', e);
    }
}

// =============================================
// Start real-time Firestore listener
// =============================================
function loadFirebaseMessages() {
    if (firebaseLoaded) return;
    firebaseLoaded = true;

    const db = initFirebase();
    if (!db) return;

    console.log('[Firebase Admin] Starting Firestore listener...');

    db.collection('messages')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const msgs = snapshot.docs.map(doc => doc.data());
            console.log('[Firebase Admin] Got', msgs.length, 'messages from Firestore');
            mergeAndRender(msgs);
        }, (error) => {
            console.error('[Firebase Admin] Firestore error:', error);
        });
}

// =============================================
// Watch dashboard visibility — multiple methods
// to make sure it triggers even on live sites
// =============================================
function watchDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // Method 1: MutationObserver on class changes
    const observer = new MutationObserver(() => {
        if (!dashboard.classList.contains('hidden') && !firebaseLoaded) {
            setTimeout(loadFirebaseMessages, 300);
        }
    });
    observer.observe(dashboard, { attributes: true, attributeFilter: ['class'] });

    // Method 2: Polling fallback — check every 500ms
    const pollInterval = setInterval(() => {
        if (!dashboard.classList.contains('hidden')) {
            clearInterval(pollInterval);
            if (!firebaseLoaded) {
                setTimeout(loadFirebaseMessages, 300);
            }
        }
    }, 500);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);

    // Method 3: Check immediately in case already visible
    if (!dashboard.classList.contains('hidden')) {
        setTimeout(loadFirebaseMessages, 300);
    }
}

// =============================================
// Delete from Firestore when admin deletes
// =============================================
function deleteFromFirestore(msgId) {
    const db = initFirebase();
    if (!db) return;
    db.collection('messages').doc(String(msgId)).delete()
        .then(() => console.log('[Firebase Admin] Deleted:', msgId))
        .catch(e => console.error('[Firebase Admin] Delete error:', e));
}

// =============================================
// Clear all from Firestore when admin clears all
// =============================================
function clearAllFromFirestore() {
    const db = initFirebase();
    if (!db) return;
    db.collection('messages').get().then(snap => {
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => {
        console.log('[Firebase Admin] Cleared all from Firestore');
    }).catch(e => console.error('[Firebase Admin] Clear error:', e));
}

// Run once DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    watchDashboard();

    // Patch Clear All button to also clear Firestore
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function () {
            setTimeout(clearAllFromFirestore, 500);
        }, true);
    }
});
