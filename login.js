//const API_BASE_URL = 'http://localhost:8001/api/v1';
const API_BASE_URL = 'http://192.168.1.31:8001/api/v1';

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
        
        const data = await response.json();
        
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
