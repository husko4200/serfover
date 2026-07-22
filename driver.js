// Funciones para UI de Conductor
function switchTab(tabId) {
    // Ocultar todas las tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Mostrar la seleccionada
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Activar botón nav (Desktop)
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') === `switchTab('${tabId}')`);
    if(activeNav) activeNav.classList.add('active');

    // Activar botón bottom nav (Mobile HUD)
    document.querySelectorAll('.bnav-item').forEach(el => el.classList.remove('active'));
    const activeBnav = Array.from(document.querySelectorAll('.bnav-item')).find(el => el.getAttribute('data-tab') === tabId);
    if(activeBnav) activeBnav.classList.add('active');

    // Cambiar título
    const titles = {
        'inicio': 'Panel de Inicio',
        'muro': 'Muro del Equipo',
        'reporte': 'Hoja de Ruta',
        'combustible': 'Control de Combustible',
        'mantencion': 'Registro de Mantenciones',
        'historial': 'Mis Reportes',
        'historial-mant': 'Mis Mantenciones'
    };
    document.getElementById('pageTitle').textContent = titles[tabId] || 'Panel';
}

// Lógica del Stepper (Formulario de Reporte)
function nextStep(stepNumber) {
    // Validar inputs del step actual antes de avanzar
    const currentStep = document.querySelector('.stepper-step.active');
    const inputs = currentStep.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity();
            isValid = false;
        }
    });
    
    if (!isValid) return;

    // Cambiar step activo
    document.querySelectorAll('.stepper-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + stepNumber).classList.add('active');
    
    // Actualizar barra de progreso (25%, 50%, 75%, 100%)
    const progress = (stepNumber / 4) * 100;
    document.getElementById('stepperBar').style.width = progress + '%';
}

function prevStep(stepNumber) {
    document.querySelectorAll('.stepper-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + stepNumber).classList.add('active');
    
    const progress = (stepNumber / 4) * 100;
    document.getElementById('stepperBar').style.width = progress + '%';
}

function previewImage(input, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    const img = container.querySelector('img');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            container.style.display = 'block';
            
            // Habilitar botón de enviar si estamos en driver.html y es la imagen del reporte
            const btnSubmit = document.getElementById('btnSubmitReporte');
            if (btnSubmit && input.id === 'repImagen') {
                btnSubmit.disabled = false;
                btnSubmit.style.opacity = '1';
                btnSubmit.style.cursor = 'pointer';
            }
        }
        
        reader.readAsDataURL(input.files[0]);
    } else {
        // Si cancela, deshabilitar botón (opcional, pero buena práctica)
        const btnSubmit = document.getElementById('btnSubmitReporte');
        if (btnSubmit && input.id === 'repImagen') {
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.5';
            btnSubmit.style.cursor = 'not-allowed';
            container.style.display = 'none';
        }
    }
}

// Botones de estado rápido
function setDriverStatus(statusText, btnElement) {
    const obs = document.getElementById('repObservaciones');
    if(obs) {
        // Evitar duplicados del mismo estado
        if(!obs.value.includes(`[Estado: ${statusText}]`)) {
            obs.value = `[Estado: ${statusText}]\n` + obs.value;
        }
    }
    // Resaltar botón seleccionado
    if(btnElement) {
        const parent = btnElement.parentElement;
        parent.querySelectorAll('.btn').forEach(b => {
            b.style.transform = 'scale(1)';
            b.style.fontWeight = 'normal';
        });
        btnElement.style.transform = 'scale(1.05)';
        btnElement.style.fontWeight = 'bold';
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
    document.getElementById('detailModal').classList.add('active');
}

window.verDetalleCombustibleConductor = function(index) {
    const comb = window.currentDriverCombs[index];
    if(!comb) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Fecha:</strong> ${formatDate(comb.fecha)}</div>
            <div><strong>Móvil:</strong> ${comb.movil || '-'}</div>
            <div><strong>Litros:</strong> ${comb.litros || 0}</div>
            <div><strong>Valor Total:</strong> $${parseInt(comb.valorTotal || 0).toLocaleString('es-CL')}</div>
            <div><strong>Kilometraje:</strong> ${comb.kilometraje || '-'}</div>
        </div>
        <div style="margin-bottom: 1rem;">
            <strong>Observaciones:</strong><br>
            <p style="background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">${comb.observaciones || 'Sin observaciones'}</p>
        </div>
    `;

    if (comb.imagenUrl && comb.imagenUrl !== '') {
        html += `
        <div style="margin-top: 1rem;">
            <strong>Foto del Vale / Boleta:</strong><br>
            <img src="${comb.imagenUrl}" alt="Evidencia de Combustible">
        </div>`;
    }

    document.getElementById('modalTitle').textContent = 'Detalle de Carga de Combustible';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('detailModal').classList.add('active');
}

window.closeModal = function() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = 'none';
}

function formatDate(isoString) {
    if (!isoString) return 'Sin fecha';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL');
}

window.descargarReporteDriverPDF = function() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Librerías PDF no cargadas aún.", "error");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait');
    
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129);
    doc.text("SERFOVER", 14, 20);
    
    const user = JSON.parse(localStorage.getItem('serfover_user'));
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Reporte de Viajes - ${user ? user.name : 'Conductor'}`, 14, 30);
    
    const monthFilter = document.getElementById('driverMonthFilter') ? document.getElementById('driverMonthFilter').value : 'Mes Actual';
    doc.setFontSize(10);
    doc.text(`Filtro: ${monthFilter}`, 14, 38);

    const reportesData = window.currentDriverReports.map(r => [
        formatDate(r.fecha),
        r.movil,
        r.fundo + ' / ' + r.destino,
        r.guia || '-'
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Fecha', 'Móvil', 'Trayecto', 'Guía']],
        body: reportesData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Mis_Reportes_${monthFilter}.pdf`);
};

window.descargarCombustibleDriverPDF = function() {
    if (!window.jspdf || !window.jspdf.jsPDF) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait');
    
    doc.setFontSize(20);
    doc.setTextColor(239, 68, 68);
    doc.text("SERFOVER", 14, 20);
    
    const user = JSON.parse(localStorage.getItem('serfover_user'));
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Reporte de Combustibles - ${user ? user.name : 'Conductor'}`, 14, 30);
    
    const monthFilter = document.getElementById('driverCombMonthFilter') ? document.getElementById('driverCombMonthFilter').value : 'Mes Actual';
    doc.setFontSize(10);
    doc.text(`Filtro: ${monthFilter}`, 14, 38);

    const combData = window.currentDriverCombs.map(c => [
        formatDate(c.fecha),
        c.movil || '-',
        c.litros || 0,
        '$' + parseInt(c.valorTotal || 0).toLocaleString('es-CL')
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Fecha', 'Móvil', 'Litros', 'Total ($)']],
        body: combData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Mis_Combustibles_${monthFilter}.pdf`);
};

window.currentDriverReports = [];
window.currentDriverMants = [];
window.currentDriverCombs = [];

function getMovilFromDesc(desc) {
    if(!desc) return null;
    const match = desc.match(/Móvil:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
}

async function loadDriverHistory() {
    const setCargando = (id) => {
        const el = document.getElementById(id);
        if (el && (el.textContent.trim() === '0' || el.textContent.trim() === '$0' || el.textContent.trim() === '0 km' || el.textContent.trim() === '-' || el.textContent.trim() === '0 viajes' || el.textContent.trim() === '0 mantenciones')) {
            el.innerHTML = '<span style="font-size: 0.9rem; color: var(--text-muted);">Cargando...</span>';
        }
    };
    ['driverStatViajes', 'driverStatMant', 'driverStatGastoComb', 'driverStatGastoMant', 'driverStatKmTotales', 'rankDriverMostTrips', 'rankDriverMostTripsVal', 'rankDriverTopFuel', 'rankDriverTopFuelVal', 'rankDriverTopMant', 'rankDriverTopMantVal'].forEach(setCargando);

    try {
        const data = await API.getData();
        if (!data) return;

        const monthVal = document.getElementById('driverMonthFilter') ? document.getElementById('driverMonthFilter').value : '';
        const mantMonthVal = document.getElementById('driverMantMonthFilter') ? document.getElementById('driverMantMonthFilter').value : '';
        const combMonthVal = document.getElementById('driverCombMonthFilter') ? document.getElementById('driverCombMonthFilter').value : '';
        
        const user = JSON.parse(localStorage.getItem('serfover_user'));
        if (!user) return;

        // 1. Encontrar el móvil actual del conductor
        let misReps = (data.reportes || []).filter(r => r.driver === user.name).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        
        let miMovil = null;
        if (user.truck && user.truck.trim() !== '') {
            miMovil = user.truck.trim();
        } else {
            miMovil = misReps.length > 0 ? misReps[0].movil : null;
        }

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

        const nowStat = new Date();
        const currentYearStat = nowStat.getFullYear();
        const currentMonthStat = nowStat.getMonth();
        
        let driverViajesMes = 0;
        misReps.forEach(r => {
            const d = new Date(r.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) driverViajesMes++;
        });

        let driverMantMes = 0;
        let totalMantMesCost = 0;
        (data.mantenciones || []).filter(m => {
            const isMine = m.driver === user.name;
            const movilMant = getMovilFromDesc(m.descripcion);
            const isMyTruck = miMovil && movilMant && movilMant.toLowerCase() === miMovil.toLowerCase();
            return isMine || isMyTruck;
        }).forEach(m => {
            const d = new Date(m.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                driverMantMes++;
                totalMantMesCost += parseFloat(m.valor || 0);
            }
        });

        const elStatViajes = document.getElementById('driverStatViajes');
        if (elStatViajes) elStatViajes.textContent = driverViajesMes;

        const elStatMant = document.getElementById('driverStatMant');
        if (elStatMant) elStatMant.textContent = driverMantMes;

        const tbodyMant = document.querySelector('#tableDriverMantenciones tbody');
        if (tbodyMant) {
            tbodyMant.innerHTML = '';
            if (misMantenciones.length === 0) {
                tbodyMant.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay mantenciones en este mes para tu móvil asignado.</td></tr>';
            } else {
                misMantenciones.forEach((mant, i) => {
                    const tr = document.createElement('tr');
                    const isMechanic = (mant.driver && mant.driver.startsWith('Mecánico')) || (mant.descripcion && mant.descripcion.includes('Móvil:'));
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

        // --- Historial de Combustibles ---
        let misCombustibles = (data.combustibles || []).filter(c => c.driver === user.name);
        
        if (combMonthVal) {
            const [year, month] = combMonthVal.split('-');
            misCombustibles = misCombustibles.filter(c => {
                const d = new Date(c.fecha);
                return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
            });
        }
        misCombustibles.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        window.currentDriverCombs = misCombustibles;

        const tbodyComb = document.querySelector('#tableDriverCombustibles tbody');
        if (tbodyComb) {
            tbodyComb.innerHTML = '';
            if (misCombustibles.length === 0) {
                tbodyComb.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay cargas de combustible en este mes.</td></tr>';
            } else {
                misCombustibles.forEach((comb, i) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="Fecha">${formatDate(comb.fecha)}</td>
                        <td data-label="Móvil"><strong>${comb.movil || '-'}</strong></td>
                        <td data-label="Litros">${comb.litros || 0}</td>
                        <td data-label="Valor Total">$${parseInt(comb.valorTotal || 0).toLocaleString('es-CL')}</td>
                        <td data-label="Acción"><button class="view-btn" style="background:transparent; border:1px solid #ef4444; color:#ef4444; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;" onclick="verDetalleCombustibleConductor(${i})">Ver</button></td>
                    `;
                    tbodyComb.appendChild(tr);
                });
            }
        }
        let totalCombMesCost = 0;
        (data.combustibles || []).filter(c => c.driver === user.name).forEach(c => {
            const d = new Date(c.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                totalCombMesCost += parseFloat(c.valorTotal || c.valor || 0);
            }
        });

        const elComb = document.getElementById('driverStatGastoComb');
        if (elComb) elComb.textContent = '$' + totalCombMesCost.toLocaleString('es-CL');

        const elMant = document.getElementById('driverStatGastoMant');
        if (elMant) elMant.textContent = '$' + totalMantMesCost.toLocaleString('es-CL');

        let totalKmMes = 0;
        misReps.forEach(rep => {
            const d = new Date(rep.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                const kmIni = parseInt(rep.kmInicio) || 0;
                const kmFin = parseInt(rep.kmTermino) || 0;
                if (kmFin > kmIni) totalKmMes += (kmFin - kmIni);
            }
        });
        const elKm = document.getElementById('driverStatKmTotales');
        if (elKm) elKm.textContent = totalKmMes.toLocaleString('es-CL') + ' km';

        // Alertas de cambio de aceite para el móvil asignado
        if (miMovil) {
            let maxKm = 0;
            let lastOilKm = 0;
            
            const allRecords = [...(data.reportes||[]), ...(data.combustibles||[]), ...(data.mantenciones||[])];
            allRecords.forEach(r => {
                let m = getMovilFromDesc(r.descripcion) || r.movil || r._movil || '';
                if (m.toLowerCase() === miMovil.toLowerCase()) {
                    let k = parseInt(r.kilometraje || r.kmTermino || 0);
                    if (k > maxKm) maxKm = k;
                }
            });
            
            (data.mantenciones||[]).forEach(m => {
                let mvl = getMovilFromDesc(m.descripcion) || m.movil || m._movil || '';
                if (mvl.toLowerCase() === miMovil.toLowerCase() && m.tipo === 'Cambio de Aceite') {
                    let k = parseInt(m.kilometraje || 0);
                    if (k > lastOilKm) lastOilKm = k;
                }
            });

            const alertsContainer = document.getElementById('driverAlertsContainer');
            if (alertsContainer && lastOilKm > 0) {
                const diff = maxKm - lastOilKm;
                if (diff >= 38500) {
                    alertsContainer.style.display = 'flex';
                    const alertDiv = document.createElement('div');
                    alertDiv.style.padding = '1rem';
                    alertDiv.style.borderRadius = 'var(--radius-md)';
                    alertDiv.style.fontWeight = 'bold';
                    
                    if (diff >= 40000) {
                        alertDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        alertDiv.style.color = 'var(--accent-danger)';
                        alertDiv.style.border = '1px solid var(--accent-danger)';
                        alertDiv.innerHTML = `🚨 URGENTE: Han pasado ${diff.toLocaleString('es-CL')} km desde el último cambio de aceite (Límite 40.000).`;
                    } else {
                        const remaining = 40000 - diff;
                        alertDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                        alertDiv.style.color = 'var(--accent-warning)';
                        alertDiv.style.border = '1px solid var(--accent-warning)';
                        alertDiv.innerHTML = `⚠️ Atención: A tu camión le faltan solo <strong>${remaining.toLocaleString('es-CL')} km</strong> para el cambio de aceite.`;
                    }
                    alertsContainer.innerHTML = '';
                    alertsContainer.appendChild(alertDiv);
                } else {
                    alertsContainer.style.display = 'none';
                }
            }
        }

        // --- Ranking Completo de Flota ---
        const truckTripsMap = {};
        const truckFuelMap = {};
        const truckMantMap = {};

        (data.reportes || []).forEach(r => {
            const d = new Date(r.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                let m = getMovilFromDesc(r.descripcion) || r.movil || r._movil || 'Desconocido';
                if (m !== 'Desconocido') truckTripsMap[m] = (truckTripsMap[m] || 0) + 1;
            }
        });

        (data.combustibles || []).forEach(c => {
            const d = new Date(c.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                let m = c.movil || c._movil || 'Desconocido';
                if (m !== 'Desconocido') truckFuelMap[m] = (truckFuelMap[m] || 0) + parseFloat(c.valorTotal || c.valor || 0);
            }
        });

        (data.mantenciones || []).forEach(m => {
            const d = new Date(m.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                let mvl = getMovilFromDesc(m.descripcion) || m.movil || m._movil || 'Desconocido';
                if (mvl !== 'Desconocido') truckMantMap[mvl] = (truckMantMap[mvl] || 0) + 1;
            }
        });

        const topTripsTruck = Object.entries(truckTripsMap).sort((a, b) => b[1] - a[1])[0];
        if (topTripsTruck && document.getElementById('rankDriverMostTrips')) {
            document.getElementById('rankDriverMostTrips').textContent = topTripsTruck[0];
            document.getElementById('rankDriverMostTripsVal').textContent = topTripsTruck[1] + ' viajes';
        }

        const topFuelTruck = Object.entries(truckFuelMap).sort((a, b) => b[1] - a[1])[0];
        if (topFuelTruck && document.getElementById('rankDriverTopFuel')) {
            document.getElementById('rankDriverTopFuel').textContent = topFuelTruck[0];
            document.getElementById('rankDriverTopFuelVal').textContent = '$' + parseInt(topFuelTruck[1]).toLocaleString('es-CL');
        }

        const topMantTruck = Object.entries(truckMantMap).sort((a, b) => b[1] - a[1])[0];
        if (topMantTruck && document.getElementById('rankDriverTopMant')) {
            document.getElementById('rankDriverTopMant').textContent = topMantTruck[0];
            document.getElementById('rankDriverTopMantVal').textContent = topMantTruck[1] + ' mantenciones';
        }

        // --- Gráfico 1: Distribución de Gastos (Mes Actual) ---
        if (window._driverExpensesChartInst) window._driverExpensesChartInst.destroy();
        const ctxEx = document.getElementById('driverExpensesChart');
        if (ctxEx) {
            const hasData = (totalCombMesCost + totalMantMesCost) > 0;
            const cData = hasData ? [totalCombMesCost, totalMantMesCost] : [1];
            const cLabels = hasData ? ['Combustible', 'Mantenciones'] : ['Sin Gastos Este Mes'];
            const cColors = hasData ? ['#ef4444', '#f59e0b'] : ['#e2e8f0'];

            window._driverExpensesChartInst = new Chart(ctxEx, {
                type: 'doughnut',
                data: {
                    labels: cLabels,
                    datasets: [{
                        data: cData,
                        backgroundColor: cColors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: 'var(--text-primary)', font: { family: 'Outfit, sans-serif' } } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (!hasData) return 'Sin Gastos';
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed !== null) label += '$' + context.parsed.toLocaleString('es-CL');
                                    return label;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }

        // --- Gráfico 2: Viajes Últimos 6 Meses ---
        if (window._driverTripsChartInst) window._driverTripsChartInst.destroy();
        const ctxTr = document.getElementById('driverTripsChart');
        if (ctxTr) {
            const monthsNames = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
            const last6Months = [];
            const tripsData = [];

            const d = new Date();
            for (let i = 5; i >= 0; i--) {
                const pastDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
                last6Months.push(monthsNames[pastDate.getMonth()]);
                
                // Contar viajes para ese mes y año del conductor
                const count = (data.reportes || []).filter(r => {
                    if (r.driver !== user.name) return false;
                    const rd = new Date(r.fecha);
                    return rd.getFullYear() === pastDate.getFullYear() && rd.getMonth() === pastDate.getMonth();
                }).length;
                tripsData.push(count);
            }

            window._driverTripsChartInst = new Chart(ctxTr, {
                type: 'bar',
                data: {
                    labels: last6Months,
                    datasets: [{
                        label: 'Viajes Realizados',
                        data: tripsData,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => c.parsed.y + ' viajes' } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'var(--text-secondary)', stepSize: 1 }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'var(--text-secondary)' }
                        }
                    }
                }
            });
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

    html += `<div style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
        <button onclick="descargarHojaRutaPDF(${index})" class="btn btn-secondary" style="border-color: var(--brand-primary); color: var(--brand-primary); padding: 0.5rem 1rem; width: 100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Descargar Hoja de Ruta en PDF
        </button>
    </div>`;

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

    // Eliminar filtros por defecto del mes para mostrar todo el historial
    const driverMonthFilter = document.getElementById('driverMonthFilter');
    if (driverMonthFilter) driverMonthFilter.value = '';
    const driverMantMonthFilter = document.getElementById('driverMantMonthFilter');
    if (driverMantMonthFilter) driverMantMonthFilter.value = '';
    const driverCombMonthFilter = document.getElementById('driverCombMonthFilter');
    if (driverCombMonthFilter) driverCombMonthFilter.value = '';

    // Autocompletar la patente del camión si está configurada en el perfil
    if (user && user.truck && user.truck.trim() !== '') {
        const repMovilInput = document.getElementById('repMovil');
        if (repMovilInput) {
            repMovilInput.value = user.truck.trim();
        }
    }

    // Configurar Datalist y Autocompletado de Kilometraje Inicial
    const repMovilInput = document.getElementById('repMovil');
    if (repMovilInput) {
        repMovilInput.addEventListener('blur', () => {
            const val = repMovilInput.value.trim().toUpperCase();
            repMovilInput.value = val;
            
            // Buscar en caché el máximo kilometraje para este móvil
            const cachedData = JSON.parse(localStorage.getItem('serfover_data_cache'));
            if (cachedData && cachedData.reportes) {
                let maxKm = 0;
                cachedData.reportes.forEach(r => {
                    if (r.movil && r.movil.toUpperCase() === val && r.kilometraje) {
                        const km = parseInt(r.kilometraje);
                        if (km > maxKm) maxKm = km;
                    }
                });
                
                if (maxKm > 0) {
                    const kmInput = document.getElementById('repKilometraje');
                    if(kmInput && !kmInput.value) {
                        kmInput.value = maxKm;
                    }
                }
            }
        });
    }
    
    // Cargar historial y Datalist
    loadDriverHistory();


    // --- Enviar Reporte ---
    document.getElementById('formReporte').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('repStatus');
        statusEl.style.display = 'none';
        window.setBtnLoading('btnSubmitReporte', true);

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
            window.setBtnLoading('btnSubmitReporte', false, 'Guardar Reporte');
            showToast('¡Reporte guardado con éxito!', 'success');
            document.getElementById('formReporte').reset();
            document.getElementById('repPreview').style.display = 'none';
            // Restaurar móvil desde perfil
            if (user && user.truck) document.getElementById('repMovil').value = user.truck;
        } catch (error) {
            window.setBtnLoading('btnSubmitReporte', false, 'Guardar Reporte');
            showToast('Error al guardar: ' + error.message, 'error');
            statusEl.style.display = 'block';
            statusEl.innerHTML = '<span style="color: var(--accent-danger);">Error al guardar. Intenta nuevamente.</span>';
        }
    });

    // --- Enviar Combustible ---
    document.getElementById('formCombustible').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('combStatus');
        statusEl.style.display = 'none';
        window.setBtnLoading('btnSubmitCombustible', true);

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
            window.setBtnLoading('btnSubmitCombustible', false, 'Registrar Combustible');
            showToast('¡Combustible registrado con éxito!', 'success');
            document.getElementById('formCombustible').reset();
            document.getElementById('combPreview').style.display = 'none';
        } catch (error) {
            window.setBtnLoading('btnSubmitCombustible', false, 'Registrar Combustible');
            showToast('Error al guardar: ' + error.message, 'error');
        }
    });

    // --- Enviar Mantención ---
    document.getElementById('formMantencion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('mantStatus');
        statusEl.style.display = 'none';
        window.setBtnLoading('btnSubmitMantencion', true);

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
            window.setBtnLoading('btnSubmitMantencion', false, 'Registrar Mantención');
            showToast('¡Mantención registrada con éxito!', 'success');
            document.getElementById('formMantencion').reset();
            document.getElementById('mantPreview').style.display = 'none';
        } catch (error) {
            window.setBtnLoading('btnSubmitMantencion', false, 'Registrar Mantención');
            showToast('Error al guardar: ' + error.message, 'error');
        }
    });
});

window.descargarHojaRutaPDF = function(index) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Las librerías PDF no han cargado aún.", "error");
        return;
    }
    
    const rep = window.currentDriverReports[index];
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
    addLine("Conductor", rep.driver || (JSON.parse(localStorage.getItem('serfover_user')) || {}).name || '-');
    addLine("Móvil", rep.movil || '-');
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
