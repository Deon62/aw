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
        feedback: 'Feedback',
        notifications: 'Notifications'
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
            // Notifications page doesn't need loading
            break;
    }
}

// Back to hosts list
function backToHostsList() {
    loadPage('hosts');
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
        
        let response;
        if (recipientType === 'all') {
            response = await api.broadcastToHosts(notificationData);
        } else {
            // For future: individual host selection
            resultDiv.innerHTML = '<div style="color: #d32f2f; padding: 12px; background-color: #ffebee; border-radius: 4px;">Individual host selection not yet implemented.</div>';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Notification';
            return;
        }
        
        // Show success message
        resultDiv.innerHTML = `
            <div style="color: #2e7d32; padding: 12px; background-color: #e8f5e9; border-radius: 4px; margin-bottom: 12px;">
                <strong>Success!</strong> ${response.message}
            </div>
        `;
        
        // Reset form
        form.reset();
        document.getElementById('notificationType').value = 'info';
        document.querySelector('input[name="recipientType"][value="all"]').checked = true;
        
    } catch (error) {
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
