<template>
  <div class="app-viewport">
    
    <header class="top-bar">
      
      <div class="brand-box">
        <div class="logo-icon">🚀</div>
        <h1 class="brand-text">RentaLimpio</h1>
      </div>

      <nav class="main-nav">
        
        <div v-if="esAdmin" class="nav-group dropdown">
          <button class="nav-btn admin-style">
            🛡️ Admin <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <router-link to="/admin-usuarios" class="menu-item">👨‍💻 Gestión de Usuarios</router-link>
            <div class="divider"></div>
            <router-link to="/documentos-anulados" class="menu-item">🚫 Documentos Anulados</router-link>
          </div>
        </div>

        <div class="nav-group dropdown">
          <button class="nav-btn">
            🛍️ Compras <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <router-link to="/compras" class="menu-item">🛒 Registrar Compra</router-link>
            <router-link to="/proveedores" class="menu-item">🚚 Proveedores</router-link>
            <router-link to="/sujetos-excluidos" class="menu-item">🚫 Sujetos Excluidos</router-link>
          </div>
        </div>

        <div class="nav-group dropdown">
          <button class="nav-btn">
            💰 Ventas <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <router-link to="/venta-consumidor" class="menu-item">🧾 Consumidor Final</router-link>
            <router-link to="/venta-credito" class="menu-item">🏢 Crédito Fiscal</router-link>
            <router-link to="/venta-terceros" class="menu-item">🤝 Venta por Terceros</router-link>
            <div class="divider"></div>
            <router-link to="/clientes-menu" class="menu-item">👥 Gestión de Clientes</router-link>
          </div>
        </div>

        <div class="nav-group dropdown">
          <button class="nav-btn">
            📉 Retenciones <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <router-link to="/retencion-1-declarante" class="menu-item">🔻 1% al Declarante</router-link>
            <router-link to="/retencion-13-terceros" class="menu-item">🔺 13% a Terceros</router-link>
            <router-link to="/retencion-1-terceros" class="menu-item">🔸 1% a Terceros</router-link>
          </div>
        </div>

        <div class="nav-group dropdown">
          <button class="nav-btn">
            📊 Anticipos <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <router-link to="/anticipo-2-declarante" class="menu-item">⬇️ Ant. 2% al Declarante</router-link>
            <router-link to="/anticipo-2-por-declarante" class="menu-item">⬆️ Ant. 2% por Declarante</router-link>
            <div class="divider"></div>
            <router-link to="/percepcion-1-por-declarante" class="menu-item">🔵 Perc. 1% por Declarante</router-link>
            <router-link to="/percepcion-1-al-declarante" class="menu-item">🟢 Perc. 1% al Declarante</router-link>
          </div>
        </div>

      </nav>

      <div class="user-box">
        <span class="user-badge">{{ esAdmin ? 'Administrador' : 'Operador' }}</span>
        <button @click="cerrarSesion" class="logout-icon-btn" title="Cerrar Sesión">
          ⏻
        </button>
      </div>

    </header>

    <main class="content-canvas">
      <div class="work-area-placeholder">
        <div class="welcome-message">
          <div class="big-icon">🚀</div>
          <h2>Sistema Listo</h2>
          <p>Selecciona una opción del menú superior.</p>
        </div>
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usuarioAutenticado } from '../auth.js';

const router = useRouter();
const esAdmin = ref(false);

onMounted(() => {
  const rol = sessionStorage.getItem('rolUsuario');
  esAdmin.value = rol === 'admin';
});

const cerrarSesion = () => {
  if(confirm('¿Cerrar sesión del sistema?')) {
    usuarioAutenticado.value = false;
    sessionStorage.removeItem('sesionActiva');
    sessionStorage.removeItem('rolUsuario'); 
    router.push('/login');
  }
};
</script>

<style scoped>
/* --- ESTRUCTURA PRINCIPAL BLINDADA --- */
.app-viewport {
  position: fixed; /* Se pega a la ventana del navegador */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: #f3f4f6;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prohíbe el scroll en la ventana principal */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  z-index: 9999; /* Asegura estar encima de todo */
}

/* --- HEADER SUPERIOR --- */
.top-bar {
  height: 60px; /* Altura fija estricta */
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  flex-shrink: 0; /* No permite que se aplaste */
  z-index: 100;
}

/* MARCA */
.brand-box {
  display: flex; align-items: center; gap: 10px; min-width: 180px;
}
.logo-icon { font-size: 1.5rem; }
.brand-text { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }

/* NAVEGACIÓN */
.main-nav {
  display: flex;
  height: 100%;
  gap: 5px;
  align-items: center;
}

.nav-group {
  position: relative;
  height: 100%;
  display: flex; align-items: center;
}

.nav-btn {
  background: transparent;
  border: none;
  height: 100%;
  padding: 0 15px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  display: flex; align-items: center; gap: 5px;
  border-bottom: 3px solid transparent;
}

.nav-btn .arrow { font-size: 0.7rem; opacity: 0.5; }

/* Hover efectos */
.nav-group:hover .nav-btn {
  background-color: #f0fdfa;
  color: #0d9488;
  border-bottom-color: #0d9488;
}

.admin-style { color: #d97706; }
.nav-group:hover .admin-style { background-color: #fffbeb; color: #b45309; border-bottom-color: #d97706; }

/* MENÚ DESPLEGABLE */
.dropdown-menu {
  display: none;
  position: absolute;
  top: 60px; /* Justo debajo del header */
  left: 0;
  background: white;
  min-width: 220px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  border-radius: 0 0 8px 8px;
  padding: 8px 0;
  border-top: 2px solid #0d9488;
  flex-direction: column;
}

.nav-group:hover .dropdown-menu { display: flex; }

.menu-item {
  text-decoration: none;
  color: #334155;
  padding: 10px 20px;
  font-size: 0.85rem;
  transition: background 0.2s;
  display: block;
}

.menu-item:hover {
  background-color: #f1f5f9;
  color: #0d9488;
  padding-left: 24px;
}

.divider { height: 1px; background: #e2e8f0; margin: 5px 0; }

/* USUARIO */
.user-box {
  display: flex; align-items: center; gap: 15px; min-width: 150px; justify-content: flex-end;
}
.user-badge {
  background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;
}
.logout-icon-btn {
  background: #fee2e2; border: none; width: 32px; height: 32px; border-radius: 50%;
  color: #ef4444; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
}
.logout-icon-btn:hover { background: #fecaca; transform: scale(1.1); }

/* --- LIENZO CENTRAL --- */
.content-canvas {
  flex: 1; /* Ocupa TODO el espacio restante verticalmente */
  padding: 20px;
  display: flex;
  overflow: hidden; /* Sin scroll interno por ahora */
}

.work-area-placeholder {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.welcome-message { text-align: center; }
.big-icon { font-size: 4rem; margin-bottom: 10px; opacity: 0.5; filter: grayscale(100%); }
.welcome-message h2 { margin: 0; color: #475569; }

/* RESPONSIVE: SI LA PANTALLA ES MUY ANGOSTA, AJUSTAMOS EL MENU */
@media (max-width: 900px) {
  .nav-btn span.arrow { display: none; }
  .nav-btn { font-size: 0.8rem; padding: 0 10px; }
  .brand-text { display: none; } /* Ocultamos nombre en pantallas chicas para dar espacio */
}
</style>