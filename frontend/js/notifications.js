function notify(message, type = "info") {
  const container = document.getElementById("notifications");
  if (!container) {
      showNotification(message, type);
      return;
  }

  const el = document.createElement("div");
  el.className = `notice notice-${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add("fade");
    setTimeout(() => el.remove(), 250);
  }, 2500);
}

function showNotification(message, type) {
    let container = document.getElementById('toastContainerUser');
    // Ensure container exists
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainerUser';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 16px;border-radius:8px;color:#fff;max-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.15);';
    toast.style.background = type === 'error' ? '#c0392b' : '#27ae60';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}