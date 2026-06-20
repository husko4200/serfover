document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    let pageContext = 'app';
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('serfoverweb/') || window.location.pathname === '/') {
        pageContext = 'login';
    }

    const savedTheme = localStorage.getItem(`serfover_theme_${pageContext}`) || (pageContext === 'login' ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(`serfover_theme_${pageContext}`, newTheme);
    };

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Simulación de autenticación (posteriormente se podría conectar con Vercel/Google Sheets API si se requiere validación real)
            const usernameLower = username.toLowerCase().trim();
            if (usernameLower === 'alex' && password === 'alex2026') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'owner', name: 'Alex' }));
                window.location.href = 'dashboard.html';
            } else if (usernameLower === 'camilo' && password === 'camilo2026') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'driver', name: 'Camilo Vergara' }));
                window.location.href = 'driver.html';
            } else if (usernameLower === 'eladio' && password === 'eladio2020') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'driver', name: 'Eladio Alvarez' }));
                window.location.href = 'driver.html';
            } else if (usernameLower === 'deivid' && password === 'deivid2010') {
                localStorage.setItem('serfover_user', JSON.stringify({ role: 'mechanic', name: 'Deivid Alexis' }));
                window.location.href = 'mechanic.html';
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
        
        let roleDisplay = 'Conductor';
        if (user.role === 'owner') roleDisplay = 'Administrador';
        if (user.role === 'mechanic') roleDisplay = 'Mecánico';
        if (userRoleElement) userRoleElement.textContent = roleDisplay;
        
        // Redirigir si está en login y ya está logueado
        if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
            if (user.role === 'owner') window.location.href = 'dashboard.html';
            else if (user.role === 'mechanic') window.location.href = 'mechanic.html';
            else window.location.href = 'driver.html';
        }
    }
});
