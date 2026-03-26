/* ========================================
   QueueSmart — Admin Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initMockData();

    const dashboardEl = document.getElementById('adminDashboard');
    const serviceEl = document.getElementById('serviceManagement');
    const queueEl = document.getElementById('queueManagement');

    if (dashboardEl) initAdminDashboard();
    if (serviceEl) initServiceManagement();
    if (queueEl) initQueueManagement();
});

/* ---------- Mock Data ---------- */

const STORAGE_SERVICES = 'qs_services';
const STORAGE_QUEUES = 'qs_queues';

const DEFAULT_SERVICES = [
    { id: 1, name: "Driver's License Renewal", description: 'Renew an expired or expiring driver\'s license at the DMV counter.', duration: 20, priority: 'high', status: 'open' },
    { id: 2, name: 'Vehicle Registration', description: 'Register a new vehicle or transfer existing registration to a new owner.', duration: 15, priority: 'medium', status: 'open' },
    { id: 3, name: 'ID Card Replacement', description: 'Apply for a replacement state-issued identification card.', duration: 10, priority: 'low', status: 'closed' },
    { id: 4, name: 'Title Transfer', description: 'Transfer a vehicle title between owners with proper documentation.', duration: 25, priority: 'medium', status: 'open' },
];

const DEFAULT_QUEUES = {
    1: [
        { name: 'Alice Johnson', email: 'alice@example.com', joinedAt: '2026-02-20T09:15:00' },
        { name: 'Bob Smith', email: 'bob@example.com', joinedAt: '2026-02-20T09:22:00' },
        { name: 'Carol Davis', email: 'carol@example.com', joinedAt: '2026-02-20T09:30:00' },
        { name: 'David Wilson', email: 'david@example.com', joinedAt: '2026-02-20T09:45:00' },
        { name: 'Eva Martinez', email: 'eva@example.com', joinedAt: '2026-02-20T09:52:00' },
    ],
    2: [
        { name: 'Frank Brown', email: 'frank@example.com', joinedAt: '2026-02-20T10:00:00' },
        { name: 'Grace Lee', email: 'grace@example.com', joinedAt: '2026-02-20T10:10:00' },
        { name: 'Henry Nguyen', email: 'henry@example.com', joinedAt: '2026-02-20T10:25:00' },
    ],
    3: [],
    4: [
        { name: 'Iris Cooper', email: 'iris@example.com', joinedAt: '2026-02-20T10:30:00' },
        { name: 'Jack Taylor', email: 'jack@example.com', joinedAt: '2026-02-20T10:45:00' },
    ],
};

/**
 * Seeds mock data into localStorage on first visit.
 */
function initMockData() {
    if (!localStorage.getItem(STORAGE_SERVICES)) {
        localStorage.setItem(STORAGE_SERVICES, JSON.stringify(DEFAULT_SERVICES));
    }
    if (!localStorage.getItem(STORAGE_QUEUES)) {
        localStorage.setItem(STORAGE_QUEUES, JSON.stringify(DEFAULT_QUEUES));
    }
}

function getServices() {
    try { return JSON.parse(localStorage.getItem(STORAGE_SERVICES)) || []; }
    catch { return []; }
}

function saveServices(services) {
    localStorage.setItem(STORAGE_SERVICES, JSON.stringify(services));
}

function getQueues() {
    try { return JSON.parse(localStorage.getItem(STORAGE_QUEUES)) || {}; }
    catch { return {}; }
}

function saveQueues(queues) {
    localStorage.setItem(STORAGE_QUEUES, JSON.stringify(queues));
}

/* ================================================
   Admin Dashboard
   ================================================ */

function initAdminDashboard() {
    renderDashboard();
}

async function renderDashboard() {
    try {
        const response = await fetch(API_BASE); 
        const services = await response.json(); 
        const queues = getQueues(); 

        const totalServices = services.length;
        
        const activeQueues = services.length; 
        const totalWaiting = Object.values(queues).reduce((sum, q) => sum + q.length, 0);

        document.getElementById('statTotalServices').textContent = totalServices;
        document.getElementById('statActiveQueues').textContent = activeQueues;
        document.getElementById('statUsersWaiting').textContent = totalWaiting;


        renderDashboardTable(services, queues); 
    } catch (error) {
        console.error("Dashboard sync error:", error);
    }
}

function renderDashboardTable(services, queues) {
    const tableContainer = document.getElementById('dashboardServicesTable');
    if (!tableContainer) return;

    const rows = services.map(service => {
        const queueLength = (queues[service.id] || []).length;
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

function toggleServiceStatus(serviceId) {
    const services = getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = service.status === 'open' ? 'closed' : 'open';
    saveServices(services);
    renderDashboard();

    const action = service.status === 'open' ? 'opened' : 'closed';
    showNotification(`${service.name} queue ${action}.`, service.status === 'open' ? 'success' : 'info');
}

/* ================================================
   Service Management
   =============================================== */

let editingServiceId = null;
const API_BASE = 'http://localhost:3000/api/services';

function initServiceManagement() {
    renderServicesList(); // Initial load from backend

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
    
    try {
        const response = await fetch(API_BASE);
        const services = await response.json();

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
                        <button class="btn btn-outline btn-sm" onclick="openServiceModal(${service.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">Delete</button>
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
        showNotification('Failed to load services from server.', 'error');
    }
}

/**
 * FETCH: Create or Update a service
 */
async function handleServiceSubmit(e) {
    e.preventDefault();

    const priorityInput = document.getElementById('servicePriority').value;

    // front end validation check 
    if (!priorityInput || priorityInput.trim() === "") {
        alert("Service priority is required.");
        return; // Stop the function here so no request is sent to the backend
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
            //handle backend validation error
            const errorData = await response.json();
            alert(errorData.message || 'Error saving service.');
        }
    } catch (error) {
        console.error("Save error:", error);
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
        // Fetch specific service data to populate form
        const response = await fetch(`${API_BASE}`);
        const services = await response.json();
        const service = services.find(s => s.id === id);
        
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
        selectedServiceId = select.value ? parseInt(select.value, 10) : null;

        if (selectedServiceId) {
            document.getElementById('queueDisplay').style.display = '';
            renderQueue();
        } else {
            document.getElementById('queueDisplay').style.display = 'none';
        }
    });

    document.getElementById('serveNextBtn').addEventListener('click', serveNextUser);
}

async function populateServiceSelect(select) {
    try {
        const response = await fetch(API_BASE); //
        const services = await response.json(); //

        const options = services
            .map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
            .join('');

        select.innerHTML = '<option value="">Choose a service...</option>' + options;
    } catch (error) {
        console.error("Select population error:", error);
    }
}

function renderQueue() {
    if (!selectedServiceId) return;

    const services = getServices();
    const service = services.find(s => s.id === selectedServiceId);
    const queues = getQueues();
    const queue = queues[selectedServiceId] || [];

    document.getElementById('queueServiceTitle').textContent =
        service ? service.name + ' \u2014 Queue' : 'Queue';

    const estPerPerson = service ? service.expectedDuration : 10;
    const statsEl = document.getElementById('queueStats');
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

    const tableContainer = document.getElementById('queueTableContainer');

    if (queue.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><p>No one is in this queue right now.</p></div>';
        return;
    }

    const rows = queue.map((person, index) => {
        const waitMinutes = Math.round((Date.now() - new Date(person.joinedAt).getTime()) / 60000);
        const displayWait = waitMinutes > 0 ? waitMinutes + ' min' : '< 1 min';

        return `
            <tr>
                <td><span class="queue-position">${index + 1}</span></td>
                <td><strong>${escapeHtml(person.name)}</strong></td>
                <td>${escapeHtml(person.email)}</td>
                <td>${displayWait}</td>
                <td>
                    <div style="display: flex; gap: var(--space-1);">
                        <button class="btn btn-outline btn-sm btn-icon" data-move-up="${index}" ${index === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
                        <button class="btn btn-outline btn-sm btn-icon" data-move-down="${index}" ${index === queue.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
                        <button class="btn btn-danger btn-sm" data-remove-user="${index}">Remove</button>
                    </div>
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
                    <th>Wait Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    tableContainer.querySelectorAll('[data-move-up]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.moveUp, 10);
            moveQueueUser(idx, idx - 1);
        });
    });

    tableContainer.querySelectorAll('[data-move-down]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.moveDown, 10);
            moveQueueUser(idx, idx + 1);
        });
    });

    tableContainer.querySelectorAll('[data-remove-user]').forEach(btn => {
        btn.addEventListener('click', () => {
            removeQueueUser(parseInt(btn.dataset.removeUser, 10));
        });
    });
}

function moveQueueUser(fromIndex, toIndex) {
    if (!selectedServiceId) return;

    const queues = getQueues();
    const queue = queues[selectedServiceId] || [];

    if (toIndex < 0 || toIndex >= queue.length) return;

    const [moved] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, moved);

    queues[selectedServiceId] = queue;
    saveQueues(queues);
    renderQueue();
}

function removeQueueUser(index) {
    if (!selectedServiceId) return;

    const queues = getQueues();
    const queue = queues[selectedServiceId] || [];
    const removed = queue[index];

    if (!removed) return;
    if (!confirm(`Remove ${removed.name} from the queue?`)) return;

    queue.splice(index, 1);
    queues[selectedServiceId] = queue;
    saveQueues(queues);
    renderQueue();
    showNotification(`${removed.name} removed from queue.`, 'info');
}

function serveNextUser() {
    if (!selectedServiceId) return;

    const queues = getQueues();
    const queue = queues[selectedServiceId] || [];

    if (queue.length === 0) {
        showNotification('No one in the queue to serve.', 'error');
        return;
    }

    const served = queue.shift();
    queues[selectedServiceId] = queue;
    saveQueues(queues);
    renderQueue();
    showNotification(`Now serving: ${served.name}`, 'success');
}

/* ================================================
   Shared Helpers
   ================================================ */

/**
 * Shows an error message on a form field.
 * @param {HTMLElement} input
 * @param {string} errorId
 * @param {string} message
 */
function showFieldError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

/**
 * Clears the error message on a form field.
 * @param {HTMLElement} input
 * @param {string} errorId
 */
function clearFieldError(input, errorId) {
    const errorEl = document.getElementById(errorId);
    input.classList.remove('error');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
}

/**
 * Escapes HTML entities to prevent XSS in rendered content.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
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