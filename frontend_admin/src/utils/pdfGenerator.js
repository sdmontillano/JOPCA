import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const formatCurrency = (value) => {
  let num = 0;
  if (value === null || value === undefined || value === '') {
    num = 0;
  } else if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/^[±\+\-]+/, '').trim();
    const withoutCommas = cleaned.replace(/,/g, '');
    num = Number(withoutCommas) || 0;
  } else {
    num = Number(value) || 0;
  }
  num = Math.abs(num);
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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

const PAGE_WIDTH = 210;
const CENTER_X = PAGE_WIDTH / 2;
const LEFT_MARGIN = 15;
const RIGHT_MARGIN = PAGE_WIDTH - LEFT_MARGIN;

export const generatePdfReport = async (selectedDate, api, showToast) => {
  try {
    showToast("Generating report...", "info");
    
    const dateStr = selectedDate;
    const formattedDate = formatDate(dateStr);
    
    const [bankRes, pcfRes, pdcRes, dailyRes, cashSummaryRes] = await Promise.all([
      api.get("/transactions/", { params: { date: dateStr, page_size: 500 } }),
      api.get("/pcf-transactions/", { params: { date: dateStr, page_size: 500 } }),
      api.get("/pdc/", { params: { date: dateStr, page_size: 500 } }),
      api.get(`/summary/detailed-daily/`, { params: { date: dateStr } }),
      api.get(`/summary/cash-summary/`, { params: { date: dateStr } })
    ]);
    
    const bankTxns = bankRes.data?.results || bankRes.data || [];
    const pcfTxns = pcfRes.data?.results || pcfRes.data || [];
    const pdcTxns = pdcRes.data?.results || pdcRes.data || [];
    const dailyData = dailyRes.data;
    const cashSummary = cashSummaryRes.data;
    
    const collections = bankTxns.filter(t => t.type === 'collection' || t.type === 'collections');
    const deposits = bankTxns.filter(t => t.type === 'deposit');
    const disbursements = bankTxns.filter(t => t.type === 'disbursement' || t.type === 'withdrawal');
    const adjustments = bankTxns.filter(t => t.type === 'adjustments' || t.type === 'adjustment_in' || t.type === 'adjustment_out');
    const bankCharges = bankTxns.filter(t => t.type === 'bank_charges');
    
    const totalCollection = collections.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalDisbursement = disbursements.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, t) => {
      if (t.type === 'adjustment_out') return sum - Number(t.amount || 0);
      return sum + Number(t.amount || 0);
    }, 0);
    const totalBankCharges = bankCharges.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const pcfDisbursements = pcfTxns.filter(t => t.type === 'disbursement');
    const pcfReplenishments = pcfTxns.filter(t => t.type === 'replenishment');
    const pcfTotalDisb = pcfDisbursements.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pcfTotalRep = pcfReplenishments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const doc = new jsPDF();
    let y = 20;
    
    // =============================================
    // PAGE 1: CASH IN BANK
    // =============================================
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA CASH IN BANK", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    const accounts = dailyData?.accounts || [];
    if (accounts.length > 0) {
      let bankTotal = 0;
      const bankTable = accounts.map(a => {
        const bal = Number(a.balance || 0);
        bankTotal += bal;
        return [a.name || "-", a.account_number || "-", formatCurrency(bal)];
      });
      bankTable.push(["GRAND TOTAL", "", formatCurrency(bankTotal)]);
      
      autoTable(doc, {
        startY: y,
        head: [["Bank Name", "Account Number", "Balance"]],
        body: bankTable,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 10, hAlign: "center" },
        columnStyles: { 2: { hAlign: "right" } },
        margin: { left: 30, right: 30 }
      });
    }
    
    // =============================================
    // PAGE 2: MONTHLY REPORT
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA MONTHLY REPORT", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 15;
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    // COLLECTION Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COLLECTION", LEFT_MARGIN, y);
    doc.text(`Total: ${formatCurrency(totalCollection)}`, RIGHT_MARGIN, y, { align: "right" });
    y += 8;
    if (collections.length > 0) {
      const tableData = collections.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [22, 101, 52], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 3: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("(No collection)", LEFT_MARGIN, y);
      y += 8;
    }
    
    // DISBURSEMENT Section
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DISBURSEMENT", LEFT_MARGIN, y);
    doc.text(`Total: ${formatCurrency(totalDisbursement)}`, RIGHT_MARGIN, y, { align: "right" });
    y += 8;
    if (disbursements.length > 0) {
      const tableData = disbursements.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [153, 27, 27], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 3: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("(No disbursement)", LEFT_MARGIN, y);
      y += 8;
    }
    
    // PCF TRANSACTIONS Section
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PCF TRANSACTIONS", LEFT_MARGIN, y);
    doc.text(`Disb: ${formatCurrency(pcfTotalDisb)} | Rep: ${formatCurrency(pcfTotalRep)}`, RIGHT_MARGIN, y, { align: "right" });
    y += 8;
    if (pcfTxns.length > 0) {
      const tableData = pcfTxns.map(t => [t.date ? formatDate(t.date) : "-", t.pcf_name || t.pcf?.name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "PCF Name", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [124, 58, 237], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 4: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("(No PCF transactions)", LEFT_MARGIN, y);
      y += 8;
    }
    
    // ADJUSTMENTS Section
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ADJUSTMENTS", LEFT_MARGIN, y);
    doc.text(`Total: ${formatCurrency(totalAdjustments)}`, RIGHT_MARGIN, y, { align: "right" });
    y += 8;
    if (adjustments.length > 0) {
      const tableData = adjustments.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 4: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("(No adjustments)", LEFT_MARGIN, y);
      y += 8;
    }
    
    // BANK CHARGES Section
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BANK CHARGES", LEFT_MARGIN, y);
    doc.text(`Total: ${formatCurrency(totalBankCharges)}`, RIGHT_MARGIN, y, { align: "right" });
    y += 8;
    if (bankCharges.length > 0) {
      const tableData = bankCharges.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [107, 114, 128], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 3: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("(No bank charges)", LEFT_MARGIN, y);
      y += 8;
    }
    
    // =============================================
    // PAGE 3: PCF
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA PCF", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 15;
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    const pcfs = dailyData?.cash_on_hand || [];
    if (pcfs.length > 0) {
      let pcfTotal = 0;
      const pcfTable = pcfs.map(p => {
        const endBal = Number(p.ending_balance || 0);
        pcfTotal += endBal;
        return [p.pcf_name || "-", p.location || "-", formatCurrency(p.beginning_balance || 0), formatCurrency(p.disbursements || 0), formatCurrency(p.replenishments || 0), formatCurrency(endBal)];
      });
      pcfTable.push(["GRAND TOTAL", "", "", "", "", formatCurrency(pcfTotal)]);
      
      autoTable(doc, {
        startY: y,
        head: [["PCF Name", "Location", "Beginning", "Disb", "Rep", "Ending"]],
        body: pcfTable,
        theme: "striped",
        headStyles: { fillColor: [124, 58, 237], hAlign: "center" },
        styles: { fontSize: 10, hAlign: "center" },
        columnStyles: { 2: { hAlign: "right" }, 3: { hAlign: "right" }, 4: { hAlign: "right" }, 5: { hAlign: "right" } },
        margin: { left: 25, right: 25 }
      });
    }
    
    // =============================================
    // PAGE 4: CASH SUMMARY
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA CASH SUMMARY", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 15;
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    if (cashSummary && cashSummary.areas) {
      let mainOfficeTotal = 0;
      let partsTotal = 0;
      const areaData = [];
      
      for (const [areaCode, areaDataObj] of Object.entries(cashSummary.areas)) {
        if (areaDataObj.banks && areaDataObj.banks.length > 0) {
          const areaTotalVal = areaDataObj.total || 0;
          const mainOfficeVal = areaDataObj.is_part ? "-" : formatCurrency(areaTotalVal);
          const partsVal = areaDataObj.is_part ? formatCurrency(areaTotalVal) : "-";
          
          if (!areaDataObj.is_part) mainOfficeTotal += areaTotalVal;
          if (areaDataObj.is_part) partsTotal += areaTotalVal;
          
          areaData.push([areaDataObj.display_name || areaCode, mainOfficeVal, partsVal, formatCurrency(areaTotalVal)]);
        }
      }
      
      const grandTotalVal = mainOfficeTotal + partsTotal;
      areaData.push(["GRAND TOTAL", formatCurrency(mainOfficeTotal), formatCurrency(partsTotal), formatCurrency(grandTotalVal)]);
      
      autoTable(doc, {
        startY: y,
        head: [["AREA", "MAIN OFFICE", "PARTS", "TOTAL"]],
        body: areaData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 10, hAlign: "center" },
        columnStyles: { 1: { hAlign: "right" }, 2: { hAlign: "right" }, 3: { hAlign: "right" } },
        margin: { left: 40, right: 40 }
      });
      y = doc.lastAutoTable.finalY + 15;
    }
    
    // PAYABLES
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYABLES:", LEFT_MARGIN, y);
    y += 8;
    
    if (cashSummary && cashSummary.payables) {
      const payables = cashSummary.payables;
      const mainDisb = payables.main_office?.disbursements_today || 0;
      const mainChecks = payables.main_office?.outstanding_checks || 0;
      const partsDisb = payables.parts?.disbursements_today || 0;
      const partsChecks = payables.parts?.outstanding_checks || 0;
      
      const payablesData = [
        ["Total Disb. for Today", formatCurrency(mainDisb + partsDisb)],
        ["Outstanding Checks Due", formatCurrency(mainChecks + partsChecks)],
        ["GRAND TOTAL", formatCurrency(mainDisb + partsDisb + mainChecks + partsChecks)]
      ];
      
      autoTable(doc, {
        startY: y,
        head: [["Description", "Total"]],
        body: payablesData,
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9], hAlign: "center" },
        styles: { fontSize: 10 },
        margin: { left: LEFT_MARGIN, right: 100 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // NET BALANCE
    if (cashSummary && cashSummary.net_balance) {
      const netBalance = cashSummary.net_balance.total || cashSummary.grand_total || 0;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`NET BALANCE: ${formatCurrency(netBalance)}`, LEFT_MARGIN, y);
    }
    
    // =============================================
    // PAGE 5: ANALYSIS
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA ANALYSIS", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 15;
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    const netBank = totalCollection - totalDisbursement + totalAdjustments - totalBankCharges;
    const pcfNet = pcfTotalRep - pcfTotalDisb;
    const grandTotal = netBank + pcfNet;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", LEFT_MARGIN, y);
    y += 10;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    // Bank Transactions
    doc.text("Bank Transactions:", LEFT_MARGIN, y);
    y += 8;
    doc.text(`Total Collections:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(totalCollection), 150, y, { align: "right" });
    y += 7;
    doc.text(`Total Disbursements:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(totalDisbursement), 150, y, { align: "right" });
    y += 7;
    doc.text(`Total Adjustments:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(totalAdjustments), 150, y, { align: "right" });
    y += 7;
    doc.text(`Total Bank Charges:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(totalBankCharges), 150, y, { align: "right" });
    y += 7;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Net Bank:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(netBank), 150, y, { align: "right" });
    y += 10;
    
    // PCF Transactions
    doc.setFont("helvetica", "normal");
    doc.text("PCF Transactions:", LEFT_MARGIN, y);
    y += 8;
    doc.text(`Total Disbursements:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(pcfTotalDisb), 150, y, { align: "right" });
    y += 7;
    doc.text(`Total Replenishments:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(pcfTotalRep), 150, y, { align: "right" });
    y += 7;
    
    doc.setFont("helvetica", "bold");
    doc.text(`PCF Net:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(pcfNet), 150, y, { align: "right" });
    y += 12;
    
    // Grand Total
    doc.setFontSize(14);
    doc.text(`GRAND TOTAL:`, LEFT_MARGIN + 10, y);
    doc.text(formatCurrency(grandTotal), 150, y, { align: "right" });
    
    // Save the PDF
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