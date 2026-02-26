import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

axios.interceptors.request.use(
  (config) => {
    // Extraemos las variables de sesión tal como las guardamos en LoginView
    const rol = sessionStorage.getItem('rolUsuario');
    const usuario = sessionStorage.getItem('usuario') || 'Usuario Desconocido';
    
    // Inyectamos las cabeceras para que el Backend sepa quién está haciendo la petición
    if (rol) {
      config.headers['x-user-role'] = rol.toLowerCase(); // Forzamos minúscula para evitar errores
    }
    
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