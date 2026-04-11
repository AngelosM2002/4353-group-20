// js/validation.js

export function showError(input, message) {
  input.classList.add("error");

  // expects markup: input inside .form-field with .form-error
  const field = input.closest(".form-field");
  const errEl = field ? field.querySelector(".form-error") : null;

  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add("visible");
  }
}

export function clearError(input) {
  input.classList.remove("error");

  const field = input.closest(".form-field");
  const errEl = field ? field.querySelector(".form-error") : null;

  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}