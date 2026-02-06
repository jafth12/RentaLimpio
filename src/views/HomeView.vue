<template>
  <div class="dashboard-container">
    
    <header class="dashboard-header">
      <div class="header-content">
        <div class="titulos">
          <h1>Control de Registro Fiscal</h1>
          <p>Bienvenido al sistema. Seleccione una opción:</p>
        </div>
        
        <button @click="cerrarSesion" class="btn-logout">
          🚪 Cerrar Sesión
        </button>
      </div>
    </header>

    <div class="grid-menu">
      
      <div class="card">
        <h3>🛍️ Compras y Proveedores</h3>
        <div class="botones-grid">
          <router-link to="/compras" class="btn-menu">🛒 Compras</router-link>
          <router-link to="/proveedores" class="btn-menu">🚚 Proveedores</router-link>
          <router-link to="/sujetos-excluidos" class="btn-menu">🚫 Compras Suj. Excluidos</router-link>
        </div>
      </div>

      <div class="card">
        <h3>💰 Ventas y Clientes</h3>
        <div class="botones-grid">
          <router-link to="/venta-consumidor" class="btn-menu">🧾 Consumidor Final</router-link>
          <router-link to="/venta-credito" class="btn-menu">💳 Cred. Fiscal</router-link>
          <router-link to="/venta-terceros" class="btn-menu">🤝 Ventas x Terceros</router-link>
          <router-link to="/clientes-menu" class="btn-menu">👥 Clientes</router-link>
        </div>
      </div>

      <div class="card">
        <h3>📉 Retenciones IVA</h3>
        <div class="botones-grid">
          <router-link to="/retencion-1-declarante" class="btn-menu">🔻 Ret. 1% (al Declarante)</router-link>
          <router-link to="/retencion-13-terceros" class="btn-menu">🔺 Ret. 13% (a Terceros)</router-link>
          <router-link to="/retencion-1-terceros" class="btn-menu">🔸 Ret. 1% (a Terceros)</router-link>
        </div>
      </div>

      <div class="card">
        <h3>📊 Anticipos y Percepción</h3>
        <div class="botones-grid">
          <router-link to="/anticipo-2-declarante" class="btn-menu">⬇️ Ant. 2% (al Declarante)</router-link>
          <router-link to="/anticipo-2-por-declarante" class="btn-menu">⬆️ Ant. 2% (por Declarante)</router-link>
          <router-link to="/percepcion-1-por-declarante" class="btn-menu">🔵 Perc. 1% (por Declarante)</router-link>
          <router-link to="/percepcion-1-al-declarante" class="btn-menu">🟢 Perc. 1% (al Declarante)</router-link>
        </div>
      </div>

    </div>

    <div class="footer-action">
      <router-link to="/documentos-anulados" class="btn-anular">
        🚫 Documentos Anulados
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { usuarioAutenticado } from '../auth.js';

const router = useRouter();

const cerrarSesion = () => {
  usuarioAutenticado.value = false;
  localStorage.removeItem('sesionActiva');
  router.push('/login');
};
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  background-color: #f9f9f9;
  min-height: 100vh;
}

/* HEADER MEJORADO */
.dashboard-header {
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}

.header-content {
  display: flex;
  justify-content: space-between; /* Texto a la izquierda, botón a la derecha */
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #55C2B7;
  font-size: 1.8rem;
  margin: 0;
}

p {
  color: #666;
  margin: 5px 0 0 0;
}

/* ESTILO DEL BOTÓN CERRAR SESIÓN */
.btn-logout {
  background-color: #ff6b6b; /* Rojo suave */
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-logout:hover {
  background-color: #e55a5a; /* Rojo más oscuro al pasar mouse */
}

/* GRID LAYOUT (Igual que antes) */
.grid-menu {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(85, 194, 183, 0.15);
  transition: transform 0.2s;
  border-top: 5px solid #55C2B7;
}

.card:hover {
  transform: translateY(-5px);
}

h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.botones-grid {
  display: grid;
  gap: 10px;
}

.btn-menu {
  display: flex;
  align-items: center;
  background-color: #f0fdfc;
  color: #555;
  text-decoration: none;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
  font-weight: 500;
}

.btn-menu:hover {
  background-color: #55C2B7;
  color: white;
  border-color: #55C2B7;
}

.footer-action {
  text-align: center;
  margin-top: 3rem;
}

.btn-anular {
  background-color: #999; 
  color: white;
  padding: 15px 30px;
  border-radius: 30px;
  text-decoration: none;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  transition: background 0.3s;
}

.btn-anular:hover {
  background-color: #777;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
}
</style>