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
        feedback: 'Feedback'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Show selected page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.style.display = 'block';
    }

    // Load page-specific content
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'hosts':
            loadHosts();
            break;
        case 'clients':
            loadClients();
            break;
        case 'cars':
            loadCars();
            break;
        case 'feedback':
            loadFeedback();
            break;
    }
}

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

        // Load recent activity
        const activity = await api.getRecentActivity();
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

// Load hosts
async function loadHosts() {
    const content = document.getElementById('hostsContent');
    try {
        const data = await api.getHosts({ limit: 50 });
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
                            </tr>
                        </thead>
                        <tbody>
                            ${data.hosts.map(host => `
                                <tr>
                                    <td>${host.full_name}</td>
                                    <td>${host.email}</td>
                                    <td>${host.is_active ? 'Active' : 'Inactive'}</td>
                                    <td>${host.cars_count || 0}</td>
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

// Load clients
async function loadClients() {
    const content = document.getElementById('clientsContent');
    try {
        const data = await api.getClients({ limit: 50 });
        if (data.items && data.items.length > 0) {
            content.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(client => `
                                <tr>
                                    <td>${client.full_name}</td>
                                    <td>${client.email}</td>
                                    <td>${client.is_active ? 'Active' : 'Inactive'}</td>
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

// Load cars
async function loadCars() {
    const content = document.getElementById('carsContent');
    try {
        const data = await api.getCars({ limit: 50 });
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
                            </tr>
                        </thead>
                        <tbody>
                            ${data.cars.map(car => `
                                <tr>
                                    <td>${car.name || 'N/A'}</td>
                                    <td>${car.model || 'N/A'}</td>
                                    <td>${car.year || 'N/A'}</td>
                                    <td>${car.verification_status || 'N/A'}</td>
                                    <td>${car.host_name || 'N/A'}</td>
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
