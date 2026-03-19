import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('tf_auth');
  if (auth) {
    try {
      const { token } = JSON.parse(auth);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* ignore */ }
  }
  const session = localStorage.getItem('tf_session');
  if (session) {
    try {
      const { sessionToken } = JSON.parse(session);
      if (sessionToken) config.headers['x-session-token'] = sessionToken;
    } catch { /* ignore */ }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isCustomer = localStorage.getItem('tf_session');
      if (!isCustomer) {
        localStorage.removeItem('tf_auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
