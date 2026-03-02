<template>
  <MainLayout>
    <div class="retenciones-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🛡️ 1% Retenciones al Declarante</h1>
          <p class="subtitle">Registro de comprobantes de retención (DTE 07) efectuadas por Agentes de Retención</p>
        </div>
        
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nueva Retención' : '📋 Ver Historial' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Retención' : '✨ Registrar Nueva Retención' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Actualizando documento' : 'Comprobante de Retención 1%' }}</span>
          </div>

          <form @submit.prevent="guardarRetencion" class="form-body">
            
            <div class="form-section border-bottom-dashed pb-3 mb-3">
              <h3 class="section-title">🏢 Configuración de la Declaración</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label text-dark">Empresa (Declarante - Receptor) <span class="text-danger">*</span></label>
                  <select v-model="formulario.iddeclaNIT" class="form-control select-highlight fw-bold" required>
                    <option value="" disabled>-- Seleccione Contribuyente --</option>
                    <option v-for="emp in declarantes" :key="emp.iddeclaNIT" :value="emp.iddeclaNIT">
                      {{ emp.declarante }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Mes y Año de Declaración <span class="text-danger">*</span></label>
                  <div class="d-flex gap-2">
                    <select v-model="formulario.mesDeclarado" class="form-control" required>
                      <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <input type="number" v-model="formulario.anioDeclarado" class="form-control w-50" required>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">🏢 Agente de Retención (Emisor)</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">NIT del Agente <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.nitAgente" class="form-control" placeholder="0000-000000-000-0" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Nombre o Razón Social <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.nomAgente" class="form-control fw-bold" placeholder="Ej: CREDICAMPO S.A de C.V" required>
                </div>
                <div class="form-group">
                  <label class="form-label">DUI del Agente (Opcional)</label>
                  <input type="text" v-model="formulario.duiAgente" class="form-control" placeholder="00000000-0">
                </div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">📄 Detalles del Comprobante (DTE 07)</h3>
              <div class="form-grid three-cols">
                <div class="form-group">
                  <label class="form-label">Fecha de Emisión <span class="text-danger">*</span></label>
                  <input type="date" v-model="formulario.fecha" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Número de Control (DTE) <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.numDoc" class="form-control fw-bold" placeholder="DTE-07-..." required>
                </div>
                <div class="form-group">
                  <label class="form-label">Código de Generación</label>
                  <input type="text" v-model="formulario.codGeneracion" class="form-control" placeholder="XXXXXXXX-XXXX-XXXX...">
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">💰 Montos de Operación</h3>
              <div class="montos-wrapper">
                <div class="monto-group">
                  <label class="monto-label">Monto Sujeto a Retención</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model.number="formulario.montoSujeto" step="0.01" class="form-control monto-input text-dark" placeholder="0.00" @input="calcularRetencion" required>
                  </div>
                </div>

                <div class="monto-group total-group">
                  <label class="monto-label text-danger">Total IVA Retenido (1%)</label>
                  <div class="input-wrapper">
                    <span class="currency text-danger">-$</span>
                    <input type="number" v-model.number="formulario.montoRetenido" step="0.01" class="form-control total-input text-danger" placeholder="0.00" required>
                  </div>
                  <small class="text-xs text-muted">Autocalculado (Puede editarse por diferencias de centavos)</small>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Retención' : '💾 Guardar Retención') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>

          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Retenciones (1%)</h3>
             
             <div class="history-filters">
                <input type="number" v-model="anioFiltro" placeholder="Año" min="2000" class="form-control filter-year" title="Filtrar por año">
                <select v-model="mesFiltro" class="form-control filter-month">
                  <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
                </select>
                <input type="text" v-model="declaranteFiltro" list="lista-decla-reten" placeholder="🏢 Empresa..." class="form-control filter-input">
                <datalist id="lista-decla-reten">
                   <option v-for="d in declarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </datalist>
                <input type="text" v-model="filtroBusqueda" placeholder="🔍 DTE / NIT Agente..." class="form-control search-list">
             </div>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empresa Asignada</th>
                  <th>Agente Retenedor</th>
                  <th>N° Comprobante (DTE)</th>
                  <th class="text-right">Monto Sujeto</th>
                  <th class="text-right text-danger">IVA Retenido</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ret in retencionesFiltradas" :key="ret.idRetenciones">
                  <td>
                    <div class="fw-bold text-dark">{{ formatearFechaVisual(ret.RetenFecha) }}</div>
                    <small class="text-muted">Declarado: <strong class="text-primary">{{ ret.RetenMesDeclarado || '---' }}</strong></small>
                  </td>
                  <td>
                    <span class="badge-empresa">{{ ret.iddeclaNIT || 'Sin Asignar' }}</span>
                  </td>
                  <td>
                    <span class="fw-bold text-dark">{{ ret.RetenNomAgente || '---' }}</span>
                    <small class="d-block text-muted text-xs mt-1">NIT: {{ ret.RetenNitAgente }}</small>
                  </td>
                  <td>
                    <span class="doc-number">{{ ret.RetenNumDoc }}</span>
                    <small v-if="ret.RetenCodGeneracion" class="d-block text-muted text-xs mt-1" :title="ret.RetenCodGeneracion">{{ truncarCodGen(ret.RetenCodGeneracion) }}</small>
                  </td>
                  <td class="text-right text-muted">${{ parseFloat(ret.RetenMontoSujeto || 0).toFixed(2) }}</td>
                  <td class="text-right fw-bold text-danger">-${{ parseFloat(ret.RetenMontoDeReten || 0).toFixed(2) }}</td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(ret)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarRetencion(ret.idRetenciones)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="retencionesFiltradas.length === 0">
                  <td colspan="7" class="text-center py-4 text-muted">No se encontraron retenciones con los filtros actuales.</td>
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
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/retenciones`; 

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- ESTADOS ---
const formulario = ref({
    iddeclaNIT: '', mesDeclarado: meses[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
    nitAgente: '', nomAgente: '', duiAgente: '', fecha: new Date().toISOString().split('T')[0],
    tipoDoc: '07', serie: '', numDoc: '', codGeneracion: '', anexo: '4', montoSujeto: '', montoRetenido: ''
});

const listaRetenciones = ref([]); 
const declarantes = ref([]);
const mostrandoLista = ref(true); 
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// --- ESTADOS DE FILTRO ---
const anioFiltro = ref(new Date().getFullYear().toString());
const mesFiltro = ref(''); 
const declaranteFiltro = ref(''); 
const filtroBusqueda = ref('');

const mesesFiltroOptions = [
  { nombre: 'Todos los Meses', valor: '' },
  { nombre: 'Enero', valor: 'Enero' }, { nombre: 'Febrero', valor: 'Febrero' }, { nombre: 'Marzo', valor: 'Marzo' },
  { nombre: 'Abril', valor: 'Abril' }, { nombre: 'Mayo', valor: 'Mayo' }, { nombre: 'Junio', valor: 'Junio' },
  { nombre: 'Julio', valor: 'Julio' }, { nombre: 'Agosto', valor: 'Agosto' }, { nombre: 'Septiembre', valor: 'Septiembre' },
  { nombre: 'Octubre', valor: 'Octubre' }, { nombre: 'Noviembre', valor: 'Noviembre' }, { nombre: 'Diciembre', valor: 'Diciembre' }
];

watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = meses[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

const retencionesFiltradas = computed(() => {
  let filtrado = listaRetenciones.value || [];
  if (declaranteFiltro.value) filtrado = filtrado.filter(r => r.iddeclaNIT === declaranteFiltro.value); 
  if (anioFiltro.value) filtrado = filtrado.filter(r => String(r.RetenAnioDeclarado) === anioFiltro.value.toString() || (r.RetenFecha && r.RetenFecha.startsWith(anioFiltro.value.toString()))); 
  if (mesFiltro.value) filtrado = filtrado.filter(r => r.RetenMesDeclarado === mesFiltro.value); 
  if (filtroBusqueda.value) { 
      const txt = filtroBusqueda.value.toLowerCase().trim(); 
      filtrado = filtrado.filter(r => 
        (r.RetenNitAgente && r.RetenNitAgente.toLowerCase().includes(txt)) || 
        (r.RetenNomAgente && r.RetenNomAgente.toLowerCase().includes(txt)) || 
        (r.RetenNumDoc && r.RetenNumDoc.toLowerCase().includes(txt))
      ); 
  }
  return filtrado;
});

const calcularRetencion = () => {
    const base = parseFloat(formulario.value.montoSujeto) || 0;
    if (base > 0) {
        formulario.value.montoRetenido = (base * 0.01).toFixed(2);
    } else {
        formulario.value.montoRetenido = '';
    }
};

const cargarDeclarantes = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/api/declarantes`);
        declarantes.value = res.data;
    } catch (e) { console.error("Error cargando declarantes", e); }
};

const cargarRetenciones = async () => {
    try {
        const res = await axios.get(API_URL);
        listaRetenciones.value = res.data;
    } catch (error) { console.error("Error cargando retenciones", error); }
};

const guardarRetencion = async () => {
    cargando.value = true;
    mensaje.value = '';
    
    if (!formulario.value.montoRetenido) formulario.value.montoRetenido = 0;

    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };

    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value, { headers });
            tipoMensaje.value = 'success';
            mensaje.value = '¡Retención actualizada correctamente!';
        } else {
            await axios.post(API_URL, formulario.value, { headers });
            tipoMensaje.value = 'success';
            mensaje.value = '¡Retención guardada exitosamente!';
        }
        
        await cargarRetenciones();
        
        setTimeout(() => { 
            resetForm(); 
            mostrandoLista.value = true; 
        }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error';
        mensaje.value = 'Error al procesar el registro.';
    } finally {
        cargando.value = false;
    }
};

const eliminarRetencion = async (id) => {
    if(!confirm('¿Eliminar este comprobante de retención?')) return;
    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };
    try {
        await axios.delete(`${API_URL}/${id}`, { headers });
        await cargarRetenciones();
    } catch (e) { alert(e.response?.data?.message || 'Error al eliminar.'); }
};

const prepararEdicion = (ret) => {
    formulario.value = {
        iddeclaNIT: ret.iddeclaNIT || '', mesDeclarado: ret.RetenMesDeclarado || meses[new Date().getMonth()], anioDeclarado: ret.RetenAnioDeclarado || new Date().getFullYear().toString(),
        nitAgente: ret.RetenNitAgente, nomAgente: ret.RetenNomAgente || '', duiAgente: ret.RetenDuiDelAgente,
        fecha: formatearFechaParaInput(ret.RetenFecha),
        tipoDoc: ret.RetenListTipoDoc || '07', serie: ret.RetenSerieDoc, 
        numDoc: ret.RetenNumDoc, codGeneracion: ret.RetenCodGeneracion || '', anexo: ret.RetenNumAnexo || '4',
        montoSujeto: ret.RetenMontoSujeto, montoRetenido: ret.RetenMontoDeReten
    };
    idEdicion.value = ret.idRetenciones;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = {
        iddeclaNIT: '', mesDeclarado: meses[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
        nitAgente: '', nomAgente: '', duiAgente: '', fecha: new Date().toISOString().split('T')[0],
        tipoDoc: '07', serie: '', numDoc: '', codGeneracion: '', anexo: '4', montoSujeto: '', montoRetenido: ''
    };
    modoEdicion.value = false;
    idEdicion.value = null;
    mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion.value) { cancelarEdicion(); } else { resetForm(); mostrandoLista.value = !mostrandoLista.value; } };

const formatearFechaVisual = (f) => f ? new Date(f).toLocaleDateString('es-SV', { timeZone: 'UTC' }) : '---';
const formatearFechaParaInput = (f) => {
    if(!f) return new Date().toISOString().split('T')[0];
    if (f.includes('T')) return f.split('T')[0];
    const partes = f.split('/');
    if(partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    return f;
};
const truncarCodGen = (cod) => cod ? cod.substring(0, 15) + '...' : '';

onMounted(() => {
    cargarDeclarantes();
    cargarRetenciones();
});
</script>

<style scoped>
.retenciones-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.card-header h3 { font-size: 1.1rem; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }
.badge-empresa { font-size: 0.75rem; background: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 6px; font-weight: 700; border: 1px solid #fcd34d; }

.form-section { margin-bottom: 30px; }
.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.border-bottom-dashed { border-bottom: 1px dashed #cbd5e1; }
.pb-3 { padding-bottom: 15px; } .mb-3 { margin-bottom: 15px; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.select-highlight { border-color: #55C2B7; background-color: #f0fdfa; }

.montos-wrapper { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; }
.monto-group { flex: 1; min-width: 150px; }
.monto-label { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 6px; display: block; text-transform: uppercase; }
.input-wrapper { position: relative; }
.currency { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-weight: 600; font-size: 1rem; }
.monto-input { padding-left: 26px; font-weight: 600; text-align: right; }
.total-input { padding-left: 32px; font-weight: 800; border-color: #fca5a5; text-align: right; font-size: 1.2rem; background: #fef2f2; color: #b91c1c; }
.total-input:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }

.d-flex { display: flex; } .gap-2 { gap: 10px; } .w-50 { width: 50%; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn:active { transform: translateY(1px); }
.btn-primary { background-color: #55C2B7; color: white; } .btn-primary:hover { background-color: #45a89d; }
.btn-success { background-color: #10b981; color: white; } .btn-success:hover { background-color: #059669; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; } .btn-secondary:hover { background-color: #f3f4f6; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; transition: transform 0.2s;} .btn-icon:hover { background-color: #f9fafb; color: #111827; transform: scale(1.1); }

.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-wrap { flex-wrap: wrap; } .gap-3 { gap: 15px; }

.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
.filter-year { max-width: 140px; font-weight: 600; color: #1f2937; background-color: #f9fafb; border-color: #d1d5db; }
.filter-year:focus { border-color: #55C2B7; background-color: #fff; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.filter-month { max-width: 160px; font-weight: 600; color: #374151; background-color: #f9fafb; border-color: #d1d5db; }
.filter-month:focus { border-color: #55C2B7; background-color: #fff; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.filter-input, .search-list { flex: 1; min-width: 150px; max-width: 280px; }
.filter-input { background-color: #f0fdfa; border-color: #99f6e4; color: #0f766e; }

.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }

.text-danger { color: #ef4444; } .text-success { color: #10b981; } .text-muted { color: #6b7280; } .text-dark { color: #1f2937; } .fw-bold { font-weight: 700; } .text-xs { font-size: 0.75rem; } .text-right { text-align: right; } .text-center { text-align: center; } .text-primary { color: #55C2B7; } .d-block { display: block; } .mt-1 { margin-top: 4px; }

.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; } .header-actions { width: 100%; } .header-actions .btn { width: 100%; }
  .history-filters { flex-direction: column; width: 100%; }
  .filter-year, .filter-month, .filter-input, .search-list { max-width: 100%; width: 100%; }
}
</style>