<template>
  <MainLayout>
    <div class="data-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🔄 Centro de Datos JSON</h1>
          <p class="subtitle">Gestione la importación y exportación masiva de documentos tributarios.</p>
        </div>
      </div>

      <div class="dashboard-grid">
        
        <div class="left-col">
          
          <div class="card fade-in">
            <div class="card-header">
              <h2>1. Seleccione Módulo</h2>
              <span class="badge-info">Origen de los datos</span>
            </div>
            
            <div class="grid-modulos">
              <div 
                v-for="mod in modulos" 
                :key="mod.id" 
                class="modulo-item" 
                :class="{ active: moduloSeleccionado === mod.id }"
                @click="moduloSeleccionado = mod.id"
              >
                <div class="icon-circle">{{ mod.icono }}</div>
                <span class="nombre">{{ mod.nombre }}</span>
                <div class="check-mark" v-if="moduloSeleccionado === mod.id">✔</div>
              </div>
            </div>
          </div>

          <div class="card fade-in delay-100">
            <div class="card-header">
              <h2>2. Configuración</h2>
              <span class="badge-info">Parámetros</span>
            </div>

            <div class="tabs-container">
              <button 
                class="tab-btn" 
                :class="{ active: accion === 'exportar' }" 
                @click="accion = 'exportar'"
              >
                📤 Exportar (Bajar)
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: accion === 'importar' }" 
                @click="accion = 'importar'"
              >
                📥 Importar (Subir)
              </button>
            </div>

            <div v-if="accion === 'exportar'" class="export-card card fade-in mb-3">
               <h3 class="text-hacienda">🏛️ Reporte Legal (Hacienda)</h3>
               <p class="text-sm-hacienda">Genera los anexos JSON oficiales para presentar la declaración mensual.</p>
               <div class="export-controls mt-2">
                  <button @click="descargarAnexosHacienda" class="btn btn-dark-blue btn-block">
                    📦 Descargar Anexos F07
                  </button>
               </div>
            </div>

            <div class="config-body">
              
              <div v-if="accion === 'exportar'" class="animate-slide">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Mes a Reportar</label>
                    <select v-model="mes" class="form-control">
                      <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Año</label>
                    <input type="number" v-model="anio" class="form-control">
                  </div>
                </div>
                <div class="info-note">
                  <small>📅 Se generará un backup JSON de seguridad de este módulo.</small>
                </div>
              </div>

              <div v-if="accion === 'importar'" class="import-info animate-slide">
                <div class="icon-big">🧐</div>
                <div class="text-content">
                  <h4>Validación Requerida</h4>
                  <p>Para asegurar la integridad de los datos, serás redirigido al <strong>Lector Inteligente</strong>.</p>
                </div>
              </div>

              <div class="action-area">
                <button @click="procesarAccion" class="btn btn-primary btn-block" :disabled="cargando">
                  {{ cargando ? 'Procesando...' : (accion === 'exportar' ? '🚀 Generar Backup del Módulo' : '🔍 Ir al Lector Inteligente') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="card full-height fade-in delay-200">
            <div class="card-header">
              <h2>📊 Resultado</h2>
              <span class="badge-info">Vista previa</span>
            </div>

            <div v-if="!resultado" class="empty-state">
              <span class="empty-icon">📄</span>
              <h3>Esperando operación</h3>
              <p>Seleccione un módulo y configure los parámetros para ver el resultado aquí.</p>
            </div>

            <div v-else class="resultado-container">
              
              <div class="status-banner" :class="resultado.tipo">
                <span class="status-icon">{{ resultado.tipo === 'success' ? '✅' : '❌' }}</span>
                <div class="status-text">
                  <h4>{{ resultado.titulo }}</h4>
                  <small>{{ resultado.archivo }}</small>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">Registros</span>
                  <span class="value">{{ resultado.cantidad }}</span>
                </div>
                <div class="stat-item" v-if="resultado.total">
                  <span class="label">Total Operado</span>
                  <span class="value text-success">${{ resultado.total }}</span>
                </div>
              </div>

              <div class="code-preview">
                <div class="code-header">Vista Previa (Snippet)</div>
                <pre class="json-code">{{ resultado.snippet }}</pre>
              </div>

              <div class="download-area" v-if="accion === 'exportar' && resultado.tipo === 'success'">
                <button @click="descargarArchivoReal" class="btn btn-success btn-block btn-download">
                  💾 Descargar Archivo Final
                </button>
              </div>

            </div>
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
import { useRouter } from 'vue-router'; 

// CONFIGURACIÓN
const router = useRouter(); 
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

// ESTADOS
const moduloSeleccionado = ref('compras');
const accion = ref('exportar');
const mes = ref('Febrero'); 
const anio = ref(new Date().getFullYear());
const cargando = ref(false);
const resultado = ref(null);
const urlDescargaBlob = ref(null);

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// CATÁLOGO DE MÓDULOS
const modulos = [
  { id: 'todo', nombre: 'Backup Completo', icono: '📦' },
  { id: 'compras', nombre: 'Compras', icono: '🛒' },
  { id: 'ventas_cf', nombre: 'Consumidor Final', icono: '🧾' }, 
  { id: 'ventas_ccf', nombre: 'Crédito Fiscal', icono: '💼' }, 
  { id: 'sujetos', nombre: 'Sujetos Excluidos', icono: '🚫' },
];

// LÓGICA PRINCIPAL
const procesarAccion = async () => {
  
  // 1. LÓGICA DE IMPORTACIÓN (Redirección)
  if (accion.value === 'importar') {
    router.push('/lector-json'); 
    return;
  }

  // 2. LÓGICA DE EXPORTACIÓN (BACKUP INTERNO)
  cargando.value = true;
  resultado.value = null;

  try {
    let endpoint = '';
    
    // CORRECCIÓN DE RUTAS
    switch (moduloSeleccionado.value) {
      case 'todo': 
        endpoint = `${BASE_URL}/api/exportar-todo`; 
        break;
      case 'compras': 
        endpoint = `${BASE_URL}/api/compras/exportar`; 
        break;
      case 'ventas_cf': 
        endpoint = `${BASE_URL}/api/ventas-cf/exportar`; 
        break; 
      case 'ventas_ccf': 
        endpoint = `${BASE_URL}/api/ventas-CCF/exportar`; 
        break; 
      case 'sujetos': 
        endpoint = `${BASE_URL}/api/sujetos/exportar`; 
        break; 
      default: endpoint = `${BASE_URL}/api/exportar-todo`;
    }

    // Parámetros
    const params = {
      mes: mes.value,
      anio: anio.value,
      nit: '06192901600027' // NIT por defecto (Debería ser dinámico en el futuro)
    };

    // Llamada Axios
    const response = await axios.get(endpoint, { params, responseType: 'json' });
    const data = response.data;

    // Generar Blob para descarga
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    urlDescargaBlob.value = window.URL.createObjectURL(blob);

    // Calcular Totales para el Preview
    let totalPreview = '0.00';
    if (data.totales_periodo) {
        totalPreview = data.totales_periodo.gran_total_gravado || data.totales_periodo.total_gravado || '0.00';
    } else if (Array.isArray(data) && data.length > 0 && data[0].total) {
        totalPreview = data.reduce((sum, item) => sum + (parseFloat(item.total)||0), 0).toFixed(2);
    }

    // Construir Objeto Resultado
    resultado.value = {
      tipo: 'success',
      titulo: 'Backup Generado',
      archivo: `Backup_${moduloSeleccionado.value}_${mes.value}_${anio.value}.json`,
      cantidad: Array.isArray(data) ? data.length : (data.lista_compras ? data.lista_compras.length : 'N/A'),
      total: totalPreview,
      snippet: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : '')
    };

  } catch (error) {
    console.error(error);
    resultado.value = {
      tipo: 'error',
      titulo: 'Error al Generar',
      archivo: 'No se pudo crear el archivo',
      cantidad: 0,
      total: 0,
      snippet: error.response?.data?.message || error.message || 'Error de conexión con el servidor.'
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

// --- FUNCIÓN CORREGIDA PARA HACIENDA ---
const descargarAnexosHacienda = async () => {
    // 1. Usamos las variables que SÍ existen en tu script (mes y anio)
    const m = mes.value;
    const a = anio.value;
    const nitEmpresa = '06192901600027'; // NIT temporal (o el que uses por defecto)

    // 2. Validamos
    if (!m || !a) {
        alert("Auditoría: Debe seleccionar Mes y Año en el formulario.");
        return;
    }

    try {
        // 3. Hacemos la petición usando los valores correctos
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { 
                nit: nitEmpresa, 
                mes: m, 
                anio: a 
            }
        });

        // 4. Descargamos el archivo
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Anexos_Hacienda_${nitEmpresa}_${m}_${a}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        alert("✅ Archivo para Hacienda generado correctamente.");
        
    } catch (error) {
        console.error("Error en exportación legal:", error);
        // Mensaje de error amigable
        const msg = error.response?.data?.message || "No se pudo generar el reporte. Verifique la conexión.";
        alert(`🚨 Error: ${msg}`);
    }
};
</script>

<style scoped>
/* --- ESTILO MATERIAL DESVANECIDO (Consistente) --- */
.data-container {
  padding: 20px;
  background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%);
  height: 100%;
  overflow-y: auto;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-sizing: border-box;
}

/* Cabecera */
.header-section { margin-bottom: 20px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

/* Grid Principal */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Columnas */
.left-col { display: flex; flex-direction: column; gap: 20px; }
.right-col { display: flex; flex-direction: column; }

/* Tarjetas */
.card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(85, 194, 183, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 20px;
  animation: fadeIn 0.4s ease-out;
}
.full-height { height: 100%; min-height: 400px; display: flex; flex-direction: column; }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.mb-3 { margin-bottom: 15px; }
.mt-2 { margin-top: 10px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header {
  border-bottom: 1px solid #f0fdfa;
  padding-bottom: 10px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 { font-size: 1.1rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: 600; }

/* Módulos (Grid) */
.grid-modulos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.modulo-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 15px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  background: #f9fafb;
  position: relative;
}
.modulo-item:hover { border-color: #55C2B7; background: #f0fdfa; transform: translateY(-2px); }
.modulo-item.active { border-color: #55C2B7; background: #f0fdfa; box-shadow: 0 0 0 2px rgba(85, 194, 183, 0.2); }

.icon-circle { font-size: 1.5rem; background: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.nombre { font-size: 0.85rem; font-weight: 600; color: #4b5563; text-align: center; }
.modulo-item.active .nombre { color: #0f766e; }
.check-mark { position: absolute; top: 5px; right: 5px; color: #55C2B7; font-size: 0.8rem; }

/* Tabs de Acción */
.tabs-container {
  display: flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active { background: white; color: #0f766e; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* ESTILO HACIENDA */
.export-card { background: #f8fafc; border: 1px dashed #94a3b8; }
.text-hacienda { font-size: 1rem; color: #1e3a8a; margin: 0; font-weight: 700; }
.text-sm-hacienda { font-size: 0.85rem; color: #64748b; margin: 5px 0 0 0; }
.btn-dark-blue { background: #1e3a8a; color: white; font-weight: 600; padding: 10px; border-radius: 6px; border:none; cursor: pointer; }
.btn-dark-blue:hover { background: #1e40af; }

/* Configuración Body */
.config-body { display: flex; flex-direction: column; gap: 15px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { display: flex; flex-direction: column; }
.form-label { font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 5px; }
.form-control {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
}
.form-control:focus { border-color: #55C2B7; outline: none; }
.info-note { font-size: 0.8rem; color: #6b7280; margin-top: 5px; background: #f3f4f6; padding: 8px; border-radius: 6px; }

/* Import Info */
.import-info {
  background: #fff7ed;
  border: 1px dashed #fdba74;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.icon-big { font-size: 2rem; }
.text-content h4 { margin: 0 0 2px 0; color: #9a3412; font-size: 0.95rem; }
.text-content p { margin: 0; font-size: 0.85rem; color: #c2410c; }

/* Botones */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 15px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; font-size: 0.95rem;
}
.btn-block { width: 100%; }
.btn-primary { background: #55C2B7; color: white; }
.btn-primary:hover { background: #45a89d; }
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }

/* Resultado / Preview */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  text-align: center;
  padding: 20px;
}
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

.resultado-container { flex: 1; display: flex; flex-direction: column; gap: 15px; }

.status-banner {
  display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 8px;
}
.status-banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
.status-banner.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.status-text h4 { margin: 0; font-size: 0.9rem; }
.status-text small { opacity: 0.8; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-item { background: #f9fafb; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #e5e7eb; }
.stat-item .label { display: block; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; }
.stat-item .value { font-weight: 700; font-size: 1.1rem; color: #1f2937; }
.text-success { color: #10b981; }

.code-preview { flex: 1; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #374151; border-radius: 6px; background: #1f2937; }
.code-header { background: #111827; color: #9ca3af; padding: 5px 10px; font-size: 0.75rem; font-family: monospace; }
.json-code {
  flex: 1;
  margin: 0;
  padding: 10px;
  color: #a7f3d0;
  font-family: 'Consolas', monospace;
  font-size: 0.8rem;
  overflow: auto;
  white-space: pre-wrap;
}

.download-area { margin-top: auto; }

/* Animaciones */
.animate-slide { animation: slideIn 0.3s ease-out; }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>