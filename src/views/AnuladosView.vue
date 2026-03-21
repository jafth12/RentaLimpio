<template>
  <MainLayout>
    <div class="ventas-container">
      <div class="header-section">
        <div class="title-box">
          <h1>🗑️ Documentos Anulados y Extraviados</h1>
          <p class="subtitle">Registro y validación de documentos inoperantes</p>
        </div>
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary shadow-btn">
            {{ mostrandoLista ? '➕ Nueva Invalidación' : '📋 Ver Historial' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header flex-between">
            <div>
               <h2>{{ modoEdicion ? '✏️ Editar Registro' : '✨ Nueva Invalidación' }}</h2>
               <span class="badge-danger mt-2 d-inline-block">Este documento se reportará a Hacienda como inoperante</span>
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
            
            <div class="form-section bg-search-area" v-if="modoIngreso === 'dte' && !modoEdicion">
              <h3 class="section-title text-primary">🔍 Paso 1: Buscar Documento</h3>
              <p class="text-sm text-muted mb-3">Seleccione la empresa y pegue el UUID o DTE. El sistema llenará los datos automáticamente.</p>
              
              <div class="form-grid three-cols">
                <div class="form-group">
                   <label class="form-label text-dark fw-bold">Empresa / Declarante <span class="text-danger">*</span></label>
                   <select v-model="formulario.iddeclaNIT" class="form-control select-catalogo" required>
                      <option value="" disabled>-- Seleccione Empresa --</option>
                      <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                   </select>
                </div>

                <div class="form-group">
                   <label class="form-label text-primary-dark">Módulo de Origen <span class="text-danger">*</span></label>
                   <select v-model="origenDoc" class="form-control border-primary" :disabled="!formulario.iddeclaNIT">
                      <option value="03-V">Ventas: Crédito Fiscal (CCF)</option>
                      <option value="01">Ventas: Consumidor Final (CF)</option>
                      <option value="Compra">Módulo de Compras</option>
                   </select>
                </div>

                <div class="form-group">
                   <label class="form-label">Término de Búsqueda (UUID o DTE)</label>
                   <input type="text" v-model="terminoBusqueda" class="form-control input-search" placeholder="Pegue el código aquí..." :disabled="!formulario.iddeclaNIT">
                </div>
              </div>

              <div v-if="mensajeBusqueda" class="alert alert-success mt-3 py-2 text-center animate-slide">
                  {{ mensajeBusqueda }}
              </div>
            </div>

            <div class="form-section bg-search-area" v-if="modoIngreso === 'fisico' || modoEdicion">
              <h3 class="section-title text-primary">🏢 Paso 1: Empresa</h3>
              <div class="form-grid">
                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label text-dark fw-bold">Empresa / Declarante <span class="text-danger">*</span></label>
                   <select v-model="formulario.iddeclaNIT" class="form-control select-catalogo" required>
                      <option value="" disabled>-- Seleccione Empresa --</option>
                      <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                   </select>
                </div>
              </div>
            </div>

            <div class="form-section mt-4 border-section p-4 rounded-lg">
              <h3 class="section-title">📄 Paso 2: Datos del Documento</h3>
              
              <div v-if="modoIngreso === 'dte'" class="form-grid fade-in">
                  <div class="form-group" style="grid-column: span 2;">
                    <label class="form-label">Código de Generación (UUID) <span class="text-danger">*</span></label>
                    <input type="text" v-model="formulario.uuid_dte" class="form-control uuid-input" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Número de DTE <span class="text-danger">*</span></label>
                    <input type="text" v-model="formulario.desde" class="form-control dte-input fw-bold" placeholder="DTE-00-S000..." required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Fecha de Emisión <span class="text-danger">*</span></label>
                    <input type="date" v-model="formulario.fecha" class="form-control" required>
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                     <label class="form-label text-success">✔️ Sello de Recepción MH (Opcional)</label>
                     <input type="text" v-model="formulario.sello_recepcion" class="form-control input-sello" placeholder="Pegue aquí los 40 caracteres del Sello de Recepción (Si aplica)">
                  </div>
              </div>

              <div v-if="modoIngreso === 'fisico'" class="form-grid fade-in">
                  <div class="form-group"><label class="form-label">Resolución <span class="text-danger">*</span></label><input type="text" v-model="formulario.resolucion" class="form-control" required></div>
                  <div class="form-group"><label class="form-label">Serie</label><input type="text" v-model="formulario.serie" class="form-control" placeholder="Ej: A, B, C"></div>
                  <div class="form-group"><label class="form-label">Documento DEL <span class="text-danger">*</span></label><input type="text" v-model="formulario.desde" class="form-control fw-bold" placeholder="Ej: 1" required></div>
                  <div class="form-group"><label class="form-label">Documento AL <span class="text-danger">*</span></label><input type="text" v-model="formulario.hasta" class="form-control fw-bold" placeholder="Ej: 50" required></div>
                  <div class="form-group" style="grid-column: span 2;">
                    <label class="form-label">Fecha de Invalidación <span class="text-danger">*</span></label>
                    <input type="date" v-model="formulario.fecha" class="form-control" required>
                  </div>
              </div>
            </div>

            <div class="form-section mt-4 bg-light p-4 rounded-lg">
              <h3 class="section-title">🏷️ Paso 3: Clasificación y Reporte</h3>
              <div class="form-grid three-cols">
                 <div class="form-group">
                    <label class="form-label text-dark">Tipo de Invalidación <span class="text-danger">*</span></label>
                    <select v-model="formulario.tipoDeta" class="form-control text-danger fw-bold border-danger">
                       <option value="1">1 - ANULADO</option>
                       <option value="2">2 - EXTRAVIADO</option>
                    </select>
                 </div>
                 <div class="form-group">
                    <label class="form-label text-dark">Mes a Declarar <span class="text-danger">*</span></label>
                    <select v-model="formulario.mesDeclarado" class="form-control">
                        <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                    </select>
                 </div>
                 <div class="form-group">
                    <label class="form-label text-dark">Año a Declarar <span class="text-danger">*</span></label>
                    <input type="number" v-model="formulario.anioDeclarado" class="form-control" min="2000">
                 </div>

                 <div class="form-group d-none">
                    <select v-model="formulario.tipoDoc" class="form-control">
                       <option value="01">01 - Factura (Consumidor Final)</option>
                       <option value="03">03 - Comprobante de Crédito Fiscal (CCF)</option>
                       <option value="14">14 - Factura Sujeto Excluido</option>
                    </select>
                 </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-danger btn-lg shadow-btn" :disabled="cargando">
                {{ cargando ? 'Procesando...' : (modoEdicion ? 'Actualizar Registro' : '🚫 Registrar Anulación') }}
              </button>
            </div>
            <div v-if="mensaje" :class="['alert mt-3', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">{{ mensaje }}</div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <div style="display: flex; align-items: center; gap: 10px;">
                 <h3>📋 Historial de Documentos Invalidados</h3>
                 <span class="badge-count">{{ anuladosFiltrados.length }} documentos</span>
             </div>
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
                  <td>
                      <span class="doc-number text-xs">{{ item.DetaDocCodGeneracion || item.DetaDocResolu || 'N/A' }}</span>
                      <div v-if="item.DetaDocSelloRecepcion" class="badge-sello-mh mt-1" :title="item.DetaDocSelloRecepcion">✔️ Sello MH</div>
                  </td>
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

// ESTADOS DEL FORMULARIO
const modoIngreso = ref('dte'); 
const formulario = ref({
    iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
    tipoDeta: '1', tipoDoc: '03', uuid_dte: '', sello_recepcion: '', desde: '', hasta: '', resolucion: '', serie: '', anexo: '7'
});

const listaAnulados = ref([]);
const todosLosDeclarantes = ref([]);
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// VARIABLES PARA LA BÚSQUEDA INTELIGENTE
const origenDoc = ref('03-V'); 
const terminoBusqueda = ref('');
const mensajeBusqueda = ref('');
let timeoutBusqueda;

// FILTROS DE LA TABLA
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
        const resA = await axios.get(API_URL, { params: { nit: declaranteFiltro.value || undefined, mes: mesFiltro.value || undefined, anio: anioFiltro.value || undefined } });
        listaAnulados.value = resA.data || [];
    } catch (error) { console.error("Error BD:", error); }
};

// 🛡️ WATCHER QUE DISPARA LA BÚSQUEDA INTELIGENTE AL ESCRIBIR
watch(terminoBusqueda, (val) => {
    if(!val || val.length < 6 || !formulario.value.iddeclaNIT) {
        mensajeBusqueda.value = '';
        return;
    }
    
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(async () => {
        try {
            // Mapeo al nuevo endpoint
            let tipoParaBackend = '';
            if (origenDoc.value === '01') tipoParaBackend = 'CF';
            else if (origenDoc.value === '03-V') tipoParaBackend = 'CCF';
            else if (origenDoc.value === 'Compra') tipoParaBackend = 'COMPRA';

            const res = await axios.get(`${BASE_URL}/api/documentos/buscar?iddeclaNIT=${formulario.value.iddeclaNIT}&tipoOrigen=${tipoParaBackend}&busqueda=${val}`);
            
            if (res.data) {
                const doc = res.data;

                if (doc.ya_anulado) {
                    alert(doc.advertencia);
                }

                let fechaDoc = '';
                let selloDoc = '';
                if (tipoParaBackend === 'CF') {
                    fechaDoc = doc.original.ConsFecha;
                    selloDoc = doc.original.ConsSelloRecepcion || '';
                } else if (tipoParaBackend === 'CCF') {
                    fechaDoc = doc.original.FiscFecha;
                    selloDoc = doc.original.FiscSelloRecepcion || '';
                } else if (tipoParaBackend === 'COMPRA') {
                    fechaDoc = doc.original.ComFecha;
                    // Compras no usa el sello MH en la misma estructura, lo dejamos vacío
                }

                // Autocompletamos Paso 2
                formulario.value.uuid_dte = doc.uuid || formulario.value.uuid_dte;
                formulario.value.desde = doc.dte || formulario.value.desde;
                formulario.value.sello_recepcion = selloDoc || formulario.value.sello_recepcion; // 🛡️ Atrapa el sello automáticamente
                
                if(fechaDoc) formulario.value.fecha = fechaDoc.split('T')[0];
                
                // Autocompletamos Tipo Doc Oculto
                if (origenDoc.value === '01') formulario.value.tipoDoc = '01';
                else if (origenDoc.value === '03-V' || origenDoc.value === 'Compra') formulario.value.tipoDoc = '03';

                // Mostramos mensaje de éxito
                mensajeBusqueda.value = `✨ ¡Encontrado! ${doc.nombre} - $${parseFloat(doc.total).toFixed(2)}`;
                setTimeout(() => mensajeBusqueda.value='', 6000);
            }
        } catch (e) { 
            console.log("Búsqueda en curso o documento no encontrado..."); 
        }
    }, 600);
});

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
    if(!confirm('¿Eliminar esta invalidación de la base de datos?')) return;
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
        sello_recepcion: item.DetaDocSelloRecepcion || '', // 🛡️ Carga el sello en edición
        desde: item.DetaDocDesde,
        hasta: item.DetaDocHasta,
        resolucion: item.DetaDocResolu || '',
        serie: item.DetaDocSerie || '',
        anexo: item.DetaDocAnexo
    };
    terminoBusqueda.value = '';
    idEdicion.value = item.idAnuladosExtraviados; modoEdicion.value = true; mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };
const resetForm = () => {
    formulario.value = { iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), tipoDeta: '1', tipoDoc: '03', uuid_dte: '', sello_recepcion: '', desde: '', hasta: '', resolucion: '', serie: '', anexo: '7' };
    terminoBusqueda.value = ''; mensajeBusqueda.value = '';
    modoIngreso.value = 'dte'; modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};
const alternarVista = () => { if(modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';


// 🛡️ Recargar datos del backend cuando cambian los filtros principales
watch([declaranteFiltro, mesFiltro, anioFiltro], () => {
    cargarDatos();
});

onMounted(cargarDatos);
</script>

<style scoped>
.ventas-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }

.badge-danger { font-size: 0.75rem; background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-weight: 600; border: 1px solid #fecaca; }
.badge-warning { font-size: 0.75rem; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-weight: 600; border: 1px solid #fde68a; }
.badge-count { font-size: 0.8rem; background-color: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #cbd5e1; }
.badge-anexo { font-size: 0.75rem; background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #e2e8f0; white-space: nowrap; }

/* Switch Layout */
.toggle-switch { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
.toggle-switch label { cursor: pointer; padding: 6px 16px; font-size: 0.85rem; font-weight: 600; color: #64748b; border-radius: 6px; transition: all 0.2s; margin: 0; display: flex; align-items: center; justify-content: center; }
.toggle-switch label.active { background: white; color: #0f766e; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.d-none { display: none; }
.d-inline-block { display: inline-block; }

/* Sections */
.bg-search-area { background-color: #f0fdfa; padding: 20px; border-radius: 10px; border: 1px solid #ccfbf1; }
.bg-light { background-color: #f8fafc; }
.border-section { border: 1px dashed #cbd5e1; }
.p-4 { padding: 1.5rem; }
.rounded-lg { border-radius: 0.5rem; }

.form-section { margin-bottom: 25px; }
.section-title { font-size: 1.05rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

/* Inputs */
.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #fff; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.form-control:disabled { background-color: #f1f5f9; cursor: not-allowed; opacity: 0.8; }

.input-search { border: 2px solid #55C2B7; background-color: #fff; }
.input-search:focus { box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.3); }
.border-primary { border-color: #55C2B7; }
.border-danger { border-color: #fca5a5; }

/* 🛡️ ESTILOS DEL SELLO */
.input-sello { background-color: #f0fdf4; border-color: #34d399; color: #065f46; font-family: monospace; font-weight: bold; }
.input-sello:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); background-color: #ffffff; }
.badge-sello-mh { font-size: 0.65rem; background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 12px; display: inline-block; border: 1px solid #6ee7b7; font-weight: bold; cursor: help; }

.uuid-input { font-family: 'Consolas', monospace; font-size: 0.85rem; background-color: #f8fafc; color: #1e3a8a; }
.dte-input { font-family: 'Consolas', monospace; font-size: 0.95rem; color: #0f766e; }
.select-catalogo { font-weight: 600; }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.95rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-primary:hover { background-color: #45a89d; }
.btn-danger { background-color: #ef4444; color: white; }
.btn-danger:hover { background-color: #dc2626; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; margin: 0 2px; }
.shadow-btn { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
.form-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }

/* Historial */
.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.filter-input { max-width: 200px; background-color: #f0fdfa; border-color: #55C2B7; font-weight: 600; color: #0f766e; }
.filter-year { max-width: 100px; font-weight: 600; }
.filter-month { max-width: 140px; font-weight: 600; }

.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }

/* Alerts */
.alert { padding: 12px; border-radius: 6px; font-weight: 600; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

/* Utils */
.text-danger { color: #ef4444; } .text-primary { color: #0f766e; } .text-primary-dark { color: #115e59; } .fw-bold { font-weight: 700; } .text-dark { color: #111827; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-3 { margin-bottom: 1rem; } .mt-3 { margin-top: 1rem; } .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }

.animate-slide { animation: slideIn 0.3s ease-out; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .header-section, .card-header.flex-between { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions, .toggle-switch { width: 100%; }
  .toggle-switch label { flex: 1; }
  .history-filters { flex-direction: column; max-width: 100%; }
}
</style>