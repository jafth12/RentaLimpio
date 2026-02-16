<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo-box">
        <h2>RentaLimpio 🚀</h2>
      </div>

      <nav class="menu-nav">
        <router-link to="/inicio" class="nav-item">🏠 Inicio</router-link>

        <div class="nav-label">HACIENDA / DATA</div>
        <router-link to="/importar-exportar" class="nav-item">🔄 Centro JSON</router-link>
        
        <div class="nav-label">VENTAS</div>
        <router-link to="/venta-consumidor" class="nav-item">🧾 Consumidor Final</router-link>
        <router-link to="/ventas-terceros" class="nav-item">🤝 Ventas Terceros</router-link>
        <router-link to="/venta-credito" class="nav-item">🏢 Crédito Fiscal</router-link>
        <router-link to="/clientes-menu" class="nav-item">👥 Clientes</router-link>

        <div class="nav-label">COMPRAS</div>
        <router-link to="/compras" class="nav-item">🛒 Compras</router-link>
        <router-link to="/proveedores" class="nav-item">🚚 Proveedores</router-link>
        <router-link to="/sujetos-excluidos" class="nav-item">🚫 Sujetos Excluidos</router-link>

        <div class="nav-label">CONFIG</div>
        <router-link to="/admin-usuarios" class="nav-item">🔐 Usuarios</router-link>
      </nav>

      <div class="user-footer">
        <div class="avatar-circle">👤</div>
        <div class="user-info">
          <span>Administrador</span>
          <button @click="logout" class="btn-logout">Cerrar Sesión</button>
        </div>
      </div>
    </aside>

    <main class="content-area">
      <slot></slot>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

const logout = () => {
  if(confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('sesionActiva');
    router.push('/');
  }
};
</script>

<style scoped>
/* ESTRUCTURA GENERAL */
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: #f3f4f6; /* Fondo gris suave profesional */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* SIDEBAR ESTILO */
.sidebar {
  width: 260px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0; /* Para que no se encoja */
}

.logo-box {
  height: 70px;
  display: flex;
  align-items: center;
  padding-left: 20px;
  border-bottom: 1px solid #f3f4f6;
}
.logo-box h2 {
  color: #0d9488; /* Tu color verde azulado */
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
}

/* MENÚ DE NAVEGACIÓN */
.menu-nav {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.nav-label {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: bold;
  letter-spacing: 1px;
  margin-top: 20px;
  margin-bottom: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  color: #4b5563;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: #f0fdfa;
  color: #0d9488;
}

/* CLASE QUE VUE-ROUTER PONE AUTOMÁTICO AL ENLACE ACTIVO */
.router-link-active {
  background-color: #0d9488;
  color: white !important;
  box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);
}

/* PIE DE PÁGINA DEL USUARIO */
.user-footer {
  padding: 15px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  background-color: #ccfbf1;
  color: #0f766e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-info span {
  font-size: 0.9rem;
  font-weight: bold;
  color: #374151;
}

.btn-logout {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.btn-logout:hover { text-decoration: underline; }

/* ÁREA DE CONTENIDO */
.content-area {
  flex: 1;
  padding: 30px;
  overflow-y: auto; /* Scroll solo aquí */
}
</style>