import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getValidAccessToken } from './authApi'; // Tu función actual

const api = axios.create({
  baseURL: 'https://tu-api.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR DE PETICIÓN (Request)
// Se ejecuta antes de que la petición salga hacia el servidor
api.interceptors.request.use(
  async (config) => {
    const token = await getValidAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;