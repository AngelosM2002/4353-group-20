// js/notifications.js
export function notify(message, type = "info") {
  const container = document.getElementById("notifications");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `notice notice-${type}`;
  el.textContent = message;

  container.appendChild(el);

  // auto-remove
  setTimeout(() => {
    el.classList.add("fade");
    setTimeout(() => el.remove(), 250);
  }, 2500);
}