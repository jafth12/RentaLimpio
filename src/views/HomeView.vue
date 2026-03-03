<template>
  <MainLayout>
    <div class="dashboard-container">
      
      <div class="header-section fade-in">
        <div class="title-box">
          <h1>📊 Panel de Control</h1>
          <p class="subtitle">Resumen financiero y actividad reciente del contribuyente.</p>
        </div>
        
        <div class="filters-box">
           <select v-model="nitSeleccionado" class="form-control select-empresa">
              <option value="" disabled>-- Seleccione Empresa --</option>
              <option v-for="d in declarantesDB" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
           </select>
           <select v-model="mesSeleccionado" class="form-control">
              <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
           </select>
           <input type="number" v-model="anioSeleccionado" class="form-control input-anio">
        </div>
      </div>

      <div v-if="!nitSeleccionado" class="empty-state fade-in delay-100">
          <div class="icon-pulse">🏢</div>
          <h2>Seleccione una Empresa</h2>
          <p>Utilice los filtros de la parte superior para visualizar las métricas fiscales del período.</p>
      </div>

      <div v-else-if="cargando" class="loading-state">
          <div class="spinner"></div>
          <p>Calculando métricas del mes...</p>
      </div>

      <div v-else class="dashboard-content fade-in delay-100">
        
        <div class="kpi-grid">
            <div class="kpi-card border-t-blue">
               <div class="kpi-icon bg-blue-100 text-blue-600">📈</div>
               <div class="kpi-info">
                   <p class="kpi-label">Total Ventas</p>
                   <h3 class="kpi-value">${{ aMoneda(metricas.ventas.total) }}</h3>
                   <p class="kpi-sub">IVA Débito: <span class="text-blue-600 fw-bold">${{ aMoneda(metricas.ventas.iva) }}</span></p>
               </div>
            </div>

            <div class="kpi-card border-t-green">
               <div class="kpi-icon bg-green-100 text-green-600">🛒</div>
               <div class="kpi-info">
                   <p class="kpi-label">Total Compras</p>
                   <h3 class="kpi-value">${{ aMoneda(metricas.compras.total) }}</h3>
                   <p class="kpi-sub">IVA Crédito: <span class="text-green-600 fw-bold">${{ aMoneda(metricas.compras.iva) }}</span></p>
               </div>
            </div>

            <div class="kpi-card border-t-purple">
               <div class="kpi-icon bg-purple-100 text-purple-600">🛡️</div>
               <div class="kpi-info">
                   <p class="kpi-label">Retenciones</p>
                   <h3 class="kpi-value">${{ aMoneda(metricas.retenciones) }}</h3>
                   <p class="kpi-sub">Monto retenido en el mes</p>
               </div>
            </div>

            <div class="kpi-card border-t-orange">
               <div class="kpi-icon bg-orange-100 text-orange-600">💰</div>
               <div class="kpi-info">
                   <p class="kpi-label">Proyección de IVA</p>
                   <h3 class="kpi-value" :class="{'text-danger': metricas.ivaPagar > 0, 'text-success': metricas.ivaPagar <= 0}">
                       ${{ aMoneda(Math.abs(metricas.ivaPagar)) }}
                   </h3>
                   <p class="kpi-sub fw-bold" :class="{'text-danger': metricas.ivaPagar > 0, 'text-success': metricas.ivaPagar <= 0}">
                       {{ metricas.ivaPagar > 0 ? '⚠️ A Pagar a Hacienda' : '✅ Remanente a Favor' }}
                   </p>
               </div>
            </div>
        </div>

        <div class="card mt-4">
           <div class="card-header">
              <h2>🕒 Últimos Movimientos Registrados</h2>
           </div>
           <div class="table-responsive">
             <table class="table">
               <thead>
                 <tr>
                   <th>Fecha</th>
                   <th>Tipo</th>
                   <th>Documento DTE</th>
                   <th>Cliente / Proveedor</th>
                   <th class="text-right">Total</th>
                 </tr>
               </thead>
               <tbody>
                 <tr v-for="(item, idx) in metricas.recientes" :key="idx">
                    <td>{{ formatearFecha(item.fecha) }}</td>
                    <td>
                        <span class="badge" :class="badgeClass(item.tipo)">{{ item.tipo }}</span>
                    </td>
                    <td><span class="doc-number">{{ item.documento }}</span></td>
                    <td class="fw-bold text-dark">{{ item.nombre || 'Cliente General' }}</td>
                    <td class="text-right fw-bold">${{ aMoneda(item.total) }}</td>
                 </tr>
                 <tr v-if="!metricas.recientes || metricas.recientes.length === 0">
                    <td colspan="5" class="text-center text-muted py-4">No hay transacciones recientes registradas.</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue';

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const mesSeleccionado = ref(meses[new Date().getMonth()]);
const anioSeleccionado = ref(new Date().getFullYear().toString());
const nitSeleccionado = ref('');
const declarantesDB = ref([]);

const cargando = ref(false);

// Estructura por defecto para no romper el template
const metricas = ref({
    compras: { total: 0, iva: 0 },
    ventas: { total: 0, iva: 0 },
    retenciones: 0,
    ivaPagar: 0,
    recientes: []
});

onMounted(async () => {
    try {
        const res = await axios.get(`${BASE_URL}/api/declarantes`);
        declarantesDB.value = res.data || [];
    } catch (error) {
        console.error("Error cargando declarantes:", error);
    }
});

// Detectar cambios en los filtros para actualizar gráficos
const cargarMetricas = async () => {
    if (!nitSeleccionado.value || !mesSeleccionado.value || !anioSeleccionado.value) return;
    
    cargando.value = true;
    try {
        const res = await axios.get(`${BASE_URL}/api/dashboard/metricas`, {
            params: {
                nit: nitSeleccionado.value,
                mes: mesSeleccionado.value,
                anio: anioSeleccionado.value
            }
        });
        metricas.value = res.data;
    } catch (error) {
        console.error("Error cargando métricas:", error);
    } finally {
        cargando.value = false;
    }
};

watch([nitSeleccionado, mesSeleccionado, anioSeleccionado], cargarMetricas);

// Utilidades visuales
const aMoneda = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '';
    const partes = String(fechaIso).split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const badgeClass = (tipo) => {
    if(tipo === 'COMPRA') return 'badge-green';
    if(tipo.includes('VENTA')) return 'badge-blue';
    return 'badge-gray';
};
</script>

<style scoped>
.dashboard-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; box-sizing: border-box;}

.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px;}
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

.filters-box { display: flex; gap: 10px; background: white; padding: 10px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;}
.form-control { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; outline: none; background: white;}
.form-control:focus { border-color: #55C2B7; box-shadow: 0 0 0 2px rgba(85, 194, 183, 0.2);}
.select-empresa { min-width: 250px; font-weight: bold; color: #0f766e; }
.input-anio { width: 90px; }

/* Empty State */
.empty-state { text-align: center; padding: 80px 20px; background: white; border-radius: 16px; border: 2px dashed #cbd5e1; margin-top: 20px;}
.empty-state h2 { color: #334155; margin-bottom: 10px; font-weight: 700;}
.empty-state p { color: #64748b; }
.icon-pulse { font-size: 4rem; display: inline-block; margin-bottom: 15px; animation: pulse 2s infinite; }

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

/* Loading State */
.loading-state { text-align: center; padding: 80px; }
.spinner { border: 4px solid rgba(0,0,0,0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #55C2B7; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* KPI Cards */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.kpi-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; }
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

.border-t-blue { border-top: 4px solid #3b82f6; }
.border-t-green { border-top: 4px solid #10b981; }
.border-t-purple { border-top: 4px solid #8b5cf6; }
.border-t-orange { border-top: 4px solid #f59e0b; }

.kpi-icon { width: 55px; height: 55px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
.bg-blue-100 { background: #dbeafe; } .text-blue-600 { color: #2563eb; }
.bg-green-100 { background: #dcfce3; } .text-green-600 { color: #16a34a; }
.bg-purple-100 { background: #f3e8ff; } .text-purple-600 { color: #9333ea; }
.bg-orange-100 { background: #ffedd5; } .text-orange-600 { color: #d97706; }

.kpi-info { flex: 1; }
.kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 0.05em;}
.kpi-value { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; line-height: 1; }
.kpi-sub { font-size: 0.85rem; color: #94a3b8; margin: 0; }

/* Utilidades de Texto */
.text-danger { color: #dc2626 !important; }
.text-success { color: #16a34a !important; }
.fw-bold { font-weight: 700; }
.text-dark { color: #1e293b; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }

/* Tabla de Actividad Reciente */
.card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.mt-4 { margin-top: 24px; }
.card-header h2 { font-size: 1.15rem; color: #1e293b; margin: 0 0 15px 0; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;}

.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb;}
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 14px 18px; background: #f8fafc; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e5e7eb;}
.table td { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #334155; vertical-align: middle; }
.table tr:hover td { background-color: #f8fafc; }
.doc-number { font-family: 'Courier New', monospace; background: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-weight: 600; color: #475569;}

.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;}
.badge-green { background: #dcfce3; color: #166534; border: 1px solid #bbf7d0;}
.badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;}
.badge-gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;}

/* Animaciones */
.fade-in { animation: fadeIn 0.4s ease-out; }
.delay-100 { animation-delay: 0.1s; animation-fill-mode: both; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
    .header-section { flex-direction: column; align-items: flex-start; }
    .filters-box { width: 100%; flex-wrap: wrap; }
    .select-empresa { width: 100%; }
}
</style>