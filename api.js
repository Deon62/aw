const API_BASE_URL = 'http://localhost:8000/api/v1';

// Get stored admin token
function getAuthToken() {
    return localStorage.getItem('admin_token');
}

// Get stored admin info
function getAdminInfo() {
    const info = localStorage.getItem('admin_info');
    return info ? JSON.parse(info) : null;
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    // Handle empty responses (like DELETE)
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = {};
    }
    
    if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        window.location.href = 'index.html';
        throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
    }

    return data;
}

// API methods
const api = {
    // Admin
    getCurrentAdmin: () => apiRequest('/admin/me'),
    logout: () => apiRequest('/admin/auth/logout', { method: 'POST' }),

    // Dashboard
    getDashboardStats: () => apiRequest('/admin/dashboard/stats'),
    getRecentActivity: () => apiRequest('/admin/dashboard/activity'),
    getVerificationQueueStats: () => apiRequest('/admin/dashboard/verification-queue'),

    // Hosts
    getHosts: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/hosts${queryString ? '?' + queryString : ''}`);
    },
    getHost: (id) => apiRequest(`/admin/hosts/${id}`),
    updateHost: (id, data) => apiRequest(`/admin/hosts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivateHost: (id) => apiRequest(`/admin/hosts/${id}/deactivate`, { method: 'PUT' }),
    activateHost: (id) => apiRequest(`/admin/hosts/${id}/activate`, { method: 'PUT' }),
    deleteHost: (id) => apiRequest(`/admin/hosts/${id}`, { method: 'DELETE' }),
    getHostCars: (id) => apiRequest(`/admin/hosts/${id}/cars`),
    getHostPaymentMethods: (id) => apiRequest(`/admin/hosts/${id}/payment-methods`),
    getHostFeedback: (id) => apiRequest(`/admin/hosts/${id}/feedback`),

    // Clients
    getClients: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/clients${queryString ? '?' + queryString : ''}`);
    },
    getClient: (id) => apiRequest(`/admin/clients/${id}`),

    // Cars
    getCars: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/cars${queryString ? '?' + queryString : ''}`);
    },
    getCar: (id) => apiRequest(`/admin/cars/${id}`),
    approveCar: (id) => apiRequest(`/admin/cars/${id}/approve`, { method: 'PUT' }),
    rejectCar: (id, rejectionReason) => apiRequest(`/admin/cars/${id}/reject`, { 
        method: 'PUT', 
        body: JSON.stringify({ rejection_reason: rejectionReason })
    }),
    updateCarStatus: (id, status, rejectionReason = null) => {
        const body = { verification_status: status };
        if (rejectionReason) {
            body.rejection_reason = rejectionReason;
        }
        return apiRequest(`/admin/cars/${id}/status`, { 
            method: 'PUT', 
            body: JSON.stringify(body)
        });
    },
    hideCar: (id) => apiRequest(`/admin/cars/${id}/hide`, { method: 'PUT' }),
    showCar: (id) => apiRequest(`/admin/cars/${id}/show`, { method: 'PUT' }),
    deleteCar: (id) => apiRequest(`/admin/cars/${id}`, { method: 'DELETE' }),

    // Feedback
    getFeedback: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/feedback${queryString ? '?' + queryString : ''}`);
    },

    // Notifications
    broadcastToHosts: (data) => apiRequest('/admin/notifications/broadcast-hosts', { 
        method: 'POST', 
        body: JSON.stringify(data)
    }),
    broadcastToClients: (data) => apiRequest('/admin/notifications/broadcast-clients', { 
        method: 'POST', 
        body: JSON.stringify(data)
    }),
    sendToUser: (data) => apiRequest('/admin/notifications/send', { 
        method: 'POST', 
        body: JSON.stringify(data)
    }),

    // Admin Management
    getAdmins: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/admins${queryString ? '?' + queryString : ''}`);
    },
    getAdmin: (id) => apiRequest(`/admin/admins/${id}`),
    createAdmin: (data) => apiRequest('/admin/admins', { 
        method: 'POST', 
        body: JSON.stringify(data)
    }),
    updateAdmin: (id, data) => apiRequest(`/admin/admins/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data)
    }),
    deleteAdmin: (id) => apiRequest(`/admin/admins/${id}`, { method: 'DELETE' }),
    changeAdminPassword: (id, data) => apiRequest(`/admin/admins/${id}/password`, { 
        method: 'PUT', 
        body: JSON.stringify(data)
    }),
    activateAdmin: (id) => apiRequest(`/admin/admins/${id}/activate`, { method: 'PUT' }),
    deactivateAdmin: (id) => apiRequest(`/admin/admins/${id}/deactivate`, { method: 'PUT' }),
    
    // Own Profile Management
    updateOwnProfile: (data) => apiRequest('/admin/profile', { 
        method: 'PUT', 
        body: JSON.stringify(data)
    }),
    changeOwnPassword: (data) => apiRequest('/admin/change-password', { 
        method: 'PUT', 
        body: JSON.stringify(data)
    }),

    // Payment Methods
    getPaymentMethods: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/payment-methods${queryString ? '?' + queryString : ''}`);
    },
    getPaymentMethod: (id) => apiRequest(`/admin/payment-methods/${id}`),
    deletePaymentMethod: (id) => apiRequest(`/admin/payment-methods/${id}`, { method: 'DELETE' }),

    // Support Conversations
    getSupportConversations: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/admin/support/conversations${queryString ? '?' + queryString : ''}`);
    },
    getSupportConversation: (id) => apiRequest(`/admin/support/conversations/${id}`),
    respondToSupportConversation: (id, message) => apiRequest(`/admin/support/conversations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ message })
    }),
    closeSupportConversation: (id) => apiRequest(`/admin/support/conversations/${id}/close`, { method: 'PUT' }),
    reopenSupportConversation: (id) => apiRequest(`/admin/support/conversations/${id}/reopen`, { method: 'PUT' })
};
