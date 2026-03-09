<template>
  <MainLayout>
    <div class="rl-view">

      <!-- Encabezado -->
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🛡️ Retenciones 1% al Declarante</h1>
          <p class="rl-view-subtitle">Comprobantes de retención (DTE 07) efectuados por Agentes de Retención</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">
          {{ mostrandoLista ? '➕ Nueva Retención' : '📋 Ver Historial' }}
        </button>
      </div>

      <!-- FORMULARIO -->
      <div v-if="!mostrandoLista" class="rl-card">
        <div class="rl-card-header">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Retención' : '✨ Registrar Nueva Retención' }}</h2>
          </div>
          <span class="rl-badge rl-badge-info">
            {{ modoEdicion ? 'Actualizando documento' : 'Comprobante de Retención 1%' }}
          </span>
        </div>

        <form @submit.prevent="guardarRetencion">

          <!-- Sección: Configuración -->
          <div class="rl-form-section">
            <p class="rl-section-title">Configuración de la Declaración</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Empresa (Declarante - Receptor) <span class="req">*</span></label>
                <select v-model="formulario.iddeclaNIT" class="rl-select" required>
                  <option value="" disabled>-- Seleccione Contribuyente --</option>
                  <option v-for="emp in declarantes" :key="emp.iddeclaNIT" :value="emp.iddeclaNIT">
                    {{ emp.declarante }}
                  </option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Mes y Año de Declaración <span class="req">*</span></label>
                <div style="display:flex;gap:10px">
                  <select v-model="formulario.mesDeclarado" class="rl-select" required>
                    <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
                  </select>
                  <input type="number" v-model="formulario.anioDeclarado" class="rl-input" style="width:90px" required>
                </div>
              </div>
            </div>
          </div>

          <!-- Sección: Agente -->
          <div class="rl-form-section">
            <p class="rl-section-title">Agente de Retención (Emisor)</p>
            <div class="rl-grid rl-grid-3">
              <div class="rl-field">
                <label class="rl-label">NIT del Agente <span class="req">*</span></label>
                <input type="text" v-model="formulario.nitAgente" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Nombre o Razón Social <span class="req">*</span></label>
                <input type="text" v-model="formulario.nomAgente" class="rl-input" style="font-weight:700" placeholder="Ej: CREDICAMPO S.A de C.V" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">DUI del Agente (Opcional)</label>
                <input type="text" v-model="formulario.duiAgente" class="rl-input" placeholder="00000000-0">
              </div>
            </div>
          </div>

          <!-- Sección: Comprobante DTE -->
          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Detalles del Comprobante DTE-07</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Fecha de Emisión <span class="req">*</span></label>
                <input type="date" v-model="formulario.fecha" class="rl-input" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número de Control (DTE) <span class="req">*</span></label>
                <input type="text" v-model="formulario.numDoc" class="rl-input" style="font-weight:700" placeholder="DTE-07-..." required>
              </div>
            </div>
            <!-- UUID + Sello unificados -->
            <div class="rl-dte-group rl-mt-3">
              <div class="rl-field">
                <label class="rl-label" style="color:#0369a1">🔑 Código de Generación (UUID)</label>
                <input type="text" v-model="formulario.codGeneracion" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX">
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción (solo DTE)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 202542266B...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos · Solo aplica para DTE</span>
              </div>
            </div>
          </div>

          <!-- Sección: Montos -->
          <div class="rl-form-section">
            <p class="rl-section-title">Montos de Operación</p>
            <div class="rl-montos">
              <div class="rl-monto-item">
                <span class="rl-monto-label">Monto Sujeto a Retención</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model.number="formulario.montoSujeto" step="0.01" class="rl-input rl-input-monto" placeholder="0.00" @input="calcularRetencion" required>
                </div>
              </div>
              <div class="rl-monto-item is-total">
                <span class="rl-monto-label" style="color:#ef4444">Total IVA Retenido (1%)</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#ef4444">-$</span>
                  <input type="number" v-model.number="formulario.montoRetenido" step="0.01" class="rl-input rl-input-monto" style="color:#ef4444;font-weight:800;font-size:1.1rem" placeholder="0.00" required>
                </div>
                <small class="rl-sello-hint">Autocalculado · Puede editarse por diferencias de centavos</small>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '✔ Actualizar Retención' : '💾 Guardar Retención') }}
            </button>
          </div>
          <div v-if="mensaje" class="rl-alert" :class="tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger'">
            {{ mensaje }}
          </div>
        </form>
      </div>

      <!-- LISTADO -->
      <div v-else class="rl-card">
        <div class="rl-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <h3>📋 Historial de Retenciones (1%)</h3>
            <span class="rl-badge rl-badge-count">{{ retencionesFiltradas.length }} documentos</span>
          </div>
          <div class="rl-filters">
            <input type="number" v-model="anioFiltro" placeholder="Año" min="2000" class="rl-input rl-filter-sm">
            <select v-model="mesFiltro" class="rl-select rl-filter-md">
              <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
            </select>
            <input type="text" v-model="declaranteFiltro" list="lista-decla-reten" placeholder="🏢 Empresa..." class="rl-input rl-filter-md">
            <datalist id="lista-decla-reten">
              <option v-for="d in declarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
            </datalist>
            <input type="text" v-model="filtroBusqueda" placeholder="🔍 DTE / NIT Agente..." class="rl-input rl-filter-search">
          </div>
        </div>

        <div class="rl-table-wrap">
          <table class="rl-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empresa</th>
                <th>Agente Retenedor</th>
                <th>N° Comprobante (DTE)</th>
                <th style="text-align:right">Monto Sujeto</th>
                <th style="text-align:right;color:#ef4444">IVA Retenido</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ret in retencionesFiltradas" :key="ret.idRetenciones"
                  :class="{ 'is-anulado': esAnulado(ret.RetenNumDoc) }">
                <td>
                  <div style="font-weight:700">{{ formatearFechaVisual(ret.RetenFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong style="color:#0d9488">{{ ret.RetenMesDeclarado || '---' }}</strong></small>
                </td>
                <td><span class="rl-badge rl-badge-info">{{ ret.iddeclaNIT || 'Sin Asignar' }}</span></td>
                <td>
                  <div style="font-weight:700">{{ ret.RetenNomAgente || '---' }}</div>
                  <small class="rl-text-muted">NIT: {{ ret.RetenNitAgente }}</small>
                </td>
                <td>
                  <span class="rl-doc-number" :style="esAnulado(ret.RetenNumDoc) ? 'color:#ef4444' : ''">{{ ret.RetenNumDoc }}</span>
                  <small v-if="ret.RetenCodGeneracion" class="rl-text-muted" style="display:block;margin-top:2px" :title="ret.RetenCodGeneracion">{{ truncarCodGen(ret.RetenCodGeneracion) }}</small>
                </td>
                <td style="text-align:right;color:#6b7280">${{ parseFloat(ret.RetenMontoSujeto || 0).toFixed(2) }}</td>
                <td style="text-align:right;font-weight:700;color:#ef4444">
                  -${{ parseFloat(ret.RetenMontoDeReten || 0).toFixed(2) }}
                </td>
                <td style="text-align:center">
                  <button v-if="!esAnulado(ret.RetenNumDoc)" class="rl-btn-icon" @click="prepararEdicion(ret)" title="Editar">✏️</button>
                  <button v-if="!esAnulado(ret.RetenNumDoc)" class="rl-btn-icon" @click="anularRetencion(ret.idRetenciones)" title="Anular" style="color:#d97706">🚫</button>
                  <button class="rl-btn-icon" @click="eliminarRetencion(ret.idRetenciones)" title="Eliminar" style="color:#ef4444">🗑️</button>
                </td>
              </tr>
              <tr v-if="retencionesFiltradas.length === 0">
                <td colspan="7" class="rl-empty-state">No se encontraron retenciones con los filtros actuales.</td>
              </tr>
            </tbody>
          </table>
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
    tipoDoc: '07', serie: '', numDoc: '', codGeneracion: '', 
    sello_recepcion: '', // 🛡️ NUEVO CAMPO INTEGRADO
    anexo: '4', montoSujeto: '', montoRetenido: ''
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

const esAnulado = (numDoc) => {
    return numDoc && numDoc.toUpperCase().includes('ANULADO');
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

// 🛡️ NUEVA FUNCIÓN: ANULAR RETENCIÓN
const anularRetencion = async (id) => {
    if (!confirm("⚠️ ¿Está seguro que desea ANULAR este comprobante de retención? Sus montos pasarán a $0.00.")) return;
    
    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };
    
    try {
        await axios.put(`${API_URL}/anular/${id}`, {}, { headers });
        alert("Retención anulada con éxito.");
        await cargarRetenciones();
    } catch (error) {
        alert(error.response?.data?.message || 'Error al anular. Verifique sus permisos de Administrador.');
    }
};

const eliminarRetencion = async (id) => {
    if(!confirm('🚨 ¿Eliminar DEFINITIVAMENTE este comprobante de retención de la base de datos?')) return;
    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };
    try {
        await axios.delete(`${API_URL}/${id}`, { headers });
        await cargarRetenciones();
    } catch (e) { alert(e.response?.data?.message || 'Error al eliminar. Verifique sus permisos de Administrador.'); }
};

const prepararEdicion = (ret) => {
    formulario.value = {
        iddeclaNIT: ret.iddeclaNIT || '', mesDeclarado: ret.RetenMesDeclarado || meses[new Date().getMonth()], anioDeclarado: ret.RetenAnioDeclarado || new Date().getFullYear().toString(),
        nitAgente: ret.RetenNitAgente, nomAgente: ret.RetenNomAgente || '', duiAgente: ret.RetenDuiDelAgente,
        fecha: formatearFechaParaInput(ret.RetenFecha),
        tipoDoc: ret.RetenListTipoDoc || '07', serie: ret.RetenSerieDoc, 
        numDoc: ret.RetenNumDoc, codGeneracion: ret.RetenCodGeneracion || '', 
        sello_recepcion: ret.RetenSelloRecepcion || '', // 🛡️ SELLO AL EDITAR
        anexo: ret.RetenNumAnexo || '4',
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
        tipoDoc: '07', serie: '', numDoc: '', codGeneracion: '', 
        sello_recepcion: '', // 🛡️ RESETEAR SELLO
        anexo: '4', montoSujeto: '', montoRetenido: ''
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
/* RetencionesView — estilos base en assets/forms.css */
</style>
