/**
 * SERFOVER API — versión Firebase (sin Firebase Storage)
 * ------------------------------------------------------------
 * Firestore guarda y lee los DATOS (rápido, gratis, sin tarjeta).
 * Las FOTOS se siguen subiendo a Google Drive a través de tu Apps
 * Script existente — igual que hoy — pero ahora en segundo plano,
 * sin bloquear el guardado del reporte.
 * Google Sheets se sigue llenando solo, vía sheets_sync.gs.
 *
 * IMPORTANTE: reemplaza los valores de FIREBASE_CONFIG con los que
 * te dio la consola de Firebase (Configuración del proyecto → Tus
 * apps → ícono web).
 * ------------------------------------------------------------
 */

// ====== 1. CONFIGURACIÓN DE FIREBASE ======
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCLDqM1ffPATN0KlRkBT5gIvoQ9uNtCrd0",
    authDomain: "serfover-app.firebaseapp.com",
    projectId: "serfover-app",
    storageBucket: "serfover-app.firebasestorage.app",
    messagingSenderId: "927417240553",
    appId: "1:927417240553:web:61c1c4b9b439ee92459978"
};

// URL de tu Apps Script existente (el mismo que ya usas hoy). Ahora
// solo se usa para subir fotos a Drive, ya no para guardar los datos.
const GOOGLE_SHEETS_URL_DATA = "https://script.google.com/macros/s/AKfycbwq0U0Xe0vlRRb2c0LsKDh8HnEASOTKXT761tXPFePFWO-1l8kAwclSXFtqjYcgzqYSWw/exec";

if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Permite que la app funcione offline usando la caché local de Firestore.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.warn('No se pudo activar persistencia offline de Firestore:', err.code);
});

// Sesión anónima: permite que las reglas de seguridad exijan "usuario
// autenticado" sin tocar tu sistema de login por roles.
let authReadyPromise = new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
        if (user) resolve(user);
    });
});
auth.signInAnonymously().catch((err) => console.error('Error en auth anónima:', err));

// Mapeo tipo de dato -> nombre de colección en Firestore
const COLLECTIONS = {
    reporte: 'reportes',
    combustible: 'combustibles',
    mantencion: 'mantenciones'
};

class SERFOVER_API {
    constructor() {
        if (!localStorage.getItem('serfover_offline_queue')) {
            localStorage.setItem('serfover_offline_queue', JSON.stringify([]));
        }
        if (!localStorage.getItem('serfover_pending_images')) {
            localStorage.setItem('serfover_pending_images', JSON.stringify([]));
        }
        window.addEventListener('online', () => {
            this.syncOfflineQueue();
            this.syncPendingImages();
        });
        // Reintenta imágenes pendientes al cargar la app, por si quedaron
        // colgadas de una sesión anterior.
        this.syncPendingImages();
    }

    // --------------------------------------------------------
    // Registros que no se pudieron guardar por falta de conexión
    // --------------------------------------------------------
    async syncOfflineQueue() {
        if (!navigator.onLine) return;

        let queue = [];
        try {
            queue = JSON.parse(localStorage.getItem('serfover_offline_queue')) || [];
        } catch (e) { queue = []; }

        if (queue.length === 0) return;

        console.log(`Sincronizando ${queue.length} registros pendientes...`);
        const newQueue = [];
        for (const payload of queue) {
            try {
                await this._writeToFirestore(payload);
            } catch (error) {
                console.error('Error sincronizando registro pendiente, se mantiene en cola', error);
                newQueue.push(payload);
            }
        }
        localStorage.setItem('serfover_offline_queue', JSON.stringify(newQueue));

        if (newQueue.length === 0 && queue.length > 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('✅ Datos pendientes sincronizados', 'success');
            }
        }
    }

    // --------------------------------------------------------
    // Fotos que no se pudieron subir a Drive (offline o error de red)
    // --------------------------------------------------------
    async syncPendingImages() {
        if (!navigator.onLine) return;

        let pending = [];
        try {
            pending = JSON.parse(localStorage.getItem('serfover_pending_images')) || [];
        } catch (e) { pending = []; }

        if (pending.length === 0) return;

        const remaining = [];
        for (const item of pending) {
            try {
                await this._uploadImageToDrive(item.docId, item.collectionName, item.type, item.imagen);
            } catch (error) {
                console.error('Error reintentando subir foto, se mantiene en cola', error);
                remaining.push(item);
            }
        }
        localStorage.setItem('serfover_pending_images', JSON.stringify(remaining));
    }

    // --------------------------------------------------------
    // Guardar un reporte / combustible / mantención
    // --------------------------------------------------------
    async sendData(payload) {
        if (!navigator.onLine) {
            this._queueOffline(payload);
            return { status: 'offline_queued' };
        }

        try {
            await authReadyPromise;
            await this._writeToFirestore(payload);
            return { status: 'success' };
        } catch (error) {
            console.error('Error enviando datos, guardando para reintentar:', error);
            this._queueOffline(payload);
            return { status: 'offline_queued' };
        }
    }

    async _writeToFirestore(payload) {
        const { type, imagen, ...fields } = payload;
        const collectionName = COLLECTIONS[type];
        if (!collectionName) throw new Error('Tipo de dato desconocido: ' + type);

        // 1. Guarda el registro DE INMEDIATO, sin esperar la foto.
        const docRef = await db.collection(collectionName).add({
            ...fields,
            imagen: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. La foto se sube después, en segundo plano, y no bloquea
        //    el guardado ni la respuesta al usuario.
        if (imagen && typeof imagen === 'string' && imagen.startsWith('data:image')) {
            this._uploadImageToDrive(docRef.id, collectionName, type, imagen).catch((err) => {
                console.error('No se pudo subir la foto ahora, se reintentará:', err);
                this._queuePendingImage(docRef.id, collectionName, type, imagen);
            });
        }
    }

    // Sube la imagen a Drive vía Apps Script y le pide que actualice
    // el campo "imagen" del documento correspondiente en Firestore.
    async _uploadImageToDrive(docId, collectionName, type, base64Image) {
        await fetch(GOOGLE_SHEETS_URL_DATA, {
            method: 'POST',
            body: JSON.stringify({
                action: 'uploadImage',
                docId: docId,
                collection: collectionName,
                type: type,
                imagen: base64Image
            }),
            headers: { 'Content-Type': 'text/plain' },
            mode: 'no-cors'
        });
        // mode: 'no-cors' no permite leer la respuesta; Apps Script deja
        // la URL directamente en Firestore, así que no la necesitamos aquí.
    }

    _queuePendingImage(docId, collectionName, type, imagen) {
        try {
            let pending = JSON.parse(localStorage.getItem('serfover_pending_images')) || [];
            pending.push({ docId, collectionName, type, imagen });
            localStorage.setItem('serfover_pending_images', JSON.stringify(pending));
        } catch (e) {
            console.error('No se pudo poner la foto en cola de reintento:', e);
        }
    }

    _queueOffline(payload) {
        try {
            let queue = JSON.parse(localStorage.getItem('serfover_offline_queue')) || [];
            queue.push(payload);
            localStorage.setItem('serfover_offline_queue', JSON.stringify(queue));
            if (typeof window.showToast === 'function') {
                window.showToast('Sin conexión. Guardado en cola para enviar luego.', 'warning');
            }
        } catch (e) {
            console.error('Error guardando en cola offline (probablemente límite de almacenamiento)', e);
            throw new Error('Almacenamiento lleno. No se pudo guardar offline.');
        }
    }

    // --------------------------------------------------------
    // Leer todos los datos (reportes, combustibles, mantenciones)
    // --------------------------------------------------------
    getCachedData() {
        try {
            const cached = localStorage.getItem('serfover_data_cache');
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Error leyendo cache:', e);
        }
        return null;
    }

    async getData() {
        try {
            await authReadyPromise;
            const [reportesSnap, combustiblesSnap, mantencionesSnap] = await Promise.all([
                db.collection('reportes').orderBy('fecha', 'desc').get(),
                db.collection('combustibles').orderBy('fecha', 'desc').get(),
                db.collection('mantenciones').orderBy('fecha', 'desc').get()
            ]);

            const result = {
                reportes: reportesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
                combustibles: combustiblesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
                mantenciones: mantencionesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
            };

            this._saveCache(result);
            return result;
        } catch (error) {
            console.error('Error obteniendo datos de Firestore:', error);
            const cached = this.getCachedData();
            if (cached) return cached;
            return { reportes: [], combustibles: [], mantenciones: [] };
        }
    }

    _saveCache(result) {
        try {
            localStorage.setItem('serfover_data_cache', JSON.stringify(result));
        } catch (e) {
            console.warn('No se pudo guardar en cache por límite de espacio:', e);
        }
    }

    // --------------------------------------------------------
    // Eliminar un registro
    // --------------------------------------------------------
    async deleteData(type, docId) {
        try {
            await authReadyPromise;
            const collectionName = COLLECTIONS[type];
            if (!collectionName) throw new Error('Tipo de dato desconocido: ' + type);
            await db.collection(collectionName).doc(String(docId)).delete();
            return { status: 'success' };
        } catch (error) {
            console.error('Error eliminando datos:', error);
            throw error;
        }
    }
}

const API = new SERFOVER_API();
window.API = API;
