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

    // Activar botón bottom nav (Mobile HUD)
    document.querySelectorAll('.bnav-item').forEach(el => el.classList.remove('active'));
    const activeBnav = Array.from(document.querySelectorAll('.bnav-item')).find(el => el.getAttribute('data-tab') === tabId);
    if(activeBnav) activeBnav.classList.add('active');

    const titles = {
        'inicio': 'Panel de Inicio',
        'muro': 'Muro del Equipo',
        'mantencion': 'Registrar Mantención',
        'historial': 'Historial de Mantenciones'
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
    let alertCount = 0;

    Object.values(fleetMap).forEach(truck => {
        if (truck.lastOilKm > 0) {
            const diff = truck.maxKm - truck.lastOilKm;
            if (diff >= 35000) {
                hasAlerts = true;
                alertCount++;
                const alertDiv = document.createElement('div');
                
                if (diff >= 40000) {
                    alertDiv.className = 'alert-cockpit alert-cockpit--critical';
                    alertDiv.innerHTML = `
                        <div class="alert-label">CRÍTICO: Cambio de Aceite</div>
                        <p style="color: var(--text-primary);">Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio (Límite 40.000).</p>
                    `;
                } else {
                    alertDiv.className = 'alert-cockpit';
                    alertDiv.innerHTML = `
                        <div class="alert-label">ADVERTENCIA: Mantención Próxima</div>
                        <p style="color: var(--text-primary);">Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio. Prepárese para cambio a los 40.000 km.</p>
                    `;
                }
                alertsContainer.appendChild(alertDiv);
            }
        }
    });

    const statAlertas = document.getElementById('mechStatAlertas');
    if (statAlertas) statAlertas.textContent = alertCount;

    if (hasAlerts) {
        alertsContainer.style.display = 'flex';
        alertsTitle.style.display = 'block';
    } else {
        alertsContainer.style.display = 'none';
        alertsTitle.style.display = 'none';
    }
}

async function loadMechanicData() {
    const setCargando = (id) => {
        const el = document.getElementById(id);
        if (el && (el.textContent.trim() === '0' || el.textContent.trim() === '-')) {
            el.innerHTML = '<span style="font-size: 0.9rem; color: var(--text-muted);">Cargando...</span>';
        }
    };
    ['mechStatMant', 'mechStatTopTipo', 'mechStatAlertas', 'mechStatTopMovil'].forEach(setCargando);

    try {
        const data = await API.getData();
        if (!data) return;

        // Calcular y mostrar alertas
        checkFleetAlerts(data);

        const monthVal = document.getElementById('monthFilter').value; // Formato YYYY-MM
        const user = JSON.parse(localStorage.getItem('serfover_user'));

        let misMantenciones = data.mantenciones || [];

        // Pre-procesar móvil y origen para filtrado
        misMantenciones = misMantenciones.map(m => {
            let movil = 'Desconocido';
            if (m.descripcion && m.descripcion.includes('Móvil:')) {
                const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
                if (match && match[1]) movil = match[1].trim();
            } else if (m.movil || m._movil) {
                movil = m.movil || m._movil;
            }
            
            const driverStr = m.driver || '';
            const isMech = driverStr.startsWith('Mecánico') || (m.descripcion && m.descripcion.includes('Móvil:'));
            const origen = isMech ? 'mecanico' : 'conductor';

            return { ...m, _parsedMovil: movil, _parsedOrigen: origen };
        });

        const movilVal = document.getElementById('movilFilter') ? document.getElementById('movilFilter').value.toLowerCase().trim() : '';
        const driverVal = document.getElementById('driverFilter') ? document.getElementById('driverFilter').value : '';

        if (monthVal) {
            const [year, month] = monthVal.split('-');
            misMantenciones = misMantenciones.filter(m => {
                const d = new Date(m.fecha);
                return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
            });
        }
        
        if (movilVal) {
            misMantenciones = misMantenciones.filter(m => m._parsedMovil.toLowerCase().includes(movilVal));
        }

        if (driverVal) {
            misMantenciones = misMantenciones.filter(m => m._parsedOrigen === driverVal);
        }

        misMantenciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        window.currentMants = misMantenciones;

        const nowStat = new Date();
        const currentYearStat = nowStat.getFullYear();
        const currentMonthStat = nowStat.getMonth();
        
        let totalMantMes = 0;
        const typesCountStats = {};
        const movilCountStats = {};

        (data.mantenciones || []).forEach(m => {
            const d = new Date(m.fecha);
            if (d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                totalMantMes++;
                const tipo = m.tipo || 'General/Otros';
                typesCountStats[tipo] = (typesCountStats[tipo] || 0) + 1;
                
                let movil = m.movil || m._movil || 'Desconocido';
                if(movil === 'Desconocido' && m.descripcion && m.descripcion.includes('Móvil:')) {
                    const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
                    if (match && match[1]) movil = match[1].trim();
                }
                if (movil !== 'Desconocido') {
                    movilCountStats[movil] = (movilCountStats[movil] || 0) + 1;
                }
            }
        });

        const elStatMant = document.getElementById('mechStatMant');
        if (elStatMant) elStatMant.textContent = totalMantMes;

        const topTipoStats = Object.entries(typesCountStats).sort((a,b) => b[1] - a[1])[0];
        const elStatTopTipo = document.getElementById('mechStatTopTipo');
        if (elStatTopTipo) {
            elStatTopTipo.textContent = topTipoStats ? topTipoStats[0] : '-';
        }

        const topMovilStats = Object.entries(movilCountStats).sort((a,b) => b[1] - a[1])[0];
        const elStatTopMovil = document.getElementById('mechStatTopMovil');
        if (elStatTopMovil) {
            elStatTopMovil.textContent = topMovilStats ? topMovilStats[0] : '-';
        }

        const tbody = document.querySelector('#tableHistorial tbody');
        tbody.innerHTML = '';

        if (misMantenciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No se encontraron mantenciones para este periodo.</td></tr>';
            return;
        }

        misMantenciones.forEach((m, i) => {
            const movil = m._parsedMovil || 'No especificado';
            const origen = m._parsedOrigen === 'mecanico' ? 'Mecánico' : 'Conductor';
            const origenColor = m._parsedOrigen === 'mecanico' ? 'var(--brand-secondary)' : 'var(--brand-primary)';

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
    // Eliminar el filtro por defecto del mes para mostrar todo
    document.getElementById('monthFilter').value = '';
    
    loadMechanicData();

    // --- Enviar Mantención Mecánico ---
    document.getElementById('formMantencionMech').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('mantStatusMech');
        statusEl.style.display = 'none';
        window.setBtnLoading('btnSubmitMantMech', true);

        const user = JSON.parse(localStorage.getItem('serfover_user'));

        try {
            const imageFile = document.getElementById('mantImagenMech').files[0];
            const base64Image = await getBase64(imageFile);

            // Recopilar checklist
            const checklistBtns = document.querySelectorAll('#mechChecklist .btn');
            let checklistSummary = '';
            checklistBtns.forEach(btn => {
                const text = btn.innerText;
                if(text.includes('✅') || text.includes('❌')) {
                    checklistSummary += text + ' | ';
                }
            });

            const finalDescription = `${checklistSummary ? '[Checklist: ' + checklistSummary + ']\\n' : ''}Móvil: ${document.getElementById('mantMovil').value}. Conductor: ${document.getElementById('mantConductor').value || 'Desconocido'}. ` + document.getElementById('mantDesc').value;

            const payload = {
                type: 'mantencion',
                // Enviamos como driver el nombre del mecánico para asegurar el origen
                driver: 'Mecánico - ' + (user ? user.name : 'Desc'),
                tipo: document.getElementById('mantTipo').value,
                kilometraje: document.getElementById('mantKm').value,
                descripcion: finalDescription,
                valor: 0, // Mecánico no ingresa costo
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            window.setBtnLoading('btnSubmitMantMech', false, 'Registrar Mantención');
            showToast('¡Mantención registrada con éxito!', 'success');
            document.getElementById('formMantencionMech').reset();
            document.getElementById('mantPreviewMech').style.display = 'none';
            
            // Recargar datos
            loadMechanicData();
        } catch (error) {
            window.setBtnLoading('btnSubmitMantMech', false, 'Registrar Mantención');
            showToast('Error al guardar: ' + error.message, 'error');
        }
    });
});

// --- Funciones UX Mecánico ---


function toggleChecklist(itemName, btn) {
    const currentText = btn.innerText;
    if (currentText.includes('⚪')) {
        btn.innerText = `✅ ${itemName}`;
        btn.style.borderColor = 'var(--brand-primary)';
        btn.style.background = 'rgba(16,185,129,0.1)';
    } else if (currentText.includes('✅')) {
        btn.innerText = `❌ ${itemName}`;
        btn.style.borderColor = 'var(--accent-danger)';
        btn.style.background = 'rgba(239,68,68,0.1)';
    } else {
        btn.innerText = `⚪ ${itemName}`;
        btn.style.borderColor = 'var(--text-secondary)';
        btn.style.background = 'var(--glass-bg)';
    }
}
