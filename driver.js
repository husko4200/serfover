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
        'inicio': 'Panel de Inicio',
        'reporte': 'Hoja de Ruta',
        'combustible': 'Control de Combustible',
        'mantencion': 'Registro de Mantenciones',
        'historial': 'Mis Reportes',
        'historial-mant': 'Mis Mantenciones'
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

// --- Calcular Total ---
function updateTotal() {
    const peaje = parseFloat(document.getElementById('repPeaje').value) || 0;
    const romana = parseFloat(document.getElementById('repRomana').value) || 0;
    const viatico = parseFloat(document.getElementById('repViatico').value) || 0;
    document.getElementById('repTotal').value = peaje + romana + viatico;
}

// --- Modal ---
function openModal(title, contentHTML) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = contentHTML;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = 'none';
}

function formatDate(isoString) {
    if (!isoString) return 'Sin fecha';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL');
}

window.currentDriverReports = [];
window.currentDriverMants = [];

function getMovilFromDesc(desc) {
    if(!desc) return null;
    const match = desc.match(/Móvil:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
}

async function loadDriverHistory() {
    try {
        const data = await API.getData();
        if (!data) return;

        const monthVal = document.getElementById('driverMonthFilter').value; 
        const mantMonthVal = document.getElementById('driverMantMonthFilter') ? document.getElementById('driverMantMonthFilter').value : monthVal;
        
        const user = JSON.parse(localStorage.getItem('serfover_user'));
        if (!user) return;

        // 1. Encontrar el móvil actual del conductor
        let misReps = (data.reportes || []).filter(r => r.driver === user.name).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        let miMovil = misReps.length > 0 ? misReps[0].movil : null;

        // --- Historial de Reportes ---
        let misReportes = misReps;
        if (monthVal) {
            const [year, month] = monthVal.split('-');
            misReportes = misReportes.filter(r => {
                const d = new Date(r.fecha);
                return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
            });
        }
        window.currentDriverReports = misReportes;

        const tbodyRep = document.querySelector('#tableDriverHistory tbody');
        if (tbodyRep) {
            tbodyRep.innerHTML = '';
            if (misReportes.length === 0) {
                tbodyRep.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay reportes en este mes.</td></tr>';
            } else {
                misReportes.forEach((rep, i) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="Fecha">${formatDate(rep.fecha)}</td>
                        <td data-label="Móvil"><strong>${rep.movil}</strong></td>
                        <td data-label="Destino">${rep.fundo} / ${rep.destino}</td>
                        <td data-label="N° Guía">${rep.guia || '-'}</td>
                        <td data-label="Acción"><button class="view-btn" style="background:transparent; border:1px solid var(--brand-primary); color:var(--brand-primary); padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;" onclick="verDetalleReporte(${i})">Ver</button></td>
                    `;
                    tbodyRep.appendChild(tr);
                });
            }
        }

        // --- Historial de Mantenciones ---
        let misMantenciones = (data.mantenciones || []).filter(m => {
            const isMine = m.driver === user.name;
            const movilMant = getMovilFromDesc(m.descripcion);
            const isMyTruck = miMovil && movilMant && movilMant.toLowerCase() === miMovil.toLowerCase();
            return isMine || isMyTruck;
        });

        if (mantMonthVal) {
            const [year, month] = mantMonthVal.split('-');
            misMantenciones = misMantenciones.filter(r => {
                const d = new Date(r.fecha);
                return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
            });
        }
        misMantenciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        window.currentDriverMants = misMantenciones;

        const elStatViajes = document.getElementById('driverStatViajes');
        if (elStatViajes) elStatViajes.textContent = misReportes.length;

        const elStatMant = document.getElementById('driverStatMant');
        if (elStatMant) elStatMant.textContent = misMantenciones.length;

        const tbodyMant = document.querySelector('#tableDriverMantenciones tbody');
        if (tbodyMant) {
            tbodyMant.innerHTML = '';
            if (misMantenciones.length === 0) {
                tbodyMant.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay mantenciones en este mes para tu móvil asignado.</td></tr>';
            } else {
                misMantenciones.forEach((mant, i) => {
                    const tr = document.createElement('tr');
                    const isMechanic = mant.driver.startsWith('Mecánico');
                    const badge = isMechanic ? 
                        '<span style="background: var(--brand-primary); color:white; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem;">Mecánico</span>' : 
                        '<span style="background: var(--bg-hover); color: var(--text-primary); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem;">Conductor</span>';
                    
                    tr.innerHTML = `
                        <td data-label="Fecha">${formatDate(mant.fecha)}</td>
                        <td data-label="Tipo"><strong>${mant.tipo || '-'}</strong></td>
                        <td data-label="Origen">${badge}</td>
                        <td data-label="Km">${mant.kilometraje || '-'}</td>
                        <td data-label="Acción"><button class="view-btn" style="background:transparent; border:1px solid var(--brand-primary); color:var(--brand-primary); padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;" onclick="verDetalleMantencionConductor(${i})">Ver</button></td>
                    `;
                    tbodyMant.appendChild(tr);
                });
            }
        }

    } catch (error) {
        console.error('Error cargando historiales del conductor', error);
    }
}

window.verDetalleReporte = function(index) {
    const rep = window.currentDriverReports[index];
    if(!rep) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Fecha:</strong> ${formatDate(rep.fecha)}</div>
            <div><strong>Móvil:</strong> ${rep.movil}</div>
            <div><strong>Kilometraje:</strong> ${rep.kilometraje}</div>
            <div><strong>Fundo:</strong> ${rep.fundo}</div>
            <div><strong>Destino:</strong> ${rep.destino}</div>
            <div><strong>Sector Faena:</strong> ${rep.faena}</div>
            <div><strong>Peaje:</strong> ${rep.peaje || '-'}</div>
            <div><strong>Romana:</strong> ${rep.romana || '-'}</div>
            <div><strong>N° Guía:</strong> ${rep.guia || '-'}</div>
            <div><strong>Viático:</strong> ${rep.viatico || '-'}</div>
            <div><strong>Total Extra:</strong> ${rep.total || '-'}</div>
        </div>
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
            <strong>Observaciones:</strong><br>
            ${rep.observaciones || 'Sin observaciones'}
        </div>
    `;

    if (rep.imagen) {
        html += `<strong>Evidencia:</strong><br><img src="${rep.imagen}" alt="Hoja de Ruta" style="max-width:100%; border-radius:var(--radius-md); margin-top:1rem;">`;
    }

    openModal('Detalle Mi Reporte', html);
};

window.verDetalleMantencionConductor = function(index) {
    const mant = window.currentDriverMants[index];
    if(!mant) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Fecha:</strong> ${formatDate(mant.fecha)}</div>
            <div><strong>Reportado por:</strong> ${mant.driver}</div>
            <div><strong>Tipo:</strong> ${mant.tipo || '-'}</div>
            <div><strong>Kilometraje:</strong> ${mant.kilometraje || '-'}</div>
        </div>
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
            <strong>Descripción / Móvil:</strong><br>
            ${mant.descripcion || 'Sin descripción'}
        </div>
    `;

    if (mant.imagen) {
        html += `<strong>Evidencia:</strong><br><img src="${mant.imagen}" alt="Mantención" style="max-width:100%; border-radius:var(--radius-md); margin-top:1rem;">`;
    }

    openModal('Detalle Mantención', html);
};

document.addEventListener('DOMContentLoaded', () => {
    // Configurar fecha actual
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-ES', dateOpts);

    const user = JSON.parse(localStorage.getItem('serfover_user'));
    if (user && document.getElementById('dashDriverName')) {
        document.getElementById('dashDriverName').textContent = user.name;
    }

    // Configurar mes por defecto en el historial
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const driverMonthFilter = document.getElementById('driverMonthFilter');
    if (driverMonthFilter) driverMonthFilter.value = currentMonth;
    const driverMantMonthFilter = document.getElementById('driverMantMonthFilter');
    if (driverMantMonthFilter) driverMantMonthFilter.value = currentMonth;
    
    // Cargar historial
    loadDriverHistory();

    // --- Calcular Alertas de Mantención ---
    async function loadAlerts() {
        if (!user) return;
        try {
            const data = await API.getData();
            if (!data) return;

            // 1. Encontrar el móvil actual del conductor
            let misReps = (data.reportes || []).filter(r => r.driver === user.name).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
            let miMovil = misReps.length > 0 ? misReps[0].movil : null;

            if (!miMovil) return; // No tiene móvil asignado

            let maxKm = 0;
            // Buscar maxKm para ESTE MÓVIL
            (data.reportes || []).forEach(r => {
                if (r.movil && r.movil.toLowerCase() === miMovil.toLowerCase() && parseInt(r.kilometraje) > maxKm) maxKm = parseInt(r.kilometraje);
            });
            (data.combustibles || []).forEach(c => {
                const movilC = getMovilFromDesc(c.descripcion); // combustible a veces no tiene movil a menos que se fuerce, pero en reportes es más seguro. Si el combustible tiene el driver, asumimos que es el del movil.
                // En combustible actual no guardamos movil explícito salvo que saquemos del driver
                if (c.driver === user.name && parseInt(c.kilometraje) > maxKm) maxKm = parseInt(c.kilometraje);
            });
            (data.mantenciones || []).forEach(m => {
                const movilM = getMovilFromDesc(m.descripcion);
                if (movilM && movilM.toLowerCase() === miMovil.toLowerCase() && parseInt(m.kilometraje) > maxKm) maxKm = parseInt(m.kilometraje);
            });

            // Encontrar último cambio de aceite PARA ESTE MÓVIL
            let lastOilKm = 0;
            if (data.mantenciones) {
                const oilMants = data.mantenciones.filter(m => {
                    const movilM = getMovilFromDesc(m.descripcion);
                    const isMyTruck = (movilM && movilM.toLowerCase() === miMovil.toLowerCase()) || (m.driver === user.name);
                    return isMyTruck && m.tipo === 'Cambio de Aceite';
                });

                if (oilMants.length > 0) {
                    oilMants.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
                    lastOilKm = parseInt(oilMants[0].kilometraje) || 0;
                }
            }

            const diff = maxKm - lastOilKm;
            const container = document.getElementById('driverAlertsContainer');
            if (!container) return;

            container.innerHTML = ''; // Limpiar

            if (diff >= 35000 && diff < 40000) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 1rem; border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: #f59e0b; font-weight: bold; margin-bottom: 0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            Mantenimiento Preventivo (Móvil: ${miMovil})
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Tu móvil actual lleva <strong>${diff.toLocaleString('es-CL')} km</strong> desde el último cambio de aceite (Realizado a los ${lastOilKm.toLocaleString('es-CL')} km). Se recomienda programar cambio a los 40.000 km.</p>
                    </div>
                `;
            } else if (diff >= 40000) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 1rem; border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: #ef4444; font-weight: bold; margin-bottom: 0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ¡CAMBIO DE ACEITE URGENTE! (Móvil: ${miMovil})
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Tu móvil actual ha superado los 40.000 km desde el último cambio (lleva <strong>${diff.toLocaleString('es-CL')} km</strong>). Comunícate con el mecánico a la brevedad.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando alertas', error);
        }
    }

    // Cargar alertas solo si estamos en la vista de conductor (por si acaso este script se reusa)
    if (document.getElementById('tab-inicio')) {
        loadAlerts();
    }

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
                viatico: document.getElementById('repViatico').value,
                total: document.getElementById('repTotal').value,
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
