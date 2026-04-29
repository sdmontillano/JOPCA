import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const formatCurrency = (value, showSign = false) => {
  const num = Number(value ?? 0);
  if (showSign) {
    const sign = num >= 0 ? "+" : "-";
    return `${sign}₱${Math.abs(num).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
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
const PAGE_BREAK_THRESHOLD = 200;

// Function to check and add new page if needed before rendering table
const checkAndAddPage = (doc, y, estimatedRows) => {
  const estimatedHeight = estimatedRows * 6 + 45;
  if (y + estimatedHeight > 270) {
    doc.addPage();
    return 20;
  }
  return y;
};

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
    const pcfUnreplenished = pcfTxns.filter(t => t.type === 'unreplenished');
    const pcfTotalDisb = pcfDisbursements.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pcfTotalRep = pcfReplenishments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const doc = new jsPDF();
    let y = 20;
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA DAILY REPORT", CENTER_X, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 10;
    
    doc.setLineWidth(0.3);
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    // Section 1: TOTAL COLLECTION
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. TOTAL COLLECTION", CENTER_X, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalCollection)}  (${collections.length} transactions)`, CENTER_X, y, { align: "center" });
    y += 5;
    
    if (collections.length > 0) {
      y = checkAndAddPage(doc, y, collections.length);
      
      const tableData = collections.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 4: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text("(No collection transactions)", CENTER_X, y, { align: "center" });
      y += 10;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 2: TOTAL DISBURSEMENT
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. TOTAL DISBURSEMENT", CENTER_X, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalDisbursement)}  (${disbursements.length} transactions)`, CENTER_X, y, { align: "center" });
    y += 5;
    
    if (disbursements.length > 0) {
      y = checkAndAddPage(doc, y, disbursements.length);
      
      const tableData = disbursements.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 4: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text("(No disbursement transactions)", CENTER_X, y, { align: "center" });
      y += 10;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 3: TOTAL ADJUSTMENTS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. TOTAL ADJUSTMENTS", CENTER_X, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${formatCurrency(totalAdjustments)}  (${adjustments.length} transactions)`, CENTER_X, y, { align: "center" });
    y += 5;
    
    if (adjustments.length > 0) {
      y = checkAndAddPage(doc, y, adjustments.length);
      
      const tableData = adjustments.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 4: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text("(No adjustment transactions)", CENTER_X, y, { align: "center" });
      y += 10;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 4: PCF TRANSACTIONS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. PCF TRANSACTIONS", CENTER_X, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Disbursements: ${formatCurrency(pcfTotalDisb)}  |  Replenishments: ${formatCurrency(pcfTotalRep)}`, CENTER_X, y, { align: "center" });
    y += 5;
    
    if (pcfTxns.length > 0) {
      y = checkAndAddPage(doc, y, pcfTxns.length);
      
      const tableData = pcfTxns.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.pcf_name || t.pcf?.name || "-",
        t.location || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "PCF Name", "Location", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 5: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text("(No PCF transactions)", CENTER_X, y, { align: "center" });
      y += 10;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 5: PDC TRANSACTIONS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5. PDC TRANSACTIONS", CENTER_X, y, { align: "center" });
    y += 8;
    
    const pdcMatured = pdcTxns.filter(p => p.status === 'matured').length;
    const pdcDeposited = pdcTxns.filter(p => p.status === 'deposited').length;
    const pdcPending = pdcTxns.filter(p => !p.status || p.status === 'pending').length;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Matured: ${pdcMatured}  |  Deposited: ${pdcDeposited}  |  Pending: ${pdcPending}`, CENTER_X, y, { align: "center" });
    y += 5;
    
    if (pdcTxns.length > 0) {
      y = checkAndAddPage(doc, y, pdcTxns.length);
      
      const tableData = pdcTxns.slice(0, 30).map(p => [
        p.check_no || "-",
        p.bank_name || "-",
        formatCurrency(p.amount),
        p.status || "pending",
        p.maturity_date ? formatDate(p.maturity_date) : "-"
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Check #", "Bank", "Amount", "Status", "Maturity Date"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 2: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text("(No PDC transactions)", CENTER_X, y, { align: "center" });
      y += 10;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 6: CASH IN BANKS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("6. CASH IN BANKS", CENTER_X, y, { align: "center" });
    y += 10;
    
    const accounts = dailyData?.accounts || [];
    if (accounts.length > 0) {
      y = checkAndAddPage(doc, y, accounts.length);
      
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
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 9, hAlign: "center" },
        columnStyles: { 2: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 7: PCF CASH SUMMARY
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("7. PCF CASH SUMMARY", CENTER_X, y, { align: "center" });
    y += 10;
    
    const pcfs = dailyData?.cash_on_hand || [];
    if (pcfs.length > 0) {
      y = checkAndAddPage(doc, y, pcfs.length);
      
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
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 2: { hAlign: "right" }, 3: { hAlign: "right" }, 4: { hAlign: "right" }, 5: { hAlign: "right" } },
        margin: { left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 8: CASH POSITION SUMMARY
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("8. CASH POSITION SUMMARY", CENTER_X, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA CORPORATION", CENTER_X, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("CASH POSITION SUMMARY", CENTER_X, y, { align: "center" });
    y += 5;
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 12;
    
    if (cashSummary && cashSummary.areas) {
      y = checkAndAddPage(doc, y, Object.keys(cashSummary.areas).length + 2);
      
      const areaData = [];
      let mainOfficeTotal = 0;
      let partsTotal = 0;
      
      for (const [areaCode, areaDataObj] of Object.entries(cashSummary.areas)) {
        if (areaDataObj.banks && areaDataObj.banks.length > 0) {
          const areaName = areaDataObj.display_name || areaCode;
          const areaTotalVal = areaDataObj.total || 0;
          const mainOfficeVal = areaDataObj.is_part ? "-" : formatCurrency(areaTotalVal);
          const partsVal = areaDataObj.is_part ? formatCurrency(areaTotalVal) : "-";
          
          areaData.push([areaName, mainOfficeVal, partsVal, formatCurrency(areaTotalVal)]);
          
          if (areaDataObj.is_part) {
            partsTotal += areaTotalVal;
          } else {
            mainOfficeTotal += areaTotalVal;
          }
        }
      }
      
      const grandTotalVal = cashSummary.grand_total || 0;
      areaData.push(["GRAND TOTAL", formatCurrency(mainOfficeTotal), formatCurrency(partsTotal), formatCurrency(grandTotalVal)]);
      
      autoTable(doc, {
        startY: y,
        head: [["AREA", "MAIN OFFICE", "PARTS", "TOTAL"]],
        body: areaData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center" },
        styles: { fontSize: 9, hAlign: "center" },
        columnStyles: { 1: { hAlign: "right" }, 2: { hAlign: "right" }, 3: { hAlign: "right" } },
        margin: { left: 35, right: 35 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    if (cashSummary && cashSummary.payables) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PAYABLES:", LEFT_MARGIN, y);
      y += 6;
      
      const payables = cashSummary.payables;
      const totalDisbToday = (payables.main_office?.disbursements_today || 0) + (payables.parts?.disbursements_today || 0);
      const totalChecks = (payables.main_office?.outstanding_checks || 0) + (payables.parts?.outstanding_checks || 0);
      const payablesTotal = totalDisbToday + totalChecks;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Description`, LEFT_MARGIN, y);
      doc.text(`MAIN OFFICE`, LEFT_MARGIN + 50, y);
      doc.text(`PARTS`, LEFT_MARGIN + 90, y);
      doc.text(`TOTAL`, LEFT_MARGIN + 130, y, { align: "right" });
      y += 6;
      
      doc.text(`Total Disb. for Today`, LEFT_MARGIN, y);
      doc.text(formatCurrency(payables.main_office?.disbursements_today || 0), LEFT_MARGIN + 50, y);
      doc.text(formatCurrency(payables.parts?.disbursements_today || 0), LEFT_MARGIN + 90, y);
      doc.text(formatCurrency(totalDisbToday), LEFT_MARGIN + 130, y, { align: "right" });
      y += 6;
      
      doc.text(`Outstanding Checks Due`, LEFT_MARGIN, y);
      doc.text(formatCurrency(payables.main_office?.outstanding_checks || 0), LEFT_MARGIN + 50, y);
      doc.text(formatCurrency(payables.parts?.outstanding_checks || 0), LEFT_MARGIN + 90, y);
      doc.text(formatCurrency(totalChecks), LEFT_MARGIN + 130, y, { align: "right" });
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text(`GRAND TOTAL`, LEFT_MARGIN, y);
      doc.text(formatCurrency(totalDisbToday + totalChecks), LEFT_MARGIN + 130, y, { align: "right" });
      y += 10;
    }
    
    if (cashSummary && cashSummary.net_balance) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const netBalance = cashSummary.net_balance.total || cashSummary.grand_total || 0;
      doc.text(`NET BALANCE: ${formatCurrency(netBalance)}`, LEFT_MARGIN + 130, y, { align: "right" });
      y += 15;
    }
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    // Section 9: ANALYSIS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("9. ANALYSIS", CENTER_X, y, { align: "center" });
    y += 10;
    
    const netBank = totalCollection - totalDisbursement + totalAdjustments;
    const grandTotal = netBank + (pcfTotalRep - pcfTotalDisb);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY:", LEFT_MARGIN, y);
    y += 7;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Total Collections:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(totalCollection), LEFT_MARGIN + 130, y, { align: "right" });
    y += 6;
    
    doc.text(`Total Disbursements:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(totalDisbursement), LEFT_MARGIN + 130, y, { align: "right" });
    y += 6;
    
    doc.text(`Total Adjustments:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(totalAdjustments), LEFT_MARGIN + 130, y, { align: "right" });
    y += 6;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Net Bank:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(netBank), LEFT_MARGIN + 130, y, { align: "right" });
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.text(`PCF Disbursements:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(pcfTotalDisb), LEFT_MARGIN + 130, y, { align: "right" });
    y += 6;
    
    doc.text(`PCF Replenishments:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(pcfTotalRep), LEFT_MARGIN + 130, y, { align: "right" });
    y += 6;
    
    doc.setFont("helvetica", "bold");
    doc.text(`PCF Net:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(pcfTotalRep - pcfTotalDisb), LEFT_MARGIN + 130, y, { align: "right" });
    y += 8;
    
    doc.setFontSize(11);
    doc.text(`GRAND TOTAL:`, LEFT_MARGIN, y);
    doc.text(formatCurrency(grandTotal), LEFT_MARGIN + 130, y, { align: "right" });
    y += 15;
    
    // Footer
    doc.setLineWidth(0.3);
    doc.line(LEFT_MARGIN, y, RIGHT_MARGIN, y);
    y += 10;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared by:`, LEFT_MARGIN, y);
    y += 6;
    doc.text(`Approved by:`, LEFT_MARGIN, y);
    y += 8;
    
    doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, CENTER_X, y, { align: "center" });
    
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