/* ========================================
   QueueSmart — User Page Logic
   ======================================== */

const API_BASE = 'http://localhost:3000/api/services';
const QUEUE_API = 'http://localhost:3000/api/queues';
const NOTIFICATION_API = 'http://localhost:3000/api/notifications';

document.addEventListener('DOMContentLoaded', () => {
    // For Join Queue Page
    if (document.getElementById('availableServicesContainer')) {
        loadAvailableServices();
    }

    // For User Dashboard Page
    if (document.getElementById('activeServicesList')) {
        renderUserDashboard();
    }

    // for queue status page
    if (document.getElementById('queueStatusContainer')) {
        renderUserStatus();
    }

    if (document.getElementById('notificationsPageList')) {
        loadNotificationsPage();
    }
    if (document.getElementById('historyPageList')) {
        loadUserHistory();
    }
});

// fetch and display user past queue participation from database
async function loadUserHistory() {
    const listContainer = document.getElementById('historyPageList');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    if (!currentUser || !listContainer) return;

    try {
        // fetching from the new history endpoint connected to mongodb
        const response = await fetch(`${QUEUE_API}/history/${encodeURIComponent(currentUser.email)}`);
        const historyData = await response.json();

        if (historyData.length === 0) {
            listContainer.innerHTML = '<li>No history records found in database.</li>';
            return;
        }

        // map to list items using database fields
        listContainer.innerHTML = historyData.map(item => {
            // Determine badge class and text based on the notification type
            const isCancelled = item.type === 'cancelled';
            const badgeClass = isCancelled ? 'badge-danger' : 'badge-success';
            const statusText = isCancelled ? 'Cancelled' : 'Completed';

            return `
                <li style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--gray-200);">
                    <strong>${escapeHtml(item.message || "Service Session")}</strong><br>
                    <span style="font-size: 0.9rem; color: var(--gray-600);">
                        Date: ${new Date(item.timestamp || item.createdAt).toLocaleDateString()}<br>
                        Status: <span class="badge ${badgeClass}">${statusText}</span>
                    </span>
                </li>
            `;
        }).join(''); // Removed .reverse() because backend is now sorting newest first

    } catch (error) {
        console.error("History load error:", error);
        listContainer.innerHTML = '<li>Error loading history from server.</li>';
    }
}

// show users specific position in their active queue from mongodb
async function renderUserStatus() {
    const container = document.getElementById('queueStatusContainer');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    if (!currentUser) {
        container.innerHTML = '<p>Please log in to see your status.</p>';
        return;
    }

    try {
        const response = await fetch(`${QUEUE_API}/status?email=${currentUser.email}`);
        const status = await response.json();

        if (!status.inQueue) {
            container.innerHTML = `
                <div class="card">
                    <p>You are not currently in any queue.</p>
                    <a href="join-queue.html" class="btn btn-primary" style="margin-top: 10px; display: inline-block;">Join a Queue</a>
                </div>`;
            return;
        }

        const waitTime = status.estimatedWaitMinutes;
        // Use MongoDB _id for the leaveQueue call
        const serviceId = status.service._id || status.service.id;

        container.innerHTML = `
            <section class="card">
                <p><strong>Service:</strong> ${escapeHtml(status.service.name)}</p>
                <p><strong>Your Position:</strong> #${status.position}</p>
                <p><strong>Estimated Wait Time:</strong> ${waitTime} minutes</p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <span class="badge badge-warning">Waiting</span>
                    <button class="btn btn-danger btn-sm" onclick="leaveQueue('${serviceId}')">Leave Queue</button>
                </div>
            </section>
        `;
    } catch (error) {
        console.error("Status error:", error);
        container.innerHTML = '<p>Error loading your queue status.</p>';
    }
}

// get services from mongodb and display 
async function loadAvailableServices() {
    const container = document.getElementById('availableServicesContainer');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));
    
    if (!container) return;

    try {
        const response = await fetch(API_BASE);
        const services = await response.json();

        let userStatus = { inQueue: false };
        if (currentUser) {
            const statusRes = await fetch(`${QUEUE_API}/status?email=${currentUser.email}`);
            userStatus = await statusRes.json();
        }

        if (services.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No services available in database.</p></div>`;
            return;
        }

        container.innerHTML = services.map(service => {
            // handle mongodb _id comparison
            const serviceId = service._id || service.id;
            const activeServiceId = userStatus.inQueue ? (userStatus.service._id || userStatus.service.id) : null;
            const isJoined = userStatus.inQueue && activeServiceId === serviceId;
            
            return `
                <div class="card service-card">
                    <div class="card-body">
                        <h3>${escapeHtml(service.name)}</h3>
                        <p class="text-muted">${escapeHtml(service.description)}</p>
                        <div class="service-details">
                            <span>⏱ ${service.expectedDuration} mins</span>
                            <span class="badge">Priority: ${service.priorityLevel}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button 
                            class="btn ${isJoined ? 'btn-success' : 'btn-primary'} w-100" 
                            onclick="joinQueue(event, '${serviceId}')"
                            ${isJoined ? 'disabled' : ''}
                        >
                            ${isJoined ? '✓ Queue Joined' : 'Join Queue'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p class="error-msg">Error loading services from database.</p>';
    }
}

// populate user dashboard
async function renderUserDashboard() {
    const statusContainer = document.getElementById('userStatusSummary');
    const servicesList = document.getElementById('activeServicesList');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser') || 'null');

    try {
        const sResponse = await fetch(API_BASE);
        const services = await sResponse.json();

        servicesList.innerHTML = services.length === 0
            ? '<p>No services currently open.</p>'
            : services.map(s => `
                <div style="padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius-md);">
                    <h3>${escapeHtml(s.name)}</h3>
                    <p>Estimated Duration: ${s.expectedDuration} minutes</p>
                    <span class="badge badge-success">Open</span>
                </div>
            `).join('');

        if (!currentUser) {
            statusContainer.innerHTML = '<p>Please log in to see your queue status.</p>';
            await renderNotificationsSummary();
            return;
        }

        const qResponse = await fetch(`${QUEUE_API}/status?email=${encodeURIComponent(currentUser.email)}`);
        const status = await qResponse.json();

        if (status.inQueue) {
            statusContainer.innerHTML = `
                <p><strong>Service:</strong> ${escapeHtml(status.service.name)}</p>
                <p><strong>Your Position:</strong> #${status.position}</p>
                <p><strong>Estimated Wait Time:</strong> ${status.estimatedWaitMinutes} minutes</p>
                <span class="badge badge-warning" style="margin-top: var(--space-3); display: inline-block;">Waiting</span>
            `;
        } else {
            statusContainer.innerHTML = `
                <p>You are not currently in any queue.</p>
                <a href="join-queue.html" class="btn btn-primary btn-sm" style="margin-top: 10px; display: inline-block;">Join a Queue</a>
            `;
        }

        await renderNotificationsSummary();
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function renderNotificationsSummary() {
    const ul = document.getElementById('notificationsList');
    if (!ul) return;

    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser') || 'null');
    if (!currentUser) {
        ul.innerHTML = '<li style="padding: var(--space-3);">Log in to see notifications.</li>';
        return;
    }

    try {
        const res = await fetch(`${NOTIFICATION_API}?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        const items = data.notifications || [];

        if (items.length === 0) {
            ul.innerHTML = '<li style="padding: var(--space-3);">No notifications yet.</li>';
            return;
        }

        const preview = items.slice(0, 5);
        ul.innerHTML = preview.map(n => `
            <li style="padding: var(--space-3); background: var(--gray-100); border-radius: var(--radius-md);">
                ${n.status === 'sent' ? '<strong>New · </strong>' : ''}
                ${escapeHtml(n.message)}
                <div style="font-size: 0.85rem; color: var(--gray-600); margin-top: var(--space-2);">${new Date(n.timestamp || n.createdAt).toLocaleString()}</div>
            </li>`
        ).join('');

        if (items.length > 5) {
            ul.innerHTML += `<li style="padding: var(--space-2);"><a href="notifications.html">View all (${items.length})</a></li>`;
        }
    } catch (e) {
        console.error('Notifications load error:', e);
    }
}

async function loadNotificationsPage() {
    const ul = document.getElementById('notificationsPageList');
    if (!ul) return;

    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser') || 'null');
    if (!currentUser) return;

    try {
        const res = await fetch(`${NOTIFICATION_API}?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        const items = data.notifications || [];

        if (items.length === 0) {
            ul.innerHTML = '<li style="padding: var(--space-3); background: var(--gray-100); border-radius: var(--radius-md);">No notifications yet.</li>';
            return;
        }

        ul.innerHTML = items.map(n => {
            const isUnread = n.status === 'sent';
            return `
            <li style="padding: var(--space-4); background: var(--gray-100); border-radius: var(--radius-md); margin-bottom: var(--space-3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3);">
                    <div>
                        ${isUnread ? '<span class="badge badge-warning">New</span>' : ''}
                        <p style="margin: var(--space-2) 0 0;">${escapeHtml(n.message)}</p>
                        <div style="font-size: 0.85rem; color: var(--gray-600); margin-top: var(--space-2);">
                            ${new Date(n.timestamp || n.createdAt).toLocaleString()}
                        </div>
                    </div>
                    ${isUnread ? `<button type="button" class="btn btn-outline btn-sm" data-mark-read="${n._id}">Mark read</button>` : ''}
                </div>
            </li>`;
        }).join('');

        ul.querySelectorAll('[data-mark-read]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-mark-read');
                await fetch(`${NOTIFICATION_API}/${id}/read?email=${encodeURIComponent(currentUser.email)}`, { method: 'PATCH' });
                loadNotificationsPage();
            });
        });
    } catch (e) {
        console.error(e);
    }
}


// join queue by saving to mongodb
async function joinQueue(event, serviceId) {
    const joinBtn = event.currentTarget; 
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));
    
    if (!currentUser) {
        showNotification('Please log in to join a queue.', 'error');
        return;
    }

    try {
        const response = await fetch(`${QUEUE_API}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceId: serviceId.toString(),
                userName: currentUser.name,
                userEmail: currentUser.email,
                userId: currentUser._id
            })
        });

        const data = await response.json();

        if (response.ok) {
            joinBtn.innerText = '✓ Queue Joined';
            joinBtn.disabled = true;
            showNotification('Successfully joined!', 'success');
            setTimeout(() => { window.location.href = 'queue-status.html'; }, 800);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error("Join error:", error);
    }
}

// remove user from mongodb queue
window.leaveQueue = async function(serviceId) {
    if (!confirm('Are you sure you want to leave this queue?')) return;
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    try {
        const response = await fetch(`${QUEUE_API}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                serviceId: serviceId.toString(), 
                userEmail: currentUser.email 
            })
        });

        if (response.ok) {
            showNotification('Left queue successfully.', 'info');
            window.location.href = 'user-dashboard.html';
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Error leaving queue', 'error');
        }
    } catch (error) {
        console.error("Leave error:", error);
    }
};

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    let container = document.getElementById('toastContainerUser');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainerUser';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 16px;border-radius:8px;color:#fff;max-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.15);';
    toast.style.background = type === 'error' ? '#c0392b' : type === 'success' ? '#27ae60' : '#2c3e50';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3200);
}