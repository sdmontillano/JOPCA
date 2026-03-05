// src/utils/dataMappers.js
function unwrap(raw) {
    return raw && raw.data ? raw.data : raw || {};
  }
  
  function toNumber(v) {
    return Number(v ?? 0) || 0;
  }
  
  function sum(items = [], key = "total") {
    return items.reduce((s, it) => s + toNumber(it[key] ?? it.amount ?? 0), 0);
  }
  
  function groupLineItemsByBank(lineItems = []) {
    const map = {};
    lineItems.forEach((li) => {
      const bankName = li.bank_account__name || li.bank_account_name || li.bank || "Unknown Bank";
      if (!map[bankName]) {
        map[bankName] = {
          particulars: bankName,
          beginning: 0,
          collections: 0,
          local_deposits: 0,
          disbursements: 0,
          fund_transfers: 0,
          returned_checks: 0,
          bank_charges: 0,
          adjustments: 0,
          ending: 0,
          raw_rows: [],
        };
      }
      const row = map[bankName];
      const total = toNumber(li.total ?? li.amount ?? 0);
      row.raw_rows.push({ ...li, total });
  
      const t = (li.type || "").toString().toLowerCase();
      if (t.includes("deposit")) row.local_deposits += total;
      else if (t.includes("collect")) row.collections += total;
      else if (t.includes("disburse")) row.disbursements += total;
      else if (t.includes("fund")) row.fund_transfers += total;
      else if (t.includes("returned")) row.returned_checks += total;
      else if (t.includes("bank_charge") || t.includes("bank charge")) row.bank_charges += total;
      else row.collections += total; // default
  
      // recompute ending as a best-effort
      row.ending =
        (row.beginning || 0) +
        (row.collections || 0) +
        (row.local_deposits || 0) -
        (row.disbursements || 0) +
        (row.fund_transfers || 0) -
        (row.returned_checks || 0) +
        (row.adjustments || 0);
    });
  
    return Object.values(map);
  }
  
  function buildPcfRowsFromUnreplenished(unreplenished = []) {
    // Normalize entries: expect objects with fields like { location, type, beginning, disbursements, replenishments, amount, date, payee }
    const officeRows = unreplenished.filter((r) =>
      ((r.location || r.particulars || "") + "").toString().toLowerCase().includes("office")
    );
    const quarryRows = unreplenished.filter((r) =>
      ((r.location || r.particulars || "") + "").toString().toLowerCase().includes("quarry")
    );
  
    // Helper to compute totals for a set of unreplenished rows
    const computePcf = (rows, label) => {
      // Try to find explicit beginning / disbursement / replenishment fields; otherwise infer from amounts
      const beginning = toNumber(rows.reduce((s, r) => s + (toNumber(r.beginning) || 0), 0)) ||
                        toNumber(rows.find((r) => r.note === "Beg. Balance" || (r.particulars || "").toLowerCase().includes("beg"))?.amount) ||
                        0;
  
      // total disbursements: sum of rows that look like disbursements (type/disbursement flag) or explicit disbursements field
      const disbursements = toNumber(rows.reduce((s, r) => {
        const t = (r.type || r.txn_type || "") + "";
        if (t.toLowerCase().includes("disburse") || (r.category || "").toString().toLowerCase().includes("disburse")) {
          return s + toNumber(r.total ?? r.amount ?? r.disbursement ?? 0);
        }
        // fallback: if row has a 'disbursements' field
        if (r.disbursements) return s + toNumber(r.disbursements);
        return s;
      }, 0));
  
      // total replenishments: explicit replenishment fields or rows marked as replenishment
      const replenishments = toNumber(rows.reduce((s, r) => {
        const t = (r.type || r.txn_type || "") + "";
        if (t.toLowerCase().includes("replenish") || (r.category || "").toString().toLowerCase().includes("replenish")) {
          return s + toNumber(r.total ?? r.amount ?? r.replenishment ?? 0);
        }
        if (r.replenishments) return s + toNumber(r.replenishments);
        return s;
      }, 0));
  
      const ending = beginning - disbursements + replenishments;
  
      return {
        particulars: label,
        beginning,
        collections: 0,
        local_deposits: 0,
        disbursements,
        fund_transfers: 0,
        returned_checks: 0,
        bank_charges: 0,
        adjustments: 0,
        replenishments,
        ending,
        raw_rows: rows,
      };
    };
  
    const pcfOffice = computePcf(officeRows, "PCF Office");
    const pcfQuarry = computePcf(quarryRows, "PCF Quarry");
  
    // If no explicit rows found, try to infer from unreplenished array totals (some backends return a summary)
    if (!officeRows.length && !quarryRows.length && Array.isArray(unreplenished) && unreplenished.length) {
      // try to find summary keys
      const officeSummary = unreplenished.find((r) => (r.key || "").toString().toLowerCase().includes("pcf-office") || (r.particulars || "").toString().toLowerCase().includes("pcf-office"));
      const quarrySummary = unreplenished.find((r) => (r.key || "").toString().toLowerCase().includes("pcf-quarry") || (r.particulars || "").toString().toLowerCase().includes("pcf-quarry"));
  
      if (officeSummary) {
        pcfOffice.beginning = toNumber(officeSummary.beginning ?? officeSummary.amount ?? officeSummary.value ?? pcfOffice.beginning);
        pcfOffice.disbursements = toNumber(officeSummary.disbursements ?? pcfOffice.disbursements);
        pcfOffice.replenishments = toNumber(officeSummary.replenishments ?? pcfOffice.replenishments);
        pcfOffice.ending = pcfOffice.beginning - pcfOffice.disbursements + pcfOffice.replenishments;
      }
      if (quarrySummary) {
        pcfQuarry.beginning = toNumber(quarrySummary.beginning ?? quarrySummary.amount ?? quarrySummary.value ?? pcfQuarry.beginning);
        pcfQuarry.disbursements = toNumber(quarrySummary.disbursements ?? pcfQuarry.disbursements);
        pcfQuarry.replenishments = toNumber(quarrySummary.replenishments ?? pcfQuarry.replenishments);
        pcfQuarry.ending = pcfQuarry.beginning - pcfQuarry.disbursements + pcfQuarry.replenishments;
      }
    }
  
    return [pcfOffice, pcfQuarry];
  }
  
  export function mapDailyResponse(raw = {}) {
    const data = unwrap(raw);
    const lineItems = Array.isArray(data.line_items) ? data.line_items : [];
  
    // transactions = non-PDC line_items
    const transactions = lineItems
      .filter((li) => (li.type || "").toString().toLowerCase() !== "post_dated_check")
      .map((li) => ({
        particulars: li.bank_account__name || li.particulars || li.type,
        account_number: li.bank_account__account_number || li.bank_account_number || null,
        type: li.type,
        total: toNumber(li.total ?? li.amount ?? 0),
        raw: li,
      }));
  
    // PDC totals
    const pdcItems = lineItems.filter((li) => (li.type || "").toString().toLowerCase() === "post_dated_check");
    const pdcTotal = sum(pdcItems);
  
    // Build cash_in_bank from transactions grouped by bank
    const cashInBank = groupLineItemsByBank(lineItems.filter((li) => (li.type || "").toString().toLowerCase() !== "post_dated_check"));
  
    // Build cash_on_hand from unreplenished fund entries (PCF Office / PCF Quarry)
    const unreplenished = Array.isArray(data.unreplenished) ? data.unreplenished : data.unreplenished_fund || [];
    const pcfRows = buildPcfRowsFromUnreplenished(unreplenished);
  
    // If backend provided explicit cash_on_hand rows, prefer them; otherwise use PCF rows
    const cashOnHand = Array.isArray(data.cash_on_hand) && data.cash_on_hand.length > 0 ? data.cash_on_hand : pcfRows;
  
    return {
      office: data.office || data.branch || null,
      date: data.date || data.report_date || null,
      cash_on_hand: cashOnHand,
      cash_in_bank: cashInBank,
      pdc_summary: data.pdc_summary || { matured: 0, this_month: pdcTotal, next_month: 0, total: pdcTotal },
      unreplenished: unreplenished,
      returned_checks: data.returned_checks || [],
      accounts: data.accounts || [],
      total: data.grand_total ?? data.total ?? 0,
      grand_total: data.grand_total ?? data.total ?? 0,
      transactions,
      line_items: lineItems,
      _raw: data,
    };
  }
  
  export function mapMonthlyResponse(raw = {}) {
    const data = unwrap(raw);
    const lineItems = Array.isArray(data.line_items) ? data.line_items : [];
  
    const transactions = lineItems
      .filter((li) => (li.type || "").toString().toLowerCase() !== "post_dated_check")
      .map((li) => ({
        particulars: li.bank_account__name || li.particulars || li.type,
        account_number: li.bank_account__account_number || li.bank_account_number || null,
        type: li.type,
        total: toNumber(li.total ?? li.amount ?? 0),
        raw: li,
      }));
  
    const pdcItems = lineItems.filter((li) => (li.type || "").toString().toLowerCase() === "post_dated_check");
    const pdcTotal = sum(pdcItems);
  
    return {
      month: data.month || data.period || null,
      transactions,
      pdc_summary: data.pdc_summary || { matured: 0, this_month: pdcTotal, next_month: 0, total: pdcTotal },
      accounts: data.accounts || [],
      grand_total: data.grand_total ?? data.total ?? 0,
      line_items: lineItems,
      _raw: data,
    };
  }