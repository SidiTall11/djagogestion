import jsPDF from 'jspdf';

/**
 * Génère et télécharge un ticket de caisse au format thermique (80mm)
 */
export const printThermalReceipt = (enterprise, saleData, items) => {
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Calcul de la hauteur dynamique : 120mm base + articles
  const docHeight = 120 + (items.length * 10);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, docHeight],
    putOnlyUsedFonts: true
  });

  let yPos = 12;
  
  const centerText = (text, y, size = 11, isBold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const textWidth = doc.getTextWidth(text);
    const x = (80 - textWidth) / 2;
    doc.text(text, x, y);
    return y + (size * 0.4);
  };

  // --- LOGO / NOM ---
  yPos = centerText(enterprise?.name?.toUpperCase() || 'DJAGO GESTION', yPos, 14, true) + 2;
  
  // --- INFOS ENTREPRISE ---
  doc.setFontSize(9);
  if (enterprise?.address) yPos = centerText(enterprise.address, yPos) + 1;
  if (enterprise?.phone) yPos = centerText("Tél: " + enterprise.phone, yPos) + 1;
  if (enterprise?.rccm) yPos = centerText("RCCM/NIF: " + enterprise.rccm, yPos) + 1;

  yPos += 4;
  doc.setLineWidth(0.5);
  doc.line(5, yPos, 75, yPos); // Séparateur
  
  // --- DETAILS TICKET ---
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  yPos = centerText("TICKET DE CAISSE", yPos) + 2;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 5, yPos);
  yPos += 5;
  doc.text(`N°: ${saleData?.id || 'PROVISOIRE'}`, 5, yPos);
  yPos += 5;
  doc.text(`Client: ${saleData?.customerName || 'Client de passage'}`, 5, yPos);
  
  yPos += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, yPos, 75, yPos);
  yPos += 6;

  // --- TABLEAU ARTICLES ---
  doc.setFont("helvetica", "bold");
  doc.text("Qté", 5, yPos);
  doc.text("Désignation", 15, yPos);
  doc.text("Total", 75, yPos, { align: "right" });
  
  yPos += 2;
  doc.setLineDashPattern([], 0);
  doc.line(5, yPos, 75, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  items.forEach(item => {
    // Quantité
    doc.text(`${item.quantity}`, 5, yPos);
    
    // Nom (découpage si trop long)
    const pName = item.product?.name || item.product_name || "Article";
    const nameLines = doc.splitTextToSize(pName, 40);
    doc.text(nameLines, 15, yPos);
    
    // Prix total ligne
    const linePrice = (item.quantity * item.unit_price);
    doc.text(fmt(linePrice), 75, yPos, { align: "right" });
    
    yPos += (nameLines.length * 4);
    
    // PU petit rappel
    doc.setFontSize(7.5);
    doc.text(`${fmt(item.unit_price)} / u`, 15, yPos);
    doc.setFontSize(9);
    
    yPos += 5;
  });

  yPos += 2;
  doc.setLineWidth(0.5);
  doc.line(5, yPos, 75, yPos);
  yPos += 7;

  // --- TOTAL ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL NET :", 5, yPos);
  doc.setFontSize(14);
  doc.text(`${fmt(saleData?.total || saleData?.total_amount || 0)} FCFA`, 75, yPos, { align: "right" });

  yPos += 10;
  if (saleData?.isCredit) {
    centerText("*** VENTE A CREDIT ***", yPos, 10, true);
    yPos += 6;
  }

  // --- PIED DE PAGE ---
  yPos += 4;
  centerText("Merci de votre confiance !", yPos, 9, false);
  yPos += 5;
  doc.setFontSize(7);
  centerText("Logiciel Djago Gestion - djagogestion.com", yPos);

  // --- GESTION DU TÉLÉCHARGEMENT (BLOB ROBUSTE) ---
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Ticket_${saleData?.id || 'Vente'}_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
