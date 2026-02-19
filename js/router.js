/* ========================================
   QueueSmart — Simple Router / Auth Guard
   ======================================== */

/**
 * Simple auth guard for protected pages.
 * Include this script on any page that requires authentication.
 *
 * Usage:
 *   <script src="../js/router.js"></script>
 *
 * It will redirect unauthenticated users to the login page.
 */

(function () {
    'use strict';

    // Pages that don't require authentication
    const publicPages = ['login.html', 'register.html', 'index.html'];

    const currentPage = getCurrentPageName();

    // If this is a public page, no guard needed
    if (publicPages.includes(currentPage)) {
        return;
    }

    // Check if user is logged in
    const user = getLoggedInUser();

    if (!user || !user.loggedIn) {
        window.location.href = 'login.html';
        return;
    }

    /**
     * Gets the current page filename from the URL.
     * @returns {string}
     */
    function getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename || 'index.html';
    }

    /**
     * Gets the logged-in user from localStorage.
     * @returns {object|null}
     */
    function getLoggedInUser() {
        try {
            return JSON.parse(localStorage.getItem('qs_currentUser'));
        } catch {
            return null;
        }
    }
})();
