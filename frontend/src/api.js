import axios from 'axios';

const api = axios.create({
  // Use VITE_API_URL from environment or fallback to localhost during local dev
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5005/api', 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
