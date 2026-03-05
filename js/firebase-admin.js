// =============================================
// Firebase Admin Panel Integration
// Loads messages from Firebase Firestore
// and merges them with localStorage messages
// =============================================

// Same Firebase config as firebase-contact.js
// (Firebase won't re-initialize if already done)
const FIREBASE_ADMIN_CONFIG = {
    apiKey: "AIzaSyDnkXQ5v47iiABI8mVxyO1XRZoBHvhRITQ",
    authDomain: "portfolio-c8f33.firebaseapp.com",
    projectId: "portfolio-c8f33",
    storageBucket: "portfolio-c8f33.firebasestorage.app",
    messagingSenderId: "723187942501",
    appId: "1:723187942501:web:0b93a234ef542bd748728c",
    measurementId: "G-5RDZXNM0XH"
};

// =============================================
// Wait until dashboard is visible (after login)
// Then load Firebase messages and merge
// =============================================
(function () {
    const STORAGE_KEY = 'portfolio_messages';
    let firebaseLoaded = false;
    let unsubscribeFirestore = null;

    // Initialize Firebase safely
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

    // Merge Firebase messages with localStorage
    function mergeAndRender(firestoreMsgs) {
        try {
            // Get current localStorage messages
            const localData = localStorage.getItem(STORAGE_KEY);
            const localMsgs = localData ? JSON.parse(localData) : [];

            // Build a map to deduplicate
            const msgMap = new Map();
            localMsgs.forEach(m => msgMap.set(String(m.id), m));

            // Add/update with Firestore messages
            firestoreMsgs.forEach(m => {
                const existing = msgMap.get(String(m.id));
                if (existing) {
                    // Keep read status from local if already marked read
                    msgMap.set(String(m.id), { ...m, read: existing.read || m.read });
                } else {
                    msgMap.set(String(m.id), m);
                }
            });

            // Convert back to array
            const merged = Array.from(msgMap.values());

            // Update localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

            // Update the global allMessages array used by admin.js
            if (typeof allMessages !== 'undefined') {
                allMessages.length = 0;
                merged.forEach(m => allMessages.push(m));
            }

            // Re-render if render functions are available
            if (typeof renderMessages === 'function') renderMessages();
            if (typeof renderStats === 'function') renderStats();
            if (typeof updateUnreadBadge === 'function') updateUnreadBadge();

            console.log('[Firebase Admin] Merged', firestoreMsgs.length, 'Firestore messages with', localMsgs.length, 'local messages →', merged.length, 'total');
        } catch (e) {
            console.error('[Firebase Admin] Merge error:', e);
        }
    }

    // Load all messages from Firestore (real-time)
    function loadFirebaseMessages() {
        if (firebaseLoaded) return;
        firebaseLoaded = true;

        const db = initFirebase();
        if (!db) return;

        // Show loading indicator in admin UI temporarily
        const badge = document.getElementById('unreadBadge');
        if (badge) badge.title = 'Loading from Firebase...';

        // Real-time listener
        unsubscribeFirestore = db.collection('messages')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                const msgs = [];
                snapshot.forEach(doc => {
                    msgs.push(doc.data());
                });
                mergeAndRender(msgs);
            }, (error) => {
                console.error('[Firebase Admin] Firestore error:', error);
                // Fallback: just show localStorage messages (already handled by admin.js)
            });
    }

    // Delete a message from Firestore when deleted from admin panel
    function deleteFromFirestore(msgId) {
        const db = initFirebase();
        if (!db) return;
        db.collection('messages').doc(String(msgId)).delete()
            .then(() => console.log('[Firebase Admin] Deleted message:', msgId))
            .catch(e => console.error('[Firebase Admin] Delete error:', e));
    }

    // =============================================
    // Watch for dashboard becoming visible (login)
    // =============================================
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    const isHidden = dashboard.classList.contains('hidden');
                    if (!isHidden && !firebaseLoaded) {
                        // Dashboard just became visible = user logged in
                        setTimeout(loadFirebaseMessages, 500);
                    }
                }
            });
        });
        observer.observe(dashboard, { attributes: true });
    }

    // =============================================
    // Patch delete to also remove from Firestore
    // =============================================
    // Wait for admin.js to load, then patch
    window.addEventListener('load', () => {
        const originalDeleteMessage = window.deleteMessage;
        if (typeof originalDeleteMessage === 'function') {
            window.deleteMessage = function (id) {
                originalDeleteMessage(id);
                deleteFromFirestore(id);
            };
        }
    });

    // =============================================
    // Also patch clearAll to remove all from Firestore
    // =============================================
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            const db = initFirebase();
            if (!db) return;
            // Delete all docs in messages collection
            db.collection('messages').get().then(snapshot => {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            }).then(() => {
                console.log('[Firebase Admin] Cleared all messages from Firestore');
            }).catch(e => console.error('[Firebase Admin] Clear error:', e));
        }, { capture: true }); // capture to run before existing handler
    }

})();
