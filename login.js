// Same logic as api.js: use local backend when on localhost, 127.0.0.1, or file://
function getApiBaseUrl() {
    const override = localStorage.getItem('admin_api_base_url');
    if (override) return override.replace(/\/$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
    return isLocal ? 'http://localhost:8001/api/v1' : 'https://api.ardena.xyz/api/v1';
}
const API_BASE_URL = getApiBaseUrl();

// Password visibility toggle
document.getElementById('passwordToggle').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('passwordToggle');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = 'Hide';
        toggleBtn.setAttribute('aria-label', 'Hide password');
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = 'Show';
        toggleBtn.setAttribute('aria-label', 'Show password');
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.querySelector('.login-button');
    
    // Clear previous error
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let data = {};
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            if (response.status >= 500) throw new Error('Backend unreachable (e.g. 502). Is the API running at ' + API_BASE_URL + '?');
            throw new Error(text || 'Server returned non-JSON. Check API URL.');
        }
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }
        
        // Store token and admin info
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_info', JSON.stringify(data.admin));
        
        // Redirect to dashboard (to be created)
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        errorMessage.textContent = error.message || 'An error occurred. Please try again.';
        errorMessage.classList.add('show');
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }
});
