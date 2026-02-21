// js/serviceValidate.js
import { showError, clearError } from "./validation.js";
import { notify } from "./notifications.js";

export function setupServiceFormValidation() {
  const form = document.getElementById("serviceForm");
  if (!form) return;

  const name = document.getElementById("serviceName");
  const desc = document.getElementById("serviceDesc");
  const duration = document.getElementById("serviceDuration");
  const priority = document.getElementById("servicePriority");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    [name, desc, duration, priority].forEach(clearError);

    let ok = true;

    // Required + max length limit
    const n = name.value.trim();
    if (!n) { showError(name, "Service name is required."); ok = false; }
    else if (n.length > 100) { showError(name, "Max 100 characters."); ok = false; }

    // Required
    if (!desc.value.trim()) { showError(desc, "Description is required."); ok = false; }

    // Required + number
    const mins = Number(duration.value);
    if (!duration.value.trim() || Number.isNaN(mins) || mins <= 0) {
      showError(duration, "Duration must be a positive number.");
      ok = false;
    }

    // Required select
    if (!priority.value) { showError(priority, "Priority is required."); ok = false; }

    if (!ok) {
      notify("Fix the highlighted fields.", "warning");
      return;
    }

    notify("Service saved (mock).", "success");
    form.reset();
  });
}