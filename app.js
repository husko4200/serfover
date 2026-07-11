document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    let pageContext = 'app';
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('serfoverweb/') || window.location.pathname === '/') {
        pageContext = 'login';
    }

    const savedTheme = pageContext === 'login' ? 'light' : (localStorage.getItem(`serfover_theme_${pageContext}`) || 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(`serfover_theme_${pageContext}`, newTheme);
    };

    // Inicializar base de usuarios por defecto si no existe o si es formato viejo
    const existingUsers = localStorage.getItem('serfover_users');
    let needsInit = !existingUsers;
    if (existingUsers) {
        try {
            const parsed = JSON.parse(existingUsers);
            if (parsed.length > 0 && !parsed[0].hasOwnProperty('username')) needsInit = true;
        } catch(e) { needsInit = true; }
    }
    if (needsInit) {
        const defaultUsers = [
            { username: 'alex', password: 'alex2026', role: 'owner', name: 'Alex', avatar: '', truck: '' },
            { username: 'camilo', password: 'camilo2026', role: 'driver', name: 'Camilo Vergara', avatar: '', truck: '' },
            { username: 'eladio', password: 'eladio2020', role: 'driver', name: 'Eladio Alvarez', avatar: '', truck: '' },
            { username: 'deivid', password: 'deivid2010', role: 'mechanic', name: 'Deivid Alexis', avatar: '', truck: '' }
        ];
        localStorage.setItem('serfover_users', JSON.stringify(defaultUsers));
    }

    // Migrar sesión antigua (formato sin 'username') a la nueva
    const currentSession = localStorage.getItem('serfover_user');
    if (currentSession) {
        try {
            const sess = JSON.parse(currentSession);
            if (!sess.username) {
                // Buscar el usuario correspondiente en la nueva base
                const users = JSON.parse(localStorage.getItem('serfover_users')) || [];
                const match = users.find(u => u.name === sess.name && u.role === sess.role);
                if (match) {
                    localStorage.setItem('serfover_user', JSON.stringify({ ...match }));
                } else {
                    // No se encontró, forzar logout
                    localStorage.removeItem('serfover_user');
                }
            }
        } catch(e) { localStorage.removeItem('serfover_user'); }
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username').value.toLowerCase().trim();
            const passwordInput = document.getElementById('password').value;
            
            const users = JSON.parse(localStorage.getItem('serfover_users')) || [];
            const foundUser = users.find(u => u.username === usernameInput && u.password === passwordInput);

            if (foundUser) {
                // Guardamos la sesión (copia del usuario sin la contraseña por seguridad en la sesión, aunque acá es local)
                const sessionUser = { ...foundUser };
                localStorage.setItem('serfover_user', JSON.stringify(sessionUser));
                
                if (foundUser.role === 'owner') window.location.href = 'dashboard.html';
                else if (foundUser.role === 'mechanic') window.location.href = 'mechanic.html';
                else window.location.href = 'driver.html';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

    // Funciones globales para manejar perfil
    window.updateUserProfile = function(updatedData) {
        const currentUser = JSON.parse(localStorage.getItem('serfover_user'));
        if (!currentUser) return false;

        let users = JSON.parse(localStorage.getItem('serfover_users')) || [];
        const index = users.findIndex(u => u.username === currentUser.username);
        
        if (index !== -1) {
            // Actualizar datos permitidos
            if (updatedData.username) users[index].username = updatedData.username.toLowerCase().trim();
            if (updatedData.password) users[index].password = updatedData.password;
            if (updatedData.name) users[index].name = updatedData.name;
            if (updatedData.avatar !== undefined) users[index].avatar = updatedData.avatar;
            if (updatedData.truck !== undefined) users[index].truck = updatedData.truck;

            localStorage.setItem('serfover_users', JSON.stringify(users));
            
            // Actualizar sesión actual
            const newSession = { ...users[index] };
            localStorage.setItem('serfover_user', JSON.stringify(newSession));
            
            // Refrescar UI si es posible
            window.updateProfileUI();
            return true;
        }
        return false;
    };

    window.updateProfileUI = function() {
        const user = JSON.parse(localStorage.getItem('serfover_user'));
        if (!user) return;

        const userNameElement = document.getElementById('userNameDisplay');
        if (userNameElement) userNameElement.textContent = user.name;

        // Actualizar avatar en el menú lateral
        const avatarContainers = document.querySelectorAll('.user-info .avatar');
        avatarContainers.forEach(container => {
            if (user.avatar) {
                container.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                container.style.background = 'transparent';
                container.style.color = 'transparent';
            } else {
                container.innerHTML = user.name.charAt(0).toUpperCase();
                container.style.background = 'var(--brand-primary)';
                container.style.color = 'white';
            }
        });
    };

    // Funciones globales útiles (cerrar sesión, check auth)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('serfover_user');
            window.location.href = 'index.html';
        });
    }

    // Proteger rutas
    const user = JSON.parse(localStorage.getItem('serfover_user'));
    const currentPath = window.location.pathname;

    if (!user && !currentPath.endsWith('index.html') && !currentPath.endsWith('/')) {
        // No está logueado y trata de acceder a dashboard/driver
        window.location.href = 'index.html';
    }

    if (user) {
        // Llenar datos de usuario en la UI si existen
        const userNameElement = document.getElementById('userNameDisplay');
        const userRoleElement = document.getElementById('userRoleDisplay');
        
        if (userNameElement) userNameElement.textContent = user.name;
        
        let roleDisplay = 'Conductor';
        if (user.role === 'owner') roleDisplay = 'Administrador';
        if (user.role === 'mechanic') roleDisplay = 'Mecánico';
        if (userRoleElement) userRoleElement.textContent = roleDisplay;
        
        // Redirigir si está en login y ya está logueado
        if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
            if (user.role === 'owner') window.location.href = 'dashboard.html';
            else if (user.role === 'mechanic') window.location.href = 'mechanic.html';
            else window.location.href = 'driver.html';
        } else {
            // Actualizar UI del perfil en dashboards
            window.updateProfileUI();
        }
    }

    // --- Modal de Perfil Lógica ---
    window.openProfileModal = function() {
        const user = JSON.parse(localStorage.getItem('serfover_user'));
        if (!user) return;

        document.getElementById('profileUsername').value = user.username || '';
        document.getElementById('profilePassword').value = user.password || '';
        document.getElementById('profileName').value = user.name || '';
        
        const truckInput = document.getElementById('profileTruck');
        if (truckInput) {
            truckInput.value = user.truck || '';
        }

        const previewDiv = document.getElementById('profileAvatarPreview');
        if (user.avatar) {
            previewDiv.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            previewDiv.dataset.base64 = user.avatar;
        } else {
            previewDiv.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            previewDiv.dataset.base64 = '';
        }

        const modal = document.getElementById('profileModal');
        if (modal) modal.classList.add('active');
    };

    window.closeProfileModal = function() {
        const modal = document.getElementById('profileModal');
        if (modal) modal.classList.remove('active');
    };

    window.handleProfileAvatarChange = function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.getElementById('profileAvatarPreview');
                previewDiv.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                previewDiv.dataset.base64 = e.target.result;
            }
            reader.readAsDataURL(input.files[0]);
        }
    };

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const statusEl = document.getElementById('profileStatus');
            statusEl.style.display = 'block';
            statusEl.style.color = 'var(--brand-primary)';
            statusEl.textContent = 'Guardando...';

            const updatedData = {
                username: document.getElementById('profileUsername').value,
                password: document.getElementById('profilePassword').value,
                name: document.getElementById('profileName').value,
                avatar: document.getElementById('profileAvatarPreview').dataset.base64 || ''
            };

            const truckInput = document.getElementById('profileTruck');
            if (truckInput) {
                updatedData.truck = truckInput.value;
            }

            const success = window.updateUserProfile(updatedData);
            if (success) {
                statusEl.style.color = 'var(--accent-success)';
                statusEl.textContent = '¡Perfil actualizado con éxito!';
                setTimeout(() => {
                    window.closeProfileModal();
                    statusEl.style.display = 'none';
                }, 1500);
            } else {
                statusEl.style.color = 'var(--accent-danger)';
                statusEl.textContent = 'Error al actualizar perfil.';
            }
        });
    }

    // --- Mobile Menu Toggle ---
    window.toggleMobileMenu = function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        if (overlay) {
            overlay.classList.toggle('active');
        }
    };
});
