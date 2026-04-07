// Utilitaire d'export Excel/CSV/PDF réutilisable dans toute l'application
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exporte un tableau de données vers un fichier Excel (.xlsx)
 * @param {Array} data - Tableau d'objets à exporter
 * @param {string} filename - Nom du fichier sans extension
 * @param {string} sheetName - Nom de l'onglet Excel
 */
export function exportToExcel(data, filename = 'export', sheetName = 'Données') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Exporte un tableau de données vers un fichier CSV
 * @param {Array} data - Tableau d'objets à exporter
 * @param {string} filename - Nom du fichier sans extension
 */
export function exportToCSV(data, filename = 'export') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM pour UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte un tableau de données vers un fichier PDF stylisé A4
 * @param {Array} data - Tableau d'objets à exporter
 * @param {string} filename - Nom du fichier sans extension
 * @param {string} title - Titre affiché en haut du PDF
 */
export function exportToPDF(data, filename = 'export', title = 'Document') {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const dateStr = new Date().toLocaleString('fr-FR');
  
  // --- HEADER STYLE ---
  doc.setFillColor(79, 70, 229); // Indigo primary
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("DJAGO GESTION", 14, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 33);
  doc.text(`Généré le : ${dateStr}`, 196, 33, { align: 'right' });

  // --- CONTENT ---
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => Object.values(obj).map(v => v !== null && v !== undefined ? v.toString() : ''));

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { 
      fillColor: [79, 70, 229], 
      textColor: [255, 255, 254], // White-ish 
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { 
      fontSize: 9, 
      cellPadding: 4,
      valign: 'middle'
    },
    margin: { top: 45 },
  });

  // --- FOOTER ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} sur ${pageCount} - djagogestion.com`, 105, 285, { align: 'center' });
  }

  // --- DOWNLOAD (BLOB) ---
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
