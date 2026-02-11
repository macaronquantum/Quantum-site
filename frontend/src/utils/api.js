import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export const getConfig = () => api.get('/api/config');
export const getPresaleProgress = () => api.get('/api/presale/progress');
export const createPresalePurchase = (data) => api.post('/api/presale/purchase', data);
export const getPresaleStatus = (id) => api.get(`/api/presale/status/${id}`);

export const getAffiliateStats = (wallet) => api.get(`/api/affiliate/${wallet}/stats`);
export const getAffiliateConfig = () => api.get('/api/affiliate/config');
export const getAffiliateTree = (wallet) => api.get(`/api/affiliate/${wallet}/tree`);
export const getLevelTransactions = (wallet, level) => api.get(`/api/affiliate/${wallet}/level/${level}/transactions`);
export const registerAffiliate = (data) => api.post('/api/affiliate/register', data);

export const getSolanaBalance = (wallet) => api.get(`/api/solana/balance/${wallet}`);

export const getNotifications = (wallet, limit = 20) => api.get(`/api/notifications/${wallet}?limit=${limit}`);
export const markNotificationsRead = (wallet) => api.post(`/api/notifications/${wallet}/mark-read`);
export const clearNotifications = (wallet) => api.delete(`/api/notifications/${wallet}/clear`);

export const getReferralData = (wallet) => api.get(`/api/referral/${wallet}`);

export default api;
