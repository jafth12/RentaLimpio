<template>
  <MainLayout>
    <div class="center-container">
      <div class="header-section">
        <h1>🔄 Centro de Datos JSON</h1>
        <p>Gestione la importación y exportación masiva de documentos tributarios.</p>
      </div>

      <div class="dashboard-grid">
        
        <div class="card-panel configuracion">
          <h3>1. Seleccione Módulo</h3>
          <div class="grid-modulos">
            <div 
              v-for="mod in modulos" 
              :key="mod.id" 
              class="modulo-item" 
              :class="{ active: moduloSeleccionado === mod.id }"
              @click="moduloSeleccionado = mod.id"
            >
              <span class="icono">{{ mod.icono }}</span>
              <span class="nombre">{{ mod.nombre }}</span>
            </div>
          </div>

          <h3>2. Configuración</h3>
          <div class="form-config">
            <div class="toggle-accion">
              <button :class="{ active: accion === 'exportar' }" @click="accion = 'exportar'">📤 Exportar (Bajar)</button>
              <button :class="{ active: accion === 'importar' }" @click="accion = 'importar'">📥 Importar (Subir)</button>
            </div>

            <div class="fechas-row" v-if="accion === 'exportar'">
              <div class="group">
                <label>Mes</label>
                <select v-model="mes" class="input-control">
                  <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <div class="group">
                <label>Año</label>
                <input type="number" v-model="anio" class="input-control">
              </div>
            </div>

            <div v-if="accion === 'importar'" class="drop-zone-info">
              <span style="font-size: 2rem">🧐</span>
              <p>Al procesar, serás redirigido al <strong>Lector Inteligente</strong> para validar tus archivos JSON antes de guardarlos.</p>
            </div>
          </div>

          <button @click="procesarAccion" class="btn-procesar" :disabled="cargando">
            {{ cargando ? 'Procesando...' : (accion === 'exportar' ? '🚀 Generar JSON' : '🔍 Abrir Lector JSON') }}
          </button>
        </div>

        <div class="card-panel preview">
          <h3>📊 Resumen de Operación</h3>
          
          <div v-if="!resultado" class="placeholder-preview">
            <span style="font-size: 3rem; opacity: 0.2;">📄</span>
            <p>Seleccione un módulo y haga clic en procesar para ver los resultados aquí.</p>
          </div>

          <div v-else class="resultado-box">
            <div class="res-header" :class="resultado.tipo">
              {{ resultado.titulo }}
            </div>
            <div class="res-body">
              <p><strong>Archivo:</strong> {{ resultado.archivo }}</p>
              <p><strong>Registros:</strong> {{ resultado.cantidad }}</p>
              <p v-if="resultado.total"><strong>Total Operado:</strong> ${{ resultado.total }}</p>
              <hr>
              <p class="json-snippet">{{ resultado.snippet }}</p>
            </div>
            <button v-if="accion === 'exportar'" @click="descargarArchivoReal" class="btn-descargar-final">
              💾 Guardar Archivo en PC
            </button>
          </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue';
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; // 1. IMPORTAR ROUTER

// CONFIGURACIÓN
const router = useRouter(); // 2. INICIALIZAR ROUTER
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

// ESTADOS
const moduloSeleccionado = ref('compras');
const accion = ref('exportar');
const mes = ref('Febrero'); 
const anio = ref(2026);
const cargando = ref(false);
const resultado = ref(null);
const urlDescargaBlob = ref(null);

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// CATÁLOGO DE MÓDULOS
const modulos = [
  { id: 'todo', nombre: 'Todo (JSON Maestro)', icono: '📦' },
  { id: 'compras', nombre: 'Compras (Gastos)', icono: '🛒' },
  { id: 'ventas_cf', nombre: 'Ventas Consumidor', icono: '🧾' }, // Asegura que este ID coincida con backend
  { id: 'ventas_ccf', nombre: 'Crédito Fiscal', icono: '💼' },   // Asegura que este ID coincida con backend
  { id: 'sujetos', nombre: 'Sujetos Excluidos', icono: '🚫' },
];

// LÓGICA PRINCIPAL
const procesarAccion = async () => {
  
  // 3. LÓGICA DE IMPORTACIÓN CORREGIDA
  if (accion.value === 'importar') {
    // Redirigir al Lector Inteligente
    router.push('/lector-json'); 
    return; // Detener ejecución aquí
  }

  // LÓGICA DE EXPORTACIÓN
  cargando.value = true;
  resultado.value = null;

  try {
    let endpoint = '';
    
    // SWITCH PARA ELEGIR LA RUTA CORRECTA
    switch (moduloSeleccionado.value) {
      case 'todo':
        endpoint = `${BASE_URL}/api/exportar-todo`;
        break;
      case 'compras':
        endpoint = `${BASE_URL}/api/compras/exportar`;
        break;
      // Agregar los casos faltantes si tienes endpoints individuales
      default:
        endpoint = `${BASE_URL}/api/exportar-todo`; // Fallback seguro
    }

    const params = {
      mes: mes.value,
      anio: anio.value,
      nit: '06192901600027' // NIT Declarante (Idealmente dinámico)
    };

    const response = await axios.get(endpoint, { params, responseType: 'json' });
    const data = response.data;

    // PREPARAR PREVIEW
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    urlDescargaBlob.value = window.URL.createObjectURL(blob);

    // CALCULAR TOTALES PARA PREVIEW (Manejo de errores si faltan campos)
    let totalPreview = '0.00';
    if (data.totales_periodo) {
        totalPreview = data.totales_periodo.gran_total_gravado || data.totales_periodo.total_gravado || '0.00';
    }

    // MOSTRAR RESULTADO
    resultado.value = {
      tipo: 'success',
      titulo: '✅ JSON Generado Exitosamente',
      archivo: `Reporte_${moduloSeleccionado.value}_${mes.value}_${anio.value}.json`,
      cantidad: data.lista_compras ? data.lista_compras.length : (data.modulos ? 'Varias tablas' : 0),
      total: totalPreview,
      snippet: jsonString.substring(0, 400) + '...' 
    };

  } catch (error) {
    console.error(error);
    resultado.value = {
      tipo: 'error',
      titulo: '❌ Error al Generar',
      archivo: '---',
      cantidad: 0,
      total: 0,
      snippet: error.response?.data?.message || error.message
    };
  } finally {
    cargando.value = false;
  }
};

const descargarArchivoReal = () => {
  if (!urlDescargaBlob.value) return;
  const link = document.createElement('a');
  link.href = urlDescargaBlob.value;
  link.setAttribute('download', resultado.value.archivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
</script>

<style scoped>
.center-container { padding: 2rem; background: #f8f9fa; min-height: 100vh; }
.header-section { text-align: center; margin-bottom: 2rem; }
.header-section h1 { color: #2c3e50; font-size: 2rem; }
.header-section p { color: #7f8c8d; }

.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1200px; margin: 0 auto; }
.card-panel { background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }

h3 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; color: #34495e; }

/* GRID DE MÓDULOS */
.grid-modulos { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
.modulo-item {
  border: 2px solid #eee; border-radius: 10px; padding: 15px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 10px; transition: all 0.2s;
}
.modulo-item:hover { border-color: #3498db; background: #f0f8ff; }
.modulo-item.active { border-color: #3498db; background: #e8f6fd; color: #2980b9; font-weight: bold; transform: scale(1.02); }
.icono { font-size: 2rem; }

/* CONFIGURACIÓN */
.toggle-accion { display: flex; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; }
.toggle-accion button { flex: 1; padding: 10px; border: none; background: #f8f9fa; cursor: pointer; font-weight: bold; }
.toggle-accion button.active { background: #3498db; color: white; }

.fechas-row { display: grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 20px; }
.group { display: flex; flex-direction: column; }
.input-control { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }

.drop-zone-info { background: #e8f6fd; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bde0fe; margin-bottom: 20px; }

.btn-procesar { width: 100%; padding: 15px; background: #2ecc71; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-procesar:hover { background: #27ae60; }
.btn-procesar:disabled { background: #95a5a6; cursor: not-allowed; }

/* PREVIEW */
.placeholder-preview { text-align: center; color: #bdc3c7; margin-top: 50px; }
.resultado-box { border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.res-header { padding: 15px; font-weight: bold; color: white; text-align: center; }
.res-header.success { background: #2ecc71; }
.res-header.error { background: #e74c3c; }
.res-body { padding: 20px; font-size: 0.95rem; line-height: 1.6; }
.json-snippet { background: #2c3e50; color: #2ecc71; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 0.8rem; height: 150px; overflow: auto; margin-top: 10px; }
.btn-descargar-final { width: 100%; padding: 15px; background: #34495e; color: white; border: none; font-weight: bold; cursor: pointer; }
.btn-descargar-final:hover { background: #2c3e50; }

/* Responsive */
@media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
</style>