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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    [name, desc, duration, priority].forEach(clearError);

    let ok = true;

    // ... (Keep your existing validation logic here)

    if (!ok) {
        notify("Fix the highlighted fields.", "warning");
        return;
    }

    // Prepare data for the backend
    const serviceData = {
        name: name.value.trim(),
        description: desc.value.trim(),
        expectedDuration: Number(duration.value),
        priorityLevel: Number(priority.value)
    };

    try {
        const response = await fetch('http://localhost:3000/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
        });

        const result = await response.json();

        if (response.ok) {
            notify("Service created successfully!", "success");
            form.reset();
            // Close modal logic here if applicable
            document.getElementById("serviceModal").classList.remove("active"); 
            // Refresh the list
            loadServices(); 
        } else {
            notify(result.message || "Failed to save service.", "error");
        }
    } catch (error) {
        console.error("Error saving service:", error);
        notify("Could not connect to server.", "error");
    }
});

}