// js/loginValidate.js
import { showError, clearError, isEmail } from "./validation.js";
import { notify } from "./notifications.js";

export function setupLoginValidation() {
  const form = document.querySelector("form");
  if (!form) return;

  const email = document.getElementById("email");
  const password = document.getElementById("password");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    [email, password].forEach(clearError);

    let ok = true;

    if (!email.value.trim()) {
      showError(email, "Email is required.");
      ok = false;
    } else if (!isEmail(email.value)) {
      showError(email, "Enter a valid email.");
      ok = false;
    }

    if (!password.value.trim()) {
      showError(password, "Password is required.");
      ok = false;
    }

    if (!ok) {
      notify("Fix the highlighted fields.", "warning");
      return;
    }

    notify("Login valid (mock).", "success");
    // redirect (optional)
    // window.location.href = "./user/dashboard.html";
  });
}