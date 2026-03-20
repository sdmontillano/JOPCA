// src/services/pdcService.js
import api from "./tokenService";

const BASE = "/pdc/";

export const listPdcs = (params = {}) => api.get(BASE, { params });
export const getPdc = (id) => api.get(`${BASE}${id}/`);
export const createPdc = (payload) => api.post(BASE, payload);
export const updatePdc = (id, payload) => api.patch(`${BASE}${id}/`, payload);

export const markPdcMatured = (id, maturityDate = null) => {
  const body = maturityDate ? { maturity_date: maturityDate } : {};
  return api.post(`${BASE}${id}/mark_matured/`, body);
};

export const depositPdc = (id, bankAccountId, depositDate = null, reference = "") => {
  return api.post(`${BASE}${id}/deposit/`, {
    bank_account_id: bankAccountId,
    deposit_date: depositDate,
    reference,
  });
};

export const recordPdcReturned = (id, returnedDate = null, reason = "") => {
  const date = returnedDate || new Date().toISOString().slice(0, 10);
  return api.post(`${BASE}${id}/record_returned/`, {
    returned_date: date,
    returned_reason: reason || "",
  });
};

export default {
  listPdcs,
  getPdc,
  createPdc,
  updatePdc,
  markPdcMatured,
  depositPdc,
  recordPdcReturned,
};