// src/utils/pdcUtils.js
import { parseISO, differenceInCalendarMonths, startOfMonth } from "date-fns";

/**
 * Convert a value to number safely
 */
function toNumber(v) {
  return Number(v ?? 0) || 0;
}

/**
 * Normalize a PDC object to expected fields
 * Accepts variations from backend (amount/total, maturity_date/matured_at, status)
 */
export function normalizePdc(p = {}) {
  return {
    id: p.id ?? p.pk ?? null,
    customer: p.customer ?? p.client_name ?? p.company ?? p.payee ?? null,
    check_number: p.check_number ?? p.check_no ?? p.check ?? null,
    maturity_date: p.maturity_date ?? p.matured_at ?? p.mat_date ?? p.maturity ?? null,
    amount: toNumber(p.amount ?? p.total ?? p.value ?? 0),
    status: (p.status ?? "").toString().toLowerCase(),
    deposit_bank_id: p.deposit_bank_id ?? p.bank_account_id ?? p.deposit_account_id ?? null,
    date_deposited: p.date_deposited ?? p.deposited_at ?? null,
    returned_date: p.returned_date ?? p.returned_at ?? null,
    returned_reason: p.returned_reason ?? p.returned_note ?? null,
    raw: p,
  };
}

/**
 * Bucket PDCs by maturity relative to reportMonth (YYYY-MM).
 * Returns { matured, this_month, next_month, two_months, over_two_months, total }
 *
 * - If a PDC status is matured/deposited/cleared it counts as matured.
 * - If maturity_date is missing or invalid it goes to over_two_months.
 */
export function bucketPdcList(pdcList = [], reportMonth = null) {
  const now = new Date();
  const reportStart = reportMonth
    ? startOfMonth(parseISO(`${reportMonth}-01`))
    : startOfMonth(now);

  const buckets = {
    matured: 0,
    this_month: 0,
    next_month: 0,
    two_months: 0,
    over_two_months: 0,
    total: 0,
  };

  (pdcList || []).forEach((raw) => {
    const p = normalizePdc(raw);
    const amt = p.amount;
    buckets.total += amt;

    if (["matured", "deposited", "cleared"].includes(p.status)) {
      buckets.matured += amt;
      return;
    }

    if (!p.maturity_date) {
      buckets.over_two_months += amt;
      return;
    }

    let mat;
    try {
      mat = parseISO(p.maturity_date);
      if (isNaN(mat)) throw new Error("invalid date");
    } catch {
      buckets.over_two_months += amt;
      return;
    }

    const monthsDiff = differenceInCalendarMonths(startOfMonth(mat), reportStart);

    if (monthsDiff < 0) buckets.matured += amt;
    else if (monthsDiff === 0) buckets.this_month += amt;
    else if (monthsDiff === 1) buckets.next_month += amt;
    else if (monthsDiff === 2) buckets.two_months += amt;
    else buckets.over_two_months += amt;
  });

  return buckets;
}

/**
 * Partition PDCs into lists by bucket (returns object with arrays and totals)
 * Useful for PDC management UI and dashboard detail.
 */
export function partitionPdcList(pdcList = [], reportMonth = null) {
  const now = new Date();
  const reportStart = reportMonth
    ? startOfMonth(parseISO(`${reportMonth}-01`))
    : startOfMonth(now);

  const result = {
    matured: [],
    this_month: [],
    next_month: [],
    two_months: [],
    over_two_months: [],
    total: 0,
  };

  (pdcList || []).forEach((raw) => {
    const p = normalizePdc(raw);
    result.total += p.amount;

    if (["matured", "deposited", "cleared"].includes(p.status)) {
      result.matured.push(p);
      return;
    }

    if (!p.maturity_date) {
      result.over_two_months.push(p);
      return;
    }

    let mat;
    try {
      mat = parseISO(p.maturity_date);
      if (isNaN(mat)) throw new Error("invalid date");
    } catch {
      result.over_two_months.push(p);
      return;
    }

    const monthsDiff = differenceInCalendarMonths(startOfMonth(mat), reportStart);

    if (monthsDiff < 0) result.matured.push(p);
    else if (monthsDiff === 0) result.this_month.push(p);
    else if (monthsDiff === 1) result.next_month.push(p);
    else if (monthsDiff === 2) result.two_months.push(p);
    else result.over_two_months.push(p);
  });

  return result;
}

/**
 * Helper to compute PDC totals per bucket (returns same shape as bucketPdcList)
 * Accepts either raw pdc objects or normalized ones.
 */
export function pdcTotalsFromPartition(partition) {
  const sum = (arr = []) => (arr || []).reduce((s, p) => s + toNumber(p.amount ?? p.total ?? 0), 0);
  return {
    matured: sum(partition.matured),
    this_month: sum(partition.this_month),
    next_month: sum(partition.next_month),
    two_months: sum(partition.two_months),
    over_two_months: sum(partition.over_two_months),
    total: toNumber(partition.total ?? (sum(partition.matured) + sum(partition.this_month) + sum(partition.next_month) + sum(partition.two_months) + sum(partition.over_two_months))),
  };
}