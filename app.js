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
    const defaultUsers = [
        { username: 'alex', password: 'alex2026', role: 'owner', name: 'Alex', avatar: '', truck: '' },
        { username: 'camilo', password: 'camilo2026', role: 'driver', name: 'Camilo Vergara', avatar: 'camilo_avatar.png', truck: 'PSJK55' },
        { username: 'eladio', password: 'eladio2020', role: 'driver', name: 'Eladio Alvarez', avatar: '', truck: 'DLZP45' },
        { username: 'deivid', password: 'deivid2010', role: 'mechanic', name: 'Deivid Alexis', avatar: '', truck: '' },
        { username: 'cesar', password: 'cesar2011', role: 'driver', name: 'Cesar Valdebenito', avatar: '', truck: 'PSJK56' },
        { username: 'alex2', password: 'alex2026', role: 'driver', name: 'Alex Vergara', avatar: 'alex2_avatar.png', truck: 'KZPH75' }
    ];

    const existingUsers = localStorage.getItem('serfover_users');
    let needsInit = !existingUsers;
    let usersArray = [];
    if (existingUsers) {
        try {
            usersArray = JSON.parse(existingUsers);
            if (usersArray.length > 0 && !usersArray[0].hasOwnProperty('username')) needsInit = true;
        } catch(e) { needsInit = true; }
    }
    
    if (needsInit) {
        localStorage.setItem('serfover_users', JSON.stringify(defaultUsers));
    } else {
        // Asegurarse de que los usuarios por defecto que falten se agreguen, y actualizar patentes/avatares si están vacías
        let updated = false;
        defaultUsers.forEach(du => {
            const existingUser = usersArray.find(u => u.username === du.username);
            if (!existingUser) {
                usersArray.push(du);
                updated = true;
            } else {
                if (du.truck && (!existingUser.truck || existingUser.truck.trim() === '')) {
                    existingUser.truck = du.truck;
                    updated = true;
                }
                if (du.avatar && (!existingUser.avatar || existingUser.avatar.trim() === '')) {
                    existingUser.avatar = du.avatar;
                    updated = true;
                }
            }
        });
        if (updated) {
            localStorage.setItem('serfover_users', JSON.stringify(usersArray));
        }
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

            try {
                localStorage.setItem('serfover_users', JSON.stringify(users));
                
                // Actualizar sesión actual
                const newSession = { ...users[index] };
                localStorage.setItem('serfover_user', JSON.stringify(newSession));
                
                // Refrescar UI si es posible
                window.updateProfileUI();
                return true;
            } catch (e) {
                console.error("Error saving profile (Storage full?):", e);
                alert("Error al guardar: La imagen podría ser demasiado grande o no hay espacio.");
                return false;
            }
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

        // Actualizar avatar en driver dashboard (hero y nav)
        const heroImg = document.getElementById('heroProfileImg');
        const heroInitial = document.getElementById('heroAvatarInitial');
        const bnavAvatar = document.getElementById('bnavAvatar');
        
        if (heroImg && heroInitial) {
            if (user.avatar) {
                heroImg.src = user.avatar;
                heroImg.style.display = 'block';
                heroInitial.style.display = 'none';
            } else {
                heroImg.style.display = 'none';
                heroInitial.style.display = 'block';
                heroInitial.textContent = user.name.charAt(0).toUpperCase();
            }
        }
        
        if (bnavAvatar) {
            if (user.avatar) {
                bnavAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                bnavAvatar.style.background = 'transparent';
                bnavAvatar.style.color = 'transparent';
            } else {
                bnavAvatar.innerHTML = user.name.charAt(0).toUpperCase();
                bnavAvatar.style.background = 'var(--glass-bg)';
                bnavAvatar.style.color = 'var(--text-primary)';
            }
        }
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
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 250;
                    const MAX_HEIGHT = 250;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    
                    const previewDiv = document.getElementById('profileAvatarPreview');
                    previewDiv.innerHTML = `<img src="${dataUrl}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    previewDiv.dataset.base64 = dataUrl;
                };
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
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

// =====================================================
// GLOBAL UTILS (available outside DOMContentLoaded)
// =====================================================

/**
 * Toggle password field visibility with eye icon animation.
 * @param {string} inputId - The input element ID
 * @param {HTMLElement} btn - The toggle button element
 */
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    // Toggle icon: eye vs eye-off
    btn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
               <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
               <circle cx="12" cy="12" r="3"/>
           </svg>`;
    btn.title = isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
};

/**
 * Set a submit button into loading state.
 * @param {string} btnId - button element id
 * @param {boolean} loading - true=loading, false=restore
 * @param {string} originalText - text to restore when loading=false
 */
window.setBtnLoading = function(btnId, loading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.classList.add('btn--loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('btn--loading');
        btn.disabled = false;
        if (originalText) {
            const span = btn.querySelector('span');
            if (span) span.textContent = originalText;
        }
    }
};

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 */
window.showToast = window.showToast || function(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const colors = {
        success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#10b981' },
        error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
        warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
        info:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#3b82f6' }
    };
    const c = colors[type] || colors.info;
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex; align-items: center; gap: 0.65rem;
        padding: 0.8rem 1.1rem; border-radius: 14px;
        background: ${c.bg}; border: 1px solid ${c.border};
        color: ${c.text}; font-size: 0.9rem; font-weight: 500;
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        transform: translateX(120%); opacity: 0;
        transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
        font-family: var(--font-family); max-width: 320px; min-width: 200px;
    `;
    toast.innerHTML = `<span style="font-size:1rem;">${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
    });
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};
