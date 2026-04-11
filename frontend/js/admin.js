/* ========================================
   QueueSmart — Admin Page Logic
   ======================================== */

const API_BASE = 'http://localhost:3000/api/services';
const QUEUE_API = 'http://localhost:3000/api/queues';

/** Backend checks x-user-role === admin (case-insensitive). */
function adminHeaders() {
    return { 'x-user-role': 'admin' };
}

document.addEventListener('DOMContentLoaded', () => {
    const dashboardEl = document.getElementById('adminDashboard');
    const serviceEl = document.getElementById('serviceManagement');
    const queueEl = document.getElementById('queueManagement');

    if (dashboardEl) initAdminDashboard();
    if (serviceEl) initServiceManagement();
    if (queueEl) initQueueManagement();
});

/* ================================================
   Admin Dashboard
   ================================================ */

function initAdminDashboard() {
    renderDashboard();
}

async function renderDashboard() {
    try {
        // fetch call to retrieve total services from mongodb
        const response = await fetch(API_BASE);
        const services = await response.json();
        const totalServices = services.length;

        let totalWaiting = 0;
        let activeQueueCount = 0;
        const queueLengths = {};

        await Promise.all(
            services.map(async (s) => {
                try {
                    // mapping use of mongodb _id for queue retrieval
                    const r = await fetch(`${QUEUE_API}/admin/${s._id || s.id}`, {
                        headers: adminHeaders()
                    });
                    if (!r.ok) {
                        queueLengths[s._id || s.id] = 0;
                        return;
                    }
                    const data = await r.json();
                    const n = typeof data.count === 'number'
                        ? data.count
                        : (data.queue && data.queue.length) || 0;
                    queueLengths[s._id || s.id] = n;
                    totalWaiting += n;
                    if (n > 0) activeQueueCount += 1;
                } catch {
                    queueLengths[s._id || s.id] = 0;
                }
            })
        );

        document.getElementById('statTotalServices').textContent = totalServices;
        document.getElementById('statActiveQueues').textContent = activeQueueCount;
        document.getElementById('statUsersWaiting').textContent = totalWaiting;

        renderDashboardTable(services, queueLengths);
    } catch (error) {
        console.error('Dashboard sync error:', error);
    }
}

function renderDashboardTable(services, queueLengths) {
    const tableContainer = document.getElementById('dashboardServicesTable');
    if (!tableContainer) return;

    const rows = services.map(service => {
        const queueLength = queueLengths[service._id || service.id] || 0;
        return `
            <tr>
                <td><strong>${escapeHtml(service.name)}</strong></td>
                <td>${service.expectedDuration} mins</td>
                <td><span class="badge">${service.priorityLevel}</span></td>
                <td>${queueLength} people waiting</td>
            </tr>
        `;
    }).join('');

    tableContainer.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Duration</th>
                    <th>Priority</th>
                    <th>Queue Status</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

/* ================================================
   Service Management
   =============================================== */

let editingServiceId = null;

function initServiceManagement() {
    renderServicesList();

    document.getElementById('addServiceBtn').addEventListener('click', () => openServiceModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeServiceModal);
    document.getElementById('cancelServiceBtn').addEventListener('click', closeServiceModal);

    document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
}

/**
 * FETCH: List all services from the backend
 */
async function renderServicesList() {
    const container = document.getElementById('servicesListContainer');
    const loader = document.getElementById('loadingIndicator');

    // show loading state during retrieval
    if (loader) loader.style.display = 'block';

    try {
        const response = await fetch(API_BASE);
        const services = await response.json();

        if (loader) loader.style.display = 'none';

        if (services.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No services yet. Click "Add Service" to create one.</p></div>';
            return;
        }

        const rows = services.map(service => `
            <tr>
                <td><strong>${escapeHtml(service.name)}</strong></td>
                <td class="desc-cell">${escapeHtml(service.description)}</td>
                <td>${service.expectedDuration} min</td>
                <td><span class="badge">${service.priorityLevel}</span></td>
                <td>
                    <div style="display: flex; gap: var(--space-2);">
                        <button class="btn btn-outline btn-sm" onclick="openServiceModal('${service._id || service.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteService('${service._id || service.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Duration</th>
                        <th>Priority</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    } catch (error) {
        if (loader) loader.style.display = 'none';
        showNotification('Failed to load services from server.', 'error');
    }
}

/**
 * FETCH: Create or Update a service
 */
async function handleServiceSubmit(e) {
    e.preventDefault();

    const priorityInput = document.getElementById('servicePriority').value;

    if (!priorityInput || priorityInput.trim() === '') {
        alert('Service priority is required.');
        return;
    }

    const serviceData = {
        name: document.getElementById('serviceName').value.trim(),
        description: document.getElementById('serviceDescription').value.trim(),
        expectedDuration: Number(document.getElementById('serviceDuration').value),
        priorityLevel: Number(priorityInput)
    };

    const url = editingServiceId ? `${API_BASE}/${editingServiceId}` : API_BASE;
    const method = editingServiceId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
        });

        if (response.ok) {
            showNotification(editingServiceId ? 'Service updated!' : 'Service created!', 'success');
            closeServiceModal();
            renderServicesList();
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Error saving service.');
        }
    } catch (error) {
        console.error('Save error:', error);
        showNotification('Error saving service.', 'error');
    }
}

/**
 * FETCH: Delete a service
 */
async function deleteService(id) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Service removed.', 'info');
            renderServicesList();
        }
    } catch (error) {
        showNotification('Could not delete service.', 'error');
    }
}

async function openServiceModal(id) {
    editingServiceId = id || null;
    const modal = document.getElementById('serviceModal');
    const title = document.getElementById('serviceModalTitle');
    const form = document.getElementById('serviceForm');

    form.reset();

    if (editingServiceId) {
        title.textContent = 'Edit Service';
        const response = await fetch(`${API_BASE}`);
        const services = await response.json();
        // handling the retrieval of single service using mongodb _id
        const service = services.find(s => (s._id || s.id) === id);

        if (service) {
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceDescription').value = service.description;
            document.getElementById('serviceDuration').value = service.expectedDuration;
            document.getElementById('servicePriority').value = service.priorityLevel;
        }
    } else {
        title.textContent = 'Create Service';
    }

    modal.classList.add('visible');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('visible');
    editingServiceId = null;
}

/* ================================================
   Queue Management
   ================================================ */

let selectedServiceId = null;

function initQueueManagement() {
    const select = document.getElementById('queueServiceSelect');
    populateServiceSelect(select);

    select.addEventListener('change', () => {
        selectedServiceId = select.value || null;

        if (selectedServiceId) {
            document.getElementById('queueDisplay').style.display = '';
            renderQueue();
        } else {
            document.getElementById('queueDisplay').style.display = 'none';
        }
    });

    document.getElementById('serveNextBtn').addEventListener('click', () => serveNextUser());
}

async function populateServiceSelect(select) {
    try {
        const response = await fetch(API_BASE);
        const services = await response.json();

        // using _id for select values to match mongodb documents
        const options = services
            .map(s => `<option value="${s._id || s.id}">${escapeHtml(s.name)}</option>`)
            .join('');

        select.innerHTML = '<option value="">Choose a service...</option>' + options;
    } catch (error) {
        console.error('Select population error:', error);
    }
}

async function refreshAdminDashboardIfPresent() {
    if (document.getElementById('statTotalServices')) {
        await renderDashboard();
    }
}

async function renderQueue() {
    if (!selectedServiceId) return;

    const statsEl = document.getElementById('queueStats');
    const tableContainer = document.getElementById('queueTableContainer');

    try {
        const res = await fetch(`${QUEUE_API}/admin/${selectedServiceId}`, {
            headers: adminHeaders()
        });

        if (res.status === 403) {
            showNotification('Administrator access required.', 'error');
            tableContainer.innerHTML = '<div class="empty-state"><p>Access denied.</p></div>';
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showNotification(err.message || 'Could not load queue.', 'error');
            tableContainer.innerHTML = '<div class="empty-state"><p>Could not load queue.</p></div>';
            return;
        }

        const data = await res.json();
        const service = data.service;
        const queue = data.queue || [];

        document.getElementById('queueServiceTitle').textContent =
            service ? `${service.name} \u2014 Queue` : 'Queue';

        const estPerPerson = service ? service.expectedDuration : 10;
        statsEl.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${queue.length}</div>
                    <div class="stat-label">People in Queue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${queue.length > 0 ? (queue.length * estPerPerson) + ' min' : '\u2014'}</div>
                    <div class="stat-label">Est. Total Wait</div>
                </div>
            </div>
        `;

        if (queue.length === 0) {
            tableContainer.innerHTML = '<div class="empty-state"><p>No one is in this queue right now.</p></div>';
            return;
        }

        const rows = queue.map((person) => {
            const waitMinutes = Math.round(
                (Date.now() - new Date(person.joinedAt).getTime()) / 60000
            );
            const displayWait = waitMinutes > 0 ? waitMinutes + ' min' : '< 1 min';
            const estRule =
                person.estimatedWaitMinutes != null
                    ? `${person.estimatedWaitMinutes} min`
                    : '\u2014';

            return `
            <tr>
                <td><span class="queue-position">${person.position}</span></td>
                <td><strong>${escapeHtml(person.userName)}</strong></td>
                <td>${escapeHtml(person.userEmail)}</td>
                <td>${person.priority ?? 0}</td>
                <td>${estRule}</td>
                <td>${displayWait}</td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm" data-remove-email="${escapeHtml(person.userEmail)}">Remove</button>
                </td>
            </tr>
        `;
        }).join('');

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Priority</th>
                        <th>Est. wait (rule)</th>
                        <th>Time in queue</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        tableContainer.querySelectorAll('[data-remove-email]').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-remove-email');
                removeQueueUser(email);
            });
        });
    } catch (error) {
        console.error('Queue load error:', error);
        showNotification('Could not connect to the server.', 'error');
        tableContainer.innerHTML = '<div class="empty-state"><p>Error loading queue.</p></div>';
    }
}

async function removeQueueUser(userEmail) {
    if (!selectedServiceId || !userEmail) return;
    if (!confirm('Remove this person from the queue?')) return;

    try {
        const res = await fetch(`${QUEUE_API}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceId: selectedServiceId,
                userEmail
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showNotification(data.message || 'Could not remove user.', 'error');
            return;
        }
        showNotification('User removed from queue.', 'info');
        await renderQueue();
        await refreshAdminDashboardIfPresent();
    } catch (error) {
        console.error('Remove error:', error);
        showNotification('Could not connect to the server.', 'error');
    }
}

async function serveNextUser() {
    if (!selectedServiceId) return;

    try {
        const res = await fetch(
            `${QUEUE_API}/admin/${selectedServiceId}/serve-next`,
            {
                method: 'POST',
                headers: {
                    ...adminHeaders(),
                    'Content-Type': 'application/json'
                }
            }
        );
        const data = await res.json().catch(() => ({}));

        if (res.status === 400) {
            showNotification(data.message || 'No one in the queue to serve.', 'error');
            return;
        }
        if (!res.ok) {
            showNotification(data.message || 'Could not serve next.', 'error');
            return;
        }

        showNotification(`Now serving: ${data.served.userName}`, 'success');
        await renderQueue();
        await refreshAdminDashboardIfPresent();
    } catch (error) {
        console.error('Serve next error:', error);
        showNotification('Could not connect to the server.', 'error');
    }
}

/* ================================================
   Shared Helpers
   ================================================ */

function showFieldError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function clearFieldError(input, errorId) {
    const errorEl = document.getElementById(errorId);
    input.classList.remove('error');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    let container = document.getElementById('toastContainer');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'info'}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}