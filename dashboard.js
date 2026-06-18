// Lógica del Dashboard del Dueño

function switchDashTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const tablesContainer = document.getElementById('tablesContainer');
    if (tabId === 'inicio') {
        if(tablesContainer) tablesContainer.style.display = 'none';
        document.getElementById('dash-inicio').classList.add('active');
    } else {
        if(tablesContainer) tablesContainer.style.display = 'block';
        document.getElementById('dash-inicio').classList.remove('active');
        document.getElementById('dash-' + tabId).classList.add('active');
    }
    
    // Activar en el sidebar (menú lateral) si existe un elemento
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') === `switchDashTab('${tabId}')`);
    if(activeNav) activeNav.classList.add('active');
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

// Formatear moneda
function formatMoney(amount) {
    return '$' + Number(amount).toLocaleString('es-CL');
}

// Formatear fecha
function formatDate(isoString) {
    if (!isoString) return 'Sin fecha';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
}

window.currentData = {
    reportes: [],
    combustibles: [],
    mantenciones: []
};

async function loadData() {
    try {
        const data = await API.getData();
        if (!data) return;

        const filterVal = 'ALL';

        // 1. Identificar Móvil por Conductor y poblar filtros
        const driverMovilMap = {};
        const uniqueDrivers = new Set();
        const uniqueMoviles = new Set();

        if (data.reportes) {
            data.reportes.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).forEach(r => {
                if (r.driver) uniqueDrivers.add(r.driver);
                if (r.movil) {
                    uniqueMoviles.add(r.movil);
                    driverMovilMap[r.driver] = r.movil; 
                }
            });
        }
        
        // Agregar "Mecánicos" a los conductores si existen
        if (data.mantenciones) {
            data.mantenciones.forEach(m => {
                if (m.driver && m.driver.startsWith('Mecánico -')) {
                    uniqueDrivers.add(m.driver);
                }
                // Intentar extraer el móvil de la descripción si fue hecho por mecánico
                if (m.descripcion && m.descripcion.includes('Móvil:')) {
                    const match = m.descripcion.match(/Móvil:\s*([^.]+)\./);
                    if (match && match[1]) {
                        uniqueMoviles.add(match[1].trim());
                    }
                }
            });
        }

        // 2. Construir Resumen de Flota (Global, sin filtrar para que se vean todos los camiones)
        const fleetMap = {};
        
        // Función auxiliar para obtener el móvil de un registro
        const getMovilForRecord = (record, type) => {
            if (type === 'reporte' && record.movil) return record.movil;
            if (type === 'mantencion' && record.descripcion && record.descripcion.includes('Móvil:')) {
                const match = record.descripcion.match(/Móvil:\s*([^.]+)\./);
                if (match && match[1]) return match[1].trim();
            }
            return driverMovilMap[record.driver] || 'Sin Asignar';
        };

        const allRecords = [
            ...(data.reportes || []).map((r, index) => ({...r, id: r.id || index + 2, _type: 'reporte', _movil: getMovilForRecord(r, 'reporte')})),
            ...(data.combustibles || []).map((c, index) => ({...c, id: c.id || index + 2, _type: 'combustible', _movil: getMovilForRecord(c, 'combustible')})),
            ...(data.mantenciones || []).map((m, index) => ({...m, id: m.id || index + 2, _type: 'mantencion', _movil: getMovilForRecord(m, 'mantencion')}))
        ];

        allRecords.forEach(rec => {
            const m = rec._movil;
            if (m === 'Sin Asignar') return;
            
            if (!fleetMap[m]) fleetMap[m] = { movil: m, driver: rec.driver, maxKm: 0, lastOilKm: 0, gastos: 0 };
            
            const km = Number(rec.kilometraje) || 0;
            if (km > fleetMap[m].maxKm) {
                fleetMap[m].maxKm = km;
                if (rec._type === 'reporte') fleetMap[m].driver = rec.driver; // Actualizar con el último conductor
            }

            if (rec._type === 'mantencion' && rec.tipo === 'Cambio de Aceite' && km > fleetMap[m].lastOilKm) {
                fleetMap[m].lastOilKm = km;
            }

            if (rec._type === 'combustible' || rec._type === 'mantencion') {
                fleetMap[m].gastos += Number(rec.valor || 0);
            }
        });

        const tbodyFlota = document.querySelector('#tableFlota tbody');
        tbodyFlota.innerHTML = '';
        Object.values(fleetMap).forEach(v => {
            const diff = v.maxKm - v.lastOilKm;
            let statusHtml = '<span style="color: var(--accent-success);">OK</span>';
            if (v.lastOilKm > 0) {
                if (diff >= 40000) statusHtml = '<span style="color: var(--accent-danger); font-weight: bold;">⚠️ VENCIDA</span>';
                else if (diff >= 35000) statusHtml = '<span style="color: var(--accent-warning); font-weight: bold;">🔔 PRÓXIMA</span>';
            } else {
                 statusHtml = '<span style="color: var(--text-secondary);">Sin Info</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Móvil"><strong>${v.movil}</strong></td>
                <td data-label="Conductor">${v.driver}</td>
                <td data-label="Kilometraje">${v.maxKm.toLocaleString('es-CL')} km</td>
                <td data-label="Última Mant.">${v.lastOilKm > 0 ? v.lastOilKm.toLocaleString('es-CL') + ' km' : 'No registrado'}</td>
                <td data-label="Gastos" style="color: var(--accent-danger); font-weight: 600;">${formatMoney(v.gastos)}</td>
                <td data-label="Estado">${statusHtml}</td>
            `;
            tbodyFlota.appendChild(tr);
        });

        // 3. Filtrar datos para las tablas detalladas
        let filteredReportes = allRecords.filter(r => r._type === 'reporte');
        let filteredComb = allRecords.filter(r => r._type === 'combustible');
        let filteredMant = allRecords.filter(r => r._type === 'mantencion');

        if (filterVal !== 'ALL') {
            const [fType, fValue] = filterVal.split(':');
            if (fType === 'DRIVER') {
                filteredReportes = filteredReportes.filter(r => r.driver === fValue);
                filteredComb = filteredComb.filter(r => r.driver === fValue);
                filteredMant = filteredMant.filter(r => r.driver === fValue);
            } else if (fType === 'MOVIL') {
                filteredReportes = filteredReportes.filter(r => r._movil === fValue);
                filteredComb = filteredComb.filter(r => r._movil === fValue);
                filteredMant = filteredMant.filter(r => r._movil === fValue);
            }
        }

        // Ordenar del más reciente al más antiguo
        filteredReportes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        filteredComb.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        filteredMant.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

        // --- Render Owner Alerts ---
        const alertsContainer = document.getElementById('ownerAlertsContainer');
        if (alertsContainer) {
            // Limpiar alertas
            const existingAlerts = alertsContainer.querySelectorAll('.alert-box');
            existingAlerts.forEach(el => el.remove());

            let hasAlerts = false;

            // 1. Alertas de Aceite
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

            // 2. Últimas 3 Mantenciones Recientes
            if (filteredMant && filteredMant.length > 0) {
                hasAlerts = true;
                const recentMants = filteredMant.slice(0, 3);
                
                const mantDiv = document.createElement('div');
                mantDiv.className = 'alert-box';
                mantDiv.style.padding = '1rem';
                mantDiv.style.borderRadius = 'var(--radius-md)';
                mantDiv.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                mantDiv.style.border = '1px solid var(--brand-secondary)';
                
                let mantHtml = `<h5 style="color: var(--brand-secondary); margin-bottom: 0.5rem; font-size: 0.95rem;">Últimas Mantenciones Registradas:</h5><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem;">`;
                
                recentMants.forEach(m => {
                    const origen = (m.driver && m.driver.startsWith('Mecánico')) ? 'Mecánico' : 'Conductor';
                    mantHtml += `<li style="margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <strong>${origen}</strong> registró <em>${m.tipo}</em> para el Móvil <strong>${m._movil}</strong> <br>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(m.fecha)} - Reportado por: ${m.driver}</span>
                    </li>`;
                });
                
                mantHtml += `</ul>`;
                mantDiv.innerHTML = mantHtml;
                alertsContainer.appendChild(mantDiv);
            }

            if (hasAlerts) {
                alertsContainer.style.display = 'flex';
                document.getElementById('ownerAlertsTitle').style.display = 'block';
            } else {
                alertsContainer.style.display = 'none';
                document.getElementById('ownerAlertsTitle').style.display = 'none';
            }
        }

        // Guardar para los modales
        window.currentData = {
            reportes: filteredReportes,
            combustibles: filteredComb,
            mantenciones: filteredMant
        };

        let totalGastos = 0;
        let totalViajes = filteredReportes.length;

        // --- Render Reportes ---
        const tbodyRep = document.querySelector('#tableReportes tbody');
        tbodyRep.innerHTML = '';
        filteredReportes.forEach((rep, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Fecha">${formatDate(rep.fecha)}</td>
                <td data-label="Conductor"><span class="driver-badge">${rep.driver}</span></td>
                <td data-label="Móvil"><strong>${rep._movil}</strong></td>
                <td data-label="Destino">${rep.fundo} / ${rep.destino}</td>
                <td data-label="N° Guía">${rep.guia || '-'}</td>
                <td data-label="Acción"><button class="view-btn" onclick="verReporte(${i})">Ver</button></td>
            `;
            tbodyRep.appendChild(tr);
        });

        // --- Render Combustible ---
        const tbodyComb = document.querySelector('#tableCombustible tbody');
        tbodyComb.innerHTML = '';
        filteredComb.forEach((comb, i) => {
            totalGastos += Number(comb.valor || 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Fecha">${formatDate(comb.fecha)}</td>
                <td data-label="Conductor"><span class="driver-badge">${comb.driver}</span></td>
                <td data-label="Móvil"><strong>${comb._movil}</strong></td>
                <td data-label="Litros">${comb.litros} L</td>
                <td data-label="Kilometraje">${comb.kilometraje} km</td>
                <td data-label="Costo"><span style="color:var(--accent-danger);">${formatMoney(comb.valor)}</span></td>
                <td data-label="Acción"><button class="view-btn" onclick="verCombustible(${i})">Ver</button></td>
            `;
            tbodyComb.appendChild(tr);
        });

        // --- Render Mantenciones ---
        const tbodyMant = document.querySelector('#tableMantencion tbody');
        tbodyMant.innerHTML = '';
        filteredMant.forEach((mant, i) => {
            totalGastos += Number(mant.valor || 0);
            
            let origen = "Conductor";
            let origenColor = "var(--brand-secondary)";
            if (mant.driver && mant.driver.startsWith("Mecánico")) {
                origen = "Mecánico";
                origenColor = "var(--brand-primary)";
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Fecha">${formatDate(mant.fecha)}</td>
                <td data-label="Conductor"><span class="driver-badge">${mant.driver}</span></td>
                <td data-label="Móvil"><strong>${mant._movil}</strong></td>
                <td data-label="Origen"><span style="color: ${origenColor}; font-weight: bold; font-size: 0.8rem; border: 1px solid ${origenColor}; padding: 0.2rem 0.4rem; border-radius: 4px;">${origen}</span></td>
                <td data-label="Descripción">${mant.descripcion.substring(0, 40)}...</td>
                <td data-label="Costo"><span style="color:var(--accent-danger);">${formatMoney(mant.valor)}</span></td>
                <td data-label="Acción"><button class="view-btn" onclick="verMantencion(${i})">Ver</button></td>
            `;
            tbodyMant.appendChild(tr);
        });

        // --- Update Stats ---
        document.getElementById('statViajes').textContent = totalViajes;
        document.getElementById('statGastos').textContent = formatMoney(totalGastos);

    } catch (error) {
        console.error('Error cargando datos', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});
window.verReporte = function(index) {
    const rep = window.currentData.reportes[index];
    if(!rep) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Conductor:</strong> ${rep.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(rep.fecha)}</div>
            <div><strong>Móvil:</strong> ${rep._movil}</div>
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
        html += `<strong>Evidencia:</strong><br><img src="${rep.imagen}" alt="Hoja de Ruta">`;
    }

    if (rep.id) {
        html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem; text-align: right;">
            <button onclick="deleteRecord('reporte', ${rep.id})" class="btn" style="background-color: var(--accent-danger); color: white; border: none; padding: 0.5rem 1rem; cursor: pointer;">🗑️ Eliminar Reporte</button>
        </div>`;
    }

    openModal('Detalle Hoja de Ruta', html);
};

window.verCombustible = function(index) {
    const comb = window.currentData.combustibles[index];
    if(!comb) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Conductor:</strong> ${comb.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(comb.fecha)}</div>
            <div><strong>Móvil:</strong> ${comb._movil}</div>
            <div><strong>Litros:</strong> ${comb.litros} L</div>
            <div><strong>Kilometraje:</strong> ${comb.kilometraje} km</div>
            <div><strong>Costo Total:</strong> <span style="color:var(--accent-danger); font-weight:bold;">${formatMoney(comb.valor)}</span></div>
        </div>
    `;

    if (comb.imagen) {
        html += `<strong>Comprobante:</strong><br><img src="${comb.imagen}" alt="Comprobante Combustible">`;
    }

    if (comb.id) {
        html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem; text-align: right;">
            <button onclick="deleteRecord('combustible', ${comb.id})" class="btn" style="background-color: var(--accent-danger); color: white; border: none; padding: 0.5rem 1rem; cursor: pointer;">🗑️ Eliminar Registro</button>
        </div>`;
    }

    openModal('Detalle Combustible', html);
};

window.verMantencion = function(index) {
    const mant = window.currentData.mantenciones[index];
    if(!mant) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Reportado por:</strong> ${mant.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(mant.fecha)}</div>
            <div><strong>Móvil:</strong> ${mant._movil}</div>
            <div><strong>Costo Total:</strong> <span style="color:var(--accent-danger); font-weight:bold;">${formatMoney(mant.valor)}</span></div>
        </div>
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
            <strong>Descripción:</strong><br>
            ${mant.descripcion}
        </div>
    `;

    if (mant.imagen) {
        html += `<strong>Evidencia:</strong><br><img src="${mant.imagen}" alt="Mantención">`;
    }

    if (mant.id) {
        html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem; text-align: right;">
            <button onclick="deleteRecord('mantencion', ${mant.id})" class="btn" style="background-color: var(--accent-danger); color: white; border: none; padding: 0.5rem 1rem; cursor: pointer;">🗑️ Eliminar Mantención</button>
        </div>`;
    }

    openModal('Detalle Mantención', html);
};

window.deleteRecord = async function(type, id) {
    if (confirm("¿Estás seguro de que quieres eliminar este registro de la base de datos de forma permanente?")) {
        const btn = document.querySelector('#detailModal .btn');
        if (btn) btn.textContent = "Eliminando...";
        try {
            await API.deleteData(type, id);
            alert("Registro eliminado exitosamente.");
            closeModal();
            loadData(); // Recargar datos
        } catch (e) {
            alert("Hubo un error al eliminar. Inténtalo de nuevo.");
            if (btn) btn.textContent = "🗑️ Eliminar";
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});
