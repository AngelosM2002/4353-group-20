// js/registerValidate.js
import { showError, clearError, isEmail } from "./validation.js";
import { notify } from "./notifications.js";

export function setupRegisterValidation() {
  const form = document.querySelector("form");
  if (!form) return;

  const email = document.getElementById("email");
  const password = document.getElementById("password");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // clear old errors
    [email, password].forEach(clearError);

    let ok = true;

    // Required + proper email type check
    if (!email.value.trim()) {
      showError(email, "Email is required.");
      ok = false;
    } else if (!isEmail(email.value)) {
      showError(email, "Enter a valid email address.");
      ok = false;
    }

    // Required + length rule example
    if (!password.value.trim()) {
      showError(password, "Password is required.");
      ok = false;
    } else if (password.value.length < 6) {
      showError(password, "Password must be at least 6 characters.");
      ok = false;
    }

    if (!ok) {
      notify("Fix the highlighted fields.", "warning");
      return;
    }

    notify("Registration valid (mock).", "success");
    // redirect (optional)
    // window.location.href = "./login.html";
  });
}