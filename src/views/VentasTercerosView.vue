<template>
  <MainLayout>
    <div class="rl-view">
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🤝 Ventas a Cuenta de Terceros</h1>
          <p class="rl-view-subtitle">Operaciones realizadas en nombre de un mandante · Anexo 4</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">{{ mostrandoLista ? '➕ Nueva Operación' : '📋 Ver Listado' }}</button>
      </div>

      <div v-if="!mostrandoLista" class="rl-card">
        <div class="rl-card-header">
          <div><h2>{{ modoEdicion ? '✏️ Editar Operación' : '✨ Nueva Operación de Terceros' }}</h2></div>
          <span class="rl-badge rl-badge-info">{{ modoEdicion ? 'Modificando datos' : 'Ingreso de documento DTE o Físico' }}</span>
        </div>
        <form @submit.prevent="guardarVenta">
          <!-- Documento -->
          <div class="rl-form-section">
            <p class="rl-section-title">Datos del Documento Emitido</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Empresa / Declarante <span class="req">*</span></label>
                <select v-model="formulario.iddeclaNIT" class="rl-select" required>
                  <option value="" disabled>-- Seleccione Empresa --</option>
                  <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Mes y Año a Declarar <span class="req">*</span></label>
                <div style="display:flex;gap:10px">
                  <select v-model="formulario.mesDeclarado" class="rl-select" required>
                    <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                  <input type="number" v-model="formulario.anioDeclarado" class="rl-input" style="width:90px" min="2000" required>
                </div>
              </div>
            </div>
            <div class="rl-grid rl-grid-3 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Fecha Emisión <span class="req">*</span></label>
                <input type="date" v-model="formulario.fecha" class="rl-input" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Tipo de Documento</label>
                <input type="text" v-model="formulario.tipoDoc" class="rl-input" placeholder="Ej: 01, 03...">
              </div>
              <div class="rl-field">
                <label class="rl-label">Serie (Opcional)</label>
                <input type="text" v-model="formulario.serie" class="rl-input" placeholder="SERIE">
              </div>
            </div>
            <!-- UUID + Sello + DTE -->
            <div class="rl-dte-group rl-mt-3">
              <div class="rl-field" style="grid-column:1/-1">
                <label class="rl-label" style="color:#0369a1">🔑 Código de Generación (UUID) <span class="req">*</span></label>
                <input type="text" v-model="formulario.uuid_dte" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número DTE <span class="req">*</span></label>
                <div class="rl-dte-wrap">
                  <span class="rl-dte-prefix">DTE</span>
                  <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e,'part1',2)" class="rl-dte-part w2" placeholder="01">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="rl-dte-part letter" placeholder="S" @focus="$event.target.select()">
                  <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e,'part2',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">P</span>
                  <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e,'part3',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e,'part4',15)" class="rl-dte-part grow" placeholder="Correlativo...">
                </div>
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción (solo DTE)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 202542266B0EFC5743...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos</span>
              </div>
            </div>
          </div>

          <!-- Mandante -->
          <div class="rl-form-section">
            <p class="rl-section-title">Datos del Mandante (a quien representa)</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">NIT del Mandante <span class="req">*</span></label>
                <input type="text" v-model="formulario.nitMandante" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Nombre del Mandante <span class="req">*</span></label>
                <input type="text" v-model="formulario.nombreMandante" class="rl-input" placeholder="Nombre completo o Razón Social" required>
              </div>
            </div>
          </div>

          <!-- Montos -->
          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Montos de Operación</p>
            <div class="rl-montos">
              <div class="rl-monto-item">
                <span class="rl-monto-label">Monto Total de Operación</span>
                <div class="rl-monto-wrap"><span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.gravadas" step="0.01" class="rl-input rl-input-monto" placeholder="0.00" @blur="formatearDecimal('gravadas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label" style="color:#059669">IVA de Operación (13%)</span>
                <div class="rl-monto-wrap"><span class="rl-monto-currency" style="color:#059669">$</span>
                  <input type="number" v-model="formulario.comision" step="0.01" class="rl-input rl-input-monto" style="color:#059669" placeholder="0.00" @blur="formatearDecimal('comision')">
                </div>
              </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '✔ Actualizar Operación' : '💾 Guardar en BD') }}
            </button>
          </div>
          <div v-if="mensaje" class="rl-alert" :class="tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger'">{{ mensaje }}</div>
        </form>
      </div>

      <!-- LISTADO -->
      <div v-else class="rl-card">
        <div class="rl-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <h3>📋 Historial de Ventas por Terceros</h3>
            <span class="rl-badge rl-badge-count">{{ ventasFiltradas.length }} documentos</span>
          </div>
          <div class="rl-filters">
            <input type="number" v-model="anioFiltro" placeholder="Año" class="rl-input rl-filter-sm">
            <select v-model="mesFiltro" class="rl-select rl-filter-md">
              <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
            </select>
            <select v-model="declaranteFiltro" class="rl-select rl-filter-md">
              <option value="">🏢 Todas las Empresas</option>
              <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
            </select>
            <input type="text" v-model="filtroBusqueda" placeholder="🔍 Mandante o DTE..." class="rl-input rl-filter-search">
          </div>
        </div>
        <div v-if="seleccionados.length > 0" class="rl-bulk-bar">
          <div class="rl-bulk-info">
            <span class="rl-badge rl-badge-success">{{ seleccionados.length }} seleccionados</span>
            Asignar para declarar en:
          </div>
          <div class="rl-bulk-controls">
            <select v-model="bulkMes" class="rl-select" style="width:auto">
              <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
            </select>
            <input type="number" v-model="bulkAnio" class="rl-input" style="width:80px">
            <button class="rl-btn rl-btn-primary rl-btn-sm" @click="aplicarCambioMasivo" :disabled="cargandoMasivo">
              {{ cargandoMasivo ? 'Aplicando...' : '💾 Mover Facturas' }}
            </button>
          </div>
        </div>
        <div class="rl-table-wrap">
          <table class="rl-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">
                  <input type="checkbox" @change="toggleAll" :checked="ventasFiltradas.length > 0 && seleccionados.length === ventasFiltradas.length" class="rl-checkbox">
                </th>
                <th>Fecha</th><th>Empresa</th><th>Mandante (Tercero)</th><th>Número DTE</th>
                <th style="text-align:right">Monto</th><th style="text-align:right;color:#059669">IVA</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="venta in ventasFiltradas" :key="venta.idVtaGraTer"
                  :class="{ 'is-selected': seleccionados.includes(venta.idVtaGraTer) }">
                <td style="text-align:center">
                  <input type="checkbox" :value="venta.idVtaGraTer" v-model="seleccionados" class="rl-checkbox">
                </td>
                <td>
                  <div style="font-weight:700">{{ formatearFecha(venta.VtaGraTerFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong style="color:#0d9488">{{ venta.VtaGraTerMesDec || 'N/A' }}</strong></small>
                </td>
                <td><span class="rl-badge rl-badge-info">{{ venta.iddeclaNIT }}</span></td>
                <td>
                  <div style="font-weight:700">{{ venta.VtaGraTerNomMandante || '---' }}</div>
                  <small class="rl-text-muted">{{ venta.VtaGraTerNITMandante }}</small>
                </td>
                <td><span class="rl-doc-number">{{ venta.VtaGraTerNumDoc }}</span></td>
                <td style="text-align:right;font-weight:700">${{ parseFloat(venta.VtaGraTerMontGrav || 0).toFixed(2) }}</td>
                <td style="text-align:right;font-weight:700;color:#059669">${{ parseFloat(venta.VtaGraTerDebFisc || 0).toFixed(2) }}</td>
                <td style="text-align:center">
                  <button class="rl-btn-icon" @click="prepararEdicion(venta)" title="Editar">✏️</button>
                  <button class="rl-btn-icon" @click="eliminarVenta(venta.idVtaGraTer)" title="Eliminar" style="color:#ef4444">🗑️</button>
                </td>
              </tr>
              <tr v-if="ventasFiltradas.length === 0">
                <td colspan="8" class="rl-empty-state">No se encontraron registros para estos filtros.</td>
              </tr>
            </tbody>
          </table>
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
const API_URL = `${BASE_URL}/api/ventas-terceros`;

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- LÓGICA DE MÁSCARA DTE ---
const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => { let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); ccfParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto(); };
const handleInputMask = (e, partName, maxLength) => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > maxLength) raw = raw.slice(-maxLength); const padded = raw.padStart(maxLength, '0'); ccfParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto(); };
const actualizarNumeroCompleto = () => { const letra = ccfParts.value.letraSerie || 'S'; formulario.value.numero = `DTE-${ccfParts.value.part1}-${letra}${ccfParts.value.part2}P${ccfParts.value.part3}-${ccfParts.value.part4}`; };

// --- ESTADOS DEL FORMULARIO ---
const formulario = ref({
    iddeclaNIT: '',
    fecha: new Date().toISOString().split('T')[0],
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    numero: '', 
    uuid_dte: '', 
    sello_recepcion: '', // 🛡️ NUEVO: Integración del Sello
    serie: '', 
    nitMandante: '', nombreMandante: '', 
    LisVtaGraTerTipoDoc: '03', 
    gravadas: '0.00', comision: '0.00' 
});

const listaVentas = ref([]);
const todosLosDeclarantes = ref([]);
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// --- ASIGNACIÓN MASIVA ---
const seleccionados = ref([]);
const bulkMes = ref(mesesOptions[new Date().getMonth()]);
const bulkAnio = ref(new Date().getFullYear().toString());
const cargandoMasivo = ref(false);

const toggleAll = (e) => {
    if (e.target.checked) { seleccionados.value = ventasFiltradas.value.map(v => v.idVtaGravTerDomici); } 
    else { seleccionados.value = []; }
};

const aplicarCambioMasivo = async () => {
    if (!confirm(`¿Mover ${seleccionados.value.length} documentos al mes de ${bulkMes.value} ${bulkAnio.value}?`)) return;
    cargandoMasivo.value = true;
    try {
        const promesas = seleccionados.value.map(id => {
            const vOri = listaVentas.value.find(v => v.idVtaGravTerDomici === id);
            if (!vOri) return Promise.resolve();

            const payload = {
                iddeclaNIT: vOri.iddeclaNIT,
                fecha: vOri.VtaGraTerFecha ? vOri.VtaGraTerFecha.split('T')[0] : null,
                mesDeclarado: bulkMes.value,
                anioDeclarado: bulkAnio.value,
                nitMandante: vOri.VtaGraTerNit,
                nombreMandante: vOri.VtaGraTerNom,
                LisVtaGraTerTipoDoc: vOri.LisVtaGraTerTipoDoc,
                serie: vOri.VtaGraTerNumSerie,
                numero: vOri.VtaGraTerNumDoc,
                uuid_dte: vOri.VtaGraTerCodGeneracion,
                sello_recepcion: vOri.VtaGraTerSelloRecepcion, // 🛡️ Mantiene el sello en cambios masivos
                gravadas: vOri.VtaGraTerMontoOper,
                comision: vOri.VtaGraTerIVAOper 
            };
            return axios.put(`${API_URL}/${id}`, payload);
        });
        await Promise.all(promesas);
        alert(`✅ ${seleccionados.value.length} documentos actualizados.`);
        seleccionados.value = [];
        await cargarDatos();
    } catch (error) { alert("🚨 Error al mover los documentos."); } 
    finally { cargandoMasivo.value = false; }
};

// --- CÁLCULOS DINÁMICOS ---
watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

watch(() => formulario.value.gravadas, (nuevoMonto) => {
    const val = parseFloat(nuevoMonto) || 0;
    formulario.value.comision = (val * 0.13).toFixed(2);
});

// --- FILTROS ---
const mesesFiltroOptions = [
  { nombre: 'Todos los Meses', valor: '' },
  { nombre: 'Enero', valor: 'Enero' }, { nombre: 'Febrero', valor: 'Febrero' }, { nombre: 'Marzo', valor: 'Marzo' },
  { nombre: 'Abril', valor: 'Abril' }, { nombre: 'Mayo', valor: 'Mayo' }, { nombre: 'Junio', valor: 'Junio' },
  { nombre: 'Julio', valor: 'Julio' }, { nombre: 'Agosto', valor: 'Agosto' }, { nombre: 'Septiembre', valor: 'Septiembre' },
  { nombre: 'Octubre', valor: 'Octubre' }, { nombre: 'Noviembre', valor: 'Noviembre' }, { nombre: 'Diciembre', valor: 'Diciembre' }
];

const anioFiltro = ref(new Date().getFullYear().toString());
const mesFiltro = ref(''); 
const declaranteFiltro = ref('');
const filtroBusqueda = ref('');

const ventasFiltradas = computed(() => {
    let list = listaVentas.value || [];
    if (declaranteFiltro.value) list = list.filter(v => v.iddeclaNIT === declaranteFiltro.value);
    if (mesFiltro.value) list = list.filter(v => v.VtaGraTerMesDeclarado === mesFiltro.value);
    if (anioFiltro.value) list = list.filter(v => String(v.VtaGraTerAnioDeclarado) === String(anioFiltro.value) || (v.VtaGraTerFecha && v.VtaGraTerFecha.startsWith(anioFiltro.value)));
    if (filtroBusqueda.value) {
        const t = filtroBusqueda.value.toLowerCase();
        list = list.filter(v => 
            (v.VtaGraTerNom && v.VtaGraTerNom.toLowerCase().includes(t)) || 
            (v.VtaGraTerNit && v.VtaGraTerNit.includes(t)) || 
            (v.VtaGraTerNumDoc && v.VtaGraTerNumDoc.toLowerCase().includes(t))
        );
    }
    return list;
});

const formatearDecimal = (campo) => {
    const v = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(v) ? v.toFixed(2) : '0.00';
};

// --- OPERACIONES DB ---
const cargarDatos = async () => {
    try {
        const resD = await axios.get(`${BASE_URL}/api/declarantes`);
        todosLosDeclarantes.value = resD.data || [];
        const resV = await axios.get(API_URL);
        listaVentas.value = resV.data || [];
    } catch (error) { console.error("Error BD:", error); }
};

const guardarVenta = async () => {
    if (!formulario.value.iddeclaNIT) { tipoMensaje.value = 'error'; mensaje.value = 'Seleccione una Empresa.'; return; }
    actualizarNumeroCompleto();
    cargando.value = true;
    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Actualizado en BD!';
        } else {
            await axios.post(API_URL, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Guardado con éxito!';
        }
        await cargarDatos();
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error'; mensaje.value = error.response?.data?.message || 'Error del servidor.';
    } finally { cargando.value = false; }
};

const eliminarVenta = async (id) => {
    if(!confirm('¿Eliminar este registro permanentemente?')) return;
    try { await axios.delete(`${API_URL}/${id}`); await cargarDatos(); } catch (e) { alert('Error al eliminar'); }
};

const prepararEdicion = (venta) => {
    let fSegura = venta.VtaGraTerFecha ? venta.VtaGraTerFecha.split('T')[0] : new Date().toISOString().split('T')[0];
    const rawNum = venta.VtaGraTerNumDoc || '';
    const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/; 
    const match = rawNum.replace(/-/g, '').match(regex);
    
    ccfParts.value = match ? 
        { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : 
        { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };

    formulario.value = {
        iddeclaNIT: venta.iddeclaNIT,
        fecha: fSegura,
        mesDeclarado: venta.VtaGraTerMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
        anioDeclarado: venta.VtaGraTerAnioDeclarado || fSegura.substring(0,4),
        numero: rawNum,
        uuid_dte: venta.VtaGraTerCodGeneracion || '',
        sello_recepcion: venta.VtaGraTerSelloRecepcion || '', // 🛡️ Sello al editar
        serie: venta.VtaGraTerNumSerie || '',
        nitMandante: venta.VtaGraTerNit || '',
        nombreMandante: venta.VtaGraTerNom || '',
        LisVtaGraTerTipoDoc: venta.LisVtaGraTerTipoDoc || '03',
        gravadas: parseFloat(venta.VtaGraTerMontoOper || 0).toFixed(2),
        comision: parseFloat(venta.VtaGraTerIVAOper || 0).toFixed(2) // IVA
    };
    idEdicion.value = venta.idVtaGravTerDomici; modoEdicion.value = true; mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = { iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), numero: '', uuid_dte: '', sello_recepcion: '', serie: '', nitMandante: '', nombreMandante: '', LisVtaGraTerTipoDoc: '03', gravadas: '0.00', comision: '0.00' };
    ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const alternarVista = () => { if(modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

-e 
<style scoped>
/* VentasTercerosView — estilos base en assets/forms.css */
</style>
