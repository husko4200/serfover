function doPost(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (typeof e !== 'undefined' && e.postData && e.postData.contents) {
    try {
      var data = JSON.parse(e.postData.contents);
      var type = data.type;
      
      var sheetId = "";
      var rowData = [];

      if (type === 'reporte') {
        sheetId = "1p4L_ycv1yGRfnPrWmPK0Z6qWPyc5fHlDFKowLDMIsW0";
        rowData = [
          data.fecha,
          data.driver,
          data.movil,
          data.kilometraje,
          data.fundo,
          data.destino,
          data.faena,
          data.peaje || "",
          data.romana || "",
          data.guia || "",
          data.observaciones || "",
          data.imagen || ""
        ];
      } else if (type === 'combustible') {
        sheetId = "1okXBLROW87oGkq6ePnuSt66miNqoFfS-IwsrmtNMy58";
        rowData = [
          data.fecha,
          data.driver,
          data.litros,
          data.kilometraje,
          data.valor,
          data.imagen || ""
        ];
      } else if (type === 'mantencion') {
        sheetId = "1Fi15cc1RLt88Lsh5kqyutm9pNTRQn7e4YD9q0JUmgIU";
        rowData = [
          data.fecha,
          data.driver,
          data.tipo || "",
          data.kilometraje,
          data.descripcion,
          data.valor,
          data.imagen || ""
        ];
      }

      if (sheetId !== "") {
        var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
        sheet.appendRow(rowData);
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid Request" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // Lógica para que el Dashboard pueda LEER los datos
  var reportesSheet = SpreadsheetApp.openById("1p4L_ycv1yGRfnPrWmPK0Z6qWPyc5fHlDFKowLDMIsW0").getSheets()[0];
  var combustibleSheet = SpreadsheetApp.openById("1okXBLROW87oGkq6ePnuSt66miNqoFfS-IwsrmtNMy58").getSheets()[0];
  var mantencionSheet = SpreadsheetApp.openById("1Fi15cc1RLt88Lsh5kqyutm9pNTRQn7e4YD9q0JUmgIU").getSheets()[0];

  var reportesData = parseData(reportesSheet.getDataRange().getValues(), 'reporte');
  var combustibleData = parseData(combustibleSheet.getDataRange().getValues(), 'combustible');
  var mantencionData = parseData(mantencionSheet.getDataRange().getValues(), 'mantencion');

  var result = {
    reportes: reportesData,
    combustibles: combustibleData,
    mantenciones: mantencionData
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseData(values, type) {
  var result = [];
  if (values.length <= 1) return result; // Solo tiene los encabezados
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (type === 'reporte') {
      result.push({
        fecha: row[0],
        driver: row[1],
        movil: row[2],
        kilometraje: row[3],
        fundo: row[4],
        destino: row[5],
        faena: row[6],
        peaje: row[7],
        romana: row[8],
        guia: row[9],
        observaciones: row[10],
        imagen: row[11]
      });
    } else if (type === 'combustible') {
      result.push({
        fecha: row[0],
        driver: row[1],
        litros: row[2],
        kilometraje: row[3],
        valor: row[4],
        imagen: row[5]
      });
    } else if (type === 'mantencion') {
      result.push({
        fecha: row[0],
        driver: row[1],
        tipo: row[2],
        kilometraje: row[3],
        descripcion: row[4],
        valor: row[5],
        imagen: row[6]
      });
    }
  }
  return result;
}

// Requisito para CORS
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
