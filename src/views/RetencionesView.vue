<template>
  <MainLayout>
    <div class="rl-view">

      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🛡️ Retenciones 1% al Declarante</h1>
          <p class="rl-view-subtitle">Comprobantes de retención (DTE 07) efectuados por Agentes de Retención</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">
          {{ mostrandoLista ? '➕ Nueva Retención' : '📋 Ver Historial' }}
        </button>
      </div>

      <div v-if="!mostrandoLista" class="rl-card rl-fade-in">
        
        <div class="rl-card-header" style="align-items: center;">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Retención' : '✨ Registrar Nueva Retención' }}</h2>
            <span class="rl-badge rl-badge-info rl-mt-2">
              {{ modoEdicion ? 'Actualizando documento' : 'Comprobante de Retención 1%' }}
            </span>
          </div>
          <div class="rl-toggle-switch">
             <label :class="{ 'active': formulario.modoIngreso === 'dte' }">
                <input type="radio" v-model="formulario.modoIngreso" value="dte" class="d-none"> 🌐 Electrónico
             </label>
             <label :class="{ 'active': formulario.modoIngreso === 'fisico' }">
                <input type="radio" v-model="formulario.modoIngreso" value="fisico" class="d-none"> 🖨️ Físico
             </label>
          </div>
        </div>

        <form @submit.prevent="guardarRetencion">

          <div class="rl-form-section">
            <p class="rl-section-title">Configuración de la Declaración</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field" :class="{'has-error': errores.empresa}">
                <label class="rl-label">Empresa (Declarante - Receptor) <span class="req">*</span></label>
                <select v-model="formulario.iddeclaNIT" class="rl-select" required>
                  <option value="" disabled>-- Seleccione Contribuyente --</option>
                  <option v-for="emp in declarantes" :key="emp.iddeclaNIT" :value="emp.iddeclaNIT">
                    {{ emp.declarante }}
                  </option>
                </select>
                <span v-if="errores.empresa" class="rl-error-msg">⚠ Requerido</span>
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

          <div class="rl-form-section">
            <p class="rl-section-title">Agente de Retención (Emisor)</p>
            <div class="rl-grid rl-grid-3">
              <div class="rl-field" :class="{'has-error': errores.nit}">
                <label class="rl-label">NIT del Agente <span class="req">*</span></label>
                <input type="text" v-model="formulario.nitAgente" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>
              <div class="rl-field" :class="{'has-error': errores.nombre}">
                <label class="rl-label">Nombre o Razón Social <span class="req">*</span></label>
                <input type="text" v-model="formulario.nomAgente" class="rl-input" style="font-weight:700" placeholder="Ej: CREDICAMPO S.A de C.V" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">DUI del Agente (Opcional)</label>
                <input type="text" v-model="formulario.duiAgente" class="rl-input" placeholder="00000000-0">
              </div>
            </div>
          </div>

          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Detalles del Comprobante (Anexo 4)</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Fecha de Emisión <span class="req">*</span></label>
                <input type="date" v-model="formulario.fecha" class="rl-input" required>
              </div>
            </div>

            <div class="rl-field rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'dte'">
              <label class="rl-label">Número DTE-07 <span class="req">*</span></label>
              <div class="rl-dte-wrap" :class="{ 'has-error': errores.numero }">
                <span class="rl-dte-prefix">DTE</span>
                <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e,'part1',2)" class="rl-dte-part w2" placeholder="07">
                <span class="rl-dte-sep">–</span>
                <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="rl-dte-part letter" placeholder="S" @focus="$event.target.select()">
                <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e,'part2',3)" class="rl-dte-part w3" placeholder="000">
                <span class="rl-dte-sep">P</span>
                <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e,'part3',3)" class="rl-dte-part w3" placeholder="000">
                <span class="rl-dte-sep">–</span>
                <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e,'part4',15)" class="rl-dte-part grow" placeholder="Correlativo...">
              </div>
            </div>

            <div class="rl-grid rl-grid-2 rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'fisico'">
               <div class="rl-field" :class="{ 'has-error': errores.numero }">
                 <label class="rl-label">Número de Comprobante (Físico) <span class="req">*</span></label>
                 <input type="text" v-model="formulario.numero_fisico" class="rl-input" placeholder="Ej: 123456" :required="formulario.modoIngreso === 'fisico'">
               </div>
            </div>

            <div class="rl-dte-group rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'dte'">
              <div class="rl-field">
                <label class="rl-label" style="color:#0369a1">🔑 Código UUID (con guiones)</label>
                <input type="text" v-model="formulario.codGeneracion" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX">
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción (solo DTE)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 202542266B...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos</span>
              </div>
            </div>
          </div>

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

      <div v-else class="rl-card rl-fade-in">
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
                <th>Clase</th>
                <th>Agente Retenedor</th>
                <th>N° Comprobante</th>
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
                <td>
                  <span class="rl-badge rl-badge-type" :class="ret.RetenCodGeneracion ? 'blue' : 'orange'">
                    {{ ret.RetenCodGeneracion ? 'DTE' : 'Físico' }}
                  </span>
                </td>
                <td>
                  <div style="font-weight:700">{{ ret.RetenNomAgente || '---' }}</div>
                  <small class="rl-text-muted">NIT: {{ ret.RetenNitAgente }}</small>
                </td>
                <td>
                  <span class="rl-doc-number" :style="esAnulado(ret.RetenNumDoc) ? 'color:#ef4444' : ''" :title="ret.RetenCodGeneracion || 'N/A'">{{ ret.RetenNumDoc }}</span>
                  <div v-if="ret.RetenSelloRecepcion" class="rl-badge-sello-mh mt-1" :title="ret.RetenSelloRecepcion">✔️ Sello MH</div>
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

// --- LÓGICA DE MÁSCARA DTE ---
const ccfParts = ref({ part1: '07', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => { let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); ccfParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto(); };
const handleInputMask = (e, partName, maxLength) => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > maxLength) raw = raw.slice(-maxLength); const padded = raw.padStart(maxLength, '0'); ccfParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto(); };
const actualizarNumeroCompleto = () => { const letra = ccfParts.value.letraSerie || 'S'; formulario.value.numero_control = `DTE-${ccfParts.value.part1}-${letra}${ccfParts.value.part2}P${ccfParts.value.part3}-${ccfParts.value.part4}`; };

// --- ESTADOS ---
const errores = ref({ empresa: false, numero: false, nit: false, nombre: false });

const formulario = ref({
    modoIngreso: 'dte', // 🛡️ Switch
    iddeclaNIT: '', mesDeclarado: meses[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
    nitAgente: '', nomAgente: '', duiAgente: '', fecha: new Date().toISOString().split('T')[0],
    tipoDoc: '07', serie: '', numero_control: '', numero_fisico: '', codGeneracion: '', 
    sello_recepcion: '', 
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
        const res = await axios.get(API_URL, { params: { nit: declaranteFiltro.value || undefined, mes: mesFiltro.value || undefined, anio: anioFiltro.value || undefined } });
        listaRetenciones.value = res.data;
    } catch (error) { console.error("Error cargando retenciones", error); }
};

const guardarRetencion = async () => {
    if (formulario.value.modoIngreso === 'dte') actualizarNumeroCompleto(); 
    const numeroFinal = formulario.value.modoIngreso === 'dte' ? formulario.value.numero_control : formulario.value.numero_fisico;

    // Validaciones visuales
    errores.value.empresa = !formulario.value.iddeclaNIT;
    errores.value.nit = !formulario.value.nitAgente;
    errores.value.nombre = !formulario.value.nomAgente;
    errores.value.numero = !numeroFinal;

    if (Object.values(errores.value).some(v => v)) {
        tipoMensaje.value = 'error'; mensaje.value = 'Complete los campos obligatorios.'; return; 
    }

    cargando.value = true;
    mensaje.value = '';
    if (!formulario.value.montoRetenido) formulario.value.montoRetenido = 0;

    const payload = {
        ...formulario.value,
        numDoc: numeroFinal,
        codGeneracion: formulario.value.modoIngreso === 'dte' ? formulario.value.codGeneracion : null,
        sello_recepcion: formulario.value.modoIngreso === 'dte' ? formulario.value.sello_recepcion : null
    };

    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };

    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, payload, { headers });
            tipoMensaje.value = 'success';
            mensaje.value = '¡Retención actualizada correctamente!';
        } else {
            await axios.post(API_URL, payload, { headers });
            tipoMensaje.value = 'success';
            mensaje.value = '¡Retención guardada exitosamente!';
        }
        
        await cargarRetenciones();
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error';
        mensaje.value = error.response?.data?.message || 'Error al procesar el registro.';
    } finally {
        cargando.value = false;
    }
};

const anularRetencion = async (id) => {
    if (!confirm("⚠️ ¿Está seguro que desea ANULAR este comprobante de retención? Sus montos pasarán a $0.00.")) return;
    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };
    try {
        await axios.put(`${API_URL}/anular/${id}`, {}, { headers });
        alert("Retención anulada con éxito.");
        await cargarRetenciones();
    } catch (error) {
        alert(error.response?.data?.message || 'Error al anular. Verifique sus permisos.');
    }
};

const eliminarRetencion = async (id) => {
    if(!confirm('🚨 ¿Eliminar DEFINITIVAMENTE este comprobante de retención de la base de datos?')) return;
    const headers = { 'x-usuario': sessionStorage.getItem('username') || 'Sistema' };
    try {
        await axios.delete(`${API_URL}/${id}`, { headers });
        await cargarRetenciones();
    } catch (e) { alert(e.response?.data?.message || 'Error al eliminar.'); }
};

const prepararEdicion = (ret) => {
    let fechaSegura = formatearFechaParaInput(ret.RetenFecha);
    const rawNum = ret.RetenNumDoc || '';
    
    // 🛡️ Detección Inteligente DTE vs Físico
    const esDTE = !!ret.RetenCodGeneracion || rawNum.startsWith('DTE');
    
    if (esDTE) {
        const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/; 
        const match = rawNum.replace(/-/g, '').match(regex);
        ccfParts.value = match ? 
            { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : 
            { part1: '07', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    }

    formulario.value = {
        modoIngreso: esDTE ? 'dte' : 'fisico',
        iddeclaNIT: ret.iddeclaNIT || '', mesDeclarado: ret.RetenMesDeclarado || meses[new Date(fechaSegura).getMonth()], anioDeclarado: ret.RetenAnioDeclarado || fechaSegura.substring(0,4),
        nitAgente: ret.RetenNitAgente, nomAgente: ret.RetenNomAgente || '', duiAgente: ret.RetenDuiDelAgente,
        fecha: fechaSegura,
        tipoDoc: ret.RetenListTipoDoc || '07', serie: ret.RetenSerieDoc, 
        numero_control: esDTE ? rawNum : '', 
        numero_fisico: esDTE ? '' : rawNum,
        codGeneracion: ret.RetenCodGeneracion || '', 
        sello_recepcion: ret.RetenSelloRecepcion || '', 
        anexo: ret.RetenNumAnexo || '4',
        montoSujeto: ret.RetenMontoSujeto, montoRetenido: ret.RetenMontoDeReten
    };
    idEdicion.value = ret.idRetenciones;
    modoEdicion.value = true;
    mostrandoLista.value = false;
    errores.value = { empresa: false, numero: false, nit: false, nombre: false };
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = {
        modoIngreso: 'dte',
        iddeclaNIT: '', mesDeclarado: meses[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(),
        nitAgente: '', nomAgente: '', duiAgente: '', fecha: new Date().toISOString().split('T')[0],
        tipoDoc: '07', serie: '', numero_control: '', numero_fisico: '', codGeneracion: '', 
        sello_recepcion: '', 
        anexo: '4', montoSujeto: '', montoRetenido: ''
    };
    ccfParts.value = { part1: '07', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' }; 
    modoEdicion.value = false;
    idEdicion.value = null;
    mensaje.value = '';
    errores.value = { empresa: false, numero: false, nit: false, nombre: false };
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


// 🛡️ Recargar datos del backend cuando cambian los filtros principales
watch([declaranteFiltro, mesFiltro, anioFiltro], () => {
    cargarDatos();
});

onMounted(() => {
    cargarDeclarantes();
    cargarRetenciones();
});
</script>

<style scoped>
.has-error { border-color: var(--red-500) !important; }
.mt-1 { margin-top: 4px; }
</style>