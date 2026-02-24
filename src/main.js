import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

axios.interceptors.request.use(
  (config) => {
    const rol = sessionStorage.getItem('rolUsuario');
    const usuario = sessionStorage.getItem('nombreUsuario') || sessionStorage.getItem('usuario') || 'Admin';
    
    if (rol) {
      config.headers['x-user-role'] = rol; // 🛡️ CORREGIDO (Seguridad)
    }
    // 🛡️ Agregado para el sistema de Auditoría
    config.headers['x-usuario'] = usuario;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const app = createApp(App)

app.use(router)
app.mount('#app')