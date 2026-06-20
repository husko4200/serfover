function switchMechTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const tablesContainer = document.getElementById('tablesContainer');
    if (tabId === 'inicio') {
        if(tablesContainer) tablesContainer.style.display = 'none';
        document.getElementById('mech-inicio').classList.add('active');
    } else {
        if(tablesContainer) tablesContainer.style.display = 'block';
        document.getElementById('mech-inicio').classList.remove('active');
        document.getElementById('mech-' + tabId).classList.add('active');
    }
    
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') === `switchMechTab('${tabId}')`);
    if(activeNav) activeNav.classList.add('active');

    const titles = {
        'inicio': 'Panel Principal',
        'historial': 'Historial Mantenciones',
        'mantencion': 'Ingresar Mantención'
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

function getBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Modal functions
function openModal(title, contentHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = contentHTML;
    document.getElementById('detailModal').classList.add('active');
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function formatDate(isoString) {
    if (!isoString) return 'Sin fecha';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL');
}

window.currentMants = [];

function checkFleetAlerts(data) {
    const alertsContainer = document.getElementById('mechAlertsContainer');
    const alertsTitle = document.getElementById('mechAlertsTitle');
    if (!alertsContainer) return;
    
    // Agrupar por móvil para encontrar maxKm y lastOilKm
    const fleetMap = {};

    const allRecords = [
        ...(data.reportes || []),
        ...(data.combustibles || []),
        ...(data.mantenciones || [])
    ];

    allRecords.forEach(r => {
        let movil = r.movil || r._movil || 'Desconocido';
        if(movil === 'Desconocido' && r.descripcion && r.descripcion.includes('Móvil:')) {
            const match = r.descripcion.match(/Móvil:\s*([^.]+)\./);
            if (match && match[1]) movil = match[1].trim();
        }
        if(movil === 'Desconocido') return;

        if (!fleetMap[movil]) fleetMap[movil] = { movil, maxKm: 0, lastOilKm: 0 };
        const km = Number(r.kilometraje) || 0;
        if (km > fleetMap[movil].maxKm) fleetMap[movil].maxKm = km;
    });

    if (data.mantenciones) {
        data.mantenciones.forEach(m => {
            let movil = m.movil || m._movil || 'Desconocido';
            if(movil === 'Desconocido' && m.descripcion && m.descripcion.includes('Móvil:')) {
                const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
                if (match && match[1]) movil = match[1].trim();
            }
            if(movil === 'Desconocido') return;

            if (m.tipo === 'Cambio de Aceite') {
                const km = Number(m.kilometraje) || 0;
                if (!fleetMap[movil]) fleetMap[movil] = { movil, maxKm: km, lastOilKm: 0 };
                if (km > fleetMap[movil].lastOilKm) fleetMap[movil].lastOilKm = km;
            }
        });
    }

    // Limpiar alertas previas
    const existingAlerts = alertsContainer.querySelectorAll('.alert-box');
    existingAlerts.forEach(el => el.remove());

    let hasAlerts = false;

    Object.values(fleetMap).forEach(truck => {
        if (truck.lastOilKm > 0) {
            const diff = truck.maxKm - truck.lastOilKm;
            if (diff >= 35000) {
                hasAlerts = true;
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert-box';
                alertDiv.style.padding = '1rem';
                alertDiv.style.borderRadius = 'var(--radius-md)';
                alertDiv.style.fontWeight = 'bold';
                
                if (diff >= 40000) {
                    alertDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    alertDiv.style.color = 'var(--accent-danger)';
                    alertDiv.style.border = '1px solid var(--accent-danger)';
                    alertDiv.innerHTML = `🚨 URGENTE - Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio de aceite (Límite 40.000).`;
                } else {
                    alertDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                    alertDiv.style.color = 'var(--accent-warning)';
                    alertDiv.style.border = '1px solid var(--accent-warning)';
                    alertDiv.innerHTML = `⚠️ AVISO - Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio de aceite. Prepárese para cambio a los 40.000 km.`;
                }
                alertsContainer.appendChild(alertDiv);
            }
        }
    });

    if (hasAlerts) {
        alertsContainer.style.display = 'flex';
        alertsTitle.style.display = 'block';
    } else {
        alertsContainer.style.display = 'none';
        alertsTitle.style.display = 'none';
    }
}

async function loadMechanicData() {
    try {
        const data = await API.getData();
        if (!data) return;

        // Calcular y mostrar alertas
        checkFleetAlerts(data);

        const monthVal = document.getElementById('monthFilter').value; // Formato YYYY-MM
        const user = JSON.parse(localStorage.getItem('serfover_user'));

        let misMantenciones = data.mantenciones || [];

        if (monthVal) {
            const [year, month] = monthVal.split('-');
            misMantenciones = misMantenciones.filter(m => {
                const d = new Date(m.fecha);
                return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
            });
        }

        misMantenciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        window.currentMants = misMantenciones;

        const elStatMant = document.getElementById('mechStatMant');
        if (elStatMant) elStatMant.textContent = misMantenciones.length;

        const tbody = document.querySelector('#tableHistorial tbody');
        tbody.innerHTML = '';

        if (misMantenciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No se encontraron mantenciones para este periodo.</td></tr>';
            return;
        }

        misMantenciones.forEach((m, i) => {
            // Extraer el móvil de la descripción
            let movil = 'No especificado';
            if (m.descripcion && m.descripcion.includes('Móvil:')) {
                const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
                if (match && match[1]) movil = match[1].trim();
            }

            // Determinar Origen
            const driverStr = m.driver || '';
            const isMech = driverStr.startsWith('Mecánico');
            const origen = isMech ? 'Mecánico' : 'Conductor';
            const origenColor = isMech ? 'var(--brand-secondary)' : 'var(--brand-primary)';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Fecha">${formatDate(m.fecha)}</td>
                <td data-label="Móvil"><strong>${movil}</strong></td>
                <td data-label="Origen"><span style="color: ${origenColor}; font-weight: bold; font-size: 0.8rem; border: 1px solid ${origenColor}; padding: 0.2rem 0.4rem; border-radius: 4px;">${origen}</span></td>
                <td data-label="Tipo">${m.tipo}</td>
                <td data-label="Kilometraje">${m.kilometraje} km</td>
                <td data-label="Acción"><button class="view-btn" onclick="verDetalleMantencion(${i})">Ver Detalle</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error cargando datos', error);
    }
}

window.verDetalleMantencion = function(index) {
    const m = window.currentMants[index];
    if (!m) return;

    let movil = 'No especificado';
    if (m.descripcion && m.descripcion.includes('Móvil:')) {
        const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
        if (match && match[1]) movil = match[1].trim();
    }

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Móvil:</strong> ${movil}</div>
            <div><strong>Fecha:</strong> ${formatDate(m.fecha)}</div>
            <div><strong>Origen:</strong> <span class="driver-badge">${m.driver || 'Desconocido'}</span></div>
            <div><strong>Tipo:</strong> ${m.tipo}</div>
            <div><strong>Kilometraje:</strong> ${m.kilometraje} km</div>
        </div>
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
            <strong>Descripción / Repuestos:</strong><br>
            ${m.descripcion}
        </div>
    `;

    if (m.imagen) {
        html += `<strong>Evidencia:</strong><br><img src="${m.imagen}" alt="Evidencia">`;
    }

    openModal(`Detalle - ${m.tipo}`, html);
};

document.addEventListener('DOMContentLoaded', () => {
    // Si queremos mostrar el mes actual por defecto
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('monthFilter').value = currentMonth;
    
    loadMechanicData();

    // --- Enviar Mantención Mecánico ---
    document.getElementById('formMantencionMech').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('mantStatusMech');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<span style="color: var(--brand-primary);">Guardando...</span>';

        const user = JSON.parse(localStorage.getItem('serfover_user'));

        try {
            const imageFile = document.getElementById('mantImagenMech').files[0];
            const base64Image = await getBase64(imageFile);

            const payload = {
                type: 'mantencion',
                // Enviamos como conductor el nombre digitado, si está vacío usamos 'Mecánico - ' + mecanico
                driver: document.getElementById('mantConductor').value || ('Mecánico - ' + (user ? user.name : 'Desc')),
                tipo: document.getElementById('mantTipo').value,
                kilometraje: document.getElementById('mantKm').value,
                descripcion: `Móvil: ${document.getElementById('mantMovil').value}. ` + document.getElementById('mantDesc').value,
                valor: 0, // Mecánico no ingresa costo
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            
            statusEl.innerHTML = '<span style="color: var(--accent-success);">¡Mantención registrada con éxito!</span>';
            document.getElementById('formMantencionMech').reset();
            document.getElementById('mantPreviewMech').style.display = 'none';
            
            // Recargar datos
            loadMechanicData();
        } catch (error) {
            statusEl.innerHTML = '<span style="color: var(--accent-danger);">Error al guardar: ' + error.message + '</span>';
        }
    });
});
