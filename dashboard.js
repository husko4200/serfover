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

            // 1. Alertas de Aceite y Actividad
            const today = new Date();
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 3);

            // Set para buscar inactividad
            const activeDrivers = new Set();
            if (filteredReportes) {
                filteredReportes.forEach(r => {
                    const rDate = new Date(r.fecha);
                    if (rDate >= threeDaysAgo) {
                        activeDrivers.add(r.driver);
                    }
                });
            }

            // Alerta de inactividad de conductores
            const allDrivers = new Set(Object.values(fleetMap).map(t => t.driver));
            allDrivers.forEach(d => {
                if (!d || d === 'Dueño' || d.startsWith('Mecánico') || d === 'Mecanico') return;
                if (!activeDrivers.has(d)) {
                    hasAlerts = true;
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert-box';
                    alertDiv.style.padding = '1rem';
                    alertDiv.style.borderRadius = 'var(--radius-md)';
                    alertDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    alertDiv.style.color = 'var(--accent-danger)';
                    alertDiv.style.border = '1px solid var(--accent-danger)';
                    alertDiv.innerHTML = `⚠️ ATENCIÓN - El conductor <strong>${d}</strong> no ha subido reportes en los últimos 3 días.`;
                    alertsContainer.appendChild(alertDiv);
                }
            });

            Object.values(fleetMap).forEach(truck => {
                if (truck.lastOilKm > 0) {
                    const diff = truck.maxKm - truck.lastOilKm;
                    if (diff >= 14000) {
                        hasAlerts = true;
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert-box';
                        alertDiv.style.padding = '1rem';
                        alertDiv.style.borderRadius = 'var(--radius-md)';
                        alertDiv.style.fontWeight = 'bold';
                        
                        if (diff >= 15000) {
                            alertDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            alertDiv.style.color = 'var(--accent-danger)';
                            alertDiv.style.border = '1px solid var(--accent-danger)';
                            alertDiv.innerHTML = `🚨 URGENTE - Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio de aceite (Límite 15.000).`;
                        } else {
                            alertDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                            alertDiv.style.color = 'var(--accent-warning)';
                            alertDiv.style.border = '1px solid var(--accent-warning)';
                            alertDiv.innerHTML = `⚠️ AVISO - Camión <strong>${truck.movil}</strong>: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio de aceite. Prepárese para cambio a los 15.000 km.`;
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

        // --- Render Reportes ---
        const tbodyRep = document.querySelector('#tableReportes tbody');
        if (tbodyRep) {
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
        }

        // --- Render Combustible ---
        const tbodyComb = document.querySelector('#tableCombustible tbody');
        if (tbodyComb) {
            tbodyComb.innerHTML = '';
            filteredComb.forEach((comb, i) => {
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
        }

        // --- Render Mantenciones ---
        const tbodyMant = document.querySelector('#tableMantencion tbody');
        if (tbodyMant) {
            tbodyMant.innerHTML = '';
            filteredMant.forEach((mant, i) => {
                let origen = "Conductor";
                let origenColor = "var(--brand-secondary)";
                if ((mant.driver && mant.driver.startsWith("Mecánico")) || (mant.descripcion && mant.descripcion.includes('Móvil:'))) {
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
        }

        // --- Update Stats and Calculate Trends ---
        const now = new Date();
        const currentMonthNum = now.getMonth();
        const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;

        let totalCombustible = 0, prevCombustible = 0;
        let totalMantencion = 0, prevMantencion = 0;
        let totalOtrosGastos = 0, prevOtrosGastos = 0;
        let totalViajes = 0, prevViajes = 0;
        let totalCantMant = 0, prevCantMant = 0;

        let truckFuelMap = {};
        let truckTripsMap = {};
        let driverTripsMap = {};

        filteredReportes.forEach(rep => {
            const d = new Date(rep.fecha);
            if (d.getMonth() === currentMonthNum) {
                totalOtrosGastos += Number(rep.peaje || 0) + Number(rep.romana || 0) + Number(rep.viatico || 0) + Number(rep.total || 0);
                totalViajes++;
                // Ranking vars
                truckTripsMap[rep._movil] = (truckTripsMap[rep._movil] || 0) + 1;
                driverTripsMap[rep.driver] = (driverTripsMap[rep.driver] || 0) + 1;
            } else if (d.getMonth() === prevMonthNum) {
                prevOtrosGastos += Number(rep.peaje || 0) + Number(rep.romana || 0) + Number(rep.viatico || 0) + Number(rep.total || 0);
                prevViajes++;
            }
        });

        filteredComb.forEach(comb => {
            const d = new Date(comb.fecha);
            if (d.getMonth() === currentMonthNum) {
                totalCombustible += Number(comb.valor || 0);
                truckFuelMap[comb._movil] = (truckFuelMap[comb._movil] || 0) + Number(comb.valor || 0);
            } else if (d.getMonth() === prevMonthNum) {
                prevCombustible += Number(comb.valor || 0);
            }
        });

        filteredMant.forEach(mant => {
            const d = new Date(mant.fecha);
            if (d.getMonth() === currentMonthNum) {
                totalMantencion += Number(mant.valor || 0);
                totalCantMant++;
            } else if (d.getMonth() === prevMonthNum) {
                prevMantencion += Number(mant.valor || 0);
                prevCantMant++;
            }
        });

        // Function to set trend HTML
        const setTrend = (elId, current, prev, inverse = false) => {
            const el = document.getElementById(elId);
            if(!el) return;
            if (prev === 0) { el.textContent = 'Sin datos previos'; return; }
            const diff = current - prev;
            const percent = Math.round((Math.abs(diff) / prev) * 100);
            if (diff > 0) {
                el.innerHTML = `<span style="color: ${inverse ? 'var(--accent-danger)' : 'var(--brand-primary)'}; font-weight: bold;">🔼 ${percent}%</span> más que el mes pasado`;
            } else if (diff < 0) {
                el.innerHTML = `<span style="color: ${inverse ? 'var(--brand-primary)' : 'var(--accent-danger)'}; font-weight: bold;">🔻 ${percent}%</span> menos que el mes pasado`;
            } else {
                el.textContent = 'Igual al mes pasado';
            }
        };

        document.getElementById('statViajes').textContent = totalViajes;
        setTrend('trendViajes', totalViajes, prevViajes, false);

        if (document.getElementById('statCantMantenciones')) {
            document.getElementById('statCantMantenciones').textContent = totalCantMant;
            setTrend('trendCantMant', totalCantMant, prevCantMant, false);
        }

        document.getElementById('statCombustible').textContent = formatMoney(totalCombustible);
        setTrend('trendCombustible', totalCombustible, prevCombustible, true);

        document.getElementById('statMantencion').textContent = formatMoney(totalMantencion);
        setTrend('trendMantencion', totalMantencion, prevMantencion, true);

        document.getElementById('statOtrosGastos').textContent = formatMoney(totalOtrosGastos);
        setTrend('trendOtros', totalOtrosGastos, prevOtrosGastos, true);

        // --- Render Rankings ---
        const topFuelTruck = Object.entries(truckFuelMap).sort((a, b) => b[1] - a[1])[0];
        if (topFuelTruck && document.getElementById('rankTopFuelTruck')) {
            document.getElementById('rankTopFuelTruck').textContent = topFuelTruck[0];
            document.getElementById('rankTopFuelValue').textContent = formatMoney(topFuelTruck[1]) + ' gastados';
        }

        const topTripsTruck = Object.entries(truckTripsMap).sort((a, b) => b[1] - a[1])[0];
        if (topTripsTruck && document.getElementById('rankMostTripsTruck')) {
            document.getElementById('rankMostTripsTruck').textContent = topTripsTruck[0];
            document.getElementById('rankMostTripsValue').textContent = topTripsTruck[1] + ' viajes';
        }

        const topDriver = Object.entries(driverTripsMap).sort((a, b) => b[1] - a[1])[0];
        if (topDriver && document.getElementById('rankTopDriver')) {
            document.getElementById('rankTopDriver').textContent = topDriver[0];
            document.getElementById('rankTopDriverValue').textContent = topDriver[1] + ' viajes';
        }

        // --- Render Charts (Chart.js) ---
        if (window.myExpensesChart) window.myExpensesChart.destroy();
        const ctxEx = document.getElementById('expensesChart');
        if (ctxEx) {
            const hasData = (totalCombustible + totalMantencion + totalOtrosGastos) > 0;
            const cData = hasData ? [totalCombustible, totalMantencion, totalOtrosGastos] : [1];
            const cLabels = hasData ? ['Combustible', 'Mantenciones', 'Otros Gastos'] : ['Sin Gastos Este Mes'];
            const cColors = hasData ? ['#ef4444', '#f59e0b', '#10b981'] : ['#e2e8f0'];

            window.myExpensesChart = new Chart(ctxEx, {
                type: 'doughnut',
                data: {
                    labels: cLabels,
                    datasets: [{
                        data: cData,
                        backgroundColor: cColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (!hasData) return ' $0';
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    label += formatMoney(context.raw);
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Trips Chart (Last 6 months)
        if (window.myTripsChart) window.myTripsChart.destroy();
        const ctxTrips = document.getElementById('tripsChart');
        if (ctxTrips) {
            const monthsLabel = [];
            const tripsData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthsLabel.push(d.toLocaleDateString('es-CL', { month: 'short' }));
                const monthTrips = filteredReportes.filter(r => new Date(r.fecha).getMonth() === d.getMonth() && new Date(r.fecha).getFullYear() === d.getFullYear()).length;
                tripsData.push(monthTrips);
            }
            window.myTripsChart = new Chart(ctxTrips, {
                type: 'bar',
                data: {
                    labels: monthsLabel,
                    datasets: [{
                        label: 'Viajes Realizados',
                        data: tripsData,
                        backgroundColor: 'rgba(37, 99, 235, 0.8)',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } },
                        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } }
                    }
                }
            });
        }

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
        html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button onclick="descargarHojaRutaPDF(${index}, true)" class="btn btn-secondary" style="border-color: var(--brand-primary); color: var(--brand-primary); padding: 0.5rem 1rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Descargar PDF
            </button>
            <button onclick="deleteRecord('reporte', ${rep.id})" class="btn" style="background-color: var(--accent-danger); color: white; border: none; padding: 0.5rem 1rem; cursor: pointer;">🗑️ Eliminar Reporte</button>
        </div>`;
    } else {
        html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
            <button onclick="descargarHojaRutaPDF(${index}, true)" class="btn btn-secondary" style="border-color: var(--brand-primary); color: var(--brand-primary); padding: 0.5rem 1rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Descargar PDF
            </button>
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

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const isError = type === 'error';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
    toast.style.color = 'white';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.75rem';
    toast.style.fontWeight = '500';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    const icon = isError ? 
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' :
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

    toast.innerHTML = icon + '<span>' + message + '</span>';
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.customConfirm = function(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        if (confirm(message)) onConfirm();
        return;
    }
    
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.add('active');
    
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    // Remover eventos anteriores
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    
    newBtn.addEventListener('click', () => {
        closeConfirmModal();
        onConfirm();
    });
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
};

window.deleteRecord = function(type, id) {
    customConfirm("¿Estás seguro de que quieres eliminar este registro de forma permanente?", async () => {
        const btn = document.querySelector('#detailModal .btn');
        if (btn) btn.textContent = "Eliminando...";
        try {
            await API.deleteData(type, id);
            showToast("Registro eliminado exitosamente.");
            closeModal();
            loadData(); // Recargar datos
        } catch (e) {
            showToast("Hubo un error al eliminar. Inténtalo de nuevo.", "error");
            if (btn) btn.textContent = "🗑️ Eliminar";
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

window.descargarHojaRutaPDF = function(index, isOwner = true) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Las librerías PDF no han cargado aún.", "error");
        return;
    }
    
    // Si isOwner es true, busca en currentData.reportes. Si es false (conductor), busca en window.currentDriverReports (esta lógica se usará en driver.js o aquí si se inyecta)
    const rep = isOwner ? window.currentData.reportes[index] : window.currentDriverReports[index];
    if (!rep) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait');
    
    // Diseño del ticket / Hoja de Ruta
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129); // Verde primary
    doc.text("SERFOVER", 105, 20, null, null, "center");
    
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Hoja de Ruta de Viaje", 105, 30, null, null, "center");
    
    // Separador
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 35, 196, 35);
    
    // Datos Principales
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    let currentY = 45;
    const lineHeight = 8;
    
    const addLine = (label, value) => {
        doc.setFont(undefined, 'bold');
        doc.text(label + ":", 14, currentY);
        doc.setFont(undefined, 'normal');
        doc.text(String(value || '-'), 60, currentY);
        currentY += lineHeight;
    };
    
    addLine("Fecha", formatDate(rep.fecha));
    addLine("Conductor", rep.driver);
    addLine("Móvil", rep._movil || rep.movil);
    addLine("Kilometraje", rep.kilometraje + " km");
    
    currentY += 4;
    doc.line(14, currentY - 6, 196, currentY - 6);
    
    addLine("Origen/Fundo", rep.fundo);
    addLine("Destino", rep.destino);
    addLine("Sector Faena", rep.faena);
    addLine("N° Guía", rep.guia);
    
    currentY += 4;
    doc.line(14, currentY - 6, 196, currentY - 6);
    
    addLine("Peaje", formatMoney(rep.peaje || 0));
    addLine("Romana", formatMoney(rep.romana || 0));
    addLine("Viático", formatMoney(rep.viatico || 0));
    addLine("Total Gastos Extras", formatMoney(rep.total || 0));
    
    currentY += 4;
    doc.line(14, currentY - 6, 196, currentY - 6);
    
    doc.setFont(undefined, 'bold');
    doc.text("Observaciones:", 14, currentY);
    currentY += 6;
    doc.setFont(undefined, 'normal');
    
    // Manejo de observaciones largas
    const obsLines = doc.splitTextToSize(rep.observaciones || 'Sin observaciones', 180);
    doc.text(obsLines, 14, currentY);
    
    // Pie de página
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento generado automáticamente por el sistema SERFOVER", 105, 280, null, null, "center");

    doc.save(`Hoja_de_Ruta_${rep.movil}_${new Date(rep.fecha).toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`);
};
