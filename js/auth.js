/* ========================================
   QueueSmart — Authentication Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Determine which form is on the page
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        initLoginForm(loginForm);
    }

    if (registerForm) {
        initRegisterForm(registerForm);
    }

    // Password visibility toggles
    initPasswordToggles();
});

/* ---------- Validation Helpers ---------- */

/**
 * Validates an email address format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Shows an error message on a form field.
 * @param {HTMLElement} input - The input element
 * @param {string} errorId - The ID of the error <p> element
 * @param {string} message - Error message to display
 */
function showError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

/**
 * Clears the error message on a form field.
 * @param {HTMLElement} input - The input element
 * @param {string} errorId - The ID of the error <p> element
 */
function clearError(input, errorId) {
    const errorEl = document.getElementById(errorId);
    input.classList.remove('error');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
}

/* ---------- Login Form ---------- */

function initLoginForm(form) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Real-time validation on blur
    emailInput.addEventListener('blur', () => validateLoginEmail(emailInput));
    passwordInput.addEventListener('blur', () => validateLoginPassword(passwordInput));

    // Clear errors on focus
    emailInput.addEventListener('focus', () => clearError(emailInput, 'emailError'));
    passwordInput.addEventListener('focus', () => clearError(passwordInput, 'passwordError'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isEmailValid = validateLoginEmail(emailInput);
        const isPasswordValid = validateLoginPassword(passwordInput);

        if (isEmailValid && isPasswordValid) {
            // Mock login — store user in localStorage
            const mockUser = {
                name: 'Demo User',
                email: emailInput.value.trim(),
                role: 'user',
                loggedIn: true
            };

            // Check if a registered user exists in localStorage
            const storedUsers = JSON.parse(localStorage.getItem('qs_users') || '[]');
            const matchedUser = storedUsers.find(
                u => u.email === emailInput.value.trim()
            );

            if (matchedUser) {
                // Check password match
                if (matchedUser.password !== passwordInput.value) {
                    showError(passwordInput, 'passwordError', 'Incorrect password. Please try again.');
                    return;
                }
                mockUser.name = matchedUser.name;
                mockUser.role = matchedUser.role;
            }

            localStorage.setItem('qs_currentUser', JSON.stringify(mockUser));

            // Redirect based on role
            if (mockUser.role === 'admin')
            {
                window.location.href = '/pages/admin/admin-dashboard.html?v=1';
            }
            else
            {
                window.location.href = '/pages/user/user-dashboard.html?v=1';
            }
        }
    });
}

function validateLoginEmail(input) {
    const value = input.value.trim();

    if (!value) {
        showError(input, 'emailError', 'Email is required.');
        return false;
    }

    if (!isValidEmail(value)) {
        showError(input, 'emailError', 'Please enter a valid email address.');
        return false;
    }

    clearError(input, 'emailError');
    return true;
}

function validateLoginPassword(input) {
    const value = input.value;

    if (!value) {
        showError(input, 'passwordError', 'Password is required.');
        return false;
    }

    if (value.length < 8) {
        showError(input, 'passwordError', 'Password must be at least 8 characters.');
        return false;
    }

    clearError(input, 'passwordError');
    return true;
}

/* ---------- Registration Form ---------- */

function initRegisterForm(form) {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Real-time validation on blur
    fullNameInput.addEventListener('blur', () => validateFullName(fullNameInput));
    emailInput.addEventListener('blur', () => validateRegEmail(emailInput));
    passwordInput.addEventListener('blur', () => validateRegPassword(passwordInput));
    confirmPasswordInput.addEventListener('blur', () =>
        validateConfirmPassword(passwordInput, confirmPasswordInput)
    );

    // Clear errors on focus
    fullNameInput.addEventListener('focus', () => clearError(fullNameInput, 'fullNameError'));
    emailInput.addEventListener('focus', () => clearError(emailInput, 'emailError'));
    passwordInput.addEventListener('focus', () => clearError(passwordInput, 'passwordError'));
    confirmPasswordInput.addEventListener('focus', () =>
        clearError(confirmPasswordInput, 'confirmPasswordError')
    );

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isNameValid = validateFullName(fullNameInput);
        const isEmailValid = validateRegEmail(emailInput);
        const isPasswordValid = validateRegPassword(passwordInput);
        const isConfirmValid = validateConfirmPassword(passwordInput, confirmPasswordInput);

        if (isNameValid && isEmailValid && isPasswordValid && isConfirmValid) {
            // Get selected role
            const role = document.querySelector('input[name="role"]:checked').value;

            // Store user in localStorage
            const storedUsers = JSON.parse(localStorage.getItem('qs_users') || '[]');

            // Check if email already exists
            if (storedUsers.find(u => u.email === emailInput.value.trim())) {
                showError(emailInput, 'emailError', 'An account with this email already exists.');
                return;
            }

            const newUser = {
                name: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                role: role,
                createdAt: new Date().toISOString()
            };

            storedUsers.push(newUser);
            localStorage.setItem('qs_users', JSON.stringify(storedUsers));

            // Show success message
            form.style.display = 'none';
            document.getElementById('registerFooter').style.display = 'none';
            document.getElementById('registerSuccess').classList.add('visible');
        }
    });
}

function validateFullName(input) {
    const value = input.value.trim();

    if (!value) {
        showError(input, 'fullNameError', 'Full name is required.');
        return false;
    }

    if (value.length > 100) {
        showError(input, 'fullNameError', 'Name must be 100 characters or fewer.');
        return false;
    }

    if (value.length < 2) {
        showError(input, 'fullNameError', 'Name must be at least 2 characters.');
        return false;
    }

    clearError(input, 'fullNameError');
    return true;
}

function validateRegEmail(input) {
    const value = input.value.trim();

    if (!value) {
        showError(input, 'emailError', 'Email is required.');
        return false;
    }

    if (!isValidEmail(value)) {
        showError(input, 'emailError', 'Please enter a valid email address.');
        return false;
    }

    clearError(input, 'emailError');
    return true;
}

function validateRegPassword(input) {
    const value = input.value;

    if (!value) {
        showError(input, 'passwordError', 'Password is required.');
        return false;
    }

    if (value.length < 8) {
        showError(input, 'passwordError', 'Password must be at least 8 characters.');
        return false;
    }

    if (!/[A-Z]/.test(value)) {
        showError(input, 'passwordError', 'Password must contain at least one uppercase letter.');
        return false;
    }

    if (!/[0-9]/.test(value)) {
        showError(input, 'passwordError', 'Password must contain at least one number.');
        return false;
    }

    clearError(input, 'passwordError');
    return true;
}

function validateConfirmPassword(passwordInput, confirmInput) {
    const confirmValue = confirmInput.value;

    if (!confirmValue) {
        showError(confirmInput, 'confirmPasswordError', 'Please confirm your password.');
        return false;
    }

    if (confirmValue !== passwordInput.value) {
        showError(confirmInput, 'confirmPasswordError', 'Passwords do not match.');
        return false;
    }

    clearError(confirmInput, 'confirmPasswordError');
    return true;
}

/* ---------- Password Toggle ---------- */

function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const wrapper = button.closest('.password-wrapper');
            const input = wrapper.querySelector('.form-input');

            if (input.type === 'password') {
                input.type = 'text';
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                `;
            } else {
                input.type = 'password';
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                `;
            }
        });
    });
}