/* ========================================
   QueueSmart — User Page Logic
   ======================================== */

const API_BASE = 'http://localhost:3000/api/services';

document.addEventListener('DOMContentLoaded', () => {
    // For Join Queue Page
    if (document.getElementById('availableServicesContainer')) {
        loadAvailableServices();
    }
    
    // For User Dashboard Page
    if (document.getElementById('activeServicesList')) {
        renderUserDashboard();
    }
});


//get services from backend and display 
async function loadAvailableServices() {
    const container = document.getElementById('availableServicesContainer');
    
    try {
        const response = await fetch(API_BASE);
        const services = await response.json();

        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No services are currently available. Please check back later.</p>
                </div>`;
            return;
        }

        container.innerHTML = services.map(service => `
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
                    <button class="btn btn-primary w-100" onclick="joinQueue(${service.id})">
                        Join Queue
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p class="error-msg">Error loading services. Is the backend running?</p>';
    }
}

//populate userdasboard with realtime status and serivces instead of temp data
async function renderUserDashboard() {
    const statusContainer = document.getElementById('userStatusSummary');
    const servicesList = document.getElementById('activeServicesList');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    try {
        // fetch services from backend
        const response = await fetch(API_BASE);
        const services = await response.json();

        // handle active services slot
        if (services.length === 0) {
            servicesList.innerHTML = '<p>No services currently open.</p>';
        } else {
            servicesList.innerHTML = services.map(s => `
                <div style="padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius-md);">
                    <h3>${escapeHtml(s.name)}</h3>
                    <p>Estimated Duration: ${s.expectedDuration} minutes</p>
                    <span class="badge badge-success">Open</span>
                </div>
            `).join('');
        }

        // handle current status slot
        const queues = JSON.parse(localStorage.getItem('qs_queues')) || {};
        let userPosition = null;
        let userService = null;

        for (const serviceId in queues) {
            const index = queues[serviceId].findIndex(u => u.email === currentUser.email);
            if (index !== -1) {
                userPosition = index + 1;
                userService = services.find(s => s.id == serviceId);
                break;
            }
        }

        if (userPosition) {
            statusContainer.innerHTML = `
                <p><strong>Service:</strong> ${escapeHtml(userService.name)}</p>
                <p><strong>Your Position:</strong> #${userPosition}</p>
                <p><strong>Estimated Wait Time:</strong> ${userPosition * userService.expectedDuration} minutes</p>
                <span class="badge badge-warning" style="margin-top: var(--space-3); display: inline-block;">Waiting</span>
            `;
        } else {
            statusContainer.innerHTML = `
                <p>You are not currently in any queue.</p>
                <a href="join-queue.html" class="btn btn-primary btn-sm" style="margin-top: 10px; display: inline-block;">Join a Queue</a>
            `;
        }

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}