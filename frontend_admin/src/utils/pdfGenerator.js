import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./../fonts/arial-normal.js";

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
  return `\u20B1${num.toLocaleString("en-PH", {
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
    
    const doc = new jsPDF(); let y = 20; const marginL = 20; const marginRightL = 190; const textOpts = { baseline: 'top', lineHeightFactor: 1.2 };
    
    // Register Unicode font for peso sign and special characters
    try {
      doc.addFileToVFS("arial.ttf", arialBase64);
      doc.addFont("arial.ttf", "Arial", "normal");
      doc.setFont("Arial");
      console.log('Arial font set successfully');
    } catch (e) {
      console.error('Error setting Arial font:', e);
    }
    
    // =============================================
    // PAGE 1: CASH IN BANK
    // =============================================
    doc.setFontSize(16);
    doc.setFont("Arial", "bold");
    doc.text("JOPCA CASH IN BANK", CENTER_X, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("Arial", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 8;
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    y += 8;
    doc.line(marginL, y, marginRightL, y);
    y += 8;
    
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
        headStyles: { fillColor: [30, 41, 59], hAlign: "center", fontSize: 10 },
        bodyStyles: { fontSize: 9, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 45, hAlign: "left" },
          1: { cellWidth: 55, hAlign: "center" },
          2: { cellWidth: 40, hAlign: "right" }
        },
        margin: { left: marginL, right: marginRightL }
      });
    }
    
    // =============================================
    // PAGE 2: MONTHLY REPORT
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("Arial", "bold");
    doc.text("JOPCA MONTHLY REPORT", CENTER_X, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("Arial", "normal");
    doc.text(`Date: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 8;
    doc.line(marginL, y, marginRightL, y);
    y += 8;
    
    // COLLECTION Section
    doc.setFontSize(12);
    doc.setFont("Arial", "bold");
    doc.text("COLLECTION", marginL, y);
    doc.text(`Total: ${formatCurrency(totalCollection)}`, marginRightL, y, { align: "right" });
    y += 6;
    if (collections.length > 0) {
      const tableData = collections.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [22, 101, 52], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 65, hAlign: "left" }, 
          3: { cellWidth: 32, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("Arial", "normal");
      doc.setFontSize(9);
      doc.text("(No collection)", marginL, y);
      y += 6;
    }
    
    // DISBURSEMENT Section
    y += 4;
    doc.setFontSize(12);
    doc.setFont("Arial", "bold");
    doc.text("DISBURSEMENT", marginL, y);
    doc.text(`Total: ${formatCurrency(totalDisbursement)}`, marginRightL, y, { align: "right" });
    y += 6;
    if (disbursements.length > 0) {
      const tableData = disbursements.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [153, 27, 27], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 65, hAlign: "left" }, 
          3: { cellWidth: 32, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("Arial", "normal");
      doc.setFontSize(9);
      doc.text("(No disbursement)", marginL, y);
      y += 6;
    }
    
    // PCF TRANSACTIONS Section
    y += 4;
    doc.setFontSize(12);
    doc.setFont("Arial", "bold");
    doc.text("PCF TRANSACTIONS", marginL, y);
    doc.text(`Disb: ${formatCurrency(pcfTotalDisb)} | Rep: ${formatCurrency(pcfTotalRep)}`, marginRightL, y, { align: "right" });
    y += 6;
    if (pcfTxns.length > 0) {
      const tableData = pcfTxns.map(t => [t.date ? formatDate(t.date) : "-", t.pcf_name || t.pcf?.name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "PCF Name", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [124, 58, 237], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 25, hAlign: "center" }, 
          3: { cellWidth: 55, hAlign: "left" }, 
          4: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("Arial", "normal");
      doc.setFontSize(9);
      doc.text("(No PCF transactions)", marginL, y);
      y += 6;
    }
    
    // ADJUSTMENTS Section
    y += 4;
    doc.setFontSize(12);
    doc.setFont("Arial", "bold");
    doc.text("ADJUSTMENTS", marginL, y);
    doc.text(`Total: ${formatCurrency(totalAdjustments)}`, marginRightL, y, { align: "right" });
    y += 6;
    if (adjustments.length > 0) {
      const tableData = adjustments.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 25, hAlign: "center" }, 
          3: { cellWidth: 53, hAlign: "left" }, 
          4: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("Arial", "normal");
      doc.setFontSize(9);
      doc.text("(No adjustments)", marginL, y);
      y += 6;
    }
    
    // BANK CHARGES Section
    y += 4;
    doc.setFontSize(12);
    doc.setFont("Arial", "bold");
    doc.text("BANK CHARGES", marginL, y);
    doc.text(`Total: ${formatCurrency(totalBankCharges)}`, marginRightL, y, { align: "right" });
    y += 6;
    if (bankCharges.length > 0) {
      const tableData = bankCharges.map(t => [t.date ? formatDate(t.date) : "-", t.bank_name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [107, 114, 128], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 28, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 65, hAlign: "left" }, 
          3: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("Arial", "normal");
      doc.setFontSize(9);
      doc.text("(No bank charges)", marginL, y);
      y += 6;
    }
    
    // =============================================
    // PAGE 3: PCF
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("Arial", "bold");
    doc.text("JOPCA PCF", CENTER_X, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("Arial", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 8;
    doc.line(marginL, y, marginRightL, y);
    y += 8;
    
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
        headStyles: { fillColor: [124, 58, 237], hAlign: "center", fontSize: 9 },
        styles: { fontSize: 8, hAlign: "center" },
        columnStyles: { 
          0: { cellWidth: 28, hAlign: "left" }, 
          1: { cellWidth: 28, hAlign: "center" }, 
          2: { cellWidth: 28, hAlign: "right" }, 
          3: { cellWidth: 28, hAlign: "right" }, 
          4: { cellWidth: 28, hAlign: "right" }, 
          5: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
    }
    
    // =============================================
    // PAGE 4: CASH POSITION SUMMARY (Landscape Format)
    // =============================================
    doc.addPage("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();    const pageHeight = doc.internal.pageSize.getHeight();    const marginLP4 = 15;    const tableWidthL = pageWidth - marginLP4 * 2;    y = 18;
    const tableWidth = tableWidthL;

    // Header - centered properly
    doc.setFontSize(16);
    doc.setFont("Arial", "bold");
    doc.text("JOPCA CORPORATION", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(13);
    doc.setFont("Arial", "bold");
    doc.text("CASH POSITION SUMMARY", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(9);
    doc.setFont("Arial", "normal");
    doc.text(`As of: ${formattedDate}`, pageWidth / 2, y, { align: "center" });
    y += 8;
    
    // Section header - AREA table
    doc.setFontSize(10);
    doc.setFont("Arial", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("AREA", marginL, y);
    doc.text("MAIN OFFICE", marginL + 55, y);
    doc.text("PARTS", marginL + 105, y);
    doc.text("TOTAL", marginL + 160, y);
    y += 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginL + 180, y);
    y += 5;

    let mainOfficeTotal = 0;
    let partsTotal = 0;
    const areasData = [];

    if (cashSummary && cashSummary.areas) {
      for (const [areaCode, areaDataObj] of Object.entries(cashSummary.areas)) {
        if (areaDataObj.banks && areaDataObj.banks.length > 0) {
          const areaTotalVal = Number(areaDataObj.total || 0);
          
          if (areaDataObj.is_part) {
            partsTotal += areaTotalVal;
            for (const bank of areaDataObj.banks) {
              areasData.push([
                bank.account_number || "",
                "-",
                formatCurrency(bank.balance),
                formatCurrency(bank.balance)
              ]);
            }
          } else {
            mainOfficeTotal += areaTotalVal;
            for (const bank of areaDataObj.banks) {
              areasData.push([
                bank.account_number || "",
                formatCurrency(bank.balance),
                "-",
                formatCurrency(bank.balance)
              ]);
            }
          }
        }
      }
    }

    const cashGrandTotal = mainOfficeTotal + partsTotal;
    areasData.push([
      "GRAND TOTAL",
      formatCurrency(mainOfficeTotal),
      formatCurrency(partsTotal),
      formatCurrency(cashGrandTotal)
    ]);

    autoTable(doc, {
      startY: y,
      head: [["AREA", "MAIN OFFICE", "PARTS", "TOTAL"]],
      body: areasData,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, hAlign: "center" },
      bodyStyles: { fontSize: 8, hAlign: "center", minCellWidth: 20 },
      margin: { left: marginL, right: marginRightL },
      tableWidth,
      columnStyles: {
        0: { cellWidth: 65, hAlign: "left" },
        1: { cellWidth: 65, hAlign: "right" },
        2: { cellWidth: 65, hAlign: "right" },
        3: { cellWidth: 65, hAlign: "right" },
      },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Check for page overflow and add new page if needed
    if (y > pageHeight - 40) {
      doc.addPage("landscape");
      y = 18;
    }

    // PAYABLES Section
    doc.setFontSize(10);
    doc.setFont("Arial", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("PAYABLES:", marginL, y);
    y += 6;

    const mainDisb = cashSummary?.payables?.main_office?.disbursements_today || 0;
    const mainChecks = cashSummary?.payables?.main_office?.outstanding_checks || 0;
    const partsDisb = cashSummary?.payables?.parts?.disbursements_today || 0;
    const partsChecks = cashSummary?.payables?.parts?.outstanding_checks || 0;

    const payablesData = [
      [
        "Total Disb. for Today",
        formatCurrency(mainDisb),
        formatCurrency(partsDisb),
        formatCurrency(mainDisb + partsDisb)
      ],
      [
        "Outstanding Checks Due",
        mainChecks > 0 ? formatCurrency(mainChecks) : "-",
        partsChecks > 0 ? formatCurrency(partsChecks) : "-",
        (mainChecks + partsChecks) > 0 ? formatCurrency(mainChecks + partsChecks) : "-"
      ],
      [
        "GRAND TOTAL",
        formatCurrency(mainDisb + mainChecks),
        formatCurrency(partsDisb + partsChecks),
        formatCurrency(mainDisb + mainChecks + partsDisb + partsChecks)
      ],
    ];

    autoTable(doc, {
      startY: y,
      head: [["DESCRIPTION", "MAIN OFFICE", "PARTS", "TOTAL"]],
      body: payablesData,
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 9, hAlign: "center" },
      bodyStyles: { fontSize: 8, hAlign: "center" },
      margin: { left: marginL, right: marginRightL },
      tableWidth,
      columnStyles: {
        0: { cellWidth: 50, hAlign: "left" },
        1: { cellWidth: 40, hAlign: "right" },
        2: { cellWidth: 40, hAlign: "right" },
        3: { cellWidth: 40, hAlign: "right" },
      },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Check for page overflow
    if (y > pageHeight - 35) {
      doc.addPage("landscape");
      y = 18;
    }

    // NET BALANCE
    const netMainOffice = mainOfficeTotal - (mainDisb + mainChecks);
    const netParts = partsTotal - (partsDisb + partsChecks);
    const netBalanceTotal = netMainOffice + netParts;

    doc.setFontSize(10);
    doc.setFont("Arial", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("NET BALANCE:", marginL, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["NET BALANCE", "", "", ""]],
      body: [[
        "",
        formatCurrency(netMainOffice),
        formatCurrency(netParts),
        formatCurrency(netBalanceTotal)
      ]],
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10, hAlign: "left" },
      bodyStyles: { fontSize: 10, fontStyle: "bold", hAlign: "center" },
      margin: { left: marginL, right: marginRightL },
      tableWidth,
      columnStyles: {
        0: { cellWidth: 50, hAlign: "left" },
        1: { cellWidth: 40, hAlign: "right" },
        2: { cellWidth: 40, hAlign: "right" },
        3: { cellWidth: 40, hAlign: "right" },
      },
    });

    y = doc.lastAutoTable.finalY + 12;

    // Signatures section
    doc.setFontSize(9);
    doc.setFont("Arial", "normal");
    doc.setTextColor(0, 0, 0);
    const userName = localStorage.getItem("userName") || "User";
    doc.text(`Prepared by: ${userName}`, marginL, y);
    doc.text("Approved by: JOHN P. CABA\u00D1OG", marginL + 85, y);
    
    // =============================================
    // PAGE 5: ANALYSIS
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("Arial", "bold");
    doc.text("JOPCA ANALYSIS", CENTER_X, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("Arial", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 8;
    doc.line(marginL, y, marginRightL, y);
    y += 8;
    
    const netBank = totalCollection - totalDisbursement + totalAdjustments - totalBankCharges;
    const pcfNet = pcfTotalRep - pcfTotalDisb;
    const grandTotal = netBank + pcfNet;
    
    doc.setFontSize(11);
    doc.setFont("Arial", "bold");
    doc.text("SUMMARY", marginL, y);
    y += 6;
    
    doc.setFont("Arial", "normal");
    doc.setFontSize(10);
    
    // Bank Transactions
    doc.setFont("Arial", "bold");
    doc.text("Bank Transactions:", marginL, y);
    y += 6;
    doc.setFont("Arial", "normal");
    doc.text(`Total Collections:`, marginL + 8, y);
    doc.text(formatCurrency(totalCollection), marginRightL + 40, y, { align: "right" });
    y += 5;
    
    doc.setFont("Arial", "bold");
    doc.text(`Net Bank:`, marginL + 8, y);
    doc.text(formatCurrency(netBank), marginRightL + 40, y, { align: "right" });
    y += 8;
    
    // PCF Transactions
    doc.setFont("Arial", "normal");
    doc.text("PCF Transactions:", marginL, y);
    y += 6;
    doc.text(`Total Disbursements:`, marginL + 8, y);
    doc.text(formatCurrency(pcfTotalDisb), marginRightL + 40, y, { align: "right" });
    y += 5;
    doc.text(`Total Replenishments:`, marginL + 8, y);
    doc.text(formatCurrency(pcfTotalRep), marginRightL + 40, y, { align: "right" });
    y += 5;
    
    doc.setFont("Arial", "bold");
    doc.text(`PCF Net:`, marginL + 8, y);
    doc.text(formatCurrency(pcfNet), marginRightL + 40, y, { align: "right" });
    y += 8;
    
    // Grand Total
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL:`, marginL + 8, y);
    doc.text(formatCurrency(grandTotal), marginRightL + 40, y, { align: "right" });
    
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

