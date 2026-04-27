import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPeso(value) {
  return `₱${formatCurrency(value)}`;
}

export function exportDashboardPDF(data, date, office) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JOPCA CORPORATION', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Daily Cash Position Report', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`${office || 'CAGAYAN DE ORO MAIN OFFICE'} — ${date}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });

  const kpiY = 42;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KPI SUMMARY', 14, kpiY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const kpiData = [
    ['Collections', 'Undeposited Cash', 'Cash in Bank', 'PCF Balance', 'PDC This Month', 'PDC Total'],
    [
      formatPeso(data.totalCollections || 0),
      formatPeso(data.undepositedCash || 0),
      formatPeso(data.cashInBank || 0),
      formatPeso(data.pcfBalance || 0),
      formatPeso(data.pdcThisMonth || 0),
      formatPeso(data.pdcTotal || 0),
    ],
  ];
  autoTable(doc, {
    startY: kpiY + 2,
    head: kpiData.slice(0, 1),
    body: kpiData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const pcfY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PCF CASH ON HAND', 14, pcfY);

  const pcfHeaders = [['Name', 'Location', 'Beginning', 'Disbursements', 'Replenishments', 'Ending', 'Unreplenished', 'Current Balance']];
  const pcfBody = (data.pcfData || []).map(pcf => [
    pcf.name || 'Unknown',
    pcf.location || pcf.location_display || '',
    formatPeso(pcf.beginning || 0),
    formatPeso(pcf.disbursements || 0),
    formatPeso(pcf.replenishments || 0),
    formatPeso(pcf.ending || 0),
    formatPeso(pcf.unreplenished || 0),
    formatPeso(pcf.current_balance || 0),
  ]);
  if (pcfBody.length === 0) {
    pcfBody.push(['', '', '', '', '', '', '', '']);
  }
  autoTable(doc, {
    startY: pcfY + 2,
    head: pcfHeaders,
    body: pcfBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
    },
  });

  const collY = doc.lastAutoTable.finalY + 10;
  if (collY < pageHeight - 60) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK COLLECTIONS', 14, collY);

    const collHeaders = [['Bank', 'Beginning', 'Collections', 'Local Deposits', 'Ending']];
    const collBody = (data.collectionsData || []).map(c => [
      c.name || 'Unknown',
      formatPeso(c.beginning || 0),
      formatPeso(c.collections || 0),
      formatPeso(c.local_deposits || 0),
      formatPeso(c.ending || 0),
    ]);
    if (collBody.length === 0) {
      collBody.push(['', '', '', '', '']);
    }
    autoTable(doc, {
      startY: collY + 2,
      head: collHeaders,
      body: collBody,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      margin: { left: 14, right: 14 },
      tableWidth: pageWidth - 28,
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  if (doc.lastAutoTable.finalY < pageHeight - 40) {
    doc.addPage();
  }
  const bankY = 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH IN BANK', 14, bankY);

  const bankHeaders = [['Bank', 'Acct No.', 'Beginning', 'Collections', 'Local Deposits', 'Disbursements', 'Fund Transfer', 'Adjustments', 'Ending']];
  const bankBody = (data.cashInBankData || []).map(b => [
    b.particulars || b.name || 'Unknown',
    b.account_number || '-',
    formatPeso(b.beginning || 0),
    formatPeso(b.collections || 0),
    formatPeso(b.local_deposits || 0),
    formatPeso(b.disbursements || 0),
    formatPeso((b.fund_transfers_in || 0) - (b.fund_transfers_out || 0)),
    formatPeso(b.adjustments || 0),
    formatPeso(b.ending || 0),
  ]);
  if (bankBody.length === 0) {
    bankBody.push(['', '', '', '', '', '', '', '', '', '']);
  }
  autoTable(doc, {
    startY: bankY + 2,
    head: bankHeaders,
    body: bankBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25 },
    },
  });

  doc.save(`JOPCA-Dashboard-${date}.pdf`);
}

export function exportDashboardExcel(data, date, office) {
  const wb = XLSX.utils.book_new();

  const kpiWsData = [
    ['JOPCA CORPORATION - Daily Cash Position Report'],
    [`Date: ${date}`],
    [`Office: ${office || 'CAGAYAN DE ORO MAIN OFFICE'}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['KPI SUMMARY'],
    ['Metric', 'Amount'],
    ['Collections', data.totalCollections || 0],
    ['Undeposited Cash', data.undepositedCash || 0],
    ['Cash in Bank', data.cashInBank || 0],
    ['PCF Balance', data.pcfBalance || 0],
    ['PDC This Month', data.pdcThisMonth || 0],
    ['PDC Total', data.pdcTotal || 0],
  ];
  const kpiWs = XLSX.utils.aoa_to_sheet(kpiWsData);
  kpiWs['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, kpiWs, 'KPI');

  const pcfWsData = [
    ['PCF CASH ON HAND'],
    ['Name', 'Location', 'Beginning', 'Disbursements', 'Replenishments', 'Ending', 'Unreplenished', 'Current Balance'],
  ];
  (data.pcfData || []).forEach(pcf => {
    pcfWsData.push([
      pcf.name || 'Unknown',
      pcf.location || pcf.location_display || '',
      pcf.beginning || 0,
      pcf.disbursements || 0,
      pcf.replenishments || 0,
      pcf.ending || 0,
      pcf.unreplenished || 0,
      pcf.current_balance || 0,
    ]);
  });
  if (pcfWsData.length === 2) {
    pcfWsData.push(['', '', 0, 0, 0, 0, 0, 0]);
  }
  const pcfWs = XLSX.utils.aoa_to_sheet(pcfWsData);
  pcfWs['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, pcfWs, 'PCF');

  const collWsData = [
    ['BANK COLLECTIONS'],
    ['Bank', 'Beginning', 'Collections', 'Local Deposits', 'Ending'],
  ];
  (data.collectionsData || []).forEach(c => {
    collWsData.push([
      c.name || 'Unknown',
      c.beginning || 0,
      c.collections || 0,
      c.local_deposits || 0,
      c.ending || 0,
    ]);
  });
  if (collWsData.length === 2) {
    collWsData.push(['', 0, 0, 0, 0]);
  }
  const collWs = XLSX.utils.aoa_to_sheet(collWsData);
  collWs['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, collWs, 'Collections');

  const bankWsData = [
    ['CASH IN BANK'],
    ['Bank', 'Account No.', 'Beginning', 'Collections', 'Local Deposits', 'Disbursements', 'Fund Transfer', 'Adjustments', 'Ending'],
  ];
  (data.cashInBankData || []).forEach(b => {
    bankWsData.push([
      b.particulars || b.name || 'Unknown',
      b.account_number || '-',
      b.beginning || 0,
      b.collections || 0,
      b.local_deposits || 0,
      b.disbursements || 0,
      (b.fund_transfers_in || 0) - (b.fund_transfers_out || 0),
      b.adjustments || 0,
      b.ending || 0,
    ]);
  });
  if (bankWsData.length === 2) {
    bankWsData.push(['', '', 0, 0, 0, 0, 0, 0, 0]);
  }
  const bankWs = XLSX.utils.aoa_to_sheet(bankWsData);
  bankWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, bankWs, 'CashInBank');

  XLSX.writeFile(wb, `JOPCA-Dashboard-${date}.xlsx`);
}

// ==========================================
// CASH SUMMARY EXPORT
// ==========================================

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function exportCashSummaryPDF(data, date, user) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const tableWidth = pageWidth - marginLeft - marginRight;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JOPCA CORPORATION', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH POSITION SUMMARY', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`As of: ${formatDate(date)}`, pageWidth / 2, 28, { align: 'center' });

  let y = 36;

  // === AREAS TABLE ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('AREA', marginLeft, y);
  doc.text('MAIN OFFICE', marginLeft + 70, y);
  doc.text('PARTS', marginLeft + 130, y);
  doc.text('TOTAL', marginLeft + 180, y);

  y += 4;
  const areasData = [];

  // Main Office
  const mainBanks = data?.areas?.main_office?.banks || [];
  mainBanks.forEach((bank, idx) => {
    areasData.push([
      bank.account_number || '',
      formatCurrency(bank.balance),
      '-',
      formatCurrency(bank.balance),
    ]);
  });

  // Parts areas
  const partsAreas = ['tagoloan_parts', 'midsayap_parts', 'valencia_parts'];
  const partsAreaNames = { tagoloan_parts: 'TAGOLOAN PARTS', midsayap_parts: 'MIDSAYAP PARTS', valencia_parts: 'VALENCIA PARTS' };

  partsAreas.forEach(areaCode => {
    const areaData = data?.areas?.[areaCode];
    if (areaData?.banks?.length > 0) {
      areasData.push([partsAreaNames[areaCode], '-', '-', '-']);
      areaData.banks.forEach(bank => {
        areasData.push([
          `  ${bank.account_number || ''}`,
          '-',
          formatCurrency(bank.balance),
          formatCurrency(bank.balance),
        ]);
      });
    }
  });

  // Grand Total
  areasData.push([
    'GRAND TOTAL',
    formatCurrency(data?.main_office_total || 0),
    formatCurrency(data?.parts_total || 0),
    formatCurrency(data?.grand_total || 0),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['AREA', 'MAIN OFFICE', 'PARTS', 'TOTAL']],
    body: areasData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: marginLeft, right: marginRight },
    tableWidth,
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // === PAYABLES SECTION ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYABLES:', marginLeft, y);

  y += 4;
  const mainOfficeDisb = (data?.payables?.main_office?.disbursements_today || 0);
  const mainOfficeChecks = (data?.payables?.main_office?.outstanding_checks || 0);
  const partsDisb = (data?.payables?.parts?.disbursements_today || 0);
  const partsChecks = (data?.payables?.parts?.outstanding_checks || 0);

  const payablesData = [
    [
      'Total Disb. for Today',
      formatCurrency(mainOfficeDisb),
      formatCurrency(partsDisb),
      formatCurrency(mainOfficeDisb + partsDisb),
    ],
    [
      'Outstanding Checks Due',
      mainOfficeChecks > 0 ? formatCurrency(mainOfficeChecks) : '-',
      partsChecks > 0 ? formatCurrency(partsChecks) : '-',
      (mainOfficeChecks + partsChecks) > 0 ? formatCurrency(mainOfficeChecks + partsChecks) : '-',
    ],
    [
      'GRAND TOTAL',
      formatCurrency(mainOfficeDisb + mainOfficeChecks),
      formatCurrency(partsDisb + partsChecks),
      formatCurrency(mainOfficeDisb + mainOfficeChecks + partsDisb + partsChecks),
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['DESCRIPTION', 'MAIN OFFICE', 'PARTS', 'TOTAL']],
    body: payablesData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: marginLeft, right: marginRight },
    tableWidth,
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // === NET BALANCE ===
  const netMainOffice = data?.net_balance?.main_office || 0;
  const netParts = data?.net_balance?.parts || 0;
  const netTotal = data?.net_balance?.total || 0;

  autoTable(doc, {
    startY: y,
    head: [['NET BALANCE', '', '', '']],
    body: [[
      '',
      formatCurrency(netMainOffice),
      formatCurrency(netParts),
      formatCurrency(netTotal),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10, halign: 'left' },
    bodyStyles: { fontSize: 10, fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginRight },
    tableWidth,
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
    },
  });

  // === SIGNATURES ===
  const preparedBy = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'User';

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared by: ${preparedBy}`, marginLeft, y + 15);
  doc.text('Approved by: JOHN P. CABAÑOG', marginLeft + 80, y + 15);

  doc.save(`JOPCA-CashSummary-${date}.pdf`);
}

export function exportCashSummaryExcel(data, date, user) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Cash Position Summary
  const summaryData = [
    ['JOPCA CORPORATION'],
    ['CASH POSITION SUMMARY'],
    [`As of: ${formatDate(date)}`],
    [],
    ['AREA', 'MAIN OFFICE', 'PARTS', 'TOTAL'],
  ];

  const mainBanks = data?.areas?.main_office?.banks || [];
  mainBanks.forEach(bank => {
    summaryData.push([
      bank.account_number || '',
      bank.balance || 0,
      '-',
      bank.balance || 0,
    ]);
  });

  const partsAreas = ['tagoloan_parts', 'midsayap_parts', 'valencia_parts'];
  const partsAreaNames = { tagoloan_parts: 'TAGOLOAN PARTS', midsayap_parts: 'MIDSAYAP PARTS', valencia_parts: 'VALENCIA PARTS' };

  partsAreas.forEach(areaCode => {
    const areaData = data?.areas?.[areaCode];
    if (areaData?.banks?.length > 0) {
      summaryData.push([partsAreaNames[areaCode], '-', '-', '-']);
      areaData.banks.forEach(bank => {
        summaryData.push([
          bank.account_number || '',
          '-',
          bank.balance || 0,
          bank.balance || 0,
        ]);
      });
    }
  });

  summaryData.push(['GRAND TOTAL', data?.main_office_total || 0, data?.parts_total || 0, data?.grand_total || 0]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'CashSummary');

  // Sheet 2: Payables
  const mainOfficeDisb = data?.payables?.main_office?.disbursements_today || 0;
  const mainOfficeChecks = data?.payables?.main_office?.outstanding_checks || 0;
  const partsDisb = data?.payables?.parts?.disbursements_today || 0;
  const partsChecks = data?.payables?.parts?.outstanding_checks || 0;

  const payablesData = [
    ['PAYABLES'],
    ['DESCRIPTION', 'MAIN OFFICE', 'PARTS', 'TOTAL'],
    ['Total Disb. for Today', mainOfficeDisb, partsDisb, mainOfficeDisb + partsDisb],
    ['Outstanding Checks Due', mainOfficeChecks, partsChecks, mainOfficeChecks + partsChecks],
    ['GRAND TOTAL', mainOfficeDisb + mainOfficeChecks, partsDisb + partsChecks, mainOfficeDisb + mainOfficeChecks + partsDisb + partsChecks],
  ];

  const payablesWs = XLSX.utils.aoa_to_sheet(payablesData);
  payablesWs['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, payablesWs, 'Payables');

  // Sheet 3: Net Balance
  const netData = [
    ['NET BALANCE'],
    ['DESCRIPTION', 'MAIN OFFICE', 'PARTS', 'TOTAL'],
    ['', data?.net_balance?.main_office || 0, data?.net_balance?.parts || 0, data?.net_balance?.total || 0],
  ];

  const netWs = XLSX.utils.aoa_to_sheet(netData);
  netWs['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, netWs, 'NetBalance');

  XLSX.writeFile(wb, `JOPCA-CashSummary-${date}.xlsx`);
}

// ==========================================
// ANALYSIS EXPORT
// ==========================================

export function exportAnalysisPDF(data, date, user) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const tableWidth = pageWidth - marginLeft - marginRight;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JOPCA CORPORATION', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK RECONCILIATION ANALYSIS', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`As of: ${formatDate(date)}`, pageWidth / 2, 28, { align: 'center' });

  let y = 36;

  const areaLabels = {
    main_office: 'Main Office',
    tagoloan_parts: 'Tagoloan Parts',
    midsayap_parts: 'Midsayap Parts',
    valencia_parts: 'Valencia Parts',
  };

  const banks = data?.banks || [];
  
  banks.forEach((bank) => {
    if (y > pageWidth - 80) {
      doc.addPage();
      y = 15;
    }

    const areaLabel = areaLabels[bank.area] || bank.area || '';
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${areaLabel} - ${bank.name} (${bank.account_number})`, marginLeft, y);
    y += 4;

    const auto = bank.auto_computed || {};
    const rec = bank.reconciliation || {};
    const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
    const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
    const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
    const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
    const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
    const perBank = rec.per_bank ?? bank.per_dcpr ?? 0;

    const isChecking = bank.account_number?.toLowerCase().includes('ca');
    let bankReconciled = 0;

    if (isChecking) {
      bankReconciled = parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(outstandingChecks) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    } else {
      bankReconciled = parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(unbookedTransfers) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    }

    const bankData = [
      ['Ending Balance', formatCurrency(bank.per_dcpr || 0), formatCurrency(perBank), ''],
    ];

    if (isChecking) {
      bankData.push(['Outstanding Checks (deduct)', formatCurrency(outstandingChecks), '-', 'deduct to Bank']);
      bankData.push(['Unbooked Fund Transfers (add)', formatCurrency(unbookedTransfers), '-', 'add to DCPR']);
      bankData.push(['Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
    } else {
      bankData.push(['Deposit in Transit (add)', formatCurrency(depositInTransit), '-', 'add to Bank']);
      bankData.push(['Remittance to Checking (deduct)', formatCurrency(unbookedTransfers), '-', 'deduct to DCPR']);
      bankData.push(['Returned Check', formatCurrency(returnedChecks), '-', '-']);
      bankData.push(['Bank Charges', formatCurrency(bankCharges), '-', 'add/deduct to DCPR']);
    }

    bankData.push(['Reconciled Balance', formatCurrency(bankReconciled), formatCurrency(bankReconciled), '']);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Per DCPR', 'Per Bank', 'Remarks']],
      body: bankData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: marginLeft, right: marginRight },
      tableWidth,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  // Grand Totals
  let totalPerDcpr = 0;
  let totalPerBank = 0;
  let totalReconciled = 0;

  banks.forEach(bank => {
    const auto = bank.auto_computed || {};
    const rec = bank.reconciliation || {};
    const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
    const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
    const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
    const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
    const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
    const perBank = rec.per_bank ?? bank.per_dcpr ?? 0;

    totalPerDcpr += parseFloat(bank.per_dcpr) || 0;
    totalPerBank += parseFloat(perBank) || 0;

    const isChecking = bank.account_number?.toLowerCase().includes('ca');
    if (isChecking) {
      totalReconciled += parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(outstandingChecks) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    } else {
      totalReconciled += parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(unbookedTransfers) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    }
  });

  if (y > pageWidth - 50) {
    doc.addPage();
    y = 15;
  }

  const totalsData = [
    ['Total Per DCPR (Ending Balance)', formatCurrency(totalPerDcpr)],
    ['Total Per Bank (Manual Entry)', formatCurrency(totalPerBank)],
    ['Total Reconciled Balance', formatCurrency(totalReconciled)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['GRAND TOTAL - ALL ACCOUNTS', '']],
    body: totalsData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 10, halign: 'left' },
    bodyStyles: { fontSize: 10, fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginRight },
    tableWidth,
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  const preparedBy = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'User';

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared by: ${preparedBy}`, marginLeft, y);
  doc.text('Approved by: JOHN P. CABAÑOG', marginLeft + 80, y);

  doc.save(`JOPCA-Analysis-${date}.pdf`);
}

export function exportAnalysisExcel(data, date, user) {
  const wb = XLSX.utils.book_new();

  const areaLabels = {
    main_office: 'Main Office',
    tagoloan_parts: 'Tagoloan Parts',
    midsayap_parts: 'Midsayap Parts',
    valencia_parts: 'Valencia Parts',
  };

  const summaryData = [
    ['JOPCA CORPORATION'],
    ['BANK RECONCILIATION ANALYSIS'],
    [`As of: ${formatDate(date)}`],
    [],
    ['Grand Totals'],
    ['Description', 'Amount'],
  ];

  let totalPerDcpr = 0;
  let totalPerBank = 0;
  let totalReconciled = 0;

  const banks = data?.banks || [];
  banks.forEach(bank => {
    const auto = bank.auto_computed || {};
    const rec = bank.reconciliation || {};
    const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
    const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
    const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
    const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
    const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
    const perBank = rec.per_bank ?? bank.per_dcpr ?? 0;

    totalPerDcpr += parseFloat(bank.per_dcpr) || 0;
    totalPerBank += parseFloat(perBank) || 0;

    const isChecking = bank.account_number?.toLowerCase().includes('ca');
    if (isChecking) {
      totalReconciled += parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(outstandingChecks) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    } else {
      totalReconciled += parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(unbookedTransfers) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    }
  });

  summaryData.push(['Total Per DCPR (Ending Balance)', totalPerDcpr]);
  summaryData.push(['Total Per Bank (Manual Entry)', totalPerBank]);
  summaryData.push(['Total Reconciled Balance', totalReconciled]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const detailData = [
    ['Bank Reconciliation Detail'],
    ['Area', 'Bank', 'Account #', 'Per DCPR', 'Per Bank', 'Reconciled Balance'],
  ];

  banks.forEach(bank => {
    const auto = bank.auto_computed || {};
    const rec = bank.reconciliation || {};
    const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
    const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
    const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
    const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
    const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
    const perBank = rec.per_bank ?? bank.per_dcpr ?? 0;

    const isChecking = bank.account_number?.toLowerCase().includes('ca');
    let bankReconciled = 0;

    if (isChecking) {
      bankReconciled = parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(outstandingChecks) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    } else {
      bankReconciled = parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(unbookedTransfers) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    }

    detailData.push([
      areaLabels[bank.area] || bank.area || '',
      bank.name || '',
      bank.account_number || '',
      bank.per_dcpr || 0,
      perBank,
      bankReconciled,
    ]);
  });

  const detailWs = XLSX.utils.aoa_to_sheet(detailData);
  detailWs['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, detailWs, 'Detail');

  XLSX.writeFile(wb, `JOPCA-Analysis-${date}.xlsx`);
}