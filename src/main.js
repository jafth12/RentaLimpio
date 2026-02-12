import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

axios.interceptors.request.use(
  (config) => {
    const rol = sessionStorage.getItem('rolUsuario');
    if (rol) {
      config.headers['User-Role'] = rol;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const app = createApp(App)

app.use(router)
app.mount('#app')