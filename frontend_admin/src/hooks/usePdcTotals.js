// src/hooks/usePdcTotals.js
import { useCallback, useEffect, useState } from "react";
import pdcService from "../services/pdcService";
import { partitionPdcList, pdcTotalsFromPartition } from "../utils/pdcUtils";

/**
 * usePdcTotals(reportMonth)
 * - Fetches /pdc/ list and computes partitioned totals.
 * - Handles paginated responses (res.data.results) and plain arrays.
 */
export default function usePdcTotals(reportMonth = null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partition, setPartition] = useState({
    matured: [],
    this_month: [],
    next_month: [],
    two_months: [],
    over_two_months: [],
    total: 0,
  });
  const [totals, setTotals] = useState({
    matured: 0,
    this_month: 0,
    next_month: 0,
    two_months: 0,
    over_two_months: 0,
    total: 0,
  });

  const fetchPdc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pdcService.listPdcs({});
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.results)
        ? res.data.results
        : res?.data ?? [];

      const part = partitionPdcList(list, reportMonth);
      const t = pdcTotalsFromPartition(part);

      setPartition(part);
      setTotals(t);
    } catch (err) {
      console.error("usePdcTotals fetch error", err);
      setError(err);
      setPartition({
        matured: [],
        this_month: [],
        next_month: [],
        two_months: [],
        over_two_months: [],
        total: 0,
      });
      setTotals({
        matured: 0,
        this_month: 0,
        next_month: 0,
        two_months: 0,
        over_two_months: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [reportMonth]);

  useEffect(() => {
    fetchPdc();
  }, [fetchPdc]);

  return {
    totals,
    partition,
    loading,
    error,
    refresh: fetchPdc,
  };
}