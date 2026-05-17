import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartsec_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('smartsec_token');
      localStorage.removeItem('smartsec_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
