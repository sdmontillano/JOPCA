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
    const bankName = li.bank_account__name || li.bank_account_name || li.bank || li.particulars || "Unknown Bank";
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

    const t = (li.type || li.txn_type || "").toString().toLowerCase();
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
  const officeRows = unreplenished.filter((r) =>
    ((r.location || r.particulars || "") + "").toString().toLowerCase().includes("office")
  );
  const quarryRows = unreplenished.filter((r) =>
    ((r.location || r.particulars || "") + "").toString().toLowerCase().includes("quarry")
  );

  const computePcf = (rows, label) => {
    const beginning =
      toNumber(rows.reduce((s, r) => s + (toNumber(r.beginning) || 0), 0)) ||
      toNumber(rows.find((r) => r.note === "Beg. Balance" || (r.particulars || "").toLowerCase().includes("beg"))?.amount) ||
      0;

    const disbursements = toNumber(
      rows.reduce((s, r) => {
        const t = (r.type || r.txn_type || "") + "";
        if (t.toLowerCase().includes("disburse") || (r.category || "").toString().toLowerCase().includes("disburse")) {
          return s + toNumber(r.total ?? r.amount ?? r.disbursement ?? 0);
        }
        if (r.disbursements) return s + toNumber(r.disbursements);
        return s;
      }, 0)
    );

    const replenishments = toNumber(
      rows.reduce((s, r) => {
        const t = (r.type || r.txn_type || "") + "";
        if (t.toLowerCase().includes("replenish") || (r.category || "").toString().toLowerCase().includes("replenish")) {
          return s + toNumber(r.total ?? r.amount ?? r.replenishment ?? 0);
        }
        if (r.replenishments) return s + toNumber(r.replenishments);
        return s;
      }, 0)
    );

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

  if (!officeRows.length && !quarryRows.length && Array.isArray(unreplenished) && unreplenished.length) {
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

/* ---------------------------
   Robust PDC type matcher
   - accepts many common variants
   --------------------------- */
function isPdcType(typeStr = "") {
  const t = (typeStr || "").toString().toLowerCase();
  if (!t) return false;
  const variants = ["post_dated_check", "post-dated-check", "post dated check", "postdatedcheck", "pdc", "postdated", "post_dated"];
  return variants.some((v) => t.includes(v));
}

export function mapDailyResponse(raw = {}) {
  const data = unwrap(raw);
  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];

  // transactions = non-PDC line_items
  const transactions = lineItems
    .filter((li) => !isPdcType(li.type || li.txn_type || li.particulars))
    .map((li) => ({
      particulars: li.bank_account__name || li.particulars || li.type,
      account_number: li.bank_account__account_number || li.bank_account_number || null,
      type: li.type,
      total: toNumber(li.total ?? li.amount ?? 0),
      raw: li,
    }));

  // PDC items (tolerant matching)
  const pdcItems = lineItems.filter((li) => isPdcType(li.type || li.txn_type || li.particulars));
  const pdcTotalFromLineItems = sum(pdcItems);

  // Prefer backend-provided pdc_summary if present, but normalize fields
  let pdcSummary = { matured: 0, this_month: pdcTotalFromLineItems, next_month: 0, total: pdcTotalFromLineItems };
  if (data.pdc_summary) {
    // If backend returns different keys, try to map common ones
    const s = data.pdc_summary;
    pdcSummary = {
      matured: toNumber(s.matured ?? s.mature ?? s.matured_amount ?? 0),
      this_month: toNumber(s.this_month ?? s.thisMonth ?? s.current_month ?? s.this_month_amount ?? pdcTotalFromLineItems),
      next_month: toNumber(s.next_month ?? s.nextMonth ?? s.upcoming_month ?? 0),
      total: toNumber(s.total ?? s.total_amount ?? s.sum ?? pdcTotalFromLineItems),
    };
    // console.debug("raw pdc_summary from API:", data.pdc_summary);
  } else if (data._raw && data._raw.pdc_summary) {
    // fallback if nested under _raw
    const s = data._raw.pdc_summary;
    pdcSummary = {
      matured: toNumber(s.matured ?? 0),
      this_month: toNumber(s.this_month ?? pdcTotalFromLineItems),
      next_month: toNumber(s.next_month ?? 0),
      total: toNumber(s.total ?? pdcTotalFromLineItems),
    };
  } else {
    // no backend summary — use computed totals
    pdcSummary = { matured: 0, this_month: pdcTotalFromLineItems, next_month: 0, total: pdcTotalFromLineItems };
  }

  // Build cash_in_bank: prefer backend-provided rows (numbers) and convert to numbers,
  // otherwise fall back to grouping line_items by bank.
  const rawCashInBank = Array.isArray(data.cash_in_bank) ? data.cash_in_bank : null;

  const cashInBank = rawCashInBank
    ? rawCashInBank.map((r) => ({
        bank_id: r.bank_id,
        particulars: r.particulars || "",
        account_number: r.account_number || null,
        beginning: toNumber(r.beginning),
        collections: toNumber(r.collections),
        local_deposits: toNumber(r.local_deposits),
        disbursements: toNumber(r.disbursements),
        fund_transfers: toNumber(r.fund_transfers),
        transfers: toNumber(r.transfers),
        returned_checks: toNumber(r.returned_checks),
        adjustments: toNumber(r.adjustments),
        pdc: toNumber(r.pdc),
        ending: toNumber(r.ending),
        raw_rows: r.raw_rows || [],
      }))
    : groupLineItemsByBank(lineItems.filter((li) => !isPdcType(li.type || li.txn_type || li.particulars)));

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
    pdc_summary: pdcSummary,
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
    .filter((li) => !isPdcType(li.type || li.txn_type || li.particulars))
    .map((li) => ({
      particulars: li.bank_account__name || li.particulars || li.type,
      account_number: li.bank_account__account_number || li.bank_account_number || null,
      type: li.type,
      total: toNumber(li.total ?? li.amount ?? 0),
      raw: li,
    }));

  const pdcItems = lineItems.filter((li) => isPdcType(li.type || li.txn_type || li.particulars));
  const pdcTotalFromLineItems = sum(pdcItems);

  let pdcSummary = { matured: 0, this_month: pdcTotalFromLineItems, next_month: 0, total: pdcTotalFromLineItems };
  if (data.pdc_summary) {
    const s = data.pdc_summary;
    pdcSummary = {
      matured: toNumber(s.matured ?? s.mature ?? 0),
      this_month: toNumber(s.this_month ?? s.thisMonth ?? s.current_month ?? pdcTotalFromLineItems),
      next_month: toNumber(s.next_month ?? s.nextMonth ?? 0),
      total: toNumber(s.total ?? s.total_amount ?? pdcTotalFromLineItems),
    };
    // console.debug("monthly raw pdc_summary:", data.pdc_summary);
  } else {
    pdcSummary = { matured: 0, this_month: pdcTotalFromLineItems, next_month: 0, total: pdcTotalFromLineItems };
  }

  return {
    month: data.month || data.period || null,
    transactions,
    pdc_summary: pdcSummary,
    accounts: data.accounts || [],
    grand_total: data.grand_total ?? data.total ?? 0,
    line_items: lineItems,
    _raw: data,
  };
}