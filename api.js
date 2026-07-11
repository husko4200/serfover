/**
 * SERFOVER API
 * Esta clase maneja la comunicación con el "backend" (Google Sheets a través de Vercel).
 * Por ahora, simula la guardada de datos en localStorage para que el Dashboard pueda leerlos.
 * Cuando tengas el link del Web App de Google Apps Script, puedes reemplazar el valor de GOOGLE_SHEETS_URL.
 */

const GOOGLE_SHEETS_URL_DATA = "https://script.google.com/macros/s/AKfycbyCL-ZL5Rm7kOTpYNgqeOSbRanY1067sVv7bpwZ_H_9f-nVMEVYiKedXKcHh1kKh3Zl/exec";

class SERFOVER_API {
    constructor() {
        if (!localStorage.getItem('serfover_data')) {
            localStorage.setItem('serfover_data', JSON.stringify({
                reportes: [], combustibles: [], mantenciones: []
            }));
        }
    }

    _getUrl(type) {
        return GOOGLE_SHEETS_URL_DATA;
    }

    async sendData(payload) {
        try {
            const targetUrl = this._getUrl(payload.type);
            const response = await fetch(targetUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain' },
                mode: 'no-cors'
            });
            return { status: 'success' };
        } catch (error) {
            console.error('Error enviando datos:', error);
            throw error;
        }
    }

    async getData() {
        try {
            const resData = await fetch(GOOGLE_SHEETS_URL_DATA)
                .then(r => r.json())
                .catch(e => {
                    console.error("Fetch error:", e);
                    return null;
                });
            
            if (resData && resData.reportes) {
                // Guardar en cache, pero eliminando las imágenes base64 para evitar QuotaExceededError (límite 5MB)
                try {
                    const dataForCache = JSON.parse(JSON.stringify(resData));
                    if (dataForCache.reportes) {
                        dataForCache.reportes.forEach(r => delete r.imagen);
                    }
                    if (dataForCache.combustibles) {
                        dataForCache.combustibles.forEach(c => delete c.imagenUrl);
                    }
                    if (dataForCache.mantenciones) {
                        dataForCache.mantenciones.forEach(m => delete m.imagen);
                    }
                    localStorage.setItem('serfover_data_cache', JSON.stringify(dataForCache));
                } catch(e) {
                    console.warn('No se pudo guardar en cache por límite de espacio:', e);
                }
                return resData;
            } else {
                // Si la respuesta es inválida, intentar usar el cache
                try {
                    const cached = localStorage.getItem('serfover_data_cache');
                    if (cached) return JSON.parse(cached);
                } catch(e) { console.warn(e); }
                return { reportes: [], combustibles: [], mantenciones: [] };
            }
        } catch (error) {
            console.error('Error obteniendo datos:', error);
            try {
                const cached = localStorage.getItem('serfover_data_cache');
                if (cached) return JSON.parse(cached);
            } catch(e) { console.warn(e); }
            return { reportes: [], combustibles: [], mantenciones: [] };
        }
    }

    async deleteData(type, rowId) {
        try {
            const targetUrl = this._getUrl(type);
            const response = await fetch(targetUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', type: type, rowId: rowId }),
                headers: { 'Content-Type': 'text/plain' },
                mode: 'no-cors'
            });
            return { status: 'success' };
        } catch (error) {
            console.error('Error eliminando datos:', error);
            throw error;
        }
    }
}

const API = new SERFOVER_API();
