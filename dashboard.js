// Check authentication on load
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Load admin info
    await loadAdminInfo();
    
    // Setup navigation
    setupNavigation();
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Load dashboard by default
    loadDashboard();
});

// Load admin info
async function loadAdminInfo() {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (!profileName || !profileEmail || !profileAvatar) {
        console.error('Profile elements not found');
        return;
    }
    
    try {
        // Try to fetch from API first (most up-to-date)
        console.log('Fetching admin info from API...');
        const admin = await api.getCurrentAdmin();
        console.log('Admin data received:', admin);
        
        if (admin && (admin.full_name || admin.email)) {
            localStorage.setItem('admin_info', JSON.stringify(admin));
            profileName.textContent = admin.full_name || 'Admin';
            profileEmail.textContent = admin.email || '';
            const initials = (admin.full_name || admin.email || 'A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            profileAvatar.textContent = initials;
            console.log('Admin profile loaded successfully');
            
            // Show/hide admin management based on role
            const adminsNavItem = document.getElementById('adminsNavItem');
            if (adminsNavItem && admin.role === 'super_admin') {
                adminsNavItem.style.display = 'block';
            }
            
            return;
        }
    } catch (error) {
        console.error('Error fetching admin from API:', error);
        // Fallback to localStorage if API fails
        try {
            const adminInfo = api.getAdminInfo();
            console.log('Admin info from localStorage:', adminInfo);
            if (adminInfo && (adminInfo.full_name || adminInfo.email)) {
                profileName.textContent = adminInfo.full_name || 'Admin';
                profileEmail.textContent = adminInfo.email || '';
                const initials = (adminInfo.full_name || adminInfo.email || 'A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                profileAvatar.textContent = initials;
                console.log('Admin profile loaded from localStorage');
                
                // Show/hide admin management based on role
                const adminsNavItem = document.getElementById('adminsNavItem');
                if (adminsNavItem && adminInfo.role === 'super_admin') {
                    adminsNavItem.style.display = 'block';
                }
                
                return;
            }
        } catch (localError) {
            console.error('Error reading from localStorage:', localError);
        }
    }
    
    // If both fail, show error
    console.error('Failed to load admin profile');
    profileName.textContent = 'Error';
    profileEmail.textContent = 'Unable to load profile';
    profileAvatar.textContent = '?';
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Load page
            loadPage(page);
        });
    });
}

// Setup profile dropdown
function setupProfileDropdown() {
    const profileButton = document.getElementById('profileButton');
    const profileMenu = document.getElementById('profileMenu');
    const logoutLink = document.getElementById('logoutLink');

    profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileButton.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    });

    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        window.location.href = 'index.html';
    });

    // Profile link
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadMyProfile();
        });
    }

    // Change password link
    const changePasswordLink = document.getElementById('changePasswordLink');
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showChangeOwnPasswordModal();
        });
    }
}

// Load page content
function loadPage(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        hosts: 'Hosts',
        clients: 'Clients',
        cars: 'Cars',
        feedback: 'Feedback',
        notifications: 'Notifications',
        'payment-methods': 'Payment Methods',
        support: 'Support',
        admins: 'Admins'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Show selected page
    // Convert page name with hyphens to camelCase for element ID
    const pageId = page.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + 'Page';
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.style.display = 'block';
    }

    // Load page-specific content
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'hosts':
            setupHostSearch();
            loadHosts();
            break;
        case 'clients':
            loadClients();
            break;
        case 'cars':
            setupCarSearch();
            loadCars();
            break;
        case 'feedback':
            loadFeedback();
            break;
        case 'notifications':
            switchNotificationTab('host');
            loadHostsForNotifications();
            break;
        case 'admins':
            setupAdminSearch();
            loadAdmins();
            break;
        case 'payment-methods':
            setupPaymentMethodSearch();
            loadPaymentMethods();
            break;
        case 'support':
            setupSupportSearch();
            loadSupportConversations();
            break;
    }
}

// Back to hosts list
function backToHostsList() {
    loadPage('hosts');
}

// Chart instances storage
let userDistributionChart = null;
let verificationStatusChart = null;

// Load dashboard
async function loadDashboard() {
    const statsGrid = document.getElementById('statsGrid');
    const recentActivity = document.getElementById('recentActivity');

    try {
        // Load stats
        const stats = await api.getDashboardStats();
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Hosts</div>
                <div class="stat-value">${stats.total_hosts}</div>
                <div class="stat-subvalue">${stats.active_hosts} active, ${stats.inactive_hosts} inactive</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Clients</div>
                <div class="stat-value">${stats.total_clients}</div>
                <div class="stat-subvalue">${stats.active_clients} active, ${stats.inactive_clients} inactive</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Cars</div>
                <div class="stat-value">${stats.total_cars}</div>
                <div class="stat-subvalue">${stats.visible_cars} visible, ${stats.hidden_cars} hidden</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Awaiting Verification</div>
                <div class="stat-value">${stats.cars_awaiting_verification}</div>
                <div class="stat-subvalue">${stats.verified_cars} verified, ${stats.rejected_cars} rejected</div>
            </div>
        `;

        // Create charts
        createUserDistributionChart(stats);
        createVerificationStatusChart(stats);

        // Load recent activity
        console.log('Loading recent activity...');
        const activity = await api.getRecentActivity();
        console.log('Recent activity received:', activity);
        if (activity.activities && activity.activities.length > 0) {
            recentActivity.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activity.activities.map(item => `
                                <tr>
                                    <td>${item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                                    <td>${item.description}</td>
                                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            recentActivity.innerHTML = '<div class="empty-state">No recent activity</div>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        statsGrid.innerHTML = '<div class="empty-state">Error loading statistics</div>';
        recentActivity.innerHTML = '<div class="empty-state">Error loading activity</div>';
    }
}

// Create User Distribution Donut Chart
function createUserDistributionChart(stats) {
    const ctx = document.getElementById('userDistributionChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (userDistributionChart) {
        userDistributionChart.destroy();
    }

    const totalUsers = stats.total_hosts + stats.total_clients;
    
    userDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hosts', 'Clients'],
            datasets: [{
                data: [stats.total_hosts, stats.total_clients],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 8,
                        font: {
                            size: 11,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = totalUsers > 0 ? ((value / totalUsers) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    },
                    padding: 12,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            cutout: '55%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Create Verification Status Trend Area Chart (like screenshot)
function createVerificationStatusChart(stats) {
    const canvas = document.getElementById('verificationStatusChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (verificationStatusChart) {
        verificationStatusChart.destroy();
    }

    const totalProcessed = stats.verified_cars + stats.rejected_cars + stats.cars_awaiting_verification;

    const verifiedPct = totalProcessed > 0 ? (stats.verified_cars / totalProcessed) * 100 : 0;
    const pendingTotal = stats.cars_awaiting_verification + stats.rejected_cars;
    const pendingPct = totalProcessed > 0 ? (pendingTotal / totalProcessed) * 100 : 0;

    // Use 6 months just for a smooth trend‑style look.
    // We repeat the same percentage so the line is flat,
    // but visually it matches the style in the reference.
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const verifiedSeries = labels.map(() => Number(verifiedPct.toFixed(1)));
    const pendingSeries = labels.map(() => Number(pendingPct.toFixed(1)));

    // Gradients for the filled areas
    const verifiedGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    verifiedGradient.addColorStop(0, 'rgba(46, 204, 113, 0.6)');
    verifiedGradient.addColorStop(1, 'rgba(46, 204, 113, 0.05)');

    const pendingGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pendingGradient.addColorStop(0, 'rgba(241, 196, 15, 0.7)');
    pendingGradient.addColorStop(1, 'rgba(241, 196, 15, 0.05)');

    verificationStatusChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Verified',
                    data: verifiedSeries,
                    fill: true,
                    backgroundColor: verifiedGradient,
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                },
                {
                    label: 'Pending',
                    data: pendingSeries,
                    fill: true,
                    backgroundColor: pendingGradient,
                    borderColor: 'rgba(241, 196, 15, 1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 8,
                        font: {
                            size: 11,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            const percentage = totalProcessed > 0 ? ((value / totalProcessed) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    },
                    padding: 12,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.06)',
                        borderDash: [4, 4],
                        drawBorder: false
                    },
                    ticks: {
                        beginAtZero: true,
                        max: 100,
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Host management state
let currentHostSearch = '';
let hostSearchTimeout = null;

// Setup host search (call once on page load)
function setupHostSearch() {
    const searchInput = document.getElementById('hostSearch');
    if (searchInput) {
        searchInput.oninput = (e) => {
            clearTimeout(hostSearchTimeout);
            hostSearchTimeout = setTimeout(() => {
                currentHostSearch = e.target.value;
                loadHosts();
            }, 300);
        };
    }
}

// Load hosts
async function loadHosts() {
    const content = document.getElementById('hostsContent');
    
    // Setup search if not already done
    setupHostSearch();
    
    try {
        const params = { limit: 50 };
        if (currentHostSearch) {
            params.search = currentHostSearch;
        }
        
        const data = await api.getHosts(params);
        if (data.hosts && data.hosts.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Cars</th>
                                <th>Payment Methods</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.hosts.map(host => `
                                <tr>
                                    <td>${host.full_name}</td>
                                    <td>${host.email}</td>
                                    <td><span class="status-badge ${host.is_active ? 'active' : 'inactive'}">${host.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>${host.cars_count || 0}</td>
                                    <td>${host.payment_methods_count || 0}</td>
                                    <td>
                                        <button class="btn btn-primary btn-small" onclick="viewHostDetails(${host.id})">View</button>
                                        ${host.is_active 
                                            ? `<button class="btn btn-secondary btn-small" onclick="deactivateHost(${host.id})">Deactivate</button>`
                                            : `<button class="btn btn-primary btn-small" onclick="activateHost(${host.id})">Activate</button>`
                                        }
                                        <button class="btn btn-danger btn-small" onclick="deleteHostConfirm(${host.id}, '${host.full_name}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No hosts found</div>';
        }
    } catch (error) {
        console.error('Error loading hosts:', error);
        content.innerHTML = '<div class="empty-state">Error loading hosts</div>';
    }
}

// View host details
async function viewHostDetails(hostId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    // Show host detail page
    const hostDetailPage = document.getElementById('hostDetailPage');
    const hostDetailContent = document.getElementById('hostDetailContent');
    const hostDetailTitle = document.getElementById('hostDetailTitle');
    
    hostDetailPage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Host Details';
    hostDetailContent.innerHTML = '<div class="loading">Loading host details...</div>';
    
    try {
        const host = await api.getHost(hostId);
        hostDetailTitle.textContent = host.full_name || 'Host Details';
        
        hostDetailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Basic Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${host.full_name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${host.email || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mobile:</div>
                        <div class="detail-value">${host.mobile_number || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">ID Number:</div>
                        <div class="detail-value">${host.id_number || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${host.is_active ? 'active' : 'inactive'}">
                                ${host.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="host-detail-section">
                    <h3>Statistics</h3>
                    <div class="detail-row">
                        <div class="detail-label">Total Cars:</div>
                        <div class="detail-value">${host.cars_count || 0}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Payment Methods:</div>
                        <div class="detail-value">${host.payment_methods_count || 0}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Feedback Count:</div>
                        <div class="detail-value">${host.feedbacks_count || 0}</div>
                    </div>
                </div>
            </div>
            
            <div class="host-detail-section">
                <h3>Bio</h3>
                <div class="detail-value" style="padding: 12px; background-color: #f9f9f9; border-radius: 4px; min-height: 60px;">
                    ${host.bio || 'No bio provided'}
                </div>
            </div>
            
            <div class="host-detail-section">
                <h3>Account Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Account Created:</div>
                    <div class="detail-value">${new Date(host.created_at).toLocaleString()}</div>
                </div>
                ${host.updated_at ? `
                <div class="detail-row">
                    <div class="detail-label">Last Updated:</div>
                    <div class="detail-value">${new Date(host.updated_at).toLocaleString()}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="action-buttons" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
                ${host.is_active 
                    ? `<button class="btn btn-secondary" onclick="deactivateHost(${host.id}, true)">Deactivate Account</button>`
                    : `<button class="btn btn-primary" onclick="activateHost(${host.id}, true)">Activate Account</button>`
                }
                <button class="btn btn-danger" onclick="deleteHostConfirm(${host.id}, '${host.full_name}', true)">Delete Account</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading host details:', error);
        hostDetailContent.innerHTML = `<div class="empty-state">Error loading host details: ${error.message}</div>`;
    }
}


// Deactivate host
async function deactivateHost(hostId, reloadAfter = false) {
    if (!confirm('Are you sure you want to deactivate this host account?')) {
        return;
    }
    
    try {
        await api.deactivateHost(hostId);
        alert('Host account deactivated successfully');
        if (reloadAfter) {
            // Reload the host details page
            viewHostDetails(hostId);
        } else {
            loadHosts();
        }
    } catch (error) {
        alert('Error deactivating host: ' + error.message);
    }
}

// Activate host
async function activateHost(hostId, reloadAfter = false) {
    if (!confirm('Are you sure you want to activate this host account?')) {
        return;
    }
    
    try {
        await api.activateHost(hostId);
        alert('Host account activated successfully');
        if (reloadAfter) {
            // Reload the host details page
            viewHostDetails(hostId);
        } else {
            loadHosts();
        }
    } catch (error) {
        alert('Error activating host: ' + error.message);
    }
}

// Delete host confirmation
function deleteHostConfirm(hostId, hostName, reloadAfter = false) {
    if (!confirm(`Are you sure you want to permanently delete host "${hostName}"? This action cannot be undone.`)) {
        return;
    }
    
    deleteHost(hostId, reloadAfter);
}

// Delete host
async function deleteHost(hostId, reloadAfter = false) {
    try {
        await api.deleteHost(hostId);
        alert('Host deleted successfully');
        if (reloadAfter) {
            // Go back to hosts list after deletion
            backToHostsList();
        } else {
            loadHosts();
        }
    } catch (error) {
        alert('Error deleting host: ' + error.message);
    }
}

// Load clients
async function loadClients() {
    const content = document.getElementById('clientsContent');
    try {
        const data = await api.getClients({ limit: 50 });
        console.log('Clients data:', data);
        if (data.clients && data.clients.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.clients.map(client => `
                                <tr>
                                    <td>${client.full_name}</td>
                                    <td>${client.email}</td>
                                    <td><span class="status-badge ${client.is_active ? 'active' : 'inactive'}">${client.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <button class="btn btn-primary btn-small" onclick="viewClientDetails(${client.id})">View</button>
                                        ${client.is_active 
                                            ? `<button class="btn btn-secondary btn-small" onclick="deactivateClient(${client.id})">Deactivate</button>`
                                            : `<button class="btn btn-primary btn-small" onclick="activateClient(${client.id})">Activate</button>`
                                        }
                                        <button class="btn btn-danger btn-small" onclick="deleteClientConfirm(${client.id}, '${client.full_name.replace(/'/g, "\\'")}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No clients found</div>';
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        content.innerHTML = '<div class="empty-state">Error loading clients</div>';
    }
}

// View client details
async function viewClientDetails(clientId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    // Show client detail page (reuse host detail page structure or create new)
    const hostDetailPage = document.getElementById('hostDetailPage');
    const hostDetailContent = document.getElementById('hostDetailContent');
    const hostDetailTitle = document.getElementById('hostDetailTitle');
    
    hostDetailPage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Client Details';
    hostDetailContent.innerHTML = '<div class="loading">Loading client details...</div>';
    
    try {
        const client = await api.getClient(clientId);
        hostDetailTitle.textContent = client.full_name || 'Client Details';
        
        hostDetailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Basic Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${client.full_name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${client.email || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mobile Number:</div>
                        <div class="detail-value">${client.mobile_number || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">ID Number:</div>
                        <div class="detail-value">${client.id_number || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${client.is_active ? 'active' : 'inactive'}">
                                ${client.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="host-detail-section">
                    <h3>Additional Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Bio:</div>
                        <div class="detail-value">${client.bio || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Fun Fact:</div>
                        <div class="detail-value">${client.fun_fact || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Created At:</div>
                        <div class="detail-value">${new Date(client.created_at).toLocaleString()}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Last Updated:</div>
                        <div class="detail-value">${client.updated_at ? new Date(client.updated_at).toLocaleString() : 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 24px; display: flex; gap: 12px;">
                ${client.is_active 
                    ? `<button class="btn btn-secondary" onclick="deactivateClient(${client.id}, true)">Deactivate Account</button>`
                    : `<button class="btn btn-primary" onclick="activateClient(${client.id}, true)">Activate Account</button>`
                }
                <button class="btn btn-danger" onclick="deleteClientConfirm(${client.id}, '${client.full_name.replace(/'/g, "\\'")}', true)">Delete Account</button>
                <button class="btn btn-secondary" onclick="backToClientsList()">Back to Clients</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading client details:', error);
        hostDetailContent.innerHTML = `<div class="error-state">Error loading client details: ${error.message}</div>`;
    }
}

// Back to clients list
function backToClientsList() {
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    document.getElementById('clientsContent').parentElement.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Clients';
    loadClients();
}

// Activate client
async function activateClient(clientId, reloadAfter = false) {
    try {
        await api.activateClient(clientId);
        alert('Client account activated successfully');
        if (reloadAfter) {
            viewClientDetails(clientId);
        } else {
            loadClients();
        }
    } catch (error) {
        alert('Error activating client: ' + error.message);
    }
}

// Deactivate client
async function deactivateClient(clientId, reloadAfter = false) {
    if (!confirm('Are you sure you want to deactivate this client account?')) {
        return;
    }
    
    try {
        await api.deactivateClient(clientId);
        alert('Client account deactivated successfully');
        if (reloadAfter) {
            viewClientDetails(clientId);
        } else {
            loadClients();
        }
    } catch (error) {
        alert('Error deactivating client: ' + error.message);
    }
}

// Delete client confirmation
function deleteClientConfirm(clientId, clientName, reloadAfter = false) {
    if (!confirm(`Are you sure you want to permanently delete client "${clientName}"? This action cannot be undone.`)) {
        return;
    }
    
    deleteClient(clientId, reloadAfter);
}

// Delete client
async function deleteClient(clientId, reloadAfter = false) {
    try {
        await api.deleteClient(clientId);
        alert('Client deleted successfully');
        if (reloadAfter) {
            backToClientsList();
        } else {
            loadClients();
        }
    } catch (error) {
        alert('Error deleting client: ' + error.message);
    }
}

// Car management state
let currentCarSearch = '';
let currentCarStatusFilter = '';
let carSearchTimeout = null;

// Setup car search and filter
function setupCarSearch() {
    const searchInput = document.getElementById('carSearch');
    const statusFilter = document.getElementById('carStatusFilter');
    
    if (searchInput && !searchInput.oninput) {
        searchInput.oninput = (e) => {
            clearTimeout(carSearchTimeout);
            carSearchTimeout = setTimeout(() => {
                currentCarSearch = e.target.value;
                loadCars();
            }, 300);
        };
    }
    
    if (statusFilter && !statusFilter.onchange) {
        statusFilter.onchange = (e) => {
            currentCarStatusFilter = e.target.value;
            loadCars();
        };
    }
}

// Load cars
async function loadCars() {
    const content = document.getElementById('carsContent');
    
    // Setup search and filter if not already done
    setupCarSearch();
    
    try {
        const params = { limit: 50 };
        if (currentCarSearch) {
            params.search = currentCarSearch;
        }
        if (currentCarStatusFilter) {
            params.status = currentCarStatusFilter;
        }
        
        const data = await api.getCars(params);
        if (data.cars && data.cars.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Model</th>
                                <th>Year</th>
                                <th>Status</th>
                                <th>Host</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.cars.map(car => `
                                <tr>
                                    <td>${car.name || 'N/A'}</td>
                                    <td>${car.model || 'N/A'}</td>
                                    <td>${car.year || 'N/A'}</td>
                                    <td>
                                        <span class="status-badge ${car.verification_status === 'verified' ? 'active' : car.verification_status === 'denied' ? 'inactive' : ''}">
                                            ${car.verification_status || 'N/A'}
                                        </span>
                                    </td>
                                    <td>${car.host_name || 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-primary btn-small" onclick="viewCarDetails(${car.id})">View</button>
                                        ${car.verification_status === 'awaiting' ? `
                                            <button class="btn btn-primary btn-small" onclick="approveCar(${car.id})">Approve</button>
                                            <button class="btn btn-secondary btn-small" onclick="rejectCarPrompt(${car.id})">Reject</button>
                                        ` : ''}
                                        ${car.is_hidden 
                                            ? `<button class="btn btn-primary btn-small" onclick="showCar(${car.id})">Show</button>`
                                            : `<button class="btn btn-secondary btn-small" onclick="hideCar(${car.id})">Hide</button>`
                                        }
                                        <button class="btn btn-danger btn-small" onclick="deleteCarConfirm(${car.id}, '${car.name || car.model || 'Car'}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No cars found</div>';
        }
    } catch (error) {
        console.error('Error loading cars:', error);
        content.innerHTML = '<div class="empty-state">Error loading cars</div>';
    }
}

// Back to cars list
function backToCarsList() {
    loadPage('cars');
}

// View car details
async function viewCarDetails(carId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    // Show car detail page
    const carDetailPage = document.getElementById('carDetailPage');
    const carDetailContent = document.getElementById('carDetailContent');
    const carDetailTitle = document.getElementById('carDetailTitle');
    
    carDetailPage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Car Details';
    carDetailContent.innerHTML = '<div class="loading">Loading car details...</div>';
    
    try {
        const car = await api.getCar(carId);
        carDetailTitle.textContent = car.name || car.model || 'Car Details';
        
        carDetailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Basic Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${car.name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Model:</div>
                        <div class="detail-value">${car.model || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Year:</div>
                        <div class="detail-value">${car.year || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Body Type:</div>
                        <div class="detail-value">${car.body_type || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Color:</div>
                        <div class="detail-value">${car.color || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${car.verification_status === 'verified' ? 'active' : car.verification_status === 'denied' ? 'inactive' : ''}">
                                ${car.verification_status || 'N/A'}
                            </span>
                        </div>
                    </div>
                    ${car.rejection_reason ? `
                    <div class="detail-row">
                        <div class="detail-label">Rejection Reason:</div>
                        <div class="detail-value" style="color: #d32f2f;">${car.rejection_reason}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="host-detail-section">
                    <h3>Host Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Host Name:</div>
                        <div class="detail-value">${car.host_name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Host Email:</div>
                        <div class="detail-value">${car.host_email || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Specifications</h3>
                    <div class="detail-row">
                        <div class="detail-label">Seats:</div>
                        <div class="detail-value">${car.seats || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Fuel Type:</div>
                        <div class="detail-value">${car.fuel_type || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Transmission:</div>
                        <div class="detail-value">${car.transmission || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mileage:</div>
                        <div class="detail-value">${car.mileage ? car.mileage.toLocaleString() + ' km' : 'N/A'}</div>
                    </div>
                    ${car.features && car.features.length > 0 ? `
                    <div class="detail-row">
                        <div class="detail-label">Features:</div>
                        <div class="detail-value">${car.features.join(', ')}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="host-detail-section">
                    <h3>Pricing</h3>
                    <div class="detail-row">
                        <div class="detail-label">Daily Rate:</div>
                        <div class="detail-value">${car.daily_rate ? 'ksh ' + car.daily_rate.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Weekly Rate:</div>
                        <div class="detail-value">${car.weekly_rate ? 'ksh ' + car.weekly_rate.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Monthly Rate:</div>
                        <div class="detail-value">${car.monthly_rate ? 'ksh ' + car.monthly_rate.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Min Rental Days:</div>
                        <div class="detail-value">${car.min_rental_days || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Max Rental Days:</div>
                        <div class="detail-value">${car.max_rental_days || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Min Age:</div>
                        <div class="detail-value">${car.min_age_requirement ? car.min_age_requirement + ' years' : 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="host-detail-section">
                <h3>Description</h3>
                <div class="detail-value" style="padding: 12px; background-color: #f9f9f9; border-radius: 4px; min-height: 60px;">
                    ${car.description || 'No description provided'}
                </div>
            </div>
            
            ${car.rules ? `
            <div class="host-detail-section">
                <h3>Rules</h3>
                <div class="detail-value" style="padding: 12px; background-color: #f9f9f9; border-radius: 4px; min-height: 60px;">
                    ${car.rules}
                </div>
            </div>
            ` : ''}
            
            ${car.location_name ? `
            <div class="host-detail-section">
                <h3>Location</h3>
                <div class="detail-row">
                    <div class="detail-label">Location:</div>
                    <div class="detail-value">${car.location_name}</div>
                </div>
                ${car.latitude && car.longitude ? `
                <div class="detail-row">
                    <div class="detail-label">Coordinates:</div>
                    <div class="detail-value">${car.latitude}, ${car.longitude}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="host-detail-section">
                <h3>Account Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Listing Created:</div>
                    <div class="detail-value">${new Date(car.created_at).toLocaleString()}</div>
                </div>
                ${car.updated_at ? `
                <div class="detail-row">
                    <div class="detail-label">Last Updated:</div>
                    <div class="detail-value">${new Date(car.updated_at).toLocaleString()}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Complete:</div>
                    <div class="detail-value">${car.is_complete ? 'Yes' : 'No'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Hidden:</div>
                    <div class="detail-value">${car.is_hidden ? 'Yes' : 'No'}</div>
                </div>
            </div>
            
            <div class="action-buttons" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
                ${car.verification_status === 'awaiting' ? `
                    <button class="btn btn-primary" onclick="approveCar(${car.id}, true)">Approve</button>
                    <button class="btn btn-secondary" onclick="rejectCarPrompt(${car.id}, true)">Reject</button>
                ` : car.verification_status === 'denied' ? `
                    <button class="btn btn-primary" onclick="approveCar(${car.id}, true)">Approve</button>
                ` : ''}
                ${car.is_hidden 
                    ? `<button class="btn btn-primary" onclick="showCar(${car.id}, true)">Show Car</button>`
                    : `<button class="btn btn-secondary" onclick="hideCar(${car.id}, true)">Hide Car</button>`
                }
                <button class="btn btn-danger" onclick="deleteCarConfirm(${car.id}, '${car.name || car.model || 'Car'}', true)">Delete Car</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading car details:', error);
        carDetailContent.innerHTML = `<div class="empty-state">Error loading car details: ${error.message}</div>`;
    }
}

// Approve car
async function approveCar(carId, reloadAfter = false) {
    if (!confirm('Are you sure you want to approve this car listing?')) {
        return;
    }
    
    try {
        await api.approveCar(carId);
        alert('Car approved successfully');
        if (reloadAfter) {
            viewCarDetails(carId);
        } else {
            loadCars();
        }
    } catch (error) {
        alert('Error approving car: ' + error.message);
    }
}

// Reject car prompt
function rejectCarPrompt(carId, reloadAfter = false) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason && reason.trim()) {
        rejectCar(carId, reason.trim(), reloadAfter);
    } else if (reason !== null) {
        alert('Rejection reason is required');
    }
}

// Reject car
async function rejectCar(carId, rejectionReason, reloadAfter = false) {
    try {
        await api.rejectCar(carId, rejectionReason);
        alert('Car rejected successfully');
        if (reloadAfter) {
            viewCarDetails(carId);
        } else {
            loadCars();
        }
    } catch (error) {
        alert('Error rejecting car: ' + error.message);
    }
}

// Hide car
async function hideCar(carId, reloadAfter = false) {
    if (!confirm('Are you sure you want to hide this car from public listing?')) {
        return;
    }
    
    try {
        await api.hideCar(carId);
        alert('Car hidden successfully');
        if (reloadAfter) {
            viewCarDetails(carId);
        } else {
            loadCars();
        }
    } catch (error) {
        alert('Error hiding car: ' + error.message);
    }
}

// Show car
async function showCar(carId, reloadAfter = false) {
    try {
        await api.showCar(carId);
        alert('Car shown successfully');
        if (reloadAfter) {
            viewCarDetails(carId);
        } else {
            loadCars();
        }
    } catch (error) {
        alert('Error showing car: ' + error.message);
    }
}

// Delete car confirmation
function deleteCarConfirm(carId, carName, reloadAfter = false) {
    if (!confirm(`Are you sure you want to permanently delete car "${carName}"? This action cannot be undone.`)) {
        return;
    }
    
    deleteCar(carId, reloadAfter);
}

// Delete car
async function deleteCar(carId, reloadAfter = false) {
    try {
        await api.deleteCar(carId);
        alert('Car deleted successfully');
        if (reloadAfter) {
            backToCarsList();
        } else {
            loadCars();
        }
    } catch (error) {
        alert('Error deleting car: ' + error.message);
    }
}

// Toggle host selection dropdown visibility
function toggleHostSelection() {
    const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
    const hostSelectionGroup = document.getElementById('hostSelectionGroup');
    const hostSelect = document.getElementById('notificationHostSelect');
    
    if (recipientType === 'specific') {
        hostSelectionGroup.style.display = 'block';
        if (hostSelect.options.length <= 1) {
            loadHostsForNotifications();
        }
    } else {
        hostSelectionGroup.style.display = 'none';
        hostSelect.value = '';
    }
}

// Load hosts for notification dropdown
async function loadHostsForNotifications() {
    const hostSelect = document.getElementById('notificationHostSelect');
    if (!hostSelect) return;
    
    try {
        hostSelect.innerHTML = '<option value="">Loading hosts...</option>';
        const data = await api.getHosts({ limit: 100 });
        
        if (data.hosts && data.hosts.length > 0) {
            // Filter to only active hosts
            const activeHosts = data.hosts.filter(host => host.is_active === true);
            
            if (activeHosts.length > 0) {
                hostSelect.innerHTML = '<option value="">Select a host...</option>';
                activeHosts.forEach(host => {
                    const option = document.createElement('option');
                    option.value = host.id;
                    option.textContent = `${host.full_name} (${host.email})`;
                    hostSelect.appendChild(option);
                });
            } else {
                hostSelect.innerHTML = '<option value="">No active hosts found</option>';
            }
        } else {
            hostSelect.innerHTML = '<option value="">No hosts found</option>';
        }
    } catch (error) {
        console.error('Error loading hosts:', error);
        hostSelect.innerHTML = '<option value="">Error loading hosts</option>';
    }
}

// Send notification
async function sendNotification(event) {
    event.preventDefault();
    
    const form = document.getElementById('notificationForm');
    const resultDiv = document.getElementById('notificationResult');
    const sendBtn = document.getElementById('sendNotificationBtn');
    
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    const recipientType = document.querySelector('input[name="recipientType"]:checked').value;
    
    if (!title || !message) {
        resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Please fill in all required fields.</div>';
        return;
    }
    
    // Disable button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    resultDiv.innerHTML = '';
    
    try {
        const notificationData = {
            title: title,
            message: message,
            type: type
        };
        
        console.log('Sending notification:', notificationData);
        console.log('Recipient type:', recipientType);
        
        let response;
        if (recipientType === 'all') {
            response = await api.broadcastToHosts(notificationData);
            console.log('Notification response:', response);
        } else if (recipientType === 'specific') {
            const hostId = document.getElementById('notificationHostSelect').value;
            if (!hostId) {
                resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Please select a host.</div>';
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Notification';
                return;
            }
            
            const specificNotificationData = {
                user_type: 'host',
                user_id: parseInt(hostId),
                title: title,
                message: message,
                type: type
            };
            
            response = await api.sendToUser(specificNotificationData);
            console.log('Notification response:', response);
        } else {
            resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Invalid recipient type selected.</div>';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Notification';
            return;
        }
        
        // Show success message with details
        if (response.sent_count && response.sent_count > 0) {
            const recipientInfo = recipientType === 'specific' && response.user_id 
                ? ` (Host ID: ${response.user_id})`
                : ` (${response.sent_count} recipient(s))`;
            resultDiv.innerHTML = `
                <div style="color: #2e7d32; padding: 12px; background-color: #e8f5e9; border-radius: 4px; margin-bottom: 12px;">
                    <strong>Success!</strong> ${response.message}${recipientInfo}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: #f57c00; padding: 12px; background-color: #fff3e0; border-radius: 4px; margin-bottom: 12px;">
                    <strong>Warning:</strong> ${response.message || 'No active recipients found. Notification not sent.'}
                </div>
            `;
        }
        
        // Reset form
        form.reset();
        document.getElementById('notificationType').value = 'info';
        document.querySelector('input[name="recipientType"][value="all"]').checked = true;
        document.getElementById('notificationHostSelect').value = '';
        toggleHostSelection();
        
    } catch (error) {
        console.error('Error sending notification:', error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Notification';
    }
}

// Switch notification tab
function switchNotificationTab(tab) {
    const hostTab = document.getElementById('hostNotificationTab');
    const clientTab = document.getElementById('clientNotificationTab');
    const hostForm = document.getElementById('hostNotificationForm');
    const clientForm = document.getElementById('clientNotificationForm');
    
    if (tab === 'host') {
        hostTab.style.borderBottomColor = '#3498db';
        hostTab.style.color = '#3498db';
        hostTab.style.fontWeight = '600';
        clientTab.style.borderBottomColor = 'transparent';
        clientTab.style.color = '#65676b';
        clientTab.style.fontWeight = '500';
        hostForm.style.display = 'block';
        clientForm.style.display = 'none';
    } else {
        clientTab.style.borderBottomColor = '#3498db';
        clientTab.style.color = '#3498db';
        clientTab.style.fontWeight = '600';
        hostTab.style.borderBottomColor = 'transparent';
        hostTab.style.color = '#65676b';
        hostTab.style.fontWeight = '500';
        hostForm.style.display = 'none';
        clientForm.style.display = 'block';
        loadClientsForNotifications();
    }
}

// Toggle client selection
function toggleClientSelection() {
    const clientSelectionGroup = document.getElementById('clientSelectionGroup');
    const clientSelect = document.getElementById('notificationClientSelect');
    const recipientType = document.querySelector('input[name="clientRecipientType"]:checked').value;
    
    if (recipientType === 'specific') {
        clientSelectionGroup.style.display = 'block';
        if (clientSelect.options.length <= 1) {
            loadClientsForNotifications();
        }
    } else {
        clientSelectionGroup.style.display = 'none';
        clientSelect.value = '';
    }
}

// Load clients for notification dropdown
async function loadClientsForNotifications() {
    const clientSelect = document.getElementById('notificationClientSelect');
    if (!clientSelect) return;
    
    try {
        clientSelect.innerHTML = '<option value="">Loading clients...</option>';
        const data = await api.getClients({ limit: 100 });
        
        if (data.clients && data.clients.length > 0) {
            // Filter to only active clients
            const activeClients = data.clients.filter(client => client.is_active === true);
            
            if (activeClients.length > 0) {
                clientSelect.innerHTML = '<option value="">Select a client...</option>';
                activeClients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = `${client.full_name} (${client.email})`;
                    clientSelect.appendChild(option);
                });
            } else {
                clientSelect.innerHTML = '<option value="">No active clients found</option>';
            }
        } else {
            clientSelect.innerHTML = '<option value="">No clients found</option>';
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        clientSelect.innerHTML = '<option value="">Error loading clients</option>';
    }
}

// Send client notification
async function sendClientNotification(event) {
    event.preventDefault();
    
    const form = document.getElementById('clientNotificationForm');
    const resultDiv = document.getElementById('clientNotificationResult');
    const sendBtn = document.getElementById('sendClientNotificationBtn');
    
    const title = document.getElementById('clientNotificationTitle').value.trim();
    const message = document.getElementById('clientNotificationMessage').value.trim();
    const type = document.getElementById('clientNotificationType').value;
    const recipientType = document.querySelector('input[name="clientRecipientType"]:checked').value;
    
    if (!title || !message) {
        resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Please fill in all required fields.</div>';
        return;
    }
    
    // Disable button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    resultDiv.innerHTML = '';
    
    try {
        const notificationData = {
            title: title,
            message: message,
            type: type
        };
        
        console.log('Sending client notification:', notificationData);
        console.log('Recipient type:', recipientType);
        
        let response;
        if (recipientType === 'all') {
            response = await api.broadcastToClients(notificationData);
            console.log('Notification response:', response);
        } else if (recipientType === 'specific') {
            const clientId = document.getElementById('notificationClientSelect').value;
            if (!clientId) {
                resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Please select a client.</div>';
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Notification';
                return;
            }
            
            const specificNotificationData = {
                user_type: 'client',
                user_id: parseInt(clientId),
                title: title,
                message: message,
                type: type
            };
            
            response = await api.sendToUser(specificNotificationData);
            console.log('Notification response:', response);
        } else {
            resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Invalid recipient type selected.</div>';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Notification';
            return;
        }
        
        // Show success message with details
        // If we got here, the API call was successful (200 status)
        const sentCount = response.sent_count || 0;
        if (sentCount > 0) {
            const recipientInfo = recipientType === 'specific' && response.user_id 
                ? ` (Client ID: ${response.user_id})`
                : ` (${sentCount} recipient(s))`;
            resultDiv.innerHTML = `
                <div style="color: #2e7d32; padding: 12px; background-color: #e8f5e9; border-radius: 4px; margin-bottom: 12px;">
                    <strong>Success!</strong> ${response.message || 'Notification sent successfully'}${recipientInfo}
                </div>
            `;
        } else {
            // Even if sent_count is 0, if API returned 200, show the message from API
            resultDiv.innerHTML = `
                <div style="color: #f57c00; padding: 12px; background-color: #fff3e0; border-radius: 4px; margin-bottom: 12px;">
                    <strong>Info:</strong> ${response.message || 'No active recipients found. Notification not sent.'}
                </div>
            `;
        }
        
        // Reset form
        form.reset();
        document.getElementById('clientNotificationType').value = 'info';
        document.querySelector('input[name="clientRecipientType"][value="all"]').checked = true;
        document.getElementById('notificationClientSelect').value = '';
        toggleClientSelection();
        
    } catch (error) {
        console.error('Error sending client notification:', error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Notification';
    }
}

// Load feedback
async function loadFeedback() {
    const content = document.getElementById('feedbackContent');
    try {
        const data = await api.getFeedback({ limit: 50 });
        if (data.feedbacks && data.feedbacks.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Content</th>
                                <th>Host</th>
                                <th>Flagged</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.feedbacks.map(feedback => `
                                <tr>
                                    <td>${feedback.content ? feedback.content.substring(0, 50) + (feedback.content.length > 50 ? '...' : '') : 'N/A'}</td>
                                    <td>${feedback.host_name || 'N/A'}</td>
                                    <td>${feedback.is_flagged ? 'Yes' : 'No'}</td>
                                    <td>${new Date(feedback.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No feedback found</div>';
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        content.innerHTML = '<div class="empty-state">Error loading feedback</div>';
    }
}

// ==================== ADMIN MANAGEMENT ====================

// Admin management state
let currentAdminSearch = '';
let currentAdminRoleFilter = '';
let currentAdminStatusFilter = '';
let adminSearchTimeout = null;

// Setup admin search and filters
function setupAdminSearch() {
    const searchInput = document.getElementById('adminSearch');
    const roleFilter = document.getElementById('adminRoleFilter');
    const statusFilter = document.getElementById('adminStatusFilter');
    
    if (searchInput && !searchInput.oninput) {
        searchInput.oninput = (e) => {
            clearTimeout(adminSearchTimeout);
            adminSearchTimeout = setTimeout(() => {
                currentAdminSearch = e.target.value;
                loadAdmins();
            }, 300);
        };
    }
    
    if (roleFilter && !roleFilter.onchange) {
        roleFilter.onchange = (e) => {
            currentAdminRoleFilter = e.target.value;
            loadAdmins();
        };
    }
    
    if (statusFilter && !statusFilter.onchange) {
        statusFilter.onchange = (e) => {
            currentAdminStatusFilter = e.target.value;
            loadAdmins();
        };
    }
}

// Load admins
async function loadAdmins() {
    const content = document.getElementById('adminsContent');
    
    setupAdminSearch();
    
    try {
        const params = { limit: 50 };
        if (currentAdminSearch) {
            params.search = currentAdminSearch;
        }
        if (currentAdminRoleFilter) {
            params.role = currentAdminRoleFilter;
        }
        if (currentAdminStatusFilter) {
            params.is_active = currentAdminStatusFilter === 'true';
        }
        
        const data = await api.getAdmins(params);
        if (data.admins && data.admins.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.admins.map(admin => `
                                <tr>
                                    <td>${admin.full_name}</td>
                                    <td>${admin.email}</td>
                                    <td>${admin.role}</td>
                                    <td><span class="status-badge ${admin.is_active ? 'active' : 'inactive'}">${admin.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>${new Date(admin.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-primary btn-small" onclick="viewAdminDetails(${admin.id})">View</button>
                                        ${admin.is_active 
                                            ? `<button class="btn btn-secondary btn-small" onclick="deactivateAdmin(${admin.id})">Deactivate</button>`
                                            : `<button class="btn btn-primary btn-small" onclick="activateAdmin(${admin.id})">Activate</button>`
                                        }
                                        <button class="btn btn-danger btn-small" onclick="deleteAdminConfirm(${admin.id}, '${admin.full_name}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No admins found</div>';
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        if (error.message.includes('super_admin')) {
            content.innerHTML = '<div class="empty-state">Only super admins can access this page</div>';
        } else {
            content.innerHTML = '<div class="empty-state">Error loading admins</div>';
        }
    }
}

// Back to admins list
function backToAdminsList() {
    loadPage('admins');
}

// View admin details
async function viewAdminDetails(adminId) {
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    const adminDetailPage = document.getElementById('adminDetailPage');
    const adminDetailContent = document.getElementById('adminDetailContent');
    const adminDetailTitle = document.getElementById('adminDetailTitle');
    
    adminDetailPage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Admin Details';
    adminDetailContent.innerHTML = '<div class="loading">Loading admin details...</div>';
    
    try {
        const admin = await api.getAdmin(adminId);
        adminDetailTitle.textContent = admin.full_name || 'Admin Details';
        
        adminDetailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Basic Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${admin.full_name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${admin.email || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Role:</div>
                        <div class="detail-value">${admin.role || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${admin.is_active ? 'active' : 'inactive'}">
                                ${admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="host-detail-section">
                    <h3>Account Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Created:</div>
                        <div class="detail-value">${new Date(admin.created_at).toLocaleString()}</div>
                    </div>
                    ${admin.updated_at ? `
                    <div class="detail-row">
                        <div class="detail-label">Last Updated:</div>
                        <div class="detail-value">${new Date(admin.updated_at).toLocaleString()}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="action-buttons" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
                <button class="btn btn-primary" onclick="showEditAdminForm(${admin.id})">Edit Admin</button>
                <button class="btn btn-secondary" onclick="showChangeAdminPasswordModal(${admin.id})">Change Password</button>
                ${admin.is_active 
                    ? `<button class="btn btn-secondary" onclick="deactivateAdmin(${admin.id}, true)">Deactivate</button>`
                    : `<button class="btn btn-primary" onclick="activateAdmin(${admin.id}, true)">Activate</button>`
                }
                <button class="btn btn-danger" onclick="deleteAdminConfirm(${admin.id}, '${admin.full_name}', true)">Delete</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin details:', error);
        adminDetailContent.innerHTML = `<div class="empty-state">Error loading admin details: ${error.message}</div>`;
    }
}

// Show create admin form
function showCreateAdminForm() {
    document.getElementById('adminModalTitle').textContent = 'Create Admin';
    document.getElementById('adminFormId').value = '';
    document.getElementById('adminForm').reset();
    document.getElementById('adminPasswordFields').style.display = 'block';
    document.getElementById('adminPassword').required = true;
    document.getElementById('adminPasswordConfirm').required = true;
    document.getElementById('adminRole').value = 'admin';
    document.getElementById('adminIsActive').checked = true;
    document.getElementById('adminFormError').textContent = '';
    document.getElementById('adminModal').style.display = 'flex';
}

// Show edit admin form
async function showEditAdminForm(adminId) {
    try {
        const admin = await api.getAdmin(adminId);
        document.getElementById('adminModalTitle').textContent = 'Edit Admin';
        document.getElementById('adminFormId').value = adminId;
        document.getElementById('adminFullName').value = admin.full_name || '';
        document.getElementById('adminEmail').value = admin.email || '';
        document.getElementById('adminPasswordFields').style.display = 'none';
        document.getElementById('adminPassword').required = false;
        document.getElementById('adminPasswordConfirm').required = false;
        document.getElementById('adminRole').value = admin.role || 'admin';
        document.getElementById('adminIsActive').checked = admin.is_active;
        document.getElementById('adminFormError').textContent = '';
        document.getElementById('adminModal').style.display = 'flex';
    } catch (error) {
        alert('Error loading admin: ' + error.message);
    }
}

// Save admin (create or update)
async function saveAdmin(event) {
    event.preventDefault();
    
    const adminId = document.getElementById('adminFormId').value;
    const errorDiv = document.getElementById('adminFormError');
    const saveBtn = document.getElementById('saveAdminBtn');
    
    const fullName = document.getElementById('adminFullName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const passwordConfirm = document.getElementById('adminPasswordConfirm').value;
    const role = document.getElementById('adminRole').value;
    const isActive = document.getElementById('adminIsActive').checked;
    
    errorDiv.textContent = '';
    
    // Validation
    if (!fullName || !email) {
        errorDiv.textContent = 'Please fill in all required fields.';
        return;
    }
    
    if (!adminId && (!password || password.length < 8)) {
        errorDiv.textContent = 'Password must be at least 8 characters.';
        return;
    }
    
    if (!adminId && password !== passwordConfirm) {
        errorDiv.textContent = 'Passwords do not match.';
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
        if (adminId) {
            // Update admin
            const updateData = {
                full_name: fullName,
                email: email,
                role: role,
                is_active: isActive
            };
            await api.updateAdmin(adminId, updateData);
            alert('Admin updated successfully');
            closeAdminModal();
            viewAdminDetails(adminId);
        } else {
            // Create admin
            const createData = {
                full_name: fullName,
                email: email,
                password: password,
                password_confirmation: passwordConfirm,
                role: role,
                is_active: isActive
            };
            await api.createAdmin(createData);
            alert('Admin created successfully');
            closeAdminModal();
            loadAdmins();
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Error saving admin';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Close admin modal
function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

// Deactivate admin
async function deactivateAdmin(adminId, reloadAfter = false) {
    if (!confirm('Are you sure you want to deactivate this admin account?')) {
        return;
    }
    
    try {
        await api.deactivateAdmin(adminId);
        alert('Admin deactivated successfully');
        if (reloadAfter) {
            viewAdminDetails(adminId);
        } else {
            loadAdmins();
        }
    } catch (error) {
        alert('Error deactivating admin: ' + error.message);
    }
}

// Activate admin
async function activateAdmin(adminId, reloadAfter = false) {
    if (!confirm('Are you sure you want to activate this admin account?')) {
        return;
    }
    
    try {
        await api.activateAdmin(adminId);
        alert('Admin activated successfully');
        if (reloadAfter) {
            viewAdminDetails(adminId);
        } else {
            loadAdmins();
        }
    } catch (error) {
        alert('Error activating admin: ' + error.message);
    }
}

// Delete admin confirmation
function deleteAdminConfirm(adminId, adminName, reloadAfter = false) {
    if (!confirm(`Are you sure you want to permanently delete admin "${adminName}"? This action cannot be undone.`)) {
        return;
    }
    
    deleteAdmin(adminId, reloadAfter);
}

// Delete admin
async function deleteAdmin(adminId, reloadAfter = false) {
    try {
        await api.deleteAdmin(adminId);
        alert('Admin deleted successfully');
        if (reloadAfter) {
            backToAdminsList();
        } else {
            loadAdmins();
        }
    } catch (error) {
        alert('Error deleting admin: ' + error.message);
    }
}

// Show change admin password modal
function showChangeAdminPasswordModal(adminId) {
    document.getElementById('passwordModalTitle').textContent = 'Change Admin Password';
    document.getElementById('passwordFormType').value = 'admin';
    document.getElementById('passwordFormAdminId').value = adminId;
    document.getElementById('currentPasswordField').style.display = 'none';
    document.getElementById('currentPassword').required = false;
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordFormError').textContent = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

// Show change own password modal
function showChangeOwnPasswordModal() {
    document.getElementById('passwordModalTitle').textContent = 'Change My Password';
    document.getElementById('passwordFormType').value = 'own';
    document.getElementById('passwordFormAdminId').value = '';
    document.getElementById('currentPasswordField').style.display = 'block';
    document.getElementById('currentPassword').required = true;
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordFormError').textContent = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

// Save password
async function savePassword(event) {
    event.preventDefault();
    
    const formType = document.getElementById('passwordFormType').value;
    const adminId = document.getElementById('passwordFormAdminId').value;
    const errorDiv = document.getElementById('passwordFormError');
    const saveBtn = document.getElementById('savePasswordBtn');
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;
    
    errorDiv.textContent = '';
    
    // Validation
    if (formType === 'own' && !currentPassword) {
        errorDiv.textContent = 'Please enter your current password.';
        return;
    }
    
    if (!newPassword || newPassword.length < 8) {
        errorDiv.textContent = 'New password must be at least 8 characters.';
        return;
    }
    
    if (newPassword !== newPasswordConfirm) {
        errorDiv.textContent = 'New passwords do not match.';
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Changing...';
    
    try {
        if (formType === 'own') {
            const data = {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirm
            };
            await api.changeOwnPassword(data);
            alert('Password changed successfully');
            closePasswordModal();
        } else {
            const data = {
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirm
            };
            await api.changeAdminPassword(adminId, data);
            alert('Admin password changed successfully');
            closePasswordModal();
            viewAdminDetails(adminId);
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Error changing password';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Change Password';
    }
}

// Close password modal
function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

// Load my profile
async function loadMyProfile() {
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    const myProfilePage = document.getElementById('myProfilePage');
    const myProfileContent = document.getElementById('myProfileContent');
    
    myProfilePage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'My Profile';
    myProfileContent.innerHTML = '<div class="loading">Loading profile...</div>';
    
    try {
        const admin = await api.getCurrentAdmin();
        
        myProfileContent.innerHTML = `
            <div style="max-width: 600px;">
                <div class="host-detail-section">
                    <h3>Profile Information</h3>
                    <form id="myProfileForm" onsubmit="saveMyProfile(event)">
                        <div class="form-group">
                            <label for="myProfileFullName">Full Name *</label>
                            <input type="text" id="myProfileFullName" value="${admin.full_name || ''}" required maxlength="255">
                        </div>
                        <div class="form-group">
                            <label for="myProfileEmail">Email *</label>
                            <input type="email" id="myProfileEmail" value="${admin.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <div class="detail-value" style="padding: 10px 0;">${admin.role || 'N/A'}</div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <div style="padding: 10px 0;">
                                <span class="status-badge ${admin.is_active ? 'active' : 'inactive'}">
                                    ${admin.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <div id="myProfileError" style="color: #d32f2f; margin-bottom: 15px;"></div>
                        <div class="action-buttons">
                            <button type="submit" class="btn btn-primary">Update Profile</button>
                            <button type="button" class="btn btn-secondary" onclick="showChangeOwnPasswordModal()">Change Password</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading profile:', error);
        myProfileContent.innerHTML = `<div class="empty-state">Error loading profile: ${error.message}</div>`;
    }
}

// Save my profile
async function saveMyProfile(event) {
    event.preventDefault();
    
    const errorDiv = document.getElementById('myProfileError');
    const saveBtn = event.target.querySelector('button[type="submit"]');
    
    const fullName = document.getElementById('myProfileFullName').value.trim();
    const email = document.getElementById('myProfileEmail').value.trim();
    
    if (!fullName || !email) {
        errorDiv.textContent = 'Please fill in all required fields.';
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Updating...';
    errorDiv.textContent = '';
    
    try {
        await api.updateOwnProfile({
            full_name: fullName,
            email: email
        });
        alert('Profile updated successfully');
        await loadAdminInfo();
        loadMyProfile();
    } catch (error) {
        errorDiv.textContent = error.message || 'Error updating profile';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Profile';
    }
}

// Setup modal close on outside click
document.addEventListener('DOMContentLoaded', () => {
    const adminModal = document.getElementById('adminModal');
    const passwordModal = document.getElementById('passwordModal');
    
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                closeAdminModal();
            }
        });
    }
    
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                closePasswordModal();
            }
        });
    }
});

// ==================== PAYMENT METHODS MANAGEMENT ====================

// Payment method management state
let currentPaymentMethodSearch = '';
let currentPaymentMethodTypeFilter = '';
let currentPaymentMethodHostFilter = '';
let paymentMethodSearchTimeout = null;

// Setup payment method search and filters
function setupPaymentMethodSearch() {
    const searchInput = document.getElementById('paymentMethodSearch');
    const typeFilter = document.getElementById('paymentMethodTypeFilter');
    const hostFilter = document.getElementById('paymentMethodHostFilter');
    
    if (searchInput && !searchInput.oninput) {
        searchInput.oninput = (e) => {
            clearTimeout(paymentMethodSearchTimeout);
            paymentMethodSearchTimeout = setTimeout(() => {
                currentPaymentMethodSearch = e.target.value;
                loadPaymentMethods();
            }, 300);
        };
    }
    
    if (typeFilter && !typeFilter.onchange) {
        typeFilter.onchange = (e) => {
            currentPaymentMethodTypeFilter = e.target.value;
            loadPaymentMethods();
        };
    }
    
    if (hostFilter && !hostFilter.oninput) {
        hostFilter.oninput = (e) => {
            clearTimeout(paymentMethodSearchTimeout);
            paymentMethodSearchTimeout = setTimeout(() => {
                currentPaymentMethodHostFilter = e.target.value;
                loadPaymentMethods();
            }, 300);
        };
    }
}

// Load payment methods
async function loadPaymentMethods() {
    const content = document.getElementById('paymentMethodsContent');
    
    setupPaymentMethodSearch();
    
    try {
        const params = { limit: 50 };
        if (currentPaymentMethodSearch) {
            params.search = currentPaymentMethodSearch;
        }
        if (currentPaymentMethodTypeFilter) {
            params.method_type = currentPaymentMethodTypeFilter;
        }
        if (currentPaymentMethodHostFilter) {
            params.host_id = parseInt(currentPaymentMethodHostFilter);
        }
        
        const data = await api.getPaymentMethods(params);
        if (data.payment_methods && data.payment_methods.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Host</th>
                                <th>Details</th>
                                <th>Default</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.payment_methods.map(pm => `
                                <tr>
                                    <td>${pm.name || 'N/A'}</td>
                                    <td>${pm.method_type || 'N/A'}</td>
                                    <td>
                                        <div>${pm.host_name || 'N/A'}</div>
                                        <div style="font-size: 12px; color: #666;">${pm.host_email || ''}</div>
                                    </td>
                                    <td>
                                        ${pm.method_type === 'mpesa' 
                                            ? `<div>${pm.mpesa_number || 'N/A'}</div>`
                                            : pm.method_type === 'visa' || pm.method_type === 'mastercard'
                                            ? `<div>****${pm.card_last_four || '****'}</div>
                                               <div style="font-size: 12px; color: #666;">${pm.expiry_date || 'N/A'}</div>`
                                            : 'N/A'
                                        }
                                    </td>
                                    <td>${pm.is_default ? '<span class="status-badge active">Yes</span>' : '<span class="status-badge inactive">No</span>'}</td>
                                    <td>${new Date(pm.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-primary btn-small" onclick="viewPaymentMethodDetails(${pm.id})">View</button>
                                        <button class="btn btn-danger btn-small" onclick="deletePaymentMethodConfirm(${pm.id}, '${pm.name}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="empty-state">No payment methods found</div>';
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
        content.innerHTML = '<div class="empty-state">Error loading payment methods</div>';
    }
}

// Back to payment methods list
function backToPaymentMethodsList() {
    loadPage('payment-methods');
}

// View payment method details
async function viewPaymentMethodDetails(paymentMethodId) {
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });
    
    const paymentMethodDetailPage = document.getElementById('paymentMethodDetailPage');
    const paymentMethodDetailContent = document.getElementById('paymentMethodDetailContent');
    const paymentMethodDetailTitle = document.getElementById('paymentMethodDetailTitle');
    
    paymentMethodDetailPage.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Payment Method Details';
    paymentMethodDetailContent.innerHTML = '<div class="loading">Loading payment method details...</div>';
    
    try {
        const pm = await api.getPaymentMethod(paymentMethodId);
        paymentMethodDetailTitle.textContent = pm.name || 'Payment Method Details';
        
        paymentMethodDetailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="host-detail-section">
                    <h3>Payment Method Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${pm.name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Type:</div>
                        <div class="detail-value">${pm.method_type || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Default:</div>
                        <div class="detail-value">
                            <span class="status-badge ${pm.is_default ? 'active' : 'inactive'}">
                                ${pm.is_default ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                    ${pm.method_type === 'mpesa' ? `
                    <div class="detail-row">
                        <div class="detail-label">M-Pesa Number:</div>
                        <div class="detail-value">${pm.mpesa_number || 'N/A'}</div>
                    </div>
                    ` : ''}
                    ${pm.method_type === 'visa' || pm.method_type === 'mastercard' ? `
                    <div class="detail-row">
                        <div class="detail-label">Card Number:</div>
                        <div class="detail-value">****${pm.card_last_four || '****'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Card Type:</div>
                        <div class="detail-value">${pm.card_type || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Expiry Date:</div>
                        <div class="detail-value">${pm.expiry_date || 'N/A'}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="host-detail-section">
                    <h3>Host Information</h3>
                    <div class="detail-row">
                        <div class="detail-label">Host Name:</div>
                        <div class="detail-value">${pm.host_name || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Host Email:</div>
                        <div class="detail-value">${pm.host_email || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Host ID:</div>
                        <div class="detail-value">${pm.host_id || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="host-detail-section">
                <h3>Account Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Created:</div>
                    <div class="detail-value">${new Date(pm.created_at).toLocaleString()}</div>
                </div>
                ${pm.updated_at ? `
                <div class="detail-row">
                    <div class="detail-label">Last Updated:</div>
                    <div class="detail-value">${new Date(pm.updated_at).toLocaleString()}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="action-buttons" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
                <button class="btn btn-danger" onclick="deletePaymentMethodConfirm(${pm.id}, '${pm.name}', true)">Delete Payment Method</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading payment method details:', error);
        paymentMethodDetailContent.innerHTML = `<div class="empty-state">Error loading payment method details: ${error.message}</div>`;
    }
}

// Delete payment method confirmation
function deletePaymentMethodConfirm(paymentMethodId, paymentMethodName, reloadAfter = false) {
    if (!confirm(`Are you sure you want to permanently delete payment method "${paymentMethodName}"? This action cannot be undone.`)) {
        return;
    }
    
    deletePaymentMethod(paymentMethodId, reloadAfter);
}

// Delete payment method
async function deletePaymentMethod(paymentMethodId, reloadAfter = false) {
    try {
        await api.deletePaymentMethod(paymentMethodId);
        alert('Payment method deleted successfully');
        if (reloadAfter) {
            backToPaymentMethodsList();
        } else {
            loadPaymentMethods();
        }
    } catch (error) {
        alert('Error deleting payment method: ' + error.message);
    }
}

// ==================== Support Conversations ====================

// Helper functions
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let currentSupportPage = 1;
let currentSupportConversationId = null;

// Setup support search and filters
function setupSupportSearch() {
    const searchInput = document.getElementById('supportSearch');
    const statusFilter = document.getElementById('supportStatusFilter');
    const hostIdFilter = document.getElementById('supportHostIdFilter');
    
    let searchTimeout;
    
    const performSearch = () => {
        currentSupportPage = 1;
        loadSupportConversations();
    };
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 500);
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', performSearch);
    }
    
    if (hostIdFilter) {
        hostIdFilter.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 500);
        });
    }
}

// Load support conversations
async function loadSupportConversations() {
    const content = document.getElementById('supportContent');
    const unreadCountEl = document.getElementById('unreadCount');
    
    if (!content) return;
    
    content.innerHTML = '<div class="loading">Loading conversations...</div>';
    
    try {
        const statusFilter = document.getElementById('supportStatusFilter')?.value || '';
        const hostIdFilter = document.getElementById('supportHostIdFilter')?.value || '';
        const search = document.getElementById('supportSearch')?.value || '';
        
        const params = {
            page: currentSupportPage,
            limit: 20
        };
        
        if (statusFilter) params.status_filter = statusFilter;
        if (hostIdFilter) params.host_id = parseInt(hostIdFilter);
        if (search) params.search = search;
        
        const response = await api.getSupportConversations(params);
        
        // Update unread count
        if (unreadCountEl) {
            if (response.unread_count > 0) {
                unreadCountEl.textContent = `${response.unread_count} unread`;
                unreadCountEl.style.display = 'inline';
            } else {
                unreadCountEl.textContent = '';
                unreadCountEl.style.display = 'none';
            }
        }
        
        if (!response.conversations || response.conversations.length === 0) {
            content.innerHTML = '<div class="empty-state">No conversations found</div>';
            document.getElementById('supportPagination').innerHTML = '';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        response.conversations.forEach(conv => {
            const lastMessage = conv.messages && conv.messages.length > 0 
                ? conv.messages[conv.messages.length - 1] 
                : null;
            const unreadBadge = !conv.is_read_by_admin ? '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Unread</span>' : '';
            const statusBadge = conv.status === 'closed' 
                ? '<span style="background: #95a5a6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Closed</span>'
                : '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Open</span>';
            
            html += `
                <div onclick="viewSupportConversation(${conv.id})" style="padding: 16px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; background: ${!conv.is_read_by_admin ? '#fff5f5' : '#fff'}; transition: all 0.2s;" 
                     onmouseover="this.style.borderColor='#3498db'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'" 
                     onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <strong style="font-size: 16px;">${escapeHtml(conv.host_name || 'Unknown Host')}</strong>
                            ${unreadBadge}
                            ${statusBadge}
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            ${lastMessage ? formatDateTime(lastMessage.created_at) : formatDateTime(conv.created_at)}
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
                        ${escapeHtml(conv.host_email || '')}
                    </div>
                    ${lastMessage ? `
                        <div style="font-size: 13px; color: #777; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                            <strong>${lastMessage.sender_type === 'host' ? 'Host' : 'Admin'}:</strong> 
                            ${escapeHtml(lastMessage.message.substring(0, 100))}${lastMessage.message.length > 100 ? '...' : ''}
                        </div>
                    ` : '<div style="font-size: 13px; color: #999; font-style: italic;">No messages yet</div>'}
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
        
        // Pagination
        renderSupportPagination(response);
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        content.innerHTML = `<div class="error">Error loading conversations: ${error.message}</div>`;
    }
}

// Render pagination for support conversations
function renderSupportPagination(response) {
    const paginationEl = document.getElementById('supportPagination');
    if (!paginationEl || response.total_pages <= 1) {
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="btn btn-secondary" ${currentSupportPage === 1 ? 'disabled' : ''} onclick="changeSupportPage(${currentSupportPage - 1})" style="padding: 8px 16px;">Previous</button>`;
    
    // Page info
    html += `<span style="padding: 0 16px;">Page ${currentSupportPage} of ${response.total_pages} (${response.total} total)</span>`;
    
    // Next button
    html += `<button class="btn btn-secondary" ${currentSupportPage >= response.total_pages ? 'disabled' : ''} onclick="changeSupportPage(${currentSupportPage + 1})" style="padding: 8px 16px;">Next</button>`;
    
    paginationEl.innerHTML = html;
}

// Change support page
function changeSupportPage(page) {
    currentSupportPage = page;
    loadSupportConversations();
}

// View support conversation details
async function viewSupportConversation(conversationId) {
    currentSupportConversationId = conversationId;
    
    // Hide list page, show detail page
    document.getElementById('supportPage').style.display = 'none';
    document.getElementById('supportDetailPage').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Support Conversation';
    
    const infoEl = document.getElementById('supportConversationInfo');
    const messagesEl = document.getElementById('supportMessages');
    const replyForm = document.getElementById('supportReplyForm');
    
    infoEl.innerHTML = '<div class="loading">Loading conversation...</div>';
    messagesEl.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
        const conversation = await api.getSupportConversation(conversationId);
        
        // Render conversation info
        const statusBadge = conversation.status === 'closed' 
            ? '<span style="background: #95a5a6; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px;">Closed</span>'
            : '<span style="background: #27ae60; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px;">Open</span>';
        
        infoEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0 0 8px 0;">${escapeHtml(conversation.host_name || 'Unknown Host')}</h3>
                    <div style="color: #666; font-size: 14px;">${escapeHtml(conversation.host_email || '')}</div>
                    <div style="color: #999; font-size: 12px; margin-top: 4px;">Host ID: ${conversation.host_id}</div>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
        `;
        
        // Show/hide close/reopen buttons
        const closeBtn = document.getElementById('closeConversationBtn');
        const reopenBtn = document.getElementById('reopenConversationBtn');
        if (conversation.status === 'open') {
            closeBtn.style.display = 'block';
            reopenBtn.style.display = 'none';
            replyForm.style.display = 'block';
        } else {
            closeBtn.style.display = 'none';
            reopenBtn.style.display = 'block';
            replyForm.style.display = 'none';
        }
        
        // Render messages
        if (!conversation.messages || conversation.messages.length === 0) {
            messagesEl.innerHTML = '<div class="empty-state">No messages yet</div>';
        } else {
            let messagesHtml = '<div style="display: flex; flex-direction: column; gap: 16px;">';
            
            conversation.messages.forEach(msg => {
                const isHost = msg.sender_type === 'host';
                const senderName = msg.sender_name || (isHost ? 'Host' : 'Admin');
                
                messagesHtml += `
                    <div style="display: flex; ${isHost ? 'justify-content: flex-start' : 'justify-content: flex-end'};">
                        <div style="max-width: 70%; padding: 12px 16px; border-radius: 12px; background: ${isHost ? '#e8f4f8' : '#3498db'}; color: ${isHost ? '#333' : '#fff'};">
                            <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px; opacity: 0.9;">
                                ${escapeHtml(senderName)}
                            </div>
                            <div style="font-size: 14px; line-height: 1.5;">
                                ${escapeHtml(msg.message)}
                            </div>
                            <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
                                ${formatDateTime(msg.created_at)}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            messagesHtml += '</div>';
            messagesEl.innerHTML = messagesHtml;
            
            // Scroll to bottom
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        
        // Reload conversations list to update unread count
        loadSupportConversations();
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        infoEl.innerHTML = `<div class="error">Error loading conversation: ${error.message}</div>`;
        messagesEl.innerHTML = '';
    }
}

// Back to support list
function backToSupportList() {
    document.getElementById('supportDetailPage').style.display = 'none';
    document.getElementById('supportPage').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Support';
    currentSupportConversationId = null;
    loadSupportConversations();
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
    const replyTextarea = document.getElementById('supportReplyMessage');
    if (replyTextarea) {
        replyTextarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
});

// Send support reply
async function sendSupportReply(event) {
    event.preventDefault();
    
    if (!currentSupportConversationId) {
        alert('No conversation selected');
        return;
    }
    
    const messageInput = document.getElementById('supportReplyMessage');
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    if (message.length > 2000) {
        alert('Message must be 2000 characters or less');
        return;
    }
    
    // Disable form while sending
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
        await api.respondToSupportConversation(currentSupportConversationId, message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Reload conversation to show new message
        await viewSupportConversation(currentSupportConversationId);
        
    } catch (error) {
        alert('Error sending reply: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Close support conversation
async function closeSupportConversation() {
    if (!currentSupportConversationId) {
        alert('No conversation selected');
        return;
    }
    
    if (!confirm('Are you sure you want to close this conversation? The host will not be able to send new messages until it is reopened.')) {
        return;
    }
    
    try {
        await api.closeSupportConversation(currentSupportConversationId);
        await viewSupportConversation(currentSupportConversationId);
        alert('Conversation closed successfully');
    } catch (error) {
        alert('Error closing conversation: ' + error.message);
    }
}

// Reopen support conversation
async function reopenSupportConversation() {
    if (!currentSupportConversationId) {
        alert('No conversation selected');
        return;
    }
    
    try {
        await api.reopenSupportConversation(currentSupportConversationId);
        await viewSupportConversation(currentSupportConversationId);
        alert('Conversation reopened successfully');
    } catch (error) {
        alert('Error reopening conversation: ' + error.message);
    }
}
