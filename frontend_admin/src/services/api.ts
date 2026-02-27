import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});

export const getDailySummary = (date?: string) =>
  api.get("/summary/daily/", { params: { date } });

export const getMonthlySummary = (month: string) =>
  api.get("/summary/monthly/", { params: { month } });

export const getCashPositionSummary = (date?: string) =>
  api.get("/summary/cashposition/", { params: { date } });

export const getTransactions = (params?: any) =>
  api.get("/transactions/", { params });

// ✅ Default export
export default api;