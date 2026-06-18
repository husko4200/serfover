// Funciones para UI de Conductor
function switchTab(tabId) {
    // Ocultar todas las tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Mostrar la seleccionada
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Activar botón nav
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') === `switchTab('${tabId}')`);
    if(activeNav) activeNav.classList.add('active');

    // Cambiar título
    const titles = {
        'reporte': 'Hoja de Ruta',
        'combustible': 'Control de Combustible',
        'mantencion': 'Registro de Mantenciones'
    };
    document.getElementById('pageTitle').textContent = titles[tabId] || 'Panel';
}

function previewImage(input, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    const img = container.querySelector('img');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            container.style.display = 'block';
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Convertir archivo a Base64 para enviar
function getBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Configurar fecha actual
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-ES', dateOpts);

    const user = JSON.parse(localStorage.getItem('serfover_user'));

    // --- Enviar Reporte ---
    document.getElementById('formReporte').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('repStatus');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<span style="color: var(--brand-primary);">Guardando...</span>';

        try {
            const imageFile = document.getElementById('repImagen').files[0];
            const base64Image = await getBase64(imageFile);

            const payload = {
                type: 'reporte',
                driver: user ? user.name : 'Desconocido',
                movil: document.getElementById('repMovil').value,
                kilometraje: document.getElementById('repKilometraje').value,
                fundo: document.getElementById('repFundo').value,
                destino: document.getElementById('repDestino').value,
                faena: document.getElementById('repFaena').value,
                peaje: document.getElementById('repPeaje').value,
                romana: document.getElementById('repRomana').value,
                guia: document.getElementById('repGuia').value,
                observaciones: document.getElementById('repObservaciones').value,
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            
            statusEl.innerHTML = '<span style="color: var(--accent-success);">¡Reporte guardado con éxito!</span>';
            document.getElementById('formReporte').reset();
            document.getElementById('repPreview').style.display = 'none';
        } catch (error) {
            statusEl.innerHTML = '<span style="color: var(--accent-danger);">Error al guardar: ' + error.message + '</span>';
        }
    });

    // --- Enviar Combustible ---
    document.getElementById('formCombustible').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('combStatus');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<span style="color: var(--brand-primary);">Guardando...</span>';

        try {
            const imageFile = document.getElementById('combImagen').files[0];
            const base64Image = await getBase64(imageFile);

            const payload = {
                type: 'combustible',
                driver: user ? user.name : 'Desconocido',
                litros: document.getElementById('combLitros').value,
                kilometraje: document.getElementById('combKm').value,
                valor: document.getElementById('combValor').value,
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            
            statusEl.innerHTML = '<span style="color: var(--accent-success);">¡Combustible registrado con éxito!</span>';
            document.getElementById('formCombustible').reset();
            document.getElementById('combPreview').style.display = 'none';
        } catch (error) {
            statusEl.innerHTML = '<span style="color: var(--accent-danger);">Error al guardar: ' + error.message + '</span>';
        }
    });

    // --- Enviar Mantención ---
    document.getElementById('formMantencion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('mantStatus');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<span style="color: var(--brand-primary);">Guardando...</span>';

        try {
            const imageFile = document.getElementById('mantImagen').files[0];
            const base64Image = await getBase64(imageFile);

            const payload = {
                type: 'mantencion',
                driver: user ? user.name : 'Desconocido',
                tipo: document.getElementById('mantTipo').value,
                kilometraje: document.getElementById('mantKm').value,
                descripcion: document.getElementById('mantDesc').value,
                valor: document.getElementById('mantValor').value,
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            
            statusEl.innerHTML = '<span style="color: var(--accent-success);">¡Mantención registrada con éxito!</span>';
            document.getElementById('formMantencion').reset();
            document.getElementById('mantPreview').style.display = 'none';
        } catch (error) {
            statusEl.innerHTML = '<span style="color: var(--accent-danger);">Error al guardar: ' + error.message + '</span>';
        }
    });
});
