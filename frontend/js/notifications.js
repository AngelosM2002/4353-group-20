// js/notifications.js - updated for mongodb status tracking
export function notify(message, type = "info") {
  const container = document.getElementById("notifications");
  if (!container) {
      // fallback to user toast if the standard notification container is missing
      showNotification(message, type);
      return;
  }

  const el = document.createElement("div");
  el.className = `notice notice-${type}`;
  el.textContent = message;

  container.appendChild(el);

  // auto-remove from ui
  setTimeout(() => {
    el.classList.add("fade");
    setTimeout(() => el.remove(), 250);
  }, 2500);
}

// helper to maintain consistency with the main app notifications
function showNotification(message, type) {
    const container = document.getElementById('toastContainerUser');
    if (container) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.background = type === 'error' ? '#c0392b' : '#27ae60';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }
}