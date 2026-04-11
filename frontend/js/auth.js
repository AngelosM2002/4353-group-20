/* ========================================
   queuesmart auth logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // figure out wich form is on the page
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        initLoginForm(loginForm);
    }

    if (registerForm) {
        initRegisterForm(registerForm);
    }

    // password vizibility toggles
    initPasswordToggles();
});

/* ---------- validaton helpers ---------- */

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function clearError(input, errorId) {
    const errorEl = document.getElementById(errorId);
    input.classList.remove('error');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
}

/* ---------- login form ---------- */

function initLoginForm(form) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    emailInput.addEventListener('blur', () => validateLoginEmail(emailInput));
    passwordInput.addEventListener('blur', () => validateLoginPassword(passwordInput));

    emailInput.addEventListener('focus', () => clearError(emailInput, 'emailError'));
    passwordInput.addEventListener('focus', () => clearError(passwordInput, 'passwordError'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEmailValid = validateLoginEmail(emailInput);
        const isPasswordValid = validateLoginPassword(passwordInput);

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const result = await response.json();

            if (response.ok && result.user) {
                const currentUser = {
                    name: result.user.name,
                    email: result.user.email,
                    role: result.user.role,
                    loggedIn: true
                };

                localStorage.setItem('qs_currentUser', JSON.stringify(currentUser));

                // ✅ FIXED ROLE CHECK (case-insensitive)
                if (String(currentUser.role).toLowerCase() === 'administrator') {
                    window.location.href = '/frontend/pages/admin/admin-dashboard.html?v=1';
                } else {
                    window.location.href = '/frontend/pages/user/user-dashboard.html?v=1';
                }

            } else {
                showError(
                    passwordInput,
                    'passwordError',
                    result.message || 'Invalid email or password.'
                );
            }
        } catch (error) {
            console.error('connection error:', error);
            alert('could not connect to the backend. ensure your server is running on port 3000.');
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

/* ---------- registraion form ---------- */

function initRegisterForm(form) {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    fullNameInput.addEventListener('blur', () => validateFullName(fullNameInput));
    emailInput.addEventListener('blur', () => validateRegEmail(emailInput));
    passwordInput.addEventListener('blur', () => validateRegPassword(passwordInput));
    confirmPasswordInput.addEventListener('blur', () =>
        validateConfirmPassword(passwordInput, confirmPasswordInput)
    );

    fullNameInput.addEventListener('focus', () => clearError(fullNameInput, 'fullNameError'));
    emailInput.addEventListener('focus', () => clearError(emailInput, 'emailError'));
    passwordInput.addEventListener('focus', () => clearError(passwordInput, 'passwordError'));
    confirmPasswordInput.addEventListener('focus', () =>
        clearError(confirmPasswordInput, 'confirmPasswordError')
    );

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isNameValid = validateFullName(fullNameInput);
        const isEmailValid = validateRegEmail(emailInput);
        const isPasswordValid = validateRegPassword(passwordInput);
        const isConfirmValid = validateConfirmPassword(passwordInput, confirmPasswordInput);

        if (isNameValid && isEmailValid && isPasswordValid && isConfirmValid) {
            const role = document.querySelector('input[name="role"]:checked').value;

            const userData = {
                name: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                role: role
            };

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();

                if (response.ok) {
                    form.style.display = 'none';
                    const footer = document.getElementById('registerFooter');
                    const successMsg = document.getElementById('registerSuccess');

                    if (footer) footer.style.display = 'none';
                    if (successMsg) successMsg.classList.add('visible');
                } else {
                    showError(emailInput, 'emailError', result.message || 'registration failed');
                }
            } catch (error) {
                console.error('connection error:', error);
                alert('could not connect to the backend. ensure your server is running on port 3000.');
            }
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

/* ---------- password toggle ---------- */

function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const wrapper = button.closest('.password-wrapper');
            const input = wrapper.querySelector('.form-input');

            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        });
    });
}