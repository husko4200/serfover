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
        'inicio': 'Inicio',
        'muro': 'Muro del Equipo',
        'reporte': 'Nuevo Reporte',
        'combustible': 'Combustible',
        'mantencion': 'Mantención',
        'historial': 'Historial de Reportes',
        'historial-comb': 'Mis Combustibles',
        'historial-mant': 'Mis Mantenciones'
    };
    document.getElementById('pageTitle').textContent = titles[tabId] || 'Inicio';
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
        if (el && el.innerHTML.includes('Cargando')) return;
        if (el) el.innerHTML = '<span style="font-size: 0.9rem; color: var(--text-muted);">Cargando...</span>';
    };
    setCargando('lastReportCardContainer');

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
            let movilMant = m.movil || getMovilFromDesc(m.descripcion) || m._movil || '';
            movilMant = String(movilMant).trim().toLowerCase();
            const myMovilClean = miMovil ? String(miMovil).trim().toLowerCase() : '';
            const isMyTruck = myMovilClean !== '' && movilMant === myMovilClean;
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
            let movilMant = m.movil || getMovilFromDesc(m.descripcion) || m._movil || '';
            movilMant = String(movilMant).trim().toLowerCase();
            const myMovilClean = miMovil ? String(miMovil).trim().toLowerCase() : '';
            const isMyTruck = myMovilClean !== '' && movilMant === myMovilClean;
            return isMine || isMyTruck;
        }).forEach(m => {
            const d = new Date(m.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                driverMantMes++;
                totalMantMesCost += parseFloat(m.valor || 0);
            }
        });



        const tbodyMant = document.querySelector('#tableDriverMantenciones tbody');
        if (tbodyMant) {
            tbodyMant.innerHTML = '';
            if (misMantenciones.length === 0) {
                tbodyMant.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay mantenciones en este mes para tu móvil asignado.</td></tr>';
            } else {
                misMantenciones.forEach((mant, i) => {
                    const tr = document.createElement('tr');
                    const isMechanic = mant.driver !== user.name;
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
        
        // Mapear móvil si falta en los registros de combustible
        misCombustibles.forEach(c => {
            if (!c.movil && user.truck && user.truck.trim() !== '') {
                c.movil = user.truck.trim().toUpperCase();
            }
        });
        
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
        let totalLitrosMes = 0;
        let prevLitrosMes = 0;

        (data.combustibles || []).filter(c => c.driver === user.name).forEach(c => {
            const d = new Date(c.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                totalCombMesCost += parseFloat(c.valorTotal || c.valor || 0);
                totalLitrosMes += parseFloat(c.litros || 0);
            } else if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat - 1) {
                prevLitrosMes += parseFloat(c.litros || 0);
            } else if(currentMonthStat === 0 && d.getFullYear() === currentYearStat - 1 && d.getMonth() === 11) {
                prevLitrosMes += parseFloat(c.litros || 0);
            }
        });

        // Calcular Rendimiento
        let totalKmMes = 0;
        let prevKmMes = 0;
        misReps.forEach(r => {
            const d = new Date(r.fecha);
            if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat) {
                totalKmMes += parseFloat(r.kilometraje || 0);
            } else if(d.getFullYear() === currentYearStat && d.getMonth() === currentMonthStat - 1) {
                prevKmMes += parseFloat(r.kilometraje || 0);
            } else if(currentMonthStat === 0 && d.getFullYear() === currentYearStat - 1 && d.getMonth() === 11) {
                prevKmMes += parseFloat(r.kilometraje || 0);
            }
        });

        const currentRend = totalLitrosMes > 0 ? (totalKmMes / totalLitrosMes) : 0;
        const prevRend = prevLitrosMes > 0 ? (prevKmMes / prevLitrosMes) : 0;
        
        const kpiRend = document.getElementById('driverKpiRendimiento');
        if (kpiRend) {
            kpiRend.textContent = currentRend > 0 ? currentRend.toFixed(2) + ' Km/L' : 'Sin datos';
            document.getElementById('driverKmRendimiento').textContent = totalKmMes;
            document.getElementById('driverLitrosRendimiento').textContent = totalLitrosMes;
            
            const trendEl = document.getElementById('driverTrendRendimiento');
            if (currentRend > 0 && prevRend > 0) {
                const diff = currentRend - prevRend;
                const perc = (diff / prevRend) * 100;
                if (diff >= 0) {
                    trendEl.innerHTML = `<span style="color: var(--neon-green);">↑ +${perc.toFixed(1)}%</span> vs mes anterior (${prevRend.toFixed(2)} Km/L)`;
                } else {
                    trendEl.innerHTML = `<span style="color: var(--accent-danger);">↓ ${perc.toFixed(1)}%</span> vs mes anterior (${prevRend.toFixed(2)} Km/L)`;
                }
            } else if (currentRend > 0 && prevRend === 0) {
                trendEl.textContent = 'Sin datos del mes anterior';
            } else {
                trendEl.textContent = 'Registra reportes y combustible para ver tu rendimiento';
            }
        }



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



        // --- Renderizar Último Viaje Registrado ---
        const lastReportContainer = document.getElementById('lastReportCardContainer');
        if (lastReportContainer) {
            if (misReps.length > 0) {
                const lastRep = misReps[0];
                const d = new Date(lastRep.fecha);
                const now = new Date();
                const diffMs = now - d;
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                let timeAgo = '';
                if (diffHrs < 1) {
                    timeAgo = 'Hace menos de una hora';
                } else if (diffHrs < 24) {
                    timeAgo = `Hace ${diffHrs} horas`;
                } else {
                    const diffDays = Math.floor(diffHrs / 24);
                    timeAgo = `Hace ${diffDays} días`;
                }
                
                lastReportContainer.innerHTML = `
                    <div class="card" style="padding: 1.5rem; background: var(--glass-bg);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">${timeAgo}</span>
                            <span style="background: rgba(16,185,129,0.2); color: var(--brand-primary); padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Completado</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="font-size: 2rem; background: rgba(59,130,246,0.1); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">🚛</div>
                            <div>
                                <h4 style="font-size: 1.2rem; color: var(--text-primary); margin: 0 0 0.2rem;">${lastRep.movil}</h4>
                                <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">${lastRep.fundo} → ${lastRep.destino}</p>
                            </div>
                        </div>
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 1rem;">
                            <div style="flex: 1;">
                                <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Km Registrado</span>
                                <strong style="color: var(--text-primary);">${lastRep.kilometraje} km</strong>
                            </div>
                            <div style="flex: 1;">
                                <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Guía</span>
                                <strong style="color: var(--text-primary);">${lastRep.guia || '-'}</strong>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                lastReportContainer.innerHTML = `
                    <div class="card" style="padding: 1.5rem; text-align: center; color: var(--text-secondary); background: var(--glass-bg);">
                        Aún no tienes viajes registrados.
                    </div>
                `;
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
    const dateStr = new Date().toLocaleDateString('es-ES', dateOpts);
    if (document.getElementById('currentDate')) document.getElementById('currentDate').textContent = dateStr;
    if (document.getElementById('heroCurrDate')) document.getElementById('heroCurrDate').textContent = dateStr;

    const user = JSON.parse(localStorage.getItem('serfover_user'));
    if (user) {
        // Nombre
        const nameEl = document.getElementById('dashDriverName');
        if (nameEl) nameEl.textContent = user.name || 'Conductor';

        // Inicial / foto de perfil
        const heroInitial = document.getElementById('heroAvatarInitial');
        const heroImg = document.getElementById('heroProfileImg');
        const bnavAvatar = document.getElementById('bnavAvatar');
        const initial = (user.name || 'C').charAt(0).toUpperCase();

        if (heroInitial) heroInitial.textContent = initial;
        if (bnavAvatar) bnavAvatar.textContent = initial;

        // Foto de perfil (si está guardada en user.avatar como base64)
        if (user.avatar) {
            if (heroImg) {
                heroImg.src = user.avatar;
                heroImg.style.display = 'block';
                if (heroInitial) heroInitial.style.display = 'none';
            }
            if (bnavAvatar) {
                bnavAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                bnavAvatar.style.background = 'transparent';
                bnavAvatar.style.color = 'transparent';
            }
        }

        // Patente del camión
        const plateBadge = document.getElementById('heroPlateBadge');
        const plateText = document.getElementById('heroPlateText');
        if (user.truck && user.truck.trim() !== '' && plateBadge && plateText) {
            plateText.textContent = user.truck.trim().toUpperCase();
            plateBadge.style.display = 'inline-flex';
        }
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
        const combMovilInput = document.getElementById('combMovil');
        if (combMovilInput) {
            combMovilInput.value = user.truck.trim();
        }
    }
    
    window.showSuccessScreen = function(targetTab) {
        const tab = targetTab || 'historial';
        const overlay = document.getElementById('successOverlay');
        if (overlay) {
            if (navigator.vibrate) navigator.vibrate(200); // Vibración si está disponible
            overlay.style.display = 'flex';
            setTimeout(() => {
                overlay.style.display = 'none';
                switchTab(tab);
                window.scrollTo(0, 0);
            }, 2000);
        } else {
            showToast('¡Guardado con éxito!', 'success');
            switchTab(tab);
        }
    };

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
            window.setBtnLoading('btnSubmitReporte', false, 'Guardar Report');
            
            if (user) {
                user.truck = payload.movil;
                localStorage.setItem('serfover_user', JSON.stringify(user));
            }
            
            document.getElementById('formReporte').reset();
            document.getElementById('repPreview').style.display = 'none';
            // Restaurar móvil desde perfil
            if (user && user.truck) document.getElementById('repMovil').value = user.truck;
            
            window.showSuccessScreen('historial');
        } catch (error) {
            window.setBtnLoading('btnSubmitReporte', false, 'Guardar Report');
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
                movil: document.getElementById('combMovil').value,
                litros: document.getElementById('combLitros').value,
                kilometraje: document.getElementById('combKm').value,
                valor: document.getElementById('combValor').value,
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            window.setBtnLoading('btnSubmitCombustible', false, 'Registrar Combustible');
            
            if (user) {
                user.truck = payload.movil;
                localStorage.setItem('serfover_user', JSON.stringify(user));
            }
            
            document.getElementById('formCombustible').reset();
            document.getElementById('combPreview').style.display = 'none';
            if (user && user.truck) document.getElementById('combMovil').value = user.truck;
            
            window.showSuccessScreen('historial-comb');
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

            // Recopilar checklist
            const checklistBtns = document.querySelectorAll('#driverChecklist .btn');
            let checklistSummary = '';
            if (checklistBtns && checklistBtns.length > 0) {
                checklistBtns.forEach(btn => {
                    const text = btn.innerText;
                    if(text.includes('✅') || text.includes('❌')) {
                        checklistSummary += text + ' | ';
                    }
                });
            }

            const realizadoPor = document.getElementById('mantRealizadoPor').value || 'Conductor';
            const conductorCargo = document.getElementById('mantConductor').value || (user ? user.name : 'Desconocido');
            const finalDescription = `${checklistSummary ? '[Checklist: ' + checklistSummary + ']\\n' : ''}Realizado por: ${realizadoPor}. Conductor a Cargo: ${conductorCargo}.\\n` + document.getElementById('mantDesc').value;

            const payload = {
                type: 'mantencion',
                driver: user ? user.name : 'Desconocido',
                movil: document.getElementById('mantMovil').value,
                tipo: document.getElementById('mantTipo').value,
                kilometraje: document.getElementById('mantKm').value,
                descripcion: finalDescription,
                valor: 0, // Como en el del mecánico, no hay valor
                imagen: base64Image,
                fecha: new Date().toISOString()
            };

            await API.sendData(payload);
            window.setBtnLoading('btnSubmitMantencion', false, 'Registrar Mantención');
            document.getElementById('formMantencion').reset();
            document.getElementById('mantPreview').style.display = 'none';
            if (user && user.truck) document.getElementById('mantMovil').value = user.truck;
            window.showSuccessScreen('historial-mant');
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
