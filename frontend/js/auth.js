let loginForm;
let submitBtn;
let submitText;
let submitSpinner;
let alertContainer;

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    checkExistingLogin();
});


function initializeElements() {
    loginForm = document.getElementById('loginForm');
    submitBtn = document.getElementById('submitBtn');
    submitText = document.getElementById('submitText');
    submitSpinner = document.getElementById('submitSpinner');
    alertContainer = document.getElementById('alert-container');
}

function setupEventListeners() {
    // Formulario de login
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Toggle para mostrar/ocultar contrase�a
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }

    // Recordar datos del formulario
    const rememberCheckbox = document.getElementById('rememberMe');
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', handleRememberMe);
        loadSavedCredentials();
    }    
    // Quick login buttons para demo
    setupQuickLoginButtons();
}

// Quick login buttons para demo
function setupQuickLoginButtons() {
    document.querySelectorAll('.bg-light .text-muted div').forEach(div => {
        const text = div.textContent;
        if (text.includes('@') && text.includes(' / ')) {
            div.style.cursor = 'pointer';
            div.style.transition = 'background-color 0.2s';
            div.addEventListener('click', function(e) {
                e.stopPropagation();
                const parts = text.split(' / ');
                if (parts.length >= 2) {
                    const email = parts[0].trim();
                    const password = parts[1].trim();
                    
                    const emailField = document.getElementById('email');
                    const passwordField = document.getElementById('password');
                    
                    if (emailField && passwordField) {
                        emailField.value = email;
                        passwordField.value = password;
                        emailField.focus();
                    }
                }
            });
            div.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#e0f7f6';
            });
            div.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

    // Validaciones b�sicas
    if (!email || !password) {
        showAlert('Por favor, complete todos los campos', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showAlert('Por favor, ingrese un email v�lido', 'warning');
        return;
    }

    try {
        setLoadingState(true);
        clearAlert();

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success) {
            // Guardar token en localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('maestroData', JSON.stringify(data.maestro));

            // Guardar credenciales si el usuario lo desea
            if (rememberMe) {
                saveCredentials(email, password);
            } else {
                clearSavedCredentials();
            }

            showAlert(`¡Bienvenido/a ${data.maestro.nombre}! Redirigiendo...`, 'success');

            // Redireccionar al dashboard
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);

        } else {
            showAlert(data.message || 'Credenciales inv�lidas', 'danger');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showAlert('Error de conexi�n. Por favor, int�ntelo de nuevo.', 'danger');
    } finally {
        setLoadingState(false);
    }
}

// ===== UTILIDADES DE UI =====
function setLoadingState(isLoading) {
    if (submitBtn && submitText && submitSpinner) {
        submitBtn.disabled = isLoading;
        submitText.style.display = isLoading ? 'none' : 'inline';
        submitSpinner.style.display = isLoading ? 'inline' : 'none';
    }
}

function showAlert(message, type = 'info') {
    if (!alertContainer) return;

    const alertClass = {
        success: 'alert-success',
        danger: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
    }[type] || 'alert-info';

    const iconClass = {
        success: 'fa-check-circle',
        danger: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';

    alertContainer.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="fas ${iconClass} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Auto-ocultar despu�s de 5 segundos para alertas de �xito
    if (type === 'success') {
        setTimeout(clearAlert, 5000);
    }
}

function clearAlert() {
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

// ===== TOGGLE PASSWORD =====
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('#togglePassword i');
    
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

// ===== RECORDAR CREDENCIALES =====
function handleRememberMe() {
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (rememberCheckbox && !rememberCheckbox.checked) {
        clearSavedCredentials();
    }
}

function saveCredentials(email, password) {
    if (confirm('�Desea guardar sus credenciales de forma segura?')) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('hasRememberedCredentials', 'true');
    }
}

function loadSavedCredentials() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const hasRememberedCredentials = localStorage.getItem('hasRememberedCredentials');
    
    if (rememberedEmail && hasRememberedCredentials) {
        const emailInput = document.getElementById('email');
        const rememberCheckbox = document.getElementById('rememberMe');
        
        if (emailInput) emailInput.value = rememberedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

function clearSavedCredentials() {
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('hasRememberedCredentials');
}

// ===== VERIFICACI�N DE LOGIN EXISTENTE =====
function checkExistingLogin() {
    const token = localStorage.getItem('authToken');
    const currentPath = window.location.pathname;    const fromIndex = document.referrer.includes('index.html') || sessionStorage.getItem('fromIndex');
    
    console.log('checkExistingLogin - token:', !!token, 'currentPath:', currentPath, 'fromIndex:', fromIndex);
    
    // Si viene desde index.html, forzar logout completo
    if (fromIndex) {
        console.log('Detectado acceso desde index.html - Limpiando sesión...');
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.removeItem('fromIndex');
        return false;
    }    
    // Solo redirigir automáticamente si el token es válido Y si viene de una página que requiere autenticación
    if (token && currentPath === '/dashboard') {
        // Si está en dashboard y tiene token, verificar si es válido
        return verifyTokenValidity();
    }
    
    // No redirigir automáticamente desde login, dejar que el usuario ingrese credenciales
    return false;
}

// Función para verificar si el token es válido
async function verifyTokenValidity() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Token inválido, limpiar localStorage
            logout();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

// ===== VALIDACIONES =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===== LOGOUT =====
function logout() {
    console.log('Cerrando sesión...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('maestroData');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('hasRememberedCredentials');
    
    // Redirigir a la página principal, no al login directamente
    window.location.replace('/');
}

// ===== VERIFICACI�N DE AUTENTICACI�N =====
function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token;
}

// ===== OBTENER DATOS DEL MAESTRO =====
function getMaestroData() {
    const maestroData = localStorage.getItem('maestroData');
    return maestroData ? JSON.parse(maestroData) : null;
}

// ===== EXPORT PARA USO EN OTROS ARCHIVOS =====
window.authUtils = {
    isAuthenticated,
    getMaestroData,
    logout,
    showAlert,
    setLoadingState
};
