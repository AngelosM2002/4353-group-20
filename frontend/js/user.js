/* ========================================
   QueueSmart — User Page Logic
   ======================================== */

const API_BASE = 'http://localhost:3000/api/services';
const QUEUE_API = 'http://localhost:3000/api/queues';

document.addEventListener('DOMContentLoaded', () => {
    // For Join Queue Page
    if (document.getElementById('availableServicesContainer')) {
        loadAvailableServices();
    }
    
    // For User Dashboard Page
    if (document.getElementById('activeServicesList')) {
        renderUserDashboard();
    }

    //for queue status page 
    if (document.getElementById('queueStatusContainer')) {
        renderUserStatus();
    }
});


//show users specific position in their active queue
async function renderUserStatus() {
    const container = document.getElementById('queueStatusContainer');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    if (!currentUser) {
        container.innerHTML = '<p>Please log in to see your status.</p>';
        return;
    }

    try {
        //fetch the specific status for this user email
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

        const waitTime = status.position * status.service.expectedDuration;

        container.innerHTML = `
            <section class="card">
                <p><strong>Service:</strong> ${escapeHtml(status.service.name)}</p>
                <p><strong>Your Position:</strong> #${status.position}</p>
                <p><strong>Estimated Wait Time:</strong> ${waitTime} minutes</p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <span class="badge badge-warning">Waiting</span>
                    <button class="btn btn-danger btn-sm" onclick="leaveQueue(${status.service.id})">Leave Queue</button>
                </div>
            </section>
        `;
    } catch (error) {
        console.error("Status error:", error);
        container.innerHTML = '<p>Error loading your queue status.</p>';
    }
}

//get services from backend and display 
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
            container.innerHTML = `<div class="empty-state"><p>No services available.</p></div>`;
            return;
        }

        container.innerHTML = services.map(service => {
            const isJoined = userStatus.inQueue && userStatus.service.id === service.id;
            
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
                            onclick="joinQueue(event, ${service.id})"
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
        container.innerHTML = '<p class="error-msg">Error loading services.</p>';
    }
}



//populate userdasboard with realtime status and serivces instead of temp data
async function renderUserDashboard() {
    const statusContainer = document.getElementById('userStatusSummary');
    const servicesList = document.getElementById('activeServicesList');
    const currentUser = JSON.parse(localStorage.getItem('qs_currentUser'));

    try {
        //fetch available services
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

        // fetch user status from backnd
        const qResponse = await fetch(`${QUEUE_API}/status?email=${currentUser.email}`);
        const status = await qResponse.json();

        if (status.inQueue) {
            statusContainer.innerHTML = `
                <p><strong>Service:</strong> ${escapeHtml(status.service.name)}</p>
                <p><strong>Your Position:</strong> #${status.position}</p>
                <p><strong>Estimated Wait Time:</strong> ${status.position * status.service.expectedDuration} minutes</p>
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

//add current user to specific service queue
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
                serviceId: serviceId,
                userName: currentUser.name,
                userEmail: currentUser.email
            })
        });

        const data = await response.json();

        if (response.ok) {
            joinBtn.innerText = '✓ Queue Joined';
            joinBtn.style.backgroundColor = 'var(--success)'; 
            joinBtn.disabled = true;

            showNotification('Successfully joined!', 'success');
            

            setTimeout(() => {
                window.location.href = 'queue-status.html';
            }, 800);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error("Join error:", error);
    }
}




//remove current user from specific service queue
async function leaveQueue(serviceId) {
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
            
            // try to redirect
            window.location.href = 'user-dashboard.html';

            // fallback; incase redirect doesnt work 
            if (document.getElementById('queueStatusContainer')) {
                renderUserStatus(); 
            }
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Error leaving queue', 'error');
        }
    } catch (error) {
        console.error("Leave error:", error);
        // If the server call worked but the UI is stuck, just refresh
        location.reload(); 
    }
}


function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}