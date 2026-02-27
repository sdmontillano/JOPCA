import api from './api';

export const getBanks = () => api.get('/banks/');
export const getTransactions = () => api.get('/transactions/');