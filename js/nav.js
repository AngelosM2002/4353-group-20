/* ========================================
   QueueSmart — Navigation Logic
   ======================================== */

/**
 * Generates the sidebar HTML for any page.
 *
 * Usage:
 *   1. Add <div id="nav-container"></div> at the top of your <body>
 *   2. Include this script: <script src="../js/nav.js"></script>
 *   3. The nav will auto-render based on the logged-in user's role.
 */

document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        renderNav(navContainer);
    }
});

/**
 * Renders the sidebar navigation into the container.
 * @param {HTMLElement} container
 */
function renderNav(container) {
    const user = getCurrentUser();

    if (!user || !user.loggedIn) {
        window.location.href = 'login.html';
        return;
    }

    const userInitials = getInitials(user.name);
    const isAdmin = user.role === 'admin';
    const currentPage = getCurrentPage();

    // Build nav links based on role
    const userLinks = [
        { href: 'user-dashboard.html', icon: iconDashboard(), label: 'Dashboard' },
        { href: 'join-queue.html', icon: iconJoinQueue(), label: 'Join Queue' },
        { href: 'queue-status.html', icon: iconQueueStatus(), label: 'Queue Status' },
        { href: 'history.html', icon: iconHistory(), label: 'History' },
        { href: 'notifications.html', icon: iconNotifications(), label: 'Notifications' },
    ];
    const adminLinks = [
        { href: 'admin-dashboard.html', icon: iconDashboard(), label: 'Dashboard' },
        { href: 'services.html', icon: iconServices(), label: 'Services' },
        { href: 'queue-manage.html', icon: iconQueueManage(), label: 'Queue Management' },
        { href: 'history.html', icon: iconHistory(), label: 'Usage Statistics' },
    ];

    const links = isAdmin ? adminLinks : userLinks;

    container.innerHTML = `
        <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </div>
                <span class="sidebar-brand">QueueSmart</span>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section">
                    <p class="nav-section-title">${isAdmin ? 'Administration' : 'Menu'}</p>
                    ${links.map(link => `
                        <a href="${link.href}" class="nav-link ${currentPage === link.href ? 'active' : ''}" id="nav-${link.href.replace('.html', '')}">
                            ${link.icon}
                            <span>${link.label}</span>
                        </a>
                    `).join('')}
                </div>

                <div class="nav-section">
                    <p class="nav-section-title">Notifications</p>
                    <a href="notifications.html" class="nav-link ${currentPage === 'notifications.html' ? 'active' : ''}" id="nav-notifications">
                        ${iconNotifications()}
                        <span>Notifications</span>
                    </a>
                </div>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="user-avatar">${userInitials}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-role">${user.role}</div>
                    </div>
                    <button class="logout-btn" id="logoutBtn" aria-label="Log out" title="Log out">
                        ${iconLogout()}
                    </button>
                </div>
            </div>
        </aside>
    `;

    // Attach logout listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('qs_currentUser');
            window.location.href = 'login.html';
        });
    }
}

/* ---------- Utilities ---------- */

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('qs_currentUser'));
    } catch {
        return null;
    }
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
}

function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return filename || 'index.html';
}

/* ---------- SVG Icons ---------- */

function iconDashboard() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
}

function iconJoinQueue() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
}

function iconQueueStatus() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;
}

function iconHistory() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function iconServices() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
}

function iconQueueManage() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
}

function iconNotifications() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
}

function iconLogout() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
}
