/**
 * SERFOVER API
 * Esta clase maneja la comunicación con el "backend" (Google Sheets a través de Vercel).
 * Por ahora, simula la guardada de datos en localStorage para que el Dashboard pueda leerlos.
 * Cuando tengas el link del Web App de Google Apps Script, puedes reemplazar el valor de GOOGLE_SHEETS_URL.
 */

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxoNAmzlYK4t-91oPRhREB17may0YO-vILcjvMsW_u1n-mD8zwhfR33PJNmcNjV9l_QpQ/exec";

class SERFOVER_API {
    constructor() {
        // Inicializar datos simulados si no existen
        if (!localStorage.getItem('serfover_data')) {
            localStorage.setItem('serfover_data', JSON.stringify({
                reportes: [],
                combustibles: [],
                mantenciones: []
            }));
        }
    }

    async sendData(payload) {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                // Para evitar errores CORS con Google Scripts, a veces es mejor omitir headers restrictivos o usar mode: 'no-cors' 
                // Pero si usamos Content-Type text/plain funciona mejor con Google
                headers: { 'Content-Type': 'text/plain' }
            });
            // Con Google Apps script, el redirect POST retorna algo.
            return { status: 'success' };
        } catch (error) {
            console.error('Error enviando datos a Google Sheets:', error);
            throw error;
        }
    }

    async getData() {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo datos:', error);
            return { reportes: [], combustibles: [], mantenciones: [] };
        }
    }

    async deleteData(type, rowId) {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', type: type, rowId: rowId }),
                headers: { 'Content-Type': 'text/plain' }
            });
            return { status: 'success' };
        } catch (error) {
            console.error('Error eliminando datos:', error);
            throw error;
        }
    }
}

const API = new SERFOVER_API();
