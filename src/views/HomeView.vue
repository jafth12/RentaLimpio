<template>
  <MainLayout>
    <div class="home-container">
      <div class="welcome-card fade-in">
        <div class="icon-pulse">🚀</div>
        <h1 class="title">¡Bienvenido a RentaLimpio!</h1>
        <p class="subtitle">
          Sistema Central de Declaraciones y Auditoría DTE.
        </p>
        <div class="instructions">
          <p>Selecciona una opción del <strong>menú superior</strong> para comenzar a trabajar.</p>
          <ul class="features-list">
            <li>🛒 Gestión de Compras y Proveedores</li>
            <li>💰 Emisión de DTE (Consumidor y CCF)</li>
            <li>🔄 Importación de Respaldo JSON y Hacienda</li>
            <li v-if="esAdmin">📜 Historial de Auditoría Activo</li>
          </ul>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import MainLayout from '../layouts/MainLayout.vue';

const esAdmin = ref(false);

onMounted(() => {
  const rol = sessionStorage.getItem('rolUsuario');
  esAdmin.value = rol === 'admin';
});
</script>

<style scoped>
.home-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);
  padding: 20px;
}

.welcome-card {
  background: white;
  padding: 50px 40px;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
  max-width: 600px;
  width: 100%;
  border-top: 4px solid #0d9488;
}

.icon-pulse {
  font-size: 5rem;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
  display: inline-block;
}

.title {
  font-size: 2rem;
  color: #0f172a;
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 1.1rem;
  color: #64748b;
  margin-bottom: 30px;
}

.instructions {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  text-align: left;
}

.instructions p {
  color: #334155;
  margin-bottom: 15px;
  text-align: center;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.features-list li {
  color: #475569;
  font-weight: 500;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #55C2B7;
  font-size: 0.95rem;
}

.fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}
</style>