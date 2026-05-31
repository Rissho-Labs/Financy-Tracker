/**
 * PDF → texto / imagem da 1ª página (DAS MEI, boletos, etc.)
 */
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
}

function dataUrlToBytes(dataUrl) {
  var b64 = String(dataUrl || '').split(',')[1] || '';
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function loadPdf(dataUrl) {
  var data = dataUrlToBytes(dataUrl);
  return pdfjsLib.getDocument({ data: data, useWorkerFetch: false, isEvalSupported: false }).promise;
}

async function renderFirstPage(dataUrl) {
  var pdf = await loadPdf(dataUrl);
  var page = await pdf.getPage(1);
  var viewport = page.getViewport({ scale: 2 });
  var canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({
    canvasContext: canvas.getContext('2d'),
    viewport: viewport,
  }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function extractText(dataUrl) {
  var pdf = await loadPdf(dataUrl);
  var parts = [];
  var maxPages = Math.min(pdf.numPages, 3);
  for (var p = 1; p <= maxPages; p++) {
    var page = await pdf.getPage(p);
    var content = await page.getTextContent();
    var text = content.items.map(function (it) { return it.str; }).join(' ');
    if (text.trim()) parts.push(text.trim());
  }
  return parts.join('\n\n');
}

if (typeof window !== 'undefined') {
  window.FTPdfBridge = {
    renderFirstPage: renderFirstPage,
    extractText: extractText,
    isPdfDataUrl: function (dataUrl) {
      return String(dataUrl || '').indexOf('data:application/pdf') === 0;
    },
  };
}
