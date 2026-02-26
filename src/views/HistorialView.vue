<template>
  <MainLayout>
    <div class="historial-container">
      <div class="header-section">
        <div class="title-box">
          <h1>📜 Historial de Auditoría</h1>
          <p class="subtitle">Monitoreo de actividad, importaciones JSON y exportaciones CSV</p>
        </div>
      </div>

      <div class="main-content card fade-in">
        <div class="card-header flex-between flex-wrap gap-3">
          <h3>Registros del Sistema</h3>
          <div class="history-filters">
            <input type="text" v-model="filtro" placeholder="🔍 Buscar por usuario, acción o módulo..." class="form-control search-list">
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Detalles del Evento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in historialFiltrado" :key="log.id_historial">
                <td class="text-sm font-monospace">{{ formatearFechaHora(log.fecha_hora) }}</td>
                <td><span class="badge-user">👤 {{ log.usuario }}</span></td>
                <td>
                   <span class="badge-accion" :class="colorAccion(log.accion)">{{ log.accion }}</span>
                </td>
                <td class="font-bold text-dark">{{ log.modulo }}</td>
                <td class="text-sm text-muted">
                    <div v-html="formatearDetalles(log.detalles)"></div>
                </td>
              </tr>
              <tr v-if="historialFiltrado.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">No hay registros de actividad.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue';

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const logs = ref([]);
const filtro = ref('');

const cargarHistorial = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/api/historial`);
        logs.value = res.data;
    } catch (error) {
        console.error("Error al cargar historial:", error);
    }
};

const historialFiltrado = computed(() => {
    if (!filtro.value) return logs.value;
    const txt = filtro.value.toLowerCase();
    return logs.value.filter(l => 
        l.usuario.toLowerCase().includes(txt) || 
        l.accion.toLowerCase().includes(txt) || 
        l.modulo.toLowerCase().includes(txt)
    );
});

const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return '---';
    const f = new Date(fechaStr);
    return f.toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'medium' });
};

const colorAccion = (accion) => {
    const acc = accion.toUpperCase();
    if (acc.includes('IMPORTACION') || acc.includes('CREACION')) return 'bg-success';
    if (acc.includes('MODIFICACION')) return 'bg-warning';
    if (acc.includes('ELIMINACION') || acc.includes('ERROR')) return 'bg-danger';
    if (acc.includes('EXPORTACION')) return 'bg-info';
    return 'bg-secondary';
};

// Formatea el JSON para que se vea bonito con viñetas de colores y maneja listas de errores
const formatearDetalles = (detalles) => {
    try {
        const obj = JSON.parse(detalles);
        let html = '<ul class="log-details-list">';
        
        for (const [key, value] of Object.entries(obj)) {
            let color = '#374151'; // default
            
            if (key === 'duplicados' && value > 0) color = '#f59e0b';
            if (key === 'exitosos' || key === 'compras' || key.includes('ventas') || key === 'sujetos') color = '#10b981';
            if (key === 'errores' && value > 0) color = '#ef4444';
            if (key === 'error') color = '#ef4444'; // Captura errores de sistema generales
            
            // 🛡️ REGLA ESPECIAL PARA MOSTRAR LOS DOCUMENTOS OMITIDOS
            if (key === 'documentos_omitidos' && Array.isArray(value) && value.length > 0) {
                html += `<li>
                            <strong style="text-transform:capitalize; color: #ef4444;">Facturas Rechazadas (Duplicadas):</strong> 
                            <div style="color:#ef4444; font-family: monospace; font-size: 0.75rem; margin-top: 5px; padding: 5px 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; max-height: 120px; overflow-y: auto;">
                                ${value.join('<br>')}
                            </div>
                         </li>`;
            } 
            // Si el valor no es un arreglo (es texto o número normal)
            else if (key !== 'documentos_omitidos') {
                html += `<li><strong style="text-transform:capitalize">${key.replace(/_/g, ' ')}:</strong> <span style="color:${color}; font-weight:bold">${value}</span></li>`;
            }
        }
        html += '</ul>';
        return html;
    } catch (e) {
        return detalles; // Si no es JSON (texto manual del módulo de compras), muestra el texto normal
    }
};

onMounted(cargarHistorial);
</script>

<style scoped>
.historial-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }
.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h3 { font-size: 1.1rem; margin: 0; font-weight: 700; }

.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; max-width: 400px; }
.search-list { background-color: #f9fafb; border: 1px solid #d1d5db; padding: 8px 12px; border-radius: 6px; width: 100%; }

.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; color: #374151; vertical-align: top; }

.badge-user { background: #f3f4f6; color: #1f2937; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1px solid #e5e7eb; }
.badge-accion { padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 0.75rem; color: white; letter-spacing: 0.05em; }

.bg-success { background-color: #10b981; }
.bg-warning { background-color: #f59e0b; }
.bg-danger { background-color: #ef4444; }
.bg-info { background-color: #0ea5e9; }
.bg-secondary { background-color: #64748b; }

.font-monospace { font-family: 'Consolas', monospace; color: #4b5563; }
.font-bold { font-weight: 700; }
.text-sm { font-size: 0.8rem; }
.text-muted { color: #6b7280; }

:deep(.log-details-list) { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
:deep(.log-details-list li) { background: #f8fafc; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #cbd5e1; font-size: 0.8rem; }
</style>