// ============================================================
// SERFOVER - Google Apps Script (Backend)
// ============================================================
// INSTRUCCIONES:
// 1. Crea una carpeta en Google Drive llamada "Fotos Serfover".
// 2. Abre esa carpeta, copia el ID de la URL (la parte entre /folders/ y el siguiente /).
// 3. Pega el ID en la variable DRIVE_FOLDER_ID de abajo.
// 4. Copia TODO este código en tu Apps Script y haz una Nueva Implementación.
// ============================================================

// *** REEMPLAZA ESTE VALOR CON EL ID DE TU CARPETA DE GOOGLE DRIVE ***
var DRIVE_FOLDER_ID = "1n7P1JVzfVGId-N4H0El0lIG57bsbdX9l";

// IDs de los Google Sheets
var SHEET_IDS = {
  reporte:     "1p4L_ycv1yGRfnPrWmPK0Z6qWPyc5fHlDFKowLDMIsW0",
  combustible: "1okXBLROW87oGkq6ePnuSt66miNqoFfS-IwsrmtNMy58",
  mantencion:  "1Fi15cc1RLt88Lsh5kqyutm9pNTRQn7e4YD9q0JUmgIU"
};

// ------------------------------------------------------------
// Función principal: recibe los datos desde la aplicación web
// ------------------------------------------------------------
function doPost(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (typeof e === 'undefined' || !e.postData || !e.postData.contents) {
    return jsonResponse({ status: "error", message: "Invalid Request" });
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type;

    // ---- ACCIÓN: ELIMINAR FILA ----
    if (data.action === 'delete') {
      var sheetId = SHEET_IDS[type] || "";
      if (!sheetId) return jsonResponse({ status: "error", message: "Tipo inválido para eliminar" });

      var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
      var rowId = parseInt(data.rowId);
      if (rowId > 1) {
        sheet.deleteRow(rowId);
        return jsonResponse({ status: "success", deletedRow: rowId });
      }
      return jsonResponse({ status: "error", message: "Fila inválida para eliminar" });
    }

    // ---- ACCIÓN: GUARDAR REGISTRO ----
    var sheetId = SHEET_IDS[type] || "";
    if (!sheetId) return jsonResponse({ status: "error", message: "Tipo de datos desconocido: " + type });

    // Procesar la imagen: si viene en Base64, guardarla en Drive y obtener URL
    var imageUrl = "";
    if (data.imagen && data.imagen.startsWith('data:image')) {
      imageUrl = uploadImageToDrive(data.imagen, type + "_" + new Date().getTime());
    }

    var rowData = [];

    if (type === 'reporte') {
      rowData = [
        data.fecha,
        data.driver,
        data.movil        || "",
        data.kilometraje  || "",
        data.fundo        || "",
        data.destino      || "",
        data.faena        || "",
        data.peaje        || "",
        data.romana       || "",
        data.guia         || "",
        data.viatico      || "",
        data.total        || "",
        data.observaciones|| "",
        imageUrl             // URL de Google Drive en lugar de Base64
      ];
    } else if (type === 'combustible') {
      rowData = [
        data.fecha,
        data.driver,
        data.movil        || "",   // <<< NUEVA COLUMNA: Móvil
        data.litros       || "",
        data.kilometraje  || "",
        data.valor        || "",
        imageUrl                   // URL de Google Drive en lugar de Base64
      ];
    } else if (type === 'mantencion') {
      rowData = [
        data.fecha,
        data.driver,
        data.movil        || "",   // <<< NUEVA COLUMNA: Móvil
        data.tipo         || "",
        data.kilometraje  || "",
        data.descripcion  || "",
        data.valor        || 0,
        imageUrl                   // URL de Google Drive en lugar de Base64
      ];
    }

    var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    sheet.appendRow(rowData);

    return jsonResponse({ status: "success", imageUrl: imageUrl });

  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

// ------------------------------------------------------------
// Función: Sube la imagen a Google Drive y devuelve la URL
// ------------------------------------------------------------
function uploadImageToDrive(base64DataUrl, fileName) {
  try {
    // Separar el encabezado del contenido (ej: "data:image/jpeg;base64,/9j/4AA...")
    var parts = base64DataUrl.split(',');
    if (parts.length < 2) return "";

    var mimeMatch = parts[0].match(/:(.*?);/);
    var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var extension = mimeType.split('/')[1] || 'jpg';
    var base64Content = parts[1];

    // Decodificar el Base64 a bytes
    var decodedBytes = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName + "." + extension);

    // Subir a Google Drive
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file = folder.createFile(blob);

    // Guardar el ID inmediatamente antes de intentar setSharing
    var fileId = file.getId();
    var fileUrl = "https://drive.google.com/uc?id=" + fileId;

    // Intentar hacer el archivo público (puede fallar en cuentas con restricciones)
    // Si falla, igual devolvemos la URL — el admin puede ajustar permisos manualmente
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      Logger.log("Advertencia: No se pudo compartir el archivo públicamente: " + sharingErr.toString());
      // Intentamos con un método alternativo
      try {
        var resource = { role: "reader", type: "anyone" };
        Drive.Permissions.create(resource, fileId);
      } catch (altErr) {
        Logger.log("Advertencia: Método alternativo también falló: " + altErr.toString());
      }
    }

    // Devolver la URL directa para vista previa (funciona igual con permisos manuales)
    return fileUrl;

  } catch (err) {
    Logger.log("Error al subir imagen a Drive: " + err.toString());
    return ""; // Si falla, no guarda imagen pero sí el registro
  }
}

// ------------------------------------------------------------
// Función: Lee todos los datos para el Dashboard
// ------------------------------------------------------------
function doGet(e) {
  try {
    var reportesSheet     = SpreadsheetApp.openById(SHEET_IDS.reporte).getSheets()[0];
    var combustibleSheet  = SpreadsheetApp.openById(SHEET_IDS.combustible).getSheets()[0];
    var mantencionSheet   = SpreadsheetApp.openById(SHEET_IDS.mantencion).getSheets()[0];

    var result = {
      reportes:     parseData(reportesSheet.getDataRange().getValues(),    'reporte'),
      combustibles: parseData(combustibleSheet.getDataRange().getValues(), 'combustible'),
      mantenciones: parseData(mantencionSheet.getDataRange().getValues(),  'mantencion')
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ------------------------------------------------------------
// Función: Convierte filas de Sheets en objetos JSON
// IMPORTANTE: El orden de las columnas aquí debe coincidir
// con el orden en que insertamos las filas en doPost()
// ------------------------------------------------------------
function parseData(values, type) {
  var result = [];
  if (values.length <= 1) return result;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (type === 'reporte') {
      result.push({
        id:            i + 1,
        fecha:         row[0],
        driver:        row[1],
        movil:         row[2],
        kilometraje:   row[3],
        fundo:         row[4],
        destino:       row[5],
        faena:         row[6],
        peaje:         row[7],
        romana:        row[8],
        guia:          row[9],
        viatico:       row[10],
        total:         row[11],
        observaciones: row[12],
        imagen:        row[13]   // Ahora es una URL de Drive
      });
    } else if (type === 'combustible') {
      result.push({
        id:          i + 1,
        fecha:       row[0],
        driver:      row[1],
        movil:       row[2],   // <<< NUEVA COLUMNA
        litros:      row[3],
        kilometraje: row[4],
        valor:       row[5],
        imagen:      row[6]    // Ahora es una URL de Drive
      });
    } else if (type === 'mantencion') {
      result.push({
        id:          i + 1,
        fecha:       row[0],
        driver:      row[1],
        movil:       row[2],   // <<< NUEVA COLUMNA
        tipo:        row[3],
        kilometraje: row[4],
        descripcion: row[5],
        valor:       row[6],
        imagen:      row[7]    // Ahora es una URL de Drive
      });
    }
  }
  return result;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Requerido para preflight CORS
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
