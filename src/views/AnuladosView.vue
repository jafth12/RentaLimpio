<template>
  <MainLayout>
    <div class="ventas-container">
      <div class="header-section">
        <div class="title-box">
          <h1>🗑️ Documentos Anulados y Extraviados</h1>
          <p class="subtitle">Registro de invalidación de documentos DTE y Físicos</p>
        </div>
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nueva Invalidación' : '📋 Ver Historial' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header flex-between">
            <div>
               <h2>{{ modoEdicion ? '✏️ Editar Registro' : '✨ Nueva Invalidación' }}</h2>
               <span class="badge-danger mt-2 d-inline-block">Precaución: Este documento se reportará a Hacienda como inoperante</span>
            </div>
            
            <div class="toggle-switch">
               <label :class="{ 'active': modoIngreso === 'dte' }">
                  <input type="radio" v-model="modoIngreso" value="dte" class="d-none"> 🌐 Electrónico (DTE)
               </label>
               <label :class="{ 'active': modoIngreso === 'fisico' }">
                  <input type="radio" v-model="modoIngreso" value="fisico" class="d-none"> 🖨️ Físico (Rango)
               </label>
            </div>
          </div>

          <form @submit.prevent="guardarAnulacion" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">🏢 Datos Generales</h3>
              <div class="form-grid four-cols">
                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label text-dark fw-bold">Empresa / Declarante <span class="text-danger">*</span></label>
                   <select v-model="formulario.iddeclaNIT" class="form-control select-catalogo text-dark" required>
                      <option value="" disabled>-- Seleccione Empresa --</option>
                      <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                   </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Documento <span class="text-danger">*</span></label>
                  <input type="date" v-model="formulario.fecha" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Mes y Año a Declarar</label>
                  <div style="display: flex; gap: 5px;">
                      <select v-model="formulario.mesDeclarado" class="form-control select-catalogo"><option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option></select>
                      <input type="number" v-model="formulario.anioDeclarado" class="form-control" min="2000">
                  </div>
                </div>
              </div>
            </div>

            <div class="form-section bg-light" style="padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6;">
              <h3 class="section-title">🏷️ Clasificación</h3>
              <div class="form-grid">
                 <div class="form-group">
                    <label class="form-label text-dark">Tipo de Detalle (Estado) <span class="text-danger">*</span></label>
                    <select v-model="formulario.tipoDeta" class="form-control select-catalogo text-danger fw-bold">
                       <option value="1">1 - ANULADO</option>
                       <option value="2">2 - EXTRAVIADO</option>
                    </select>
                 </div>
                 <div class="form-group">
                    <label class="form-label text-dark">Tipo de Documento <span class="text-danger">*</span></label>
                    <select v-model="formulario.tipoDoc" class="form-control select-catalogo">
                       <option value="01">01 - Factura (Consumidor Final)</option>
                       <option value="03">03 - Comprobante de Crédito Fiscal (CCF)</option>
                       <option value="04">04 - Nota de Remisión</option>
                       <option value="05">05 - Nota de Crédito</option>
                       <option value="06">06 - Nota de Débito</option>
                       <option value="11">11 - Factura de Exportación</option>
                       <option value="14">14 - Factura Sujeto Excluido</option>
                    </select>
                 </div>
              </div>
            </div>

            <div class="form-section mt-4">
              <h3 class="section-title">📄 Identificación del Documento</h3>
              
              <div v-if="modoIngreso === 'dte'" class="form-grid fade-in">
                  <div class="form-group" style="grid-column: span 2;">
                     <label class="form-label text-primary">🔍 Búsqueda Inteligente (Origen)</label>
                     <select v-model="origenDoc" class="form-control" style="border-color: #55C2B7; background-color: #f0fdfa;">
                        <option value="03-V">Ventas: Crédito Fiscal (CCF)</option>
                        <option value="01">Ventas: Consumidor Final (CF)</option>
                        <option value="Compra">Módulo de Compras</option>
                     </select>
                     <small class="text-muted mt-1 d-block">Selecciona dónde buscar para que el autocompletado funcione rápido.</small>
                  </div>

                  <div class="form-group" style="grid-column: span 2;">
                    <label class="form-label">Código de Generación (UUID) <span class="text-danger">*</span></label>
                    <input type="text" v-model="formulario.uuid_dte" class="form-control uuid-input" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
                  </div>
                  <div class="form-group" style="grid-column: span 2;">
                    <label class="form-label">Número de DTE <span class="text-danger">*</span></label>
                    <input type="text" v-model="formulario.desde" class="form-control dte-input fw-bold" placeholder="DTE-00-S000P000..." required>
                  </div>
              </div>

              <div v-if="modoIngreso === 'fisico'" class="form-grid fade-in">
                  <div class="form-group"><label class="form-label">Resolución <span class="text-danger">*</span></label><input type="text" v-model="formulario.resolucion" class="form-control" required></div>
                  <div class="form-group"><label class="form-label">Serie</label><input type="text" v-model="formulario.serie" class="form-control" placeholder="Ej: A, B, C"></div>
                  <div class="form-group"><label class="form-label">Documento DEL <span class="text-danger">*</span></label><input type="text" v-model="formulario.desde" class="form-control fw-bold" placeholder="Ej: 1" required></div>
                  <div class="form-group"><label class="form-label">Documento AL <span class="text-danger">*</span></label><input type="text" v-model="formulario.hasta" class="form-control fw-bold" placeholder="Ej: 50" required></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-danger btn-lg" :disabled="cargando">
                {{ cargando ? 'Procesando...' : (modoEdicion ? 'Actualizar Registro' : '🚫 Registrar Anulación') }}
              </button>
            </div>
            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">{{ mensaje }}</div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Documentos Invalidados</h3>
             <div class="history-filters">
                <input type="number" v-model="anioFiltro" placeholder="Año" class="form-control filter-year">
                <select v-model="mesFiltro" class="form-control filter-month">
                  <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
                </select>
                <select v-model="declaranteFiltro" class="form-control filter-input">
                    <option value="">🏢 Todas las Empresas</option>
                    <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </select>
             </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Estado</th><th>Fecha / Declarado</th><th>Tipo Doc</th><th>Documento / Rango</th><th>UUID / Resolución</th><th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in anuladosFiltrados" :key="item.idAnuladosExtraviados">
                  <td>
                      <span :class="['badge', item.DetaDocTipoDeta === '1' ? 'badge-danger' : 'badge-warning']">
                          {{ item.DetaDocTipoDeta === '1' ? 'ANULADO' : 'EXTRAVIADO' }}
                      </span>
                  </td>
                  <td>
                      <div class="fw-bold text-dark">{{ formatearFecha(item.DetaDocFecha) }}</div>
                      <small class="text-muted">Dec: <strong class="text-primary">{{ item.AnulMesDeclarado }} {{ item.AnulAnioDeclarado }}</strong></small>
                  </td>
                  <td><span class="badge-anexo">Cod: {{ item.DetaDocTipoDoc }}</span></td>
                  <td>
                      <div class="fw-bold text-dark">
                          {{ item.DetaDocCodGeneracion ? item.DetaDocDesde : `Del: ${item.DetaDocDesde} Al: ${item.DetaDocHasta}` }}
                      </div>
                  </td>
                  <td><span class="doc-number text-xs">{{ item.DetaDocCodGeneracion || item.DetaDocResolu || 'N/A' }}</span></td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(item)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarAnulado(item.idAnuladosExtraviados)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="anuladosFiltrados.length === 0"><td colspan="6" class="text-center py-4 text-muted">No se encontraron registros.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/anulados`; 

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ESTADOS
const modoIngreso = ref('dte'); // 'dte' o 'fisico'
const formulario = ref({
    iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
    tipoDeta: '1', tipoDoc: '03', uuid_dte: '', desde: '', hasta: '', resolucion: '', serie: '', anexo: '7'
});

const listaAnulados = ref([]);
const todosLosDeclarantes = ref([]);
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// FILTROS
const mesesFiltroOptions = [{ nombre: 'Todos los Meses', valor: '' }, ...mesesOptions.map(m => ({ nombre: m, valor: m }))];
const anioFiltro = ref(new Date().getFullYear().toString());
const mesFiltro = ref(''); 
const declaranteFiltro = ref('');

const anuladosFiltrados = computed(() => {
    let list = listaAnulados.value || [];
    if (declaranteFiltro.value) list = list.filter(v => v.iddeclaNIT === declaranteFiltro.value);
    if (mesFiltro.value) list = list.filter(v => v.AnulMesDeclarado === mesFiltro.value);
    if (anioFiltro.value) list = list.filter(v => String(v.AnulAnioDeclarado) === String(anioFiltro.value));
    return list;
});

const cargarDatos = async () => {
    try {
        const resD = await axios.get(`${BASE_URL}/api/declarantes`);
        todosLosDeclarantes.value = resD.data || [];
        const resA = await axios.get(API_URL);
        listaAnulados.value = resA.data || [];
    } catch (error) { console.error("Error BD:", error); }
};

const guardarAnulacion = async () => {
    cargando.value = true;
    if (modoIngreso.value === 'dte') formulario.value.hasta = formulario.value.desde; 
    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Actualizado en BD!';
        } else {
            await axios.post(API_URL, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Registrado con éxito!';
        }
        await cargarDatos();
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error'; mensaje.value = error.response?.data?.message || 'Error del servidor.';
    } finally { cargando.value = false; }
};

const eliminarAnulado = async (id) => {
    if(!confirm('¿Eliminar esta invalidación?')) return;
    try { await axios.delete(`${API_URL}/${id}`); await cargarDatos(); } catch (e) { alert('Error al eliminar'); }
};

const prepararEdicion = (item) => {
    modoIngreso.value = item.DetaDocCodGeneracion ? 'dte' : 'fisico';
    formulario.value = {
        iddeclaNIT: item.iddeclaNIT,
        fecha: item.DetaDocFecha ? item.DetaDocFecha.split('T')[0] : '',
        mesDeclarado: item.AnulMesDeclarado || mesesOptions[new Date().getMonth()],
        anioDeclarado: item.AnulAnioDeclarado || new Date().getFullYear().toString(),
        tipoDeta: item.DetaDocTipoDeta,
        tipoDoc: item.DetaDocTipoDoc,
        uuid_dte: item.DetaDocCodGeneracion || '',
        desde: item.DetaDocDesde,
        hasta: item.DetaDocHasta,
        resolucion: item.DetaDocResolu || '',
        serie: item.DetaDocSerie || '',
        anexo: item.DetaDocAnexo
    };
    idEdicion.value = item.idAnuladosExtraviados; modoEdicion.value = true; mostrandoLista.value = false;
};

// 🛡️ VARIABLE PARA DECIRLE AL BACKEND DÓNDE BUSCAR
const origenDoc = ref('03-V'); 

// Watcher Inteligente para Autocompletado (Debounce)
let timeoutBusqueda;
const buscarDTEoUUID = (termino) => {
    if(!termino || termino.length < 6 || !formulario.value.iddeclaNIT) return;
    
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/anulados/buscar?tipo=${origenDoc.value}&termino=${termino}&nit=${formulario.value.iddeclaNIT}`);
            if (res.data) {
                // Autocompletar silenciosamente
                formulario.value.uuid_dte = res.data.uuid || formulario.value.uuid_dte;
                formulario.value.desde = res.data.dte || formulario.value.desde;
                formulario.value.fecha = res.data.fecha.split('T')[0];
                
                // Actualiza el tipo de doc según el origen para que guarde limpio
                if (origenDoc.value === '01') formulario.value.tipoDoc = '01';
                else if (origenDoc.value === '03-V' || origenDoc.value === 'Compra') formulario.value.tipoDoc = '03';

                tipoMensaje.value = 'success';
                mensaje.value = '✨ ¡Documento encontrado y autocompletado!';
                setTimeout(() => mensaje.value='', 3000);
            }
        } catch (e) { console.log("Búsqueda en curso..."); }
    }, 600); // Espera 600ms después de que el usuario deja de escribir
};

// Observamos los inputs de UUID y DTE
watch(() => formulario.value.uuid_dte, (val) => { if(val && modoIngreso.value === 'dte' && !modoEdicion.value) buscarDTEoUUID(val); });
watch(() => formulario.value.desde, (val) => { if(val && modoIngreso.value === 'dte' && !modoEdicion.value) buscarDTEoUUID(val); });

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };
const resetForm = () => {
    formulario.value = { iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), tipoDeta: '1', tipoDoc: '03', uuid_dte: '', desde: '', hasta: '', resolucion: '', serie: '', anexo: '7' };
    modoIngreso.value = 'dte'; modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};
const alternarVista = () => { if(modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

<style scoped>
/* ESTILOS EXACTOS DE VENTAS Y COMPRAS */
.ventas-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }

/* BADGES ESTILO BOOTSTRAP/TAILWIND */
.badge-danger { font-size: 0.75rem; background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-weight: 600; border: 1px solid #fecaca; }
.badge-warning { font-size: 0.75rem; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-weight: 600; border: 1px solid #fde68a; }
.badge-anexo { font-size: 0.75rem; background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #e2e8f0; white-space: nowrap; }

/* TOGGLE SWITCH - MUY ELEGANTE */
.toggle-switch { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
.toggle-switch label { cursor: pointer; padding: 6px 16px; font-size: 0.85rem; font-weight: 600; color: #64748b; border-radius: 6px; transition: all 0.2s; margin: 0; display: flex; align-items: center; justify-content: center; }
.toggle-switch label.active { background: white; color: #0f766e; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.d-none { display: none; }
.d-inline-block { display: inline-block; }

.form-section { margin-bottom: 30px; }
.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

.uuid-input { font-family: 'Consolas', monospace; font-size: 0.85rem; background-color: #f8fafc; color: #1e3a8a; }
.dte-input { font-family: 'Consolas', monospace; font-size: 0.95rem; color: #0f766e; }
.select-catalogo { background-color: #f0fdfa; border-color: #99f6e4; color: #0f766e; font-weight: 600; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-danger { background-color: #ef4444; color: white; }
.btn-danger:hover { background-color: #dc2626; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; margin: 0 2px; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }

/* TABLA Y FILTROS */
.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.filter-input { max-width: 200px; background-color: #f0fdfa; border-color: #55C2B7; font-weight: 600; color: #0f766e; }
.filter-year { max-width: 100px; font-weight: 600; }
.filter-month { max-width: 140px; font-weight: 600; }

.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }

.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.text-danger { color: #ef4444; } .text-primary { color: #55C2B7; } .fw-bold { font-weight: 700; } .text-dark { color: #111827; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

@media (max-width: 768px) {
  .header-section, .card-header.flex-between { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions, .toggle-switch { width: 100%; }
  .toggle-switch label { flex: 1; }
  .history-filters { flex-direction: column; max-width: 100%; }
}
</style>