/**
 * SERFOVER API
 * Esta clase maneja la comunicación con el "backend" (Google Sheets a través de Vercel).
 * Por ahora, simula la guardada de datos en localStorage para que el Dashboard pueda leerlos.
 * Cuando tengas el link del Web App de Google Apps Script, puedes reemplazar el valor de GOOGLE_SHEETS_URL.
 */

const GOOGLE_SHEETS_URL_DATA = "https://script.google.com/macros/s/AKfycbyCL-ZL5Rm7kOTpYNgqeOSbRanY1067sVv7bpwZ_H_9f-nVMEVYiKedXKcHh1kKh3Zl/exec";
const GOOGLE_SHEETS_URL_SOCIAL = "https://script.google.com/macros/s/AKfycbwK3jJUxAri9ygn9V4ySQMqvd-usQdIxlTInCtVe3bln8aYjK7OAO1DsJWUyx1CqIwG/exec";

class SERFOVER_API {
    constructor() {
        if (!localStorage.getItem('serfover_data')) {
            localStorage.setItem('serfover_data', JSON.stringify({
                reportes: [], combustibles: [], mantenciones: []
            }));
        }
    }

    _getUrl(type) {
        if (type && type.startsWith('social_')) {
            return GOOGLE_SHEETS_URL_SOCIAL;
        }
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
            // Obtener ambos y combinarlos
            const [resData, resSocial] = await Promise.all([
                fetch(GOOGLE_SHEETS_URL_DATA).then(r => r.json()).catch(() => ({ reportes: [], combustibles: [], mantenciones: [] })),
                fetch(GOOGLE_SHEETS_URL_SOCIAL).then(r => r.json()).catch(() => ({ social_posts: [], social_messages: [] }))
            ]);
            return { ...resData, ...resSocial };
        } catch (error) {
            console.error('Error obteniendo datos combinados:', error);
            return { reportes: [], combustibles: [], mantenciones: [], social_posts: [], social_messages: [] };
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
