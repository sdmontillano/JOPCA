import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const formatCurrency = (value) =>
  `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const INFLOW_TYPES = ['collection', 'deposit', 'collections', 'adjustment_in'];
const OUTFLOW_TYPES = ['disbursement', 'withdrawal', 'bank_charges', 'adjustments', 'adjustment_out'];

export const generatePdfReport = async (selectedDate, api, showToast) => {
  try {
    showToast("Generating report...", "info");
    
    const dateStr = selectedDate;
    const formattedDate = formatDate(dateStr);
    
    const [bankRes, pcfRes, dailyRes] = await Promise.all([
      api.get("/transactions/", { params: { date: dateStr } }),
      api.get("/pcf-transactions/", { params: { date: dateStr } }),
      api.get(`/summary/detailed-daily/`, { params: { date: dateStr } })
    ]);
    
    const bankTxns = bankRes.data?.results || bankRes.data || [];
    const pcfTxns = pcfRes.data?.results || pcfRes.data || [];
    const dailyData = dailyRes.data;
    
    const collections = bankTxns.filter(t => 
      t.type === 'collection' || t.type === 'collections' || t.type === 'deposit'
    );
    const disbursements = bankTxns.filter(t => 
      t.type === 'disbursement' || t.type === 'withdrawal'
    );
    const adjustments = bankTxns.filter(t => 
      t.type === 'adjustments' || t.type === 'adjustment_in' || t.type === 'adjustment_out'
    );
    
    const totalCollection = collections.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalDisbursement = disbursements.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, t) => {
      if (t.type === 'adjustment_out') return sum - Number(t.amount || 0);
      return sum + Number(t.amount || 0);
    }, 0);
    
    const pcfDisbursements = pcfTxns.filter(t => t.type === 'disbursement');
    const pcfReplenishments = pcfTxns.filter(t => t.type === 'replenishment');
    const pcfTotalDisb = pcfDisbursements.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pcfTotalRep = pcfReplenishments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA DAILY REPORT", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, pageWidth / 2, y, { align: "center" });
    y += 15;
    
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. TOTAL COLLECTION", 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalCollection)}`, 20, y);
    doc.text(`(${collections.length} transactions)`, 80, y);
    y += 5;
    
    if (collections.length > 0) {
      const collectionTable = collections.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " "),
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: collectionTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No collection transactions", 20, y);
      y += 10;
    }
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. TOTAL DISBURSEMENT", 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalDisbursement)}`, 20, y);
    doc.text(`(${disbursements.length} transactions)`, 80, y);
    y += 5;
    
    if (disbursements.length > 0) {
      const disbTable = disbursements.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " "),
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: disbTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No disbursement transactions", 20, y);
      y += 10;
    }
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. TOTAL ADJUSTMENTS", 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalAdjustments)}`, 20, y);
    doc.text(`(${adjustments.length} transactions)`, 80, y);
    y += 5;
    
    if (adjustments.length > 0) {
      const adjustTable = adjustments.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " "),
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: adjustTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No adjustment transactions", 20, y);
      y += 10;
    }
    
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. CASH IN BANKS", 20, y);
    y += 8;
    
    const accounts = dailyData?.accounts || [];
    if (accounts.length > 0) {
      const bankTable = accounts.map(a => [
        a.name || "-",
        a.account_number || "-",
        formatCurrency(a.balance)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Bank Name", "Account Number", "Balance"]],
        body: bankTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No bank accounts", 20, y);
      y += 10;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5. PCF CASH SUMMARY", 20, y);
    y += 8;
    
    const pcfs = dailyData?.cash_on_hand || [];
    if (pcfs.length > 0) {
      const pcfTable = pcfs.map(p => [
        p.pcf_name || "-",
        p.location || "-",
        formatCurrency(p.beginning_balance || 0),
        formatCurrency(p.disbursements || 0),
        formatCurrency(p.replenishments || 0),
        formatCurrency(p.ending_balance || 0)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["PCF Name", "Location", "Beginning", "Disb", "Rep", "Ending"]],
        body: pcfTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No PCF data", 20, y);
      y += 10;
    }
    
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("6. ANALYSIS", 20, y);
    y += 10;
    
    const netBank = totalCollection - totalDisbursement + totalAdjustments;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Transactions:", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`  Total Collections:     ${formatCurrency(totalCollection)}`, 25, y);
    y += 6;
    doc.text(`  Total Disbursements:  ${formatCurrency(totalDisbursement)}`, 25, y);
    y += 6;
    doc.text(`  Total Adjustments:    ${formatCurrency(totalAdjustments)}`, 25, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`  Net Bank:             ${formatCurrency(netBank)}`, 25, y);
    y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("PCF Transactions:", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`  Total Disbursements:  ${formatCurrency(pcfTotalDisb)}`, 25, y);
    y += 6;
    doc.text(`  Total Replenishments: ${formatCurrency(pcfTotalRep)}`, 25, y);
    y += 10;
    
    const grandTotal = netBank + (pcfTotalRep - pcfTotalDisb);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${formatCurrency(grandTotal)}`, 20, y);
    y += 15;
    
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, y, { align: "center" });
    
    const fileName = `jopca-report-${dateStr}.pdf`;
    doc.save(fileName);
    
    showToast("Report generated successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error generating PDF report:", error);
    showToast("Failed to generate report. Please try again.", "error");
    return false;
  }
};