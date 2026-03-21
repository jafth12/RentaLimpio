import './assets/forms.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { usuarioAutenticado } from './auth.js'

// ── Interceptor de REQUEST ───────────────────────────────────────────────────
// Inyecta token de sesión, rol y usuario en cada petición
axios.interceptors.request.use(
  (config) => {
    const sesionActiva = sessionStorage.getItem('sesionActiva') === 'true';

    // Si no hay sesión activa y la petición no es al login, cancelarla
    if (!sesionActiva && !config.url?.includes('/api/login')) {
      usuarioAutenticado.value = false;
      router.replace('/login');
      return Promise.reject(new Error('Sesión no activa'));
    }

    const token   = sessionStorage.getItem('sessionToken');
    const rol     = sessionStorage.getItem('rolUsuario');
    const usuario = sessionStorage.getItem('usuario') || 'Usuario Desconocido';

    // Token firmado para validación en el backend
    if (token) {
      config.headers['x-session-token'] = token;
    }

    // Headers de compatibilidad (roleAuth middleware los sigue usando)
    if (rol) {
      config.headers['x-user-role'] = rol.toLowerCase();
    }
    config.headers['x-usuario'] = usuario;

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de RESPONSE ──────────────────────────────────────────────────
// Detecta errores 401/403 y sesión perdida, redirige al login automáticamente
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 = no autenticado, 403 = sin permisos (puede indicar sesión expirada)
    if (status === 401 || status === 403) {
      sessionStorage.clear();
      usuarioAutenticado.value = false;
      router.replace('/login');
      return Promise.reject(error);
    }

    // Detectar si el sessionStorage fue borrado manualmente mientras navegaba
    const sesionActiva = sessionStorage.getItem('sesionActiva') === 'true';
    if (!sesionActiva && error.config && !error.config.url?.includes('/api/login')) {
      usuarioAutenticado.value = false;
      router.replace('/login');
    }

    return Promise.reject(error);
  }
);

const app = createApp(App)

app.use(router)
app.mount('#app')
