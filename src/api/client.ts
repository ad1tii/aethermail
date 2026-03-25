import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const mailCsrf = localStorage.getItem('mailCsrf');
    if (mailCsrf) {
      config.headers['x-csrf-token'] = mailCsrf;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const devBypassEnabled =
        import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
      const devBypassActive = localStorage.getItem('devAuthBypass') === 'true';
      if (devBypassEnabled && devBypassActive) {
        return Promise.reject(error);
      }

      // Clear storage and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('devAuthBypass');
      
      // Only redirect if not already on a login page
      if (!window.location.pathname.includes('login')) {
        const path = window.location.pathname || '';
        const target = path.startsWith('/mail') ? '/mail/login' : '/admin/login';
        window.location.href = target;
      }
    }
    return Promise.reject(error);
  }
);
