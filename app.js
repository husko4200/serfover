document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Simulación de autenticación (posteriormente se podría conectar con Vercel/Google Sheets API si se requiere validación real)
            if (username === 'dueno' && password === '123') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'owner', name: 'Dueño SERFOVER' }));
                window.location.href = 'dashboard.html';
            } else if (username === 'conductor' && password === '123') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'driver', name: 'Conductor Prueba' }));
                window.location.href = 'driver.html';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

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
        if (userRoleElement) userRoleElement.textContent = user.role === 'owner' ? 'Administrador' : 'Conductor';
        
        // Redirigir si está en login y ya está logueado
        if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
            window.location.href = user.role === 'owner' ? 'dashboard.html' : 'driver.html';
        }
    }
});
