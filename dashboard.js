// Lógica del Dashboard del Dueño

function switchDashTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById('dash-' + tabId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(el => el.getAttribute('onclick') === `switchDashTab('${tabId}')`);
    if(activeBtn) activeBtn.classList.add('active');
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
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
}

async function loadData() {
    try {
        const data = await API.getData();
        if (!data) return;

        let totalGastos = 0;
        let totalViajes = data.reportes ? data.reportes.length : 0;

        // --- Render Reportes ---
        const tbodyRep = document.querySelector('#tableReportes tbody');
        tbodyRep.innerHTML = '';
        if (data.reportes) {
            data.reportes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach((rep, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(rep.fecha)}</td>
                    <td><span class="driver-badge">${rep.driver}</span></td>
                    <td>${rep.movil}</td>
                    <td>${rep.fundo} / ${rep.destino}</td>
                    <td>${rep.guia || '-'}</td>
                    <td><button class="view-btn" onclick="verReporte(${i})">Ver</button></td>
                `;
                tbodyRep.appendChild(tr);
            });
        }

        // --- Render Combustible ---
        const tbodyComb = document.querySelector('#tableCombustible tbody');
        tbodyComb.innerHTML = '';
        if (data.combustibles) {
            data.combustibles.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach((comb, i) => {
                totalGastos += Number(comb.valor || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(comb.fecha)}</td>
                    <td><span class="driver-badge">${comb.driver}</span></td>
                    <td>${comb.litros} L</td>
                    <td>${comb.kilometraje} km</td>
                    <td>${formatMoney(comb.valor)}</td>
                    <td><button class="view-btn" onclick="verCombustible(${i})">Ver</button></td>
                `;
                tbodyComb.appendChild(tr);
            });
        }

        // --- Render Mantenciones ---
        const tbodyMant = document.querySelector('#tableMantencion tbody');
        tbodyMant.innerHTML = '';
        if (data.mantenciones) {
            data.mantenciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach((mant, i) => {
                totalGastos += Number(mant.valor || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(mant.fecha)}</td>
                    <td><span class="driver-badge">${mant.driver}</span></td>
                    <td>${mant.descripcion.substring(0, 30)}...</td>
                    <td>${formatMoney(mant.valor)}</td>
                    <td><button class="view-btn" onclick="verMantencion(${i})">Ver</button></td>
                `;
                tbodyMant.appendChild(tr);
            });
        }

        // --- Update Stats ---
        document.getElementById('statViajes').textContent = totalViajes;
        document.getElementById('statGastos').textContent = formatMoney(totalGastos);

    } catch (error) {
        console.error('Error cargando datos', error);
    }
}

// Funciones globales para abrir modal desde los botones generados
window.verReporte = async function(index) {
    const data = await API.getData();
    const rep = data.reportes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[index];
    if(!rep) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Conductor:</strong> ${rep.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(rep.fecha)}</div>
            <div><strong>Móvil:</strong> ${rep.movil}</div>
            <div><strong>Kilometraje:</strong> ${rep.kilometraje}</div>
            <div><strong>Fundo:</strong> ${rep.fundo}</div>
            <div><strong>Destino:</strong> ${rep.destino}</div>
            <div><strong>Sector Faena:</strong> ${rep.faena}</div>
            <div><strong>Peaje:</strong> ${rep.peaje || '-'}</div>
            <div><strong>Romana:</strong> ${rep.romana || '-'}</div>
            <div><strong>N° Guía:</strong> ${rep.guia || '-'}</div>
        </div>
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
            <strong>Observaciones:</strong><br>
            ${rep.observaciones || 'Sin observaciones'}
        </div>
    `;

    if (rep.imagen) {
        html += `<strong>Evidencia:</strong><br><img src="${rep.imagen}" alt="Hoja de Ruta">`;
    }

    openModal('Detalle Hoja de Ruta', html);
};

window.verCombustible = async function(index) {
    const data = await API.getData();
    const comb = data.combustibles.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[index];
    if(!comb) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Conductor:</strong> ${comb.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(comb.fecha)}</div>
            <div><strong>Litros:</strong> ${comb.litros} L</div>
            <div><strong>Kilometraje:</strong> ${comb.kilometraje} km</div>
            <div><strong>Costo Total:</strong> <span style="color:var(--accent-danger); font-weight:bold;">${formatMoney(comb.valor)}</span></div>
        </div>
    `;

    if (comb.imagen) {
        html += `<strong>Comprobante:</strong><br><img src="${comb.imagen}" alt="Comprobante Combustible">`;
    }

    openModal('Detalle Combustible', html);
};

window.verMantencion = async function(index) {
    const data = await API.getData();
    const mant = data.mantenciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[index];
    if(!mant) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><strong>Conductor:</strong> ${mant.driver}</div>
            <div><strong>Fecha:</strong> ${formatDate(mant.fecha)}</div>
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

    openModal('Detalle Mantención', html);
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});
