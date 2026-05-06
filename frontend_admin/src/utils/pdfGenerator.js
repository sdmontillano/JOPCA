import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const formatCurrency = (value) => {
  let num = 0;
  if (value === null || value === undefined || value === '') {
    num = 0;
  } else if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
     const cleaned = value.replace(/^[±+-]+/, '').trim();
    const withoutCommas = cleaned.replace(/,/g, '');
    num = Number(withoutCommas) || 0;
  } else {
    num = Number(value) || 0;
  }
  const sign = num < 0 ? "-" : "";
  return `${sign}PHP ${Math.abs(num).toLocaleString("en-PH", {
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
    
     const [bankRes, pcfRes, dailyRes, cashSummaryRes, analysisRes] = await Promise.all([
       api.get("/transactions/", { params: { date: dateStr, page_size: 500 } }),
       api.get("/pcf-transactions/", { params: { date: dateStr, page_size: 500 } }),
       api.get(`/summary/detailed-daily/`, { params: { date: dateStr } }),
       api.get(`/summary/cash-summary/`, { params: { date: dateStr } }),
       api.get(`/summary/bank-analysis/`, { params: { date: dateStr } })  // NEW: Add bank analysis data
     ]);

    const bankTxns = bankRes.data?.results || bankRes.data || [];
    const pcfTxns = pcfRes.data?.results || pcfRes.data || [];
    const dailyData = dailyRes.data;
    const cashSummary = cashSummaryRes.data;
    const analysisData = analysisRes.data;  // NEW: Contains banks with auto_computed + reconciliation
     
     // Use individual_collections from daily summary (includes ALL collections with status)
     const allCollections = dailyData?.individual_collections || [];
     const totalCollection = allCollections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
     
     // Calculate other totals from bank transactions
     const disbursements = bankTxns.filter(t => t.type === 'disbursement' || t.type === 'withdrawal');
     const adjustments = bankTxns.filter(t => t.type === 'adjustments' || t.type === 'adjustment_in' || t.type === 'adjustment_out');
     const bankCharges = bankTxns.filter(t => t.type === 'bank_charges');
     
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
    
    const doc = new jsPDF(); let y = 20; const marginL = 20; const marginRightL = 190;
    
    // Header - match Analysis PDF style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA DAILY REPORT", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 12;
    
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
    
    // Header - match Analysis PDF style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA MONTHLY REPORT", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 12;
    
    // COLLECTION Section - match Analysis style
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COLLECTION", marginL, y);
    doc.text(`Total: ${formatCurrency(totalCollection)}`, marginRightL, y, { align: "right" });
    y += 8;
    
    // Use individual_collections (ALL collections: deposited + undeposited)
    const collectionTxns = (allCollections || []).map(c => ({
      date: c.date || dateStr,
      bank_name: c.bank_account_name || "-",
      description: c.description || "-",
      status: c.status || "unknown",
      amount: c.amount
    }));
    
    if (collectionTxns.length > 0) {
      const tableData = collectionTxns.map(t => [
        t.date ? formatDate(t.date) : "-",
        t.bank_name,
        t.description,
        t.status === 'UNDEPOSITED' ? "Undeposited" : "Deposited",
        formatCurrency(t.amount)
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Status", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 22, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "left" }, 
          2: { cellWidth: 45, hAlign: "left" }, 
          3: { cellWidth: 25, hAlign: "center" },
          4: { cellWidth: 32, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("(No collection)", marginL, y);
      y += 6;
    }
    
    // DISBURSEMENT Section - match Analysis style
    y += 4;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DISBURSEMENT", marginL, y);
    doc.text(`Total: ${formatCurrency(totalDisbursement)}`, marginRightL, y, { align: "right" });
    y += 8;
    
    if (disbursements.length > 0) {
      const tableData = disbursements.map(t => [t.date ? formatDate(t.date) : "-", t.bank_account?.name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "left" }, 
          2: { cellWidth: 65, hAlign: "left" }, 
          3: { cellWidth: 32, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("(No disbursement)", marginL, y);
      y += 6;
    }
    
    // PCF TRANSACTIONS Section - match Analysis style
    y += 4;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PCF TRANSACTIONS", marginL, y);
    doc.text(`Disb: ${formatCurrency(pcfTotalDisb)} | Rep: ${formatCurrency(pcfTotalRep)}`, marginRightL, y, { align: "right" });
    y += 8;
    if (pcfTxns.length > 0) {
      const tableData = pcfTxns.map(t => [t.date ? formatDate(t.date) : "-", t.pcf_name || t.pcf?.name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "PCF Name", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "left" }, 
          2: { cellWidth: 25, hAlign: "center" }, 
          3: { cellWidth: 55, hAlign: "left" }, 
          4: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("(No PCF transactions)", marginL, y);
      y += 6;
    }
    
    // ADJUSTMENTS Section - match Analysis style
    y += 4;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ADJUSTMENTS", marginL, y);
    doc.text(`Total: ${formatCurrency(totalAdjustments)}`, marginRightL, y, { align: "right" });
    y += 8;
    
    if (adjustments.length > 0) {
      const tableData = adjustments.map(t => [t.date ? formatDate(t.date) : "-", t.bank_account?.name || "-", t.type?.replace("_", " ") || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 25, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "left" }, 
          2: { cellWidth: 25, hAlign: "center" }, 
          3: { cellWidth: 45, hAlign: "left" }, 
          4: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("(No adjustments)", marginL, y);
      y += 6;
    }
    
    // BANK CHARGES Section - match Analysis style
    y += 4;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BANK CHARGES", marginL, y);
    doc.text(`Total: ${formatCurrency(totalBankCharges)}`, marginRightL, y, { align: "right" });
    y += 8;
    if (bankCharges.length > 0) {
      const tableData = bankCharges.map(t => [t.date ? formatDate(t.date) : "-", t.bank_account?.name || "-", t.description || "-", formatCurrency(t.amount)]);
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 28, hAlign: "center" }, 
          1: { cellWidth: 28, hAlign: "left" }, 
          2: { cellWidth: 65, hAlign: "left" }, 
          3: { cellWidth: 28, hAlign: "right" } 
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "normal");
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
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA PCF", CENTER_X, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 8;
    doc.line(marginL, y, marginRightL, y);
    y += 8;
    
     const pcfs = dailyData?.cash_on_hand || [];
     if (pcfs.length > 0) {
       let pcfTotal = 0;
       const pcfTable = pcfs.map(p => {
         const endBal = Number(p.ending || 0);
         pcfTotal += endBal;
         return [p.name || "-", p.location || "-", formatCurrency(p.beginning || 0), formatCurrency(p.disbursements || 0), formatCurrency(p.replenishments || 0), formatCurrency(endBal)];
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
     const pageWidth = doc.internal.pageSize.getWidth();    let pageHeight = doc.internal.pageSize.getHeight();    const marginLP4 = 15;    const tableWidthL = pageWidth - marginLP4 * 2;    y = 18;
     const tableWidth = tableWidthL;

    // Header - centered properly
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA CORPORATION", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("CASH POSITION SUMMARY", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`As of: ${formattedDate}`, pageWidth / 2, y, { align: "center" });
    y += 8;
    
    // Section header - AREA table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
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
       for (const [, areaDataObj] of Object.entries(cashSummary.areas)) {
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
    doc.setFont("helvetica", "bold");
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
    doc.setFont("helvetica", "bold");
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
    
     // =============================================
     // PAGE 5: JOPCA ANALYSIS (BANK RECONCILIATION)
     // =============================================
     doc.addPage();
     y = 20;
     
     // Header matching Analysis PDF style
     doc.setFontSize(18);
     doc.setFont("helvetica", "bold");
     doc.text("JOPCA CORPORATION", CENTER_X, y, { align: "center" });
     y += 6;
     doc.setFontSize(14);
     doc.setFont("helvetica", "bold");
     doc.text("BANK RECONCILIATION ANALYSIS", CENTER_X, y, { align: "center" });
     y += 7;
     doc.setFontSize(11);
     doc.setFont("helvetica", "normal");
     doc.text("Daily bank reconciliation statement", CENTER_X, y, { align: "center" });
     y += 8;
     doc.setFontSize(10);
     doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
     y += 12;
     
     // Get banks data from analysisData (already fetched from /summary/bank-analysis/)
     const analysisBanks = analysisData?.banks || [];
     // Update pageHeight for portrait mode (Page 5 is portrait)
     pageHeight = doc.internal.pageSize.getHeight();
     
     // Calculate grand totals
     let totalPerDcpr = 0;
     let totalPerBank = 0;
     let totalReconciled = 0;
     
     analysisBanks.forEach(bank => {
       // Check if we need a new page
       if (y > pageHeight - 80) {
         doc.addPage();
         y = 20;
       }
       
       const isChecking = bank.account_number?.toLowerCase().includes('ca');
       const accountType = isChecking ? 'Checking Account' : 'Savings Account';
       
       // Bank header
       doc.setFontSize(12);
       doc.setFont("helvetica", "bold");
       doc.text(`${bank.name || "Unknown"} - ${accountType} (${bank.account_number || ""})`, marginL, y);
       y += 8;
       
       const auto = bank.auto_computed || {};
       const rec = bank.reconciliation || {};
       const perDcpr = parseFloat(bank.per_dcpr || 0);
       const perBank = parseFloat((rec?.per_bank ?? bank.per_dcpr) || 0);
       
       totalPerDcpr += perDcpr;
       totalPerBank += perBank;
       
       // Build table data
       const tableData = [];
       
       // Ending Balance (Per DCPR)
       tableData.push(['Ending Balance', formatCurrency(perDcpr), formatCurrency(perDcpr), 'auto-filled']);
       
       // Reconciliation items
       if (isChecking) {
         const outstandingChecks = parseFloat(auto.outstanding_checks || 0);
         const unbookedTransfers = parseFloat(auto.unbooked_transfers || 0);
         const bankCharges = parseFloat(rec.bank_charges ?? auto.bank_charges ?? 0);
         
         tableData.push(['a. Outstanding Checks', formatCurrency(outstandingChecks), '-', 'deduct to Bank']);
         tableData.push(['b. Unbooked Fund Transfers', formatCurrency(unbookedTransfers), '-', 'add to DCPR']);
         tableData.push(['c. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
         
         const reconciled = perBank + parseFloat(auto.deposit_in_transit || 0) - outstandingChecks - parseFloat(auto.returned_checks || 0) - bankCharges;
         totalReconciled += reconciled;
         tableData.push(['Reconciled Balance', formatCurrency(reconciled), formatCurrency(reconciled), '-']);
       } else {
         const depositInTransit = parseFloat(auto.deposit_in_transit || 0);
         const unbookedTransfers = parseFloat(auto.unbooked_transfers || 0);
         const returnedChecks = parseFloat(auto.returned_checks || 0);
         const bankCharges = parseFloat(rec.bank_charges ?? auto.bank_charges ?? 0);
         
         tableData.push(['a. Deposit in Transit', formatCurrency(depositInTransit), '-', 'add to Bank']);
         tableData.push(['b. Remittance to Checking', formatCurrency(unbookedTransfers), '-', 'deduct to DCPR']);
         tableData.push(['c. Returned Check', formatCurrency(returnedChecks), '-', '-']);
         tableData.push(['d. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
         
         const reconciled = perBank + depositInTransit - unbookedTransfers - returnedChecks - bankCharges;
         totalReconciled += reconciled;
         tableData.push(['Reconciled Balance', formatCurrency(reconciled), formatCurrency(reconciled), '-']);
       }
       
        // Render table with fixed column widths (80/35/35/20 = 170pts total)
        autoTable(doc, {
          startY: y,
          head: [['Description', 'Per DCPR', 'Per Bank', 'Remarks']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 }
          },
          margin: { left: marginL, right: marginRightL }
        });
        y = doc.lastAutoTable.finalY + 10;
      });
      
      // Grand Total Section
     if (y > pageHeight - 60) {
       doc.addPage();
       y = 20;
     }
     
     doc.setFontSize(14);
     doc.setFont("helvetica", "bold");
     doc.text("GRAND TOTAL - ALL ACCOUNTS", marginL, y);
     y += 8;
     
      const grandTable = [
        ['Total Per DCPR (Ending Balance)', formatCurrency(totalPerDcpr)],
        ['Total Per Bank (Manual Entry)', formatCurrency(totalPerBank)],
        ['Total Reconciled Balance', formatCurrency(totalReconciled)]
      ];
     
      autoTable(doc, {
        startY: y,
        body: grandTable,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 120, fontSize: 10, fontStyle: 'bold' },
          1: { cellWidth: 50, fontSize: 10, fontStyle: 'bold', hAlign: 'right' }
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 10;
     
     // Signature section with proper margins
     if (y > pageHeight - 40) {
       doc.addPage();
       y = 20;
     }
     
     doc.setFontSize(10);
     doc.setFont("helvetica", "normal");
     const userName = localStorage.getItem("userName") || "User";
     doc.text(`Prepared by: ${userName}`, marginL, y);
     doc.text("Approved by: JOHN P. CABAÑOG", marginRightL, y, { align: "right" });
     
     // Save the PDF
     const fileName = `jopca-report-${dateStr}.pdf`;
     doc.save(fileName);
     
     showToast("Report generated successfully!", "success");
     return true;
    } catch (error) {
       console.error("Error generating PDF report:", {
         message: error.message,
         response: error.response?.data,
         status: error.response?.status,
         url: error.config?.url
       });
       const errorMsg = error.response?.data?.detail || error.message || "Unknown error";
       showToast(`Error: ${errorMsg}`, "error");
       return false;
     }
  };

export const generateMonthlyPdfReport = async (data, selectedMonth, showToast) => {
  try {
    showToast("Generating monthly PDF report...", "info");

    const doc = new jsPDF();
    let y = 20;
    const marginL = 20;
    const marginRightL = 190;
    const CENTER_X = 105;

    const formattedMonth = new Date(selectedMonth + "-01").toLocaleDateString("en-PH", {
      month: "long",
      year: "numeric"
    });

    // =============================================
    // PAGE 1: MONTHLY REPORT - HEADER + SUMMARY
    // =============================================
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA MONTHLY REPORT", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 12;

    // Summary KPIs
    const summary = data.summary || {};
    const kpis = [
      ["Collections", summary.monthly_collections || 0, [22, 101, 52]],
      ["Undeposited Cash", summary.undeposited_total || 0, [180, 83, 9]],
      ["Bank Inflows", summary.bank_inflows || 0, [22, 101, 52]],
      ["Bank Outflows", summary.bank_outflows || 0, [153, 27, 27]],
      ["Bank Net", summary.bank_net || 0, [30, 41, 59]],
      ["PCF Disbursements", summary.pcf_total_disbursements || 0, [124, 58, 237]],
      ["PCF Replenishments", summary.pcf_total_replenishments || 0, [124, 58, 237]],
    ];

    // Draw KPI cards
    kpis.forEach(([label, value, color]) => {
      doc.setFillColor(...color);
      doc.rect(marginL, y, 170, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(label, marginL + 3, y + 4);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(value), marginRightL, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 14;
    });

    doc.setTextColor(0, 0, 0);

    // =============================================
    // PAGE 5: JOPCA ANALYSIS
    // =============================================
    doc.addPage();
    y = 20;

    // Header - match Analysis page exactly
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("JOPCA CORPORATION", CENTER_X, y, { align: "center" });
    y += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BANK RECONCILIATION ANALYSIS", CENTER_X, y, { align: "center" });
    y += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Daily bank reconciliation statement", CENTER_X, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.text(`As of: ${formattedDate}`, CENTER_X, y, { align: "center" });
    y += 12;

    // Get banks data from analysisData (contains auto_computed + reconciliation)
    const analysisBanks = analysisData?.banks || [];

    // Calculate grand totals
    let totalPerDcpr = 0;
    let totalPerBank = 0;
    let totalReconciled = 0;

    analysisBanks.forEach(bank => {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      const isChecking = bank.account_number?.toLowerCase().includes('ca');
      const accountType = isChecking ? 'Checking Account' : 'Savings Account';

      // Bank header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${bank.name || "Unknown"} - ${accountType} (${bank.account_number || ""})`, marginL, y);
      y += 8;

      const auto = bank.auto_computed || {};
      const rec = bank.reconciliation || {};
      const perDcpr = parseFloat(bank.per_dcpr || 0);
       const perBank = parseFloat((rec?.per_bank ?? bank.per_dcpr) || 0);

      totalPerDcpr += perDcpr;
      totalPerBank += perBank;

      // Build table data
      const tableData = [];

      // Ending Balance (Per DCPR)
      tableData.push(['Ending Balance', formatCurrency(perDcpr), formatCurrency(perDcpr), 'auto-filled']);

      // Reconciliation items
      if (isChecking) {
        // Checking account
        const outstandingChecks = parseFloat(auto.outstanding_checks || 0);
        const unbookedTransfers = parseFloat(auto.unbooked_transfers || 0);
        const bankCharges = parseFloat(rec.bank_charges ?? auto.bank_charges ?? 0);

        tableData.push(['a. Outstanding Checks', formatCurrency(outstandingChecks), '-', 'deduct to Bank']);
        tableData.push(['b. Unbooked Fund Transfers', formatCurrency(unbookedTransfers), '-', 'add to DCPR']);
        tableData.push(['c. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);

        const reconciled = perBank + parseFloat(auto.deposit_in_transit || 0) - outstandingChecks - parseFloat(auto.returned_checks || 0) - bankCharges;
        totalReconciled += reconciled;
        tableData.push(['Reconciled Balance', formatCurrency(reconciled), formatCurrency(reconciled), '-']);
      } else {
        // Savings account
        const depositInTransit = parseFloat(auto.deposit_in_transit || 0);
        const unbookedTransfers = parseFloat(auto.unbooked_transfers || 0);
        const returnedChecks = parseFloat(auto.returned_checks || 0);
        const bankCharges = parseFloat(rec.bank_charges ?? auto.bank_charges ?? 0);

        tableData.push(['a. Deposit in Transit', formatCurrency(depositInTransit), '-', 'add to Bank']);
        tableData.push(['b. Remittance to Checking', formatCurrency(unbookedTransfers), '-', 'deduct to DCPR']);
        tableData.push(['c. Returned Check', formatCurrency(returnedChecks), '-', '-']);
        tableData.push(['d. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);

        const reconciled = perBank + depositInTransit - unbookedTransfers - returnedChecks - bankCharges;
        totalReconciled += reconciled;
        tableData.push(['Reconciled Balance', formatCurrency(reconciled), formatCurrency(reconciled), '-']);
      }

      // Render table
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Per DCPR', 'Per Bank', 'Remarks']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: marginL, right: marginRightL },
        tableWidth,
      });
      y = doc.lastAutoTable.finalY + 10;
    });

    // Grand Total Section
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    // Signature section
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Prepared by
    doc.setFont("helvetica", "bold");
    doc.text("Prepared by:", marginL, y);
    doc.setFont("helvetica", "normal");
    const preparedByUser = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`.toUpperCase()
      : (user?.username || "User").toUpperCase();
    doc.text(preparedByUser, marginL + 30, y);

    // Approved by
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", marginL + 120, y);
    doc.setFont("helvetica", "normal");
    doc.text("JOHN P. CABANOG", marginL + 150, y);

    // =============================================
    // PAGE 6: BANK BALANCE SUMMARY
    // =============================================
    doc.addPage();
    y = 20;

    // Header - match Analysis style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BANK BALANCE SUMMARY", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 12;

     // Get banks data from the already-fetched dailyData
     const monthlyAnalysisBanks = dailyData?.accounts || [];
     
     // Calculate grand totals
     let monthlyTotalPerDcpr = 0;
     let monthlyTotalPerBank = 0;
     let monthlyTotalReconciled = 0;
     
     monthlyAnalysisBanks.forEach(bank => {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      const isChecking = bank.account_number?.toLowerCase().includes('ca');
      const accountType = isChecking ? 'Checking Account' : 'Savings Account';

      // Bank header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${bank.name || "Unknown"} - ${accountType} (${bank.account_number || ""})`, marginL, y);
      y += 8;

       const perDcpr = parseFloat(bank.balance || 0);
       monthlyTotalPerDcpr += perDcpr;

      // Build table data
      const tableData = [];

      // Ending Balance (Per DCPR)
      tableData.push(['Ending Balance', formatCurrency(perDcpr), formatCurrency(perDcpr), 'auto-filled']);

      // For now, use placeholder data for reconciliation items
      // In a real implementation, you'd fetch from /summary/bank-analysis/ endpoint
      const depositInTransit = 0; // Placeholder
      const unbookedTransfers = 0; // Placeholder
      const returnedChecks = 0; // Placeholder
      const bankCharges = 0; // Placeholder

      if (isChecking) {
        tableData.push(['a. Outstanding Checks', formatCurrency(0), '-', 'deduct to Bank']);
        tableData.push(['b. Unbooked Fund Transfers', formatCurrency(unbookedTransfers), '-', 'add to DCPR']);
        tableData.push(['c. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
      } else {
        tableData.push(['a. Deposit in Transit', formatCurrency(depositInTransit), '-', 'add to Bank']);
        tableData.push(['b. Remittance to Checking', formatCurrency(unbookedTransfers), '-', 'deduct to DCPR']);
        tableData.push(['c. Returned Check', formatCurrency(returnedChecks), '-', '-']);
        tableData.push(['d. Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
      }

       // Reconciled Balance (placeholder)
       const reconciled = perDcpr; // Simplified - should be calculated properly
       monthlyTotalReconciled += reconciled;
      tableData.push(['Reconciled Balance', formatCurrency(reconciled), formatCurrency(reconciled), '-']);
      
       // Render table with fixed column widths (80/35/35/20 = 170pts total)
       autoTable(doc, {
         startY: y,
         head: [['Description', 'Per DCPR', 'Per Bank', 'Remarks']],
         body: tableData,
         theme: 'striped',
         headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
         bodyStyles: { fontSize: 8 },
         columnStyles: {
           0: { cellWidth: 80 },
           1: { cellWidth: 35 },
           2: { cellWidth: 35 },
           3: { cellWidth: 20 }
         },
         margin: { left: marginL, right: marginRightL }
       });
      y = doc.lastAutoTable.finalY + 10;
    });
    
    // Grand Total Section
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL - ALL ACCOUNTS", marginL, y);
    y += 8;

     const monthlyGrandTable = [
       ['Total Per DCPR (Ending Balance)', formatCurrency(monthlyTotalPerDcpr)],
       ['Total Per Bank (Manual Entry)', formatCurrency(monthlyTotalPerDcpr)],
       ['Total Reconciled Balance', formatCurrency(monthlyTotalReconciled)]
     ];

    autoTable(doc, {
      startY: y,
      body: monthlyGrandTable,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 120, fontSize: 10, fontStyle: 'bold' },
        1: { cellWidth: 50, fontSize: 10, fontStyle: 'bold', hAlign: 'right' }
      },
      margin: { left: marginL, right: marginRightL }
    });
    y = doc.lastAutoTable.finalY + 10;

     // Signature section
     if (y > pageHeight - 40) {
       doc.addPage();
       y = 20;
     }
     
     doc.setFontSize(10);
     doc.setFont("helvetica", "normal");
     
     // Prepared by
     doc.setFont("helvetica", "bold");
     doc.text("Prepared by:", marginL, y);
     doc.setFont("helvetica", "normal");
     doc.text(preparedByUser, marginL + 30, y);
     
     // Approved by
     doc.setFont("helvetica", "bold");
     doc.text("Approved by:", marginL + 120, y);
     doc.setFont("helvetica", "normal");
     doc.text("JOHN P. CABAÑOG", marginL + 150, y);

    // =============================================
    // PAGE 6: BANK BALANCE SUMMARY
    // =============================================
    doc.addPage();
    y = 20;

    // Header - match Analysis style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BANK BALANCE SUMMARY", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 12;
    
    // Header - match Analysis style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BANK BALANCE SUMMARY", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 12;
    
    const balanceSummary = data.bank_balance_summary || [];
    if (balanceSummary.length > 0) {
      const tableData = balanceSummary.map(b => [
        b.bank_name || "-",
        b.account_number || "-",
        b.location || "-",
        formatCurrency(b.beginning_balance || 0),
        formatCurrency(b.collections || 0),
        formatCurrency(b.local_deposits || 0),
        formatCurrency(b.inflows || 0),
        formatCurrency(b.outflows || 0),
        formatCurrency(b.net_change || 0),
        formatCurrency(b.ending_balance || 0),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Bank", "Account #", "Location", "Beginning", "Collections", "Deposits", "Inflows", "Outflows", "Net Change", "Ending"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: marginL, right: marginRightL }
      });
    }

    // =============================================
    // PAGE 4: BANK TRANSACTIONS
    // =============================================
    doc.addPage();
    y = 20;
    
    // Header - match Analysis style
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BANK TRANSACTIONS", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 12;
    
    const bankTxns = data.bank_transactions || [];
    if (bankTxns.length > 0) {
      const tableData = bankTxns.map(t => [
        formatDate(t.date),
        t.bank_name || "-",
        t.account_number || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [["Date", "Bank", "Account #", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: marginL, right: marginRightL }
      });
    }

    // =============================================
    // PAGE 4: PCF TRANSACTIONS
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PCF TRANSACTIONS", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 10;

    const pcfTxns = data.pcf_transactions || [];
    if (pcfTxns.length > 0) {
      const tableData = pcfTxns.map(t => [
        formatDate(t.date),
        t.pcf_name || "-",
        t.location || "-",
        t.type?.replace("_", " ") || "-",
        t.description || "-",
        formatCurrency(t.amount),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Date", "PCF Name", "Location", "Type", "Description", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [124, 58, 237], hAlign: "center", fontSize: 9 },
        bodyStyles: { fontSize: 8, hAlign: "center" },
        columnStyles: {
          0: { cellWidth: 22, hAlign: "center" },
          1: { cellWidth: 28, hAlign: "left" },
          2: { cellWidth: 25, hAlign: "center" },
          3: { cellWidth: 25, hAlign: "center" },
          4: { cellWidth: 55, hAlign: "left" },
          5: { cellWidth: 25, hAlign: "right" },
        },
        margin: { left: marginL, right: marginRightL }
      });
    }

    // =============================================
    // PAGE 5: PDCs THIS MONTH
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PDCs MATURING THIS MONTH", CENTER_X, y, { align: "center" });
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`For: ${formattedMonth}`, CENTER_X, y, { align: "center" });
    y += 10;

    const pdcs = data.pdc_this_month || [];
    if (pdcs.length > 0) {
      const tableData = pdcs.map(p => [
        p.check_no || "-",
        p.bank_name || "-",
        formatCurrency(p.amount),
        p.status || "-",
        formatDate(p.maturity_date),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Check #", "Bank", "Amount", "Status", "Maturity Date"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9], hAlign: "center", fontSize: 9 },
        bodyStyles: { fontSize: 8, hAlign: "center" },
        columnStyles: {
          0: { cellWidth: 25, hAlign: "center" },
          1: { cellWidth: 35, hAlign: "left" },
          2: { cellWidth: 30, hAlign: "right" },
          3: { cellWidth: 30, hAlign: "center" },
          4: { cellWidth: 30, hAlign: "center" },
        },
        margin: { left: marginL, right: marginRightL }
      });
    }

    // =============================================
    // PAGE 6: GROUPED SUMMARIES
    // =============================================
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GROUPED SUMMARIES", CENTER_X, y, { align: "center" });
    y += 10;

    // By Account
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("By Account", marginL, y);
    y += 6;

    const byAccount = data.grouped_by_account || [];
    if (byAccount.length > 0) {
      const tableData = byAccount.map(a => [
        a.bank_account__name || "-",
        a.bank_account__account_number || "-",
        a.count || 0,
        formatCurrency(a.total),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Account", "Account #", "Count", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center", fontSize: 9 },
        bodyStyles: { fontSize: 8, hAlign: "center" },
        columnStyles: {
          0: { cellWidth: 40, hAlign: "left" },
          1: { cellWidth: 35, hAlign: "center" },
          2: { cellWidth: 25, hAlign: "right" },
          3: { cellWidth: 30, hAlign: "right" },
        },
        margin: { left: marginL, right: marginRightL }
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // By Type
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("By Type", marginL, y);
    y += 6;

    const byType = data.grouped_by_type || [];
    if (byType.length > 0) {
      const tableData = byType.map(t => {
        const isNeg = (t.total || 0) < 0;
        return [
          t.type?.replace("_", " ") || "-",
          t.count || 0,
          (isNeg ? "-" : "") + formatCurrency(Math.abs(t.total || 0)),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Type", "Count", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], hAlign: "center", fontSize: 9 },
        bodyStyles: { fontSize: 8, hAlign: "center" },
        columnStyles: {
          0: { cellWidth: 40, hAlign: "center" },
          1: { cellWidth: 25, hAlign: "right" },
          2: { cellWidth: 30, hAlign: "right" },
        },
        margin: { left: marginL, right: marginRightL }
      });
    }

    // Signature section - match Analysis page style
    if (y > pageHeight - 40) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Prepared by
    doc.setFont("helvetica", "bold");
    doc.text("Prepared by:", marginL, y);
    doc.setFont("helvetica", "normal");
    // preparedByUser is already declared at line 840
    doc.text(preparedByUser, marginL + 30, y);

    // Approved by
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", marginL + 120, y);
    doc.setFont("helvetica", "normal");
    doc.text("JOHN P. CABAÑOG", marginL + 150, y);

    // Save PDF
    const fileName = `jopca-monthly-${selectedMonth}.pdf`;
    doc.save(fileName);
    
    showToast("Monthly report generated successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error generating monthly PDF report:", error);
    showToast("Failed to generate monthly report.", "error");
    return false;
  }
};



